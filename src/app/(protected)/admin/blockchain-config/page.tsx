import { redirect } from 'next/navigation'

import { appRoutes } from '@/config/app-routes'
import { getUser } from '@/services/user'

import { BlockchainConfigManager } from './blockchain-config-manager'

export default async function BlockchainConfigPage() {
  const user = await getUser()

  if (!user || user.role !== 'admin') {
    redirect(appRoutes.notFound)
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold'>Blockchain Configuration</h1>
        <p className='text-muted-foreground mt-2'>
          Manage smart contract addresses and sync with blockchain configuration
        </p>
      </div>

      <BlockchainConfigManager />
    </div>
  )
}
