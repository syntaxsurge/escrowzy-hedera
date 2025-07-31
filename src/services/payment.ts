import 'server-only'
import { eq, and, sql } from 'drizzle-orm'
import { createPublicClient, http, parseUnits, decodeEventLog } from 'viem'

import { timeConstants } from '@/config/app-routes'
import { getCryptoPrice } from '@/lib/api/coingecko'
import {
  getSubscriptionManagerAddress,
  getCoingeckoPriceId,
  getNativeCurrencySymbol,
  getNativeCurrencyDecimals,
  getChainNickname,
  getViemChain,
  getSupportedChainIds,
  isSupportedChainId,
  SUBSCRIPTION_MANAGER_ABI
} from '@/lib/blockchain'
import { db } from '@/lib/db/drizzle'
import { teams, paymentHistory } from '@/lib/db/schema'
import {
  updatePersonalSubscription,
  getUserPersonalSubscription
} from '@/services/subscription'
import type { PaymentIntent } from '@/types/payment'

// Generate payment network configuration dynamically
function getPaymentNetworkConfig(networkId: number) {
  if (!isSupportedChainId(networkId)) {
    throw new Error(
      `Unsupported payment network: ${networkId}. Supported networks: ${getSupportedChainIds().join(', ')}`
    )
  }

  const chain = getViemChain(networkId)

  if (!chain) {
    throw new Error(`Unsupported chain for network ID: ${networkId}`)
  }

  return {
    chain,
    name: getChainNickname(networkId),
    nativeCurrency: getNativeCurrencySymbol(networkId),
    coingeckoId: getCoingeckoPriceId(networkId),
    contractAddress: getSubscriptionManagerAddress(networkId)
  }
}

interface PlanDetails {
  id: string
  name: string
  price: string
  currency: string
  planKey: number
  priceWei?: bigint
  isTeamPlan?: boolean
  features?: string[]
  maxMembers?: number
}

