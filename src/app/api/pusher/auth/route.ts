import { NextRequest } from 'next/server'

import { eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { pusherServer } from '@/lib/pusher-server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return apiResponses.unauthorized('Authentication required')
    }

    // Check if Pusher is configured
    if (!pusherServer) {
      return apiResponses.error('Pusher is not configured')
    }

    // Get the socket_id and channel_name from the request
    const formData = await request.formData()
    const socketId = formData.get('socket_id') as string
    const channelName = formData.get('channel_name') as string

    if (!socketId || !channelName) {
      return apiResponses.badRequest('Missing socket_id or channel_name')
    }

    // Validate channel access based on channel type
    if (channelName.startsWith('presence-')) {
      // Get user data from database for presence channels
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)

      if (!user) {
        return apiResponses.unauthorized('User not found')
      }

      // Presence channels - authenticate with user data
      const presenceData = {
        user_id: session.user.id.toString(),
        user_info: {
          name: user.name || user.email || session.user.walletAddress,
          email: user.email,
          avatar: user.avatarPath,
          walletAddress: session.user.walletAddress
        }
      }

      const authResponse = pusherServer.authorizeChannel(
        socketId,
        channelName,
        presenceData
      )

      return new Response(JSON.stringify(authResponse), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else if (channelName.startsWith('private-')) {
      // Private channels - just authenticate
      const authResponse = pusherServer.authorizeChannel(socketId, channelName)

      return new Response(JSON.stringify(authResponse), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      // Public channels don't need authentication
      return apiResponses.badRequest('Channel does not require authentication')
    }
  } catch (error) {
    console.error('Pusher auth error:', error)
    return apiResponses.error('Failed to authenticate channel')
  }
}
