import { NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'

import { requireAdmin } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { adminSettings } from '@/lib/db/schema'

export async function GET(_request: Request) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const settings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.category, 'legal'))

    const documents = []
    const termsTitle = settings.find(s => s.key === 'terms_title')
    const termsContent = settings.find(s => s.key === 'terms_content')
    const privacyTitle = settings.find(s => s.key === 'privacy_title')
    const privacyContent = settings.find(s => s.key === 'privacy_content')

    if (termsTitle && termsContent) {
      documents.push({
        type: 'terms',
        title: termsTitle.value || 'Terms of Service',
        content: termsContent.value || '',
        lastUpdatedAt: termsContent.updatedAt
      })
    }

    if (privacyTitle && privacyContent) {
      documents.push({
        type: 'privacy',
        title: privacyTitle.value || 'Privacy Policy',
        content: privacyContent.value || '',
        lastUpdatedAt: privacyContent.updatedAt
      })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Failed to fetch legal documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch legal documents' },
      { status: 500 }
    )
  }
}
