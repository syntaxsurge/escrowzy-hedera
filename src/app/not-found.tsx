import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

import { ErrorPage } from '@/components/blocks/error-page'
import Header from '@/components/layout/header'
import { appRoutes } from '@/config/app-routes'

export default function NotFound() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900'>
      <Header />
      <ErrorPage
        statusCode='404'
        icon={FileQuestion}
        title='Page not found'
        description="The page you're looking for doesn't exist or has been moved. Don't worry, you can find plenty of other things on our homepage."
        primaryAction={{
          label: 'Go to Dashboard',
          href: appRoutes.dashboard.base,
          icon: Home
        }}
        secondaryAction={{
          label: 'Back to Homepage',
          href: appRoutes.home,
          icon: ArrowLeft
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
