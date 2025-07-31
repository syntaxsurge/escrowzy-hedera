'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { EmailRequirementNotice } from '@/components/blocks/email-requirement-notice'
import { ChatLoading } from '@/components/chat/chat-loading'
import { MobileChatLayout } from '@/components/chat/mobile-chat-layout'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import { appRoutes } from '@/config/app-routes'
import { Team, User } from '@/lib/db/schema'

interface ChatLayoutWrapperProps {
  initialData: {
    user: {
      id: number
      email: string | null
      emailVerified: boolean
    } | null
    teams: (Team & { unreadCount?: number })[]
    directMessageUsers: (Pick<
      User,
      'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'
    > & {
      unreadCount?: number
    })[]
    trades?: {
      id: number
      buyerId: number
      sellerId: number
      amount: string
      currency: string
      status: string
      createdAt: Date
      otherParty: Pick<
        User,
        'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'
      >
      unreadCount?: number
    }[]
    emailStatus: {
      hasEmail: boolean
      isVerified: boolean
    }
  } | null
  children: React.ReactNode
}

export function ChatLayoutWrapper({
  initialData,
  children
}: ChatLayoutWrapperProps) {
  const router = useRouter()

  useEffect(() => {
    if (!initialData) {
      const timer = setTimeout(() => {
        router.refresh()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [initialData, router])

  if (!initialData) {
    return <ChatLoading />
  }

  if (!initialData.user) {
    router.push(appRoutes.signIn)
    return <ChatLoading />
  }

  if (
    !initialData.emailStatus.hasEmail ||
    !initialData.emailStatus.isVerified
  ) {
    const title = !initialData.emailStatus.hasEmail
      ? 'Email Required'
      : 'Email Verification Required'
    const message = !initialData.emailStatus.hasEmail
      ? 'Please add an email address to your account to access the chat feature.'
      : 'Please verify your email address to access the chat feature. Check your inbox for the verification email.'

    return (
      <ModernLayout
        title='Chat'
        description='Team and direct messaging'
        addPadding={true}
        centerText={true}
      >
        <ModernGrid columns={1}>
          <ModernSection>
            <EmailRequirementNotice title={title} message={message} />
          </ModernSection>
        </ModernGrid>
      </ModernLayout>
    )
  }

  return (
    <MobileChatLayout
      teams={initialData.teams}
      directMessageUsers={initialData.directMessageUsers}
      trades={initialData.trades}
      currentUserId={initialData.user.id}
    >
      {children}
    </MobileChatLayout>
  )
}
