import { ethers } from 'ethers'

import {
  getSupportedChainIds,
  getRpcUrl,
  getChainNickname,
  getNativeCurrencySymbol
} from '@/lib/blockchain'

export interface TransactionConfig {
  address: `0x${string}`
  abi: any[]
  functionName: string
  args?: any[]
  value?: bigint
  chainId?: number
}

/**
 * Base contract service for client-side usage
 * This class can be used in both server and client environments
 * It provides methods to generate transaction configs for wagmi/thirdweb hooks
 */
export abstract class BaseContractClientService {
  protected contract: ethers.Contract | null = null
  protected provider: ethers.Provider | null = null
  protected signer?: ethers.Signer
  public contractAddress: string
  protected chainId: number
  protected abi: any[]
  protected contractName: string

  constructor(
    chainId: number,
    contractAddress: string,
    abi: any[],
    contractName: string,
    signerOrProvider?: ethers.Signer | ethers.Provider
  ) {
    this.chainId = chainId
    this.contractAddress = contractAddress
    this.abi = abi
    this.contractName = contractName

    if (!this.contractAddress) {
      throw new Error(
        `${contractName} address not configured for chain ${chainId}`
      )
    }

    // Always initialize ethers for read operations
    // Write operations are handled through wagmi/thirdweb hooks
    this.initializeEthers(signerOrProvider)
  }

  private initializeEthers(signerOrProvider?: ethers.Signer | ethers.Provider) {
    if (signerOrProvider) {
      if ('getAddress' in signerOrProvider) {
        this.signer = signerOrProvider as ethers.Signer
        this.provider = signerOrProvider.provider!
      } else {
        this.provider = signerOrProvider as ethers.Provider
      }
    } else {
      if (!getSupportedChainIds().includes(this.chainId)) {
        throw new Error(`Unsupported chain ID: ${this.chainId}`)
      }

      const rpcUrl = getRpcUrl(this.chainId as any)
      this.provider = new ethers.JsonRpcProvider(rpcUrl)
    }

    this.contract = new ethers.Contract(
      this.contractAddress,
      this.abi,
      this.signer || this.provider
    )
  }

  /**
   * Get transaction config for client-side hooks (wagmi/thirdweb)
   * This is the main method that client code will use instead of importing ABIs
   */
  getTransactionConfig(
    functionName: string,
    args: any[] = [],
    value?: bigint
  ): TransactionConfig {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: this.abi,
      functionName,
      args,
      value,
      chainId: this.chainId
    }
  }

  /**
   * Encode function data for a transaction
   */
  encodeContractFunctionData(functionName: string, args: any[]): string {
    const iface = new ethers.Interface(this.abi)
    return iface.encodeFunctionData(functionName, args)
  }

  /**
   * Get contract info
   */
  async getContractInfo() {
    return {
      address: this.contractAddress,
      chainId: this.chainId,
      chainName: getChainNickname(this.chainId),
      nativeCurrency: getNativeCurrencySymbol(this.chainId),
      abi: this.abi,
      contractName: this.contractName
    }
  }

  /**
   * Decode event log
   */
  decodeEventLog(log: { data: string; topics: readonly string[] }): any {
    try {
      const iface = new ethers.Interface(this.abi)
      return iface.parseLog({
        topics: log.topics as string[],
        data: log.data
      })
    } catch (_error) {
      return null
    }
  }

  /**
   * Get contract events (server-side only)
   */
  protected async getContractEvents(
    eventName?: string,
    fromBlock: bigint | 'earliest' = 'earliest',
    toBlock: bigint | 'latest' = 'latest'
  ): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }

    try {
      const filter = {
        address: this.contractAddress,
        fromBlock,
        toBlock
      }
      const logs = await this.provider.getLogs(filter)
      const decodedLogs = logs
        .map(log => this.decodeEventLog(log))
        .filter(Boolean)

      if (eventName) {
        return decodedLogs.filter(log => log.name === eventName)
      }

      return decodedLogs
    } catch (error) {
      throw error
    }
  }
}
