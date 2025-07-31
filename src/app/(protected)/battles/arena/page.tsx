'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords,
  Trophy,
  Shield,
  Flame,
  User,
  Sparkles,
  RefreshCw,
  Zap,
  Timer
} from 'lucide-react'

import { LiveStatsDisplay } from '@/components/blocks/battle/live-stats-display'
import { GamifiedHeader } from '@/components/blocks/trading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import {
  BATTLE_CONFIG,
  BATTLE_STATUS,
  BATTLE_MESSAGES,
  BATTLE_ICONS,
  BATTLE_STYLES
} from '@/config/battle.config'
import { useBattleInvitations } from '@/hooks/use-battle-invitations'
import { useBattleRealtime } from '@/hooks/use-battle-realtime'
import { useBattles } from '@/hooks/use-battles'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'
import { formatNumber } from '@/lib/utils/string'

import { BattleAnimation, type BattleHistory } from './battle-animation'
import { BattleCountdown } from './battle-countdown'
import { DailyLimitTimer } from './daily-limit-timer'
import { DiscountTimer } from './discount-timer'
import { MatchmakingInterface } from './matchmaking-interface'

type BattleState =
  | 'idle'
  | 'searching'
  | 'waiting'
  | 'invitation-sent'
  | 'invitation-received'
  | 'invitation-invalid'
  | 'preparing'
  | 'countdown'
  | 'battling'
  | 'result'

interface CurrentBattleData {
  battleId: number
  isPlayer1: boolean
  player1: { id: number; combatPower: number }
  player2: { id: number; combatPower: number }
  opponent: { id: number; name: string; combatPower: number }
  winnerId?: number
  feeDiscountPercent?: number
  cpChange?: number
  newCP?: number
}

