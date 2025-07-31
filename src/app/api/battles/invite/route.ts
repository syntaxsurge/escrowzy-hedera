import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import {
  broadcastBattleInvitation,
  broadcastBattleStats
} from '@/lib/pusher-server'
import {
  sendBattleInvitation,
  canBattleToday,
  hasSessionRejection
} from '@/services/battle'
import { rewardsService } from '@/services/rewards'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user can battle today
    const canBattle = await canBattleToday(session.user.id)
    if (!canBattle) {
      return NextResponse.json(
        { success: false, error: 'Daily battle limit reached' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { toUserId } = body

    if (!toUserId || toUserId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid opponent' },
        { status: 400 }
      )
    }

    // Get session ID from cookies
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value || ''

    // Check for session rejection
    const hasRejection = await hasSessionRejection(
      session.user.id,
      toUserId,
      sessionToken
    )

    if (hasRejection) {
      return NextResponse.json(
        {
          success: false,
          error: 'This opponent has declined battles for this session'
        },
        { status: 400 }
      )
    }

    // Get combat powers
    const [fromUserData, toUserData] = await Promise.all([
      rewardsService.getOrCreateGameData(session.user.id),
      rewardsService.getOrCreateGameData(toUserId)
    ])

    if (!fromUserData || !toUserData) {
      return NextResponse.json(
        { success: false, error: 'Failed to get user data' },
        { status: 500 }
      )
    }

    // Send invitation
    const invitationId = await sendBattleInvitation(
      session.user.id,
      toUserId,
      fromUserData.combatPower,
      toUserData.combatPower
    )

    // Get both users' details for display and broadcasting
    const [fromUser, toUser] = await Promise.all([
      db
        .select({
          name: users.name,
          email: users.email,
          walletAddress: users.walletAddress
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1),
      db
        .select({
          name: users.name,
          email: users.email,
          walletAddress: users.walletAddress
        })
        .from(users)
        .where(eq(users.id, toUserId))
        .limit(1)
    ])

    // Determine display names with proper fallback
    const getDisplayName = (user: any) => {
      if (user?.name && user.name !== 'Unknown Player') {
        return user.name
      }
      if (user?.email) {
        return user.email
      }
      if (user?.walletAddress) {
        return `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
      }
      return 'Anonymous Warrior'
    }

    const fromUserDisplay = getDisplayName(fromUser[0])
    const toUserDisplay = getDisplayName(toUser[0])

    // Broadcast the invitation to the recipient
    await broadcastBattleInvitation(session.user.id, toUserId, {
      id: invitationId,
      fromUserId: session.user.id,
      toUserId,
      fromUserCP: fromUserData.combatPower,
      toUserCP: toUserData.combatPower,
      fromUser: {
        id: session.user.id,
        name: fromUserDisplay,
        email: fromUser[0]?.email || null,
        walletAddress: fromUser[0]?.walletAddress || ''
      }
    })

    // Broadcast stats update
    await broadcastBattleStats()

    return NextResponse.json({
      success: true,
      data: {
        invitationId,
        opponent: {
          userId: toUserId,
          username: toUserDisplay,
          combatPower: toUserData.combatPower
        }
      }
    })
  } catch (error) {
    console.error('Error in POST /api/battles/invite:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
