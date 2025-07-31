import { apiEndpoints } from '@/config/api-endpoints'
import { envServer } from '@/config/env.server'
import { getChainIndex } from '@/lib/config/chain-mappings'
import type {
  OKXBaseResponse,
  OKXTokenInfo,
  OKXBalanceInfo,
  OKXLiquiditySource,
  OKXQuoteRequest,
  OKXSwapRequest,
  OKXApproveRequest,
  OKXApproveResponse,
  OKXPriceResponse,
  OKXChain,
  OKXRequestConfig,
  GetSupportedChainsResponse,
  GetLiquiditySourcesResponse,
  GetAllTokensResponse,
  GetTokenBalanceResponse,
  GetQuoteResponse,
  GetSwapDataResponse,
  GetApproveTransactionResponse,
  GetTokenPriceResponse,
  OKXTransactionStatus
} from '@/types/okx-dex'

/**
 * Abstract base class for OKX DEX API interactions
 * Contains only pure API endpoint methods
 */
export abstract class OKXDexAPIServer {
  protected readonly baseUrl: string
  protected readonly basePath: string
  protected readonly apiKey?: string
  protected readonly apiSecret?: string
  protected readonly apiPassphrase?: string

  constructor(config?: {
    apiKey?: string
    apiSecret?: string
    apiPassphrase?: string
    baseUrl?: string
  }) {
    this.baseUrl = config?.baseUrl || apiEndpoints.external.okxDex.baseUrl
    this.basePath = apiEndpoints.external.okxDex.basePath
    this.apiKey = config?.apiKey || envServer.OKX_DEX_API_KEY
    this.apiSecret = config?.apiSecret || envServer.OKX_DEX_SECRET_KEY
    this.apiPassphrase = config?.apiPassphrase || envServer.OKX_DEX_PASSPHRASE
  }

  /**
   * Abstract method for making requests to the OKX API
   * Must be implemented by subclasses
   */
  protected abstract request<T>(
    endpoint: string,
    config?: OKXRequestConfig
  ): Promise<T>

  // ============================================
  // Chain & Infrastructure Endpoints
  // ============================================

  /**
   * Get supported chains
   */
  async getSupportedChains(): Promise<GetSupportedChainsResponse> {
    const response = await this.request<OKXBaseResponse<OKXChain[]>>(
      apiEndpoints.external.okxDex.endpoints.supportedChains
    )
    return { chains: response.data }
  }

  /**
   * Get chain information
   */
  async getChainInfo(chainId: string): Promise<OKXChain> {
    const response = await this.request<OKXBaseResponse<OKXChain>>(
      apiEndpoints.external.okxDex.endpoints.chainInfo,
      { params: { chainId } }
    )
    return response.data
  }

  // ============================================
  // Token Endpoints
  // ============================================

  /**
   * Get token list for a specific chain
   */
  async getTokenList(chainId: string): Promise<OKXTokenInfo[]> {
    const chainIndex = getChainIndex(chainId)
    const response = await this.request<OKXBaseResponse<OKXTokenInfo[]>>(
      apiEndpoints.external.okxDex.endpoints.allTokens,
      { params: { chainIndex } }
    )
    return response.data
  }

  /**
   * Get all available tokens across all chains
   */
  async getAllTokens(chainId?: string): Promise<GetAllTokensResponse> {
    if (chainId) {
      const chainIndex = getChainIndex(chainId)
      const response = await this.request<OKXBaseResponse<OKXTokenInfo[]>>(
        apiEndpoints.external.okxDex.endpoints.allTokens,
        { params: { chainIndex } }
      )
      return { tokens: response.data }
    }
    const response = await this.request<OKXBaseResponse<OKXTokenInfo[]>>(
      apiEndpoints.external.okxDex.endpoints.allTokens
    )
    return { tokens: response.data }
  }

