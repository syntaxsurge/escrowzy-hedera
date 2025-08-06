import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '../drizzle'
import { adminSettings } from '../schema'

export async function getLegalDocumentByType(type: 'terms' | 'privacy') {
  try {
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
      .union(
        db
          .select()
          .from(adminSettings)
          .where(
            and(
              eq(adminSettings.category, 'legal'),
              eq(adminSettings.key, `${type}_updated_at`)
            )
          )
      )

    const titleSetting = settings.find(s => s.key === `${type}_title`)
    const contentSetting = settings.find(s => s.key === `${type}_content`)
    const updatedAtSetting = settings.find(s => s.key === `${type}_updated_at`)

    if (!titleSetting || !contentSetting) {
      return null
    }

    return {
      title: titleSetting.value || '',
      content: contentSetting.value || '',
      lastUpdatedAt: updatedAtSetting?.value || contentSetting.updatedAt
    }
  } catch (error) {
    console.error('Failed to fetch legal document:', error)
    return null
  }
}
