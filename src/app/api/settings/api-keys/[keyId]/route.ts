import { NextRequest, NextResponse } from 'next/server'

import { revokeApiKey, getApiKeyUsageStats } from '@/services/api-keys'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const params = await context.params
    const keyId = parseInt(params.keyId)
    if (isNaN(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 })
    }

    const stats = await getApiKeyUsageStats(keyId)
    return NextResponse.json({ stats })
  } catch (error: any) {
    if (error.message?.includes('not authenticated')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API key stats' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const params = await context.params
    const keyId = parseInt(params.keyId)
    if (isNaN(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 })
    }

    await revokeApiKey(keyId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message?.includes('not authenticated')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to revoke API key' },
      { status: 400 }
    )
  }
}
