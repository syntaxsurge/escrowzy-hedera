'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

import { ChevronLeft, ChevronRight, Home, LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'

export interface NavigationItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  color: string
  bgColor: string
}

export interface Alert {
  title: string
  value: number
  icon: LucideIcon
  color: string
}

export interface DashboardHubSidebarProps {
  title: string
  icon: LucideIcon
  iconGradient: string
  navigationItems: NavigationItem[]
  stats?: Record<string, number>
  alerts?: Alert[]
  className?: string
}

export function DashboardHubSidebar({
  title,
  icon: HubIcon,
  iconGradient,
  navigationItems,
  stats = {},
  alerts = [],
  className
}: DashboardHubSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setIsCollapsed(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <>
      {/* Mobile Overlay Background */}
      {isMobile && !isCollapsed && (
        <div
          className='fixed inset-0 z-40 bg-black/50 md:hidden'
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        className={cn(
          'from-background via-muted/50 to-primary/5 dark:to-primary/10 border-border/50 flex h-full flex-col border-r-2 bg-gradient-to-br backdrop-blur-sm transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-64',
          isMobile && !isCollapsed
            ? 'fixed top-16 left-0 z-50 h-[calc(100vh-4rem)]'
            : 'sticky top-16',
          className
        )}
      >
        {/* Header */}
        <div className='border-border/50 border-b p-4'>
          <div className='flex items-center justify-between'>
            {!isCollapsed ? (
              <div className='flex items-center gap-2'>
                <div
                  className={cn(
                    'relative rounded-lg p-2 shadow-lg',
                    iconGradient
                  )}
                >
                  <HubIcon className='h-5 w-5 text-white' />
                </div>
                <span className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-lg font-black text-transparent'>
                  {title}
                </span>
              </div>
            ) : (
              <div className='flex justify-center'>
                <div
                  className={cn(
                    'relative rounded-lg p-2 shadow-lg',
                    iconGradient
                  )}
                  title={title}
                >
                  <HubIcon className='h-5 w-5 text-white' />
                </div>
              </div>
            )}
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'hover:bg-white/10',
                isCollapsed ? 'mx-auto' : 'ml-auto'
              )}
            >
              {isCollapsed ? (
                <ChevronRight className='h-4 w-4' />
              ) : (
                <ChevronLeft className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>

        {/* Alerts Section */}
        {!isCollapsed && alerts.length > 0 && (
          <div className='border-border/50 border-b p-4'>
            <div className='space-y-3'>
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between rounded-lg border border-red-500/20 bg-gradient-to-r from-red-500/10 to-pink-500/10 p-3'
                >
                  <div className='flex items-center gap-2'>
                    <alert.icon className={cn('h-4 w-4', alert.color)} />
                    <span className='text-xs font-bold text-red-600 uppercase dark:text-red-400'>
                      {alert.title}
                    </span>
                  </div>
                  <Badge className='border-0 bg-red-500/20 text-red-600 dark:text-red-400'>
                    {alert.value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className='min-h-0 flex-1 space-y-1 overflow-y-auto p-4'>
          {navigationItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const badgeCount = item.badge ? stats[item.badge] : undefined

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'from-primary/20 border-primary/30 border bg-gradient-to-r to-purple-600/20 shadow-lg'
                    : 'hover:scale-105',
                  item.bgColor
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {isActive && (
                  <div className='bg-primary absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full' />
                )}

                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform group-hover:rotate-12',
                    isActive ? 'text-primary' : item.color,
                    isCollapsed && 'mx-auto'
                  )}
                />

                {!isCollapsed && (
                  <>
                    <span
                      className={cn(
                        'flex-1',
                        isActive
                          ? 'text-primary font-bold'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.title}
                    </span>

                    {badgeCount !== undefined && badgeCount > 0 && (
                      <Badge
                        variant='secondary'
                        className={cn(
                          'min-w-[24px] justify-center',
                          isActive && 'bg-primary/20 text-primary'
                        )}
                      >
                        {badgeCount}
                      </Badge>
                    )}
                  </>
                )}

                {isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
                  <div className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white'>
                    {badgeCount}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Go to Main Dashboard Button */}
        <div className='border-border/50 flex-shrink-0 border-t p-4'>
          <Link href={appRoutes.dashboard.base}>
            {isCollapsed ? (
              <Button
                variant='outline'
                size='icon'
                className='group border-primary/30 from-background/80 to-muted/80 hover:border-primary/50 hover:bg-primary/10 w-full border-2 bg-gradient-to-r font-bold backdrop-blur-sm transition-all hover:scale-105'
                title='Go to Main Dashboard'
              >
                <Home className='h-5 w-5 transition-transform group-hover:rotate-12' />
              </Button>
            ) : (
              <Button
                variant='outline'
                size='lg'
                className='group border-primary/30 from-background/80 to-muted/80 hover:border-primary/50 hover:bg-primary/10 w-full border-2 bg-gradient-to-r font-bold backdrop-blur-sm transition-all hover:scale-105'
              >
                <Home className='mr-2 h-5 w-5 transition-transform group-hover:rotate-12' />
                GO TO MAIN DASHBOARD
              </Button>
            )}
          </Link>
        </div>
      </div>
    </>
  )
}
