import { NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { adminSettings } from '@/lib/db/schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params
    const validTypes = ['terms', 'privacy']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      )
    }

    const settings = await db
      .select()
      .from(adminSettings)
      .where(
        and(
          eq(adminSettings.category, 'legal'),
          eq(adminSettings.key, `${type}_title`)
        )
      )
      .union(
        db
          .select()
          .from(adminSettings)
          .where(
            and(
              eq(adminSettings.category, 'legal'),
              eq(adminSettings.key, `${type}_content`)
            )
          )
      )

    const titleSetting = settings.find(s => s.key === `${type}_title`)
    const contentSetting = settings.find(s => s.key === `${type}_content`)

    if (!titleSetting || !contentSetting) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      title: titleSetting.value || '',
      content: contentSetting.value || '',
      lastUpdatedAt: contentSetting.updatedAt
    })
  } catch (error) {
    console.error('Failed to fetch legal document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}
