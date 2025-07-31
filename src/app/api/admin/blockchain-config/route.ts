import { NextResponse } from 'next/server'

import { blockchainConfig } from '@/config/blockchain-config.generated'
import { db } from '@/lib/db/drizzle'
import { platformContracts } from '@/lib/db/schema'
import { getUser } from '@/services/user'

export async function GET() {
  try {
    const user = await getUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all contracts from database
    const contracts = await db
      .select()
      .from(platformContracts)
      .orderBy(platformContracts.chainId, platformContracts.contractType)

    return NextResponse.json({
      contracts,
      config: blockchainConfig
    })
  } catch (error) {
    console.error('Error fetching blockchain config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blockchain configuration' },
      { status: 500 }
    )
  }
}
