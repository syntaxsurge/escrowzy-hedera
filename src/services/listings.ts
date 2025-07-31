import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { listingConstants } from '@/config/business-constants'
import { envPublic } from '@/config/env.public'
import { db } from '@/lib/db/drizzle'
import { escrowListings, trades, users } from '@/lib/db/schema'
import type {
  CreateListingInput,
  UpdateListingInput,
  AcceptListingInput,
  GetListingsQuery
} from '@/lib/schemas/listings'
import type {
  EscrowListing,
  EscrowListingWithUser,
  Trade,
  DomainMetadata
} from '@/types/listings'
import { TRADE_STATUS } from '@/types/listings'

// Create a new listing (P2P or Domain)
export async function createListing(
  userId: number,
  input: CreateListingInput
): Promise<EscrowListing> {
  // Build the values object based on listing category
  let values: any = {
    userId,
    listingCategory: input.listingCategory,
    listingType: input.listingType,
    paymentWindow:
      input.paymentWindow || listingConstants.DEFAULT_PAYMENT_WINDOW,
    isActive: true,
    metadata: {},
    chainId: (input as any).chainId || null // Add chainId from input
  }

  if (input.listingCategory === 'p2p') {
    // P2P specific fields
    const p2pInput = input as any
    values.tokenOffered = p2pInput.tokenOffered
    values.amount = p2pInput.amount
    values.pricePerUnit = p2pInput.pricePerUnit
    values.minAmount = p2pInput.minAmount || null
    values.maxAmount = p2pInput.maxAmount || null
    values.paymentMethods = p2pInput.paymentMethods
  } else if (input.listingCategory === 'domain') {
    // Domain specific fields
    const domainInput = input as any // Type assertion for domain fields
    values.tokenOffered = domainInput.tokenOffered // Store the cryptocurrency accepted
    values.amount = domainInput.price // Store price in amount field
    values.paymentMethods = [domainInput.tokenOffered] // Store as single payment method
    values.metadata = {
      domainName: domainInput.domainName,
      registrar: domainInput.registrar,
      domainAge: domainInput.domainAge,
      expiryDate: domainInput.expiryDate,
      monthlyTraffic: domainInput.monthlyTraffic,
      monthlyRevenue: domainInput.monthlyRevenue,
      description: domainInput.description,
      transferMethod: 'manual',
      adminTransferEmail: envPublic.NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL
    } as DomainMetadata
  }

  const [listing] = await db.insert(escrowListings).values(values).returning()

  return listing
}

