import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getPendingInvitations } from '@/services/battle'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get pending invitations
    const invitations = await getPendingInvitations(session.user.id)

    // Get user details for each invitation
    const invitationsWithUsers = await Promise.all(
      invitations.map(async invitation => {
        const [fromUser] = await db
          .select({
            name: users.name,
            email: users.email,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(eq(users.id, invitation.fromUserId))
          .limit(1)

        // Determine display name with proper fallback
        let displayName = fromUser?.name
        if (!displayName || displayName === 'Unknown Player') {
          if (fromUser?.email) {
            displayName = fromUser.email
          } else if (fromUser?.walletAddress) {
            // Show shortened wallet address
            displayName = `${fromUser.walletAddress.slice(0, 6)}...${fromUser.walletAddress.slice(-4)}`
          } else {
            displayName = 'Anonymous Warrior'
          }
        }

        return {
          ...invitation,
          fromUser: {
            id: invitation.fromUserId,
            name: displayName,
            email: fromUser?.email || null,
            walletAddress: fromUser?.walletAddress || ''
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: invitationsWithUsers
    })
  } catch (error) {
    console.error('Error in GET /api/battles/invitations:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
