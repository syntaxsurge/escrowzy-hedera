'use client'

import { useEffect } from 'react'

import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

import { ErrorPage } from '@/components/blocks/error-page'
import Header from '@/components/layout/header'
import { appRoutes } from '@/config/app-routes'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900'>
      <Header />
      <ErrorPage
        statusCode='500'
        icon={AlertTriangle}
        title='Something went wrong!'
        description='An unexpected error occurred while processing your request. Our team has been notified and is working to fix the issue.'
        primaryAction={{
          label: 'Try Again',
          onClick: reset,
          icon: RotateCcw
        }}
        secondaryAction={{
          label: 'Go Home',
          href: appRoutes.home,
          icon: Home
        }}
        gradientColors={{
          blur: 'bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 dark:from-purple-600 dark:via-indigo-600 dark:to-blue-600',
          text: 'bg-gradient-to-r from-purple-500 to-blue-500',
          button: 'bg-gradient-to-r from-purple-500 to-blue-500',
          buttonHover: 'hover:from-purple-600 hover:to-blue-600',
          iconBg: 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'
        }}
      />
    </div>
  )
}