  /**
   * Search for tokens
   */
  async searchTokens(chainId: string, query?: string): Promise<OKXTokenInfo[]> {
    const chainIndex = getChainIndex(chainId)
    // Use the all-tokens endpoint with filtering on the client side
    const response = await this.request<OKXBaseResponse<OKXTokenInfo[]>>(
      apiEndpoints.external.okxDex.endpoints.allTokens,
      { params: { chainIndex } }
    )

    console.log(
      `Fetched ${response.data?.length || 0} tokens for search on chain ${chainId}`
    )

    // Filter tokens if query is provided
    if (query) {
      const searchQuery = query.toLowerCase()
      const filtered = response.data.filter(
        token =>
          token.tokenSymbol.toLowerCase().includes(searchQuery) ||
          token.tokenName.toLowerCase().includes(searchQuery) ||
          token.tokenContractAddress.toLowerCase().includes(searchQuery)
      )
      console.log(`Found ${filtered.length} tokens matching query: ${query}`)
      return filtered
    }

    return response.data
  }

  // ============================================
  // Balance Endpoints
  // ============================================

  /**
   * Get specific token balance for an address
   */
  async getTokenBalance(
    address: string,
    tokenAddress: string,
    chainId: string
  ): Promise<OKXBalanceInfo> {
    const chainIndex = getChainIndex(chainId)
    // For single token balance, we still use chainIndex according to docs
    const response = await this.request<OKXBaseResponse<OKXBalanceInfo>>(
      apiEndpoints.external.okxDex.endpoints.balance,
      { params: { address, tokenAddress, chainIndex } }
    )
    return response.data
  }

  /**
   * Get all token balances for an address
   */
  async getAllTokenBalances(
    address: string,
    chainId: string
  ): Promise<GetTokenBalanceResponse> {
    const chainIndex = getChainIndex(chainId)
    // According to OKX docs, balance API requires 'chains' parameter
    const response = await this.request<OKXBaseResponse<any>>(
      apiEndpoints.external.okxDex.endpoints.balanceAll,
      { params: { address, chains: chainIndex } }
    )
    // The response contains tokenAssets array
    const tokenAssets = response.data?.[0]?.tokenAssets || []
    return { balances: tokenAssets }
  }

  // ============================================
  // Price Endpoints
  // ============================================

  /**
   * Get token price
   */
  async getTokenPrice(tokenAddress: string, chainId: string): Promise<number> {
    const chainIndex = getChainIndex(chainId)
    const response = await this.request<OKXBaseResponse<any[]>>(
      apiEndpoints.external.okxDex.endpoints.marketPrice,
      {
        method: 'POST',
        body: [
          {
            chainIndex,
            tokenContractAddress: tokenAddress
          }
        ]
      }
    )
    if (response.data && response.data.length > 0 && response.data[0].price) {
      return parseFloat(response.data[0].price)
    }
    throw new Error('Price not available')
  }

  /**
   * Get batch token prices
   */
  async getBatchTokenPrices(
    tokens: Array<{ tokenAddress: string; chainId: string }>
  ): Promise<GetTokenPriceResponse> {
    const body = tokens.map(token => ({
      chainIndex: getChainIndex(token.chainId),
      tokenContractAddress: token.tokenAddress
    }))
    const response = await this.request<OKXBaseResponse<OKXPriceResponse>>(
      apiEndpoints.external.okxDex.endpoints.marketPriceInfo,
      {
        method: 'POST',
        body
      }
    )
    return response.data
  }

  /**
   * Get detailed market price info
   */
  async getMarketPriceInfo(
    tokenAddress: string,
    chainId: string
  ): Promise<any> {
    const chainIndex = getChainIndex(chainId)
    const response = await this.request<OKXBaseResponse<any[]>>(
      apiEndpoints.external.okxDex.endpoints.marketPriceInfo,
      {
        method: 'POST',
        body: [
          {
            chainIndex,
            tokenContractAddress: tokenAddress
          }
        ]
      }
    )
    return response.data && response.data.length > 0 ? response.data[0] : null
  }