export async function createPaymentIntent(
  teamId: number,
  userId: number,
  planDetails: PlanDetails,
  networkId: number
): Promise<PaymentIntent> {
  const network = getPaymentNetworkConfig(networkId)

  if (!network.contractAddress) {
    throw new Error(
      `SubscriptionManager contract not deployed on ${network.name}`
    )
  }

  let amountWei: bigint
  let amount: string
  let cryptoPrice: number

  // If priceWei is provided, use it directly (avoiding double conversion)
  if (planDetails.priceWei !== undefined) {
    amountWei = planDetails.priceWei
    // Get current crypto price for display purposes
    cryptoPrice = await getCryptoPrice(network.coingeckoId)
    // Calculate the crypto amount for display
    const decimals = getNativeCurrencyDecimals(networkId)
    amount = (Number(amountWei) / Math.pow(10, decimals)).toFixed(decimals)
  } else {
    // Fallback to USD conversion if priceWei is not provided
    const usdPrice = parseFloat(planDetails.price)
    const network = getPaymentNetworkConfig(networkId)

    cryptoPrice = await getCryptoPrice(network.coingeckoId)
    if (!cryptoPrice || cryptoPrice <= 0) {
      throw new Error('Invalid price data')
    }

    // Calculate amount needed in native currency
    amount = (usdPrice / cryptoPrice).toString()
    amountWei = parseUnits(amount, getNativeCurrencyDecimals(networkId))
  }

  // Generate unique payment ID for tracking concurrent payments
  const paymentId = `${teamId}-${userId}-${planDetails.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

  // Use the plan key from the plan details
  const planKey = planDetails.planKey

  const usdPrice = parseFloat(planDetails.price)

  return {
    paymentId,
    teamId,
    userId,
    amount,
    amountWei: amountWei.toString(),
    currency: network.nativeCurrency,
    networkId,
    contractAddress: network.contractAddress,
    planKey,
    plan: {
      id: planDetails.id,
      name: planDetails.name,
      price: planDetails.price,
      currency: planDetails.currency,
      features: planDetails.features,
      maxMembers: planDetails.maxMembers
    },
    network: {
      id: networkId,
      name: network.name,
      nativeCurrency: network.nativeCurrency
    },
    pricing: {
      usdPrice,
      cryptoPrice,
      cryptoAmount: amount
    }
  }
}

export async function verifyAndConfirmPayment(
  teamId: number,
  planId: string,
  transactionHash: string,
  fromAddress: string,
  amount: string,
  networkId: number,
  userId?: number
) {
  // Normalize planId to lowercase for consistent comparison
  const normalizedPlanId = planId.toLowerCase()
  const network = getPaymentNetworkConfig(networkId)

  try {
    // Create viem client for the specific network
    const client = createPublicClient({
      chain: network.chain,
      transport: http()
    })

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: transactionHash as `0x${string}`
    })

    if (!receipt) {
      throw new Error('Transaction not found')
    }

    // Verify transaction details
    const transaction = await client.getTransaction({
      hash: transactionHash as `0x${string}`
    })

    // Check if transaction is to our contract address
    if (
      transaction.to?.toLowerCase() !== network.contractAddress?.toLowerCase()
    ) {
      throw new Error('Invalid recipient address')
    }

    // Verify transaction was successful
    if (receipt.status !== 'success') {
      throw new Error('Transaction failed')
    }

    // Parse transaction logs to verify the correct plan was paid for
    let paidPlanKey: number | null = null

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: SUBSCRIPTION_MANAGER_ABI,
          data: log.data,
          topics: log.topics
        })

        if (decoded.eventName === 'SubscriptionPaid') {
          // Extract planKey from the args array based on the event signature
          // event SubscriptionPaid(address indexed team, uint8 indexed planKey, uint256 paidUntil)
          const args = decoded.args as any
          if (args && args.planKey !== undefined) {
            paidPlanKey = Number(args.planKey)
            break
          }
        }
      } catch {
        // Continue to next log if this one doesn't decode
      }
    }

    if (paidPlanKey === null) {
      throw new Error('SubscriptionPaid event not found in transaction')
    }

    // Map plan keys to plan IDs
    const planKeyToId: Record<number, string> = {
      0: 'free',
      1: 'pro',
      2: 'enterprise',
      3: 'team_pro',
      4: 'team_enterprise'
    }

    const paidPlanId = planKeyToId[paidPlanKey]

    if (!paidPlanId) {
      throw new Error(`Invalid plan key: ${paidPlanKey}`)
    }

    // Verify the paid plan matches the requested plan
    if (paidPlanId !== normalizedPlanId) {
      throw new Error(
        `Plan mismatch: paid for ${paidPlanId} but requesting ${normalizedPlanId}`
      )
    }

    // Verify the transaction value matches the expected amount
    if (transaction.value.toString() !== amount) {
      throw new Error(
        `Amount mismatch: paid ${transaction.value} but expected ${amount}`
      )
    }

    // Check if this transaction has already been processed
    const existingPayment = await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.transactionHash, transactionHash))
      .limit(1)

    if (existingPayment.length > 0) {
      // Transaction already processed
      // Check if subscription needs to be updated even for duplicate payment
      const isTeamPlan = paidPlanKey >= 3 // Team plans start from key 3

      if (!isTeamPlan && userId) {
        // For individual plans, check if subscription is up to date
        const userSub = await getUserPersonalSubscription(userId)

        if (!userSub || userSub.planId !== paidPlanId) {
          // Subscription is not up to date, update it
          const expirationDate = new Date(Date.now() + timeConstants.MONTH) // 30 days
          await updatePersonalSubscription(userId, paidPlanId, expirationDate)
        }
      }

      return {
        confirmed: true,
        blockNumber: receipt.blockNumber.toString(),
        transactionHash,
        duplicate: true
      }
    }

    // Only update team plan if all verifications pass
    const isTeamPlan = paidPlanKey >= 3 // Team plans start from key 3

    // Mark previous confirmed payments as superseded
    // Only supersede payments of the same type (team vs individual)
    if (isTeamPlan) {
      // For team plans, only supersede other team plan payments
      await db
        .update(paymentHistory)
        .set({ status: 'superseded' })
        .where(
          and(
            eq(paymentHistory.teamId, teamId),
            eq(paymentHistory.status, 'confirmed'),
            sql`${paymentHistory.planId} LIKE 'team_%'`
          )
        )
    } else if (userId) {
      // For individual plans, only supersede other individual plan payments by the same user
      await db
        .update(paymentHistory)
        .set({ status: 'superseded' })
        .where(
          and(
            eq(paymentHistory.userId, userId),
            eq(paymentHistory.status, 'confirmed'),
            sql`${paymentHistory.planId} NOT LIKE 'team_%'`
          )
        )
    }

    if (isTeamPlan) {
      // Update team plan for team subscriptions
      await updateTeamPlan(teamId, paidPlanId, isTeamPlan, userId)
    } else {
      // Update personal subscription for individual plans ONLY
      // DO NOT update team plan for individual subscriptions
      if (userId) {
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        await updatePersonalSubscription(userId, paidPlanId, expirationDate)
      }
    }

    // Store payment history if userId is provided
    if (userId) {
      await db.insert(paymentHistory).values({
        teamId,
        userId,
        planId: paidPlanId,
        transactionHash,
        chainId: networkId,
        amount,
        currency: network.nativeCurrency,
        status: 'confirmed'
      })
    }

    return {
      confirmed: true,
      blockNumber: receipt.blockNumber.toString(),
      transactionHash,
      planName: paidPlanId,
      fromAddress: transaction.from,
      toAddress: transaction.to,
      value: transaction.value.toString(),
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      networkId,
      isTeamPlan
    }
  } catch (error) {
    console.error('Payment verification failed:', error)
    throw error
  }
}

export async function updateTeamPlan(
  teamId: number,
  planId: string,
  _isTeamPlan: boolean = false,
  teamOwnerId?: number,
  isDowngrade: boolean = false
) {
  const now = new Date()

  // If this is a downgrade to free plan, we should invalidate previous payments
  if (isDowngrade && planId.toLowerCase() === 'free') {
    // Mark all previous payments as superseded
    await db
      .update(paymentHistory)
      .set({ status: 'superseded' })
      .where(
        and(
          eq(paymentHistory.teamId, teamId),
          eq(paymentHistory.status, 'confirmed')
        )
      )
  }

  // For downgrades, we trust the requested plan
  // For upgrades, we check payment history to prevent accidental downgrades
  let finalPlanId = planId.toLowerCase()
  let finalPlanLevel = getPlanLevel(planId)

  if (!isDowngrade) {
    // Get current team data and payment history to determine highest plan
    const teamPaymentHistory = await db
      .select()
      .from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.teamId, teamId),
          eq(paymentHistory.status, 'confirmed')
        )
      )

    // Check all confirmed payments for higher plans
    for (const payment of teamPaymentHistory) {
      const paymentPlanLevel = getPlanLevel(payment.planId)
      if (paymentPlanLevel > finalPlanLevel) {
        finalPlanLevel = paymentPlanLevel
        finalPlanId = payment.planId.toLowerCase()
      }
    }
  }

  const updateData: any = {
    planId: finalPlanId,
    isTeamPlan: finalPlanLevel >= 3, // Team plans start from level 3
    updatedAt: now
  }

  if (updateData.isTeamPlan && teamOwnerId) {
    updateData.teamOwnerId = teamOwnerId
    // Set expiration to 30 days from now for team plans
    const expirationDate = new Date(now.getTime() + timeConstants.MONTH)
    updateData.subscriptionExpiresAt = expirationDate

    // Update team owner's personal subscription for team plans
    await updatePersonalSubscription(teamOwnerId, finalPlanId, expirationDate)
  } else if (!updateData.isTeamPlan) {
    // Clear team subscription fields for individual plans
    updateData.teamOwnerId = null
    updateData.subscriptionExpiresAt = null

    // Update personal subscription for non-team plans
    if (teamOwnerId) {
      const expirationDate =
        finalPlanId === 'free'
          ? null
          : new Date(now.getTime() + timeConstants.MONTH)
      await updatePersonalSubscription(teamOwnerId, finalPlanId, expirationDate)
    }
  }

  await db.update(teams).set(updateData).where(eq(teams.id, teamId))
}

function getPlanLevel(planId: string): number {
  const planHierarchy: Record<string, number> = {
    free: 0,
    pro: 1,
    enterprise: 2,
    team_pro: 3,
    team_enterprise: 4
  }
  return planHierarchy[planId.toLowerCase()] ?? 0
}

export async function getTeamPlan(teamId: number) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1)

  return result[0]?.planId || 'free'
}
