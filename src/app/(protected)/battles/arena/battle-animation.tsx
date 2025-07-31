'use client'

import React, { useEffect, useState, useCallback } from 'react'

import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords,
  Shield,
  Zap,
  Flame,
  Heart,
  Skull,
  Sparkles,
  Star
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiEndpoints } from '@/config/api-endpoints'
import {
  BATTLE_CONFIG,
  BATTLE_MESSAGES,
  BATTLE_ICONS
} from '@/config/battle.config'
import { useBattleRealtime } from '@/hooks/use-battle-realtime'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'

export interface BattleHistory {
  round: number
  player1Damage: number
  player2Damage: number
  player1Defended: number
  player2Defended: number
}

interface BattleAnimationProps {
  player1: {
    id: number
    name: string
    combatPower: number
  }
  player2: {
    id: number
    name: string
    combatPower: number
  }
  battleId?: number
  _isPlayer1?: boolean
  actualPlayer1Id?: number
  _actualPlayer2Id?: number
  onComplete?: (winnerId: number, reason?: 'hp' | 'timeout') => void
  onBattleHistoryUpdate?: (history: BattleHistory[]) => void
  onRoundProcessingChange?: (isProcessing: boolean) => void
  onRoundTimerUpdate?: (timer: number) => void
  onRoundProgressUpdate?: (progress: number) => void
}

