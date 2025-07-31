'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'

import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useDisconnect as useThirdwebDisconnect
} from 'thirdweb/react'
import { formatUnits } from 'viem'
import {
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
  useWalletClient
} from 'wagmi'

import { getWalletProvider, WalletProviders } from '@/config/wallet-provider'
import { getChainConfig, getNativeCurrencySymbol } from '@/lib/blockchain'
import { thirdwebClient } from '@/lib/blockchain/thirdweb-client'

interface TransactionRequest {
  to: `0x${string}`
  data?: `0x${string}`
  value?: bigint
  gas?: bigint
  gasPrice?: bigint
  account?: `0x${string}`
  chain?: any
}

interface BlockchainContextValue {
  // Wallet info
  address?: string
  isConnected: boolean
  balance?: any
  formattedBalance: string
  disconnect: () => void

  // Chain info
  chainId?: number

  // Auth functions
  signMessage: (message: string) => Promise<string>

  // Transaction functions
  walletClient?: any
  switchChain?: (chainId: number) => Promise<void>
  sendTransaction?: (request: TransactionRequest) => Promise<`0x${string}`>

  // Account change detection
  onAddressChange?: (
    callback: (newAddress?: string, oldAddress?: string) => void
  ) => void

  // Native balance info
  nativeBalance?: {
    value: bigint
    decimals: number
    symbol: string
    formatted: string
  }
}

const BlockchainContext = createContext<BlockchainContextValue | null>(null)