export default function BattleArenaPage() {
  const { user } = useSession()
  // Removed toast - all notifications handled in UI
  const { stats } = useRewards(user?.id)
  const {
    activeDiscount,
    battleHistory,
    battleHistoryStats,
    dailyLimit,
    battleStats,
    canBattle,
    isSearching: _isSearching,
    battleResult,
    isInQueue,
    findMatch,
    leaveQueue,
    createBattle: _createBattle
  } = useBattles(user?.id)

  // Battle state management
  const [battleState, setBattleState] = useState<BattleState>('idle')
  const battleStateRef = useRef<BattleState>('idle')
  const [currentOpponent, setCurrentOpponent] = useState<any>(null)
  const [currentInvitationId, setCurrentInvitationId] = useState<number | null>(
    null
  )
  const [currentBattleData, setCurrentBattleData] =
    useState<CurrentBattleData | null>(null)
  const [battleScorecard, setBattleScorecard] = useState<BattleHistory[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [roundTimer, setRoundTimer] = useState(
    BATTLE_CONFIG.ROUND_INTERVAL / 1000
  )
  const [isCalculatingRound, setIsCalculatingRound] = useState(false)
  const [roundProgress, setRoundProgress] = useState(100)
  const [battleEndReason, setBattleEndReason] = useState<
    'hp' | 'timeout' | null
  >(null)

  // Match range state - lifted from MatchmakingInterface to persist across component instances
  const [activeSearchMinCP, setActiveSearchMinCP] = useState<number | null>(
    null
  )
  const [activeSearchMaxCP, setActiveSearchMaxCP] = useState<number | null>(
    null
  )
  const [activeSearchRange, setActiveSearchRange] = useState<number | null>(
    null
  )

  // Memoized callbacks for BattleAnimation to prevent re-renders
  const handleRoundTimerUpdate = useCallback((timer: number) => {
    setRoundTimer(timer)
    // Set calculating state when timer reaches 0
    if (timer === 0) {
      setIsCalculatingRound(true)
    }
  }, [])

  const handleRoundProgressUpdate = useCallback((progress: number) => {
    setRoundProgress(progress)
  }, [])

  // Keep ref in sync with state
  useEffect(() => {
    battleStateRef.current = battleState
  }, [battleState])
  const [selectedTab, setSelectedTab] = useState('arena')

  // Reset round timer when battle state changes
  useEffect(() => {
    if (battleState !== 'battling') {
      setRoundTimer(BATTLE_CONFIG.ROUND_INTERVAL / BATTLE_CONFIG.MS_PER_SECOND)
      setIsCalculatingRound(false)
    }
  }, [battleState])

  const {
    pendingInvitations,
    acceptInvitation,
    rejectInvitation,
    sendInvitation
  } = useBattleInvitations(user?.id)

  // Current battle data is managed via Pusher events - no polling needed
  const [_currentBattle, _setCurrentBattle] =
    useState<CurrentBattleData | null>(null)

  // Poll for battle status when invitation is sent
  useEffect(() => {
    if (battleState !== 'invitation-sent' || !currentInvitationId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(apiEndpoints.battles.state)
        // Check for both preparing and ongoing states (invitation accepted)
        if (
          response.data?.data?.battle?.status === BATTLE_STATUS.PREPARING ||
          response.data?.data?.battle?.status === BATTLE_STATUS.ONGOING
        ) {
          // Invitation has been accepted, update UI immediately
          const { battle, _state, _rounds, player1, player2 } =
            response.data.data

          // Determine player positions
          const isPlayer1 = battle.player1Id === user?.id
          const opponent = isPlayer1 ? player2 : player1
          const opponentCP = isPlayer1
            ? battle.player2CombatPower
            : battle.player1CombatPower

          // Update state based on battle status
          if (battle.status === BATTLE_STATUS.PREPARING) {
            // Invitation accepted, show preparing state
            setBattleState('preparing')
            setCurrentOpponent({
              id: opponent.id,
              username: opponent.name || opponent.email || 'Opponent',
              combatPower: opponentCP
            })
            clearInterval(pollInterval)
          } else if (battle.status === BATTLE_STATUS.ONGOING) {
            // Battle has started
            // Format battle data
            const formattedBattleData: CurrentBattleData = {
              battleId: battle.id,
              isPlayer1,
              player1: {
                id: battle.player1Id,
                combatPower: battle.player1CombatPower
              },
              player2: {
                id: battle.player2Id,
                combatPower: battle.player2CombatPower
              },
              opponent: {
                id: opponent.id,
                name: opponent.name || opponent.username || 'Opponent',
                combatPower: opponentCP
              },
              winnerId: battle.winnerId,
              feeDiscountPercent: battle.feeDiscountPercent
            }

            // Update state
            setBattleState('preparing')
            setCurrentBattleData(formattedBattleData)
            setCurrentInvitationId(null)

            // Transition to countdown after preparing
            setTimeout(() => {
              setBattleState('countdown')
            }, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)

            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error('Error polling battle status:', error)
      }
    }, BATTLE_CONFIG.INVITATION_POLL_INTERVAL)

    return () => clearInterval(pollInterval)
  }, [battleState, currentInvitationId, user?.id])

  // Check for ongoing battle on page load - this is only done once
  // All subsequent updates come via Pusher
  useEffect(() => {
    const checkOngoingBattle = async () => {
      if (!user?.id || battleState !== 'idle') return

      try {
        // First check for ongoing or preparing battles
        const battleStateResponse = await api.get(apiEndpoints.battles.state)
        if (
          battleStateResponse.data?.data?.battle &&
          (battleStateResponse.data?.data?.battle?.status ===
            BATTLE_STATUS.ONGOING ||
            battleStateResponse.data?.data?.battle?.status ===
              BATTLE_STATUS.PREPARING)
        ) {
          const { battle, state, rounds, player1, player2 } =
            battleStateResponse.data.data

          // Determine player positions
          const isPlayer1 = battle.player1Id === user.id
          const opponent = isPlayer1 ? player2 : player1
          const opponentCP = isPlayer1
            ? battle.player2CombatPower
            : battle.player1CombatPower

          // Format battle data properly
          const formattedBattleData: CurrentBattleData = {
            battleId: battle.id,
            isPlayer1,
            player1: {
              id: battle.player1Id,
              combatPower: battle.player1CombatPower
            },
            player2: {
              id: battle.player2Id,
              combatPower: battle.player2CombatPower
            },
            opponent: {
              id: opponent.id,
              name: opponent.name || opponent.username || 'Opponent',
              combatPower: opponentCP
            },
            winnerId: battle.winnerId,
            feeDiscountPercent: battle.feeDiscountPercent
          }

          // Restore battle state
          setBattleState('battling')
          setCurrentBattleData(formattedBattleData)
          setCurrentOpponent({
            id: opponent.id,
            username: opponent.name || opponent.username || 'Opponent',
            combatPower: opponentCP
          })

          // Restore scorecard from rounds
          if (rounds && rounds.length > 0) {
            const scorecard = rounds.map((round: any) => ({
              round: round.roundNumber,
              player1Damage: round.player1Damage || 0,
              player2Damage: round.player2Damage || 0,
              player1Defended: round.player1Defended || 0,
              player2Defended: round.player2Defended || 0
            }))
            setBattleScorecard(scorecard)
            setCurrentRound(state?.currentRound || rounds.length + 1)
          }

          return // Don't check invitations if there's an ongoing battle
        }

        // Only check invitations if no ongoing battle
        const invitesResponse = await api.get(apiEndpoints.battles.invitations)
        if (invitesResponse.data?.data?.sent?.length > 0) {
          // User has sent invitations - they should see waiting state
          // const sentInvite = invitesResponse.data.data.sent[0]
          setBattleState('waiting')
        } else if (invitesResponse.data?.data?.received?.length > 0) {
          // User has received invitations - they'll see them in the UI
          // The invitation component will handle showing them
        }
      } catch (error) {
        console.error('Error checking battle state:', error)
      }
    }

    checkOngoingBattle()
  }, [user?.id])

  // Setup real-time battle events
  useBattleRealtime(user?.id, {
    onInvitationReceived: _data => {
      if (battleStateRef.current === 'idle') {
        setBattleState('invitation-received')
      }
    },
    onBattleTimeout: data => {
      if (battleStateRef.current === 'battling') {
        // Determine winner based on remaining HP
        const winnerId =
          data.player1Health > data.player2Health
            ? data.player1Id
            : data.player2Health > data.player1Health
              ? data.player2Id
              : null

        setBattleState('result')
        setBattleEndReason('timeout')
        setIsCalculatingRound(false) // Reset calculating state
        setRoundTimer(
          BATTLE_CONFIG.ROUND_INTERVAL / BATTLE_CONFIG.MS_PER_SECOND
        ) // Reset timer
        setCurrentBattleData(prev => ({
          ...prev!,
          winnerId,
          feeDiscountPercent:
            winnerId === user?.id ? BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT : 0
        }))
      }
    },
    onInvitationAccepted: data => {
      // Sender receives this when their invitation is accepted
      // Immediately transition to preparing state for sender
      if (
        battleStateRef.current === 'invitation-sent' ||
        battleStateRef.current === 'waiting'
      ) {
        setBattleState('preparing')
        setCurrentInvitationId(null)

        // If we have battle data, set it up now
        if (data.battleId) {
          const currentUserIsPlayer1 = data.player1Id === user?.id
          const opponentId = currentUserIsPlayer1
            ? data.player2Id
            : data.player1Id
          const opponentName = currentUserIsPlayer1
            ? data.player2Name || currentOpponent?.username || 'Opponent'
            : data.player1Name || currentOpponent?.username || 'Opponent'
          const opponentCP = currentUserIsPlayer1
            ? data.player2CP ||
              currentOpponent?.combatPower ||
              BATTLE_CONFIG.MIN_COMBAT_POWER
            : data.player1CP ||
              currentOpponent?.combatPower ||
              BATTLE_CONFIG.MIN_COMBAT_POWER

          const formattedData: CurrentBattleData = {
            battleId: data.battleId,
            isPlayer1: currentUserIsPlayer1,
            player1: {
              id: data.player1Id,
              combatPower: data.player1CP || BATTLE_CONFIG.MIN_COMBAT_POWER
            },
            player2: {
              id: data.player2Id,
              combatPower: data.player2CP || BATTLE_CONFIG.MIN_COMBAT_POWER
            },
            opponent: {
              id: opponentId,
              name: opponentName,
              combatPower: opponentCP
            },
            winnerId: undefined,
            feeDiscountPercent: 0
          }

          setCurrentBattleData(formattedData)

          // Update opponent info
          setCurrentOpponent({
            userId: opponentId,
            username: opponentName,
            combatPower: opponentCP
          })
        }

        // Synchronize countdown timing with accepter
        // Both players transition to countdown after same preparing duration
        setTimeout(() => {
          if (battleStateRef.current === 'preparing') {
            setBattleState('countdown')
          }
        }, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)
      }
    },
    onInvitationRejected: _data => {
      if (battleStateRef.current === 'invitation-sent') {
        setBattleState('idle')
        setCurrentOpponent(null)
        setCurrentInvitationId(null)
        // No toast - UI already shows the state change
      }
    },
    onBattleStarted: data => {
      // Both users receive this when battle starts
      // This event is sent to both players simultaneously to ensure sync
      const currentState = battleStateRef.current

      // Clear invitation state for both players
      setCurrentInvitationId(null)

      // Process for all relevant states - ensure both players transition
      if (currentState !== 'battling' && currentState !== 'result') {
        // Determine player positions correctly
        const currentUserIsPlayer1 = data.player1Id === user?.id
        const opponentId = currentUserIsPlayer1
          ? data.player2Id
          : data.player1Id
        const opponentName = currentUserIsPlayer1
          ? data.player2Name ||
            data.toUserName ||
            currentOpponent?.username ||
            'Opponent'
          : data.player1Name ||
            data.fromUserName ||
            currentOpponent?.username ||
            'Opponent'
        const opponentCP = currentUserIsPlayer1
          ? data.player2CP || BATTLE_CONFIG.MIN_COMBAT_POWER
          : data.player1CP || BATTLE_CONFIG.MIN_COMBAT_POWER

        // Format battle data properly for both users
        const formattedData: CurrentBattleData = {
          battleId: data.battleId,
          isPlayer1: currentUserIsPlayer1,
          player1: {
            id: data.player1Id || data.fromUserId,
            combatPower: data.player1CP || BATTLE_CONFIG.MIN_COMBAT_POWER
          },
          player2: {
            id: data.player2Id || data.toUserId,
            combatPower: data.player2CP || BATTLE_CONFIG.MIN_COMBAT_POWER
          },
          opponent: {
            id: opponentId,
            name: opponentName,
            combatPower: opponentCP
          },
          winnerId: data.winnerId,
          feeDiscountPercent: data.feeDiscountPercent || 0
        }

        setCurrentBattleData(formattedData)

        // Update opponent info
        setCurrentOpponent({
          userId: opponentId,
          username: opponentName,
          combatPower: opponentCP
        })

        // Both players should be in sync now
        // If we're not already in countdown, transition through preparing first
        if (currentState !== 'countdown' && currentState !== 'preparing') {
          setBattleState('preparing')

          // Both players transition to countdown after same duration
          setTimeout(() => {
            if (battleStateRef.current === 'preparing') {
              setBattleState('countdown')
            }
          }, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)
        } else if (currentState === 'preparing') {
          // Already in preparing, just schedule countdown transition
          setTimeout(() => {
            if (battleStateRef.current === 'preparing') {
              setBattleState('countdown')
            }
          }, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)
        }
        // If already in countdown, don't change state but update battle data
      }
    },
    onBattleCompleted: data => {
      if (battleStateRef.current === 'battling') {
        setBattleState('result')
        // Set reason based on event data, default to 'hp' if not provided
        setBattleEndReason(data.reason || 'hp')
        setIsCalculatingRound(false) // Reset calculating state
        setRoundTimer(
          BATTLE_CONFIG.ROUND_INTERVAL / BATTLE_CONFIG.MS_PER_SECOND
        ) // Reset timer

        // Determine if current user won
        const isWinner = data.winnerId === user?.id
        const cpChange = isWinner ? data.winnerCP : data.loserCP
        const newCP = isWinner ? data.winnerNewCP : data.loserNewCP

        setCurrentBattleData(prev => ({
          ...prev!,
          winnerId: data.winnerId,
          feeDiscountPercent: data.feeDiscountPercent || 0,
          cpChange: cpChange || 0,
          newCP:
            newCP ||
            prev?.player1?.combatPower ||
            BATTLE_CONFIG.MIN_COMBAT_POWER
        }))
      }
    }
  })

  // Handle finding a match
  const handleFindMatch = async (matchRange?: number) => {
    if (!canBattle) return null

    // Store the search parameters when search starts
    if (matchRange !== undefined) {
      const minCP = Math.floor(combatPower * (1 - matchRange / 100))
      const maxCP = Math.ceil(combatPower * (1 + matchRange / 100))
      setActiveSearchMinCP(minCP)
      setActiveSearchMaxCP(maxCP)
      setActiveSearchRange(matchRange)
    }

    setBattleState('searching')
    const opponent = await findMatch(matchRange)

    if (opponent) {
      // Send invitation to matched opponent
      const invitation = await sendInvitation(opponent.userId)
      if (invitation) {
        setCurrentOpponent(opponent)
        setCurrentInvitationId(invitation.invitationId)
        setBattleState('invitation-sent')
      } else {
        setBattleState('idle')
      }
    } else {
      // No match found, stay in queue (no need to show anything)
      // User is already informed by the UI state
      setBattleState('idle')
    }

    return opponent
  }

  // Handle incoming battle invitations
  useEffect(() => {
    if (pendingInvitations.length > 0 && battleState === 'idle') {
      const latestInvitation = pendingInvitations[0]
      const displayName =
        latestInvitation.fromUser.name ||
        (latestInvitation.fromUser as any).email ||
        `${latestInvitation.fromUser.walletAddress?.slice(0, 6)}...${latestInvitation.fromUser.walletAddress?.slice(-4)}` ||
        'Anonymous Warrior'

      setCurrentOpponent({
        userId: latestInvitation.fromUserId,
        username: displayName,
        combatPower: latestInvitation.fromUserCP
      })
      setCurrentInvitationId(latestInvitation.id)
      setBattleState('invitation-received')
    }
  }, [pendingInvitations, battleState])

  // Handle accepting battle
  const handleAcceptBattle = async () => {
    if (!currentInvitationId) return

    setBattleState('preparing')
    const result = await acceptInvitation(currentInvitationId)

    if (result) {
      // Determine player positions - accepter can be either player1 or player2
      // depending on who sent the invitation
      const currentUserIsPlayer1 = result.player1Id === user?.id
      const opponentId = currentUserIsPlayer1
        ? result.player2Id || result.fromUserId
        : result.player1Id || result.fromUserId
      const opponentName = currentOpponent?.username || 'Opponent'
      const opponentCP = currentUserIsPlayer1
        ? result.player2CP ||
          currentOpponent?.combatPower ||
          BATTLE_CONFIG.MIN_COMBAT_POWER
        : result.player1CP ||
          currentOpponent?.combatPower ||
          BATTLE_CONFIG.MIN_COMBAT_POWER

      // Format battle data properly
      const formattedData: CurrentBattleData = {
        battleId: result.battleId,
        isPlayer1: currentUserIsPlayer1,
        player1: {
          id: result.player1Id || result.fromUserId,
          combatPower: result.player1CP || BATTLE_CONFIG.MIN_COMBAT_POWER
        },
        player2: {
          id: result.player2Id || result.toUserId,
          combatPower: result.player2CP || BATTLE_CONFIG.MIN_COMBAT_POWER
        },
        opponent: {
          id: opponentId,
          name: opponentName,
          combatPower: opponentCP
        },
        winnerId: result.winnerId,
        feeDiscountPercent: result.feeDiscountPercent || 0
      }

      setCurrentBattleData(formattedData)
      setCurrentInvitationId(null)

      // Update opponent info to ensure consistency
      setCurrentOpponent({
        userId: opponentId,
        username: opponentName,
        combatPower: opponentCP
      })

      // Synchronize countdown timing with sender
      // Both players should transition after the same preparing duration
      setTimeout(() => {
        if (battleStateRef.current === 'preparing') {
          setBattleState('countdown')
        }
      }, BATTLE_CONFIG.ROUND_SUMMARY_DISPLAY_TIME)
    } else {
      // Invitation was invalid or expired
      setBattleState('invitation-invalid')
      setCurrentOpponent(null)
      setCurrentInvitationId(null)
    }
  }

  // Handle rejecting battle
  const handleRejectBattle = async () => {
    if (!currentInvitationId) return

    await rejectInvitation(currentInvitationId)
    setBattleState('idle')
    setCurrentOpponent(null)
    setCurrentInvitationId(null)
  }

  // Handle countdown complete - start battle via job queue
  const handleCountdownComplete = async () => {
    if (currentBattleData?.battleId) {
      try {
        // Start the battle rounds via job queue
        const response = await fetch(apiEndpoints.battles.start, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ battleId: currentBattleData.battleId })
        })

        if (response.ok) {
          setBattleState('battling')
        } else {
          // Log the error details for debugging
          const errorData = await response.json().catch(() => ({}))
          console.error('Failed to start battle:', errorData)
          // Don't reset to idle, transition to battling anyway since battle might already be ongoing
          setBattleState('battling')
        }
      } catch (error) {
        console.error('Error starting battle:', error)
        // Don't reset to idle, transition to battling anyway
        setBattleState('battling')
      }
    }
  }

  // Handle battle animation complete
  const handleBattleComplete = useCallback(
    (winnerId: number, reason: 'hp' | 'timeout' = 'hp') => {
      setBattleState('result')
      setBattleEndReason(reason)

      // Update current battle data with winner
      setCurrentBattleData(prev =>
        prev
          ? {
              ...prev,
              winnerId,
              feeDiscountPercent: BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT
            }
          : null
      )

      // No auto-reset - user must manually return to lobby
    },
    [user?.id]
  )

  // Reset battle state (keeps scorecard)
  const resetBattle = () => {
    setBattleState('idle')
    setCurrentOpponent(null)
    setCurrentInvitationId(null)
    setCurrentBattleData(null)
    setCurrentRound(1) // Reset to round 1
    setBattleEndReason(null)
    // Reset search parameters
    setActiveSearchMinCP(null)
    setActiveSearchMaxCP(null)
  }

  // Full reset including scorecard
  const fullResetBattle = () => {
    resetBattle()
    setBattleScorecard([])
    setActiveSearchRange(null)
  }

  const combatPower =
    stats?.gameData?.combatPower || BATTLE_CONFIG.MIN_COMBAT_POWER

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Header */}
        <GamifiedHeader
          title='BATTLE ARENA'
          subtitle='Challenge opponents and earn fee discounts'
          icon={<Swords className='h-8 w-8 text-white' />}
          actions={
            <div className='flex gap-4'>
              {activeDiscount && <DiscountTimer discount={activeDiscount} />}
              {dailyLimit && (
                <DailyLimitTimer
                  dailyLimit={dailyLimit}
                  userId={user?.id || 0}
                  onLimitReset={() => {
                    // Reset battle state when daily limit resets
                    if (battleState !== 'idle') {
                      resetBattle()
                    }
                  }}
                />
              )}
            </div>
          }
        />

        {/* Stats Overview */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                    Combat Power
                  </p>
                  {stats ? (
                    <>
                      <p className='text-2xl font-black'>
                        {formatNumber(combatPower)}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        Your strength
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='h-8 w-24 animate-pulse rounded bg-gray-300/20' />
                      <div className='mt-1 h-3 w-16 animate-pulse rounded bg-gray-300/20' />
                    </>
                  )}
                </div>
                <Shield className='h-8 w-8 text-blue-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                    Win Rate
                  </p>
                  {battleStats ? (
                    <>
                      <p className='text-2xl font-black'>
                        {battleStats.winRate.toFixed(1)}%
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {battleStats.wins}W / {battleStats.losses}L
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='h-8 w-20 animate-pulse rounded bg-gray-300/20' />
                      <div className='mt-1 h-3 w-16 animate-pulse rounded bg-gray-300/20' />
                    </>
                  )}
                </div>
                <Trophy className='h-8 w-8 text-green-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-orange-600 uppercase dark:text-orange-400'>
                    Win Streak
                  </p>
                  {battleHistoryStats ? (
                    <>
                      <p className='text-2xl font-black'>
                        {battleHistoryStats.currentStreak}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        Best: {battleHistoryStats.bestStreak}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='h-8 w-12 animate-pulse rounded bg-gray-300/20' />
                      <div className='mt-1 h-3 w-16 animate-pulse rounded bg-gray-300/20' />
                    </>
                  )}
                </div>
                <Flame className='h-8 w-8 text-orange-500' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Swords className='text-primary h-6 w-6' />
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-3xl font-black text-transparent'>
                WARRIOR ARENA
              </CardTitle>
              {battleState !== 'idle' && (
                <Badge className={cn('ml-auto', BATTLE_STYLES.BADGES.ACTIVE)}>
                  {battleState.toUpperCase().replace('-', ' ')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Live Platform Stats */}
            <LiveStatsDisplay className='mb-6' compact />

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='arena' className='flex items-center gap-2'>
                  <Swords className='h-4 w-4' />
                  Battle Arena
                </TabsTrigger>
                <TabsTrigger
                  value='quick-stats'
                  className='flex items-center gap-2'
                >
                  <Trophy className='h-4 w-4' />
                  Quick Stats
                </TabsTrigger>
              </TabsList>

              <TabsContent value='arena' className='mt-6 space-y-6'>
                {/* Battle Interface */}
                <Card className='group border-primary/20 from-primary/10 relative overflow-hidden bg-gradient-to-br to-purple-600/10 transition-all hover:scale-[1.01]'>
                  {/* Boxing-Style Round Timer */}
                  {battleState === 'battling' && (
                    <div className='border-b border-purple-500/30 bg-gradient-to-r from-black/60 via-purple-900/40 to-black/60 p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          {/* Round Number */}
                          <Badge className='bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 text-lg font-black text-white'>
                            ROUND {currentRound || 1}
                          </Badge>

                          {/* Fighter Names */}
                          <div className='flex items-center gap-3'>
                            <span className='text-base font-bold text-blue-400'>
                              {user?.name || 'You'}
                            </span>
                            <span className='animate-pulse text-xl font-black text-yellow-400'>
                              VS
                            </span>
                            <span className='text-base font-bold text-red-400'>
                              {currentOpponent?.username ||
                                currentBattleData?.opponent?.name ||
                                'Opponent'}
                            </span>
                          </div>
                        </div>

                        {/* Round Timer or Calculating State */}
                        <div className='flex items-center gap-3'>
                          {isCalculatingRound || roundTimer === 0 ? (
                            <div className='flex items-center gap-2'>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: 'linear'
                                }}
                              >
                                <RefreshCw className='h-5 w-5 text-purple-400' />
                              </motion.div>
                              <span className='text-lg font-bold text-purple-400 uppercase'>
                                {BATTLE_MESSAGES.CALCULATING_ROUND_DAMAGE}{' '}
                                {currentRound} DAMAGE...
                              </span>
                            </div>
                          ) : (
                            <div className='text-right'>
                              <div className='text-xs font-bold text-gray-400 uppercase'>
                                {BATTLE_MESSAGES.NEXT_ROUND_IN}
                              </div>
                              <div className='flex items-center gap-2'>
                                <Timer className='h-5 w-5 animate-pulse text-yellow-500' />
                                <span className='text-3xl font-black text-yellow-400 tabular-nums'>
                                  00:{roundTimer.toString().padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar - Server Synced */}
                      <div className='mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800'>
                        {isCalculatingRound || roundTimer === 0 ? (
                          <motion.div
                            className='h-full bg-gradient-to-r from-purple-400 to-pink-400'
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{
                              duration: 1,
                              ease: 'linear'
                            }}
                          />
                        ) : (
                          <div
                            className={cn(
                              'h-full bg-gradient-to-r',
                              BATTLE_STYLES.GRADIENTS.ORANGE_RED,
                              'transition-all duration-100'
                            )}
                            style={{ width: `${roundProgress}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <CardContent className='space-y-6'>
                    <AnimatePresence mode='wait'>
                      {/* Idle State - Show Matchmaking */}
                      {battleState === 'idle' && !battleResult && (
                        <motion.div
                          key='idle'
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          {!stats ? (
                            // Loading state while fetching combat power
                            <div className='flex flex-col items-center justify-center py-12'>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: 'linear'
                                }}
                                className='mb-4'
                              >
                                <RefreshCw className='text-primary h-8 w-8' />
                              </motion.div>
                              <p className='text-lg font-semibold'>
                                Loading Combat Stats...
                              </p>
                              <p className='text-muted-foreground mt-2 text-sm'>
                                Calculating your combat power
                              </p>
                            </div>
                          ) : (
                            <MatchmakingInterface
                              combatPower={combatPower}
                              canBattle={canBattle}
                              isSearching={false}
                              isInQueue={isInQueue}
                              dailyLimit={dailyLimit}
                              onFindMatch={handleFindMatch}
                              onLeaveQueue={leaveQueue}
                              activeMinCP={activeSearchMinCP}
                              activeMaxCP={activeSearchMaxCP}
                              activeRange={activeSearchRange}
                            />
                          )}
                        </motion.div>
                      )}

                      {/* Searching State - Use original matchmaking UI */}
                      {battleState === 'searching' && (
                        <motion.div
                          key='searching'
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <MatchmakingInterface
                            combatPower={combatPower}
                            canBattle={canBattle}
                            isSearching={true}
                            isInQueue={isInQueue}
                            dailyLimit={dailyLimit}
                            onFindMatch={handleFindMatch}
                            onLeaveQueue={async () => {
                              await leaveQueue()
                              setBattleState('idle')
                              // Reset search parameters when leaving queue
                              setActiveSearchMinCP(null)
                              setActiveSearchMaxCP(null)
                              setActiveSearchRange(null)
                            }}
                            activeMinCP={activeSearchMinCP}
                            activeMaxCP={activeSearchMaxCP}
                            activeRange={activeSearchRange}
                          />
                        </motion.div>
                      )}

                      {/* Invitation Sent State */}
                      {battleState === 'invitation-sent' && currentOpponent && (
                        <motion.div
                          key='invitation-sent'
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className='space-y-6'
                        >
                          <div className='text-center'>
                            <motion.div
                              animate={{ scale: [1, 1.1] }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                repeatType: 'reverse'
                              }}
                            >
                              <Swords className='mx-auto mb-4 h-16 w-16 text-orange-500' />
                            </motion.div>
                            <h3 className='from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-2xl font-black text-transparent'>
                              {BATTLE_MESSAGES.INVITATION_SENT}
                            </h3>
                            <p className='text-muted-foreground mt-2'>
                              Waiting for {currentOpponent.username} to
                              accept...
                            </p>
                          </div>

                          <div className='flex justify-center'>
                            <Button
                              variant='outline'
                              onClick={() => {
                                setBattleState('idle')
                                setCurrentOpponent(null)
                                setCurrentInvitationId(null)
                              }}
                              className='border-red-500/30 hover:bg-red-500/10'
                            >
                              Cancel Invitation
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* Invitation Received State */}
                      {battleState === 'invitation-received' &&
                        currentOpponent && (
                          <motion.div
                            key='invitation-received'
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className='space-y-6'
                          >
                            <div className='text-center'>
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                              >
                                <Swords className='mx-auto mb-4 h-20 w-20 text-red-500' />
                              </motion.div>
                              <h3 className='from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-2xl font-black text-transparent'>
                                {BATTLE_MESSAGES.BATTLE_CHALLENGE}
                              </h3>
                              <p className='text-muted-foreground mt-2'>
                                {currentOpponent.username} wants to battle you!
                              </p>
                            </div>

                            <div className='grid grid-cols-3 items-center gap-4'>
                              {/* Your Stats */}
                              <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
                                <CardContent className='pt-6 text-center'>
                                  <User className='mx-auto mb-2 h-8 w-8 text-green-500' />
                                  <p className='font-bold text-green-600 dark:text-green-400'>
                                    YOU
                                  </p>
                                  <p className='mt-2 text-2xl font-black'>
                                    {formatNumber(combatPower)}
                                  </p>
                                  <p className='text-muted-foreground text-xs uppercase'>
                                    Combat Power
                                  </p>
                                </CardContent>
                              </Card>

                              {/* VS */}
                              <div className='text-center'>
                                <motion.div
                                  animate={{ scale: [1, 1.2] }}
                                  transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    repeatType: 'reverse'
                                  }}
                                  className='text-4xl font-black text-orange-500'
                                >
                                  VS
                                </motion.div>
                              </div>

                              {/* Opponent Stats */}
                              <Card className='group relative overflow-hidden border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10'>
                                <CardContent className='pt-6 text-center'>
                                  <User className='mx-auto mb-2 h-8 w-8 text-red-500' />
                                  <p className='font-bold text-red-600 dark:text-red-400'>
                                    {currentOpponent.username}
                                  </p>
                                  <p className='mt-2 text-2xl font-black'>
                                    {formatNumber(currentOpponent.combatPower)}
                                  </p>
                                  <p className='text-muted-foreground text-xs uppercase'>
                                    Combat Power
                                  </p>
                                </CardContent>
                              </Card>
                            </div>

                            <div className='flex justify-center gap-4'>
                              <Button
                                variant='outline'
                                onClick={handleRejectBattle}
                                className='border-red-500/30 hover:bg-red-500/10'
                              >
                                Reject
                              </Button>
                              <Button
                                onClick={handleAcceptBattle}
                                className='gap-2 bg-gradient-to-r from-green-600 to-emerald-700 font-bold text-white hover:from-green-700 hover:to-emerald-800'
                              >
                                <Swords className='h-4 w-4' />
                                ACCEPT BATTLE
                              </Button>
                            </div>
                          </motion.div>
                        )}

                      {/* Invalid Invitation State */}
                      {battleState === 'invitation-invalid' && (
                        <motion.div
                          key='invitation-invalid'
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className='space-y-6'
                        >
                          <div className='text-center'>
                            <motion.div
                              animate={{ y: [0, 10, 0] }}
                              transition={{ duration: 1, repeat: 2 }}
                            >
                              <Shield className='mx-auto mb-4 h-20 w-20 text-gray-500' />
                            </motion.div>
                            <h3 className='text-2xl font-black text-gray-600 dark:text-gray-400'>
                              {BATTLE_MESSAGES.INVITATION_EXPIRED}
                            </h3>
                            <p className='text-muted-foreground mt-2'>
                              {BATTLE_MESSAGES.INVITATION_EXPIRED_DESC}
                            </p>
                            <p className='text-muted-foreground mt-1'>
                              {BATTLE_MESSAGES.SEARCH_NEW_OPPONENT}
                            </p>
                          </div>

                          <div className='flex justify-center'>
                            <Button
                              onClick={() => {
                                setBattleState('searching')
                                handleFindMatch()
                              }}
                              disabled={!canBattle}
                              className='gap-2 bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white hover:from-purple-700 hover:to-pink-700'
                            >
                              <Swords className='h-4 w-4' />
                              SEARCH FOR NEW OPPONENT
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* Preparing State */}
                      {battleState === 'preparing' && (
                        <motion.div
                          key='preparing'
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className='py-12 text-center'
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Shield className='mx-auto mb-4 h-20 w-20 text-blue-500' />
                          </motion.div>
                          <h3 className='text-3xl font-black text-blue-600 dark:text-blue-400'>
                            {BATTLE_MESSAGES.PREPARING}
                          </h3>
                          <p className='text-muted-foreground mt-2 animate-pulse'>
                            {BATTLE_MESSAGES.WARRIORS_ARE_ENTERING}
                          </p>
                        </motion.div>
                      )}

                      {/* Countdown State */}
                      {battleState === 'countdown' &&
                        currentBattleData &&
                        currentBattleData.player1 &&
                        currentBattleData.player2 && (
                          <motion.div
                            key='countdown'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <BattleCountdown
                              onComplete={handleCountdownComplete}
                              player1Name={user?.name || 'You'}
                              player2Name={
                                currentOpponent?.username || 'Opponent'
                              }
                              player1CP={combatPower}
                              player2CP={
                                currentOpponent?.combatPower ||
                                BATTLE_CONFIG.MIN_COMBAT_POWER
                              }
                            />
                          </motion.div>
                        )}

                      {/* Battling State - Just Animation */}
                      {battleState === 'battling' &&
                        currentBattleData &&
                        currentBattleData.player1 &&
                        currentBattleData.player2 && (
                          <motion.div
                            key='battling'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className='space-y-6'
                          >
                            <BattleAnimation
                              battleId={currentBattleData.battleId}
                              player1={{
                                id: user?.id || 0,
                                name: user?.name || 'You',
                                combatPower: combatPower
                              }}
                              player2={{
                                id: currentBattleData.opponent.id,
                                name: currentBattleData.opponent.name,
                                combatPower:
                                  currentBattleData.opponent.combatPower
                              }}
                              actualPlayer1Id={currentBattleData.player1.id}
                              onComplete={handleBattleComplete}
                              onRoundProcessingChange={setIsCalculatingRound}
                              onRoundTimerUpdate={handleRoundTimerUpdate}
                              onRoundProgressUpdate={handleRoundProgressUpdate}
                              onBattleHistoryUpdate={history => {
                                setBattleScorecard(history)
                                // Update current round from the latest entry (ensure it's from server)
                                if (history.length > 0) {
                                  const latestRound =
                                    history[history.length - 1].round
                                  // Only update if it's a higher round number to prevent going backwards
                                  setCurrentRound(prev => {
                                    const newRound = Math.max(prev, latestRound)
                                    // If round changed, reset timer and calculating state
                                    if (newRound > prev) {
                                      setIsCalculatingRound(false)
                                      setRoundTimer(
                                        BATTLE_CONFIG.ROUND_INTERVAL / 1000
                                      )
                                    }
                                    return newRound
                                  })
                                }
                              }}
                            />
                          </motion.div>
                        )}

                      {/* Result State */}
                      {battleState === 'result' &&
                        (currentBattleData?.winnerId || battleResult) && (
                          <motion.div
                            key='result'
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className='space-y-6'
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 200 }}
                              className='text-center'
                            >
                              {currentBattleData?.winnerId === user?.id ||
                              battleResult?.winnerId === user?.id ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: [0, 10, -10, 10, 0] }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className='inline-block'
                                  >
                                    <Trophy className='mx-auto mb-4 h-20 w-20 text-yellow-500' />
                                  </motion.div>
                                  <h3
                                    className={cn(
                                      'bg-gradient-to-r',
                                      BATTLE_STYLES.GRADIENTS.VICTORY,
                                      'bg-clip-text text-4xl font-black text-transparent'
                                    )}
                                  >
                                    {BATTLE_MESSAGES.VICTORY}
                                  </h3>
                                  <div className='mt-2 mb-3'>
                                    <Badge
                                      className={cn(
                                        'px-4 py-2 text-sm font-bold',
                                        battleEndReason === 'timeout'
                                          ? BATTLE_STYLES.BADGES.WINNER
                                          : BATTLE_STYLES.BADGES.LOSER
                                      )}
                                    >
                                      {battleEndReason === 'timeout'
                                        ? `${BATTLE_ICONS.TIMEOUT} ${BATTLE_MESSAGES.WON_BY_TIMEOUT}`
                                        : `${BATTLE_ICONS.DEATH} ${BATTLE_MESSAGES.WON_BY_KNOCKOUT}`}
                                    </Badge>
                                  </div>
                                  <div className='mt-3 flex flex-col items-center gap-2'>
                                    {currentBattleData?.feeDiscountPercent ||
                                    battleResult?.feeDiscountPercent ? (
                                      <Badge className='bg-green-500/20 px-4 py-2 text-green-600 dark:text-green-400'>
                                        <Sparkles className='mr-2 h-4 w-4' />
                                        {currentBattleData?.feeDiscountPercent ||
                                          battleResult?.feeDiscountPercent}
                                        % FEE DISCOUNT FOR 24 HOURS!
                                      </Badge>
                                    ) : (
                                      <Badge className='bg-yellow-500/20 px-4 py-2 text-yellow-600 dark:text-yellow-400'>
                                        <Shield className='mr-2 h-4 w-4' />
                                        DISCOUNT ALREADY ACTIVE
                                      </Badge>
                                    )}
                                    <Badge className='bg-blue-500/20 px-4 py-2 text-blue-600 dark:text-blue-400'>
                                      <Trophy className='mr-2 h-4 w-4' />+
                                      {battleResult?.winnerXP ||
                                        BATTLE_CONFIG.WINNER_XP_BONUS}{' '}
                                      XP EARNED!
                                    </Badge>
                                    <Badge className='bg-purple-500/20 px-4 py-2 text-purple-600 dark:text-purple-400'>
                                      <Zap className='mr-2 h-4 w-4' />+
                                      {currentBattleData?.cpChange ||
                                        BATTLE_CONFIG.WINNER_CP_GAIN}{' '}
                                      CP • NEW CP:{' '}
                                      {currentBattleData?.newCP ||
                                        combatPower +
                                          BATTLE_CONFIG.WINNER_CP_GAIN}
                                    </Badge>
                                  </div>
                                  <p className='text-muted-foreground mt-2'>
                                    {BATTLE_MESSAGES.CONGRATULATIONS}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <motion.div
                                    animate={{ y: [0, 10, 0] }}
                                    transition={{ duration: 1, repeat: 2 }}
                                    className='inline-block'
                                  >
                                    <Shield className='mx-auto mb-4 h-20 w-20 text-gray-500' />
                                  </motion.div>
                                  <h3
                                    className={cn(
                                      'bg-gradient-to-r',
                                      BATTLE_STYLES.GRADIENTS.DEFEAT,
                                      'bg-clip-text text-4xl font-black text-transparent'
                                    )}
                                  >
                                    {BATTLE_MESSAGES.DEFEAT}
                                  </h3>
                                  <div className='mt-2 mb-3'>
                                    <Badge
                                      className={cn(
                                        'px-4 py-2 text-sm font-bold',
                                        battleEndReason === 'timeout'
                                          ? BATTLE_STYLES.BADGES.WINNER
                                          : BATTLE_STYLES.BADGES.LOSER
                                      )}
                                    >
                                      {battleEndReason === 'timeout'
                                        ? `${BATTLE_ICONS.TIMEOUT} ${BATTLE_MESSAGES.LOST_BY_TIMEOUT}`
                                        : `${BATTLE_ICONS.DEATH} ${BATTLE_MESSAGES.LOST_BY_KNOCKOUT}`}
                                    </Badge>
                                  </div>
                                  <div className='mt-3 flex flex-col items-center gap-2'>
                                    <Badge className='bg-blue-500/20 px-4 py-2 text-blue-600 dark:text-blue-400'>
                                      <Shield className='mr-2 h-4 w-4' />+
                                      {battleResult?.loserXP || 25} XP FOR
                                      PARTICIPATING
                                    </Badge>
                                    {currentBattleData?.cpChange &&
                                    currentBattleData.cpChange < 0 ? (
                                      <Badge className='bg-red-500/20 px-4 py-2 text-red-600 dark:text-red-400'>
                                        <Zap className='mr-2 h-4 w-4' />
                                        {currentBattleData.cpChange} CP • NEW
                                        CP:{' '}
                                        {currentBattleData.newCP ||
                                          Math.max(
                                            BATTLE_CONFIG.MIN_COMBAT_POWER,
                                            combatPower -
                                              BATTLE_CONFIG.LOSER_CP_LOSS
                                          )}
                                      </Badge>
                                    ) : (
                                      <Badge className='bg-gray-500/20 px-4 py-2 text-gray-600 dark:text-gray-400'>
                                        <Shield className='mr-2 h-4 w-4' />
                                        CP PROTECTED AT MINIMUM:{' '}
                                        {currentBattleData?.newCP ||
                                          BATTLE_CONFIG.MIN_COMBAT_POWER}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className='text-muted-foreground mt-2'>
                                    {BATTLE_MESSAGES.BETTER_LUCK}
                                  </p>
                                </>
                              )}
                            </motion.div>

                            <div className='flex justify-center gap-4'>
                              <Button
                                onClick={fullResetBattle}
                                variant='outline'
                                className='gap-2 border-gray-500/30 hover:bg-gray-500/10'
                              >
                                RETURN TO LOBBY
                              </Button>
                              {canBattle && (
                                <Button
                                  onClick={() => {
                                    fullResetBattle()
                                    setBattleState('searching')
                                    handleFindMatch()
                                  }}
                                  className='gap-2 bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white hover:from-purple-700 hover:to-pink-700'
                                >
                                  <Swords className='h-4 w-4' />
                                  FIND ANOTHER MATCH
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </CardContent>

                  {/* Boxing-Style Scorecard Footer */}
                  {(battleState === 'battling' || battleState === 'result') &&
                    battleScorecard.length > 0 && (
                      <div className='border-t border-purple-500/30 bg-gradient-to-br from-black/40 via-purple-900/20 to-black/40 p-4'>
                        <div className='space-y-3'>
                          {/* Scorecard Header */}
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <Trophy className='h-5 w-5 text-yellow-500' />
                              <span
                                className={cn(
                                  'bg-gradient-to-r',
                                  BATTLE_STYLES.GRADIENTS.ENERGY,
                                  'bg-clip-text text-sm font-black tracking-wider text-transparent uppercase'
                                )}
                              >
                                Official Scorecard
                              </span>
                            </div>
                            <Badge className='border-red-500/30 bg-red-600/20 text-red-400'>
                              ROUND {currentRound}
                            </Badge>
                          </div>

                          {/* Scorecard Table */}
                          <div className='overflow-hidden rounded-lg border border-purple-500/30 bg-black/50'>
                            <div className='max-h-48 overflow-y-auto'>
                              <table className='w-full'>
                                <thead className='sticky top-0 bg-gradient-to-r from-purple-900/90 to-pink-900/90'>
                                  <tr className='text-xs font-bold tracking-wider uppercase'>
                                    <th className='px-3 py-2 text-left text-white/80'>
                                      <span className='flex items-center gap-1'>
                                        <Swords className='h-3 w-3' />
                                        Round
                                      </span>
                                    </th>
                                    <th className='px-3 py-2 text-center'>
                                      <span className='text-blue-400'>You</span>
                                    </th>
                                    <th className='px-3 py-2 text-center'>
                                      <span className='text-red-400'>
                                        Opponent
                                      </span>
                                    </th>
                                    <th className='px-3 py-2 text-center text-yellow-400'>
                                      Winner
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y divide-purple-500/20'>
                                  {battleScorecard.map((round, idx) => {
                                    const player1Won =
                                      round.player2Damage > round.player1Damage
                                    const player2Won =
                                      round.player1Damage > round.player2Damage
                                    const draw =
                                      round.player1Damage ===
                                      round.player2Damage

                                    return (
                                      <motion.tr
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className='group transition-colors hover:bg-purple-500/10'
                                      >
                                        <td className='px-3 py-2'>
                                          <span className='flex items-center gap-2 text-sm font-bold text-white/90'>
                                            <span className='text-purple-400'>
                                              R{round.round}
                                            </span>
                                          </span>
                                        </td>
                                        <td className='px-3 py-2 text-center'>
                                          <div className='flex flex-col items-center gap-0.5'>
                                            {round.player1Damage > 0 ? (
                                              <span className='text-sm font-bold text-red-500'>
                                                -{round.player1Damage}
                                              </span>
                                            ) : (
                                              <span className='text-sm font-bold text-green-500'>
                                                0
                                              </span>
                                            )}
                                            {round.player1Defended > 0 && (
                                              <span className='text-xs text-blue-400'>
                                                🛡️ {round.player1Defended}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className='px-3 py-2 text-center'>
                                          <div className='flex flex-col items-center gap-0.5'>
                                            {round.player2Damage > 0 ? (
                                              <span className='text-sm font-bold text-red-500'>
                                                -{round.player2Damage}
                                              </span>
                                            ) : (
                                              <span className='text-sm font-bold text-green-500'>
                                                0
                                              </span>
                                            )}
                                            {round.player2Defended > 0 && (
                                              <span className='text-xs text-blue-400'>
                                                🛡️ {round.player2Defended}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className='px-3 py-2 text-center'>
                                          {player1Won && (
                                            <Badge className='bg-blue-500/20 text-xs text-blue-400'>
                                              YOU
                                            </Badge>
                                          )}
                                          {player2Won && (
                                            <Badge className='bg-red-500/20 text-xs text-red-400'>
                                              OPP
                                            </Badge>
                                          )}
                                          {draw && (
                                            <Badge className='bg-gray-500/20 text-xs text-gray-400'>
                                              DRAW
                                            </Badge>
                                          )}
                                        </td>
                                      </motion.tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Total Score Summary */}
                          <div className='grid grid-cols-2 gap-2'>
                            <div className='rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-2 text-center'>
                              <p className='text-xs font-bold text-blue-400 uppercase'>
                                Your Score
                              </p>
                              <p className='text-xl font-black text-blue-300'>
                                {
                                  battleScorecard.filter(
                                    r => r.player2Damage > r.player1Damage
                                  ).length
                                }
                              </p>
                            </div>
                            <div className='rounded-lg border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10 p-2 text-center'>
                              <p className='text-xs font-bold text-red-400 uppercase'>
                                Opponent Score
                              </p>
                              <p className='text-xl font-black text-red-300'>
                                {
                                  battleScorecard.filter(
                                    r => r.player1Damage > r.player2Damage
                                  ).length
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </Card>

                {/* Strategic Battle System Explanation */}
                <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transition-all hover:scale-[1.01]'>
                  <CardHeader>
                    <CardTitle
                      className={cn(
                        'flex items-center gap-2 bg-gradient-to-r',
                        BATTLE_STYLES.GRADIENTS.PURPLE_PINK,
                        'bg-clip-text text-xl font-bold text-transparent'
                      )}
                    >
                      <Sparkles className='h-5 w-5 text-purple-500' />
                      STRATEGIC ENERGY SYSTEM
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-4'>
                      <h4 className='mb-2 font-bold text-purple-600 dark:text-purple-400'>
                        {BATTLE_ICONS.GAME} HOW IT WORKS
                      </h4>
                      <p className='text-muted-foreground mb-2 text-sm'>
                        Battles are turn-based with rounds processing every{' '}
                        {BATTLE_CONFIG.ROUND_INTERVAL / 1000}
                        seconds. During each round, both players continuously
                        perform random attack/defend actions.
                      </p>
                      <p className='text-muted-foreground text-sm'>
                        When you manually click to store energy, you enter a{' '}
                        {BATTLE_CONFIG.MANUAL_ACTION_COOLDOWN / 1000}
                        second recharge state where you can't attack but gain
                        energy points. Click multiple times to accumulate more
                        energy! Strategic trade-off: power vs vulnerability.
                      </p>
                    </div>

                    <div className='grid gap-3 md:grid-cols-2'>
                      {/* Attack Energy */}
                      <div className='group flex items-start gap-3 rounded-lg border border-red-500/20 bg-gradient-to-r from-red-500/5 to-orange-500/5 p-3 transition-all hover:scale-[1.02]'>
                        <Flame className='mt-0.5 h-5 w-5 text-red-500' />
                        <div>
                          <p className='font-bold text-red-600 dark:text-red-400'>
                            ATTACK ENERGY
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            Click Attack to store +
                            {BATTLE_CONFIG.ENERGY_PER_CLICK} energy for NEXT
                            round. You skip THIS round but gain{' '}
                            {Math.round(
                              BATTLE_CONFIG.ENERGY_DAMAGE_MULTIPLIER * 100
                            )}
                            % damage boost per energy point!
                          </p>
                          <p className='mt-1 text-xs text-orange-500'>
                            Max: {BATTLE_CONFIG.MAX_ENERGY} energy • Uses{' '}
                            {BATTLE_CONFIG.ENERGY_CONSUME_PER_ATTACK} energy per
                            powered attack • You recharge while opponent
                            attacks!
                          </p>
                        </div>
                      </div>

                      {/* Defense Energy */}
                      <div className='group flex items-start gap-3 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 p-3 transition-all hover:scale-[1.02]'>
                        <Shield className='mt-0.5 h-5 w-5 text-blue-500' />
                        <div>
                          <p className='font-bold text-blue-600 dark:text-blue-400'>
                            DEFENSE ENERGY
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            Click Defend to store +
                            {BATTLE_CONFIG.DEFENSE_ENERGY_PER_CLICK} defense
                            energy for NEXT round. You skip THIS round but
                            reduce future damage by{' '}
                            {Math.round(
                              BATTLE_CONFIG.DEFENSE_ENERGY_REDUCTION * 100
                            )}
                            % per point!
                          </p>
                          <p className='mt-1 text-xs text-cyan-500'>
                            Max: {BATTLE_CONFIG.MAX_DEFENSE_ENERGY} energy •
                            Uses {BATTLE_CONFIG.DEFENSE_ENERGY_CONSUME} energy
                            when blocking • You recharge while opponent attacks!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='rounded-lg border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-red-500/5 p-4'>
                      <h4 className='mb-2 flex items-center gap-2 font-bold text-orange-600 dark:text-orange-400'>
                        <Zap className='h-4 w-4' />
                        STRATEGIC ENERGY SYSTEM
                      </h4>
                      <ul className='text-muted-foreground space-y-2 text-sm'>
                        <li className='flex items-start gap-2'>
                          <span className='text-yellow-500'>⚠️</span>
                          <span>
                            <strong>Recharge Mechanic:</strong> When you click
                            Attack/Defend, you enter a recharge state for that
                            round and CANNOT act. Your opponent continues
                            attacking while you store energy!
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-green-500'>💪</span>
                          <span>
                            <strong>Energy Payoff:</strong> The energy you store
                            is applied to your NEXT round's attacks, making them
                            significantly stronger!
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-purple-500'>⚡</span>
                          <span>
                            Battles continue automatically every{' '}
                            {BATTLE_CONFIG.ROUND_INTERVAL / 1000} seconds.
                            Server processes all actions and damage calculations
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-red-500'>⚔️</span>
                          <span>
                            <strong>Battle Duration:</strong> Fights continue
                            until a player's HP reaches 0 or{' '}
                            {BATTLE_CONFIG.BATTLE_DURATION_MS / 60000} minutes
                            elapsed. Winner is determined by remaining HP!
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-green-500'>💡</span>
                          <span>
                            Energy gradually depletes when used - attack energy
                            boosts damage, defense energy reduces it
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-blue-500'>🛡️</span>
                          <span>
                            Battle continues until one player reaches 0 HP - no
                            round limit, pure endurance!
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className='rounded-lg border border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5 p-3'>
                      <p className='text-sm font-semibold text-green-600 dark:text-green-400'>
                        🎯 TIMING MECHANICS EXPLAINED
                      </p>
                      <ul className='text-muted-foreground mt-2 space-y-2 text-xs'>
                        <li className='flex items-start gap-2'>
                          <span className='text-yellow-500'>🤖</span>
                          <span>
                            <strong>Auto-Actions (0.1s):</strong> Both players
                            automatically attack/defend{' '}
                            {Math.floor(
                              BATTLE_CONFIG.MS_PER_SECOND /
                                BATTLE_CONFIG.AUTO_ACTION_INTERVAL
                            )}{' '}
                            times per second. This happens simultaneously for
                            both sides!
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-blue-500'>🔄</span>
                          <span>
                            <strong>
                              Manual Storage (
                              {BATTLE_CONFIG.AUTO_ACTION_INTERVAL / 1000}s
                              cooldown):
                            </strong>{' '}
                            When you click to store energy, you pause YOUR
                            auto-attacks for{' '}
                            {BATTLE_CONFIG.AUTO_ACTION_INTERVAL / 1000}s while
                            your opponent continues attacking!
                          </span>
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='text-red-500'>⏰</span>
                          <span>
                            <strong>
                              Round Processing (
                              {BATTLE_CONFIG.ROUND_INTERVAL / 1000}s):
                            </strong>{' '}
                            Every {BATTLE_CONFIG.ROUND_INTERVAL / 1000}
                            seconds, all accumulated actions are calculated into
                            damage and applied
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className='rounded-lg border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 p-3'>
                      <p className='text-sm font-semibold text-yellow-600 dark:text-yellow-400'>
                        💡 STRATEGIC INSIGHTS
                      </p>
                      <ul className='text-muted-foreground mt-2 space-y-1 text-xs'>
                        <li>
                          • Every manual energy storage costs you ~5
                          auto-attacks
                        </li>
                        <li>
                          • Your opponent continues attacking while you store
                          energy
                        </li>
                        <li>
                          • Energy amplifies damage significantly in later
                          rounds
                        </li>
                        <li>
                          • Balance immediate damage vs. future power carefully
                        </li>
                      </ul>
                    </div>

                    {/* Battle Constants Table */}
                    <div className='rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-3'>
                      <p className='mb-3 text-sm font-semibold text-purple-600 dark:text-purple-400'>
                        ⚔️ BATTLE CONSTANTS
                      </p>
                      <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div className='space-y-1'>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Max Health:
                            </span>
                            <span className='font-mono font-bold'>
                              {BATTLE_CONFIG.MAX_HEALTH} HP
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Base Damage:
                            </span>
                            <span className='font-mono font-bold'>
                              {BATTLE_CONFIG.BASE_DAMAGE}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Critical Chance:
                            </span>
                            <span className='font-mono font-bold'>
                              {Math.round(
                                BATTLE_CONFIG.CRITICAL_HIT_CHANCE * 100
                              )}
                              %
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Critical Multiplier:
                            </span>
                            <span className='font-mono font-bold'>
                              {BATTLE_CONFIG.CRITICAL_MULTIPLIER}x
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Dodge Chance:
                            </span>
                            <span className='font-mono font-bold'>
                              {Math.round(BATTLE_CONFIG.DODGE_CHANCE * 100)}%
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Round Interval:
                            </span>
                            <span className='font-mono font-bold'>
                              {BATTLE_CONFIG.ROUND_INTERVAL / 1000}s
                            </span>
                          </div>
                        </div>
                        <div className='space-y-1'>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Attack Energy/Click:
                            </span>
                            <span className='font-mono font-bold text-red-500'>
                              +{BATTLE_CONFIG.ENERGY_PER_CLICK}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Defense Energy/Click:
                            </span>
                            <span className='font-mono font-bold text-blue-500'>
                              +{BATTLE_CONFIG.DEFENSE_ENERGY_PER_CLICK}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Max Attack Energy:
                            </span>
                            <span className='font-mono font-bold text-red-500'>
                              {BATTLE_CONFIG.MAX_ENERGY}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Max Defense Energy:
                            </span>
                            <span className='font-mono font-bold text-blue-500'>
                              {BATTLE_CONFIG.MAX_DEFENSE_ENERGY}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Energy Damage Boost:
                            </span>
                            <span className='font-mono font-bold'>
                              +
                              {Math.round(
                                BATTLE_CONFIG.ENERGY_DAMAGE_MULTIPLIER * 100
                              )}
                              %/pt
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-muted-foreground'>
                              Defense Reduction:
                            </span>
                            <span className='font-mono font-bold'>
                              -
                              {Math.round(
                                BATTLE_CONFIG.DEFENSE_ENERGY_REDUCTION * 100
                              )}
                              %/pt
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Battle Rules */}
                <Card className='group relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 transition-all hover:scale-[1.01]'>
                  <CardHeader>
                    <CardTitle
                      className={cn(
                        'flex items-center gap-2 bg-gradient-to-r',
                        BATTLE_STYLES.GRADIENTS.YELLOW_AMBER,
                        'bg-clip-text text-xl font-bold text-transparent'
                      )}
                    >
                      <Shield className='h-5 w-5 text-yellow-500' />
                      BATTLE RULES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='group flex items-start gap-3 rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-3 transition-all hover:scale-[1.02]'>
                      <Badge className='from-primary mt-0.5 bg-gradient-to-r to-purple-600 text-white'>
                        1
                      </Badge>
                      <div>
                        <p className='font-bold uppercase'>
                          Combat Power Matching
                        </p>
                        <p className='text-muted-foreground text-sm'>
                          Opponents are matched within ±20% of your Combat Power
                        </p>
                      </div>
                    </div>
                    <div className='group flex items-start gap-3 rounded-lg border border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5 p-3 transition-all hover:scale-[1.02]'>
                      <Badge className='mt-0.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white'>
                        2
                      </Badge>
                      <div>
                        <p className='font-bold uppercase'>Winner Rewards</p>
                        <p className='text-muted-foreground text-sm'>
                          Winners get {BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT}%
                          off platform fees for{' '}
                          {BATTLE_CONFIG.DISCOUNT_DURATION_HOURS} hours
                        </p>
                      </div>
                    </div>
                    <div className='group flex items-start gap-3 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 p-3 transition-all hover:scale-[1.02]'>
                      <Badge className='mt-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white'>
                        3
                      </Badge>
                      <div>
                        <p className='font-bold uppercase'>Daily Limits</p>
                        <p className='text-muted-foreground text-sm'>
                          Free: {BATTLE_CONFIG.FREE_TIER_DAILY_LIMIT}{' '}
                          battles/day | Pro:{' '}
                          {BATTLE_CONFIG.PRO_TIER_DAILY_LIMIT} battles/day |
                          Enterprise: Unlimited
                        </p>
                      </div>
                    </div>
                    <div className='group flex items-start gap-3 rounded-lg border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-red-500/5 p-3 transition-all hover:scale-[1.02]'>
                      <Badge className='mt-0.5 bg-gradient-to-r from-orange-600 to-red-600 text-white'>
                        4
                      </Badge>
                      <div>
                        <p className='font-bold uppercase'>
                          Strategic Energy System
                        </p>
                        <p className='text-muted-foreground text-sm'>
                          Store energy to amplify attacks or defense - but skip
                          counter-attacks!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='quick-stats' className='mt-6 space-y-6'>
                {/* Quick Battle Stats */}
                <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
                  <CardHeader>
                    <CardTitle className='flex items-center justify-between'>
                      <span className='from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-xl font-bold text-transparent'>
                        YOUR BATTLE STATISTICS
                      </span>
                      <Link href={appRoutes.battles.history}>
                        <Button variant='outline' size='sm' className='gap-2'>
                          <Trophy className='h-4 w-4' />
                          View Full History
                        </Button>
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                      <div className='rounded-lg border border-green-500/20 bg-green-500/5 p-4'>
                        <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                          Total Battles
                        </p>
                        <p className='text-3xl font-black'>
                          {battleStats?.totalBattles || 0}
                        </p>
                      </div>
                      <div className='rounded-lg border border-blue-500/20 bg-blue-500/5 p-4'>
                        <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                          Win Rate
                        </p>
                        <p className='text-3xl font-black'>
                          {battleStats?.winRate.toFixed(1) || 0}%
                        </p>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {battleStats?.wins || 0}W / {battleStats?.losses || 0}
                          L
                        </p>
                      </div>
                      <div className='rounded-lg border border-orange-500/20 bg-orange-500/5 p-4'>
                        <p className='text-xs font-bold text-orange-600 uppercase dark:text-orange-400'>
                          Discounts Earned
                        </p>
                        <p className='text-3xl font-black'>
                          {battleStats?.totalDiscountsEarned || 0}
                        </p>
                      </div>
                    </div>

                    {/* Recent Battles Preview */}
                    {battleHistory && battleHistory.length > 0 && (
                      <div className='mt-6'>
                        <h3 className='text-muted-foreground mb-3 font-bold'>
                          Recent Battles
                        </h3>
                        <div className='space-y-2'>
                          {battleHistory.slice(0, 5).map((battle: any) => {
                            const isWinner = battle.winnerId === user?.id
                            return (
                              <div
                                key={battle.id}
                                className='flex items-center justify-between rounded-lg border p-3'
                              >
                                <div className='flex items-center gap-3'>
                                  {isWinner ? (
                                    <Trophy className='h-5 w-5 text-green-500' />
                                  ) : (
                                    <Shield className='h-5 w-5 text-red-500' />
                                  )}
                                  <div>
                                    <p className='font-medium'>
                                      {isWinner ? 'Victory' : 'Defeat'}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                      CP:{' '}
                                      {battle.player1Id === user?.id
                                        ? battle.player1CP
                                        : battle.player2CP}{' '}
                                      vs{' '}
                                      {battle.player1Id === user?.id
                                        ? battle.player2CP
                                        : battle.player1CP}
                                    </p>
                                  </div>
                                </div>
                                <div className='text-right'>
                                  {isWinner ? (
                                    <div className='flex flex-col gap-1'>
                                      <Badge className='bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'>
                                        {battle.feeDiscountPercent ||
                                          BATTLE_CONFIG.WINNER_DISCOUNT_PERCENT}
                                        % Discount
                                      </Badge>
                                      <Badge className='bg-green-500/20 text-green-600 dark:text-green-400'>
                                        +
                                        {battle.winnerXP ||
                                          BATTLE_CONFIG.WINNER_XP_BONUS}{' '}
                                        XP
                                      </Badge>
                                    </div>
                                  ) : (
                                    <Badge className='bg-blue-500/20 text-blue-600 dark:text-blue-400'>
                                      +
                                      {battle.loserXP ||
                                        BATTLE_CONFIG.LOSER_XP_BONUS}{' '}
                                      XP
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {battleHistory.length > 5 && (
                          <div className='mt-4 text-center'>
                            <Link href={appRoutes.battles.history}>
                              <Button variant='outline' className='gap-2'>
                                View All {battleHistory.length} Battles
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {(!battleHistory || battleHistory.length === 0) && (
                      <div className='mt-6 rounded-lg border border-dashed p-6 text-center'>
                        <Shield className='text-muted-foreground mx-auto mb-3 h-12 w-12' />
                        <p className='text-muted-foreground'>
                          No battles yet. Start battling to see your history!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
