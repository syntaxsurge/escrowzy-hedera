import { NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'
import { ZERO_ADDRESS } from 'thirdweb'

import { db } from '@/lib/db/drizzle'
import { platformContracts } from '@/lib/db/schema'
import { getUser } from '@/services/user'

export async function POST(request: Request) {
  try {
    const user = await getUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { config } = await request.json()

    if (!config || !config.chains) {
      return NextResponse.json(
        { error: 'Invalid configuration data' },
        { status: 400 }
      )
    }

    let syncedCount = 0
    const contractTypes = [
      'subscriptionManager',
      'escrowCore',
      'achievementNFT'
    ]

    // Iterate through all chains in the config
    for (const [, chain] of Object.entries(config.chains)) {
      const chainData = chain as any

      // For each contract type, create or update the database entry
      for (const contractType of contractTypes) {
        const contractAddress =
          chainData.contractAddresses?.[contractType] || ZERO_ADDRESS

        // Convert camelCase to UPPER_SNAKE_CASE for database
        const dbContractType = contractType
          .replace(/([A-Z])/g, '_$1')
          .toUpperCase()
          .replace(/^_/, '')

        // Check if contract already exists
        const existing = await db
          .select()
          .from(platformContracts)
          .where(
            and(
              eq(platformContracts.chainId, chainData.chainId),
              eq(platformContracts.contractType, dbContractType)
            )
          )
          .limit(1)

        if (existing.length > 0) {
          // Update existing contract if address is different or if it's not a zero address
          if (contractAddress !== ZERO_ADDRESS) {
            await db
              .update(platformContracts)
              .set({
                contractAddress,
                chainName: chainData.name,
                isActive: true
              })
              .where(
                and(
                  eq(platformContracts.chainId, chainData.chainId),
                  eq(platformContracts.contractType, dbContractType)
                )
              )
            syncedCount++
          }
        } else {
          // Insert new contract
          await db.insert(platformContracts).values({
            chainId: chainData.chainId,
            chainName: chainData.name,
            contractType: dbContractType,
            contractAddress,
            isActive: contractAddress !== ZERO_ADDRESS
          })
          syncedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Successfully synced ${syncedCount} contract configurations`
    })
  } catch (error) {
    console.error('Error syncing blockchain config:', error)
    return NextResponse.json(
      { error: 'Failed to sync blockchain configuration' },
      { status: 500 }
    )
  }
}
