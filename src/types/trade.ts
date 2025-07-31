import type { trades, users, userTradingStats } from '@/lib/db/schema'

import type { TradeStatus } from './listings'

/**
 * Trade Categories - Defines what type of asset is being traded
 * These values are stored in both escrowListings.listingCategory and trades.listingCategory
 */
export enum TradeCategory {
  P2P = 'p2p', // Peer-to-peer crypto/fiat trades
  DOMAIN = 'domain' // Domain name trades
  // Future extensions: NFT = 'nft', SERVICE = 'service', etc.
}

/**
 * Listing Types - Defines the direction of the trade from the listing creator's perspective
 * Used in escrowListings.listingType
 */
export enum ListingType {
  BUY = 'buy', // Listing creator wants to buy (has fiat, wants crypto/domain)
  SELL = 'sell' // Listing creator wants to sell (has crypto/domain, wants fiat)
}

// Re-export TRADE_STATUS for convenience with better typing
export const TRADE_STATUS: Record<string, string> = {
  created: 'Created',
  awaiting_deposit: 'Awaiting Deposit',
  funded: 'Funded',
  payment_sent: 'Payment Sent',
  payment_confirmed: 'Payment Confirmed',
  delivered: 'Delivered',
  confirmed: 'Confirmed',
  disputed: 'Disputed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  deposit_timeout: 'Deposit Timeout',
  refunded: 'Refunded'
}

/**
 * Base trade type from database
 */
export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert

/**
 * Extended trade type with user relations
 * Includes full user objects for buyer and seller, and properly typed metadata
 */
export interface TradeWithUsers extends Omit<Trade, 'metadata'> {
  buyer: typeof users.$inferSelect
  seller: typeof users.$inferSelect
  metadata: TradeMetadata | null
}

export interface TradeWithStats extends TradeWithUsers {
  buyerStats?: typeof userTradingStats.$inferSelect
  sellerStats?: typeof userTradingStats.$inferSelect
}

// Trade filters for search
export interface TradeFilters {
  userId?: number
  role?: 'buyer' | 'seller' | 'both'
  status?: TradeStatus | TradeStatus[]
  chainId?: number
  startDate?: Date
  endDate?: Date
  minAmount?: string
  maxAmount?: string
  page?: number
  limit?: number
}

/**
 * Trade metadata structure - stores additional trade information in JSONB
 * This is stored in the trades.metadata column as JSON
 */
export interface TradeMetadata {
  // Reference to the original listing that created this trade
  originalListingId?: number

  // Payment method used for this trade (e.g., 'bank_transfer', 'paypal', 'USDT', etc.)
  paymentMethod?: string
  paymentProof?: string[]
  paymentProofImages?: string[] // URLs to payment proof screenshots
  deliveryProof?: string[]
  disputeReason?: string
  disputeEvidence?: string | string[]
  disputeEvidenceImages?: string // Comma-separated URLs to dispute evidence screenshots
  notes?: string
  rating?: {
    fromBuyer?: number
    fromSeller?: number
  }
  completedAt?: string
  fundedAt?: string
  deliveredAt?: string
  disputedAt?: string
  escrowContractAddress?: string
  cryptoDepositTxHash?: string // Transaction hash for seller's crypto deposit
  claimTxHash?: string // Transaction hash for seller releasing funds to buyer
  paymentProofUploadedAt?: string // When buyer uploaded payment proof
  escrowFeeAmount?: string // Platform fee amount
  escrowNetAmount?: string // Amount seller receives after fees
  // Domain-specific metadata
  domainName?: string
  registrar?: string
  domainAge?: string
  expiryDate?: string
  monthlyTraffic?: string
  monthlyRevenue?: string
  // Nested domain info (for compatibility with service layer)
  domainInfo?: {
    domainName: string
    registrar: string
    expirationDate?: string
    transferMethod?: string
  }
}

// Trade action types
export type TradeAction =
  | 'deposit'
  | 'fund'
  | 'payment_sent'
  | 'confirm'
  | 'dispute'
  | 'cancel'
  | 'resolve'

// Trade transition rules - Updated for new P2P flow
export const TRADE_TRANSITIONS: Record<string, TradeAction[]> = {
  created: ['fund', 'cancel'], // Allow fund for domain trades that start in created status
  awaiting_deposit: ['deposit', 'cancel'],
  funded: ['payment_sent', 'dispute', 'cancel'],
  payment_sent: ['confirm', 'dispute'],
  payment_confirmed: [],
  delivered: ['confirm', 'dispute'],
  confirmed: [],
  disputed: ['resolve', 'cancel'],
  completed: [],
  cancelled: [],
  deposit_timeout: [],
  refunded: []
}

// Response types
export interface TradeResponse {
  success: boolean
  trade?: Trade | TradeWithUsers
  error?: string
}

export interface TradesListResponse {
  success: boolean
  trades: TradeWithUsers[]
  total: number
  page: number
  limit: number
  error?: string
}

// Type guards
export function canPerformAction(
  currentStatus: TradeStatus,
  action: TradeAction
): boolean {
  const allowedActions = TRADE_TRANSITIONS[currentStatus]
  return allowedActions?.includes(action) ?? false
}

export function isValidTradeAction(action: string): action is TradeAction {
  return [
    'deposit',
    'fund',
    'payment_sent',
    'confirm',
    'dispute',
    'cancel',
    'resolve'
  ].includes(action)
}
