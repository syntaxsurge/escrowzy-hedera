import { NextRequest, NextResponse } from 'next/server'

import { createApiKey, getApiKeys } from '@/services/api-keys'

export async function GET() {
  try {
    const keys = await getApiKeys()
    return NextResponse.json({ keys })
  } catch (error: any) {
    if (error.message?.includes('not authenticated')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API keys' },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, expiresIn } = body

    if (!name) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      )
    }

    const key = await createApiKey({ name, expiresIn })
    return NextResponse.json({ key })
  } catch (error: any) {
    if (error.message?.includes('not authenticated')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error.message?.includes('Enterprise plan')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 400 }
    )
  }
}