// ThirdWeb implementation
function ThirdwebBlockchainProvider({ children }: { children: ReactNode }) {
  const thirdwebAccount = useActiveAccount()
  const thirdwebWallet = useActiveWallet()
  const activeChain = useActiveWalletChain()
  const { disconnect: thirdwebDisconnect } = useThirdwebDisconnect()
  const [nativeBalance, setNativeBalance] = useState<
    | {
        value: bigint
        decimals: number
        symbol: string
        formatted: string
      }
    | undefined
  >(undefined)

  // Track previous address to detect changes
  const prevAddressRef = useRef<string | undefined>(undefined)
  const addressChangeCallbackRef = useRef<
    ((newAddress?: string, oldAddress?: string) => void) | null
  >(null)

  const chainId = activeChain?.id
  const nativeCurrencySymbol = chainId
    ? getNativeCurrencySymbol(chainId)
    : 'ETH'

  // Detect address changes
  useEffect(() => {
    const currentAddress = thirdwebAccount?.address
    const prevAddress = prevAddressRef.current

    if (currentAddress !== prevAddress) {
      console.log('ThirdWeb account changed:', {
        from: prevAddress,
        to: currentAddress
      })

      // Call the registered callback if it exists
      if (addressChangeCallbackRef.current) {
        addressChangeCallbackRef.current(currentAddress, prevAddress)
      }

      prevAddressRef.current = currentAddress
    }
  }, [thirdwebAccount?.address])

  // Fetch native balance for ThirdWeb
  useEffect(() => {
    if (!thirdwebAccount?.address || !activeChain) {
      setNativeBalance(undefined)
      return
    }

    const fetchBalance = async () => {
      try {
        // Use thirdweb's balance fetching
        const { getWalletBalance } = await import('thirdweb/wallets')
        const balance = await getWalletBalance({
          address: thirdwebAccount.address,
          chain: activeChain,
          client: thirdwebClient
        })

        const decimals = 18 // Native tokens typically have 18 decimals
        const formatted = formatUnits(balance.value, decimals)

        setNativeBalance({
          value: balance.value,
          decimals,
          symbol: nativeCurrencySymbol,
          formatted
        })
      } catch (error) {
        console.error('Failed to fetch ThirdWeb balance:', error)
        setNativeBalance(undefined)
      }
    }

    fetchBalance()
    // Refetch balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [thirdwebAccount?.address, activeChain, nativeCurrencySymbol])

  // Send transaction function for ThirdWeb
  const sendTransaction = async (
    request: TransactionRequest
  ): Promise<`0x${string}`> => {
    if (!thirdwebAccount) throw new Error('No active ThirdWeb account')
    if (!activeChain) throw new Error('No active chain')

    const { sendTransaction: thirdwebSendTransaction } = await import(
      'thirdweb'
    )
    const { prepareTransaction } = await import('thirdweb')

    const transaction = prepareTransaction({
      to: request.to,
      data: request.data,
      value: request.value,
      gas: request.gas,
      chain: activeChain,
      client: thirdwebClient
    })

    const result = await thirdwebSendTransaction({
      transaction,
      account: thirdwebAccount
    })

    return result.transactionHash as `0x${string}`
  }

  const contextValue: BlockchainContextValue = {
    address: thirdwebAccount?.address,
    isConnected: !!thirdwebAccount,
    balance: nativeBalance,
    formattedBalance: nativeBalance
      ? `${nativeBalance.formatted} ${nativeBalance.symbol}`
      : `0 ${nativeCurrencySymbol}`,
    disconnect: () => {
      if (thirdwebWallet) {
        thirdwebDisconnect(thirdwebWallet)
      }
    },
    chainId,
    signMessage: async (message: string) => {
      if (!thirdwebAccount) throw new Error('No active account')
      return await thirdwebAccount.signMessage({ message })
    },
    walletClient: thirdwebAccount,
    switchChain: async (newChainId: number) => {
      if (thirdwebWallet && thirdwebWallet.switchChain) {
        // Define chain directly without importing from server
        const { defineChain } = await import('thirdweb')
        const chainConfig = getChainConfig(newChainId)

        if (chainConfig) {
          const thirdwebChain = defineChain({
            id: newChainId,
            name: chainConfig.name,
            rpc: chainConfig.rpcUrl
          })
          await thirdwebWallet.switchChain(thirdwebChain)
          return
        }
        throw new Error(`Chain ${newChainId} not supported`)
      }
      throw new Error('Chain switching not supported')
    },
    sendTransaction,
    onAddressChange: callback => {
      addressChangeCallbackRef.current = callback
    },
    nativeBalance
  }

  return (
    <BlockchainContext.Provider value={contextValue}>
      {children}
    </BlockchainContext.Provider>
  )
}

// Wagmi implementation
function WagmiBlockchainProvider({ children }: { children: ReactNode }) {
  const wagmiAccount = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const wagmiChainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()
  // Always call useBalance hook with the actual address or undefined
  const { data: balanceData } = useBalance({
    address: wagmiAccount?.address
  })

  // Track previous address to detect changes
  const prevAddressRef = useRef<string | undefined>(undefined)
  const addressChangeCallbackRef = useRef<
    ((newAddress?: string, oldAddress?: string) => void) | null
  >(null)

  const nativeCurrencySymbol = wagmiChainId
    ? getNativeCurrencySymbol(wagmiChainId)
    : 'ETH'

  // Detect address changes
  useEffect(() => {
    const currentAddress = wagmiAccount?.address
    const prevAddress = prevAddressRef.current

    if (currentAddress !== prevAddress) {
      console.log('Wagmi account changed:', {
        from: prevAddress,
        to: currentAddress
      })

      // Call the registered callback if it exists
      if (addressChangeCallbackRef.current) {
        addressChangeCallbackRef.current(currentAddress, prevAddress)
      }

      prevAddressRef.current = currentAddress
    }
  }, [wagmiAccount?.address])

  // Send transaction function for Wagmi
  const sendTransaction = async (
    request: TransactionRequest
  ): Promise<`0x${string}`> => {
    if (!walletClient) throw new Error('No wallet client available')

    return await walletClient.sendTransaction({
      to: request.to,
      data: request.data,
      value: request.value,
      gas: request.gas,
      gasPrice: request.gasPrice,
      account: request.account || wagmiAccount?.address,
      chain: request.chain || walletClient.chain
    })
  }

  const contextValue: BlockchainContextValue = {
    address: wagmiAccount?.address,
    isConnected: wagmiAccount?.isConnected || false,
    balance: balanceData,
    formattedBalance: balanceData
      ? `${formatUnits(balanceData.value, balanceData.decimals)} ${balanceData.symbol}`
      : `0 ${nativeCurrencySymbol}`,
    disconnect: wagmiDisconnect,
    chainId: wagmiChainId,
    signMessage: async (message: string) => {
      if (!signMessageAsync) throw new Error('Wagmi provider not available')
      return await signMessageAsync({ message })
    },
    walletClient,
    switchChain: switchChainAsync
      ? async (chainId: number) => {
          // Prevent multiple concurrent switch attempts
          if (isSwitchingChain) {
            console.log('Already switching chain, skipping...')
            return
          }
          await switchChainAsync({ chainId })
        }
      : undefined,
    sendTransaction: walletClient ? sendTransaction : undefined,
    onAddressChange: callback => {
      addressChangeCallbackRef.current = callback
    },
    nativeBalance: balanceData
      ? {
          value: balanceData.value,
          decimals: balanceData.decimals,
          symbol: balanceData.symbol,
          formatted: formatUnits(balanceData.value, balanceData.decimals)
        }
      : undefined
  }

  return (
    <BlockchainContext.Provider value={contextValue}>
      {children}
    </BlockchainContext.Provider>
  )
}

// Main provider that chooses the right implementation
export function BlockchainProvider({ children }: { children: ReactNode }) {
  const walletProvider = getWalletProvider()

  switch (walletProvider) {
    case WalletProviders.THIRDWEB:
      return <ThirdwebBlockchainProvider>{children}</ThirdwebBlockchainProvider>
    case WalletProviders.RAINBOW_KIT:
      return <WagmiBlockchainProvider>{children}</WagmiBlockchainProvider>
    default:
      throw new Error(`Unsupported wallet provider: ${walletProvider}`)
  }
}

// Main hook to access blockchain functionality
export function useBlockchain() {
  const context = useContext(BlockchainContext)
  if (!context) {
    throw new Error('useBlockchain must be used within BlockchainProvider')
  }
  return context
}

// Export specific hooks for convenience
export function useUnifiedWalletInfo() {
  const {
    address,
    isConnected,
    balance,
    formattedBalance,
    disconnect,
    onAddressChange,
    nativeBalance
  } = useBlockchain()
  return {
    address,
    isConnected,
    balance,
    formattedBalance,
    disconnect,
    onAddressChange,
    nativeBalance
  }
}

export function useUnifiedChainInfo() {
  const { chainId } = useBlockchain()
  return { chainId }
}

export function useUnifiedBalance() {
  const { nativeBalance } = useBlockchain()
  return { data: nativeBalance }
}

export function useUnifiedWalletClient() {
  const { walletClient, sendTransaction } = useBlockchain()
  return { data: walletClient, sendTransaction }
}
