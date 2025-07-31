'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Menu,
  LayoutDashboard,
  Users,
  UsersIcon,
  Activity,
  FileText,
  X,
  Shield,
  CreditCard,
  BarChart3,
  Settings,
  AlertTriangle
} from 'lucide-react'

import { AutoBreadcrumb } from '@/components/layout/auto-breadcrumb'
import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'
import { useDialogState } from '@/hooks/use-dialog-state'

interface AdminLayoutClientProps {
  children: React.ReactNode
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const sidebarState = useDialogState()

  const overviewItems = [
    {
      href: appRoutes.admin.base,
      icon: LayoutDashboard,
      label: 'Dashboard',
      description: 'Platform overview'
    },
    {
      href: appRoutes.admin.activity,
      icon: Activity,
      label: 'Activity Logs',
      description: 'System activity'
    }
  ]

  const managementItems = [
    {
      href: appRoutes.admin.users,
      icon: Users,
      label: 'Users',
      description: 'Manage users'
    },
    {
      href: appRoutes.admin.teams,
      icon: UsersIcon,
      label: 'Teams',
      description: 'Manage teams'
    },
    {
      href: appRoutes.admin.disputes,
      icon: AlertTriangle,
      label: 'Disputes',
      description: 'Resolve trade disputes'
    },
    {
      href: appRoutes.admin.payments,
      icon: CreditCard,
      label: 'Payments',
      description: 'Payment history'
    }
  ]

  const platformItems = [
    {
      href: appRoutes.admin.blockchainConfig,
      icon: Settings,
      label: 'Blockchain Config',
      description: 'Sync & manage contracts'
    },
    {
      href: appRoutes.admin.legalDocuments,
      icon: FileText,
      label: 'Legal Documents',
      description: 'Terms & Privacy'
    }
  ]

  const contractItems = [
    {
      href: appRoutes.admin.contracts.subscription,
      icon: CreditCard,
      label: 'Subscription Manager',
      description: 'Plans & earnings'
    },
    {
      href: appRoutes.admin.contracts.escrow,
      icon: Shield,
      label: 'Escrow Core',
      description: 'Trades & disputes'
    },
    {
      href: appRoutes.admin.contracts.achievementNft,
      icon: BarChart3,
      label: 'Achievement NFT',
      description: 'NFTs & rewards'
    }
  ]

