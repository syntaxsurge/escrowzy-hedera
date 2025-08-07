import { NATIVE_TOKEN_ADDRESS, ZERO_ADDRESS } from 'thirdweb'
import { parseUnits, formatUnits } from 'viem'

import { okxDexClient } from '@/lib/api/okx-dex-client'
import { getNativeCurrencyDecimals } from '@/lib/blockchain'

/**
 * Helper function to get token decimals from OKX or use defaults
 * @param tokenAddress - The token contract address
 * @param chainId - The chain ID
 * @returns The token decimals (defaults to 18 if not found)
 */
export async function getTokenDecimals(
  tokenAddress: string,
  chainId: string
): Promise<number> {
  try {
    // Native token - use chain-specific decimals
    if (
      !tokenAddress ||
      tokenAddress === '0x0' ||
      tokenAddress.toLowerCase() === ZERO_ADDRESS ||
      tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS
    ) {
      const chainIdNum =
        typeof chainId === 'string' ? parseInt(chainId) : chainId
      return getNativeCurrencyDecimals(chainIdNum)
    }

    // Special cases for known stablecoins with 6 decimals
    const sixDecimalTokens = [
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC on Polygon
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC on BSC
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Ethereum
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT on Polygon
      '0x55d398326f99059ff775485246999027b3197955' // USDT on BSC
    ]

    if (sixDecimalTokens.includes(tokenAddress.toLowerCase())) {
      return 6
    }

    // Fetch token info from OKX
    const tokens = await okxDexClient.getAllTokens(chainId)
    const token = tokens.tokens.find(
      (t: any) =>
        t.tokenContractAddress.toLowerCase() === tokenAddress.toLowerCase()
    )

    if (token && token.tokenDecimals) {
      return parseInt(token.tokenDecimals)
    }

    // Default to 18 if not found (most ERC20 tokens use 18)
    console.warn(
      `Token decimals not found for ${tokenAddress} on chain ${chainId}, defaulting to 18`
    )
    return 18
  } catch (error) {
    console.error('Error fetching token decimals:', error)
    return 18 // Default fallback for ERC20 tokens
  }
}

/**
 * Convert a human-readable amount to the smallest unit (wei, gwei, etc.)
 * @param amount - The human-readable amount (e.g., "1.5")
 * @param decimals - The token decimals
 * @returns The amount in smallest units as a string
 */
export function toSmallestUnit(
  amount: string | number,
  decimals: number
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount

  // Validate input
  if (isNaN(value) || value <= 0) {
    return '0'
  }

  // Use BigInt for precision with large numbers
  const factor = BigInt(10 ** decimals)
  const wholePart = BigInt(Math.floor(value))
  const decimalPart = value - Math.floor(value)

  // Calculate decimal part separately to maintain precision
  const decimalPartBigInt = BigInt(Math.floor(decimalPart * Number(factor)))

  return (wholePart * factor + decimalPartBigInt).toString()
}

/**
 * Convert from smallest unit to human-readable amount
 * @param amount - The amount in smallest units
 * @param decimals - The token decimals
 * @returns The human-readable amount as a string
 */
export function fromSmallestUnit(
  amount: string | number,
  decimals: number
): string {
  const value = typeof amount === 'string' ? amount : amount.toString()

  try {
    const bigIntAmount = BigInt(value)
    const factor = BigInt(10 ** decimals)
    const wholePart = bigIntAmount / factor
    const remainder = bigIntAmount % factor

    // Convert to decimal string
    const decimalStr = remainder.toString().padStart(decimals, '0')
    const trimmedDecimal = decimalStr.replace(/0+$/, '') // Remove trailing zeros

    if (trimmedDecimal) {
      return `${wholePart}.${trimmedDecimal}`
    }
    return wholePart.toString()
  } catch (error) {
    console.error('Error converting from smallest unit:', error)
    // Fallback to simple division
    return (parseFloat(value) / Math.pow(10, decimals)).toString()
  }
}

