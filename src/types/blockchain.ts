// Blockchain and Web3 Types

// Network/Chain Types
export interface ChainConfig {
  id: number
  name: string
  shortName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrl: string
  blockExplorer?: string
  testnet?: boolean
  enabled: boolean
}

export interface NetworkState {
  chainId: number | null
  isSupported: boolean
  isConnected: boolean
  chain?: ChainConfig
}

// Wallet Types
export type WalletProvider =
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'injected'
  | 'safe'

export interface WalletState {
  address: string | null
  provider: WalletProvider | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  balance?: WalletBalance
}

export interface WalletBalance {
  value: bigint
  formatted: string
  symbol: string
  decimals: number
}

// Transaction Types
export interface TransactionRequest {
  to: string
  from?: string
  value?: bigint | string
  data?: string
  gasLimit?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
  chainId?: number
}

export interface TransactionReceipt {
  transactionHash: string
  transactionIndex: number
  blockHash: string
  blockNumber: number
  from: string
  to: string | null
  contractAddress: string | null
  cumulativeGasUsed: bigint
  gasUsed: bigint
  effectiveGasPrice: bigint
  status: 'success' | 'reverted'
  logs: TransactionLog[]
}

export interface TransactionLog {
  address: string
  topics: string[]
  data: string
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  logIndex: number
  removed: boolean
}

// Contract Types
export interface ContractInfo {
  address: string
  chainId: number
  abi?: any[]
  deploymentBlock?: number
}

export interface ContractCall {
  contract: ContractInfo
  method: string
  args: any[]
  value?: bigint
}

export interface ContractReadResult<T = any> {
  data?: T
  error?: Error
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
}

export interface ContractWriteResult {
  hash?: string
  error?: Error
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  write: (args?: any) => Promise<void>
}

// Token Types
export interface Token {
  address: string
  chainId: number
  decimals: number
  name: string
  symbol: string
  logoURI?: string
}

export interface TokenBalance extends Token {
  balance: bigint
  formatted: string
  usdValue?: number
}

// Gas Types
export interface GasEstimate {
  gasLimit: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  estimatedCost: bigint
  estimatedCostFormatted: string
}

// Block Types
export interface Block {
  number: number
  hash: string
  parentHash: string
  timestamp: number
  nonce: string
  difficulty: bigint
  gasLimit: bigint
  gasUsed: bigint
  miner: string
  transactions: string[]
}

// ENS Types
export interface ENSProfile {
  name: string | null
  avatar?: string | null
  address: string
  resolver?: string
}

// Signature Types
export interface SignMessageRequest {
  message: string
  account: string
}

export interface SignedMessage {
  signature: string
  message: string
  signer: string
}

// Provider Types
export interface Web3Provider {
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
}

// Error Types
export interface Web3Error extends Error {
  code?: number | string
  data?: any
  reason?: string
}

// Common Error Codes
export const WEB3_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NONCE_TOO_LOW: 'NONCE_TOO_LOW',
  GAS_TOO_LOW: 'GAS_TOO_LOW',
  GAS_TOO_HIGH: 'GAS_TOO_HIGH',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE'
} as const

// Event Types
export interface WalletEvent {
  type: 'connect' | 'disconnect' | 'chainChanged' | 'accountsChanged'
  data?: any
}

export interface TransactionEvent {
  type: 'submitted' | 'pending' | 'confirmed' | 'failed'
  hash?: string
  receipt?: TransactionReceipt
  error?: Web3Error
}

// Hook Return Types
export interface UseWalletReturn extends WalletState {
  connect: (provider?: WalletProvider) => Promise<void>
  disconnect: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
  signMessage: (message: string) => Promise<string>
}

export interface UseContractReturn {
  read: <T = any>(method: string, args?: any[]) => Promise<T>
  write: (method: string, args?: any[], value?: bigint) => Promise<string>
  estimateGas: (
    method: string,
    args?: any[],
    value?: bigint
  ) => Promise<GasEstimate>
  contract: ContractInfo
}

// Utility Types
export type Address = `0x${string}`
export type Hash = `0x${string}`

// Type Guards
export function isAddress(value: any): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

export function isHash(value: any): value is Hash {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value)
}

export function isTransactionReceipt(value: any): value is TransactionReceipt {
  return (
    value &&
    typeof value === 'object' &&
    'transactionHash' in value &&
    'status' in value
  )
}
