'use client'

import { usePathname, useRouter } from 'next/navigation'

import { Crown } from 'lucide-react'

import { navigationProgress } from '@/components/providers/navigation-progress'
import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'

interface AdminNavProps {
  isAdmin: boolean
}

export function AdminNav({ isAdmin }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  if (!isAdmin) {
    return null
  }

  // Check if we're on any admin page
  const isAdminPage = pathname.startsWith(appRoutes.admin.base)

  return (
    <Button
      variant='ghost'
      className={`group relative w-full justify-start rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
        isAdminPage
          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-lg'
          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-white'
      }`}
      onClick={() => {
        navigationProgress.start()
        router.push(appRoutes.admin.base)
      }}
    >
      <div
        className={`mr-3 rounded-lg p-2 transition-all duration-200 ${
          isAdminPage
            ? 'bg-white/20 shadow-sm'
            : 'bg-gray-100/60 group-hover:bg-gray-200/80 dark:bg-gray-800/60 dark:group-hover:bg-gray-700/80'
        }`}
      >
        <Crown className='h-4 w-4' />
      </div>
      <span className='font-medium'>Admin Panel</span>
      {isAdminPage && (
        <div className='absolute right-2 h-2 w-2 rounded-full bg-white/80' />
      )}
    </Button>
  )
}