/**
 * Cache for token info to reduce API calls
 */
const tokenInfoCache = new Map<
  string,
  { decimals: number; timestamp: number }
>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get token decimals with caching
 */
export async function getCachedTokenDecimals(
  tokenAddress: string,
  chainId: string
): Promise<number> {
  const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`
  const cached = tokenInfoCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.decimals
  }

  const decimals = await getTokenDecimals(tokenAddress, chainId)
  tokenInfoCache.set(cacheKey, { decimals, timestamp: Date.now() })

  return decimals
}

/**
 * Parse a human-readable native currency amount to its smallest unit (wei, tinybar, etc.)
 * Handles chain-specific decimals automatically
 *
 * @param amount - The amount as a string (e.g., "1.5")
 * @param chainId - The chain ID to determine correct decimals
 * @returns The amount in smallest units as bigint
 */
export function parseNativeAmount(amount: string, chainId: number): bigint {
  const decimals = getNativeCurrencyDecimals(chainId)
  return parseUnits(amount, decimals)
}

/**
 * Format native currency amount from smallest unit to human-readable format
 * Handles chain-specific decimals automatically
 *
 * @param amount - The amount in smallest units as bigint
 * @param chainId - The chain ID to determine correct decimals
 * @returns The amount as a human-readable string
 */
export function formatNativeAmount(amount: bigint, chainId: number): string {
  const decimals = getNativeCurrencyDecimals(chainId)
  return formatUnits(amount, decimals)
}

/**
 * Check if the chain is Hedera (Testnet or Mainnet)
 * Hedera requires special handling due to its JSON-RPC relay converting decimals
 *
 * @param chainId - The chain ID to check
 * @returns True if the chain is Hedera
 */
export function isHederaChain(chainId: number): boolean {
  return chainId === 296 || chainId === 295 // Hedera Testnet or Mainnet
}

/**
 * Get escrow amounts for both contract arguments and transaction value
 * Handles Hedera's special case where JSON-RPC converts msg.value from 18 to 8 decimals
 * but doesn't convert function arguments
 *
 * @param amount - The amount as a string (e.g., "100.5")
 * @param chainId - The chain ID
 * @returns Object with contractAmount (for function args) and transactionValue (for msg.value)
 */
export function getEscrowAmounts(
  amount: string,
  chainId: number
): { contractAmount: bigint; transactionValue: bigint } {
  if (isHederaChain(chainId)) {
    // For Hedera:
    // - Contract arguments need 8 decimals (native Hedera format)
    // - Transaction value needs 18 decimals (will be converted by JSON-RPC to 8)
    return {
      contractAmount: parseUnits(amount, 8),
      transactionValue: parseUnits(amount, 18)
    }
  }

  // For all other chains, use native decimals for both
  const nativeAmount = parseNativeAmount(amount, chainId)
  return {
    contractAmount: nativeAmount,
    transactionValue: nativeAmount
  }
}

/**
 * Calculate escrow fee and return amounts for contract and transaction
 * Handles chain-specific decimal conversions
 *
 * @param amount - The base amount as a string
 * @param feePercentage - The fee percentage (e.g., 0.025 for 2.5%)
 * @param chainId - The chain ID
 * @returns Object with fee amounts and totals for both contract and transaction
 */
export function calculateEscrowAmounts(
  amount: string,
  feePercentage: number,
  chainId: number
): {
  baseAmount: { contractAmount: bigint; transactionValue: bigint }
  feeAmount: { contractAmount: bigint; transactionValue: bigint }
  totalAmount: { contractAmount: bigint; transactionValue: bigint }
} {
  // Calculate fee as a string
  const amountAsNumber = parseFloat(amount)
  const feeAsNumber = amountAsNumber * feePercentage
  const totalAsNumber = amountAsNumber + feeAsNumber

  // Get amounts for base, fee, and total
  const base = getEscrowAmounts(amount, chainId)
  const fee = getEscrowAmounts(feeAsNumber.toString(), chainId)
  const total = getEscrowAmounts(totalAsNumber.toString(), chainId)

  return {
    baseAmount: base,
    feeAmount: fee,
    totalAmount: total
  }
}

/**
 * Get the current price of a cryptocurrency from the API
 * This is a client-safe function that calls the backend API
 *
 * @param symbol - The cryptocurrency symbol (e.g., 'ETH', 'BTC')
 * @param coingeckoId - The CoinGecko ID (e.g., 'ethereum', 'bitcoin')
 * @returns The current USD price or null if unavailable
 */
async function getClientSafePrice(
  symbol: string,
  coingeckoId?: string
): Promise<number | null> {
  try {
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol,
        coingeckoId: coingeckoId || symbol.toLowerCase()
      })
    })

    if (!response.ok) {
      console.error('Failed to fetch price:', response.statusText)
      return null
    }

    const data = await response.json()
    return data.price || null
  } catch (error) {
    console.error('Error fetching price:', error)
    return null
  }
}

/**
 * Get subscription payment amount for transaction value
 * Handles Hedera's special case where JSON-RPC converts msg.value from 18 to 8 decimals
 *
 * @param amount - The amount as a string (e.g., "100.5")
 * @param chainId - The chain ID
 * @returns The transaction value for msg.value
 */
export function getSubscriptionAmount(amount: string, chainId: number): bigint {
  if (isHederaChain(chainId)) {
    // For Hedera: Transaction value needs 18 decimals (will be converted by JSON-RPC to 8)
    return parseUnits(amount, 18)
  }

  // For all other chains, use native decimals
  return parseNativeAmount(amount, chainId)
}

/**
 * Convert USD amount to native token smallest unit (wei, tinybar, etc.)
 * Client-safe version that fetches prices from API
 *
 * @param usdAmount - The USD amount to convert
 * @param chainId - The chain ID
 * @returns The amount in smallest units as bigint
 */
export async function convertUSDToWei(
  usdAmount: number,
  chainId: number
): Promise<bigint> {
  if (usdAmount === 0) {
    return BigInt(0)
  }

  try {
    // Import blockchain utilities dynamically to avoid circular dependencies
    const { getNativeCurrencySymbol, getCoingeckoPriceId } = await import(
      '@/lib/blockchain'
    )

    const coingeckoId = getCoingeckoPriceId(chainId)
    const symbol = getNativeCurrencySymbol(chainId)

    const price = await getClientSafePrice(symbol, coingeckoId)

    if (!price || price <= 0) {
      throw new Error('Unable to fetch current price')
    }

    const nativeAmount = usdAmount / price
    return parseNativeAmount(nativeAmount.toString(), chainId)
  } catch (error) {
    throw new Error(
      `Failed to convert USD to Wei: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Convert native token smallest unit to USD
 * Client-safe version that fetches prices from API
 *
 * @param weiAmount - The amount in smallest units
 * @param chainId - The chain ID
 * @returns The USD amount
 */
export async function convertWeiToUSD(
  weiAmount: bigint,
  chainId: number
): Promise<number> {
  if (weiAmount === BigInt(0)) {
    return 0
  }

  try {
    // Import blockchain utilities dynamically to avoid circular dependencies
    const { getNativeCurrencySymbol, getCoingeckoPriceId } = await import(
      '@/lib/blockchain'
    )

    const coingeckoId = getCoingeckoPriceId(chainId)
    const symbol = getNativeCurrencySymbol(chainId)

    const price = await getClientSafePrice(symbol, coingeckoId)

    if (!price || price <= 0) {
      throw new Error('Unable to fetch current price')
    }

    const nativeAmount = Number(formatNativeAmount(weiAmount, chainId))
    return nativeAmount * price
  } catch (error) {
    throw new Error(
      `Failed to convert Wei to USD: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
