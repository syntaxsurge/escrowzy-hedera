import type { escrowListings, trades, users } from '@/lib/db/schema'

export { TradeCategory, ListingType } from './trade'

// Base listing type from database
export type EscrowListing = typeof escrowListings.$inferSelect
export type NewEscrowListing = typeof escrowListings.$inferInsert

// Trade type from database
export type Trade = typeof trades.$inferSelect
export type NewTrade = typeof trades.$inferInsert

// Domain-specific metadata
export interface DomainMetadata {
  domainName: string
  registrar: string
  domainAge?: number
  expiryDate?: string
  transferMethod: 'manual' | 'api'
  websiteUrl?: string
  monthlyTraffic?: number
  monthlyRevenue?: number
  adminTransferEmail?: string
}

// Extended types with relations
export interface EscrowListingWithUser extends EscrowListing {
  user: typeof users.$inferSelect
}

// Listing filters for search
export interface ListingFilters {
  listingCategory?: string
  listingType?: 'buy' | 'sell' // For P2P
  tokenOffered?: string // For P2P
  minAmount?: string
  maxAmount?: string
  paymentMethod?: string
  userId?: number
  isActive?: boolean
  domainName?: string // For domains
  registrar?: string // For domains
}

// Payment methods enum - for P2P trades
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  PAYPAL: 'paypal',
  CRYPTO: 'crypto',
  CASH: 'cash',
  MOBILE_PAYMENT: 'mobile_payment',
  WIRE_TRANSFER: 'wire_transfer'
} as const

// P2P specific payment methods (all methods)
export const P2P_PAYMENT_METHODS = PAYMENT_METHODS

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]

// Get supported tokens based on chain
export function getSupportedTokensForChain(
  chainId: number
): Record<string, string> {
  // Import dynamically to avoid circular dependencies
  const { getNativeCurrencySymbol } = require('@/lib/blockchain')
  const nativeCurrency = getNativeCurrencySymbol(chainId)

  // Return native currency as the primary token for now
  // Can be expanded to include other tokens per chain
  return {
    [nativeCurrency]: nativeCurrency
  }
}

// Trade status enum
export const TRADE_STATUS = {
  CREATED: 'created',
  AWAITING_DEPOSIT: 'awaiting_deposit',
  FUNDED: 'funded',
  PAYMENT_SENT: 'payment_sent',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  DELIVERED: 'delivered',
  CONFIRMED: 'confirmed',
  DISPUTED: 'disputed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DEPOSIT_TIMEOUT: 'deposit_timeout',
  REFUNDED: 'refunded'
} as const

export type TradeStatus = (typeof TRADE_STATUS)[keyof typeof TRADE_STATUS]

// Domain registrars
export const DOMAIN_REGISTRARS = {
  GODADDY: 'GoDaddy',
  NAMECHEAP: 'Namecheap',
  GOOGLE_DOMAINS: 'Google Domains',
  CLOUDFLARE: 'Cloudflare',
  GANDI: 'Gandi',
  ENOM: 'eNom',
  HOSTINGER: 'Hostinger',
  BLUEHOST: 'Bluehost',
  NETWORK_SOLUTIONS: 'Network Solutions',
  OTHER: 'Other'
} as const

export type DomainRegistrar =
  (typeof DOMAIN_REGISTRARS)[keyof typeof DOMAIN_REGISTRARS]

// Response types
export interface CreateListingResponse {
  success: boolean
  listing?: EscrowListing
  error?: string
}

export interface AcceptListingResponse {
  success: boolean
  trade?: Trade
  error?: string
}

// Type guards
export function isValidListingCategory(category: string): boolean {
  return category === 'p2p' || category === 'domain'
}

export function isValidListingType(type: string): type is 'buy' | 'sell' {
  return type === 'buy' || type === 'sell'
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return Object.values(PAYMENT_METHODS).includes(method as PaymentMethod)
}

export function isValidToken(token: string, chainId?: number): boolean {
  if (!token || token.length === 0) return false

  // If chainId is provided, validate against that chain's supported tokens
  if (chainId) {
    const supportedTokens = getSupportedTokensForChain(chainId)
    return Object.keys(supportedTokens).includes(token)
  }

  // If no chainId, check if token is valid for any supported chain
  const { getSupportedChainIds } = require('@/lib/blockchain')
  const allChainIds = getSupportedChainIds()

  for (const id of allChainIds) {
    const supportedTokens = getSupportedTokensForChain(id)
    if (Object.keys(supportedTokens).includes(token)) {
      return true
    }
  }

  // Also accept common cross-chain tokens
  const commonTokens = ['BTC', 'ETH', 'USDT', 'USDC']
  return commonTokens.includes(token)
}

export function isValidTradeStatus(status: string): status is TradeStatus {
  return Object.values(TRADE_STATUS).includes(status as TradeStatus)
}

export function isValidDomainRegistrar(
  registrar: string
): registrar is DomainRegistrar {
  return Object.values(DOMAIN_REGISTRARS).includes(registrar as DomainRegistrar)
}
