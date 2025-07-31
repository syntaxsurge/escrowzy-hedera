'use server'

import { revalidatePath } from 'next/cache'

import { eq, and, desc, gt, sql, inArray, ne } from 'drizzle-orm'
import Pusher from 'pusher'

import { pusherChannels, pusherEvents } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { envServer } from '@/config/env.server'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { messages, messageReads, users, teamMembers } from '@/lib/db/schema'

const pusher =
  envServer.PUSHER_APP_ID &&
  envPublic.NEXT_PUBLIC_PUSHER_KEY &&
  envServer.PUSHER_SECRET &&
  envPublic.NEXT_PUBLIC_PUSHER_CLUSTER
    ? new Pusher({
        appId: envServer.PUSHER_APP_ID,
        key: envPublic.NEXT_PUBLIC_PUSHER_KEY,
        secret: envServer.PUSHER_SECRET,
        cluster: envPublic.NEXT_PUBLIC_PUSHER_CLUSTER,
        useTLS: true
      })
    : null

export interface MessageWithSender {
  id: number
  contextType: string
  contextId: string
  senderId: number
  content: string | null
  messageType: string
  metadata: unknown
  createdAt: Date
  editedAt: Date | null
  deletedAt: Date | null
  sender: {
    id: number
    name: string | null
    walletAddress: string
    email: string | null
    avatarPath: string | null
  }
}

export async function sendMessageAction(
  contextType: 'team' | 'direct' | 'trade',
  contextId: string,
  content: string,
  attachmentData?: Array<{
    name: string
    size: number
    type: string
    url: string
  }>
) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  let isNewConversation = false
  let otherUserId: number | null = null

  if (contextType === 'team') {
    const teamId = parseInt(contextId.replace('team_', ''), 10)
    if (isNaN(teamId)) throw new Error('Invalid team ID')

    const isMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
      )
      .limit(1)

    if (!isMember.length) throw new Error('Not a team member')
  }

  if (contextType === 'trade') {
    // Import trades table
    const { trades } = await import('@/lib/db/schema')

    const tradeId = parseInt(contextId.replace('trade_', ''), 10)
    if (isNaN(tradeId)) throw new Error('Invalid trade ID')

    const trade = await db
      .select()
      .from(trades)
      .where(eq(trades.id, tradeId))
      .limit(1)

    if (!trade.length) throw new Error('Trade not found')
    if (trade[0].buyerId !== user.id && trade[0].sellerId !== user.id) {
      throw new Error('Not a participant in this trade')
    }

    // Set the other user ID for notifications
    otherUserId =
      trade[0].buyerId === user.id ? trade[0].sellerId : trade[0].buyerId
  }

  if (contextType === 'direct') {
    const userIds = contextId
      .replace('dm_', '')
      .split('_')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
    if (!userIds.includes(user.id)) {
      throw new Error('Unauthorized')
    }

    // Check if this is the first message in this conversation
    const existingMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.contextType, contextType),
          eq(messages.contextId, contextId)
        )
      )
      .limit(1)

    isNewConversation = existingMessages.length === 0
    otherUserId = userIds.find(id => id !== user.id) || null
  }

  const [newMessage] = await db
    .insert(messages)
    .values({
      contextType,
      contextId,
      senderId: user.id,
      content,
      messageType:
        attachmentData && attachmentData.length > 0 ? 'mixed' : 'text',
      metadata:
        attachmentData && attachmentData.length > 0
          ? { attachments: attachmentData }
          : null
    })
    .returning()

  const messageWithSender = await db
    .select({
      id: messages.id,
      contextType: messages.contextType,
      contextId: messages.contextId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      sender: {
        id: users.id,
        name: users.name,
        walletAddress: users.walletAddress,
        email: users.email,
        avatarPath: users.avatarPath
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.id, newMessage.id))
    .limit(1)

  if (pusher) {
    // Send the new message event
    await pusher.trigger(
      pusherChannels.chat(contextType, contextId),
      pusherEvents.chat.messageNew,
      messageWithSender[0]
    )

    // If this is a new DM conversation, notify both users
    if (contextType === 'direct' && isNewConversation && otherUserId) {
      // Get the other user's details
      const [otherUser] = await db
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

      // Notify the sender about new conversation with the other user
      await pusher.trigger(
        pusherChannels.user(user.id),
        'new-dm-conversation',
        {
          user: otherUser
        }
      )

      // Notify the other user about new conversation with the sender
      await pusher.trigger(
        pusherChannels.user(otherUserId),
        'new-dm-conversation',
        {
          user: {
            id: user.id,
            name: user.name,
            walletAddress: user.walletAddress,
            email: user.email,
            avatarPath: user.avatarPath
          }
        }
      )
    }
  }

  revalidatePath(appRoutes.chat.base)
  return messageWithSender[0]
}

