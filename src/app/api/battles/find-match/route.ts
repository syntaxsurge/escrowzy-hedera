import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import {
  updateSessionActivity,
  removeFromQueue
} from '@/lib/db/queries/battles'
import { users } from '@/lib/db/schema'
import { findMatchSchema } from '@/lib/schemas/battle'
import {
  canBattleToday,
  findMatch,
  getDailyBattleLimit
} from '@/services/battle'
import { rewardsService } from '@/services/rewards'
import type { FindMatchRequest } from '@/types/battle'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update session activity to track online users
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    if (sessionToken) {
      await updateSessionActivity(sessionToken)
    }

    // Check if user can battle today
    const canBattle = await canBattleToday(session.user.id)
    if (!canBattle) {
      // Remove from queue if they can't battle
      await removeFromQueue(session.user.id)

      const limit = await getDailyBattleLimit(session.user.id)
      return NextResponse.json(
        {
          success: false,
          error: 'Daily battle limit reached',
          data: {
            battlesUsed: limit.battlesUsed,
            maxBattles: limit.maxBattles,
            resetsAt: limit.resetsAt
          }
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = (await request.json()) as FindMatchRequest
    const validatedData = findMatchSchema.parse(body)

    // Get user's combat power
    const gameData = await rewardsService.getOrCreateGameData(session.user.id)
    if (!gameData) {
      return NextResponse.json(
        { success: false, error: 'User game data not found' },
        { status: 404 }
      )
    }

    // Find a match (this will add user to queue if no match found)
    const match = await findMatch({
      userId: session.user.id,
      combatPower: gameData.combatPower,
      matchRange: validatedData.matchRange
    })

    if (!match) {
      // User is now in queue, waiting for opponent
      return NextResponse.json({
        opponent: null,
        inQueue: true
      })
    }

    // Get opponent's details for display
    const [opponent] = await db
      .select({
        name: users.name,
        email: users.email,
        walletAddress: users.walletAddress
      })
      .from(users)
      .where(eq(users.id, match.userId))
      .limit(1)

    // Determine display name with proper fallback
    let displayName = 'Anonymous Warrior'
    if (opponent) {
      if (opponent.name && opponent.name !== 'Unknown Player') {
        displayName = opponent.name
      } else if (opponent.email) {
        displayName = opponent.email
      } else if (opponent.walletAddress) {
        displayName = `${opponent.walletAddress.slice(0, 6)}...${opponent.walletAddress.slice(-4)}`
      }
    }

    return NextResponse.json({
      opponent: {
        userId: match.userId,
        combatPower: match.combatPower,
        username: displayName
      },
      inQueue: false
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Error in POST /api/battles/find-match:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add DELETE endpoint to remove user from queue
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Remove user from queue
    await removeFromQueue(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/battles/find-match:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
