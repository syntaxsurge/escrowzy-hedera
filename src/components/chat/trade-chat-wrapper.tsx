'use client'

import { useState } from 'react'

import { TradeDetailsModal } from '@/components/blocks/trade-details-modal'
import { UnifiedChatLayout } from '@/components/chat/unified-chat-layout'
import type { MessageWithSender } from '@/lib/actions/chat'
import type { Trade, User } from '@/lib/db/schema'

interface TradeChatWrapperProps {
  trade: Trade
  buyer: Pick<User, 'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'>
  seller: Pick<User, 'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'>
  contextId: string
  initialMessages: MessageWithSender[]
  currentUserId: number
  currentUser: {
    id: number
    name: string | null
    walletAddress: string
    email: string | null
    avatarPath: string | null
  }
  displayName: string
  otherUser: Pick<
    User,
    'id' | 'name' | 'walletAddress' | 'email' | 'avatarPath'
  >
}

export function TradeChatWrapper({
  trade,
  buyer,
  seller,
  contextId,
  initialMessages,
  currentUserId,
  currentUser,
  displayName,
  otherUser
}: TradeChatWrapperProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const tradeWithUsers = {
    ...trade,
    buyer,
    seller
  }

  return (
    <>
      <UnifiedChatLayout
        contextType='trade'
        contextId={contextId}
        initialMessages={initialMessages}
        currentUserId={currentUserId}
        currentUser={currentUser}
        displayName={displayName}
        otherUser={otherUser}
        onInfoClick={() => setDetailsModalOpen(true)}
        infoTooltip='View trade details'
      />

      <TradeDetailsModal
        trade={tradeWithUsers as any}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        currentUserId={currentUserId}
      />
    </>
  )
}