  return (
    <div className='mx-auto flex min-h-[calc(100dvh-68px)] w-full max-w-7xl flex-col'>
      {/* Mobile header */}
      <div className='flex items-center justify-between border-b border-gray-200/60 bg-white/90 p-4 backdrop-blur-md lg:hidden dark:border-gray-700/60 dark:bg-gray-900/90'>
        <div className='flex items-center space-x-3'>
          <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 p-1.5'>
            <Shield className='h-full w-full text-white' />
          </div>
          <span className='bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-lg font-semibold text-transparent dark:from-white dark:to-gray-300'>
            Admin Panel
          </span>
        </div>
        <Button
          className='relative h-10 w-10 rounded-xl bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/80 dark:bg-gray-800/80 dark:hover:bg-gray-700/80'
          variant='ghost'
          size='icon'
          onClick={() => sidebarState.toggle()}
        >
          <Menu className='h-5 w-5 text-gray-700 dark:text-gray-300' />
          <span className='sr-only'>Toggle sidebar</span>
        </Button>
      </div>

      <div className='flex h-full flex-1 overflow-hidden'>
        {/* Sidebar */}
        <aside
          className={`w-72 border-r border-gray-200/60 bg-white/70 backdrop-blur-2xl lg:block ${
            sidebarState.isOpen ? 'block' : 'hidden'
          } absolute inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarState.isOpen ? 'translate-x-0' : '-translate-x-full'
          } dark:border-gray-700/60 dark:bg-gray-900/70`}
        >
          <div className='flex h-full flex-col'>
            {/* Sidebar Header - Admin Design */}
            <div className='relative overflow-hidden border-b border-gray-200/40 bg-gradient-to-br from-red-50/50 to-orange-100/30 p-6 dark:border-gray-700/40 dark:from-red-900/30 dark:to-orange-900/30'>
              <div className='absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br from-red-400/10 via-orange-400/10 to-yellow-400/10 blur-2xl' />

              {/* Close button for mobile - positioned in upper right corner */}
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-4 right-4 z-50 h-8 w-8 rounded-lg bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/80 lg:hidden dark:bg-gray-800/80 dark:hover:bg-gray-700/80'
                onClick={() => sidebarState.close()}
              >
                <X className='h-4 w-4 text-gray-700 dark:text-gray-300' />
                <span className='sr-only'>Close sidebar</span>
              </Button>

              <div className='relative'>
                <div className='flex items-center space-x-3'>
                  <div className='group relative h-10 w-10'>
                    <div className='absolute inset-0 rounded-xl bg-gradient-to-br from-red-600 via-orange-600 to-yellow-600 opacity-90 blur-sm transition-all duration-300 group-hover:opacity-100' />
                    <div className='relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-orange-600 to-yellow-700 shadow-lg'>
                      <Shield className='h-5 w-5 text-white' />
                    </div>
                  </div>
                  <div>
                    <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      Admin Panel
                    </h2>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      System Management
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className='flex-1 space-y-1.5 overflow-y-auto p-4'>
              {/* Overview Section */}
              <div className='mb-6'>
                <p className='mb-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400'>
                  <span className='mr-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                  <span className='px-2 tracking-wider uppercase'>
                    Overview
                  </span>
                  <span className='ml-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                </p>
                {overviewItems.map(item => (
                  <Link key={item.href} href={item.href} passHref>
                    <Button
                      variant='ghost'
                      className={`group relative w-full justify-start rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                        pathname === item.href
                          ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/25 hover:shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white'
                      }`}
                      onClick={() => sidebarState.close()}
                    >
                      <div
                        className={`mr-3 rounded-lg p-2 transition-all duration-200 ${
                          pathname === item.href
                            ? 'bg-white/20 shadow-sm'
                            : 'bg-gray-100/60 group-hover:bg-gray-200/80 dark:bg-gray-800/60 dark:group-hover:bg-gray-700/80'
                        }`}
                      >
                        <item.icon className='h-4 w-4' />
                      </div>
                      <span className='font-medium'>{item.label}</span>
                      {pathname === item.href && (
                        <div className='absolute right-2 h-2 w-2 rounded-full bg-white/80' />
                      )}
                    </Button>
                  </Link>
                ))}
              </div>

              {/* Management Section */}
              <div className='mb-6'>
                <p className='mb-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400'>
                  <span className='mr-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                  <span className='px-2 tracking-wider uppercase'>
                    Management
                  </span>
                  <span className='ml-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                </p>
                {managementItems.map(item => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href)

                  return (
                    <Link key={item.href} href={item.href} passHref>
                      <Button
                        variant='ghost'
                        className={`group relative w-full justify-start rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                          isActive
                            ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/25 hover:shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white'
                        }`}
                        onClick={() => sidebarState.close()}
                      >
                        <div
                          className={`mr-3 rounded-lg p-2 transition-all duration-200 ${
                            isActive
                              ? 'bg-white/20 shadow-sm'
                              : 'bg-gray-100/60 group-hover:bg-gray-200/80 dark:bg-gray-800/60 dark:group-hover:bg-gray-700/80'
                          }`}
                        >
                          <item.icon className='h-4 w-4' />
                        </div>
                        <span className='font-medium'>{item.label}</span>
                        {isActive && (
                          <div className='absolute right-2 h-2 w-2 rounded-full bg-white/80' />
                        )}
                      </Button>
                    </Link>
                  )
                })}
              </div>

              {/* Smart Contracts Section */}
              <div className='mb-6'>
                <p className='mb-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400'>
                  <span className='mr-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                  <span className='px-2 tracking-wider uppercase'>
                    Smart Contracts
                  </span>
                  <span className='ml-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                </p>
                {contractItems.map(item => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href)

                  return (
                    <Link key={item.href} href={item.href} passHref>
                      <Button
                        variant='ghost'
                        className={`group relative w-full justify-start rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                          isActive
                            ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/25 hover:shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white'
                        }`}
                        onClick={() => sidebarState.close()}
                      >
                        <div
                          className={`mr-3 rounded-lg p-2 transition-all duration-200 ${
                            isActive
                              ? 'bg-white/20 shadow-sm'
                              : 'bg-gray-100/60 group-hover:bg-gray-200/80 dark:bg-gray-800/60 dark:group-hover:bg-gray-700/80'
                          }`}
                        >
                          <item.icon className='h-4 w-4' />
                        </div>
                        <span className='font-medium'>{item.label}</span>
                        {isActive && (
                          <div className='absolute right-2 h-2 w-2 rounded-full bg-white/80' />
                        )}
                      </Button>
                    </Link>
                  )
                })}
              </div>

              {/* Platform Section */}
              <div className='mb-6'>
                <p className='mb-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400'>
                  <span className='mr-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                  <span className='px-2 tracking-wider uppercase'>
                    Platform
                  </span>
                  <span className='ml-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                </p>
                {platformItems.map(item => (
                  <Link key={item.href} href={item.href} passHref>
                    <Button
                      variant='ghost'
                      className={`group relative w-full justify-start rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                        pathname === item.href
                          ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/25 hover:shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white'
                      }`}
                      onClick={() => sidebarState.close()}
                    >
                      <div
                        className={`mr-3 rounded-lg p-2 transition-all duration-200 ${
                          pathname === item.href
                            ? 'bg-white/20 shadow-sm'
                            : 'bg-gray-100/60 group-hover:bg-gray-200/80 dark:bg-gray-800/60 dark:group-hover:bg-gray-700/80'
                        }`}
                      >
                        <item.icon className='h-4 w-4' />
                      </div>
                      <span className='font-medium'>{item.label}</span>
                      {pathname === item.href && (
                        <div className='absolute right-2 h-2 w-2 rounded-full bg-white/80' />
                      )}
                    </Button>
                  </Link>
                ))}
              </div>

              {/* Quick Stats */}
              <div className='border-t border-gray-200/60 pt-4 dark:border-gray-700/60'>
                <p className='mb-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400'>
                  <span className='mr-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                  <span className='px-2 tracking-wider uppercase'>
                    Quick Actions
                  </span>
                  <span className='ml-2 h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600' />
                </p>
                <Link href={appRoutes.dashboard.base} passHref>
                  <Button
                    variant='ghost'
                    className='group relative w-full justify-start rounded-xl p-3 text-gray-700 transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100/80 hover:text-gray-900 hover:shadow-md dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white'
                    onClick={() => sidebarState.close()}
                  >
                    <div className='mr-3 rounded-lg bg-gray-100/60 p-2 transition-all duration-200 group-hover:bg-gray-200/80 dark:bg-gray-800/60 dark:group-hover:bg-gray-700/80'>
                      <BarChart3 className='h-4 w-4' />
                    </div>
                    <span className='font-medium'>User Dashboard</span>
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className='flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/80 via-white/50 to-orange-50/40 dark:from-gray-900/80 dark:via-gray-900/60 dark:to-gray-800/40'>
          <div className='h-full p-6'>
            <AutoBreadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
