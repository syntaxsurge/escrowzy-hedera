'use client'

import { Footer } from '@/components/layout/footer'
import Header from '@/components/layout/header'

export default function InviteLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <section className='bg-background text-foreground flex min-h-screen flex-col'>
      <Header />
      <main className='flex-1'>{children}</main>
      <Footer />
    </section>
  )
}
