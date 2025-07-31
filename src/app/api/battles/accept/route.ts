import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { battleInvitations, battles, users } from '@/lib/db/schema'
import {
  broadcastBattleAccepted,
  broadcastBattleStats
} from '@/lib/pusher-server'
import { acceptBattleInvitation } from '@/services/battle'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID required' },
        { status: 400 }
      )
    }

    // Get the invitation details first
    const [invitation] = await db
      .select()
      .from(battleInvitations)
      .where(eq(battleInvitations.id, invitationId))
      .limit(1)

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Accept the invitation
    const battleResult = await acceptBattleInvitation(
      invitationId,
      session.user.id
    )

    if (!battleResult) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Get the actual battle data to get player IDs
    const [battleData] = await db
      .select({
        player1Id: battles.player1Id,
        player2Id: battles.player2Id
      })
      .from(battles)
      .where(eq(battles.id, battleResult.id))
      .limit(1)

    // Get both users' details for the battle
    const [accepterUser] = await db
      .select({
        name: users.name,
        email: users.email,
        walletAddress: users.walletAddress
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    const [senderUser] = await db
      .select({
        name: users.name,
        email: users.email,
        walletAddress: users.walletAddress
      })
      .from(users)
      .where(eq(users.id, invitation.fromUserId))
      .limit(1)

    const accepterName =
      accepterUser?.name ||
      accepterUser?.email ||
      (accepterUser?.walletAddress
        ? `${accepterUser.walletAddress.slice(0, 6)}...${accepterUser.walletAddress.slice(-4)}`
        : null) ||
      'Opponent'

    const senderName =
      senderUser?.name ||
      senderUser?.email ||
      (senderUser?.walletAddress
        ? `${senderUser.walletAddress.slice(0, 6)}...${senderUser.walletAddress.slice(-4)}`
        : null) ||
      'Opponent'

    // Broadcast acceptance to both users with full battle data
    const broadcastData = {
      battleId: battleResult.id,
      invitationId,
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId,
      player1Id: battleData?.player1Id || invitation.fromUserId, // Use actual player IDs from battle
      player2Id: battleData?.player2Id || invitation.toUserId,
      player1Name:
        battleData?.player1Id === invitation.fromUserId
          ? senderName
          : accepterName,
      player2Name:
        battleData?.player2Id === invitation.fromUserId
          ? senderName
          : accepterName,
      fromUserName: senderName, // Sender's name
      toUserName: accepterName, // Accepter's name
      winnerId: battleResult.winnerId,
      player1CP: battleResult.player1CP,
      player2CP: battleResult.player2CP,
      feeDiscountPercent: battleResult.feeDiscountPercent
    }

    await broadcastBattleAccepted(
      invitation.fromUserId,
      invitation.toUserId,
      broadcastData
    )

    // Broadcast stats update
    await broadcastBattleStats()

    return NextResponse.json({
      success: true,
      data: broadcastData
    })
  } catch (error) {
    console.error('Error in POST /api/battles/accept:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
