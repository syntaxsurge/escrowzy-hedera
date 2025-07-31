import { redirect } from 'next/navigation'

import { eq } from 'drizzle-orm'

import { UnifiedChatLayout } from '@/components/chat/unified-chat-layout'
import { appRoutes } from '@/config/app-routes'
import { getMessagesAction } from '@/lib/actions/chat'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getUserDisplayName } from '@/lib/utils/user'

export const dynamic = 'force-dynamic'

interface DirectChatPageProps {
  params: Promise<{
    contextId: string
  }>
}

export default async function DirectChatPage({ params }: DirectChatPageProps) {
  const user = await getCurrentUserAction()
  if (!user) {
    redirect(appRoutes.signIn)
  }

  const { contextId: paramContextId } = await params
  const contextId = `dm_${paramContextId}`
  const userIds = paramContextId.split('_').map(Number)

  if (!userIds.includes(user.id)) {
    redirect(appRoutes.chat.base)
  }

  // Get the other user's information
  const otherUserId = userIds.find(id => id !== user.id)
  const otherUserData = otherUserId
    ? await db
        .select({
          id: users.id,
          name: users.name,
          walletAddress: users.walletAddress,
          email: users.email,
          avatarPath: users.avatarPath
        })
        .from(users)
        .where(eq(users.id, otherUserId))
        .limit(1)
    : []

  const otherUser = otherUserData[0]
  const displayName = otherUser
    ? getUserDisplayName(otherUser)
    : 'Direct Message'

  const result = await getMessagesAction('direct', contextId, { limit: 30 })

  return (
    <UnifiedChatLayout
      contextType='direct'
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
      otherUser={otherUser || undefined}
    />
  )
}
