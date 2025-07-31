import { eq, sql } from 'drizzle-orm'

import { BATTLE_CONFIG, BattleCalculations } from '@/config/battle.config'
import { db } from '@/lib/db/drizzle'
import { battles, battleStates, battleRounds } from '@/lib/db/schema'
import { sendBattleEvent } from '@/lib/pusher-server'
import { dispatch } from '@/lib/queue/manager'
import type { BattleRoundPayload } from '@/lib/queue/types'
import { rewardsService } from '@/services/rewards'

export async function handleBattleRound(
  payload: BattleRoundPayload
): Promise<void> {
  const { battleId, roundNumber, retryCount = 0 } = payload

  // Prevent infinite retries
  if (retryCount > BATTLE_CONFIG.MAX_RETRY_ATTEMPTS) {
    console.error(
      `Battle round exceeded max retry attempts - Battle: ${battleId}, Round: ${roundNumber}, Retries: ${retryCount}`
    )
    await handleBattleError(
      battleId,
      `Round ${roundNumber} failed after ${retryCount} attempts`
    )
    return
  }

  try {
    // Add timestamp for monitoring
    const startTime = Date.now()
    // Get battle and state
    const [battle] = await db
      .select()
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1)

    // Validate battle state
    if (!battle) {
      console.error(`Battle not found: ${battleId}`)
      return
    }

    if (battle.status === 'completed') {
      console.log(`Battle already completed: ${battleId}`)
      return
    }

    if (battle.status !== 'ongoing') {
      console.warn(
        `Battle has unexpected status: ${battleId} - ${battle.status}`
      )
      return
    }

    // Check if battle has exceeded maximum duration
    const battleAge = Date.now() - battle.createdAt.getTime()
    if (battleAge > BATTLE_CONFIG.BATTLE_DURATION_MS) {
      console.warn(
        `Battle reached max duration: ${battleId} - Age: ${battleAge}ms, Max: ${BATTLE_CONFIG.BATTLE_DURATION_MS}ms`
      )
      // Complete battle based on remaining HP
      await handleBattleTimeout(battleId, battle.player1Id, battle.player2Id)
      return
    }

    let [battleState] = await db
      .select()
      .from(battleStates)
      .where(eq(battleStates.battleId, battleId))
      .limit(1)

    if (!battleState) {
      console.warn(`Battle state not found, initializing: ${battleId}`)
      // Try to initialize battle state if missing
      const newStateResult = await db
        .insert(battleStates)
        .values({
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
        .returning()
        .catch(() => null) // Ignore if another process created it

      if (!newStateResult || newStateResult.length === 0) {
        throw new Error(`Failed to create battle state for battle ${battleId}`)
      }
      battleState = newStateResult[0]
    }

    // Check if round already exists (prevent duplicates)
    const [existingRound] = await db
      .select()
      .from(battleRounds)
      .where(
        sql`${battleRounds.battleId} = ${battleId} AND ${battleRounds.roundNumber} = ${roundNumber}`
      )
      .limit(1)

    if (existingRound) {
      console.log(
        `Round already processed: Battle ${battleId}, Round ${roundNumber}`
      )
      return
    }

    // Validate health values
    const player1Health = Math.max(
      0,
      Math.min(BATTLE_CONFIG.MAX_HEALTH, battleState.player1Health)
    )
    const player2Health = Math.max(
      0,
      Math.min(BATTLE_CONFIG.MAX_HEALTH, battleState.player2Health)
    )

    // Don't process if either player's health is already 0
    if (player1Health <= 0 || player2Health <= 0) {
      console.log(
        `Battle ending due to health depletion: ${battleId} - P1: ${player1Health}, P2: ${player2Health}`
      )
      await completeBattle(
        battleId,
        player1Health,
        player2Health,
        battle.player1Id,
        battle.player2Id
      )
      return
    }

    // Remove max rounds check - battle continues until HP reaches 0 or timeout
    // Battle only ends when HP depletes or max duration is reached

    // Apply stored energy from previous round to current energy
    let player1Energy = battleState.player1StoredEnergy || 0
    let player2Energy = battleState.player2StoredEnergy || 0
    let player1DefenseEnergy = battleState.player1StoredDefenseEnergy || 0
    let player2DefenseEnergy = battleState.player2StoredDefenseEnergy || 0

    // Check if either player is recharging this round (storing energy)
    const player1Actions = (battleState.player1Actions as any[]) || []
    const player2Actions = (battleState.player2Actions as any[]) || []
    const player1Recharging = player1Actions.some(
      (a: any) => a.round === roundNumber && a.action === 'recharge'
    )
    const player2Recharging = player2Actions.some(
      (a: any) => a.round === roundNumber && a.action === 'recharge'
    )

    // Generate random actions for both players (unless they're recharging)
    let player1Action: 'attack' | 'defend' = player1Recharging
      ? 'defend' // Recharging players can't attack
      : BattleCalculations.generateRandomAction()
    let player2Action: 'attack' | 'defend' = player2Recharging
      ? 'defend' // Recharging players can't attack
      : BattleCalculations.generateRandomAction()

    // Get current total counts from battle state
    const player1TotalAttacks = (battleState as any).player1TotalAttacks || 0
    const player2TotalAttacks = (battleState as any).player2TotalAttacks || 0
    const player1TotalDefends = (battleState as any).player1TotalDefends || 0
    const player2TotalDefends = (battleState as any).player2TotalDefends || 0
    // Calculate damage for both players simultaneously
    let player1Damage = 0
    let player2Damage = 0
    let player1Critical = false
    let player2Critical = false
    let player1EnergyUsed = false
    let player2EnergyUsed = false

    // Check for critical hits
    if (player1Action === 'attack') {
      player1Critical = BattleCalculations.isCriticalHit()
    }
    if (player2Action === 'attack') {
      player2Critical = BattleCalculations.isCriticalHit()
    }

    // Calculate damage for Player 1 attacking Player 2
    if (player1Action === 'attack' && !player1Recharging) {
      // Check if player2 dodges (only if defending with defense energy)
      const player2Dodges =
        player2Action === 'defend' &&
        player2DefenseEnergy > 0 &&
        BattleCalculations.isDodged(player2DefenseEnergy)

      if (!player2Dodges) {
        player2Damage = BattleCalculations.calculateSimultaneousDamage(
          battle.player1CP,
          battle.player2CP,
          player1Energy,
          player1Action,
          player2Action,
          player1Critical
        )
        player1EnergyUsed = player1Energy > 0
      }
    }

    // Calculate damage for Player 2 attacking Player 1
    if (player2Action === 'attack' && !player2Recharging) {
      // Check if player1 dodges (only if defending with defense energy)
      const player1Dodges =
        player1Action === 'defend' &&
        player1DefenseEnergy > 0 &&
        BattleCalculations.isDodged(player1DefenseEnergy)

      if (!player1Dodges) {
        player1Damage = BattleCalculations.calculateSimultaneousDamage(
          battle.player2CP,
          battle.player1CP,
          player2Energy,
          player2Action,
          player1Action,
          player2Critical
        )
        player2EnergyUsed = player2Energy > 0
      }
    }

    // Apply damage to both players
    let updatedPlayer1Health = Math.max(0, player1Health - player1Damage)
    let updatedPlayer2Health = Math.max(0, player2Health - player2Damage)

    // Update action counts
    const newPlayer1TotalAttacks =
      player1TotalAttacks + (player1Action === 'attack' ? 1 : 0)
    const newPlayer2TotalAttacks =
      player2TotalAttacks + (player2Action === 'attack' ? 1 : 0)
    const newPlayer1TotalDefends =
      player1TotalDefends + (player1Action === 'defend' ? 1 : 0)
    const newPlayer2TotalDefends =
      player2TotalDefends + (player2Action === 'defend' ? 1 : 0)

    // Consume energy if used
    if (player1EnergyUsed && player1Energy > 0) {
      player1Energy = BattleCalculations.consumeEnergy(player1Energy, 'attack')
    }
    if (player2EnergyUsed && player2Energy > 0) {
      player2Energy = BattleCalculations.consumeEnergy(player2Energy, 'attack')
    }

    // Consume defense energy if players defended
    if (
      player1Action === 'defend' &&
      player1DefenseEnergy > 0 &&
      player2Damage > 0
    ) {
      player1DefenseEnergy = BattleCalculations.consumeDefenseEnergy(
        player1DefenseEnergy,
        true
      )
    }
    if (
      player2Action === 'defend' &&
      player2DefenseEnergy > 0 &&
      player1Damage > 0
    ) {
      player2DefenseEnergy = BattleCalculations.consumeDefenseEnergy(
        player2DefenseEnergy,
        true
      )
    }

    // Use transaction to ensure atomicity with proper error handling
    const transactionResult = await db
      .transaction(async tx => {
        // Insert round with both players' actions
        await tx
          .insert(battleRounds)
          .values({
            battleId,
            roundNumber,
            player1Action,
            player2Action,
            player1Damage,
            player2Damage,
            player1Critical,
            player2Critical,
            player1AttackCount: newPlayer1TotalAttacks,
            player2AttackCount: newPlayer2TotalAttacks,
            player1DefendCount: newPlayer1TotalDefends,
            player2DefendCount: newPlayer2TotalDefends,
            player1Health: updatedPlayer1Health,
            player2Health: updatedPlayer2Health
          })
          .onConflictDoNothing() // Ignore if round already exists

        // Update battle log with both players' actions
        const battleLog = (battleState.battleLog as any[]) || []
        battleLog.push({
          round: roundNumber,
          player1Action,
          player2Action,
          player1Damage,
          player2Damage,
          player1Critical,
          player2Critical,
          player1Health: updatedPlayer1Health,
          player2Health: updatedPlayer2Health,
          player1Energy,
          player2Energy,
          player1DefenseEnergy,
          player2DefenseEnergy,
          player1EnergyUsed,
          player2EnergyUsed,
          timestamp: new Date().toISOString()
        })

        // Update round history with both players' data
        const roundHistory = (battleState.roundHistory as any[]) || []
        roundHistory.push({
          round: roundNumber,
          player1Damage,
          player2Damage,
          player1Defended: player1Action === 'defend' ? player1Damage : 0,
          player2Defended: player2Action === 'defend' ? player2Damage : 0,
          player1Action,
          player2Action,
          player1Health: updatedPlayer1Health,
          player2Health: updatedPlayer2Health,
          timestamp: new Date().toISOString()
        })

        // Update battle state with total counts
        await tx
          .update(battleStates)
          .set({
            currentRound: roundNumber,
            player1Health: updatedPlayer1Health,
            player2Health: updatedPlayer2Health,
            player1Energy,
            player2Energy,
            player1DefenseEnergy,
            player2DefenseEnergy,
            player1StoredEnergy: 0, // Clear stored energy after round
            player2StoredEnergy: 0,
            player1StoredDefenseEnergy: 0,
            player2StoredDefenseEnergy: 0,
            player1TotalAttacks: newPlayer1TotalAttacks,
            player2TotalAttacks: newPlayer2TotalAttacks,
            player1TotalDefends: newPlayer1TotalDefends,
            player2TotalDefends: newPlayer2TotalDefends,
            roundHistory,
            battleLog,
            lastActionAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(battleStates.battleId, battleId))

        return { success: true, isDuplicate: false }
      })
      .catch(async (error: any) => {
        // Handle transaction errors
        console.error(
          `Transaction failed for battle ${battleId} round ${roundNumber}:`,
          error
        )

        // Check if it's a duplicate key error
        if (error.message?.includes('duplicate key')) {
          console.log(
            `Duplicate round detected: Battle ${battleId}, Round ${roundNumber}`
          )
          return { success: false, isDuplicate: true }
        }

        throw error // Re-throw for retry logic
      })

    // If duplicate round, skip further processing
    if (
      !transactionResult.success &&
      'isDuplicate' in transactionResult &&
      transactionResult.isDuplicate
    ) {
      return
    }

    // Send real-time update with both players' actions
    await sendBattleEvent('battle-update', {
      battleId,
      round: roundNumber,
      player1Action,
      player2Action,
      player1Damage,
      player2Damage,
      player1Critical,
      player2Critical,
      player1Health: updatedPlayer1Health,
      player2Health: updatedPlayer2Health,
      player1Energy,
      player2Energy,
      player1DefenseEnergy,
      player2DefenseEnergy,
      player1EnergyUsed,
      player2EnergyUsed,
      player1Id: battle.player1Id,
      player2Id: battle.player2Id
    })

    // Check if battle should end
    if (updatedPlayer1Health <= 0 || updatedPlayer2Health <= 0) {
      await completeBattle(
        battleId,
        updatedPlayer1Health,
        updatedPlayer2Health,
        battle.player1Id,
        battle.player2Id
      )
    } else {
      // Schedule next round
      await dispatch(
        'battle.round',
        {
          battleId,
          roundNumber: roundNumber + 1
        },
        {
          delay: BATTLE_CONFIG.ROUND_INTERVAL
        }
      )
    }

    // Log performance metrics with both players' information
    const processingTime = Date.now() - startTime

    console.log(
      `✅ Battle ${battleId} Round ${roundNumber} [${processingTime}ms]\n` +
        `   P1: ${player1Action.toUpperCase()} (CP: ${battle.player1CP}, Energy: ${player1Energy}/${player1DefenseEnergy})` +
        `${player1Critical ? ' CRIT!' : ''} Damage Taken: ${player1Damage}\n` +
        `   P2: ${player2Action.toUpperCase()} (CP: ${battle.player2CP}, Energy: ${player2Energy}/${player2DefenseEnergy})` +
        `${player2Critical ? ' CRIT!' : ''} Damage Taken: ${player2Damage}\n` +
        `   HP After: P1: ${updatedPlayer1Health}/${BATTLE_CONFIG.MAX_HEALTH}, P2: ${updatedPlayer2Health}/${BATTLE_CONFIG.MAX_HEALTH}\n` +
        `   Total Actions - P1: ${newPlayer1TotalAttacks} attacks, ${newPlayer1TotalDefends} defends\n` +
        `                  P2: ${newPlayer2TotalAttacks} attacks, ${newPlayer2TotalDefends} defends`
    )
  } catch (error: any) {
    console.error(
      `Error processing battle ${battleId} round ${roundNumber}:`,
      error
    )

    // Determine if error is retryable
    const isRetryable =
      error?.message?.includes('lock') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('connection')

    if (isRetryable && retryCount < BATTLE_CONFIG.MAX_RETRY_ATTEMPTS) {
      const retryDelay = BattleCalculations.getRetryDelay(retryCount + 1)
      console.log(
        `Retrying battle ${battleId} round ${roundNumber} - Attempt ${retryCount + 1}, Delay: ${retryDelay}ms`
      )

      // Schedule retry with exponential backoff
      await dispatch(
        'battle.round',
        {
          battleId,
          roundNumber,
          retryCount: retryCount + 1
        },
        {
          delay: retryDelay
        }
      )
    } else {
      // Non-retryable error or max retries exceeded
      await handleBattleError(battleId, error?.message || 'Unknown error')
    }
  }
}

async function completeBattle(
  battleId: number,
  player1Health: number,
  player2Health: number,
  player1Id: number,
  player2Id: number
): Promise<void> {
  // Determine winner based on remaining health
  const winnerId = player1Health > player2Health ? player1Id : player2Id
  const loserId = winnerId === player1Id ? player2Id : player1Id

  // Check if winner already has an active discount
  const now = new Date()
  const [existingDiscount] = await db
    .select()
    .from(battles)
    .where(
      sql`${battles.winnerId} = ${winnerId} AND ${battles.discountExpiresAt} > ${now.toISOString()}`
    )
    .limit(1)

  // Only set discount if no active discount exists
  let discountExpiresAt = null
  let grantDiscount = false
  if (!existingDiscount) {
    discountExpiresAt = BattleCalculations.getDiscountExpirationDate()
    grantDiscount = true
  }

  // Get player game data for rewards
  const loserGameData = await rewardsService.getOrCreateGameData(loserId)

  // Update winner's stats and get CP changes
  const winnerRewards = await rewardsService.handleBattleWin(
    winnerId,
    loserGameData.combatPower
  )

  // Update loser's stats and get CP changes
  const loserRewards = await rewardsService.handleBattleLoss(loserId)

  // Update battle with winner, end reason, and CP changes
  await db
    .update(battles)
    .set({
      winnerId,
      status: 'completed',
      endReason: 'hp', // Battle ended due to HP depletion
      completedAt: new Date(),
      discountExpiresAt,
      winnerCP: winnerRewards.cpGained,
      loserCP: -loserRewards.cpLost
    })
    .where(eq(battles.id, battleId))

  // Send completion event with CP changes
  await sendBattleEvent('battle-completed', {
    battleId,
    winnerId,
    loserId,
    reason: 'hp', // Battle ended due to HP depletion
    feeDiscountPercent: grantDiscount
      ? BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT
      : 0,
    winnerCP: winnerRewards.cpGained,
    loserCP: -loserRewards.cpLost,
    winnerNewCP: winnerRewards.newCP,
    loserNewCP: loserRewards.newCP,
    player1Id,
    player2Id
  })

  console.log(
    `✅ Battle ${battleId} completed. Winner: ${winnerId}, Loser: ${loserId}, ` +
      `Discount: ${grantDiscount ? BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT + '%' : 'none'}`
  )
}

/**
 * Handle battle timeout
 */
async function handleBattleTimeout(
  battleId: number,
  player1Id: number,
  player2Id: number
): Promise<void> {
  try {
    // Get current battle state to determine winner by health
    const [battleState] = await db
      .select()
      .from(battleStates)
      .where(eq(battleStates.battleId, battleId))
      .limit(1)

    if (battleState) {
      console.log(
        `⏰ Battle ${battleId} timed out after 10 minutes. ` +
          `Final HP - P1: ${battleState.player1Health}, P2: ${battleState.player2Health}`
      )
      // Determine winner based on remaining health
      const winnerId =
        battleState.player1Health > battleState.player2Health
          ? player1Id
          : battleState.player2Health > battleState.player1Health
            ? player2Id
            : null // Draw if equal HP
      const loserId =
        winnerId === player1Id
          ? player2Id
          : winnerId === player2Id
            ? player1Id
            : null

      // Handle rewards if there's a winner
      let winnerRewards = null
      let loserRewards = null
      if (winnerId && loserId) {
        const loserGameData = await rewardsService.getOrCreateGameData(loserId)
        winnerRewards = await rewardsService.handleBattleWin(
          winnerId,
          loserGameData.combatPower
        )
        loserRewards = await rewardsService.handleBattleLoss(loserId)
      }

      // Update battle with winner, timeout reason, and CP changes
      await db
        .update(battles)
        .set({
          winnerId,
          status: 'completed',
          endReason: 'timeout', // Battle ended due to timeout
          completedAt: new Date(),
          winnerCP: winnerRewards?.cpGained || 0,
          loserCP: loserRewards ? -loserRewards.cpLost : 0
        })
        .where(eq(battles.id, battleId))

      // Send completion event with timeout reason
      await sendBattleEvent('battle-completed', {
        battleId,
        winnerId,
        loserId,
        reason: 'timeout', // Battle ended due to timeout
        player1Health: battleState.player1Health,
        player2Health: battleState.player2Health,
        winnerCP: winnerRewards?.cpGained || 0,
        loserCP: loserRewards ? -loserRewards.cpLost : 0,
        winnerNewCP: winnerRewards?.newCP,
        loserNewCP: loserRewards?.newCP,
        player1Id,
        player2Id
      })

      console.log(
        `✅ Battle ${battleId} timed out. Winner: ${winnerId || 'Draw'}, ` +
          `P1 HP: ${battleState.player1Health}, P2 HP: ${battleState.player2Health}`
      )
    } else {
      // If no state, declare draw
      console.log(
        `⏰ Battle ${battleId} timed out with no state - declaring draw`
      )
      await db
        .update(battles)
        .set({
          status: 'completed',
          endReason: 'timeout', // Battle ended due to timeout
          completedAt: new Date(),
          winnerId: null // Draw
        })
        .where(eq(battles.id, battleId))

      await sendBattleEvent('battle-completed', {
        battleId,
        winnerId: null, // Draw
        loserId: null,
        reason: 'timeout', // Battle ended due to timeout
        message: 'Battle timed out - Draw',
        player1Id,
        player2Id
      })
    }
  } catch (error: any) {
    console.error(
      `Error handling battle timeout for ${battleId}:`,
      error?.message || error
    )
  }
}

/**
 * Handle battle error and mark as failed
 */
async function handleBattleError(
  battleId: number,
  errorMessage: string
): Promise<void> {
  try {
    console.error(`❌ Battle ${battleId} error: ${errorMessage}`)

    await db
      .update(battles)
      .set({
        status: 'cancelled',
        completedAt: new Date()
      })
      .where(eq(battles.id, battleId))

    await sendBattleEvent('battle-error', {
      battleId,
      error: errorMessage
    })
  } catch (error: any) {
    console.error(
      `Error handling battle error for ${battleId}:`,
      error?.message || error
    )
  }
}
