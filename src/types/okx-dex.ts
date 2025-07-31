// OKX DEX API Types and Interfaces

// Base Types
export interface OKXBaseResponse<T = any> {
  code: string
  msg: string
  data: T
}

// Token Types
export interface OKXTokenInfo {
  tokenSymbol: string
  tokenName: string
  tokenContractAddress: string
  tokenDecimals: string
  tokenLogo?: string
  tokenLogoUrl?: string
  tokenPrice?: string
  tokenPriceUsd?: string
}

export interface OKXBalanceInfo extends OKXTokenInfo {
  chainId: string
  balance: string
  balanceUsd: string
}

// Liquidity Types
export interface OKXLiquiditySource {
  id: string
  name: string
  logo: string
}

// Quote Types
export interface OKXQuoteRequest {
  chainIndex: string
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
  slippage?: string
  userWalletAddress?: string
  swapMode?: 'exactIn' | 'exactOut'
  dexIds?: string
  priceImpactProtectionPercentage?: string
  feePercent?: string
}

export interface OKXQuoteResponse {
  toAmount?: string
  toTokenAmount?: string
  exchangeRate?: string
  priceImpact?: number
  priceImpactPercentage?: string
  estimatedGas?: string
  estimateGasFee?: string
  tradeFee?: string
  route?: string
  liquiditySources?: OKXLiquiditySource[]
  dexRouterList?: any[]
  fromToken?: any
  toToken?: any
  quoteCompareList?: any[]
  routerResult?: any
}

// Swap Types
export interface OKXSwapRequest {
  chainIndex: string
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
  slippage: string
  userWalletAddress: string
  swapReceiverAddress?: string
  referrerAddress?: string
  feePercent?: string
  swapMode?: 'exactIn' | 'exactOut'
  priceImpactProtectionPercentage?: string
  gasLevel?: string
}

export interface OKXSwapResponse {
  tx?: {
    to: string
    from?: string
    value: string
    data: string
    gas?: string
    gasPrice?: string
    maxPriorityFeePerGas?: string
    minReceiveAmount?: string
    signatureData?: any[]
  }
  routerResult?: {
    fromToken?: OKXTokenInfo
    toToken?: OKXTokenInfo
    fromTokenAmount?: string
    toTokenAmount?: string
    estimatedGas?: string
  }
  data?: {
    tx?: any
    fromToken?: OKXTokenInfo
    toToken?: OKXTokenInfo
    fromAmount?: string
    toAmount?: string
    estimatedGas?: string
    protocols?: Array<{
      name: string
      part: number
    }>
  }
}

// Approve Types
export interface OKXApproveRequest {
  chainIndex: string
  tokenContractAddress: string
  approveAmount: string
}

export interface OKXApproveResponse {
  to: string
  value: string
  data: string
  gasLimit?: string
}

// Price Types
export interface OKXPriceRequest {
  chainIds: string
}

export interface OKXPriceResponse {
  [tokenAddress: string]: {
    price: string
    priceUsd: string
    chainId: string
  }
}

export interface OKXPriceResult {
  price: number | null
  error?: {
    type:
      | 'rate_limit'
      | 'chain_not_supported'
      | 'token_not_found'
      | 'api_error'
      | 'credentials_missing'
      | 'network_error'
    message: string
  }
}

export interface OKXMarketData {
  tokenAddress: string
  chainId: string
  price: number
  marketCap?: number
  priceChange24h?: number
  volume24h?: number
}

// Chain Types
export interface OKXChain {
  chainId: string
  chainName: string
  chainLogo?: string
  explorerUrl?: string
  rpcUrl?: string
}

// API Error Types
export interface OKXAPIError {
  code: string
  message: string
  details?: any
}

// Request Configuration Types
export interface OKXRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
  timeout?: number
  priority?: number // Queue priority (higher = earlier execution)
}

// Response Types for specific endpoints
export interface GetSupportedChainsResponse {
  chains: OKXChain[]
}

export interface GetLiquiditySourcesResponse {
  liquiditySources: OKXLiquiditySource[]
}

export interface GetAllTokensResponse {
  tokens: OKXTokenInfo[]
}

export interface GetTokenBalanceResponse {
  balances: OKXBalanceInfo[]
}

export interface GetQuoteResponse extends OKXQuoteResponse {}

export interface GetSwapDataResponse extends OKXSwapResponse {}

export interface GetApproveTransactionResponse extends OKXApproveResponse {}

export interface GetTokenPriceResponse extends OKXPriceResponse {}

// Transaction Status Types
export interface OKXTransactionStatus {
  txHash: string
  status: 'pending' | 'success' | 'failed'
  blockNumber?: number
  confirmations?: number
  gasUsed?: string
}

// Aggregated Types for UI
export interface SwapQuote {
  fromToken: OKXTokenInfo
  toToken: OKXTokenInfo
  fromAmount: string
  toAmount: string
  exchangeRate: string
  priceImpact: number
  estimatedGas: string
  route: string
  liquiditySources: OKXLiquiditySource[]
}

export interface SwapTransaction {
  to: string
  value: string
  data: string
  gas?: string
  gasPrice?: string
  quote: SwapQuote
}

// Filter and Sorting Types
export interface TokenFilter {
  searchQuery?: string
  hasBalance?: boolean
  minBalance?: string
  sortBy?: 'symbol' | 'balance' | 'value'
  sortOrder?: 'asc' | 'desc'
}

// Constants
export const OKX_SUPPORTED_CHAINS = {
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  OPTIMISM: '10',
  AVALANCHE: '43114',
  BASE: '8453',
  LINEA: '59144',
  ZKSYNC: '324',
  SCROLL: '534352',
  MANTA: '169',
  BLAST: '81457',
  MANTLE: '5000',
  GNOSIS: '100',
  CELO: '42220',
  KLAYTN: '8217',
  AURORA: '1313161554',
  CRONOS: '25',
  MOONBEAM: '1284',
  MOONRIVER: '1285',
  METIS: '1088',
  CORE: '1116'
} as const

export type OKXSupportedChainId =
  (typeof OKX_SUPPORTED_CHAINS)[keyof typeof OKX_SUPPORTED_CHAINS]

// Utility Types
export type OKXChainConfig = {
  [key in OKXSupportedChainId]: {
    name: string
    nativeCurrency: {
      name: string
      symbol: string
      decimals: number
    }
    rpcUrl: string
    explorerUrl: string
  }
}
