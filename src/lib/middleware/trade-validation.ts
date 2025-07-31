import { eq, or, and, inArray, count } from 'drizzle-orm'

import { db } from '@/lib/db/drizzle'
import { trades } from '@/lib/db/schema'
import type { TradeStatus } from '@/types/listings'
import { canPerformAction } from '@/types/trade'

export interface TradeValidationResult {
  isValid: boolean
  trade?: typeof trades.$inferSelect
  error?: string
}

// Validate if a trade exists
export async function validateTradeExists(
  tradeId: number
): Promise<TradeValidationResult> {
  try {
    const [trade] = await db
      .select()
      .from(trades)
      .where(eq(trades.id, tradeId))
      .limit(1)

    if (!trade) {
      return {
        isValid: false,
        error: 'Trade not found'
      }
    }

    return {
      isValid: true,
      trade
    }
  } catch (error) {
    console.error('Error validating trade exists:', error)
    return {
      isValid: false,
      error: 'Failed to validate trade'
    }
  }
}

// Validate if user is part of the trade
export async function validateUserInTrade(
  tradeId: number,
  userId: number
): Promise<TradeValidationResult> {
  const result = await validateTradeExists(tradeId)

  if (!result.isValid || !result.trade) {
    return result
  }

  if (result.trade.buyerId !== userId && result.trade.sellerId !== userId) {
    return {
      isValid: false,
      error: 'You are not part of this trade'
    }
  }

  return {
    isValid: true,
    trade: result.trade
  }
}

// Validate if user is the buyer of the trade
export async function validateUserIsBuyer(
  tradeId: number,
  userId: number
): Promise<TradeValidationResult> {
  const result = await validateTradeExists(tradeId)

  if (!result.isValid || !result.trade) {
    return result
  }

  if (result.trade.buyerId !== userId) {
    return {
      isValid: false,
      error: 'Only the buyer can perform this action'
    }
  }

  return {
    isValid: true,
    trade: result.trade
  }
}

// Validate if user is the seller of the trade
export async function validateUserIsSeller(
  tradeId: number,
  userId: number
): Promise<TradeValidationResult> {
  const result = await validateTradeExists(tradeId)

  if (!result.isValid || !result.trade) {
    return result
  }

  if (result.trade.sellerId !== userId) {
    return {
      isValid: false,
      error: 'Only the seller can perform this action'
    }
  }

  return {
    isValid: true,
    trade: result.trade
  }
}

// Validate if an action can be performed on the trade
export async function validateTradeAction(
  tradeId: number,
  action: 'fund' | 'confirm' | 'dispute' | 'cancel' | 'resolve'
): Promise<TradeValidationResult> {
  const result = await validateTradeExists(tradeId)

  if (!result.isValid || !result.trade) {
    return result
  }

  const currentStatus = result.trade.status as TradeStatus

  if (!canPerformAction(currentStatus, action)) {
    return {
      isValid: false,
      error: `Cannot ${action} trade in ${currentStatus} status`
    }
  }

  return {
    isValid: true,
    trade: result.trade
  }
}

// Validate trade amount limits based on user subscription
export async function validateTradeAmount(
  userId: number,
  amount: string,
  subscriptionTier?: 'free' | 'pro' | 'enterprise'
): Promise<{ isValid: boolean; error?: string }> {
  const numAmount = parseFloat(amount)

  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      isValid: false,
      error: 'Invalid amount'
    }
  }

  // Define limits based on subscription tier
  const limits = {
    free: 1000,
    pro: 25000,
    enterprise: Infinity
  }

  const tier = subscriptionTier || 'free'
  const limit = limits[tier]

  if (numAmount > limit) {
    return {
      isValid: false,
      error: `Amount exceeds ${tier} tier limit of ${limit}`
    }
  }

  return { isValid: true }
}

// Validate active trades count based on subscription
export async function validateActiveTradesCount(
  userId: number,
  subscriptionTier?: 'free' | 'pro' | 'enterprise'
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Count active trades for user
    const activeStatuses = ['created', 'funded', 'delivered', 'disputed']
    const [result] = await db
      .select({ count: count() })
      .from(trades)
      .where(
        and(
          or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)),
          inArray(trades.status, activeStatuses)
        )
      )

    const activeCount = result?.count || 0

    // Define limits based on subscription tier
    const limits = {
      free: 3,
      pro: 25,
      enterprise: Infinity
    }

    const tier = subscriptionTier || 'free'
    const limit = limits[tier]

    if (activeCount >= limit) {
      return {
        isValid: false,
        error: `Maximum active trades limit (${limit}) reached for ${tier} tier`
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('Error validating active trades count:', error)
    return {
      isValid: false,
      error: 'Failed to validate active trades count'
    }
  }
}

// Composite validation for creating a trade
export async function validateCreateTrade(
  userId: number,
  amount: string,
  subscriptionTier?: 'free' | 'pro' | 'enterprise'
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Validate amount
  const amountValidation = await validateTradeAmount(
    userId,
    amount,
    subscriptionTier
  )
  if (!amountValidation.isValid && amountValidation.error) {
    errors.push(amountValidation.error)
  }

  // Validate active trades count
  const countValidation = await validateActiveTradesCount(
    userId,
    subscriptionTier
  )
  if (!countValidation.isValid && countValidation.error) {
    errors.push(countValidation.error)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validate dispute time window (must be within 7 days of funding)
export async function validateDisputeWindow(
  tradeId: number
): Promise<TradeValidationResult> {
  const result = await validateTradeExists(tradeId)

  if (!result.isValid || !result.trade) {
    return result
  }

  // Check if trade is funded
  if (result.trade.status !== 'funded' && result.trade.status !== 'delivered') {
    return {
      isValid: false,
      error: 'Trade must be funded or delivered to raise a dispute'
    }
  }

  // Check dispute window (7 days from creation)
  const createdAt = new Date(result.trade.createdAt)
  const now = new Date()
  const daysSinceCreation =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceCreation > 7) {
    return {
      isValid: false,
      error: 'Dispute window has expired (7 days from trade creation)'
    }
  }

  return {
    isValid: true,
    trade: result.trade
  }
}
