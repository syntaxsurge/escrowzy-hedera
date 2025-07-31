'use client'

import { useCallback, useState } from 'react'

import useSWR, { mutate } from 'swr'

import { apiEndpoints } from '@/config/api-endpoints'
import type { Achievement } from '@/config/rewards'
import { useAchievementNotification } from '@/context/achievement-notification'
import { api } from '@/lib/api/http-client'
import type { UserGameData } from '@/lib/db/schema'

interface RewardsStats {
  gameData: UserGameData
  levelInfo: any
  achievements: {
    total: number
    unlocked: number
    percentage: number
    totalXP: number
  }
  quests: {
    daily: { total: number; completed: number }
    weekly: { total: number; completed: number }
  }
  rank: number
  nextLevelXP: number | null
  xpToNextLevel: number
}

export function useRewards(userId?: number) {
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [newLevel, setNewLevel] = useState(0)
  const [xpGained, setXpGained] = useState(0)

  // Try to use achievement notification if available
  let showAchievement: ((achievement: any) => void) | undefined
  try {
    const context = useAchievementNotification()
    showAchievement = context.showAchievement
  } catch {
    // Context not available, that's okay
    showAchievement = undefined
  }

  const {
    data: stats,
    error,
    isLoading
  } = useSWR<RewardsStats>(
    userId ? apiEndpoints.rewards.statsByUserId(userId) : null,
    (url: string) => api.get(url).then((res: any) => res.data)
  )

  const { data: achievements } = useSWR<
    (Achievement & { unlocked: boolean })[]
  >(
    userId ? apiEndpoints.rewards.achievementsByUserId(userId) : null,
    (url: string) => api.get(url).then((res: any) => res.data)
  )

  const { data: quests } = useSWR(
    userId ? apiEndpoints.rewards.questsByUserId(userId) : null,
    (url: string) => api.get(url).then((res: any) => res.data)
  )

  const { data: leaderboard } = useSWR(
    apiEndpoints.rewards.leaderboard,
    (url: string) => api.get(url).then((res: any) => res.data)
  )

  const handleDailyLogin = useCallback(async () => {
    if (!userId) return

    try {
      const response = await api.post(apiEndpoints.rewards.dailyLogin, {
        userId
      })
      const data = response.data

      if (data?.leveledUp) {
        setNewLevel(data.level)
        setXpGained(data.xpGained)
        setShowLevelUp(true)
      }

      // Refresh all rewards data
      mutate(apiEndpoints.rewards.statsByUserId(userId))
      mutate(apiEndpoints.rewards.achievementsByUserId(userId))
      mutate(apiEndpoints.rewards.questsByUserId(userId))

      return data
    } catch (error) {
      console.error('Failed to handle daily login:', error)
    }
  }, [userId])

  const addXP = useCallback(
    async (amount: number, reason?: string) => {
      if (!userId) return

      try {
        const response = await api.post(apiEndpoints.rewards.addXp, {
          userId,
          amount,
          reason
        })
        const data = response.data

        if (data?.leveledUp) {
          setNewLevel(data.level)
          setXpGained(amount)
          setShowLevelUp(true)
        }

        // Refresh stats
        mutate(apiEndpoints.rewards.statsByUserId(userId))

        return data
      } catch (error) {
        console.error('Failed to add XP:', error)
      }
    },
    [userId]
  )

  const updateQuestProgress = useCallback(
    async (questId: string, increment: number = 1) => {
      if (!userId) return

      try {
        const response = await api.post(apiEndpoints.rewards.questProgress, {
          userId,
          questId,
          increment
        })

        // Refresh quests
        mutate(apiEndpoints.rewards.questsByUserId(userId))

        return response.data
      } catch (error) {
        console.error('Failed to update quest progress:', error)
      }
    },
    [userId]
  )

  const checkAchievement = useCallback(
    async (achievementId: string) => {
      if (!userId) return

      try {
        const response = await api.post(apiEndpoints.rewards.checkAchievement, {
          userId,
          achievementId
        })

        if (response.data?.unlocked && response.data?.achievement) {
          // Show achievement notification if available
          if (showAchievement) {
            showAchievement(response.data.achievement)
          }

          // Refresh achievements
          mutate(apiEndpoints.rewards.achievementsByUserId(userId))
          mutate(apiEndpoints.rewards.statsByUserId(userId))
        }

        return response.data
      } catch (error) {
        console.error('Failed to check achievement:', error)
      }
    },
    [userId, showAchievement]
  )

  return {
    stats,
    achievements,
    quests,
    leaderboard,
    isLoading,
    error,
    handleDailyLogin,
    addXP,
    updateQuestProgress,
    checkAchievement,
    showLevelUp,
    setShowLevelUp,
    newLevel,
    xpGained
  }
}
