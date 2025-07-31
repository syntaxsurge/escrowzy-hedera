import { NextRequest, NextResponse } from 'next/server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { uploadConstants } from '@/config/business-constants'
import { sendMessageAction } from '@/lib/actions/chat'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { trades, users, attachments } from '@/lib/db/schema'
import { uploadService } from '@/services/upload'
import type { TradeMetadata } from '@/types/trade'

const uploadSchema = z.object({
  uploadType: z.enum([
    'AVATARS',
    'PAYMENT_PROOFS',
    'DOMAIN_TRANSFER_PROOFS',
    'DISPUTE_EVIDENCE',
    'ATTACHMENTS'
  ] as const),
  context: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const uploadTypeRaw = formData.get('uploadType') as string
    const context = formData.get('context') as string | null
    const metadataRaw = formData.get('metadata') as string | null

    // Parse and validate upload parameters
    let metadata = {}
    try {
      if (metadataRaw) {
        metadata = JSON.parse(metadataRaw)
      }
    } catch {
      // Ignore metadata parsing errors
    }

    const validation = uploadSchema.safeParse({
      uploadType: uploadTypeRaw,
      context,
      metadata
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid upload parameters',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { uploadType } = validation.data

    // Get upload configuration for this type
    const config = uploadService.getUploadConfig(uploadType)

    // Build subpath based on upload type and context
    let subPath: string | undefined
    if (context) {
      switch (uploadType) {
        case 'AVATARS':
          subPath = `user-${user.id}`
          break
        case 'PAYMENT_PROOFS':
        case 'DOMAIN_TRANSFER_PROOFS':
        case 'DISPUTE_EVIDENCE':
          subPath = context // Usually trade ID
          break
        case 'ATTACHMENTS':
          subPath = `user-${user.id}/${context}`
          break
      }
    } else if (uploadType === 'AVATARS') {
      subPath = `user-${user.id}`
    }

    // Upload files using centralized service
    const result = await uploadService.uploadFiles(files, {
      uploadType,
      subPath,
      maxFileSize: config.maxFileSize,
      allowedTypes: config.allowedTypes,
      maxFiles: config.maxFiles
    })

    if (!result.success) {
      // Determine appropriate status code based on error
      let statusCode = 400
      if (result.error?.includes('storage is not configured')) {
        statusCode = 503 // Service Unavailable
      } else if (result.error?.includes('Network error')) {
        statusCode = 502 // Bad Gateway
      }

      return NextResponse.json(
        {
          error: result.error,
          details: result.details
        },
        { status: statusCode }
      )
    }

    // Handle specific upload type post-processing
    switch (uploadType) {
      case 'AVATARS':
        // Update user's avatar in database
        if (result.urls && result.urls[0]) {
          await db
            .update(users)
            .set({
              avatarPath: result.urls[0],
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id))
        }
        break

      case 'PAYMENT_PROOFS':
      case 'DOMAIN_TRANSFER_PROOFS':
        // Update trade metadata with payment/domain proof
        if (context && result.urls) {
          const tradeId = parseInt(context.replace('trade-', ''))

          // Get the trade
          const [trade] = await db
            .select()
            .from(trades)
            .where(eq(trades.id, tradeId))
            .limit(1)

          if (trade && trade.buyerId === user.id) {
            const currentMetadata = (trade.metadata as TradeMetadata) || {}
            const updatedMetadata: TradeMetadata = {
              ...currentMetadata,
              paymentProofImages: [
                ...(currentMetadata.paymentProofImages || []),
                ...result.urls
              ],
              paymentProofUploadedAt: new Date().toISOString()
            }

            await db
              .update(trades)
              .set({
                metadata: updatedMetadata,
                paymentSentAt: new Date()
              })
              .where(eq(trades.id, tradeId))

            // Send automatic message to trade chat
            try {
              const messageContent =
                uploadType === 'DOMAIN_TRANSFER_PROOFS'
                  ? `Domain transfer proof uploaded. ${files.length} screenshot(s) attached.`
                  : `Payment proof uploaded. ${files.length} screenshot(s) attached.`

              const attachmentsList = result.urls.map((url, index) => ({
                name: `proof-${index + 1}.jpg`,
                url,
                type: 'image/jpeg' as const,
                size: files[index].size
              }))

              await sendMessageAction(
                'trade' as any,
                `trade_${tradeId}`,
                messageContent,
                attachmentsList
              )
            } catch (error) {
              console.error('Failed to send automatic message:', error)
            }
          }
        }
        break

      case 'ATTACHMENTS':
        // Save attachment records for chat messages
        if (context && result.urls && result.details) {
          const messageId = parseInt(context.replace('message-', ''))

          for (let i = 0; i < result.urls.length; i++) {
            const url = result.urls[i]
            const details = result.details[i]

            await db.insert(attachments).values({
              messageId,
              userId: user.id,
              filename: details.originalName,
              mimeType: details.mimeType,
              path: url,
              size: details.size
            })
          }
        }
        break
    }

    // Return success response
    return NextResponse.json({
      success: true,
      urls: result.urls,
      files: result.details,
      message: `Successfully uploaded ${files.length} file(s)`
    })
  } catch (error: any) {
    console.error('Upload API error:', error)

    // Check for specific error types
    if (error.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json(
        {
          error:
            'File storage service is not configured. Please try again later.',
          details:
            process.env.NODE_ENV === 'development'
              ? 'BLOB_READ_WRITE_TOKEN is missing'
              : undefined
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to process upload',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve upload configuration
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uploadType = searchParams.get(
      'type'
    ) as keyof typeof uploadConstants.UPLOAD_TYPES

    if (!uploadType || !(uploadType in uploadConstants.UPLOAD_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    const config = uploadService.getUploadConfig(uploadType)

    return NextResponse.json({
      uploadType,
      config: {
        maxFileSize: config.maxFileSize,
        maxFileSizeMB: config.maxFileSize / (1024 * 1024),
        allowedTypes: config.allowedTypes,
        maxFiles: config.maxFiles
      }
    })
  } catch (error) {
    console.error('Get upload config error:', error)
    return NextResponse.json(
      { error: 'Failed to get upload configuration' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove uploaded files (avatar only for now)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uploadType = searchParams.get('type')

    if (uploadType === 'AVATARS') {
      // Remove avatar path from database
      await db
        .update(users)
        .set({
          avatarPath: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Delete not supported for this upload type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Delete upload error:', error)
    return NextResponse.json(
      { error: 'Failed to delete upload' },
      { status: 500 }
    )
  }
}
