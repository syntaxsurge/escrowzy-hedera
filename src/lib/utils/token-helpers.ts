import { NATIVE_TOKEN_ADDRESS, ZERO_ADDRESS } from 'thirdweb'

import { okxDexClient } from '@/lib/api/okx-dex-client'

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
    // Native token (ETH, BNB, MATIC, etc.) always has 18 decimals
    if (
      !tokenAddress ||
      tokenAddress === '0x0' ||
      tokenAddress.toLowerCase() === ZERO_ADDRESS ||
      tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS
    ) {
      return 18
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
    return 18 // Default fallback
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
