'use client'

import { useEffect, useState, useRef } from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, Swords, Timer } from 'lucide-react'
import useSWR from 'swr'

import { Card } from '@/components/ui/card'
import {
  apiEndpoints,
  pusherChannels,
  pusherEvents
} from '@/config/api-endpoints'
import { refreshIntervals } from '@/config/app-routes'
import { cn } from '@/lib'
import { pusherClient } from '@/lib/pusher'

interface LiveStat {
  value: number
  label: string
  icon: React.ReactNode
  color: string
  gradient: string
}

interface LiveStatsDisplayProps {
  className?: string
  compact?: boolean
}

export function LiveStatsDisplay({
  className,
  compact = false
}: LiveStatsDisplayProps) {
  const [stats, setStats] = useState({
    warriorsOnline: 0,
    activeBattles: 0,
    inQueue: 0
  })
  const [pulseStats, setPulseStats] = useState<Set<string>>(new Set())
  const prevStatsRef = useRef(stats)

  // Fetch initial stats and setup polling
  const { data: liveStats } = useSWR(
    apiEndpoints.battles.liveStats,
    (url: string) => fetch(url).then(res => res.json()),
    {
      refreshInterval: refreshIntervals.MEDIUM,
      revalidateOnFocus: true
    }
  )

  // Update stats with animation when data changes
  useEffect(() => {
    if (liveStats?.data) {
      const newStats = {
        warriorsOnline: liveStats.data.warriorsOnline || 0,
        activeBattles: liveStats.data.activeBattles || 0,
        inQueue: liveStats.data.inQueue || 0
      }

      // Check which stats changed for pulse animation
      const changedStats = new Set<string>()
      if (newStats.warriorsOnline !== prevStatsRef.current.warriorsOnline) {
        changedStats.add('warriors')
      }
      if (newStats.activeBattles !== prevStatsRef.current.activeBattles) {
        changedStats.add('battles')
      }
      if (newStats.inQueue !== prevStatsRef.current.inQueue) {
        changedStats.add('queue')
      }

      setPulseStats(changedStats)
      setStats(newStats)
      prevStatsRef.current = newStats

      // Clear pulse animation after 1 second
      setTimeout(() => setPulseStats(new Set()), 1000)
    }
  }, [liveStats])

  // Setup Pusher for real-time updates
  useEffect(() => {
    if (!pusherClient) return

    const channel = pusherClient.subscribe(pusherChannels.battleStats)

    channel.bind(pusherEvents.battle.statsUpdated, () => {
      // Trigger a refetch when stats are updated
      fetch(apiEndpoints.battles.liveStats)
        .then(res => res.json())
        .then(data => {
          if (data?.data) {
            const newStats = {
              warriorsOnline: data.data.warriorsOnline || 0,
              activeBattles: data.data.activeBattles || 0,
              inQueue: data.data.inQueue || 0
            }

            const changedStats = new Set<string>()
            if (newStats.warriorsOnline !== stats.warriorsOnline) {
              changedStats.add('warriors')
            }
            if (newStats.activeBattles !== stats.activeBattles) {
              changedStats.add('battles')
            }
            if (newStats.inQueue !== stats.inQueue) {
              changedStats.add('queue')
            }

            setPulseStats(changedStats)
            setStats(newStats)

            setTimeout(() => setPulseStats(new Set()), 1000)
          }
        })
    })

    // Queue updates
    const queueChannel = pusherClient.subscribe(pusherChannels.battleQueue)
    queueChannel.bind(pusherEvents.battle.queueUpdated, () => {
      // Trigger immediate refetch for queue updates
      fetch(apiEndpoints.battles.liveStats)
        .then(res => res.json())
        .then(data => {
          if (data?.data) {
            setStats(prev => ({
              ...prev,
              inQueue: data.data.inQueue || 0
            }))
            setPulseStats(new Set(['queue']))
            setTimeout(() => setPulseStats(new Set()), 1000)
          }
        })
    })

    return () => {
      channel.unbind(pusherEvents.battle.statsUpdated)
      queueChannel.unbind(pusherEvents.battle.queueUpdated)
      pusherClient?.unsubscribe(pusherChannels.battleStats)
      pusherClient?.unsubscribe(pusherChannels.battleQueue)
    }
  }, [stats])

  const statItems: LiveStat[] = [
    {
      value: stats.warriorsOnline,
      label: 'Warriors Online',
      icon: <Users className='h-4 w-4' />,
      color: 'text-blue-500',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      value: stats.activeBattles,
      label: 'Active Battles',
      icon: <Swords className='h-4 w-4' />,
      color: 'text-green-500',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      value: stats.inQueue,
      label: 'In Queue',
      icon: <Timer className='h-4 w-4' />,
      color: 'text-purple-500',
      gradient: 'from-purple-500/20 to-pink-500/20'
    }
  ]

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className='relative'
          >
            <AnimatePresence>
              {pulseStats.has(stat.label.toLowerCase().split(' ')[0]) && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-r',
                    stat.gradient
                  )}
                />
              )}
            </AnimatePresence>
            <div
              className={cn(
                'relative flex items-center gap-2 rounded-full px-3 py-1.5',
                'bg-gradient-to-r backdrop-blur-sm',
                'border border-white/10',
                'transition-all hover:scale-105',
                stat.gradient
              )}
            >
              <div
                className={cn('flex items-center justify-center', stat.color)}
              >
                {stat.icon}
              </div>
              <div className='flex items-baseline gap-1'>
                <AnimatedNumber
                  value={stat.value}
                  className='text-sm font-bold'
                />
                <span className='text-muted-foreground hidden text-xs sm:inline'>
                  {stat.label}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {statItems.map((stat, index) => {
        const statKey = stat.label.toLowerCase().split(' ')[0]
        const isPulsing = pulseStats.has(statKey)

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={cn(
                'group relative overflow-hidden',
                'border-white/10 bg-gradient-to-br backdrop-blur-sm',
                'transition-all hover:scale-105 hover:shadow-lg',
                stat.gradient,
                isPulsing && 'animate-pulse'
              )}
            >
              <AnimatePresence>
                {isPulsing && (
                  <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className='absolute inset-0 rounded-full bg-white/20'
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
              </AnimatePresence>

              <div className='relative p-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        'rounded-lg bg-white/10 p-1.5 backdrop-blur-sm',
                        'transition-transform group-hover:scale-110'
                      )}
                    >
                      <div className={stat.color}>{stat.icon}</div>
                    </div>
                    <div>
                      <AnimatedNumber
                        value={stat.value}
                        className='text-lg font-bold'
                      />
                      <p className='text-muted-foreground text-[10px] tracking-wide uppercase'>
                        {stat.label}
                      </p>
                    </div>
                  </div>
                  <LiveIndicator active={stat.value > 0} />
                </div>
              </div>

              {/* Animated background effect */}
              <motion.div
                className='absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100'
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
              />
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// Animated number component with smooth transitions
function AnimatedNumber({
  value,
  className
}: {
  value: number
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true)
      const duration = 500
      const startTime = Date.now()
      const startValue = displayValue
      const change = value - startValue

      const animate = () => {
        const now = Date.now()
        const progress = Math.min((now - startTime) / duration, 1)
        const easeOutQuad = progress * (2 - progress)
        const currentValue = Math.round(startValue + change * easeOutQuad)

        setDisplayValue(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [value, displayValue])

  return (
    <motion.span
      className={cn(className, isAnimating && 'text-yellow-500')}
      animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  )
}

// Live indicator dot
function LiveIndicator({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <div className='relative'>
      <motion.div
        className='absolute inset-0 rounded-full bg-green-500'
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
      <div className='relative h-2 w-2 rounded-full bg-green-500' />
    </div>
  )
}
