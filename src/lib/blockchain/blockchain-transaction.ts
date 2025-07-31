import { type PublicClient, createPublicClient, http } from 'viem'

import { buildTxUrl, getChainConfig } from '@/lib/blockchain'

// Cache for public clients
const clientCache = new Map<number, PublicClient>()

export function getPublicClient(chainId: number): PublicClient {
  const cached = clientCache.get(chainId)
  if (cached) return cached

  const networkConfig = getChainConfig(chainId)
  if (!networkConfig) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  // Create a custom chain configuration for viem
  const chain = {
    id: chainId,
    name: networkConfig.name,
    nativeCurrency: networkConfig.nativeCurrency,
    rpcUrls: {
      default: { http: [networkConfig.rpcUrl] }
    },
    blockExplorers: {
      default: {
        name: networkConfig.name,
        url: networkConfig.explorerUrl
      }
    }
  } as const

  const client = createPublicClient({
    chain,
    transport: http()
  })

  clientCache.set(chainId, client)
  return client
}

export interface TransactionStatusResult {
  status: 'pending' | 'confirmed' | 'failed'
  receipt?: {
    status: 'success' | 'reverted'
    blockNumber: bigint
    transactionHash: string
    gasUsed: bigint
  }
  confirmations?: number
  error?: string
}

export async function getTransactionStatus(
  transactionHash: string,
  chainId: number
): Promise<TransactionStatusResult> {
  try {
    const client = getPublicClient(chainId)

    // First, check if transaction exists
    const transaction = await client.getTransaction({
      hash: transactionHash as `0x${string}`
    })

    if (!transaction) {
      return { status: 'pending' }
    }

    // If transaction exists but not mined yet
    if (!transaction.blockNumber) {
      return { status: 'pending' }
    }

    // Get the receipt to check final status
    const receipt = await client.getTransactionReceipt({
      hash: transactionHash as `0x${string}`
    })

    if (!receipt) {
      return { status: 'pending' }
    }

    // Get current block for confirmations
    const currentBlock = await client.getBlockNumber()
    const confirmations = Number(currentBlock - receipt.blockNumber)

    // Transaction is confirmed
    return {
      status: 'confirmed',
      receipt: {
        status: receipt.status === 'success' ? 'success' : 'reverted',
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed
      },
      confirmations
    }
  } catch (error) {
    // Check if it's a revert error
    if (
      error instanceof Error &&
      (error.message.includes('reverted') ||
        error.message.includes('execution reverted'))
    ) {
      return {
        status: 'failed',
        error: 'Transaction reverted'
      }
    }

    // For other errors, we can't determine the status
    return {
      status: 'pending',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function waitForTransactionConfirmation(
  transactionHash: string,
  chainId: number,
  options: {
    pollingInterval?: number
    maxAttempts?: number
    onStatusUpdate?: (status: TransactionStatusResult) => void
  } = {}
): Promise<TransactionStatusResult> {
  const { pollingInterval = 2000, maxAttempts = 60, onStatusUpdate } = options

  let attempts = 0

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      attempts++

      try {
        const status = await getTransactionStatus(transactionHash, chainId)

        // Notify about status update
        onStatusUpdate?.(status)

        // If confirmed or failed, we're done
        if (status.status === 'confirmed' || status.status === 'failed') {
          resolve(status)
          return
        }

        // If we've exceeded max attempts, reject
        if (attempts >= maxAttempts) {
          reject(
            new Error(
              `Transaction confirmation timeout after ${maxAttempts} attempts`
            )
          )
          return
        }

        // Otherwise, continue polling
        setTimeout(checkStatus, pollingInterval)
      } catch (error) {
        reject(error)
      }
    }

    // Start checking
    checkStatus()
  })
}

// Helper to get block explorer URL
export function getBlockExplorerUrl(
  transactionHash: string,
  chainId: number
): string | null {
  const url = buildTxUrl(chainId, transactionHash)
  return url === '#' ? null : url
}
