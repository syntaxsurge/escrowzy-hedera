'use client'

import { useState, useEffect, useCallback } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  AlertTriangle,
  Zap,
  Swords,
  User,
  UserX,
  RefreshCw
} from 'lucide-react'
import useSWR from 'swr'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingButton } from '@/components/ui/loading-button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { apiEndpoints } from '@/config/api-endpoints'
import { BATTLE_CONFIG, BATTLE_MESSAGES } from '@/config/battle.config'
import { cn } from '@/lib'
import type { DailyBattleLimit } from '@/types/battle'

interface MatchmakingInterfaceProps {
  combatPower: number
  canBattle: boolean
  isSearching: boolean
  isInQueue: boolean
  dailyLimit: DailyBattleLimit | undefined
  onFindMatch: (matchRange?: number) => Promise<any>
  onLeaveQueue: () => Promise<void>
  activeMinCP?: number | null
  activeMaxCP?: number | null
  activeRange?: number | null
}

export function MatchmakingInterface({
  combatPower,
  canBattle,
  isSearching,
  isInQueue,
  dailyLimit,
  onFindMatch,
  onLeaveQueue,
  activeMinCP: propMinCP,
  activeMaxCP: propMaxCP,
  activeRange: propRange
}: MatchmakingInterfaceProps) {
  const [matchRange, setMatchRange] = useState<number>(
    BATTLE_CONFIG.DEFAULT_MATCH_RANGE
  )
  const [searchingAnimation, setSearchingAnimation] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(0)
  const [isLocalSearching, setIsLocalSearching] = useState(false)

  // Fetch live battle stats and queue info
  const { data: _liveStats } = useSWR(
    apiEndpoints.battles.liveStats,
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: BATTLE_CONFIG.INVITATION_REFRESH_INTERVAL }
  )

  const { data: queueInfo } = useSWR(
    isInQueue ? apiEndpoints.battles.queueInfo : null,
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: BATTLE_CONFIG.QUEUE_REFRESH_INTERVAL }
  )

  // Calculate current range based on slider
  const currentMinCP = Math.floor(
    combatPower * (1 - matchRange / BATTLE_CONFIG.SEARCH_ANIMATION_MAX)
  )
  const currentMaxCP = Math.ceil(
    combatPower * (1 + matchRange / BATTLE_CONFIG.SEARCH_ANIMATION_MAX)
  )

  // Use prop values when available (from parent), otherwise calculate from current range
  const displayMinCP =
    (isLocalSearching || isSearching || isInQueue) &&
    propMinCP !== null &&
    propMinCP !== undefined
      ? propMinCP
      : currentMinCP
  const displayMaxCP =
    (isLocalSearching || isSearching || isInQueue) &&
    propMaxCP !== null &&
    propMaxCP !== undefined
      ? propMaxCP
      : currentMaxCP
  const displayRange =
    (isLocalSearching || isSearching || isInQueue) &&
    propRange !== null &&
    propRange !== undefined
      ? propRange
      : matchRange

  const getTimeUntilReset = () => {
    if (!dailyLimit?.resetsAt) return ''

    const now = new Date()
    const reset = new Date(dailyLimit.resetsAt)
    const diff = reset.getTime() - now.getTime()

    const hours = Math.floor(diff / BATTLE_CONFIG.MS_PER_HOUR)
    const minutes = Math.floor(
      (diff % BATTLE_CONFIG.MS_PER_HOUR) / BATTLE_CONFIG.MS_PER_MINUTE
    )

    return `${hours}h ${minutes}m`
  }

  // Handle search initiation
  const handleFindMatch = useCallback(async () => {
    setIsLocalSearching(true)
    setCurrentMessage(0)

    // Start the actual search - parent will handle storing the values
    const result = await onFindMatch(matchRange)

    if (result) {
      // Match found, stop searching
      setIsLocalSearching(false)
    }
    // If no match, we stay in queue - no need to show any error
  }, [matchRange, onFindMatch])

  // Message cycling animation
  useEffect(() => {
    if (isLocalSearching || isInQueue) {
      const interval = setInterval(() => {
        setCurrentMessage(
          prev => (prev + 1) % BATTLE_MESSAGES.SEARCH_MESSAGES.length
        )
        setSearchingAnimation(
          prev =>
            (prev + BATTLE_CONFIG.SEARCH_ANIMATION_INCREMENT) %
            BATTLE_CONFIG.SEARCH_ANIMATION_MAX
        )
      }, BATTLE_CONFIG.SEARCH_MESSAGE_INTERVAL)

      return () => clearInterval(interval)
    }
  }, [isLocalSearching, isInQueue])

  // Reset state when isSearching changes
  useEffect(() => {
    if (!isSearching && !isLocalSearching && !isInQueue) {
      setSearchingAnimation(0)
    }
  }, [isSearching, isLocalSearching, isInQueue])

  // Show searching overlay when looking for match
  if (isLocalSearching || isSearching || isInQueue) {
    return (
      <div className='space-y-6'>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center'
        >
          <div className='relative mb-6 inline-block'>
            <motion.div
              animate={{ rotate: BATTLE_CONFIG.ROTATE_FULL_CIRCLE }}
              transition={{
                duration: BATTLE_CONFIG.ROTATE_ANIMATION_DURATION,
                repeat: Infinity,
                ease: 'linear'
              }}
              className='border-primary/20 absolute inset-0 rounded-full border-4'
            />
            <motion.div
              animate={{ rotate: BATTLE_CONFIG.ROTATE_REVERSE }}
              transition={{
                duration: BATTLE_CONFIG.ROTATE_ANIMATION_DURATION_SLOW,
                repeat: Infinity,
                ease: 'linear'
              }}
              className='border-t-primary absolute inset-0 rounded-full border-4 border-r-transparent border-b-transparent border-l-transparent'
            />
            <div className='relative flex h-32 w-32 items-center justify-center'>
              <motion.div
                animate={{
                  scale: [...BATTLE_CONFIG.SCALE_ANIMATION_VALUES],
                  rotate: [...BATTLE_CONFIG.ROTATE_ANIMATION_VALUES]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
              >
                <Swords className='text-primary h-16 w-16' />
              </motion.div>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='absolute -right-2 -bottom-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg'
            >
              <motion.div
                animate={{ rotate: BATTLE_CONFIG.ROTATE_FULL_CIRCLE }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              >
                <RefreshCw className='h-6 w-6' />
              </motion.div>
            </motion.div>
          </div>

          <motion.h3
            animate={{ opacity: [...BATTLE_CONFIG.OPACITY_PULSE_VALUES] }}
            transition={{
              duration: BATTLE_CONFIG.ROTATE_ANIMATION_DURATION,
              repeat: Infinity
            }}
            className='text-primary text-2xl font-black'
          >
            {isInQueue
              ? BATTLE_MESSAGES.IN_MATCHMAKING_QUEUE
              : BATTLE_MESSAGES.SEARCHING_FOR_OPPONENT}
          </motion.h3>

          <div className='mx-auto mt-4 max-w-xs space-y-3'>
            <Progress value={searchingAnimation} className='h-3' />
            <AnimatePresence mode='wait'>
              <motion.p
                key={currentMessage}
                initial={{
                  opacity: 0,
                  y: BATTLE_CONFIG.ROTATE_ANIMATION_VALUES[1]
                }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: -BATTLE_CONFIG.ROTATE_ANIMATION_VALUES[1]
                }}
                className='text-muted-foreground text-sm font-medium'
              >
                {isInQueue
                  ? BATTLE_MESSAGES.YOU_ARE_IN_QUEUE
                  : BATTLE_MESSAGES.SEARCH_MESSAGES[currentMessage]}
              </motion.p>
            </AnimatePresence>
            <p className='text-muted-foreground text-xs'>
              {BATTLE_MESSAGES.FINDING_WARRIORS}{' '}
              <strong className='text-primary'>
                {displayMinCP} - {displayMaxCP} {BATTLE_MESSAGES.CP_SUFFIX}
              </strong>{' '}
              range ({BATTLE_MESSAGES.RANGE_PREFIX}
              {displayRange}%)
            </p>
            <Button
              onClick={async () => {
                if (isInQueue) {
                  await onLeaveQueue()
                } else {
                  setIsLocalSearching(false)
                  setSearchingAnimation(0)
                }
              }}
              variant='outline'
              className='gap-2 border-red-500/30 hover:bg-red-500/10'
            >
              <UserX className='h-4 w-4' />
              {isInQueue
                ? BATTLE_MESSAGES.LEAVE_QUEUE
                : BATTLE_MESSAGES.CANCEL_SEARCH}
            </Button>
          </div>

          <div className='mt-6 flex justify-center gap-8'>
            <motion.div
              animate={{ y: [...BATTLE_CONFIG.Y_POSITION_ANIMATION_VALUES] }}
              transition={{
                duration: BATTLE_CONFIG.Y_POSITION_ANIMATION_DURATION,
                repeat: Infinity,
                delay: 0
              }}
              className='text-center'
            >
              <div className='mb-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3'>
                <User className='h-8 w-8 text-green-500' />
              </div>
              <p className='text-xs font-bold'>{BATTLE_MESSAGES.YOU}</p>
              <p className='text-lg font-bold'>
                {combatPower} {BATTLE_MESSAGES.CP_SUFFIX}
              </p>
            </motion.div>

            <div className='flex items-center'>
              <motion.div
                animate={{
                  opacity: [...BATTLE_CONFIG.OPACITY_ANIMATION_VALUES]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className='text-primary text-3xl font-black'
              >
                {BATTLE_MESSAGES.VS}
              </motion.div>
            </div>

            <motion.div
              animate={{ y: [...BATTLE_CONFIG.Y_POSITION_ANIMATION_VALUES] }}
              transition={{
                duration: BATTLE_CONFIG.Y_POSITION_ANIMATION_DURATION,
                repeat: Infinity,
                delay: BATTLE_CONFIG.Y_POSITION_ANIMATION_DELAY
              }}
              className='text-center'
            >
              <div className='mb-2 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 p-3'>
                <motion.div
                  animate={{
                    opacity: [...BATTLE_CONFIG.OPACITY_ANIMATION_VALUES]
                  }}
                  transition={{
                    duration: BATTLE_CONFIG.OPACITY_ANIMATION_DURATION,
                    repeat: Infinity
                  }}
                >
                  <User className='h-8 w-8 text-red-500' />
                </motion.div>
              </div>
              <p className='text-xs font-bold'>
                {BATTLE_MESSAGES.SEARCHING_PLAYER}
              </p>
              <motion.p
                animate={{
                  opacity: [...BATTLE_CONFIG.OPACITY_ANIMATION_VALUES]
                }}
                transition={{
                  duration: BATTLE_CONFIG.OPACITY_ANIMATION_DURATION,
                  repeat: Infinity
                }}
                className='text-lg font-bold'
              >
                {BATTLE_MESSAGES.UNKNOWN_CP}
              </motion.p>
            </motion.div>
          </div>

          {queueInfo?.data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className='mt-6 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4'
            >
              <div className='grid grid-cols-2 gap-4 text-center'>
                <div>
                  <p className='text-muted-foreground text-xs uppercase'>
                    {BATTLE_MESSAGES.QUEUE_POSITION}
                  </p>
                  <p className='text-2xl font-bold text-purple-500'>
                    #
                    {queueInfo.data.queuePosition ||
                      BATTLE_CONFIG.DEFAULT_QUEUE_POSITION}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs uppercase'>
                    {BATTLE_MESSAGES.EST_WAIT_TIME}
                  </p>
                  <p className='text-2xl font-bold text-pink-500'>
                    {queueInfo.data.estimatedWaitTime ||
                      BATTLE_CONFIG.DEFAULT_WAIT_TIME_SECONDS}
                    s
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Search Settings */}
      <Card>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            {/* Match Range Selector */}
            <div className='flex items-center justify-between'>
              <label className='text-sm font-medium'>
                {BATTLE_MESSAGES.MATCH_RANGE}
              </label>
              <span className='text-muted-foreground text-sm'>
                {BATTLE_MESSAGES.RANGE_PREFIX}
                {matchRange}
                {BATTLE_MESSAGES.RANGE_SUFFIX}
              </span>
            </div>

            <Slider
              value={[matchRange]}
              onValueChange={([value]: number[]) => setMatchRange(value)}
              min={BATTLE_CONFIG.MATCH_RANGE_MIN}
              max={BATTLE_CONFIG.MATCH_RANGE_MAX}
              step={BATTLE_CONFIG.MATCH_RANGE_STEP}
              className='w-full'
            />

            <div className='text-muted-foreground flex justify-between text-xs'>
              <span>{BATTLE_MESSAGES.NARROW_RANGE}</span>
              <span>{BATTLE_MESSAGES.WIDE_RANGE}</span>
            </div>

            <div className='bg-muted rounded-lg p-3'>
              <p className='text-sm'>
                {BATTLE_MESSAGES.CP_RANGE_INFO} <strong>{currentMinCP}</strong>{' '}
                {BATTLE_MESSAGES.AND} <strong>{currentMaxCP}</strong>{' '}
                {BATTLE_MESSAGES.COMBAT_POWER}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show alert only if daily limit reached */}
      {!canBattle && dailyLimit && (
        <Alert>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            {BATTLE_MESSAGES.DAILY_LIMIT_REACHED} {getTimeUntilReset()}
          </AlertDescription>
        </Alert>
      )}

      {/* Find Match Button */}
      <div className='flex justify-center'>
        <LoadingButton
          size='lg'
          onClick={handleFindMatch}
          disabled={!canBattle}
          isLoading={isLocalSearching || isSearching}
          loadingText={BATTLE_MESSAGES.SEARCHING_TEXT}
          className={cn(
            'min-w-[200px] gap-2',
            (isLocalSearching || isSearching) && 'animate-pulse'
          )}
        >
          <Search className='h-5 w-5' />
          {BATTLE_MESSAGES.FIND_OPPONENT}
        </LoadingButton>
      </div>

      {/* Info Box */}
      <Alert>
        <Zap className='h-4 w-4' />
        <AlertDescription>{BATTLE_MESSAGES.WIN_DISCOUNT_INFO}</AlertDescription>
      </Alert>
    </div>
  )
}
