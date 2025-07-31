'use client'

import { useState } from 'react'

import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Check, ExternalLink } from 'lucide-react'

import { RARITY_COLORS } from '@/config/rewards'
import type { Achievement, Rarity } from '@/config/rewards'
import { cn } from '@/lib'
import { buildTxUrl, DEFAULT_CHAIN_ID } from '@/lib/blockchain'

interface AchievementCardProps {
  achievement: Achievement & {
    unlocked?: boolean
    unlockedAt?: string
    nft?: { tokenId: number; txHash: string } | null
  }
  onClick?: () => void
  className?: string
  showConfetti?: boolean
}

export function AchievementCard({
  achievement,
  onClick,
  className,
  showConfetti = true
}: AchievementCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hasShownConfetti, setHasShownConfetti] = useState(false)
  const rarityColors = RARITY_COLORS[achievement.rarity as Rarity]

  const handleUnlock = () => {
    if (showConfetti && achievement.unlocked && !hasShownConfetti) {
      setHasShownConfetti(true)

      const colors = {
        common: ['#9CA3AF', '#6B7280'],
        rare: ['#3B82F6', '#60A5FA'],
        epic: ['#8B5CF6', '#A78BFA'],
        legendary: ['#F59E0B', '#FCD34D']
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors[achievement.rarity as Rarity]
      })
    }
  }

  return (
    <motion.div
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all',
        rarityColors.border,
        achievement.unlocked ? rarityColors.bg : 'bg-secondary/50',
        achievement.unlocked && rarityColors.glow,
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        handleUnlock()
        onClick?.()
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className='p-4'>
        <div className='mb-3 flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <motion.div
              className={cn(
                'rounded-lg p-2 text-3xl',
                achievement.unlocked ? 'bg-white/10' : 'bg-secondary'
              )}
              animate={achievement.unlocked ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              {achievement.icon}
            </motion.div>

            <div>
              <h3
                className={cn(
                  'text-base font-bold',
                  achievement.unlocked
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {achievement.name}
              </h3>
              <p
                className={cn(
                  'text-sm',
                  achievement.unlocked
                    ? 'text-foreground/70'
                    : 'text-muted-foreground/70'
                )}
              >
                {achievement.description}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {achievement.unlocked ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='rounded-full bg-green-500/20 p-1'
              >
                <Check className='h-4 w-4 text-green-500' />
              </motion.div>
            ) : (
              <div className='bg-secondary rounded-full p-1'>
                <Lock className='text-muted-foreground h-4 w-4' />
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-1'>
              <span className='text-muted-foreground text-xs'>XP:</span>
              <span
                className={cn(
                  'text-sm font-bold',
                  achievement.unlocked
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                +{achievement.xpReward}
              </span>
            </div>

            {achievement.nftEligible && (
              <div className='flex items-center gap-1'>
                <span className='text-muted-foreground text-xs'>NFT:</span>
                {achievement.nft ? (
                  <a
                    href={buildTxUrl(DEFAULT_CHAIN_ID, achievement.nft.txHash)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary flex items-center gap-1 text-xs font-bold hover:underline'
                    onClick={e => e.stopPropagation()}
                  >
                    #{achievement.nft.tokenId}
                    <ExternalLink className='h-3 w-3' />
                  </a>
                ) : (
                  <span className='text-muted-foreground text-xs font-bold'>
                    {achievement.unlocked ? 'Pending' : 'Available'}
                  </span>
                )}
              </div>
            )}
          </div>

          <span
            className={cn(
              'rounded-full px-2 py-1 text-xs font-semibold',
              rarityColors.text,
              achievement.unlocked ? 'bg-white/10' : 'bg-secondary'
            )}
          >
            {achievement.rarity.charAt(0).toUpperCase() +
              achievement.rarity.slice(1)}
          </span>
        </div>

        {achievement.unlocked && achievement.unlockedAt && (
          <div className='border-border/50 mt-3 border-t pt-3'>
            <span className='text-muted-foreground text-xs'>
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isHovered && !achievement.unlocked && (
          <motion.div
            className='absolute inset-0 flex items-center justify-center bg-black/60'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Lock className='h-8 w-8 text-white/80' />
          </motion.div>
        )}
      </AnimatePresence>

      {achievement.rarity === 'legendary' && achievement.unlocked && (
        <div className='pointer-events-none absolute inset-0'>
          <div className='absolute top-0 left-0 h-full w-full'>
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className='absolute h-1 w-1 rounded-full bg-yellow-400'
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`
                }}
                animate={{
                  y: [-20, 20],
                  x: [-20, 20],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
