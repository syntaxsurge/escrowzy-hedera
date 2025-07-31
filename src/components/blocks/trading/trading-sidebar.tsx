'use client'

import {
  ShoppingCart,
  ListPlus,
  TrendingUp,
  Clock,
  Zap,
  Flame,
  MessageSquare,
  Plus,
  ArrowDownUp
} from 'lucide-react'

import { DashboardHubSidebar } from '@/components/blocks/dashboard-hub-sidebar'
import { appRoutes } from '@/config/app-routes'

interface TradingSidebarProps {
  activeTrades?: number
  disputedTrades?: number
  activeListings?: number
  className?: string
}

const navigationItems = [
  {
    title: 'Trading Dashboard',
    href: appRoutes.trades.base,
    icon: Zap,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'hover:bg-purple-500/10'
  },
  {
    title: 'Active Trades',
    href: appRoutes.trades.active,
    icon: TrendingUp,
    badge: 'activeTrades',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'hover:bg-yellow-500/10'
  },
  {
    title: 'Browse Marketplace',
    href: appRoutes.trades.listings.base,
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'hover:bg-blue-500/10'
  },
  {
    title: 'Create Listing',
    href: appRoutes.trades.listings.create,
    icon: Plus,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'hover:bg-emerald-500/10'
  },
  {
    title: 'My Listings',
    href: appRoutes.trades.myListings,
    icon: ListPlus,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'hover:bg-green-500/10'
  },
  {
    title: 'Trade History',
    href: appRoutes.trades.history.base,
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'hover:bg-purple-500/10'
  },
  {
    title: 'Token Swap',
    href: appRoutes.trades.swap,
    icon: ArrowDownUp,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'hover:bg-indigo-500/10'
  },
  {
    title: 'Trading Chats',
    href: appRoutes.withParams.tradesTab(appRoutes.chat.base),
    icon: MessageSquare,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'hover:bg-pink-500/10'
  }
]

export function TradingSidebar({
  activeTrades = 0,
  disputedTrades = 0,
  activeListings = 0,
  className
}: TradingSidebarProps) {
  const stats = {
    activeTrades,
    activeListings
  }

  const alerts =
    disputedTrades > 0
      ? [
          {
            title: 'Disputes',
            value: disputedTrades,
            icon: Flame,
            color: 'text-red-500'
          }
        ]
      : []

  return (
    <DashboardHubSidebar
      title='TRADING HUB'
      icon={Zap}
      iconGradient='from-primary bg-gradient-to-br via-purple-600 to-pink-600'
      navigationItems={navigationItems}
      stats={stats}
      alerts={alerts}
      className={className}
    />
  )
}
