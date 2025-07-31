import { NextResponse } from 'next/server'

import { ZodError } from 'zod'

import { getSession } from '@/lib/auth/session'
import { createBattleSchema } from '@/lib/schemas/battle'
import {
  canBattleToday,
  createBattle,
  getDailyBattleLimit
} from '@/services/battle'
import type { CreateBattleRequest } from '@/types/battle'

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
    const body = (await request.json()) as CreateBattleRequest
    const validatedData = createBattleSchema.parse(body)

    // Prevent battling yourself
    if (validatedData.player2Id === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot battle yourself' },
        { status: 400 }
      )
    }

    // Create the battle
    const battleResult = await createBattle(
      session.user.id,
      validatedData.player2Id
    )

    // Log activity for winner
    const isWinner = battleResult.winnerId === session.user.id

    return NextResponse.json({
      success: true,
      data: {
        result: battleResult,
        isWinner,
        message: isWinner
          ? `Congratulations! You won and earned a ${battleResult.feeDiscountPercent}% fee discount for 24 hours!`
          : 'Better luck next time! You gained 10 XP for participating.'
      }
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

    console.error('Error in POST /api/battles/create:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