// Get active listings with filters and pagination
export async function getActiveListings(
  query: GetListingsQuery
): Promise<{ listings: EscrowListingWithUser[]; total: number }> {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query

  // Build filter conditions
  const conditions = []

  // Always filter for active listings unless explicitly requested
  if (query.isActive !== false) {
    conditions.push(eq(escrowListings.isActive, true))
  }

  // Category filter
  if (query.listingCategory) {
    conditions.push(eq(escrowListings.listingCategory, query.listingCategory))
  }

  if (query.listingType) {
    conditions.push(eq(escrowListings.listingType, query.listingType))
  }

  if (query.tokenOffered) {
    conditions.push(eq(escrowListings.tokenOffered, query.tokenOffered))
  }

  if (query.userId) {
    conditions.push(eq(escrowListings.userId, query.userId))
  }

  if (query.minAmount) {
    conditions.push(gte(escrowListings.amount, query.minAmount))
  }

  if (query.maxAmount) {
    conditions.push(lte(escrowListings.amount, query.maxAmount))
  }

  if (query.paymentMethod) {
    conditions.push(
      sql`${escrowListings.paymentMethods}::jsonb @> ${JSON.stringify([query.paymentMethod])}::jsonb`
    )
  }

  // Domain-specific filters
  if (query.domainName) {
    conditions.push(
      sql`${escrowListings.metadata}->>'domainName' ILIKE ${`%${query.domainName}%`}`
    )
  }

  if (query.registrar) {
    conditions.push(
      sql`${escrowListings.metadata}->>'registrar' = ${query.registrar}`
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(whereClause)

  // Get paginated listings with user info
  const offset = (page - 1) * limit

  // Build order by clause
  let orderByClause
  if (sortBy === 'pricePerUnit') {
    orderByClause =
      sortOrder === 'desc'
        ? desc(escrowListings.pricePerUnit)
        : escrowListings.pricePerUnit
  } else if (sortBy === 'amount' || sortBy === 'price') {
    orderByClause =
      sortOrder === 'desc' ? desc(escrowListings.amount) : escrowListings.amount
  } else {
    orderByClause =
      sortOrder === 'desc'
        ? desc(escrowListings.createdAt)
        : escrowListings.createdAt
  }

  const listings = await db
    .select({
      listing: escrowListings,
      user: users
    })
    .from(escrowListings)
    .innerJoin(users, eq(escrowListings.userId, users.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  // Format the results
  const formattedListings: EscrowListingWithUser[] = listings.map(row => ({
    ...row.listing,
    user: row.user
  }))

  return {
    listings: formattedListings,
    total: count
  }
}

// Get a single listing by ID
export async function getListingById(
  listingId: number
): Promise<EscrowListingWithUser | null> {
  const result = await db
    .select({
      listing: escrowListings,
      user: users
    })
    .from(escrowListings)
    .innerJoin(users, eq(escrowListings.userId, users.id))
    .where(eq(escrowListings.id, listingId))
    .limit(1)

  if (result.length === 0) {
    return null
  }

  return {
    ...result[0].listing,
    user: result[0].user
  }
}

// Update a listing
export async function updateListing(
  listingId: number,
  userId: number,
  input: UpdateListingInput
): Promise<EscrowListing | null> {
  // First check if the listing belongs to the user
  const existingListing = await db
    .select()
    .from(escrowListings)
    .where(
      and(eq(escrowListings.id, listingId), eq(escrowListings.userId, userId))
    )
    .limit(1)

  if (existingListing.length === 0) {
    return null
  }

  // Update the listing
  const updateData: Partial<EscrowListing> = {}

  if (input.amount !== undefined) {
    updateData.amount = input.amount
  }

  if (input.pricePerUnit !== undefined) {
    updateData.pricePerUnit = input.pricePerUnit
  }

  if (input.minAmount !== undefined) {
    updateData.minAmount = input.minAmount
  }

  if (input.maxAmount !== undefined) {
    updateData.maxAmount = input.maxAmount
  }

  if (input.paymentMethods !== undefined) {
    updateData.paymentMethods = input.paymentMethods
  }

  if (input.paymentWindow !== undefined) {
    updateData.paymentWindow = input.paymentWindow
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive
  }

  const [updatedListing] = await db
    .update(escrowListings)
    .set(updateData)
    .where(eq(escrowListings.id, listingId))
    .returning()

  return updatedListing
}

// Deactivate a listing
export async function deactivateListing(
  listingId: number,
  userId: number
): Promise<boolean> {
  // Check if the listing belongs to the user
  const result = await db
    .update(escrowListings)
    .set({ isActive: false })
    .where(
      and(eq(escrowListings.id, listingId), eq(escrowListings.userId, userId))
    )
    .returning()

  return result.length > 0
}

// Accept a listing and create a trade
export async function acceptListingAndCreateTrade(
  listingId: number,
  buyerId: number,
  input: AcceptListingInput
): Promise<Trade | null> {
  // Get the listing
  const listing = await getListingById(listingId)

  if (!listing || !listing.isActive) {
    throw new Error('Listing not found or inactive')
  }

  // Prevent users from accepting their own listings
  if (listing.userId === buyerId) {
    throw new Error('Cannot accept your own listing')
  }

  // Validate amount is within listing limits
  const requestedAmount = parseFloat(input.amount)
  const listingAmount = parseFloat(listing.amount ?? '0')

  if (requestedAmount > listingAmount) {
    throw new Error('Requested amount exceeds available amount')
  }

  if (listing.minAmount && requestedAmount < parseFloat(listing.minAmount)) {
    throw new Error('Amount is below minimum')
  }

  if (listing.maxAmount && requestedAmount > parseFloat(listing.maxAmount)) {
    throw new Error('Amount exceeds maximum')
  }

  // Validate payment method
  // For domain listings, the paymentMethod is the token (crypto) used for payment
  // For P2P listings, it's a traditional payment method
  if (listing.listingCategory === 'domain') {
    // For domain listings, ensure the token matches what the seller accepts
    // If tokenOffered is not set, accept the buyer's chosen token
    if (listing.tokenOffered && listing.tokenOffered !== input.paymentMethod) {
      throw new Error(
        `Payment token not accepted. Seller accepts: ${listing.tokenOffered}`
      )
    }
  } else {
    // For P2P listings, validate against the payment methods array
    const paymentMethods = listing.paymentMethods as string[]
    if (!paymentMethods.includes(input.paymentMethod)) {
      throw new Error('Payment method not accepted')
    }
  }

  // Determine buyer and seller based on listing type
  const isBuyListing = listing.listingType === 'buy'
  const actualBuyerId = isBuyListing ? listing.userId : buyerId
  const actualSellerId = isBuyListing ? buyerId : listing.userId

  // Determine trade type based on listing category
  const isDomainTrade = listing.listingCategory === 'domain'

  // For domain trades, we use manual escrow process
  // For P2P trades, seller needs to deposit crypto
  const tradeStatus = isDomainTrade
    ? TRADE_STATUS.CREATED // Domain trades start as created, awaiting manual transfer
    : TRADE_STATUS.AWAITING_DEPOSIT // P2P trades need crypto deposit

  // Calculate deposit deadline (only for P2P trades)
  const depositDeadline = isDomainTrade ? null : new Date()
  if (!isDomainTrade && depositDeadline) {
    depositDeadline.setMinutes(
      depositDeadline.getMinutes() + (listing.paymentWindow || 15)
    )
  }

  // Create the trade
  const [trade] = await db
    .insert(trades)
    .values({
      escrowId: null, // Will be set when seller deposits (P2P) or admin confirms (domain)
      chainId: input.chainId,
      buyerId: actualBuyerId,
      sellerId: actualSellerId,
      amount: input.amount,
      currency: isDomainTrade ? 'USD' : listing.tokenOffered || 'USD',
      listingCategory: listing.listingCategory || 'p2p',
      status: tradeStatus,
      depositDeadline: depositDeadline,
      metadata: {
        listingId,
        listingCategory: listing.listingCategory,
        paymentMethod: input.paymentMethod,
        pricePerUnit: listing.pricePerUnit,
        listingType: listing.listingType,
        ...(isDomainTrade && listing.metadata
          ? {
              domainInfo: listing.metadata
            }
          : {})
      }
    })
    .returning()

  // Update listing amount or deactivate if fully consumed
  const remainingAmount = listingAmount - requestedAmount
  if (remainingAmount <= 0) {
    await db
      .update(escrowListings)
      .set({ isActive: false })
      .where(eq(escrowListings.id, listingId))
  } else {
    await db
      .update(escrowListings)
      .set({ amount: remainingAmount.toString() })
      .where(eq(escrowListings.id, listingId))
  }

  return trade
}

// Get user's listings
export async function getUserListings(
  userId: number,
  includeInactive = false
): Promise<{ listings: EscrowListingWithUser[] }> {
  const conditions = [eq(escrowListings.userId, userId)]

  if (!includeInactive) {
    conditions.push(eq(escrowListings.isActive, true))
  }

  const listings = await db
    .select({
      listing: escrowListings,
      user: users
    })
    .from(escrowListings)
    .innerJoin(users, eq(escrowListings.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(escrowListings.createdAt))

  // Format the results
  const formattedListings: EscrowListingWithUser[] = listings.map(row => ({
    ...row.listing,
    user: row.user
  }))

  return {
    listings: formattedListings
  }
}

// Check if user can create more listings based on subscription
export async function canUserCreateListing(
  userId: number,
  subscriptionTier: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<{ canCreate: boolean; reason?: string }> {
  // Get active listings count
  const activeListings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(
      and(eq(escrowListings.userId, userId), eq(escrowListings.isActive, true))
    )

  const count = activeListings[0].count

  // Check limits based on subscription tier
  const limits = {
    free: 3,
    pro: 25,
    enterprise: 999999 // Effectively unlimited
  }

  const limit = limits[subscriptionTier]

  if (count >= limit) {
    return {
      canCreate: false,
      reason: `You have reached the maximum number of active listings (${limit}) for your subscription tier`
    }
  }

  return { canCreate: true }
}

// Delete a listing
export async function deleteListing(
  listingId: number,
  userId: number
): Promise<boolean> {
  // Check if the listing belongs to the user and is not part of an active trade
  const [listing] = await db
    .select()
    .from(escrowListings)
    .where(
      and(eq(escrowListings.id, listingId), eq(escrowListings.userId, userId))
    )
    .limit(1)

  if (!listing) {
    return false
  }

  // Check if there are any active trades for this listing
  const activeTrades = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trades)
    .where(
      and(
        sql`${trades.metadata}->>'listingId' = ${listingId.toString()}`,
        sql`${trades.status} NOT IN ('completed', 'cancelled', 'expired')`
      )
    )

  if (activeTrades[0].count > 0) {
    throw new Error('Cannot delete listing with active trades')
  }

  // Delete the listing
  const result = await db
    .delete(escrowListings)
    .where(
      and(eq(escrowListings.id, listingId), eq(escrowListings.userId, userId))
    )
    .returning()

  return result.length > 0
}

// Get market statistics
export async function getMarketStats(): Promise<{
  totalActiveListings: number
  totalBuyOrders: number
  totalSellOrders: number
  activeTraders: number
  totalP2PListings: number
  totalDomainListings: number
  activeDomainListings: number
  avgDomainPrice: number | null
  domainSellers: number
}> {
  // Get total active listings
  const [{ totalActiveListings }] = await db
    .select({ totalActiveListings: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(eq(escrowListings.isActive, true))

  // Get P2P listings count
  const [{ totalP2PListings }] = await db
    .select({ totalP2PListings: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(
      and(
        eq(escrowListings.isActive, true),
        eq(escrowListings.listingCategory, 'p2p')
      )
    )

  // Get domain listings count
  const [{ totalDomainListings }] = await db
    .select({ totalDomainListings: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(
      and(
        eq(escrowListings.isActive, true),
        eq(escrowListings.listingCategory, 'domain')
      )
    )

  // Get buy orders count (P2P only)
  const [{ totalBuyOrders }] = await db
    .select({ totalBuyOrders: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(
      and(
        eq(escrowListings.isActive, true),
        eq(escrowListings.listingCategory, 'p2p'),
        eq(escrowListings.listingType, 'buy')
      )
    )

  // Get sell orders count (P2P only)
  const [{ totalSellOrders }] = await db
    .select({ totalSellOrders: sql<number>`count(*)::int` })
    .from(escrowListings)
    .where(
      and(
        eq(escrowListings.isActive, true),
        eq(escrowListings.listingCategory, 'p2p'),
        eq(escrowListings.listingType, 'sell')
      )
    )

  // Get unique active traders (users with active listings)
  const [{ activeTraders }] = await db
    .select({
      activeTraders: sql<number>`count(distinct ${escrowListings.userId})::int`
    })
    .from(escrowListings)
    .where(eq(escrowListings.isActive, true))

  // Get active domain listings count (same as totalDomainListings since we filter by isActive)
  const activeDomainListings = totalDomainListings

  // Get average domain price
  const [avgPriceResult] = await db
    .select({
      avgDomainPrice: sql<number>`avg(${escrowListings.amount}::numeric)`
    })
    .from(escrowListings)
    .where(
      and(
        eq(escrowListings.isActive, true),
        eq(escrowListings.listingCategory, 'domain')
      )
    )
  const avgDomainPrice = avgPriceResult?.avgDomainPrice
    ? Math.round(avgPriceResult.avgDomainPrice)
    : null

  // Get unique domain sellers count
  const [{ domainSellers }] = await db
    .select({
      domainSellers: sql<number>`count(distinct ${escrowListings.userId})::int`
    })
    .from(escrowListings)
    .where(
      and(
        eq(escrowListings.isActive, true),
        eq(escrowListings.listingCategory, 'domain')
      )
    )

  return {
    totalActiveListings,
    totalBuyOrders,
    totalSellOrders,
    activeTraders,
    totalP2PListings,
    totalDomainListings,
    activeDomainListings,
    avgDomainPrice,
    domainSellers
  }
}
