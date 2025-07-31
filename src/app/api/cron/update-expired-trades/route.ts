import { NextResponse } from 'next/server'

import { and, eq, lt } from 'drizzle-orm'

import { envServer } from '@/config/env.server'
import { db } from '@/lib/db/drizzle'
import { trades } from '@/lib/db/schema'
import { TRADE_STATUS } from '@/types/listings'

export async function GET(request: Request) {
  try {
    // Check for cron secret to ensure this is called by the cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = envServer.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all trades that have expired deposit deadlines
    const expiredTrades = await db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.status, TRADE_STATUS.AWAITING_DEPOSIT),
          lt(trades.depositDeadline, now)
        )
      )

    if (expiredTrades.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired trades found',
        count: 0
      })
    }

    // Update all expired trades to cancelled status
    const tradeIds = expiredTrades.map(trade => trade.id)

    // Update all expired trades to cancelled status
    for (const trade of expiredTrades) {
      const currentMetadata = trade.metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        cancellationReason: 'Payment window expired'
      }

      await db
        .update(trades)
        .set({
          status: TRADE_STATUS.CANCELLED,
          metadata: updatedMetadata
        })
        .where(eq(trades.id, trade.id))
    }

    // Log the cancellations
    console.log(`Cancelled ${expiredTrades.length} expired trades:`, tradeIds)

    // TODO: Send notifications to affected users
    // This would involve querying users and sending them notifications
    // about their cancelled trades

    return NextResponse.json({
      success: true,
      message: `Cancelled ${expiredTrades.length} expired trades`,
      count: expiredTrades.length,
      tradeIds
    })
  } catch (error) {
    console.error('Error updating expired trades:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update expired trades'
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility in cron services
export async function POST(request: Request) {
  return GET(request)
}