export async function getMessagesAction(
  contextType: 'team' | 'direct' | 'trade',
  contextId: string,
  options?: {
    limit?: number
    cursor?: number // Message ID to paginate from
    direction?: 'before' | 'after' // Load messages before or after cursor
  }
) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  const limit = options?.limit || 30
  const cursor = options?.cursor
  const direction = options?.direction || 'before'

  if (contextType === 'team') {
    const teamId = parseInt(contextId.replace('team_', ''), 10)
    if (isNaN(teamId)) throw new Error('Invalid team ID')

    const isMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
      )
      .limit(1)

    if (!isMember.length) throw new Error('Not a team member')
  }

  if (contextType === 'trade') {
    const { trades } = await import('@/lib/db/schema')

    const tradeId = parseInt(contextId.replace('trade_', ''), 10)
    if (isNaN(tradeId)) throw new Error('Invalid trade ID')

    const trade = await db
      .select()
      .from(trades)
      .where(eq(trades.id, tradeId))
      .limit(1)

    if (!trade.length) throw new Error('Trade not found')
    if (trade[0].buyerId !== user.id && trade[0].sellerId !== user.id) {
      throw new Error('Not a participant in this trade')
    }
  }

  if (contextType === 'direct') {
    const userIds = contextId
      .replace('dm_', '')
      .split('_')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
    if (!userIds.includes(user.id)) {
      throw new Error('Unauthorized')
    }
  }

  const conditions = [
    eq(messages.contextType, contextType),
    eq(messages.contextId, contextId)
  ]

  if (cursor) {
    if (direction === 'before') {
      conditions.push(sql`${messages.id} < ${cursor}`)
    } else {
      conditions.push(gt(messages.id, cursor))
    }
  }

  const query = db
    .select({
      id: messages.id,
      contextType: messages.contextType,
      contextId: messages.contextId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      sender: {
        id: users.id,
        name: users.name,
        walletAddress: users.walletAddress,
        email: users.email,
        avatarPath: users.avatarPath
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1) // Fetch one extra to check if there are more

  const result = await query

  const hasMore = result.length > limit
  const messageResults = hasMore ? result.slice(0, -1) : result

  return {
    messages: messageResults.reverse(),
    hasMore,
    nextCursor: hasMore ? messageResults[0]?.id : null
  }
}

export async function markMessagesAsReadAction(
  contextType: 'team' | 'direct' | 'trade',
  contextId: string,
  lastMessageId: number
) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  await db
    .insert(messageReads)
    .values({
      userId: user.id,
      contextType,
      contextId,
      lastReadMessageId: lastMessageId
    })
    .onConflictDoUpdate({
      target: [
        messageReads.userId,
        messageReads.contextType,
        messageReads.contextId
      ],
      set: {
        lastReadMessageId: lastMessageId,
        lastReadAt: sql`now()`
      }
    })

  revalidatePath(appRoutes.chat.base)
}

export async function getUnreadCountAction(
  contextType: 'team' | 'direct' | 'trade',
  contextId: string
) {
  const user = await getCurrentUserAction()
  if (!user) return 0

  try {
    const lastRead = await db
      .select()
      .from(messageReads)
      .where(
        and(
          eq(messageReads.userId, user.id),
          eq(messageReads.contextType, contextType),
          eq(messageReads.contextId, contextId)
        )
      )
      .limit(1)

    const unreadQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.contextType, contextType),
          eq(messages.contextId, contextId),
          ne(messages.senderId, user.id), // Don't count messages sent by current user
          lastRead[0]?.lastReadMessageId
            ? gt(messages.id, lastRead[0].lastReadMessageId)
            : sql`true` // If no messages read yet, count all messages not from current user
        )
      )

    const [result] = await unreadQuery
    return Number(result?.count || 0)
  } catch (error) {
    console.error('Error in getUnreadCountAction:', error)
    return 0
  }
}

export async function deleteMessageAction(messageId: number) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  const message = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message[0] || message[0].senderId !== user.id) {
    throw new Error('Unauthorized')
  }

  await db
    .update(messages)
    .set({ deletedAt: new Date() })
    .where(eq(messages.id, messageId))

  if (pusher) {
    await pusher.trigger(
      pusherChannels.chat(message[0].contextType, message[0].contextId),
      pusherEvents.chat.messageDeleted,
      { messageId }
    )
  }

  revalidatePath(appRoutes.chat.base)
}

