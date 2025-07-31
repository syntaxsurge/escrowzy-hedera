import { Home, Shield, Mail } from 'lucide-react'

import { ErrorPage } from '@/components/blocks/error-page'
import Header from '@/components/layout/header'
import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'

export default function Forbidden() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900'>
      <Header />
      <ErrorPage
        statusCode='403'
        icon={Shield}
        title='Access Forbidden'
        description="You don't have permission to access this resource. This area is restricted to authorized personnel only."
        primaryAction={{
          label: 'Go to Dashboard',
          href: appRoutes.dashboard.base,
          icon: Home
        }}
        secondaryAction={{
          label: 'Contact Support',
          href: `mailto:${envPublic.NEXT_PUBLIC_ADMIN_EMAIL}`,
          icon: Mail
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
