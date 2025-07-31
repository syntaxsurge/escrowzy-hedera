import { Metadata } from 'next'

import { MarkdownViewer } from '@/components/blocks/markdown-viewer'
import { Footer } from '@/components/layout/footer'
import Header from '@/components/layout/header'
import { apiEndpoints } from '@/config/api-endpoints'
import { envPublic } from '@/config/env.public'
import { formatDate } from '@/lib'
import { serverFetch } from '@/lib/api/server-utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Terms of Service | ${envPublic.NEXT_PUBLIC_APP_NAME}`,
  description: `Terms of Service for ${envPublic.NEXT_PUBLIC_APP_NAME}`
}

async function getTermsContent() {
  try {
    return await serverFetch(apiEndpoints.legalDocuments.byType('terms'), {
      cache: 'no-store'
    })
  } catch (error) {
    console.error('Failed to fetch terms:', error)
    return null
  }
}

export default async function TermsPage() {
  const document = await getTermsContent()

  if (!document) {
    return (
      <div className='flex min-h-screen flex-col'>
        <Header />
        <main className='container mx-auto max-w-4xl flex-1 px-4 py-16'>
          <h1 className='mb-8 text-4xl font-bold'>Terms of Service</h1>
          <p className='text-muted-foreground'>
            Terms of Service content is currently unavailable. Please try again
            later.
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className='flex min-h-screen flex-col'>
      <Header />
      <main className='container mx-auto max-w-4xl flex-1 px-4 py-16'>
        <h1 className='mb-8 text-4xl font-bold'>{document.title}</h1>

        <p className='text-muted-foreground mb-8 text-sm'>
          Last updated: {formatDate(document.lastUpdatedAt)}
        </p>

        <hr className='mb-8 border-t' />

        <MarkdownViewer content={document.content} />
      </main>
      <Footer />
    </div>
  )
}
