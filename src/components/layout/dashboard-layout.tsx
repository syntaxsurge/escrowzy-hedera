'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import {
  Menu,
  LayoutDashboard,
  Users,
  Mail,
  Bell,
  X,
  MessageSquare,
  Trophy,
  Swords,
  UserCircle,
  Activity,
  Crown,
  Rocket,
  Sparkles,
  Flame,
  Grid3x3,
  Zap,
  Target,
  Coins,
  CreditCard
} from 'lucide-react'

import { AutoBreadcrumb } from '@/components/layout/auto-breadcrumb'
import { navigationProgress } from '@/components/providers/navigation-progress'
import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'
import { useTransactionSync } from '@/hooks/blockchain/use-transaction'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useRewards } from '@/hooks/use-rewards'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'
import { getActiveSection } from '@/lib/utils/route'

import { AdminNav } from './admin-nav'

interface DashboardLayoutClientProps {
  children: React.ReactNode
  isAdmin: boolean
}

export function DashboardLayoutClient({
  children,
  isAdmin
}: DashboardLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const sidebarState = useDialogState()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const { user } = useSession()
  const { stats } = useRewards(user?.id)

  // Sync pending transactions in the background
  useTransactionSync()

  // Determine active section based on current path
  useEffect(() => {
    setActiveSection(getActiveSection(pathname))
  }, [pathname])

  // Quick Access Items - For single-content sections
  const quickAccess = [
    {
      id: 'trading',
      href: appRoutes.trades.base,
      icon: Flame,
      label: 'Trading Hub',
      description: 'P2P Marketplace',
      color: 'from-orange-500 to-red-500',
      glow: 'shadow-orange-500/50',
      badge: null
    },
    {
      id: 'rewards',
      href: appRoutes.rewards.base,
      icon: Trophy,
      label: 'Reward Center',
      description: 'Claim Your XP',
      color: 'from-yellow-500 to-amber-500',
      glow: 'shadow-yellow-500/50',
      badge: null
    },
    {
      id: 'battle',
      href: appRoutes.battles.base,
      icon: Swords,
      label: 'Battle Zone',
      description: 'PvP Combat Arena',
      color: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/50',
      badge: null
    },
    {
      id: 'chat',
      href: appRoutes.chat.base,
      icon: MessageSquare,
      label: 'Chat',
      description: 'Messages',
      color: 'from-indigo-500 to-purple-500',
      glow: 'shadow-indigo-500/50',
      badge: null
    }
  ]

  // Main Navigation Sections - For multi-item sections
  const navigationSections = [
    {
      id: 'command',
      title: 'Command Center',
      icon: Rocket,
      color: 'from-blue-500 to-cyan-500',
      glow: 'shadow-cyan-500/50',
      accentColor: 'bg-cyan-500',
      items: [
        {
          href: appRoutes.dashboard.base,
          icon: LayoutDashboard,
          label: 'Dashboard',
          description: 'Mission Control',
          xp: null,
          isNew: false
        },
        {
          href: appRoutes.dashboard.activity,
          icon: Activity,
          label: 'Activity',
          description: 'Live Feed',
          xp: null,
          isNew: false
        },
        {
          href: appRoutes.dashboard.settings.base,
          icon: UserCircle,
          label: 'Profile',
          description: 'Your Stats',
          xp: null,
          isNew: false
        },
        {
          href: appRoutes.dashboard.settings.subscription,
          icon: CreditCard,
          label: 'Subscription',
          description: 'Manage Plan',
          xp: null,
          isNew: false
        }
      ]
    },
    {
      id: 'social',
      title: 'Social Hub',
      icon: Sparkles,
      color: 'from-green-500 to-emerald-500',
      glow: 'shadow-emerald-500/50',
      accentColor: 'bg-emerald-500',
      items: [
        {
          href: appRoutes.chat.base,
          icon: MessageSquare,
          label: 'Chat',
          description: 'Messages',
          xp: null,
          isNew: false
        },
        {
          href: appRoutes.dashboard.settings.team,
          icon: Users,
          label: 'Team',
          description: 'Your Guild',
          xp: null,
          isNew: false
        },
        {
          href: appRoutes.dashboard.invitations,
          icon: Mail,
          label: 'Invitations',
          description: 'Join Requests',
          xp: null,
          isNew: false
        },
        {
          href: appRoutes.dashboard.notifications,
          icon: Bell,
          label: 'Notifications',
          description: 'Updates',
          xp: null,
          isNew: false
        }
      ]
    }
  ]

  return (
    <div className='mx-auto flex min-h-[calc(100dvh-68px)] w-full max-w-7xl flex-col'>
      {/* Mobile header - Clean Modern */}
      <div className='flex items-center justify-between border-b border-gray-200/20 bg-white/80 p-4 backdrop-blur-xl lg:hidden dark:border-gray-800/20 dark:bg-gray-950/80'>
        <div className='flex items-center gap-3'>
          <div className='relative h-9 w-9 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2 shadow-lg shadow-indigo-500/20'>
            <Rocket className='h-full w-full text-white' />
          </div>
          <span className='text-lg font-semibold text-gray-900 dark:text-white'>
            Dashboard
          </span>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800'
          onClick={() => sidebarState.toggle()}
        >
          <Menu className='h-5 w-5' />
          <span className='sr-only'>Toggle menu</span>
        </Button>
      </div>

      <div className='flex h-full flex-1 overflow-hidden'>
        {/* Gaming Sidebar */}
        <aside
          className={cn(
            'w-64 shrink-0 backdrop-blur-2xl transition-all duration-300 lg:relative lg:block',
            'border-r border-gray-200/20 dark:border-purple-500/20',
            'bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-black',
            sidebarState.isOpen
              ? 'fixed inset-y-0 left-0 z-50 translate-x-0'
              : 'fixed inset-y-0 left-0 z-50 -translate-x-full lg:translate-x-0'
          )}
        >
          <div className='flex h-full flex-col'>
            {/* Gaming Header with Player Stats */}
            <div className='relative overflow-hidden border-b border-gray-200/20 bg-gradient-to-r from-purple-100/50 via-indigo-100/50 to-blue-100/50 p-5 dark:border-purple-500/20 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50'>
              {/* Animated Background */}
              <div className='absolute inset-0'>
                <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.3),transparent_50%)]' />
                <div className='absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(120,119,198,0.2),transparent_50%)]' />
                <div className='absolute inset-0 opacity-30'>
                  <div className='absolute top-0 left-0 h-32 w-32 animate-pulse rounded-full bg-cyan-500/20 blur-3xl' />
                  <div
                    className='absolute right-0 bottom-0 h-32 w-32 animate-pulse rounded-full bg-purple-500/20 blur-3xl'
                    style={{ animationDelay: '1s' }}
                  />
                </div>
              </div>

              {/* Close button for mobile */}
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-4 right-4 z-50 h-8 w-8 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 lg:hidden'
                onClick={() => sidebarState.close()}
              >
                <X className='h-4 w-4 text-white' />
              </Button>

              <div className='relative z-10 space-y-4'>
                {/* Player Identity */}
                <div className='flex items-center gap-4'>
                  <div className='relative'>
                    {/* Glowing orb effect */}
                    <div className='absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 opacity-60 blur-xl' />
                    <div className='relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 p-3 shadow-2xl'>
                      <Grid3x3 className='h-full w-full text-white' />
                    </div>
                  </div>
                  <div className='flex-1'>
                    <h2 className='text-xl font-black text-gray-900 dark:text-white'>
                      DASHBOARD
                    </h2>
                    <div className='flex items-center gap-2'>
                      <div className='flex items-center gap-1'>
                        <Zap className='h-3 w-3 text-yellow-600 dark:text-yellow-400' />
                        <span className='text-xs font-bold text-yellow-600 dark:text-yellow-400'>
                          LVL {stats?.gameData?.level || 1}
                        </span>
                      </div>
                      <div className='h-3 w-px bg-gray-400 dark:bg-gray-600' />
                      <div className='flex items-center gap-1'>
                        <Coins className='h-3 w-3 text-amber-600 dark:text-amber-400' />
                        <span className='text-xs font-bold text-amber-600 dark:text-amber-400'>
                          {stats?.gameData?.xp?.toLocaleString() || 0} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player Stats Bar */}
                <div className='space-y-2'>
                  {/* XP Progress */}
                  <div>
                    <div className='mb-1 flex items-center justify-between'>
                      <span className='text-[10px] font-bold text-cyan-600 dark:text-cyan-400'>
                        EXPERIENCE
                      </span>
                      <span className='text-[10px] font-bold text-cyan-600 dark:text-cyan-400'>
                        {stats?.gameData?.xp?.toLocaleString() || 0} /{' '}
                        {stats?.nextLevelXP?.toLocaleString() || 100}
                      </span>
                    </div>
                    <div className='h-2 overflow-hidden rounded-full bg-gray-200/50 backdrop-blur-sm dark:bg-black/50'>
                      <div
                        className='h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000'
                        style={{
                          width: `${Math.min(100, ((stats?.gameData?.xp || 0) / (stats?.nextLevelXP || 100)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Achievement Points */}
                  <div className='grid grid-cols-3 gap-2'>
                    <div className='flex items-center gap-1.5 rounded-lg bg-gray-200/30 px-2 py-1 backdrop-blur-sm dark:bg-black/30'>
                      <Trophy className='h-3 w-3 text-yellow-600 dark:text-yellow-400' />
                      <span className='text-[10px] font-bold text-gray-700 dark:text-gray-300'>
                        {stats?.achievements?.unlocked || 0}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5 rounded-lg bg-gray-200/30 px-2 py-1 backdrop-blur-sm dark:bg-black/30'>
                      <Target className='h-3 w-3 text-blue-600 dark:text-blue-400' />
                      <span className='text-[10px] font-bold text-gray-700 dark:text-gray-300'>
                        {stats?.quests?.daily?.completed || 0}/
                        {stats?.quests?.daily?.total || 0}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5 rounded-lg bg-gray-200/30 px-2 py-1 backdrop-blur-sm dark:bg-black/30'>
                      <Flame className='h-3 w-3 text-red-600 dark:text-red-400' />
                      <span className='text-[10px] font-bold text-gray-700 dark:text-gray-300'>
                        {stats?.gameData?.loginStreak || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gaming Navigation */}
            <nav className='flex-1 overflow-y-auto p-4'>
              {/* Quick Access Cards - Gamified Single Items */}
              <div className='mb-6'>
                <div className='mb-3 flex items-center justify-between px-2'>
                  <h3 className='text-xs font-black tracking-wider text-gray-600 uppercase dark:text-gray-500'>
                    Quick Access
                  </h3>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  {quickAccess.map(item => {
                    const isActive = pathname === item.href
                    const isHovered = hoveredItem === `quick-${item.id}`

                    return (
                      <Button
                        key={item.id}
                        variant='ghost'
                        className='group relative h-auto w-full overflow-hidden rounded-xl p-0 transition-all duration-300'
                        onMouseEnter={() => setHoveredItem(`quick-${item.id}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          navigationProgress.start()
                          router.push(item.href)
                          sidebarState.close()
                        }}
                      >
                        {/* Card Background */}
                        <div className='group-hover:bg-gray-150 absolute inset-0 bg-gray-100 transition-all duration-300 dark:bg-gray-800/50 dark:group-hover:bg-gray-800/70' />

                        {/* Active/Hover Gradient */}
                        {(isActive || isHovered) && (
                          <div
                            className={cn(
                              'absolute inset-0 bg-gradient-to-br opacity-20 transition-opacity duration-300',
                              item.color
                            )}
                          />
                        )}

                        {/* Content */}
                        <div className='relative z-10 flex flex-col p-3'>
                          {/* Icon */}
                          <div className='mb-2'>
                            <div
                              className={cn(
                                'inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br p-2.5 shadow-xl transition-all duration-300',
                                item.color,
                                isActive && 'scale-110 ' + item.glow,
                                isHovered && !isActive && 'scale-105'
                              )}
                            >
                              <item.icon className='h-full w-full text-white' />
                            </div>
                          </div>

                          {/* Text */}
                          <div className='text-left'>
                            <div className='text-xs font-black text-gray-800 dark:text-white'>
                              {item.label}
                            </div>
                            <div className='text-[10px] text-gray-600 dark:text-gray-400'>
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className='mb-4 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent' />
              {/* Navigation Sections */}
              {navigationSections.map(section => {
                const isSectionActive = activeSection === section.id
                const isExpanded = true

                return (
                  <div key={section.id} className='group mb-4'>
                    {/* Section Header */}
                    <div className='relative mb-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-gray-200/30 to-gray-300/30 p-3 backdrop-blur-sm dark:from-gray-800/30 dark:to-gray-900/30'>
                      {/* Glow effect */}
                      {isSectionActive && (
                        <div
                          className={cn(
                            'absolute inset-0 opacity-20',
                            section.glow
                          )}
                        />
                      )}

                      <div className='relative z-10 flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          {/* Animated Icon Container */}
                          <div className='relative'>
                            {isSectionActive && (
                              <div
                                className={cn(
                                  'absolute inset-0 animate-pulse rounded-xl blur-md',
                                  section.glow
                                )}
                              />
                            )}
                            <div
                              className={cn(
                                'relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br p-2 shadow-lg transition-all duration-300',
                                section.color,
                                'scale-110 rotate-12 shadow-2xl'
                              )}
                            >
                              <section.icon className='h-5 w-5 text-white' />
                            </div>
                          </div>

                          <div className='flex-1'>
                            <h3 className='text-sm font-black text-gray-900 dark:text-white'>
                              {section.title}
                            </h3>
                            <div className='flex items-center gap-2'>
                              <div
                                className={cn(
                                  'h-1 rounded-full transition-all duration-500',
                                  section.accentColor,
                                  'w-12'
                                )}
                              />
                              <span className='text-[10px] font-medium text-gray-600 dark:text-gray-500'>
                                ACTIVE
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section Items - Collapsible */}
                    <div
                      className={cn(
                        'grid gap-1.5 overflow-hidden transition-all duration-500',
                        isExpanded
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      )}
                    >
                      <div className='space-y-1.5 overflow-hidden'>
                        {section.items.map((item, index) => {
                          const isActive = pathname === item.href
                          const isHovered =
                            hoveredItem === `${section.id}-${index}`

                          return (
                            <Button
                              key={item.href}
                              variant='ghost'
                              className={cn(
                                'group relative h-auto w-full justify-start overflow-hidden rounded-xl p-0 transition-all duration-300',
                                isActive && 'ml-2 scale-[1.02]',
                                !isActive && isHovered && 'ml-1'
                              )}
                              onMouseEnter={() =>
                                setHoveredItem(`${section.id}-${index}`)
                              }
                              onMouseLeave={() => setHoveredItem(null)}
                              onClick={() => {
                                navigationProgress.start()
                                router.push(item.href)
                                sidebarState.close()
                              }}
                            >
                              {/* Background gradient */}
                              <div
                                className={cn(
                                  'absolute inset-0 transition-all duration-300',
                                  isActive
                                    ? 'bg-gradient-to-r opacity-90'
                                    : isHovered
                                      ? 'bg-gradient-to-r opacity-50'
                                      : 'bg-gradient-to-r opacity-0',
                                  section.color
                                )}
                              />

                              {/* Glass effect overlay */}
                              <div
                                className={cn(
                                  'absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm transition-opacity duration-300',
                                  isActive || isHovered
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />

                              {/* Content */}
                              <div className='relative flex w-full items-center gap-3 p-3'>
                                {/* Connection Line */}
                                <div className='absolute top-1/2 left-0 h-px w-2 -translate-y-1/2 bg-gradient-to-r from-transparent to-gray-700' />
                                {/* Icon Container */}
                                <div className='relative'>
                                  {/* Icon glow */}
                                  {isActive && (
                                    <div
                                      className={cn(
                                        'absolute inset-0 rounded-lg blur-md',
                                        section.glow
                                      )}
                                    />
                                  )}
                                  <div
                                    className={cn(
                                      'relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300',
                                      isActive || isHovered
                                        ? 'bg-white/30 backdrop-blur-sm dark:bg-black/30'
                                        : 'bg-gray-200/50 dark:bg-gray-800/50'
                                    )}
                                  >
                                    <item.icon
                                      className={cn(
                                        'h-5 w-5 transition-all duration-300',
                                        isActive
                                          ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                                          : isHovered
                                            ? 'scale-110 text-gray-800 dark:text-white/90'
                                            : 'text-gray-600 dark:text-gray-400'
                                      )}
                                    />
                                  </div>
                                </div>

                                {/* Text */}
                                <div className='flex-1'>
                                  <div className='flex items-center gap-2'>
                                    <div
                                      className={cn(
                                        'text-sm font-bold transition-colors duration-300',
                                        isActive
                                          ? 'text-white'
                                          : isHovered
                                            ? 'text-gray-800 dark:text-white/90'
                                            : 'text-gray-700 dark:text-gray-300'
                                      )}
                                    >
                                      {item.label}
                                    </div>
                                  </div>
                                  <div className='flex items-center gap-2'>
                                    <div
                                      className={cn(
                                        'text-xs transition-all duration-300',
                                        isActive
                                          ? 'text-white/90'
                                          : isHovered
                                            ? 'text-gray-600 dark:text-gray-400'
                                            : 'text-gray-500 dark:text-gray-500'
                                      )}
                                    >
                                      {item.description}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Admin Section - Gaming Style */}
              {isAdmin && (
                <div className='mt-4 overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/50 to-orange-950/50 p-4'>
                  <div className='mb-3 flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/50'>
                      <Crown className='h-4 w-4 text-white' />
                    </div>
                    <span className='text-xs font-black text-red-400 uppercase'>
                      Admin Access
                    </span>
                  </div>
                  <AdminNav isAdmin={isAdmin} />
                </div>
              )}
            </nav>
          </div>
        </aside>

        {/* Main content - Gaming background */}
        <main className='relative flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-black'>
          {/* Grid pattern overlay */}
          <div className='pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]' />

          {/* Gradient overlays */}
          <div className='pointer-events-none fixed inset-0'>
            <div className='absolute top-0 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl' />
            <div className='absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl' />
          </div>

          <div className='relative h-full p-4 sm:p-6'>
            <AutoBreadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
