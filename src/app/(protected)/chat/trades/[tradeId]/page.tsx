import { redirect } from 'next/navigation'

import { eq } from 'drizzle-orm'

import { TradeChatWrapper } from '@/components/chat/trade-chat-wrapper'
import { appRoutes } from '@/config/app-routes'
import { getMessagesAction } from '@/lib/actions/chat'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { trades, users } from '@/lib/db/schema'
import { getUserDisplayName } from '@/lib/utils/user'

export const dynamic = 'force-dynamic'

interface TradeChatPageProps {
  params: Promise<{
    tradeId: string
  }>
}

export default async function TradeChatPage({ params }: TradeChatPageProps) {
  const user = await getCurrentUserAction()
  if (!user) {
    redirect(appRoutes.signIn)
  }

  const { tradeId: tradeIdParam } = await params
  const tradeId = parseInt(tradeIdParam)
  const contextId = `trade_${tradeId}`

  // Get trade details with buyer and seller info
  const tradeData = await db
    .select({
      trade: trades,
      buyer: {
        id: users.id,
        name: users.name,
        walletAddress: users.walletAddress,
        email: users.email,
        avatarPath: users.avatarPath
      }
    })
    .from(trades)
    .leftJoin(users, eq(users.id, trades.buyerId))
    .where(eq(trades.id, tradeId))
    .limit(1)

  if (!tradeData.length) {
    redirect(appRoutes.trades.active)
  }

  const trade = tradeData[0].trade
  const buyer = tradeData[0].buyer

  // Get seller info separately
  const sellerData = await db
    .select({
      id: users.id,
      name: users.name,
      walletAddress: users.walletAddress,
      email: users.email,
      avatarPath: users.avatarPath
    })
    .from(users)
    .where(eq(users.id, trade.sellerId))
    .limit(1)

  const seller = sellerData[0]

  // Check if user is part of the trade
  const isParticipant = trade.buyerId === user.id || trade.sellerId === user.id
  if (!isParticipant) {
    redirect(appRoutes.trades.active)
  }

  const otherParty = trade.buyerId === user.id ? seller : buyer!
  const displayName = `Trade #${trade.id} - ${getUserDisplayName(otherParty || {})}`

  // Get messages for this trade chat
  const result = await getMessagesAction('trade', contextId, { limit: 30 })

  return (
    <TradeChatWrapper
      trade={trade}
      buyer={buyer!}
      seller={seller}
      contextId={contextId}
      initialMessages={result.messages}
      currentUserId={user.id}
      currentUser={{
        id: user.id,
        name: user.name,
        walletAddress: user.walletAddress,
        email: user.email,
        avatarPath: user.avatarPath
      }}
      displayName={displayName}
      otherUser={otherParty!}
    />
  )
}
