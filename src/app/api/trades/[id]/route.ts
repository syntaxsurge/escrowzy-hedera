import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { getTradeWithUsers } from '@/services/trade'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return apiResponses.unauthorized('Please sign in to view trade details')
    }

    // Parse trade ID
    const { id } = await context.params
    const tradeId = parseInt(id)
    if (isNaN(tradeId)) {
      return apiResponses.badRequest('Invalid trade ID')
    }

    // Get trade details with user information
    const trade = await getTradeWithUsers(tradeId)

    if (!trade) {
      return apiResponses.notFound('Trade')
    }

    // Check if the user is part of this trade
    const isParticipant =
      trade.buyerId === session.user.id || trade.sellerId === session.user.id

    if (!isParticipant) {
      return apiResponses.forbidden('You do not have access to this trade')
    }

    // Return trade details
    return apiResponses.success(trade)
  } catch (error) {
    console.error('Error fetching trade details:', error)
    return apiResponses.error('Failed to fetch trade details')
  }
}
