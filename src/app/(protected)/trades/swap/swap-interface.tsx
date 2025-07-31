'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

import {
  ArrowDownUp,
  Settings,
  Loader2,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  Wallet,
  Zap,
  Shield,
  Trophy,
  DollarSign,
  Clock,
  AlertTriangle,
  X,
  Search
} from 'lucide-react'
import { toast } from 'sonner'
import { NATIVE_TOKEN_ADDRESS, ZERO_ADDRESS } from 'thirdweb'
import { formatUnits } from 'viem'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useUnifiedWalletInfo,
  useUnifiedChainInfo,
  useUnifiedBalance,
  useUnifiedWalletClient
} from '@/context/blockchain'
import { useDebounce } from '@/hooks/use-debounce'
import { useSwap } from '@/hooks/use-swap'
import { useTokenBalances } from '@/hooks/use-token-balances'
import { cn } from '@/lib'
import { getNativeCurrencySymbol, getChainConfig } from '@/lib/blockchain'
import type { OKXTokenInfo } from '@/types/okx-dex'

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  balance?: string
  balanceUsd?: string
  price?: number
  logo?: string
}

export function SwapInterface() {
  const { address, isConnected } = useUnifiedWalletInfo()
  const { chainId } = useUnifiedChainInfo()
  const { data: walletClient, sendTransaction } = useUnifiedWalletClient()
  const { isLoadingQuote, isExecutingSwap, getQuote, executeSwap } = useSwap()
  const {
    balances,
    popularTokens,
    isLoadingBalances,
    isLoadingTokens,
    searchTokens,
    refetch
  } = useTokenBalances()

  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [customSlippage, setCustomSlippage] = useState('')
  const [showTokenSelect, setShowTokenSelect] = useState<'from' | 'to' | null>(
    null
  )
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OKXTokenInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [quoteFetched, setQuoteFetched] = useState(false)
  const [localQuote, setLocalQuote] = useState<any>(null)

  // Debounce only for search, not for quote
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Get native token balance
  const { data: nativeBalance } = useUnifiedBalance()

  // Merge token data with balances and sort by balance
  const availableTokens = useMemo(() => {
    const tokenMap = new Map<string, Token>()
    const nativeTokenAddress = NATIVE_TOKEN_ADDRESS

    // Don't add native token here - let it come from the API
    // The API will provide the proper native token with correct logo

    // Add all tokens from OKX popular list
    popularTokens.forEach(token => {
      if (!token.tokenContractAddress) return
      const addr = token.tokenContractAddress.toLowerCase()

      tokenMap.set(addr, {
        symbol: token.tokenSymbol || 'UNKNOWN',
        name: token.tokenName || 'Unknown Token',
        address: token.tokenContractAddress,
        decimals: parseInt(token.tokenDecimals || '18'),
        balance: '0',
        balanceUsd: '0',
        logo: token.tokenLogoUrl || token.tokenLogo || undefined,
        price: 0
      })
    })

    // Update with user's actual balances from OKX API
    balances.forEach(balance => {
      if (!balance.tokenContractAddress) {
        // Handle native token when address is empty (OKX sometimes returns native without address)
        const existing = tokenMap.get(nativeTokenAddress.toLowerCase())
        if (existing) {
          // Update existing native token
          if (balance.balance) {
            existing.balance = balance.balance
            existing.balanceUsd = balance.balanceUsd || '0'
          }
          if (balance.tokenPrice) {
            existing.price = parseFloat(balance.tokenPrice)
          }
          if (balance.tokenLogo) {
            existing.logo = balance.tokenLogo
          }
        } else {
          // Add native token from balance data
          const chainConfig = chainId ? getChainConfig(chainId) : null
          const nativeSymbol =
            balance.tokenSymbol ||
            chainConfig?.nativeCurrency?.symbol ||
            getNativeCurrencySymbol(chainId || 1)
          const nativeName =
            balance.tokenName ||
            chainConfig?.nativeCurrency?.name ||
            nativeSymbol

          tokenMap.set(nativeTokenAddress.toLowerCase(), {
            symbol: nativeSymbol,
            name: nativeName,
            address: nativeTokenAddress,
            decimals: balance.tokenDecimals
              ? parseInt(balance.tokenDecimals)
              : 18,
            balance: balance.balance || '0',
            balanceUsd: balance.balanceUsd || '0',
            logo: balance.tokenLogo || undefined,
            price: balance.tokenPrice ? parseFloat(balance.tokenPrice) : 0
          })
        }
        return
      }

      const addr = balance.tokenContractAddress.toLowerCase()

      // Handle native token balance update
      if (addr === nativeTokenAddress.toLowerCase()) {
        const existing = tokenMap.get(nativeTokenAddress.toLowerCase())
        if (existing) {
          // Update existing native token with balance info
          if (balance.balance) {
            existing.balance = balance.balance
            existing.balanceUsd = balance.balanceUsd || '0'
          }
          if (balance.tokenPrice) {
            existing.price = parseFloat(balance.tokenPrice)
          }
          if (balance.tokenLogo) {
            existing.logo = balance.tokenLogo
          }
        } else {
          // Add native token from balance if not in popularTokens
          const chainConfig = chainId ? getChainConfig(chainId) : null
          const nativeSymbol =
            balance.tokenSymbol ||
            chainConfig?.nativeCurrency?.symbol ||
            getNativeCurrencySymbol(chainId || 1)
          const nativeName =
            balance.tokenName ||
            chainConfig?.nativeCurrency?.name ||
            nativeSymbol

          tokenMap.set(nativeTokenAddress.toLowerCase(), {
            symbol: nativeSymbol,
            name: nativeName,
            address: nativeTokenAddress,
            decimals: balance.tokenDecimals
              ? parseInt(balance.tokenDecimals)
              : 18,
            balance: balance.balance || '0',
            balanceUsd: balance.balanceUsd || '0',
            logo: balance.tokenLogo || undefined,
            price: balance.tokenPrice ? parseFloat(balance.tokenPrice) : 0
          })
        }
        return
      }

      const existing = tokenMap.get(addr)
      if (existing) {
        // Update existing token with balance info
        existing.balance = balance.balance || '0'
        existing.balanceUsd = balance.balanceUsd || '0'
        if (balance.tokenPrice) {
          existing.price = parseFloat(balance.tokenPrice)
        }
        if (balance.tokenLogo) {
          existing.logo = balance.tokenLogo || undefined
        }
        // Update symbol and name if they're more complete
        if (balance.tokenSymbol && balance.tokenSymbol !== 'UNKNOWN') {
          existing.symbol = balance.tokenSymbol
        }
        if (balance.tokenName && balance.tokenName !== 'Unknown') {
          existing.name = balance.tokenName
        }
      } else {
        // Add new token from balance that wasn't in popular list
        tokenMap.set(addr, {
          symbol: balance.tokenSymbol || 'UNKNOWN',
          name: balance.tokenName || balance.tokenSymbol || 'Unknown',
          address: balance.tokenContractAddress,
          decimals:
            typeof balance.tokenDecimals === 'string'
              ? parseInt(balance.tokenDecimals)
              : balance.tokenDecimals || 18,
          balance: balance.balance || '0',
          balanceUsd: balance.balanceUsd || '0',
          price: balance.tokenPrice ? parseFloat(balance.tokenPrice) : 0,
          logo: balance.tokenLogo || undefined
        })
      }
    })

    // Convert to array and sort: tokens with balance first, then alphabetically
    const tokens = Array.from(tokenMap.values()).sort((a, b) => {
      const aBalance = parseFloat(a.balance || '0')
      const bBalance = parseFloat(b.balance || '0')

      // Both have balance: sort by USD value
      if (aBalance > 0 && bBalance > 0) {
        const aUsd = parseFloat(a.balanceUsd || '0')
        const bUsd = parseFloat(b.balanceUsd || '0')
        if (bUsd !== aUsd) {
          return bUsd - aUsd // Higher USD value first
        }
        // If USD values are the same, sort by balance
        return bBalance - aBalance
      }

      // One has balance: it comes first
      if (aBalance > 0) return -1
      if (bBalance > 0) return 1

      // Neither has balance: sort alphabetically
      return a.symbol.localeCompare(b.symbol)
    })

    console.log(
      `Total tokens: ${tokens.length}, With balance: ${tokens.filter(t => parseFloat(t.balance || '0') > 0).length}`
    )
    // Log some sample balances for debugging
    const tokensWithBalance = tokens.filter(
      t => parseFloat(t.balance || '0') > 0
    )
    if (tokensWithBalance.length > 0) {
      console.log(
        'Sample tokens with balance:',
        tokensWithBalance.slice(0, 3).map(t => ({
          symbol: t.symbol,
          balance: t.balance,
          balanceUsd: t.balanceUsd
        }))
      )
    }
    return tokens
  }, [balances, popularTokens, nativeBalance])

  // Exchange rate is calculated inline in the render

  // Get raw token balance (without formatting)
  const getTokenBalanceRaw = useCallback(
    (token: Token | null): string => {
      if (!token || !token.address) return '0'

      const nativeTokenAddress = NATIVE_TOKEN_ADDRESS

      // Check if it's native token
      if (
        token.address.toLowerCase() === ZERO_ADDRESS ||
        token.address.toLowerCase() === nativeTokenAddress.toLowerCase()
      ) {
        if (nativeBalance) {
          const balance = formatUnits(
            nativeBalance.value,
            nativeBalance.decimals
          )
          return balance
        }
        return '0'
      }

      // Check if token already has balance in its data
      if (token.balance && token.balance !== '0') {
        return token.balance
      }

      // Find balance from fetched data
      const balance = balances.find(
        b =>
          b.tokenContractAddress &&
          token.address &&
          b.tokenContractAddress.toLowerCase() === token.address.toLowerCase()
      )

      if (balance && balance.balance) {
        return balance.balance
      }

      return '0'
    },
    [balances, nativeBalance]
  )

  // Format token balance for display
  const getTokenBalanceDisplay = useCallback(
    (token: Token | null) => {
      if (!token || !token.address) return '0'

      const nativeTokenAddress = NATIVE_TOKEN_ADDRESS

      // Check if it's native token (either ZERO_ADDRESS or native token address)
      if (
        token.address.toLowerCase() === ZERO_ADDRESS ||
        token.address.toLowerCase() === nativeTokenAddress.toLowerCase()
      ) {
        if (nativeBalance) {
          const balance = formatUnits(
            nativeBalance.value,
            nativeBalance.decimals
          )
          const balanceNum = parseFloat(balance)
          // Format the display based on the value size
          if (balanceNum === 0) return '0'
          if (balanceNum < 0.0001) return '<0.0001'
          if (balanceNum < 1) return balanceNum.toFixed(4)
          if (balanceNum < 100) return balanceNum.toFixed(2)
          return balanceNum.toLocaleString(undefined, {
            maximumFractionDigits: 2
          })
        }
        return '0'
      }

      // Check if token already has balance in its data
      if (token.balance && token.balance !== '0') {
        const balanceNum = parseFloat(token.balance)
        // Format the display based on the value size
        if (balanceNum === 0) return '0'
        if (balanceNum < 0.0001) return '<0.0001'
        if (balanceNum < 1) return balanceNum.toFixed(4)
        if (balanceNum < 100) return balanceNum.toFixed(2)
        return balanceNum.toLocaleString(undefined, {
          maximumFractionDigits: 2
        })
      }

      // Find balance from fetched data
      const balance = balances.find(
        b =>
          b.tokenContractAddress &&
          token.address &&
          b.tokenContractAddress.toLowerCase() === token.address.toLowerCase()
      )

      if (balance && balance.balance) {
        // The balance from OKX is already formatted
        const balanceNum = parseFloat(balance.balance)
        // Format the display based on the value size
        if (balanceNum === 0) return '0'
        if (balanceNum < 0.0001) return '<0.0001'
        if (balanceNum < 1) return balanceNum.toFixed(4)
        if (balanceNum < 100) return balanceNum.toFixed(2)
        return balanceNum.toLocaleString(undefined, {
          maximumFractionDigits: 2
        })
      }

      return '0'
    },
    [balances, nativeBalance]
  )

  // Search tokens
  useEffect(() => {
    if (!debouncedSearchQuery) {
      setSearchResults([])
      return
    }

    const search = async () => {
      setIsSearching(true)
      const results = await searchTokens(debouncedSearchQuery)
      setSearchResults(results)
      setIsSearching(false)
    }

    search()
  }, [debouncedSearchQuery, searchTokens])

  // Manual quote fetching function
  const handleFetchQuote = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) === 0 || !fromToken || !toToken) {
      toast.error('Please enter an amount and select tokens')
      return
    }

    console.log('Fetching quote with params:', {
      fromToken: fromToken.address,
      toToken: toToken.address,
      fromAmount,
      chainId,
      slippage
    })

    const quoteData = await getQuote(
      fromToken.address,
      toToken.address,
      fromAmount,
      chainId || 1, // Default to mainnet if chainId is undefined
      slippage
    )

    console.log('Quote data received:', quoteData)

    if (quoteData) {
      // Update toAmount with the actual quote amount
      const receivedAmount = quoteData.toAmount || ''
      console.log('Setting toAmount to:', receivedAmount)
      setToAmount(receivedAmount)
      setQuoteFetched(true)
      setLocalQuote(quoteData) // Save quote locally
    } else {
      console.log('No quote data received')
      setQuoteFetched(false)
      setToAmount('')
      setLocalQuote(null)
    }
  }, [fromAmount, fromToken, toToken, chainId, slippage, getQuote])

  // Reset quote when token addresses change (but not price updates)
  useEffect(() => {
    setQuoteFetched(false)
    setToAmount('')
    setLocalQuote(null)
  }, [fromToken?.address, toToken?.address])

  // Reset quote when amount changes
  useEffect(() => {
    if (quoteFetched) {
      setQuoteFetched(false)
      setToAmount('')
      setLocalQuote(null)
    }
  }, [fromAmount])

  // Set default tokens when available from API
  useEffect(() => {
    if (availableTokens.length > 0 && chainId && !fromToken && !toToken) {
      // Get native token symbol for current chain
      const nativeSymbol = getNativeCurrencySymbol(chainId)

      // Find native token - check by symbol or by being NATIVE_TOKEN_ADDRESS
      const nativeToken = availableTokens.find(
        t =>
          t.symbol.toUpperCase() === nativeSymbol.toUpperCase() ||
          t.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
      )

      if (nativeToken) {
        console.log(
          'Setting native token as from:',
          nativeToken.symbol,
          nativeToken.logo
        )
        setFromToken(nativeToken)
      }

      // Find stable coins - prioritize USDC and USDT
      const usdcToken = availableTokens.find(
        t => t.symbol.toUpperCase() === 'USDC'
      )
      const usdtToken = availableTokens.find(
        t => t.symbol.toUpperCase() === 'USDT'
      )
      const stableToken =
        usdcToken ||
        usdtToken ||
        availableTokens.find(t =>
          ['DAI', 'BUSD', 'TUSD'].includes(t.symbol.toUpperCase())
        )

      if (stableToken) {
        console.log(
          'Setting stable coin as to:',
          stableToken.symbol,
          stableToken.logo
        )
        setToToken(stableToken)
      } else {
        // If no stable coin found, select first non-native token
        const alternativeToken = availableTokens.find(
          t =>
            t.address.toLowerCase() !== NATIVE_TOKEN_ADDRESS.toLowerCase() &&
            (!nativeToken ||
              t.address.toLowerCase() !== nativeToken.address.toLowerCase())
        )
        if (alternativeToken) {
          console.log(
            'Setting alternative token as to:',
            alternativeToken.symbol
          )
          setToToken(alternativeToken)
        }
      }
    }
  }, [availableTokens, chainId, fromToken, toToken])

  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)

    // Only swap amounts if we have a quote
    if (quoteFetched && toAmount) {
      setFromAmount(toAmount)
      setToAmount('')
      setQuoteFetched(false)
    } else {
      // Reset amounts when swapping without a quote
      setToAmount('')
      setQuoteFetched(false)
    }
  }

  const handleSwap = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!walletClient && !sendTransaction) {
      toast.error('Wallet client not available')
      return
    }

    if (!fromAmount || parseFloat(fromAmount) === 0) {
      toast.error('Please enter an amount to swap')
      return
    }

    if (!fromToken || !toToken) {
      toast.error('Please select tokens to swap')
      return
    }

    try {
      // Get the transaction data from the API
      const swapData = await executeSwap(address, chainId || 1) // Default to mainnet if chainId is undefined

      if (swapData && swapData.success && swapData.tx) {
        // Execute the transaction using the unified wallet
        let txHash: string

        if (sendTransaction) {
          // Use the unified sendTransaction method
          txHash = await sendTransaction({
            to: swapData.tx.to as `0x${string}`,
            data: swapData.tx.data as `0x${string}`,
            value: BigInt(swapData.tx.value || '0'),
            gas: swapData.tx.gas ? BigInt(swapData.tx.gas) : undefined,
            gasPrice: swapData.tx.gasPrice
              ? BigInt(swapData.tx.gasPrice)
              : undefined,
            account: address as `0x${string}`,
            chain: walletClient?.chain
          })
        } else if (walletClient?.sendTransaction) {
          // Fallback to direct wallet client if available
          txHash = await walletClient.sendTransaction({
            to: swapData.tx.to as `0x${string}`,
            data: swapData.tx.data as `0x${string}`,
            value: BigInt(swapData.tx.value || '0'),
            gas: swapData.tx.gas ? BigInt(swapData.tx.gas) : undefined,
            gasPrice: swapData.tx.gasPrice
              ? BigInt(swapData.tx.gasPrice)
              : undefined,
            account: address as `0x${string}`,
            chain: walletClient.chain
          })
        } else {
          throw new Error('No transaction method available')
        }

        toast.success(`Transaction submitted! Hash: ${txHash.slice(0, 10)}...`)

        // Reset form after successful submission
        setFromAmount('')
        setToAmount('')

        // Refresh balances after a delay
        setTimeout(() => {
          refetch()
        }, 5000)
      }
    } catch (error) {
      console.error('Swap error:', error)
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Transaction cancelled')
        } else {
          toast.error(error.message || 'Failed to execute swap')
        }
      } else {
        toast.error('Failed to execute swap')
      }
    }
  }

  const handleMaxAmount = () => {
    if (!fromToken) return

    // Get raw balance without formatting
    const balance = getTokenBalanceRaw(fromToken)
    const numBalance = parseFloat(balance)

    if (!isNaN(numBalance) && numBalance > 0) {
      // Set the raw numeric value without any formatting
      setFromAmount(balance)
    } else {
      setFromAmount('0')
    }
  }

  // Helper function to validate and clean numeric input
  const handleNumericInput = (value: string): string => {
    // Remove any negative signs
    const cleanValue = value.replace(/^-+/, '')
    // Only allow valid positive decimal numbers
    if (/^\d*\.?\d*$/.test(cleanValue)) {
      return cleanValue
    }
    return ''
  }

  return (
    <div className='space-y-6'>
      {/* Swap Interface Card - Gamified Design */}
      <Card className='relative overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
        {/* Top Progress Bar */}
        <div className='absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600'>
          <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
        </div>

        <div className='p-6'>
          {/* Header */}
          <div className='mb-6 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-purple-600 to-pink-700 p-3 shadow-lg'>
                <ArrowDownUp className='h-6 w-6 text-white' />
              </div>
              <div>
                <h2 className='text-2xl font-black'>SWAP INTERFACE</h2>
                <div className='mt-1 flex items-center gap-2'>
                  <Badge className='border-0 bg-green-500/20 font-bold text-green-600 dark:text-green-400'>
                    <Zap className='mr-1 h-3 w-3' />
                    INSTANT
                  </Badge>
                  <Badge className='border-0 bg-blue-500/20 font-bold text-blue-600 dark:text-blue-400'>
                    <Shield className='mr-1 h-3 w-3' />
                    SECURE
                  </Badge>
                  {isLoadingBalances && (
                    <Badge className='border-0 bg-yellow-500/20 font-bold text-yellow-600 dark:text-yellow-400'>
                      <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                      SYNCING
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='icon'
                onClick={refetch}
                className='hover:bg-primary/10 rounded-full'
                disabled={isLoadingBalances}
              >
                <RefreshCw
                  className={cn('h-4 w-4', isLoadingBalances && 'animate-spin')}
                />
              </Button>

              <Button
                variant='ghost'
                size='icon'
                onClick={() => setShowSettings(!showSettings)}
                className='hover:bg-primary/10 rounded-full'
              >
                <Settings
                  className={cn('h-4 w-4', showSettings && 'text-primary')}
                />
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <Card className='mb-6 border-yellow-500/30 bg-yellow-500/10 p-4'>
              <div className='mb-4 flex items-center gap-2'>
                <AlertTriangle className='h-4 w-4 text-yellow-500' />
                <span className='text-sm font-bold'>ADVANCED SETTINGS</span>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <div>
                  <Label className='mb-2 text-sm font-bold'>
                    SLIPPAGE TOLERANCE
                  </Label>
                  <div className='mb-2 flex gap-2'>
                    {[0.1, 0.5, 1.0].map(value => (
                      <Button
                        key={value}
                        variant={slippage === value ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => {
                          setSlippage(value)
                          setCustomSlippage('')
                        }}
                        className={cn(
                          'flex-1 font-bold',
                          slippage === value &&
                            'bg-gradient-to-r from-purple-600 to-pink-600'
                        )}
                      >
                        {value}%
                      </Button>
                    ))}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='number'
                      placeholder='Custom'
                      value={customSlippage}
                      onChange={e => {
                        setCustomSlippage(e.target.value)
                        if (e.target.value) {
                          setSlippage(parseFloat(e.target.value))
                        }
                      }}
                      className='flex-1'
                    />
                    <span className='text-muted-foreground text-sm'>%</span>
                  </div>
                </div>
                <div>
                  <Label className='mb-2 text-sm font-bold'>DEADLINE</Label>
                  <div className='flex items-center gap-2'>
                    <Input type='number' defaultValue='20' className='flex-1' />
                    <span className='text-muted-foreground text-sm'>
                      minutes
                    </span>
                  </div>
                  <p className='text-muted-foreground mt-2 text-xs'>
                    Transaction will revert if pending longer than this
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Swap Form with Gamified Design */}
          <div className='space-y-4'>
            {/* From Token Section */}
            <Card className='border-border/50 bg-muted/50 p-4'>
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='rounded bg-gradient-to-r from-red-500 to-orange-500 p-1'>
                    <DollarSign className='h-4 w-4 text-white' />
                  </div>
                  <Label className='font-bold'>FROM</Label>
                </div>
                <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                  <Wallet className='h-3 w-3' />
                  <span>
                    Balance:{' '}
                    {fromToken ? getTokenBalanceDisplay(fromToken) : '0'}
                    {fromToken?.symbol && ` ${fromToken.symbol}`}
                  </span>
                </div>
              </div>

              <div className='flex gap-2'>
                <div className='relative flex-1'>
                  <Input
                    type='number'
                    placeholder='0.0'
                    value={fromAmount}
                    onChange={e => {
                      const value = e.target.value
                      // Allow empty string
                      if (value === '') {
                        setFromAmount('')
                        return
                      }
                      // Validate and clean the input
                      const cleanValue = handleNumericInput(value)
                      setFromAmount(cleanValue)
                    }}
                    onKeyDown={e => {
                      // Prevent minus key and negative signs
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault()
                      }
                    }}
                    onPaste={e => {
                      // Handle paste events to prevent negative numbers
                      e.preventDefault()
                      const pastedText = e.clipboardData.getData('text')
                      const cleanValue = handleNumericInput(pastedText)
                      if (cleanValue) {
                        setFromAmount(cleanValue)
                      }
                    }}
                    min='0'
                    step='any'
                    className='bg-secondary/50 pr-16 text-xl font-bold'
                  />
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={handleMaxAmount}
                    disabled={!fromToken}
                    className='bg-primary/10 hover:bg-primary/20 text-primary absolute top-1/2 right-1 h-7 -translate-y-1/2 px-2 text-xs font-bold'
                  >
                    MAX
                  </Button>
                </div>
                <Button
                  variant='outline'
                  onClick={() => setShowTokenSelect('from')}
                  className='min-w-[140px] font-bold'
                >
                  {fromToken ? (
                    <>
                      {fromToken.logo ? (
                        <img
                          src={fromToken.logo}
                          alt={fromToken.symbol}
                          className='mr-2 h-5 w-5 rounded-full'
                        />
                      ) : (
                        <Wallet className='mr-2 h-4 w-4' />
                      )}
                      <span>{fromToken.symbol}</span>
                    </>
                  ) : (
                    <span>Select Token</span>
                  )}
                  <ChevronDown className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </Card>

            {/* Swap Button */}
            <div className='flex justify-center'>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleSwapTokens}
                className='rounded-full bg-gradient-to-r from-purple-600 to-pink-600 p-3 shadow-lg transition-transform hover:rotate-180 hover:from-purple-700 hover:to-pink-700'
              >
                <ArrowDownUp className='h-5 w-5 text-white' />
              </Button>
            </div>

            {/* To Token Section */}
            <Card className='border-border/50 bg-muted/50 p-4'>
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='rounded bg-gradient-to-r from-green-500 to-emerald-500 p-1'>
                    <DollarSign className='h-4 w-4 text-white' />
                  </div>
                  <Label className='font-bold'>
                    TO {quoteFetched ? '' : '(GET QUOTE FIRST)'}
                  </Label>
                </div>
                <span className='text-muted-foreground flex items-center gap-1 text-xs font-bold'>
                  <Wallet className='h-3 w-3' />
                  Balance: {toToken ? getTokenBalanceDisplay(toToken) : '0'}
                  {toToken?.symbol && ` ${toToken.symbol}`}
                </span>
              </div>

              <div className='flex gap-2'>
                <Input
                  type='number'
                  placeholder={quoteFetched ? '0.0' : 'Get quote to see amount'}
                  value={toAmount}
                  readOnly
                  className='bg-secondary/50 flex-1 text-xl font-bold'
                />
                <Button
                  variant='outline'
                  onClick={() => setShowTokenSelect('to')}
                  className='min-w-[140px] font-bold'
                >
                  {toToken ? (
                    <>
                      {toToken.logo ? (
                        <img
                          src={toToken.logo}
                          alt={toToken.symbol}
                          className='mr-2 h-5 w-5 rounded-full'
                        />
                      ) : (
                        <Wallet className='mr-2 h-4 w-4' />
                      )}
                      <span>{toToken.symbol}</span>
                    </>
                  ) : (
                    <span>Select Token</span>
                  )}
                  <ChevronDown className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </Card>

            {/* Get Quote Button */}
            {fromToken && toToken && fromAmount && (
              <Button
                onClick={handleFetchQuote}
                disabled={
                  isLoadingQuote || !fromAmount || parseFloat(fromAmount) === 0
                }
                className='h-12 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-lg font-black text-white shadow-lg transition-all hover:scale-105 hover:from-blue-700 hover:to-cyan-700'
              >
                {isLoadingQuote ? (
                  <>
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                    FETCHING BEST PRICE...
                  </>
                ) : (
                  <>
                    <TrendingUp className='mr-2 h-5 w-5' />
                    {quoteFetched ? 'UPDATE QUOTE' : 'GET QUOTE'}
                  </>
                )}
              </Button>
            )}

            {/* Price Info Panel */}
            {quoteFetched && fromAmount && toAmount && localQuote ? (
              <Card className='border-blue-500/30 bg-blue-500/10 p-4'>
                <div className='mb-3 flex items-center gap-2'>
                  <TrendingUp className='h-4 w-4 text-blue-500' />
                  <span className='text-sm font-bold'>SWAP DETAILS</span>
                </div>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Exchange Rate</span>
                    <span className='font-bold'>
                      1 {fromToken?.symbol || ''} ={' '}
                      {toAmount && fromAmount && parseFloat(fromAmount) > 0
                        ? (
                            parseFloat(toAmount) / parseFloat(fromAmount)
                          ).toFixed(6)
                        : localQuote.exchangeRate || '0'}{' '}
                      {toToken?.symbol || ''}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Price Impact</span>
                    <span
                      className={cn(
                        'font-bold',
                        (localQuote.priceImpact || 0) > 5
                          ? 'text-red-500'
                          : (localQuote.priceImpact || 0) > 2
                            ? 'text-orange-500'
                            : (localQuote.priceImpact || 0) > 1
                              ? 'text-yellow-500'
                              : 'text-green-500'
                      )}
                    >
                      {localQuote.priceImpact !== undefined &&
                      localQuote.priceImpact !== null
                        ? typeof localQuote.priceImpact === 'number'
                          ? localQuote.priceImpact.toFixed(2)
                          : parseFloat(localQuote.priceImpact).toFixed(2)
                        : '0.00'}
                      %
                    </span>
                  </div>
                  <div className='flex items-start justify-between text-sm'>
                    <span className='text-muted-foreground'>Route</span>
                    <span className='max-w-[300px] text-right text-xs font-bold'>
                      {localQuote.route || 'Best Route'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Network Fee</span>
                    <span className='font-bold'>
                      ${localQuote.estimatedGas || '0.00'}
                    </span>
                  </div>
                  {localQuote.minReceiveAmount && (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-muted-foreground'>
                        Min. Received
                      </span>
                      <span className='font-bold'>
                        {parseFloat(localQuote.minReceiveAmount).toFixed(6)}{' '}
                        {toToken?.symbol || ''}
                      </span>
                    </div>
                  )}
                  {localQuote.estimateGasFee && (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-muted-foreground'>Gas Cost</span>
                      <span className='text-muted-foreground text-xs font-bold'>
                        {localQuote.estimateGasFee} wei
                      </span>
                    </div>
                  )}

                  {/* Token Security Information */}
                  {(localQuote.fromTokenInfo || localQuote.toTokenInfo) && (
                    <div className='mt-2 border-t border-white/10 pt-2'>
                      <div className='mb-2 text-xs font-bold text-blue-400'>
                        TOKEN SECURITY
                      </div>

                      {localQuote.fromTokenInfo && (
                        <>
                          <div className='flex items-center justify-between text-xs'>
                            <span className='text-muted-foreground'>
                              {fromToken?.symbol} Honeypot
                            </span>
                            <span
                              className={cn(
                                'font-bold',
                                localQuote.fromTokenInfo.isHoneyPot
                                  ? 'text-red-500'
                                  : 'text-green-500'
                              )}
                            >
                              {localQuote.fromTokenInfo.isHoneyPot
                                ? '⚠️ YES'
                                : '✓ NO'}
                            </span>
                          </div>
                          {parseFloat(localQuote.fromTokenInfo.taxRate || '0') >
                            0 && (
                            <div className='flex items-center justify-between text-xs'>
                              <span className='text-muted-foreground'>
                                {fromToken?.symbol} Sell Tax
                              </span>
                              <span className='font-bold text-orange-500'>
                                {(
                                  parseFloat(localQuote.fromTokenInfo.taxRate) *
                                  100
                                ).toFixed(2)}
                                %
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {localQuote.toTokenInfo && (
                        <>
                          <div className='mt-1 flex items-center justify-between text-xs'>
                            <span className='text-muted-foreground'>
                              {toToken?.symbol} Honeypot
                            </span>
                            <span
                              className={cn(
                                'font-bold',
                                localQuote.toTokenInfo.isHoneyPot
                                  ? 'text-red-500'
                                  : 'text-green-500'
                              )}
                            >
                              {localQuote.toTokenInfo.isHoneyPot
                                ? '⚠️ YES'
                                : '✓ NO'}
                            </span>
                          </div>
                          {parseFloat(localQuote.toTokenInfo.taxRate || '0') >
                            0 && (
                            <div className='flex items-center justify-between text-xs'>
                              <span className='text-muted-foreground'>
                                {toToken?.symbol} Buy Tax
                              </span>
                              <span className='font-bold text-orange-500'>
                                {(
                                  parseFloat(localQuote.toTokenInfo.taxRate) *
                                  100
                                ).toFixed(2)}
                                %
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Token Prices */}
                  {(localQuote.fromTokenInfo?.tokenUnitPrice ||
                    localQuote.toTokenInfo?.tokenUnitPrice) && (
                    <div className='mt-2 border-t border-white/10 pt-2'>
                      <div className='mb-2 text-xs font-bold text-blue-400'>
                        TOKEN PRICES
                      </div>
                      {localQuote.fromTokenInfo?.tokenUnitPrice && (
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-muted-foreground'>
                            {fromToken?.symbol} Price
                          </span>
                          <span className='font-bold'>
                            $
                            {parseFloat(
                              localQuote.fromTokenInfo.tokenUnitPrice
                            ).toFixed(4)}
                          </span>
                        </div>
                      )}
                      {localQuote.toTokenInfo?.tokenUnitPrice && (
                        <div className='mt-1 flex items-center justify-between text-xs'>
                          <span className='text-muted-foreground'>
                            {toToken?.symbol} Price
                          </span>
                          <span className='font-bold'>
                            $
                            {parseFloat(
                              localQuote.toTokenInfo.tokenUnitPrice
                            ).toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {(localQuote.priceImpact || 0) > 5 && (
                  <div className='mt-3 flex items-center gap-2 rounded bg-red-500/20 p-2'>
                    <AlertTriangle className='h-4 w-4 text-red-500' />
                    <span className='text-xs font-bold text-red-500'>
                      High price impact! Consider reducing trade size.
                    </span>
                  </div>
                )}
                {(localQuote.fromTokenInfo?.isHoneyPot ||
                  localQuote.toTokenInfo?.isHoneyPot) && (
                  <div className='mt-3 flex items-center gap-2 rounded bg-red-500/20 p-2'>
                    <AlertTriangle className='h-4 w-4 text-red-500' />
                    <span className='text-xs font-bold text-red-500'>
                      ⚠️ Warning: Honeypot token detected! Proceed with extreme
                      caution.
                    </span>
                  </div>
                )}
              </Card>
            ) : null}

            {/* Main Swap Button */}
            <Button
              onClick={handleSwap}
              disabled={
                !isConnected ||
                isExecutingSwap ||
                isLoadingQuote ||
                !fromAmount ||
                parseFloat(fromAmount) === 0 ||
                !quoteFetched
              }
              className='h-14 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-lg font-black text-white shadow-lg transition-all hover:scale-105 hover:from-purple-700 hover:to-pink-700'
            >
              {isExecutingSwap ? (
                <>
                  <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                  SWAPPING...
                </>
              ) : !isConnected ? (
                'CONNECT WALLET'
              ) : !fromAmount || parseFloat(fromAmount) === 0 ? (
                'ENTER AMOUNT'
              ) : !quoteFetched ? (
                'GET QUOTE FIRST'
              ) : (
                <>
                  <Zap className='mr-2 h-5 w-5' />
                  SWAP NOW
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Boost Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-gradient-to-br from-yellow-600 to-orange-700 p-2'>
              <Trophy className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-bold'>BEST RATE</p>
              <p className='text-muted-foreground text-xs'>Optimized routing</p>
            </div>
          </div>
        </Card>

        <Card className='border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-gradient-to-br from-green-600 to-emerald-700 p-2'>
              <Clock className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-bold'>INSTANT</p>
              <p className='text-muted-foreground text-xs'>&lt; 10 seconds</p>
            </div>
          </div>
        </Card>

        <Card className='border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-gradient-to-br from-blue-600 to-cyan-700 p-2'>
              <Shield className='h-5 w-5 text-white' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-bold'>SECURE</p>
              <p className='text-muted-foreground text-xs'>MEV Protected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Token Selection Modal */}
      {showTokenSelect && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <Card className='bg-background/95 w-full max-w-md border-2 border-purple-500/30'>
            <div className='border-b p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-gradient-to-br from-purple-600 to-pink-700 p-2'>
                    <Search className='h-4 w-4 text-white' />
                  </div>
                  <h3 className='text-lg font-black'>SELECT TOKEN</h3>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    setShowTokenSelect(null)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className='rounded-full hover:bg-red-500/10'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>

            <div className='p-4'>
              <Input
                placeholder='Search by name, symbol or address'
                className='mb-4'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />

              {!searchQuery && availableTokens.length > 0 && (
                <div className='mb-3'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      {availableTokens.length} tokens available
                    </span>
                    {availableTokens.filter(t => {
                      const balanceStr = getTokenBalanceDisplay(t)
                      const balanceNum = parseFloat(
                        balanceStr.replace(/[<>,]/g, '')
                      )
                      return balanceNum > 0
                    }).length > 0 && (
                      <span className='text-primary text-xs font-semibold'>
                        {
                          availableTokens.filter(t => {
                            const balanceStr = getTokenBalanceDisplay(t)
                            const balanceNum = parseFloat(
                              balanceStr.replace(/[<>,]/g, '')
                            )
                            return balanceNum > 0
                          }).length
                        }{' '}
                        with balance
                      </span>
                    )}
                  </div>
                  {availableTokens.filter(t => {
                    const balanceStr = getTokenBalanceDisplay(t)
                    const balanceNum = parseFloat(
                      balanceStr.replace(/[<>,]/g, '')
                    )
                    return balanceNum > 0
                  }).length > 0 && (
                    <div className='mt-2 border-t pt-2'>
                      <p className='text-xs font-semibold text-green-500 uppercase'>
                        Your Tokens
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className='max-h-96 space-y-2 overflow-y-auto'>
                {isSearching && (
                  <div className='flex items-center justify-center py-8'>
                    <Loader2 className='text-primary h-6 w-6 animate-spin' />
                  </div>
                )}

                {/* Show search results if searching, otherwise show available tokens */}
                {(searchQuery
                  ? searchResults.map(
                      token =>
                        ({
                          symbol: token.tokenSymbol,
                          name: token.tokenName,
                          address: token.tokenContractAddress,
                          decimals: parseInt(token.tokenDecimals || '18'),
                          logo: token.tokenLogoUrl || token.tokenLogo,
                          balance: '0',
                          price: 0
                        }) as Token
                    )
                  : availableTokens
                )
                  .slice(0, 100)
                  .map((token, index) => {
                    // Limit display to first 100 for performance
                    const balance = getTokenBalanceDisplay(token)
                    // Remove formatting characters to check actual value
                    const cleanBalance = balance.replace(/[<>,]/g, '')
                    const hasBalance = parseFloat(cleanBalance) > 0
                    const balanceNum = parseFloat(cleanBalance)
                    const balanceUsd =
                      token.price && balanceNum > 0
                        ? (balanceNum * token.price).toFixed(2)
                        : '0'

                    // Add separator between tokens with balance and without
                    const prevToken =
                      index > 0
                        ? searchQuery
                          ? searchResults[index - 1]
                          : availableTokens[index - 1]
                        : null

                    let prevHasBalance = false
                    if (prevToken) {
                      // Check if prevToken is an OKXTokenInfo or Token type
                      if ('tokenSymbol' in prevToken) {
                        // It's an OKXTokenInfo from search results
                        const mockToken: Token = {
                          symbol: prevToken.tokenSymbol || '',
                          name: prevToken.tokenName || '',
                          address: prevToken.tokenContractAddress || '',
                          decimals: parseInt(prevToken.tokenDecimals || '18'),
                          balance: '0'
                        }
                        const prevBalanceStr = getTokenBalanceDisplay(mockToken)
                        const prevCleanBalance = prevBalanceStr.replace(
                          /[<>,]/g,
                          ''
                        )
                        prevHasBalance = parseFloat(prevCleanBalance) > 0
                      } else {
                        // It's already a Token type
                        const prevBalanceStr = getTokenBalanceDisplay(
                          prevToken as Token
                        )
                        const prevCleanBalance = prevBalanceStr.replace(
                          /[<>,]/g,
                          ''
                        )
                        prevHasBalance = parseFloat(prevCleanBalance) > 0
                      }
                    }
                    const showSeparator =
                      !searchQuery && prevHasBalance && !hasBalance

                    return (
                      <div key={token.address}>
                        {showSeparator && (
                          <div className='my-2 border-t pt-2'>
                            <p className='text-muted-foreground mb-2 text-xs font-semibold uppercase'>
                              All Tokens
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (showTokenSelect === 'from') {
                              // Don't allow selecting the same token as toToken
                              if (
                                toToken &&
                                token.address.toLowerCase() ===
                                  toToken.address.toLowerCase()
                              ) {
                                toast.error(
                                  'Cannot select the same token for both from and to'
                                )
                                return
                              }
                              setFromToken(token)
                            } else {
                              // Don't allow selecting the same token as fromToken
                              if (
                                fromToken &&
                                token.address.toLowerCase() ===
                                  fromToken.address.toLowerCase()
                              ) {
                                toast.error(
                                  'Cannot select the same token for both from and to'
                                )
                                return
                              }
                              setToToken(token)
                            }
                            setShowTokenSelect(null)
                            setSearchQuery('')
                            setSearchResults([])
                          }}
                          className={cn(
                            'hover:bg-primary/10 flex w-full items-center justify-between rounded-lg p-3 transition-all',
                            hasBalance &&
                              'border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10'
                          )}
                        >
                          <div className='flex items-center gap-3'>
                            {token.logo ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className='h-10 w-10 rounded-full'
                                onError={e => {
                                  // Hide broken images
                                  ;(
                                    e.target as HTMLImageElement
                                  ).style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-700'>
                                <Wallet className='h-5 w-5 text-white' />
                              </div>
                            )}
                            <div className='text-left'>
                              <div className='flex items-center gap-2'>
                                <p className='font-bold'>{token.symbol}</p>
                                {hasBalance && (
                                  <Badge className='h-4 border-0 bg-green-500/20 px-1 text-[10px] font-bold text-green-600 dark:text-green-400'>
                                    OWNED
                                  </Badge>
                                )}
                              </div>
                              <p className='text-muted-foreground text-xs'>
                                {token.name}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            {hasBalance ? (
                              <>
                                <p className='font-bold text-green-600 dark:text-green-400'>
                                  {balance}
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                  ${balanceUsd}
                                </p>
                              </>
                            ) : (
                              <p className='text-muted-foreground text-sm'>-</p>
                            )}
                          </div>
                        </button>
                      </div>
                    )
                  })}

                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <div className='text-muted-foreground py-8 text-center'>
                    <p className='font-semibold'>No tokens found</p>
                    <p className='mt-1 text-sm'>Try a different search term</p>
                  </div>
                )}

                {!isSearching &&
                  !searchQuery &&
                  availableTokens.length === 0 && (
                    <div className='text-muted-foreground py-8 text-center'>
                      {isLoadingTokens
                        ? 'Loading tokens...'
                        : 'No tokens available'}
                    </div>
                  )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
