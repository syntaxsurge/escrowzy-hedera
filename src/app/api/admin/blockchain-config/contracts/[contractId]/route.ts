import { NextResponse } from 'next/server'
import { getUser } from '@/services/user'
import { db } from '@/lib/db/drizzle'
import { platformContracts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const user = await getUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const contractId = parseInt(resolvedParams.contractId)
    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: 'Invalid contract ID' },
        { status: 400 }
      )
    }

    const { contractAddress, isActive } = await request.json()

    // Validate contract address format
    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      )
    }

    // Update the contract
    const result = await db
      .update(platformContracts)
      .set({
        contractAddress,
        isActive: isActive ?? true
      })
      .where(eq(platformContracts.id, contractId))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      contract: result[0]
    })
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}
