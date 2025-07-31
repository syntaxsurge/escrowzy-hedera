'use client'

import { ClientOnly } from '@/components/client-only'
import { Footer } from '@/components/layout/footer'
import Header from '@/components/layout/header'

export default function PublicLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClientOnly>
      <div className='bg-background text-foreground flex min-h-screen flex-col'>
        <Header />
        <div className='flex-1'>{children}</div>
        <Footer />
      </div>
    </ClientOnly>
  )
}
