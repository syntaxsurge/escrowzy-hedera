import { Suspense } from 'react'

import { Loader2 } from 'lucide-react'

import { ModernLayout } from '@/components/layout/modern-layout'

import { AchievementNFTManager } from './achievement-nft-manager'

export default function AchievementNFTManagerPage() {
  return (
    <ModernLayout
      title='Achievement NFT Manager'
      description='Manage achievement NFTs, minting, and metadata'
    >
      <Suspense
        fallback={
          <div className='flex min-h-[400px] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        }
      >
        <AchievementNFTManager />
      </Suspense>
    </ModernLayout>
  )
}
