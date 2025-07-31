import { NextResponse } from 'next/server'

import { ZERO_ADDRESS } from 'thirdweb'

import { authenticateAdminRequest } from '@/lib/auth/admin'

export async function GET(request: Request) {
  try {
    const authResult = await authenticateAdminRequest(request)
    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get contract settings from environment or defaults
    const contractSettings = {
      baseUri: 'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/',
      isPaused: false, // This would come from contract state in production
      owner: authResult.user?.walletAddress || ZERO_ADDRESS
    }

    return NextResponse.json(contractSettings)
  } catch (error) {
    console.error('Error fetching contract settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract settings' },
      { status: 500 }
    )
  }
}
