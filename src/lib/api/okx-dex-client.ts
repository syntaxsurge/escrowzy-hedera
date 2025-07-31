import { unstable_cache } from 'next/cache'

import { NATIVE_TOKEN_ADDRESS, ZERO_ADDRESS } from 'thirdweb'

import {
  getChainIdByName,
  getChainName,
  getChainNativeCurrency,
  isChainSupportedByOKX
} from '@/lib/config/chain-mappings'
import { HttpStatusError } from '@/lib/network/http-status-error'
import { OKXQueueManager } from '@/lib/network/okx-queue-manager'
import { OKXServerQueue } from '@/lib/network/okx-server-queue'
import type {
  OKXMarketData,
  OKXPriceResult,
  OKXTokenInfo,
  OKXQuoteResponse,
  SwapTransaction,
  TokenFilter,
  OKXRequestConfig
} from '@/types/okx-dex'

// Cache configuration
const CACHE_DURATION = {
  CHAINS: 3600, // 1 hour for chain data
  PRICE: 60, // 1 minute for prices
  TOKENS: 300, // 5 minutes for token lists
  BALANCE: 30 // 30 seconds for balances
} as const

/**
 * Base class that will be extended
 * We use a placeholder that matches the shape we need
 */
let BaseAPIClass: any

// Only import the appropriate class based on environment
if (typeof window === 'undefined') {
  // Server-side: import the server version
  const { OKXDexAPIServer } = require('./okx-dex-api-server')
  BaseAPIClass = OKXDexAPIServer
} else {
  // Client-side: import the browser version
  const { OKXDexAPIBrowser } = require('./okx-dex-api-browser')
  BaseAPIClass = OKXDexAPIBrowser
}

/**
 * OKX DEX Client with helper methods and caching
 * Extends the appropriate base API class based on environment
 */
export class OKXDexClient extends BaseAPIClass {
  private static instance: OKXDexClient | null = null
  private queueManager: OKXQueueManager | null = null
  private serverQueue: OKXServerQueue | null = null

  /**
   * Get singleton instance
   */
  public static getInstance(): OKXDexClient {
    if (!OKXDexClient.instance) {
      OKXDexClient.instance = new OKXDexClient()
    }
    return OKXDexClient.instance
  }

  /**
   * Initialize queue manager for client-side usage
   */
  private getQueueManager(): OKXQueueManager | null {
    if (typeof window !== 'undefined' && !this.queueManager) {
      this.queueManager = OKXQueueManager.getInstance()
    }
    return this.queueManager
  }

  /**
   * Get server queue for server-side usage
   */
  private getServerQueue(): OKXServerQueue {
    if (!this.serverQueue) {
      this.serverQueue = OKXServerQueue.getInstance()
    }
    return this.serverQueue
  }

  /**
   * Convert native token address to OKX format
   */
  public normalizeTokenAddress(address: string): string {
    if (!address || address === '0x0' || address === ZERO_ADDRESS) {
      return NATIVE_TOKEN_ADDRESS
    }
    return address.toLowerCase()
  }

  /**
   * Check if token is native
   */
  public isNativeToken(address: string): boolean {
    return (
      !address ||
      address === '0x0' ||
      address === ZERO_ADDRESS ||
      address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
    )
  }

  /**
   * Get cached supported chains
   */
  public async getCachedSupportedChains() {
    const getChainsWithCache = unstable_cache(
      async () => this.getSupportedChains(),
      ['okx-supported-chains'],
      {
        revalidate: CACHE_DURATION.CHAINS,
        tags: ['okx-chains']
      }
    )
    return getChainsWithCache()
  }

  /**
   * Get cached token list
   */
  public async getCachedTokenList(chainId: string) {
    const getTokensWithCache = unstable_cache(
      async () => this.getAllTokens(chainId).then((res: any) => res.tokens),
      [`okx-tokens-${chainId}`],
      {
        revalidate: CACHE_DURATION.TOKENS,
        tags: [`okx-tokens-${chainId}`]
      }
    )
    return getTokensWithCache()
  }