export async function editMessageAction(messageId: number, newContent: string) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  const message = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message[0] || message[0].senderId !== user.id) {
    throw new Error('Unauthorized')
  }

  await db
    .update(messages)
    .set({
      content: newContent,
      editedAt: new Date()
    })
    .where(eq(messages.id, messageId))

  const updatedMessage = await db
    .select({
      id: messages.id,
      contextType: messages.contextType,
      contextId: messages.contextId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      sender: {
        id: users.id,
        name: users.name,
        walletAddress: users.walletAddress,
        email: users.email,
        avatarPath: users.avatarPath
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.id, messageId))
    .limit(1)

  if (pusher) {
    await pusher.trigger(
      pusherChannels.chat(message[0].contextType, message[0].contextId),
      pusherEvents.chat.messageEdited,
      updatedMessage[0]
    )
  }

  revalidatePath(appRoutes.chat.base)
  return updatedMessage[0]
}

export async function getDirectMessageUsersAction() {
  const user = await getCurrentUserAction()
  if (!user) return []

  try {
    // Get all direct message conversations where the current user is involved
    const dmConversations = await db
      .selectDistinct({
        contextId: messages.contextId,
        senderId: messages.senderId
      })
      .from(messages)
      .where(
        and(
          eq(messages.contextType, 'direct'),
          sql`${messages.contextId} LIKE ${'dm_%_' + user.id + '_%'} OR ${messages.contextId} LIKE ${'dm_%_' + user.id} OR ${messages.contextId} LIKE ${'dm_' + user.id + '_%'}`
        )
      )

    if (!dmConversations.length) return []

    // Extract unique user IDs from conversations
    const userIdsSet = new Set<number>()

    dmConversations.forEach(conv => {
      // Extract user IDs from contextId (format: dm_userId1_userId2)
      const userIds = conv.contextId
        .replace('dm_', '')
        .split('_')
        .map(id => {
          const parsed = parseInt(id, 10)
          return isNaN(parsed) ? null : parsed
        })
        .filter((id): id is number => id !== null && id !== user.id)

      userIds.forEach(id => userIdsSet.add(id))

      // Also add sender IDs that aren't the current user
      if (conv.senderId !== user.id) {
        userIdsSet.add(conv.senderId)
      }
    })

    const uniqueUserIds = Array.from(userIdsSet).filter(
      id => !isNaN(id) && id > 0
    )

    if (!uniqueUserIds.length) return []

    // Get user details for these IDs
    const usersWithConversations = await db
      .select({
        id: users.id,
        name: users.name,
        walletAddress: users.walletAddress,
        email: users.email,
        avatarPath: users.avatarPath
      })
      .from(users)
      .where(inArray(users.id, uniqueUserIds))
      .orderBy(users.name)

    return usersWithConversations || []
  } catch (error) {
    console.error('Error in getDirectMessageUsersAction:', error)
    return []
  }
}

export async function searchMessagesAction(
  contextType: 'team' | 'direct' | 'trade',
  contextId: string,
  searchQuery: string,
  options?: {
    limit?: number
    cursor?: number
  }
) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  const limit = options?.limit || 20
  const cursor = options?.cursor

  // Validate access
  if (contextType === 'team') {
    const teamId = parseInt(contextId.replace('team_', ''), 10)
    if (isNaN(teamId)) throw new Error('Invalid team ID')

    const isMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
      )
      .limit(1)

    if (!isMember.length) throw new Error('Not a team member')
  }

  if (contextType === 'trade') {
    const { trades } = await import('@/lib/db/schema')

    const tradeId = parseInt(contextId.replace('trade_', ''), 10)
    if (isNaN(tradeId)) throw new Error('Invalid trade ID')

    const trade = await db
      .select()
      .from(trades)
      .where(eq(trades.id, tradeId))
      .limit(1)

    if (!trade.length) throw new Error('Trade not found')
    if (trade[0].buyerId !== user.id && trade[0].sellerId !== user.id) {
      throw new Error('Not a participant in this trade')
    }
  }

  if (contextType === 'direct') {
    const userIds = contextId
      .replace('dm_', '')
      .split('_')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
    if (!userIds.includes(user.id)) {
      throw new Error('Unauthorized')
    }
  }

  const conditions = [
    eq(messages.contextType, contextType),
    eq(messages.contextId, contextId),
    sql`${messages.content} ILIKE ${`%${searchQuery}%`}`
  ]

  if (cursor) {
    conditions.push(sql`${messages.id} < ${cursor}`)
  }

  const query = db
    .select({
      id: messages.id,
      contextType: messages.contextType,
      contextId: messages.contextId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      sender: {
        id: users.id,
        name: users.name,
        walletAddress: users.walletAddress,
        email: users.email,
        avatarPath: users.avatarPath
      }
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1)

  const result = await query

  const hasMore = result.length > limit
  const searchResults = hasMore ? result.slice(0, -1) : result

  return {
    messages: searchResults,
    hasMore,
    nextCursor: hasMore ? searchResults[searchResults.length - 1]?.id : null,
    total: searchResults.length
  }
}
