import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { pusherEvents } from '@/config/api-endpoints'
import { BATTLE_CONFIG } from '@/config/battle.config'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { battles, battleStates } from '@/lib/db/schema'
import { sendBattleEvent } from '@/lib/pusher-server'
import { dispatch } from '@/lib/queue/manager'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { battleId } = await request.json()

    // Get battle and validate participant
    const [battle] = await db
      .select()
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1)

    if (!battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant
    const isParticipant =
      battle.player1Id === session.user.id ||
      battle.player2Id === session.user.id

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: 'Not a participant in this battle' },
        { status: 403 }
      )
    }

    // Check if battle is in preparing state or already ongoing
    if (battle.status === 'completed' || battle.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Battle already completed or cancelled' },
        { status: 400 }
      )
    }

    // If battle is already ongoing, just return success
    if (battle.status === 'ongoing') {
      return NextResponse.json({
        success: true,
        data: {
          battleId,
          status: 'ongoing',
          message: 'Battle already in progress'
        }
      })
    }

    // Initialize battle state if it doesn't exist
    const [existingState] = await db
      .select()
      .from(battleStates)
      .where(eq(battleStates.battleId, battleId))
      .limit(1)

    if (!existingState) {
      await db.insert(battleStates).values({
        battleId,
        currentRound: 0,
        player1Actions: [],
        player2Actions: [],
        player1Energy: 0,
        player2Energy: 0,
        player1DefenseEnergy: 0,
        player2DefenseEnergy: 0,
        player1StoredEnergy: 0,
        player2StoredEnergy: 0,
        player1StoredDefenseEnergy: 0,
        player2StoredDefenseEnergy: 0,
        player1Health: BATTLE_CONFIG.MAX_HEALTH,
        player2Health: BATTLE_CONFIG.MAX_HEALTH,
        player1TotalAttacks: 0,
        player2TotalAttacks: 0,
        player1TotalDefends: 0,
        player2TotalDefends: 0,
        battleLog: [],
        roundHistory: []
      })
    }

    // Update battle status to ongoing
    await db
      .update(battles)
      .set({
        status: 'ongoing',
        startedAt: new Date()
      })
      .where(eq(battles.id, battleId))

    // Send battle started event to both players
    await sendBattleEvent(pusherEvents.battle.started, {
      battleId,
      player1Id: battle.player1Id,
      player2Id: battle.player2Id,
      round: 1
    })

    // Dispatch the first round job with a 3-second delay
    await dispatch(
      'battle.round',
      {
        battleId,
        roundNumber: 1
      },
      {
        delay: BATTLE_CONFIG.ROUND_INTERVAL // Use config for consistency
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        battleId,
        status: 'ongoing',
        message: 'Battle started, first round will begin in 3 seconds'
      }
    })
  } catch (error) {
    console.error('Error starting battle:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
