import { NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'

import { requireAdmin } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { adminSettings } from '@/lib/db/schema'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { user, error } = await requireAdmin()
    if (error) return error

    const { title, content } = await request.json()
    const { type } = await params

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const validTypes = ['terms', 'privacy']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      )
    }

    const updates = [
      {
        category: 'legal',
        key: `${type}_title`,
        value: title,
        updatedByUserId: user.id,
        updatedAt: new Date()
      },
      {
        category: 'legal',
        key: `${type}_content`,
        value: content,
        updatedByUserId: user.id,
        updatedAt: new Date()
      }
    ]

    for (const update of updates) {
      const existing = await db
        .select()
        .from(adminSettings)
        .where(
          and(
            eq(adminSettings.category, update.category),
            eq(adminSettings.key, update.key)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(adminSettings)
          .set({
            value: update.value,
            updatedByUserId: update.updatedByUserId,
            updatedAt: update.updatedAt
          })
          .where(
            and(
              eq(adminSettings.category, update.category),
              eq(adminSettings.key, update.key)
            )
          )
      } else {
        await db.insert(adminSettings).values(update)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update legal document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}