  // ============================================
  // Liquidity Endpoints
  // ============================================

  /**
   * Get available liquidity sources
   */
  async getLiquiditySources(
    chainId: string
  ): Promise<GetLiquiditySourcesResponse> {
    const chainIndex = getChainIndex(chainId)
    const response = await this.request<OKXBaseResponse<OKXLiquiditySource[]>>(
      apiEndpoints.external.okxDex.endpoints.liquiditySources,
      { params: { chainIndex } }
    )
    return { liquiditySources: response.data }
  }

  // ============================================
  // Swap & Quote Endpoints
  // ============================================

  /**
   * Get swap quote
   */
  async getQuote(params: OKXQuoteRequest): Promise<GetQuoteResponse> {
    const chainIndex = getChainIndex(params.chainIndex)
    const response = await this.request<OKXBaseResponse<any[]>>(
      apiEndpoints.external.okxDex.endpoints.quote,
      {
        params: {
          chainIndex,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          amount: params.amount,
          swapMode: params.swapMode || 'exactIn',
          dexIds: params.dexIds,
          priceImpactProtectionPercentage:
            params.priceImpactProtectionPercentage || '0.9',
          feePercent: params.feePercent
        }
      }
    )
    // OKX returns array with single quote object
    const quoteData =
      response.data && response.data[0] ? response.data[0] : null
    if (!quoteData) {
      throw new Error('No quote available')
    }
    return quoteData
  }

  /**
   * Get swap transaction data
   */
  async getSwapData(params: OKXSwapRequest): Promise<GetSwapDataResponse> {
    const chainIndex = getChainIndex(params.chainIndex)
    const response = await this.request<OKXBaseResponse<any[]>>(
      apiEndpoints.external.okxDex.endpoints.swap,
      {
        params: {
          chainIndex,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          amount: params.amount,
          slippage: params.slippage,
          swapMode: params.swapMode || 'exactIn',
          userWalletAddress: params.userWalletAddress,
          swapReceiverAddress:
            params.swapReceiverAddress || params.userWalletAddress,
          feePercent: params.referrerAddress ? '1' : undefined,
          toTokenReferrerWalletAddress: params.referrerAddress,
          priceImpactProtectionPercentage:
            params.priceImpactProtectionPercentage || '0.9',
          gasLevel: params.gasLevel || 'average'
        }
      }
    )
    // OKX returns array with single swap object
    const swapData = response.data && response.data[0] ? response.data[0] : null
    if (!swapData) {
      throw new Error('No swap data available')
    }
    return swapData
  }

  // ============================================
  // Approval Endpoints
  // ============================================

  /**
   * Get approve transaction data
   */
  async getApproveTransaction(
    params: OKXApproveRequest
  ): Promise<GetApproveTransactionResponse> {
    const chainIndex = getChainIndex(params.chainIndex)
    const response = await this.request<OKXBaseResponse<OKXApproveResponse>>(
      apiEndpoints.external.okxDex.endpoints.approveTransaction,
      {
        params: {
          chainIndex,
          tokenContractAddress: params.tokenContractAddress,
          approveAmount: params.approveAmount
        }
      }
    )
    return response.data
  }

  // ============================================
  // Transaction Endpoints
  // ============================================

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    address: string,
    chainId: string,
    limit?: number
  ): Promise<any[]> {
    const chainIndex = getChainIndex(chainId)
    const response = await this.request<OKXBaseResponse<any[]>>(
      apiEndpoints.external.okxDex.endpoints.txHistory,
      {
        params: { address, chainIndex, limit: limit || 20 }
      }
    )
    return response.data
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    txHash: string,
    chainId: string
  ): Promise<OKXTransactionStatus> {
    const chainIndex = getChainIndex(chainId)
    const response = await this.request<OKXBaseResponse<OKXTransactionStatus>>(
      apiEndpoints.external.okxDex.endpoints.txStatus,
      { params: { txHash, chainIndex } }
    )
    return response.data
  }
}
