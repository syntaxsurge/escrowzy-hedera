'use client'

import { useEffect } from 'react'

import { localStorageKeys } from '@/config/api-endpoints'

export function SystemHealthLoading({
  message = 'Checking system status...'
}: {
  message?: string
}) {
  useEffect(() => {
    // Apply theme class immediately
    const theme = localStorage.getItem(localStorageKeys.theme) || 'system'
    if (
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-black dark:to-gray-950'>
      <div className='relative'>
        {/* Background glow effect */}
        <div className='absolute -inset-20 opacity-20'>
          <div className='h-full w-full bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 blur-3xl dark:from-blue-600 dark:via-violet-600 dark:to-purple-600' />
        </div>

        {/* Content container */}
        <div className='relative rounded-2xl bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-gray-900/80'>
          {/* Modern spinner with gradient */}
          <div className='relative mx-auto mb-6 h-12 w-12'>
            <div className='absolute inset-0 animate-spin rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 p-[2px]'>
              <div className='h-full w-full rounded-full bg-white dark:bg-gray-900' />
            </div>
            <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 blur-lg' />
          </div>

          {/* Status text with better contrast */}
          <p className='text-base font-medium text-gray-800 dark:text-gray-200'>
            {message}
          </p>

          {/* Loading dots animation */}
          <div className='mt-3 flex justify-center gap-1'>
            <span
              className='h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 dark:bg-blue-400'
              style={{ animationDelay: '0ms' }}
            />
            <span
              className='h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 dark:bg-violet-400'
              style={{ animationDelay: '150ms' }}
            />
            <span
              className='h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 dark:bg-purple-400'
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
