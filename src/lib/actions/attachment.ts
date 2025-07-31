'use server'

import { eq } from 'drizzle-orm'

import { pusherChannels, pusherEvents } from '@/config/api-endpoints'
import { envPublic } from '@/config/env.public'
import { envServer } from '@/config/env.server'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { attachments, messages } from '@/lib/db/schema'
import { uploadService } from '@/services/upload'

export async function uploadAttachmentsAction(
  messageId: number,
  formData: FormData
) {
  const user = await getCurrentUserAction()
  if (!user) throw new Error('Unauthorized')

  const files = formData.getAll('files') as File[]
  if (!files || files.length === 0) {
    throw new Error('No files provided')
  }

  const message = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message[0] || message[0].senderId !== user.id) {
    throw new Error('Unauthorized')
  }

  // Use centralized upload service
  const uploadResult = await uploadService.uploadFiles(files, {
    uploadType: 'ATTACHMENTS',
    subPath: `message-${messageId}`
  })

  if (!uploadResult.success) {
    throw new Error(uploadResult.error || 'Failed to upload attachments')
  }

  const uploadedFiles: Array<{
    id: number
    filename: string
    mimeType: string
    size: number
    url: string
    name: string
    type: string
  }> = []

  // Save attachment records
  for (let i = 0; i < uploadResult.urls!.length; i++) {
    const fileDetail = uploadResult.details![i]

    const [attachment] = await db
      .insert(attachments)
      .values({
        messageId: messageId,
        userId: user.id,
        filename: fileDetail.originalName,
        mimeType: fileDetail.mimeType,
        path: uploadResult.urls![i],
        size: fileDetail.size
      })
      .returning()

    uploadedFiles.push({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: uploadResult.urls![i],
      name: attachment.filename,
      type: attachment.mimeType
    })
  }

  await db
    .update(messages)
    .set({
      metadata: { attachments: uploadedFiles },
      messageType: 'mixed'
    })
    .where(eq(messages.id, messageId))

  // Send real-time update via Pusher
  const updatedMessage = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (updatedMessage[0]) {
    const pusher =
      envServer.PUSHER_APP_ID &&
      envPublic.NEXT_PUBLIC_PUSHER_KEY &&
      envServer.PUSHER_SECRET &&
      envPublic.NEXT_PUBLIC_PUSHER_CLUSTER
        ? new (await import('pusher')).default({
            appId: envServer.PUSHER_APP_ID,
            key: envPublic.NEXT_PUBLIC_PUSHER_KEY,
            secret: envServer.PUSHER_SECRET,
            cluster: envPublic.NEXT_PUBLIC_PUSHER_CLUSTER,
            useTLS: true
          })
        : null

    if (pusher) {
      await pusher.trigger(
        pusherChannels.chat(
          updatedMessage[0].contextType,
          updatedMessage[0].contextId
        ),
        pusherEvents.chat.messageEdited,
        {
          ...updatedMessage[0],
          sender: {
            id: user.id,
            name: user.name,
            walletAddress: user.walletAddress,
            email: user.email
          }
        }
      )
    }
  }

  return uploadedFiles
}
