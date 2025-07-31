'use client'

import { useState, useEffect, useCallback } from 'react'

import { apiEndpoints } from '@/config/api-endpoints'
import { useUnifiedWalletInfo, useUnifiedChainInfo } from '@/context/blockchain'
import type { OKXBalanceInfo, OKXTokenInfo } from '@/types/okx-dex'

export function useTokenBalances() {
  const { address } = useUnifiedWalletInfo()
  const { chainId } = useUnifiedChainInfo()

  const [balances, setBalances] = useState<OKXBalanceInfo[]>([])
  const [popularTokens, setPopularTokens] = useState<OKXTokenInfo[]>([])
  const [allTokens, setAllTokens] = useState<OKXTokenInfo[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  // Fetch token balances
  const fetchBalances = useCallback(async () => {
    if (!address || !chainId) return

    setIsLoadingBalances(true)
    try {
      const response = await fetch(apiEndpoints.swap.balances, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          chainId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setBalances(data.balances || [])
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error)
    } finally {
      setIsLoadingBalances(false)
    }
  }, [address, chainId])

  // Fetch all available tokens
  const fetchAllTokens = useCallback(async () => {
    if (!chainId) return

    setIsLoadingTokens(true)
    try {
      // First try to get all tokens
      const allTokensResponse = await fetch(apiEndpoints.swap.allTokens, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId })
      })

      let tokens: OKXTokenInfo[] = []

      if (allTokensResponse.ok) {
        const allData = await allTokensResponse.json()
        // Ensure tokens is an array
        tokens = Array.isArray(allData.tokens) ? allData.tokens : []
        console.log(`Fetched ${tokens.length} total tokens from all-tokens API`)
      }

      // If all tokens failed or returned empty, try popular tokens
      if (tokens.length === 0) {
        const popularResponse = await fetch(apiEndpoints.swap.tokens, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chainId })
        })

        if (popularResponse.ok) {
          const popularData = await popularResponse.json()
          // Ensure tokens is an array
          tokens = Array.isArray(popularData.tokens) ? popularData.tokens : []
          console.log(`Fetched ${tokens.length} popular tokens as fallback`)
        }
      }

      // Ensure tokens is an array before using array methods
      if (!Array.isArray(tokens)) {
        console.warn('Tokens is not an array, defaulting to empty array')
        tokens = []
      }

      // Don't manually add native token - it should come from the API
      // The API provides the native token with proper logo and details

      setAllTokens(tokens)
      // Set popular tokens to first 50 for quick access
      setPopularTokens(tokens.slice(0, 50))
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }, [chainId])

  // Search tokens
  const searchTokens = useCallback(
    async (query: string): Promise<OKXTokenInfo[]> => {
      if (!chainId || !query) return []

      try {
        const response = await fetch(apiEndpoints.swap.tokens, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chainId, query })
        })

        if (response.ok) {
          const data = await response.json()
          return data.tokens || []
        }
      } catch (error) {
        console.error('Failed to search tokens:', error)
      }
      return []
    },
    [chainId]
  )

  // Get balance for specific token
  const getTokenBalance = useCallback(
    (tokenAddress: string): string => {
      const balance = balances.find(
        b => b.tokenContractAddress.toLowerCase() === tokenAddress.toLowerCase()
      )
      return balance?.balance || '0'
    },
    [balances]
  )

  // Format balance for display
  const formatBalance = useCallback(
    (balance: string, decimals: number = 18): string => {
      // Check if balance is already formatted (not in wei)
      // OKX returns balances already formatted
      const value = parseFloat(balance)

      // If the value is extremely large, it's likely in wei/smallest unit
      if (value > 1e15) {
        // Convert from smallest unit to actual value
        const actualValue = value / Math.pow(10, decimals)
        if (actualValue === 0) return '0'
        if (actualValue < 0.0001) return '<0.0001'
        if (actualValue < 1) return actualValue.toFixed(4)
        if (actualValue < 10000) return actualValue.toFixed(2)
        return actualValue.toLocaleString()
      }

      // Value is already formatted
      if (value === 0) return '0'
      if (value < 0.0001) return '<0.0001'
      if (value < 1) return value.toFixed(4)
      if (value < 10000) return value.toFixed(2)
      return value.toLocaleString()
    },
    []
  )

  // Auto-fetch on mount and chain/account change
  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  useEffect(() => {
    fetchAllTokens()
  }, [fetchAllTokens])

  return {
    balances,
    popularTokens: allTokens.length > 0 ? allTokens : popularTokens, // Use all tokens if available
    isLoadingBalances,
    isLoadingTokens,
    fetchBalances,
    searchTokens,
    getTokenBalance,
    formatBalance,
    refetch: () => {
      fetchBalances()
      fetchAllTokens()
    }
  }
}
