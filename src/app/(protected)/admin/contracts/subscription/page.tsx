import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import { ModernLayout } from '@/components/layout/modern-layout'

import { SubscriptionManager } from './subscription-manager'

export default function SubscriptionManagerPage() {
  return (
    <ModernLayout
      title='Subscription Manager'
      description='Manage subscription plans and contract earnings'
    >
      <Suspense
        fallback={
          <div className='flex min-h-[400px] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        }
      >
        <SubscriptionManager />
      </Suspense>
    </ModernLayout>
  )
}
