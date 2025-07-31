'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode
} from 'react'

import { AchievementNotification } from '@/components/blocks/rewards/achievement-notification'
import type { Achievement } from '@/config/rewards'

interface AchievementNotificationContextType {
  showAchievement: (achievement: Achievement & { unlocked?: boolean }) => void
  hideAchievement: () => void
}

const AchievementNotificationContext = createContext<
  AchievementNotificationContextType | undefined
>(undefined)

export function AchievementNotificationProvider({
  children
}: {
  children: ReactNode
}) {
  const [show, setShow] = useState(false)
  const [currentAchievement, setCurrentAchievement] = useState<
    (Achievement & { unlocked?: boolean }) | null
  >(null)

  const showAchievement = useCallback(
    (achievement: Achievement & { unlocked?: boolean }) => {
      setCurrentAchievement(achievement)
      setShow(true)
    },
    []
  )

  const hideAchievement = useCallback(() => {
    setShow(false)
    // Keep achievement for fade out animation
    setTimeout(() => setCurrentAchievement(null), 500)
  }, [])

  return (
    <AchievementNotificationContext.Provider
      value={{ showAchievement, hideAchievement }}
    >
      {children}
      <AchievementNotification
        show={show}
        achievement={currentAchievement}
        onClose={hideAchievement}
      />
    </AchievementNotificationContext.Provider>
  )
}

export function useAchievementNotification() {
  const context = useContext(AchievementNotificationContext)
  if (!context) {
    throw new Error(
      'useAchievementNotification must be used within AchievementNotificationProvider'
    )
  }
  return context
}
