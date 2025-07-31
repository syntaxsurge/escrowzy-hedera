import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { pusherEvents } from '@/config/api-endpoints'
import { BATTLE_CONFIG, BATTLE_MESSAGES } from '@/config/battle.config'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { battles, battleStates } from '@/lib/db/schema'
import { sendBattleEvent } from '@/lib/pusher-server'

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
    const battleId = body.battleId
    const action =
      typeof body.action === 'string' ? body.action : body.action?.type

    if (!battleId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing battleId or action' },
        { status: 400 }
      )
    }

    if (!['attack', 'defend'].includes(action)) {
      return NextResponse.json(
        { success: false, error: BATTLE_MESSAGES.INVALID_ACTION },
        { status: 400 }
      )
    }

    // Get battle
    const [battle] = await db
      .select()
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1)

    if (!battle || battle.status !== 'ongoing') {
      return NextResponse.json(
        { success: false, error: BATTLE_MESSAGES.BATTLE_NOT_FOUND },
        { status: 404 }
      )
    }

    // Check if user is a participant
    const isPlayer1 = battle.player1Id === session.user.id
    const isPlayer2 = battle.player2Id === session.user.id

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json(
        { success: false, error: BATTLE_MESSAGES.NOT_PARTICIPANT },
        { status: 403 }
      )
    }

    // Get or create battle state
    let [battleState] = await db
      .select()
      .from(battleStates)
      .where(eq(battleStates.battleId, battleId))
      .limit(1)

    if (!battleState) {
      // Initialize battle state if it doesn't exist
      const newState = {
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
        player1Health: 100,
        player2Health: 100,
        battleLog: [],
        roundHistory: []
      }

      const [inserted] = await db
        .insert(battleStates)
        .values(newState)
        .returning()
      battleState = inserted
    }

    // Store energy for the NEXT round and mark player as recharging for CURRENT round
    const currentRound = battleState.currentRound || 0

    // Get player actions for tracking
    const playerActions = isPlayer1
      ? (battleState.player1Actions as any[]) || []
      : (battleState.player2Actions as any[]) || []

    // Count how many times player has recharged this round
    const rechargeCount = playerActions.filter(
      (a: any) => a.round === currentRound && a.action === 'recharge'
    ).length

    // Track this recharge action (allow multiple per round)
    const updatedPlayerActions = [
      ...playerActions,
      {
        round: currentRound,
        action: 'recharge',
        timestamp: new Date().toISOString()
      }
    ]

    let responseData

    if (isPlayer1) {
      if (action === 'attack') {
        const newStoredEnergy = Math.min(
          BATTLE_CONFIG.MAX_ENERGY,
          (battleState.player1StoredEnergy || 0) +
            BATTLE_CONFIG.ENERGY_PER_CLICK
        )
        await db
          .update(battleStates)
          .set({
            player1StoredEnergy: newStoredEnergy,
            player1Actions: updatedPlayerActions,
            lastActionAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(battleStates.battleId, battleId))

        responseData = {
          battleId,
          action,
          energyStored: newStoredEnergy,
          maxEnergy: BATTLE_CONFIG.MAX_ENERGY,
          isPlayer1: true,
          isRecharging: true,
          currentRound,
          playerId: battle.player1Id,
          rechargeCount: rechargeCount + 1
        }
      } else {
        const newStoredDefenseEnergy = Math.min(
          BATTLE_CONFIG.MAX_DEFENSE_ENERGY,
          (battleState.player1StoredDefenseEnergy || 0) +
            BATTLE_CONFIG.DEFENSE_ENERGY_PER_CLICK
        )
        await db
          .update(battleStates)
          .set({
            player1StoredDefenseEnergy: newStoredDefenseEnergy,
            player1Actions: updatedPlayerActions,
            lastActionAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(battleStates.battleId, battleId))

        responseData = {
          battleId,
          action,
          defenseEnergyStored: newStoredDefenseEnergy,
          maxDefenseEnergy: BATTLE_CONFIG.MAX_DEFENSE_ENERGY,
          isPlayer1: true,
          isRecharging: true,
          currentRound,
          playerId: battle.player1Id,
          rechargeCount: rechargeCount + 1
        }
      }
    } else {
      if (action === 'attack') {
        const newStoredEnergy = Math.min(
          BATTLE_CONFIG.MAX_ENERGY,
          (battleState.player2StoredEnergy || 0) +
            BATTLE_CONFIG.ENERGY_PER_CLICK
        )
        await db
          .update(battleStates)
          .set({
            player2StoredEnergy: newStoredEnergy,
            player2Actions: updatedPlayerActions,
            lastActionAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(battleStates.battleId, battleId))

        responseData = {
          battleId,
          action,
          energyStored: newStoredEnergy,
          maxEnergy: BATTLE_CONFIG.MAX_ENERGY,
          isPlayer1: false,
          isRecharging: true,
          currentRound,
          playerId: battle.player2Id,
          rechargeCount: rechargeCount + 1
        }
      } else {
        const newStoredDefenseEnergy = Math.min(
          BATTLE_CONFIG.MAX_DEFENSE_ENERGY,
          (battleState.player2StoredDefenseEnergy || 0) +
            BATTLE_CONFIG.DEFENSE_ENERGY_PER_CLICK
        )
        await db
          .update(battleStates)
          .set({
            player2StoredDefenseEnergy: newStoredDefenseEnergy,
            player2Actions: updatedPlayerActions,
            lastActionAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(battleStates.battleId, battleId))

        responseData = {
          battleId,
          action,
          defenseEnergyStored: newStoredDefenseEnergy,
          maxDefenseEnergy: BATTLE_CONFIG.MAX_DEFENSE_ENERGY,
          isPlayer1: false,
          isRecharging: true,
          currentRound,
          playerId: battle.player2Id,
          rechargeCount: rechargeCount + 1
        }
      }
    }

    // Broadcast energy update to both players
    await sendBattleEvent(pusherEvents.battle.update, {
      type: 'energy-update',
      ...responseData,
      player1Id: battle.player1Id,
      player2Id: battle.player2Id
    })

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Error processing battle action:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