  /**
   * Get cached token price with error handling
   */
  public async getCachedTokenPrice(
    tokenAddress: string,
    chainId: string
  ): Promise<OKXPriceResult> {
    try {
      const normalizedAddress = this.normalizeTokenAddress(tokenAddress)

      const getPriceWithCache = unstable_cache(
        async () => this.getTokenPrice(normalizedAddress, chainId),
        [`okx-price-${chainId}-${normalizedAddress}`],
        {
          revalidate: CACHE_DURATION.PRICE,
          tags: [`okx-price-${chainId}`, 'okx-prices']
        }
      )

      const price = await getPriceWithCache()
      return { price }
    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes('rate limit')) {
        return {
          price: null,
          error: {
            type: 'rate_limit',
            message: 'Rate limit exceeded. Please try again later.'
          }
        }
      }

      if (error.message?.includes('chain not supported')) {
        return {
          price: null,
          error: {
            type: 'chain_not_supported',
            message: `Chain ${chainId} is not supported by OKX`
          }
        }
      }

      return {
        price: null,
        error: {
          type: 'api_error',
          message: error.message || 'Failed to fetch token price'
        }
      }
    }
  }

  /**
   * Get market data with additional calculations
   */
  public async getMarketData(
    tokenAddress: string,
    chainId: string
  ): Promise<OKXMarketData | null> {
    try {
      const priceInfo = await this.getMarketPriceInfo(tokenAddress, chainId)

      return {
        tokenAddress: tokenAddress.toLowerCase(),
        chainId,
        price: parseFloat(priceInfo.price),
        marketCap: priceInfo.marketCap
          ? parseFloat(priceInfo.marketCap)
          : undefined,
        priceChange24h: priceInfo.priceChange24H
          ? parseFloat(priceInfo.priceChange24H)
          : undefined,
        volume24h: priceInfo.volume24H
          ? parseFloat(priceInfo.volume24H)
          : undefined
      }
    } catch (error) {
      console.error('Failed to get market data:', error)
      return null
    }
  }

  /**
   * Filter and sort tokens based on criteria
   */
  public filterTokens(
    tokens: OKXTokenInfo[],
    filter: TokenFilter
  ): OKXTokenInfo[] {
    let filtered = [...tokens]

    // Apply search filter
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      filtered = filtered.filter(
        token =>
          token.tokenSymbol.toLowerCase().includes(query) ||
          token.tokenName.toLowerCase().includes(query) ||
          token.tokenContractAddress.toLowerCase().includes(query)
      )
    }

    // Sort tokens
    if (filter.sortBy) {
      filtered.sort((a, b) => {
        const order = filter.sortOrder === 'desc' ? -1 : 1

        switch (filter.sortBy) {
          case 'symbol':
            return order * a.tokenSymbol.localeCompare(b.tokenSymbol)
          default:
            return 0
        }
      })
    }

    return filtered
  }

  /**
   * Get popular tokens for a chain
   */
  public async getPopularTokens(chainId: string): Promise<OKXTokenInfo[]> {
    try {
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      const allTokens = await this.getCachedTokenList(chainId)

      // If we get all tokens, return them all (not just popular ones)
      // This ensures users can see and select from all available tokens
      if (allTokens && allTokens.length > 0) {
        console.log(`Fetched ${allTokens.length} tokens for chain ${chainId}`)
        return allTokens
      }

      // Fallback to empty array if no tokens found
      console.warn(`No tokens found for chain ${chainId}`)
      return []
    } catch (error) {
      console.error('Failed to get popular tokens:', error)
      return []
    }
  }

  /**
   * Build swap transaction from quote
   */
  public async buildSwapTransaction(
    quote: OKXQuoteResponse,
    _userAddress: string
  ): Promise<SwapTransaction | null> {
    try {
      // This is a placeholder implementation
      // Would need to fetch token info and make actual swap endpoint call
      console.log('Building swap transaction from quote:', quote)
      return null
    } catch (error) {
      console.error('Failed to build swap transaction:', error)
      return null
    }
  }

  /**
   * Validate swap parameters
   */
  public validateSwapParams(params: {
    fromToken: string
    toToken: string
    amount: string
    slippage: number
  }): { valid: boolean; error?: string } {
    // Validate addresses
    if (!params.fromToken || !params.toToken) {
      return { valid: false, error: 'Token addresses are required' }
    }

    // Validate amount
    const amount = parseFloat(params.amount)
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: 'Invalid swap amount' }
    }

    // Validate slippage
    if (params.slippage < 0.01 || params.slippage > 50) {
      return { valid: false, error: 'Slippage must be between 0.01% and 50%' }
    }

    // Check if swapping same token
    if (params.fromToken.toLowerCase() === params.toToken.toLowerCase()) {
      return { valid: false, error: 'Cannot swap same token' }
    }

    return { valid: true }
  }

  /**
   * Calculate price impact
   */
  public calculatePriceImpact(
    inputAmount: number,
    outputAmount: number,
    marketPrice: number
  ): number {
    const expectedOutput = inputAmount * marketPrice
    const priceImpact = ((expectedOutput - outputAmount) / expectedOutput) * 100
    return Math.abs(priceImpact)
  }

  /**
   * Format balance for display
   */
  public formatBalance(balance: string, decimals: number): string {
    const value = parseFloat(balance) / Math.pow(10, decimals)

    if (value === 0) return '0'
    if (value < 0.0001) return '< 0.0001'
    if (value < 1) return value.toFixed(4)
    if (value < 100) return value.toFixed(2)

    return value.toLocaleString(undefined, {
      maximumFractionDigits: 0
    })
  }

  /**
   * Get chain native currency info
   */
  public getChainNativeCurrency(chainId: string): {
    symbol: string
    decimals: number
  } {
    return getChainNativeCurrency(chainId)
  }

  /**
   * Clear all caches
   */
  public async clearCache(): Promise<void> {
    // This would need to be implemented with your cache strategy
    console.log('Cache cleared')
  }

  /**
   * Get queue status (client-side only)
   */
  public getQueueStatus() {
    const queueManager = this.getQueueManager()
    return queueManager?.getQueueStatus() || null
  }

  /**
   * Add queue status listener (client-side only)
   */
  public addQueueStatusListener(listener: (status: any) => void) {
    const queueManager = this.getQueueManager()
    return queueManager?.addStatusListener(listener) || (() => {})
  }

  /**
   * Clear the request queue (client-side only)
   */
  public clearRequestQueue() {
    const queueManager = this.getQueueManager()
    queueManager?.clearQueue()
  }

  /**
   * Generate signature for OKX API request
   */
  protected generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body?: string
  ): string {
    // Only generate signatures on server-side
    if (typeof window !== 'undefined') {
      return ''
    }

    if (!this.apiSecret) {
      return ''
    }

    // Build the message to sign according to OKX specifications
    // Format: timestamp + method + requestPath + body
    const message =
      timestamp + method.toUpperCase() + requestPath + (body || '')

    try {
      // Dynamic import for server-side only
      const crypto = require('crypto')
      const hmac = crypto.createHmac('sha256', this.apiSecret)
      hmac.update(message)
      return hmac.digest('base64')
    } catch (error) {
      console.error('Error generating signature:', error)
      return ''
    }
  }

  /**
   * Makes a request to the OKX API or our API routes
   */
  protected async request<T>(
    endpoint: string,
    config?: OKXRequestConfig
  ): Promise<T> {
    // On client-side, use our API routes
    if (typeof window !== 'undefined') {
      const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      const options: RequestInit = {
        method: config?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config?.headers
        }
      }

      if (config?.body) {
        options.body = JSON.stringify(config.body)
      }

      const response = await fetch(url, options)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      return data
    }

    // Use queue manager on client side (this won't be reached due to the check above)
    const queueManager = this.getQueueManager()

    if (queueManager && typeof window !== 'undefined') {
      // Client-side: Use queue manager
      return queueManager.makeRequest<T>(
        this.baseUrl,
        this.basePath,
        endpoint,
        config,
        (timestamp, method, requestPath, body) =>
          this.generateSignature(timestamp, method, requestPath, body),
        {
          apiKey: this.apiKey,
          apiSecret: this.apiSecret,
          apiPassphrase: this.apiPassphrase
        }
      )
    }

    // Server-side: Use server queue
    const serverQueue = this.getServerQueue()
    return serverQueue.add(async () => {
      const url = new URL(`${this.basePath}${endpoint}`, this.baseUrl)

      // Add query parameters if present
      if (config?.params) {
        Object.entries(config.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }

      const timestamp = new Date().toISOString()
      const method = config?.method || 'GET'
      const requestPath = `${this.basePath}${endpoint}${url.search}`
      const body = config?.body ? JSON.stringify(config.body) : undefined

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config?.headers
      }

      // Add API credentials if available
      if (this.apiKey && this.apiSecret && this.apiPassphrase) {
        headers['OK-ACCESS-KEY'] = this.apiKey
        headers['OK-ACCESS-SIGN'] = this.generateSignature(
          timestamp,
          method,
          requestPath,
          body
        )
        headers['OK-ACCESS-TIMESTAMP'] = timestamp
        headers['OK-ACCESS-PASSPHRASE'] = this.apiPassphrase
      }

      const options: RequestInit = {
        method,
        headers,
        ...(body && { body })
      }

      const response = await fetch(url.toString(), options)
      const data = await response.json()

      // Check for successful response
      if (!response.ok || (data.code !== '0' && data.code !== 0)) {
        // Create HttpStatusError for proper retry handling
        if (
          data.msg?.includes('Too Many Requests') ||
          response.status === 429
        ) {
          throw new HttpStatusError(
            429,
            'Too Many Requests',
            'Rate limit exceeded. Please try again later.'
          )
        }
        throw new HttpStatusError(
          response.status,
          response.statusText,
          data.msg || data.error_message || 'API request failed'
        )
      }

      return data
    })
  }

  // ============================================
  // Helper methods for backward compatibility
  // ============================================

  /**
   * Get chain ID from chain name
   */
  public getChainId(chainName: string): string | null {
    return getChainIdByName(chainName)
  }

  /**
   * Get chain name from chain ID
   */
  public getChainNameFromId(chainId: string | number): string {
    return getChainName(chainId)
  }

  /**
   * Check if chain is supported
   */
  public isChainSupported(chainId: string | number): boolean {
    return isChainSupportedByOKX(chainId)
  }

  /**
   * Get token balances (wrapper for getAllTokenBalances)
   */
  public async getTokenBalances(address: string, chainId: string) {
    const response = await this.getAllTokenBalances(address, chainId)
    return response.balances
  }

  /**
   * Get swap quote (wrapper for getQuote)
   */
  public async getSwapQuote(params: {
    fromTokenAddress: string
    toTokenAddress: string
    amount: string
    chainId: string
    slippage?: string
  }) {
    try {
      const quoteData = await this.getQuote({
        chainIndex: params.chainId,
        fromTokenAddress: this.normalizeTokenAddress(params.fromTokenAddress),
        toTokenAddress: this.normalizeTokenAddress(params.toTokenAddress),
        amount: params.amount,
        slippage: params.slippage
      })

      // Parse OKX response and return formatted data
      return {
        fromAmount: params.amount,
        toAmount: quoteData.toTokenAmount || quoteData.toAmount || '0',
        priceImpact: parseFloat(quoteData.priceImpactPercentage || '0'),
        estimatedGas: quoteData.tradeFee || quoteData.estimatedGas || '0',
        route: this.formatRouteInfo(quoteData.dexRouterList),
        exchangeRate: this.calculateExchangeRate(
          params.amount,
          quoteData.toTokenAmount || quoteData.toAmount
        ),
        liquiditySources: this.extractLiquiditySources(quoteData.dexRouterList),
        fromToken: quoteData.fromToken,
        toToken: quoteData.toToken,
        estimateGasFee: quoteData.estimateGasFee || quoteData.estimatedGas,
        quoteCompareList: quoteData.quoteCompareList
      }
    } catch (error) {
      console.error('Failed to get quote:', error)
      return null
    }
  }

  /**
   * Format route information from DEX router list
   */
  private formatRouteInfo(dexRouterList?: any[]): string {
    if (!dexRouterList || dexRouterList.length === 0) return 'Direct'

    const routes = dexRouterList.map(route => {
      if (route.subRouterList && route.subRouterList[0]?.dexProtocol) {
        const protocols = route.subRouterList[0].dexProtocol
          .map((p: any) => `${p.dexName} (${p.percent}%)`)
          .join(' → ')
        return protocols
      }
      return 'Unknown'
    })

    return routes.join(', ')
  }

  /**
   * Calculate exchange rate from amounts
   */
  private calculateExchangeRate(fromAmount: string, toAmount?: string): string {
    if (!toAmount || !fromAmount) return '0'
    const from = parseFloat(fromAmount)
    const to = parseFloat(toAmount)
    if (from === 0) return '0'
    return (to / from).toFixed(6)
  }

  /**
   * Extract liquidity sources from router list
   */
  private extractLiquiditySources(dexRouterList?: any[]): string[] {
    if (!dexRouterList || dexRouterList.length === 0) return []

    const sources = new Set<string>()
    dexRouterList.forEach(route => {
      if (route.subRouterList) {
        route.subRouterList.forEach((subRoute: any) => {
          if (subRoute.dexProtocol) {
            subRoute.dexProtocol.forEach((protocol: any) => {
              sources.add(protocol.dexName)
            })
          }
        })
      }
    })

    return Array.from(sources)
  }

  /**
   * Execute swap (wrapper for getSwapData)
   */
  public async executeSwap(params: {
    chainId: string
    fromTokenAddress: string
    toTokenAddress: string
    amount: string
    slippage: string
    userWalletAddress: string
    referrerAddress?: string
  }) {
    try {
      const swapData = await this.getSwapData({
        chainIndex: params.chainId,
        fromTokenAddress: this.normalizeTokenAddress(params.fromTokenAddress),
        toTokenAddress: this.normalizeTokenAddress(params.toTokenAddress),
        amount: params.amount,
        slippage: params.slippage,
        userWalletAddress: params.userWalletAddress,
        referrerAddress: params.referrerAddress
      })

      // Return formatted swap data with transaction details
      return {
        success: true,
        data: {
          tx: swapData.tx,
          routerResult: swapData.routerResult,
          toAmount:
            swapData.routerResult?.toTokenAmount ||
            swapData.data?.toAmount ||
            swapData.tx?.minReceiveAmount ||
            '0'
        }
      }
    } catch (error) {
      console.error('Failed to execute swap:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get swap data'
      }
    }
  }

  /**
   * Get OKX market price (wrapper)
   */
  public async getOKXMarketPrice(tokenAddress: string, chainId: string) {
    return this.getCachedTokenPrice(tokenAddress, chainId)
  }
}

// Export singleton instance
export const okxDexClient = OKXDexClient.getInstance()
