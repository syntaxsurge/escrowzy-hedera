import { NextResponse } from 'next/server'

import { and, desc, eq, or } from 'drizzle-orm'

import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { battleRounds, battles, users } from '@/lib/db/schema'
import { getBattleState } from '@/services/battle'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const battleId = searchParams.get('battleId')

    if (!battleId) {
      // Get the most recent ongoing or preparing battle for the user
      const [currentBattle] = await db
        .select()
        .from(battles)
        .where(
          and(
            or(eq(battles.status, 'ongoing'), eq(battles.status, 'preparing')),
            or(
              eq(battles.player1Id, session.user.id),
              eq(battles.player2Id, session.user.id)
            )
          )
        )
        .orderBy(desc(battles.createdAt))
        .limit(1)

      if (!currentBattle) {
        return NextResponse.json({
          success: true,
          data: null
        })
      }

      const battleState = await getBattleState(currentBattle.id)

      // Get battle rounds for scorecard
      const rounds = await db
        .select()
        .from(battleRounds)
        .where(eq(battleRounds.battleId, currentBattle.id))
        .orderBy(battleRounds.roundNumber)

      // Get player data
      const [player1, player2] = await Promise.all([
        db
          .select()
          .from(users)
          .where(eq(users.id, currentBattle.player1Id))
          .limit(1),
        db
          .select()
          .from(users)
          .where(eq(users.id, currentBattle.player2Id))
          .limit(1)
      ])

      return NextResponse.json({
        success: true,
        data: {
          battle: currentBattle,
          state: battleState,
          rounds,
          player1: player1[0],
          player2: player2[0]
        }
      })
    }

    // Get specific battle state
    const battleIdNum = parseInt(battleId)

    // Verify user is part of this battle
    const [battle] = await db
      .select()
      .from(battles)
      .where(eq(battles.id, battleIdNum))
      .limit(1)

    if (!battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      )
    }

    if (
      battle.player1Id !== session.user.id &&
      battle.player2Id !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this battle' },
        { status: 403 }
      )
    }

    const battleState = await getBattleState(battleIdNum)

    // Get battle rounds for scorecard
    const rounds = await db
      .select()
      .from(battleRounds)
      .where(eq(battleRounds.battleId, battleIdNum))
      .orderBy(battleRounds.roundNumber)

    // Get player data
    const [player1, player2] = await Promise.all([
      db.select().from(users).where(eq(users.id, battle.player1Id)).limit(1),
      db.select().from(users).where(eq(users.id, battle.player2Id)).limit(1)
    ])

    return NextResponse.json({
      success: true,
      data: {
        battle,
        state: battleState,
        rounds,
        player1: player1[0],
        player2: player2[0]
      }
    })
  } catch (error) {
    console.error('Error in GET /api/battles/state:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
