import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import { ModernLayout } from '@/components/layout/modern-layout'

import { EscrowManager } from './escrow-manager'

export default function EscrowManagerPage() {
  return (
    <ModernLayout
      title='Escrow Core Manager'
      description='Manage escrow contracts, disputes, and fee withdrawals'
    >
      <Suspense
        fallback={
          <div className='flex min-h-[400px] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        }
      >
        <EscrowManager />
      </Suspense>
    </ModernLayout>
  )
}
