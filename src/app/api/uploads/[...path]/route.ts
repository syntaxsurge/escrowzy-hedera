import { promises as fs } from 'fs'
import path from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { eq, and } from 'drizzle-orm'
import { lookup } from 'mime-types'

import { uploadConstants } from '@/config/business-constants'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import {
  attachments,
  messages,
  teamMembers,
  users,
  trades
} from '@/lib/db/schema'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { path: pathArray } = await params
    const filePath = pathArray.join('/')

    // Note: When using Vercel Blob storage, files are served directly from the Blob URL
    // This route is only used for local filesystem storage
    const fullPath = path.join(process.cwd(), 'uploads', filePath)

    // Check if this is an avatar request
    if (filePath.startsWith(`${uploadConstants.UPLOAD_TYPES.AVATARS}/`)) {
      // For avatars, check if the user has access to view this avatar
      const avatarUser = await db
        .select()
        .from(users)
        .where(eq(users.avatarPath, filePath))
        .limit(1)

      if (!avatarUser[0]) {
        return new NextResponse('Not found', { status: 404 })
      }

      // For now, all authenticated users can view avatars
      // You can add more restrictive permissions here if needed
    } else if (
      filePath.startsWith(`${uploadConstants.UPLOAD_TYPES.PAYMENT_PROOFS}/`)
    ) {
      // For payment proofs, check if user is part of the trade
      const tradeIdMatch = filePath.match(/trade-(\d+)/)
      if (tradeIdMatch) {
        const tradeId = parseInt(tradeIdMatch[1])
        const [trade] = await db
          .select()
          .from(trades)
          .where(eq(trades.id, tradeId))
          .limit(1)

        if (!trade) {
          return new NextResponse('Not found', { status: 404 })
        }

        // Check if user is buyer or seller
        if (trade.buyerId !== user.id && trade.sellerId !== user.id) {
          return new NextResponse('Forbidden', { status: 403 })
        }
      } else {
        return new NextResponse('Invalid payment proof path', { status: 400 })
      }
    } else {
      // Handle attachment requests
      const attachment = await db
        .select({
          attachment: attachments,
          message: messages
        })
        .from(attachments)
        .innerJoin(messages, eq(attachments.messageId, messages.id))
        .where(eq(attachments.path, filePath))
        .limit(1)

      if (!attachment[0]) {
        return new NextResponse('Not found', { status: 404 })
      }

      const { message } = attachment[0]

      let hasAccess = false

      if (message.contextType === 'direct') {
        const userIds = message.contextId
          .replace('dm_', '')
          .split('_')
          .map(Number)
        hasAccess = userIds.includes(user.id)
      } else if (message.contextType === 'team') {
        const teamId = parseInt(message.contextId.replace('team_', ''))
        const isMember = await db
          .select()
          .from(teamMembers)
          .where(
            and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
          )
          .limit(1)
        hasAccess = isMember.length > 0
      }

      if (!hasAccess) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    try {
      const data = await fs.readFile(fullPath)
      const ext = path.extname(fullPath).slice(1)
      const mimeType = lookup(ext) || 'application/octet-stream'

      let filename = path.basename(fullPath)

      // If this is an attachment (not avatar), get the original filename
      if (!filePath.startsWith(`${uploadConstants.UPLOAD_TYPES.AVATARS}/`)) {
        const attachment = await db
          .select()
          .from(attachments)
          .where(eq(attachments.path, filePath))
          .limit(1)

        if (attachment[0]) {
          filename = attachment[0].filename
        }
      }

      // Convert Buffer to Uint8Array for NextResponse
      return new NextResponse(new Uint8Array(data), {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'private, max-age=3600'
        }
      })
    } catch (error) {
      console.error('File read error:', error)
      return new NextResponse('File not found', { status: 404 })
    }
  } catch (error) {
    console.error('File serving error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
