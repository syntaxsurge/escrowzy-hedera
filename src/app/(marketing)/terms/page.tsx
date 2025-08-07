import { Metadata } from 'next'

import { MarkdownViewer } from '@/components/blocks/markdown-viewer'
import { envPublic } from '@/config/env.public'
import { getLegalDocumentByType } from '@/lib/db/queries/legal-documents'
import { formatDate } from '@/lib/utils/string'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Terms of Service | ${envPublic.NEXT_PUBLIC_APP_NAME}`,
  description: `Terms of Service for ${envPublic.NEXT_PUBLIC_APP_NAME}`
}

export default async function TermsPage() {
  const document = await getLegalDocumentByType('terms')

  if (!document) {
    return (
      <main className='container mx-auto max-w-4xl flex-1 px-4 py-16'>
        <h1 className='mb-8 text-4xl font-bold'>Terms of Service</h1>
        <p className='text-muted-foreground'>
          Terms of Service content is currently unavailable. Please try again
          later.
        </p>
      </main>
    )
  }

  return (
    <main className='container mx-auto max-w-4xl flex-1 px-4 py-16'>
      <h1 className='mb-8 text-4xl font-bold'>{document.title}</h1>

      <p className='text-muted-foreground mb-8 text-sm'>
        Last updated: {formatDate(document.lastUpdatedAt)}
      </p>

      <hr className='mb-8 border-t' />

      <MarkdownViewer content={document.content} />
    </main>
  )
}
