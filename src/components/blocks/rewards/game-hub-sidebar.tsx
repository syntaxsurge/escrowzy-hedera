'use client'

import type { LucideIcon } from 'lucide-react'

import {
  DashboardHubSidebar,
  type NavigationItem as BaseNavigationItem,
  type Alert
} from '@/components/blocks/dashboard-hub-sidebar'

export type NavigationItem = BaseNavigationItem

export interface GameHubSidebarProps {
  title: string
  icon: LucideIcon
  iconGradient: string
  navigationItems: NavigationItem[]
  stats?: Record<string, number>
  alerts?: Alert[]
  className?: string
}

export function GameHubSidebar(props: GameHubSidebarProps) {
  return <DashboardHubSidebar {...props} />
}