export function BattleAnimation({
  player1,
  player2,
  battleId,
  actualPlayer1Id,
  onComplete,
  onBattleHistoryUpdate,
  onRoundProcessingChange,
  onRoundTimerUpdate,
  onRoundProgressUpdate
}: BattleAnimationProps) {
  const { user } = useSession()
  const [phase, setPhase] = useState<
    'preparing' | 'fighting' | 'victory' | 'complete'
  >('preparing')
  const [player1Health, setPlayer1Health] = useState<number>(
    BATTLE_CONFIG.MAX_HEALTH
  )
  const [player2Health, setPlayer2Health] = useState<number>(
    BATTLE_CONFIG.MAX_HEALTH
  )
  // Store previous health values for smooth transitions during calculations
  const [prevPlayer1Health, setPrevPlayer1Health] = useState<number>(
    BATTLE_CONFIG.MAX_HEALTH
  )
  const [prevPlayer2Health, setPrevPlayer2Health] = useState<number>(
    BATTLE_CONFIG.MAX_HEALTH
  )
  const [currentAttacker, setCurrentAttacker] = useState<1 | 2 | null>(null)
  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [screenShake] = useState(false)
  const [_currentRound, _setCurrentRound] = useState(1)
  const [battleStartTime, setBattleStartTime] = useState<number | null>(null)
  const [battleTimeRemaining, setBattleTimeRemaining] = useState(
    BATTLE_CONFIG.BATTLE_DURATION_MS / 1000
  )
  const [actionCount, setActionCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastProcessTime, setLastProcessTime] = useState(0)
  const [lastAutoActionTime, setLastAutoActionTime] = useState(0)
  const [userActionBonus, setUserActionBonus] = useState(0)
  const [_roundProgress, _setRoundProgress] = useState(100)
  const [roundCountdown, setRoundCountdown] = useState(
    BATTLE_CONFIG.ROUND_INTERVAL / 1000
  )
  const [lastActionType, setLastActionType] = useState<
    'attack' | 'defend' | null
  >(null)
  const [player1AttackEnergy, setPlayer1AttackEnergy] = useState(0)
  const [player2AttackEnergy, setPlayer2AttackEnergy] = useState(0)
  const [player1DefenseEnergy, setPlayer1DefenseEnergy] = useState(0)
  const [player2DefenseEnergy, setPlayer2DefenseEnergy] = useState(0)
  const [player1StoredAttackEnergy, setPlayer1StoredAttackEnergy] = useState(0)
  const [player1StoredDefenseEnergy, setPlayer1StoredDefenseEnergy] =
    useState(0)
  const [_player2StoredAttackEnergy, _setPlayer2StoredAttackEnergy] =
    useState(0)
  const [_player2StoredDefenseEnergy, _setPlayer2StoredDefenseEnergy] =
    useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [autoAttackCooldown, setAutoAttackCooldown] = useState(0)
  const [isRoundProcessing, setIsRoundProcessing] = useState(false)
  const [manualActionCooldown, setManualActionCooldown] = useState(0)
  const [cooldownProgress, setCooldownProgress] = useState(100)
  const [player1ActionIndicator, setPlayer1ActionIndicator] = useState<{
    type: 'attack' | 'defend' | null
    position: 'top' | 'middle' | 'bottom'
    id: number
  }>({ type: null, position: 'middle', id: 0 })
  const [player2ActionIndicator, setPlayer2ActionIndicator] = useState<{
    type: 'attack' | 'defend' | null
    position: 'top' | 'middle' | 'bottom'
    id: number
  }>({ type: null, position: 'middle', id: 0 })
  const [roundSummary, setRoundSummary] = useState<{
    player1Damage: number
    player2Damage: number
    player1Action: string
    player2Action: string
    show: boolean
  } | null>(null)
  const [battleHistory, setBattleHistory] = useState<
    Array<{
      round: number
      player1Damage: number
      player2Damage: number
      player1Defended: number
      player2Defended: number
    }>
  >([])

  // Real-time battle updates
  useBattleRealtime(user?.id, {
    onOpponentAction: data => {
      if (data.battleId !== battleId) return

      // Don't process our own actions
      if (data.playerId === user?.id) return

      // Update opponent's energy display
      const isOpponentPlayer1 = data.playerId === player1.id

      if (isOpponentPlayer1) {
        // We're player 2, update player 1's energy
        if (data.energyStored !== undefined) {
          setPlayer1StoredAttackEnergy(data.energyStored)
        }
        if (data.defenseEnergyStored !== undefined) {
          setPlayer1StoredDefenseEnergy(data.defenseEnergyStored)
        }
        // Show action feedback for opponent
        showActionFeedback(1, data.action)
      } else {
        // We're player 1, update player 2's energy
        if (data.energyStored !== undefined) {
          _setPlayer2StoredAttackEnergy(data.energyStored)
        }
        if (data.defenseEnergyStored !== undefined) {
          _setPlayer2StoredDefenseEnergy(data.defenseEnergyStored)
        }
        // Show action feedback for opponent
        showActionFeedback(2, data.action)
      }
    },
    onBattleTimeout: data => {
      if (data.battleId !== battleId) return

      // Battle timed out, determine winner by HP
      const winnerId =
        data.player1Health > data.player2Health
          ? actualPlayer1Id === user?.id
            ? player1.id
            : player2.id
          : data.player2Health > data.player1Health
            ? actualPlayer1Id === user?.id
              ? player2.id
              : player1.id
            : 0

      // Update UI to show timeout result
      const currentUserWon = winnerId === user?.id
      const uiWinner = currentUserWon ? 1 : 2

      setWinner(uiWinner)
      setPhase('victory')

      // Update health values to final state
      const currentUserIsActualPlayer1 = actualPlayer1Id === user?.id
      if (currentUserIsActualPlayer1) {
        setPlayer1Health(data.player1Health)
        setPlayer2Health(data.player2Health)
      } else {
        setPlayer1Health(data.player2Health)
        setPlayer2Health(data.player1Health)
      }

      if (winnerId && onComplete) {
        onComplete(winnerId, 'timeout')
      }
    },
    onBattleUpdate: data => {
      if (data.battleId !== battleId) return

      // Start round processing animation
      setIsRoundProcessing(true)
      if (onRoundProcessingChange) onRoundProcessingChange(true)
      // Clear action indicators immediately when processing starts
      setPlayer1ActionIndicator({ type: null, position: 'middle', id: 0 })
      setPlayer2ActionIndicator({ type: null, position: 'middle', id: 0 })
      // Stop the countdown when processing
      _setRoundProgress(0)
      setRoundCountdown(0)

      // Update health based on actual battle positions
      const currentUserIsActualPlayer1 = actualPlayer1Id === user?.id

      // Get damage data from the new structure
      const player1TookDamage = currentUserIsActualPlayer1
        ? data.player1Damage || 0
        : data.player2Damage || 0
      const player2TookDamage = currentUserIsActualPlayer1
        ? data.player2Damage || 0
        : data.player1Damage || 0

      // Get actions from the new structure
      const player1Action = currentUserIsActualPlayer1
        ? data.player1Action || 'attack'
        : data.player2Action || 'attack'
      const player2Action = currentUserIsActualPlayer1
        ? data.player2Action || 'attack'
        : data.player1Action || 'attack'

      // Only add to history if this is a new round (prevent duplicates)
      const existingRound = battleHistory.find(h => h.round === data.round)
      let newHistory = battleHistory

      if (!existingRound) {
        newHistory = [
          ...battleHistory,
          {
            round: data.round,
            player1Damage: player1TookDamage,
            player2Damage: player2TookDamage,
            player1Defended: player1Action === 'defend' ? player1TookDamage : 0,
            player2Defended: player2Action === 'defend' ? player2TookDamage : 0
          }
        ]
        setBattleHistory(newHistory)

        // Notify parent component
        if (onBattleHistoryUpdate) {
          onBattleHistoryUpdate(newHistory)
        }
      }

      // Determine action text based on action and damage
      const getActionText = (
        damage: number,
        action: string,
        isCritical: boolean
      ) => {
        if (damage === 0) {
          if (action === 'defend') return BATTLE_MESSAGES.BLOCKED
          return BATTLE_MESSAGES.MISS
        }
        let text = `${damage} HP`
        if (isCritical) text += ` ${BATTLE_MESSAGES.CRITICAL_HIT}`
        else if (action === 'defend') text += ` (${BATTLE_MESSAGES.DEFENDED})`
        else text += ` ${BATTLE_MESSAGES.HIT}`
        return text
      }

      // Show round summary with both players' actions
      setRoundSummary({
        player1Damage: player1TookDamage,
        player2Damage: player2TookDamage,
        player1Action: getActionText(
          player1TookDamage,
          player1Action,
          currentUserIsActualPlayer1
            ? data.player1Critical
            : data.player2Critical
        ),
        player2Action: getActionText(
          player2TookDamage,
          player2Action,
          currentUserIsActualPlayer1
            ? data.player2Critical
            : data.player1Critical
        ),
        show: true
      })

      // Delay health and energy updates to sync with round processing
      setTimeout(() => {
        if (currentUserIsActualPlayer1) {
          // Current user is actual player1, so display data as-is
          const newP1Health = Math.max(
            0,
            data.player1Health || prevPlayer1Health
          )
          const newP2Health = Math.max(
            0,
            data.player2Health || prevPlayer2Health
          )
          setPlayer1Health(newP1Health)
          setPlayer2Health(newP2Health)
          setPrevPlayer1Health(newP1Health)
          setPrevPlayer2Health(newP2Health)
          // Reset to exact server values - don't add stored energy
          setPlayer1AttackEnergy(data.player1Energy || 0)
          setPlayer1DefenseEnergy(data.player1DefenseEnergy || 0)
          // Clear stored energy completely
          setPlayer1StoredAttackEnergy(0)
          setPlayer1StoredDefenseEnergy(0)
          // Update opponent energy from server
          setPlayer2AttackEnergy(data.player2Energy || 0)
          setPlayer2DefenseEnergy(data.player2DefenseEnergy || 0)
        } else {
          // Current user is actual player2, so swap health for display
          const newP1Health = Math.max(
            0,
            data.player2Health || prevPlayer1Health
          )
          const newP2Health = Math.max(
            0,
            data.player1Health || prevPlayer2Health
          )
          setPlayer1Health(newP1Health)
          setPlayer2Health(newP2Health)
          setPrevPlayer1Health(newP1Health)
          setPrevPlayer2Health(newP2Health)
          // Reset to exact server values - don't add stored energy
          setPlayer1AttackEnergy(data.player2Energy || 0)
          setPlayer1DefenseEnergy(data.player2DefenseEnergy || 0)
          // Clear stored energy completely
          setPlayer1StoredAttackEnergy(0)
          setPlayer1StoredDefenseEnergy(0)
          // Update opponent energy from server
          setPlayer2AttackEnergy(data.player1Energy || 0)
          setPlayer2DefenseEnergy(data.player1DefenseEnergy || 0)
        }
        // Update to the new round number
        _setCurrentRound(data.round)

        // Clear round summary after showing
        setTimeout(() => {
          setRoundSummary(null)
        }, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)

        // End round processing and reset countdown
        setIsRoundProcessing(false)
        if (onRoundProcessingChange) onRoundProcessingChange(false)
        // Reset countdown for next round
        _setRoundProgress(100)
        setRoundCountdown(BATTLE_CONFIG.ROUND_INTERVAL / 1000)
        if (onRoundTimerUpdate)
          onRoundTimerUpdate(BATTLE_CONFIG.ROUND_INTERVAL / 1000)
        if (onRoundProgressUpdate) onRoundProgressUpdate(100)
      }, BATTLE_CONFIG.DAMAGE_ANIMATION_DURATION * 3) // Longer delay to show round summary
    },
    onBattleCompleted: data => {
      if (data.battleId !== battleId) return

      // Reset round processing state immediately
      setIsRoundProcessing(false)
      if (onRoundProcessingChange) onRoundProcessingChange(false)

      // Determine winner from UI perspective (current user is always shown as player1)
      const currentUserWon = data.winnerId === user?.id
      const uiWinner = currentUserWon ? 1 : 2

      setWinner(uiWinner)
      setPhase('victory')

      // Set final health to 0 for defeated player
      if (uiWinner === 1) {
        setPlayer2Health(0)
      } else {
        setPlayer1Health(0)
      }

      if (currentUserWon) {
        triggerVictoryConfetti()
      }

      // Don't auto-transition - let user stay on victory screen
      if (onComplete) {
        onComplete(data.winnerId, 'hp')
      }
    }
  })

  // Victory confetti effect
  const triggerVictoryConfetti = () => {
    const duration = BATTLE_CONFIG.CONFETTI_DURATION
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, BATTLE_CONFIG.CONFETTI_INTERVAL)
  }

  // No longer using individual damage numbers - we show round summaries instead

  // Generate automatic action
  const generateAutoAction = useCallback(() => {
    if (phase !== 'fighting' || winner) return null

    const random = Math.random()
    let actionType: 'attack' | 'defend'

    // Use configured probabilities
    if (random < BATTLE_CONFIG.ACTION_PROBABILITY_ATTACK) {
      actionType = 'attack'
    } else {
      actionType = 'defend'
    }

    return actionType
  }, [phase, winner])

  // Process battle round with automatic actions
  const processBattleRound = useCallback(async () => {
    if (!battleId || isProcessing || phase !== 'fighting' || winner) return

    const now = Date.now()
    if (now - lastProcessTime < BATTLE_CONFIG.ROUND_INTERVAL) return // Prevent too frequent processing

    setIsProcessing(true)
    setLastProcessTime(now)

    // Generate automatic action if no recent user action
    const shouldAutoAction =
      now - lastAutoActionTime > BATTLE_CONFIG.ROUND_INTERVAL - 1000
    let actionType: 'attack' | 'defend' | null = null
    const _totalPower = actionCount + userActionBonus

    if (shouldAutoAction && actionCount === 0) {
      actionType = generateAutoAction()
      setLastAutoActionTime(now)
      setLastActionType(actionType)

      // Visual feedback for auto action - current user is always shown as player1 in UI
      setCurrentAttacker(1)
      setTimeout(() => setCurrentAttacker(null), 300)

      // Base power for auto actions
      // totalPower = 1
    }

    try {
      // The battles process endpoint expects battleId and action
      const response = await api.post(apiEndpoints.battles.process, {
        battleId,
        action: actionType || 'attack'
      })

      if (response.data?.data) {
        const data = response.data.data
        // Map health and energy based on actual player positions
        const currentUserIsActualPlayer1 = actualPlayer1Id === user?.id

        if (currentUserIsActualPlayer1) {
          setPlayer1Health(Math.max(0, data.player1Health))
          setPlayer2Health(Math.max(0, data.player2Health))
          setPlayer1AttackEnergy(data.player1Energy || 0)
          setPlayer2AttackEnergy(data.player2Energy || 0)
          setPlayer1DefenseEnergy(data.player1DefenseEnergy || 0)
          setPlayer2DefenseEnergy(data.player2DefenseEnergy || 0)
        } else {
          setPlayer1Health(Math.max(0, data.player2Health))
          setPlayer2Health(Math.max(0, data.player1Health))
          setPlayer1AttackEnergy(data.player2Energy || 0)
          setPlayer2AttackEnergy(data.player1Energy || 0)
          setPlayer1DefenseEnergy(data.player2DefenseEnergy || 0)
          setPlayer2DefenseEnergy(data.player1DefenseEnergy || 0)
        }
        _setCurrentRound(data.currentRound)

        // Reset action count after processing
        if (actionCount > 0) {
          setActionCount(0)
        }
        if (userActionBonus > 0) {
          setUserActionBonus(Math.max(0, userActionBonus - 1))
        }
      }
    } catch (error) {
      console.error('Error processing battle round:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [
    battleId,
    isProcessing,
    phase,
    actionCount,
    userActionBonus,
    lastProcessTime,
    lastAutoActionTime,
    generateAutoAction,
    user?.id,
    player1.id
  ])

  // Handle player action (clicking/tapping for attacks)
  const handlePlayerAction = useCallback(
    async (actionType: 'attack' | 'defend', _storeEnergy = false) => {
      // Prevent actions during round processing or when countdown is 0
      if (
        phase !== 'fighting' ||
        winner ||
        isProcessing ||
        isRoundProcessing ||
        roundCountdown <= 0
      )
        return

      // Rate limiting - match the cooldown duration
      const now = Date.now()
      if (now - lastClickTime < BATTLE_CONFIG.MANUAL_ACTION_COOLDOWN) return
      setLastClickTime(now)

      // Set cooldown to prevent auto-attacks and button clicks
      setManualActionCooldown(BATTLE_CONFIG.MANUAL_ACTION_COOLDOWN / 1000) // Convert ms to seconds
      setCooldownProgress(0)

      // Track the action type
      setLastActionType(actionType)

      // Visual feedback - current user is always shown as player1 in UI
      showActionFeedback(1, actionType)

      // Don't update energy locally - wait for server response
      // Energy will be updated when we receive the server event

      // Send action to server
      if (battleId) {
        try {
          // Send the action to the server - the server handles energy storage
          const response = await api.post(apiEndpoints.battles.process, {
            battleId,
            action: actionType // Send simple action type
          })

          // Update energy based on server response
          if (response.data?.data) {
            const { energyStored, defenseEnergyStored } = response.data.data
            if (actionType === 'attack' && energyStored !== undefined) {
              setPlayer1StoredAttackEnergy(energyStored)
            } else if (
              actionType === 'defend' &&
              defenseEnergyStored !== undefined
            ) {
              setPlayer1StoredDefenseEnergy(defenseEnergyStored)
            }
          }
        } catch (error) {
          console.error('Error sending action:', error)
        }
      }
    },
    [
      phase,
      winner,
      isProcessing,
      battleId,
      lastClickTime,
      isRoundProcessing,
      roundCountdown
    ]
  )

  // Start battle sequence
  useEffect(() => {
    const startBattle = async () => {
      // Preparing phase - use consistent duration
      // This should match the ROUND_SUMMARY_DISPLAY_TIME used in page.tsx
      await new Promise(resolve =>
        setTimeout(resolve, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)
      )
      setPhase('fighting')

      // Set battle start time when fighting begins
      setBattleStartTime(Date.now())

      // If we have a battleId, start processing rounds
      if (battleId) {
        // Initial round processing
        processBattleRound()
      }
    }

    startBattle()
  }, [battleId])

  // Battle timer countdown
  useEffect(() => {
    if (!battleStartTime || phase !== 'fighting' || winner) return

    const timer = setInterval(() => {
      const elapsed = Date.now() - battleStartTime
      const remaining = Math.max(0, BATTLE_CONFIG.BATTLE_DURATION_MS - elapsed)
      setBattleTimeRemaining(Math.floor(remaining / 1000))

      // Check for timeout
      if (remaining <= 0 && !winner) {
        // Battle timeout - determine winner by health
        const winnerId =
          player1Health > player2Health
            ? actualPlayer1Id === user?.id
              ? player1.id
              : player2.id
            : actualPlayer1Id === user?.id
              ? player2.id
              : player1.id
        setWinner(player1Health > player2Health ? 1 : 2)
        if (onComplete) {
          onComplete(winnerId, 'timeout')
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [
    battleStartTime,
    phase,
    winner,
    player1Health,
    player2Health,
    actualPlayer1Id,
    user?.id,
    player1.id,
    player2.id,
    onComplete
  ])

  // Round countdown timer - synced with server processing
  useEffect(() => {
    if (phase !== 'fighting' || !battleId || winner || isRoundProcessing) {
      return
    }

    const interval = setInterval(() => {
      setRoundCountdown(prev => {
        if (prev <= 1) {
          // Time's up, wait for server to process
          return 0
        }
        return prev - 0.1
      })
    }, 100) // Update every 100ms for smooth progress

    return () => clearInterval(interval)
  }, [phase, battleId, winner, isRoundProcessing])

  // Update progress and timer based on countdown
  useEffect(() => {
    if (roundCountdown <= 0) {
      _setRoundProgress(0)
      if (onRoundTimerUpdate) onRoundTimerUpdate(0)
      if (onRoundProgressUpdate) onRoundProgressUpdate(0)
    } else {
      const progress =
        (roundCountdown / (BATTLE_CONFIG.ROUND_INTERVAL / 1000)) * 100
      _setRoundProgress(progress)
      if (onRoundTimerUpdate) onRoundTimerUpdate(Math.ceil(roundCountdown))
      if (onRoundProgressUpdate) onRoundProgressUpdate(progress)
    }
  }, [roundCountdown, onRoundTimerUpdate, onRoundProgressUpdate])

  // Cooldown countdown
  useEffect(() => {
    if (autoAttackCooldown > 0) {
      const timer = setTimeout(() => {
        setAutoAttackCooldown(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoAttackCooldown])

  // Manual action cooldown countdown
  useEffect(() => {
    if (manualActionCooldown > 0) {
      const timer = setTimeout(() => {
        setManualActionCooldown(prev => Math.max(0, prev - 0.01)) // Update every 10ms for smooth countdown
        setCooldownProgress(prev => Math.min(100, prev + 10)) // Progress bar updates at same rate
      }, 10) // Update every 10ms for smoother animation with 0.1s cooldown
      return () => clearTimeout(timer)
    }
  }, [manualActionCooldown])

  // Handle showing action feedback without damage numbers
  const showActionFeedback = useCallback(
    (player: 1 | 2, actionType: 'attack' | 'defend') => {
      // Randomize position
      const positions: ('top' | 'middle' | 'bottom')[] = [
        'top',
        'middle',
        'bottom'
      ]
      const randomPosition =
        positions[Math.floor(Math.random() * positions.length)]
      const actionId = Date.now() + Math.random()

      if (player === 1) {
        setPlayer1ActionIndicator({
          type: actionType,
          position: randomPosition,
          id: actionId
        })
        // Clear after 1.5 seconds (1 second visible + 0.5s fade)
        setTimeout(() => {
          setPlayer1ActionIndicator(prev =>
            prev.id === actionId
              ? { type: null, position: 'middle', id: 0 }
              : prev
          )
        }, BATTLE_CONFIG.DAMAGE_ANIMATION_DURATION * BATTLE_CONFIG.ACTION_INDICATOR_CLEAR_MULTIPLIER)
      } else {
        setPlayer2ActionIndicator({
          type: actionType,
          position: randomPosition,
          id: actionId
        })
        setTimeout(() => {
          setPlayer2ActionIndicator(prev =>
            prev.id === actionId
              ? { type: null, position: 'middle', id: 0 }
              : prev
          )
        }, BATTLE_CONFIG.DAMAGE_ANIMATION_DURATION * BATTLE_CONFIG.ACTION_INDICATOR_CLEAR_MULTIPLIER)
      }
    },
    []
  )

  // Automatic action generation for both players
  useEffect(() => {
    if (phase !== 'fighting' || !battleId || winner) return

    const interval = setInterval(() => {
      // Stop all animations during round processing
      if (isRoundProcessing) return

      // Show both players' actions simultaneously
      // Player 1 (current user) - only auto-attack if not in cooldown
      if (manualActionCooldown <= 0) {
        const player1Action =
          Math.random() < BATTLE_CONFIG.ACTION_PROBABILITY_ATTACK
            ? 'attack'
            : 'defend'
        showActionFeedback(1, player1Action)
      }

      // Player 2 (opponent) - always auto-attacks (not affected by player 1's cooldown)
      const player2Action =
        Math.random() < BATTLE_CONFIG.ACTION_PROBABILITY_ATTACK
          ? 'attack'
          : 'defend'
      showActionFeedback(2, player2Action)
    }, BATTLE_CONFIG.AUTO_ACTION_INTERVAL) // Use configured interval for automatic actions

    return () => clearInterval(interval)
  }, [
    phase,
    battleId,
    winner,
    isRoundProcessing,
    showActionFeedback,
    manualActionCooldown
  ])

  return (
    <div
      className={cn(
        'relative flex min-h-[500px] items-center justify-center',
        screenShake && 'animate-pulse'
      )}
    >
      <AnimatePresence mode='wait'>
        {phase === 'preparing' && (
          <motion.div
            key='preparing'
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className='text-center'
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: BATTLE_CONFIG.BATTLE_PREPARING_DURATION / 1000,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              <Swords className='text-primary mx-auto mb-4 h-20 w-20' />
            </motion.div>
            <h3 className='from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-3xl font-black text-transparent'>
              {BATTLE_MESSAGES.PREPARING}
            </h3>
            <p className='text-muted-foreground mt-2 animate-pulse'>
              {BATTLE_MESSAGES.WARRIORS_ENTERING}
            </p>
          </motion.div>
        )}

        {(phase === 'fighting' || phase === 'victory') && (
          <motion.div
            key='fighting'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='w-full space-y-8'
          >
            {/* Round Processing Indicator removed - now shown in parent component */}

            {/* Round Summary and Action Indicators */}
            <AnimatePresence>
              {/* Show round summary damage */}
              {roundSummary && roundSummary.show && (
                <React.Fragment key='round-summary'>
                  {(roundSummary.player1Damage > 0 ||
                    roundSummary.player1Action.includes('DODGED') ||
                    roundSummary.player1Action.includes('BLOCKED')) && (
                    <motion.div
                      key='player1-damage'
                      initial={{ y: 0, opacity: 1, scale: 1.2 }}
                      animate={{ y: -30, opacity: 0 }}
                      transition={{ duration: 2 }}
                      className='pointer-events-none absolute z-30'
                      style={{
                        left: BATTLE_CONFIG.ROUND_SUMMARY_POSITIONS
                          .PLAYER1_LEFT,
                        top: BATTLE_CONFIG.ROUND_SUMMARY_POSITIONS.TOP
                      }}
                    >
                      <div className='flex flex-col items-center gap-1'>
                        {roundSummary.player1Damage > 0 && (
                          <span className='text-3xl font-black text-red-500'>
                            -{roundSummary.player1Damage}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-lg font-black uppercase',
                            roundSummary.player1Action.includes('CRITICAL')
                              ? 'text-yellow-500'
                              : roundSummary.player1Action.includes('DODGED')
                                ? 'text-blue-500'
                                : roundSummary.player1Action.includes('BLOCKED')
                                  ? 'text-purple-500'
                                  : roundSummary.player1Action.includes(
                                        'Defended'
                                      )
                                    ? 'text-cyan-500'
                                    : 'text-orange-500'
                          )}
                        >
                          {roundSummary.player1Action
                            .replace(/\d+ HP/, '')
                            .trim()}
                        </span>
                      </div>
                    </motion.div>
                  )}
                  {(roundSummary.player2Damage > 0 ||
                    roundSummary.player2Action.includes('DODGED') ||
                    roundSummary.player2Action.includes('BLOCKED')) && (
                    <motion.div
                      key='player2-damage'
                      initial={{ y: 0, opacity: 1, scale: 1.2 }}
                      animate={{ y: -30, opacity: 0 }}
                      transition={{ duration: 2 }}
                      className='pointer-events-none absolute z-30'
                      style={{
                        left: BATTLE_CONFIG.ROUND_SUMMARY_POSITIONS
                          .PLAYER2_LEFT,
                        top: BATTLE_CONFIG.ROUND_SUMMARY_POSITIONS.TOP
                      }}
                    >
                      <div className='flex flex-col items-center gap-1'>
                        {roundSummary.player2Damage > 0 && (
                          <span className='text-3xl font-black text-red-500'>
                            -{roundSummary.player2Damage}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-lg font-black uppercase',
                            roundSummary.player2Action.includes('CRITICAL')
                              ? 'text-yellow-500'
                              : roundSummary.player2Action.includes('DODGED')
                                ? 'text-blue-500'
                                : roundSummary.player2Action.includes('BLOCKED')
                                  ? 'text-purple-500'
                                  : roundSummary.player2Action.includes(
                                        'Defended'
                                      )
                                    ? 'text-cyan-500'
                                    : 'text-orange-500'
                          )}
                        >
                          {roundSummary.player2Action
                            .replace(/\d+ HP/, '')
                            .trim()}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              )}

              {/* Show action indicators for Player 1 - stop during round processing */}
              {!isRoundProcessing && player1ActionIndicator.type && (
                <motion.div
                  key={`p1-action-${player1ActionIndicator.id}`}
                  initial={{ scale: 0.5, opacity: 0, x: -20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className='pointer-events-none absolute z-20'
                  style={{
                    left: BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.PLAYER1_LEFT,
                    top:
                      player1ActionIndicator.position === 'top'
                        ? BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.TOP
                        : player1ActionIndicator.position === 'middle'
                          ? BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.MIDDLE
                          : BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.BOTTOM,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <Badge
                    className={cn(
                      'animate-pulse px-3 py-1 font-bold',
                      player1ActionIndicator.type === 'attack'
                        ? 'border-red-400 bg-red-500/90 text-white'
                        : 'border-blue-400 bg-blue-500/90 text-white'
                    )}
                  >
                    {player1ActionIndicator.type === 'attack'
                      ? `${BATTLE_ICONS.ATTACK} ${BATTLE_MESSAGES.ATTACK_ACTION}`
                      : `${BATTLE_ICONS.DEFEND} ${BATTLE_MESSAGES.DEFEND_ACTION}`}
                  </Badge>
                </motion.div>
              )}

              {/* Show action indicators for Player 2 - stop during round processing */}
              {!isRoundProcessing && player2ActionIndicator.type && (
                <motion.div
                  key={`p2-action-${player2ActionIndicator.id}`}
                  initial={{ scale: 0.5, opacity: 0, x: 20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.8, opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className='pointer-events-none absolute z-20'
                  style={{
                    left: BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.PLAYER2_LEFT,
                    top:
                      player2ActionIndicator.position === 'top'
                        ? BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.TOP
                        : player2ActionIndicator.position === 'middle'
                          ? BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.MIDDLE
                          : BATTLE_CONFIG.ACTION_INDICATOR_POSITIONS.BOTTOM,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <Badge
                    className={cn(
                      'animate-pulse px-3 py-1 font-bold',
                      player2ActionIndicator.type === 'attack'
                        ? 'border-red-400 bg-red-500/90 text-white'
                        : 'border-blue-400 bg-blue-500/90 text-white'
                    )}
                  >
                    {player2ActionIndicator.type === 'attack'
                      ? `${BATTLE_ICONS.ATTACK} ${BATTLE_MESSAGES.ATTACK_ACTION}`
                      : `${BATTLE_ICONS.DEFEND} ${BATTLE_MESSAGES.DEFEND_ACTION}`}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Battle Field */}
            <div className='grid grid-cols-3 items-center gap-8'>
              {/* Player 1 */}
              <motion.div
                animate={{
                  x: currentAttacker === 1 ? 30 : 0,
                  scale:
                    phase === 'victory' && winner === 1
                      ? 1.2
                      : currentAttacker === 1
                        ? 1.1
                        : 1,
                  opacity: phase === 'victory' && winner === 2 ? 0.5 : 1,
                  y: phase === 'victory' && winner === 2 ? 50 : 0
                }}
                transition={{ type: 'spring', stiffness: 200 }}
                className='text-center'
              >
                <div
                  className={cn(
                    'relative inline-block',
                    currentAttacker === 1 && 'animate-pulse'
                  )}
                >
                  {phase === 'victory' && winner === 1 ? (
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Star className='mx-auto mb-2 h-24 w-24 text-yellow-500' />
                    </motion.div>
                  ) : phase === 'victory' && winner === 2 ? (
                    <Skull className='mx-auto mb-2 h-24 w-24 text-gray-500' />
                  ) : (
                    <Shield className='mx-auto mb-2 h-24 w-24 text-blue-500' />
                  )}
                  {currentAttacker === 1 && phase === 'fighting' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className='absolute inset-0 flex items-center justify-center'
                    >
                      <Zap className='h-12 w-12 text-yellow-500' />
                    </motion.div>
                  )}
                </div>
                <p className='font-bold text-blue-600 dark:text-blue-400'>
                  {player1.name}
                </p>
                <p className='text-muted-foreground text-sm'>
                  CP: {player1.combatPower}
                </p>

                {/* Health Bar */}
                <div className='mt-3 space-y-1'>
                  <div className='flex items-center justify-center gap-2'>
                    <Heart className='h-4 w-4 text-red-500' />
                    <span className='text-sm font-bold'>
                      {isNaN(player1Health) ? prevPlayer1Health : player1Health}
                      /{BATTLE_CONFIG.MAX_HEALTH}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((isNaN(player1Health)
                        ? prevPlayer1Health
                        : player1Health) /
                        BATTLE_CONFIG.MAX_HEALTH) *
                      100
                    }
                    className='h-3'
                    indicatorClassName={cn(
                      'transition-all duration-300',
                      player1Health > BATTLE_CONFIG.MAX_HEALTH * 0.5
                        ? 'bg-green-500'
                        : player1Health > BATTLE_CONFIG.MAX_HEALTH * 0.25
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                  />
                </div>

                {/* Energy Meters */}
                <div className='mt-2 space-y-1'>
                  {/* Attack Energy */}
                  <div className='flex items-center justify-center gap-1'>
                    <Flame className='h-3 w-3 text-orange-500' />
                    <Progress
                      value={
                        ((player1AttackEnergy + player1StoredAttackEnergy) /
                          BATTLE_CONFIG.MAX_ENERGY) *
                        100
                      }
                      className='h-2 w-20'
                      indicatorClassName='bg-gradient-to-r from-orange-500 to-red-500'
                    />
                    <span className='text-xs font-bold text-orange-500'>
                      {player1AttackEnergy}
                      {player1StoredAttackEnergy > 0 && (
                        <span className='text-yellow-400'>
                          +{player1StoredAttackEnergy}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* Defense Energy */}
                  <div className='flex items-center justify-center gap-1'>
                    <Shield className='h-3 w-3 text-cyan-500' />
                    <Progress
                      value={
                        ((player1DefenseEnergy + player1StoredDefenseEnergy) /
                          BATTLE_CONFIG.MAX_DEFENSE_ENERGY) *
                        100
                      }
                      className='h-2 w-20'
                      indicatorClassName='bg-gradient-to-r from-cyan-500 to-blue-500'
                    />
                    <span className='text-xs font-bold text-cyan-500'>
                      {player1DefenseEnergy}
                      {player1StoredDefenseEnergy > 0 && (
                        <span className='text-green-400'>
                          +{player1StoredDefenseEnergy}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Victory/Defeat Badge */}
                {phase === 'victory' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {winner === 1 ? (
                      <Badge className='mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-white'>
                        <Sparkles className='mr-2 h-4 w-4' />
                        WINNER!
                      </Badge>
                    ) : (
                      <Badge className='mt-3 bg-gray-500/20 px-4 py-2'>
                        DEFEATED
                      </Badge>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* VS / Battle Status */}
              <div className='text-center'>
                {phase === 'fighting' ? (
                  <>
                    {/* Boxing-Style Battle Timer */}
                    <div className='mb-4 rounded-lg border-2 border-red-500/30 bg-gradient-to-br from-black/80 via-red-900/20 to-black/80 p-3'>
                      <div className='flex items-center justify-center gap-2'>
                        <Skull className='h-5 w-5 animate-pulse text-red-500' />
                        <div className='text-center'>
                          <p className='text-xs font-bold tracking-wider text-red-400 uppercase'>
                            Fight Timer
                          </p>
                          <p
                            className={cn(
                              'text-2xl font-black tabular-nums',
                              battleTimeRemaining <= 30
                                ? 'animate-pulse text-red-500'
                                : battleTimeRemaining <= 60
                                  ? 'text-orange-500'
                                  : 'text-white'
                            )}
                          >
                            {Math.floor(battleTimeRemaining / 60)}:
                            {(battleTimeRemaining % 60)
                              .toString()
                              .padStart(2, '0')}
                          </p>
                          <p className='text-xs text-gray-400'>
                            {battleTimeRemaining <= 30
                              ? 'FINAL SECONDS!'
                              : battleTimeRemaining <= 60
                                ? 'One minute left!'
                                : 'Battle ends on timeout or 0 HP'}
                          </p>
                        </div>
                        <Skull className='h-5 w-5 animate-pulse text-red-500' />
                      </div>
                      <Progress
                        value={
                          (battleTimeRemaining /
                            (BATTLE_CONFIG.BATTLE_DURATION_MS / 1000)) *
                          100
                        }
                        className='mt-2 h-2'
                        indicatorClassName={cn(
                          'transition-all duration-1000',
                          battleTimeRemaining <= 30
                            ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse'
                            : battleTimeRemaining <= 60
                              ? 'bg-gradient-to-r from-orange-600 to-orange-500'
                              : 'bg-gradient-to-r from-green-600 to-green-500'
                        )}
                      />
                    </div>

                    <motion.div
                      animate={{ rotate: currentAttacker ? 360 : 0 }}
                      transition={{ duration: 0.5 }}
                      className='inline-block'
                    >
                      <Flame className='mx-auto h-16 w-16 text-orange-500' />
                    </motion.div>
                    <p className='mt-2 text-3xl font-black'>
                      {BATTLE_MESSAGES.BATTLE_LABEL}
                    </p>
                    {currentAttacker && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='mt-2 text-sm font-bold text-orange-500'
                      >
                        {currentAttacker === 1 ? player1.name : player2.name}{' '}
                        {lastActionType === 'defend'
                          ? BATTLE_MESSAGES.DEFENDS
                          : BATTLE_MESSAGES.ATTACKS}
                      </motion.p>
                    )}
                  </>
                ) : phase === 'victory' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <Swords className='mx-auto h-16 w-16 text-yellow-500' />
                    <p className='mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-3xl font-black text-transparent'>
                      BATTLE OVER!
                    </p>
                  </motion.div>
                ) : null}
              </div>

              {/* Player 2 */}
              <motion.div
                animate={{
                  x: currentAttacker === 2 ? -30 : 0,
                  scale:
                    phase === 'victory' && winner === 2
                      ? 1.2
                      : currentAttacker === 2
                        ? 1.1
                        : 1,
                  opacity: phase === 'victory' && winner === 1 ? 0.5 : 1,
                  y: phase === 'victory' && winner === 1 ? 50 : 0
                }}
                transition={{ type: 'spring', stiffness: 200 }}
                className='text-center'
              >
                <div
                  className={cn(
                    'relative inline-block',
                    currentAttacker === 2 && 'animate-pulse'
                  )}
                >
                  {phase === 'victory' && winner === 2 ? (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Star className='mx-auto mb-2 h-24 w-24 text-yellow-500' />
                    </motion.div>
                  ) : phase === 'victory' && winner === 1 ? (
                    <Skull className='mx-auto mb-2 h-24 w-24 text-gray-500' />
                  ) : (
                    <Shield className='mx-auto mb-2 h-24 w-24 text-red-500' />
                  )}
                  {currentAttacker === 2 && phase === 'fighting' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className='absolute inset-0 flex items-center justify-center'
                    >
                      <Zap className='h-12 w-12 text-yellow-500' />
                    </motion.div>
                  )}
                </div>
                <p className='font-bold text-red-600 dark:text-red-400'>
                  {player2.name}
                </p>
                <p className='text-muted-foreground text-sm'>
                  CP: {player2.combatPower}
                </p>

                {/* Health Bar */}
                <div className='mt-3 space-y-1'>
                  <div className='flex items-center justify-center gap-2'>
                    <Heart className='h-4 w-4 text-red-500' />
                    <span className='text-sm font-bold'>
                      {isNaN(player2Health) ? prevPlayer2Health : player2Health}
                      /{BATTLE_CONFIG.MAX_HEALTH}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((isNaN(player2Health)
                        ? prevPlayer2Health
                        : player2Health) /
                        BATTLE_CONFIG.MAX_HEALTH) *
                      100
                    }
                    className='h-3'
                    indicatorClassName={cn(
                      'transition-all duration-300',
                      player2Health > BATTLE_CONFIG.MAX_HEALTH * 0.5
                        ? 'bg-green-500'
                        : player2Health > BATTLE_CONFIG.MAX_HEALTH * 0.25
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                  />
                </div>

                {/* Energy Meters */}
                <div className='mt-2 space-y-1'>
                  {/* Attack Energy */}
                  <div className='flex items-center justify-center gap-1'>
                    <Flame className='h-3 w-3 text-orange-500' />
                    <Progress
                      value={
                        (player2AttackEnergy / BATTLE_CONFIG.MAX_ENERGY) * 100
                      }
                      className='h-2 w-20'
                      indicatorClassName='bg-gradient-to-r from-orange-500 to-red-500'
                    />
                    <span className='text-xs font-bold text-orange-500'>
                      {player2AttackEnergy}
                    </span>
                  </div>
                  {/* Defense Energy */}
                  <div className='flex items-center justify-center gap-1'>
                    <Shield className='h-3 w-3 text-cyan-500' />
                    <Progress
                      value={
                        (player2DefenseEnergy /
                          BATTLE_CONFIG.MAX_DEFENSE_ENERGY) *
                        100
                      }
                      className='h-2 w-20'
                      indicatorClassName='bg-gradient-to-r from-cyan-500 to-blue-500'
                    />
                    <span className='text-xs font-bold text-cyan-500'>
                      {player2DefenseEnergy}
                    </span>
                  </div>
                </div>

                {/* Victory/Defeat Badge */}
                {phase === 'victory' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {winner === 2 ? (
                      <Badge className='mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-white'>
                        <Sparkles className='mr-2 h-4 w-4' />
                        WINNER!
                      </Badge>
                    ) : (
                      <Badge className='mt-3 bg-gray-500/20 px-4 py-2'>
                        DEFEATED
                      </Badge>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Action Buttons - Gamified Design */}
            {phase === 'fighting' && !winner && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className='mt-8 space-y-4'
              >
                <div className='flex justify-center gap-6'>
                  {/* Attack Button */}
                  <motion.button
                    onClick={() => handlePlayerAction('attack', true)}
                    disabled={
                      isProcessing ||
                      manualActionCooldown > 0 ||
                      isRoundProcessing ||
                      roundCountdown <= 0
                    }
                    whileHover={{ scale: 1.05, rotate: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'group relative h-20 w-32 overflow-hidden rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-600 via-orange-600 to-red-700 p-1 shadow-2xl transition-all hover:border-red-400 hover:shadow-red-500/50 disabled:cursor-not-allowed disabled:opacity-50',
                      isRoundProcessing && 'animate-pulse opacity-30'
                    )}
                  >
                    <div className='absolute inset-0 bg-gradient-to-t from-transparent via-red-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
                    <div className='absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-orange-400/30 to-transparent' />
                    <div className='relative flex h-full flex-col items-center justify-center rounded-xl bg-gradient-to-b from-red-900/50 to-orange-900/50 backdrop-blur-sm'>
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 10, 0] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity
                        }}
                      >
                        <Swords className='mb-1 h-8 w-8 text-white drop-shadow-lg' />
                      </motion.div>
                      <span className='text-sm font-black tracking-wider text-white drop-shadow-lg'>
                        ATTACK
                      </span>
                      <span className='text-xs text-white/80'>
                        +{BATTLE_CONFIG.ENERGY_PER_CLICK} Energy
                      </span>
                      <div className='absolute right-0 -bottom-1 left-0 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-80' />
                    </div>
                    {/* Particle effects */}
                    <div className='pointer-events-none absolute inset-0'>
                      <div className='absolute top-2 left-2 h-1 w-1 animate-ping rounded-full bg-orange-400' />
                      <div className='animation-delay-200 absolute top-4 right-4 h-1 w-1 animate-ping rounded-full bg-red-400' />
                      <div className='animation-delay-400 absolute bottom-3 left-6 h-1 w-1 animate-ping rounded-full bg-yellow-400' />
                    </div>
                  </motion.button>

                  {/* Defend Button */}
                  <motion.button
                    onClick={() => handlePlayerAction('defend', true)}
                    disabled={
                      isProcessing ||
                      manualActionCooldown > 0 ||
                      isRoundProcessing ||
                      roundCountdown <= 0
                    }
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'group relative h-20 w-32 overflow-hidden rounded-2xl border-2 border-blue-500/50 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 p-1 shadow-2xl transition-all hover:border-blue-400 hover:shadow-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50',
                      isRoundProcessing && 'animate-pulse opacity-30'
                    )}
                  >
                    <div className='absolute inset-0 bg-gradient-to-t from-transparent via-blue-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
                    <div className='absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent' />
                    <div className='relative flex h-full flex-col items-center justify-center rounded-xl bg-gradient-to-b from-blue-900/50 to-cyan-900/50 backdrop-blur-sm'>
                      <motion.div
                        animate={{ scale: [1, 1.1] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          repeatType: 'reverse'
                        }}
                      >
                        <Shield className='mb-1 h-8 w-8 text-white drop-shadow-lg' />
                      </motion.div>
                      <span className='text-sm font-black tracking-wider text-white drop-shadow-lg'>
                        DEFEND
                      </span>
                      <span className='text-xs text-white/80'>
                        +{BATTLE_CONFIG.DEFENSE_ENERGY_PER_CLICK} Defense
                      </span>
                      <div className='absolute right-0 -bottom-1 left-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-80' />
                    </div>
                    {/* Shield ripple effect */}
                    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                      <div className='h-16 w-16 animate-ping rounded-full border border-cyan-400/30' />
                    </div>
                  </motion.button>
                </div>

                {/* Energy Storage Info */}
                <p className='text-muted-foreground text-center text-xs'>
                  Store energy to amplify future attacks or defense • Rate
                  limited: 1 click per{' '}
                  {(BATTLE_CONFIG.MANUAL_ACTION_COOLDOWN / 1000).toFixed(1)}s
                </p>

                {/* Manual Action Cooldown Progress */}
                {manualActionCooldown > 0 && (
                  <div className='mt-4 text-center'>
                    <div className='mx-auto max-w-xs'>
                      <p className='mb-1 text-xs font-semibold text-yellow-500'>
                        Storing Energy... (
                        {(
                          BATTLE_CONFIG.MANUAL_ACTION_COOLDOWN / 1000 -
                          manualActionCooldown
                        ).toFixed(1)}
                        s)
                      </p>
                      <Progress
                        value={cooldownProgress}
                        className='h-3'
                        indicatorClassName='bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                      />
                    </div>
                  </div>
                )}

                {/* Round countdown moved to parent component header */}
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div
            key='complete'
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className='text-center'
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1 }}
            >
              <Swords className='text-primary mx-auto mb-4 h-16 w-16' />
            </motion.div>
            <h3 className='text-xl font-bold'>
              {BATTLE_MESSAGES.PROCESSING_RESULTS}
            </h3>
            <p className='text-muted-foreground mt-2'>
              {BATTLE_MESSAGES.CALCULATING_REWARDS}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
