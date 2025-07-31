'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { mutate } from 'swr'
import { getProfiles } from 'thirdweb/wallets/in-app'
import { createSiweMessage } from 'viem/siwe'

import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { isWalletProvider, WalletProviders } from '@/config/wallet-provider'
import { useBlockchain } from '@/context'
import { disconnectWallet } from '@/hooks/blockchain/use-wallet-disconnect'
import { api } from '@/lib/api/http-client'
import { thirdwebClient } from '@/lib/blockchain/thirdweb-client'

export function useUnifiedWalletAuth() {
  const router = useRouter()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [wasConnected, setWasConnected] = useState(false)
  const [sessionValidated, setSessionValidated] = useState(false)

  // Use blockchain provider for unified wallet access
  const { address, isConnected, signMessage, chainId, disconnect } =
    useBlockchain()

  const handleWalletDisconnect = async () => {
    try {
      if (window.location.pathname.startsWith(appRoutes.dashboard.base)) {
        await disconnectWallet(disconnect)
      }
      setWasConnected(false)
      setIsAuthenticating(false)
    } catch (error) {
      console.error('Error during wallet disconnect:', error)
      setWasConnected(false)
      setIsAuthenticating(false)
    }
  }

  const getUserInfoFromSocialLogin = async (): Promise<{
    email: string | null
    name: string | null
  }> => {
    try {
      if (!isWalletProvider(WalletProviders.THIRDWEB) || !address)
        return { email: null, name: null }

      // Get user profiles from in-app wallet
      // Wrap in try-catch to handle cases where user is not logged in with in-app wallet
      let profiles: any[] = []
      try {
        profiles = await getProfiles({
          client: thirdwebClient
        })
      } catch (profileError) {
        // If getProfiles fails (e.g., no in-app wallet session), return null values
        // This is expected when user connects with external wallets like MetaMask
        console.log('In-app wallet profiles not available:', profileError)
        return { email: null, name: null }
      }

      // Find profile with email and extract name
      for (const profile of profiles) {
        if (profile.details?.email) {
          const email = profile.details.email
          let name = null
          if (email) {
            // Extract name from email (before @ symbol) as fallback
            name = email
              .split('@')[0]
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
          }

          return { email, name }
        }
      }

      return { email: null, name: null }
    } catch (error) {
      console.error('Error getting user info from social login:', error)
      return { email: null, name: null }
    }
  }

  const authenticate = async () => {
    if (!address || isAuthenticating) return

    try {
      setIsAuthenticating(true)

      // Get nonce from server
      const nonceRes = await api.get<{ nonce: string }>(
        apiEndpoints.auth.wallet,
        {
          shouldShowErrorToast: false
        }
      )
      if (!nonceRes.success) {
        throw new Error('Failed to get nonce from server')
      }
      const { nonce } = nonceRes.data!

      // Create SIWE message
      const message = createSiweMessage({
        domain: window.location.host,
        address: address as `0x${string}`,
        statement: `Sign in to ${envPublic.NEXT_PUBLIC_APP_NAME}`,
        uri: window.location.origin,
        version: '1',
        chainId: chainId || 1,
        nonce
      })

      // Sign message with error handling
      let signature: string
      try {
        signature = await signMessage(message)
      } catch (signError) {
        console.error('Signing error:', signError)
        if (signError instanceof Error) {
          if (
            signError.message.includes('User rejected') ||
            signError.message.includes('denied')
          ) {
            throw new Error('User cancelled signing')
          }
          if (
            !isWalletProvider(WalletProviders.THIRDWEB) &&
            (signError.message.includes('TronLink') ||
              signError.message.includes('tron'))
          ) {
            throw new Error(
              'Please use a supported Ethereum wallet instead of TronLink'
            )
          }
        }
        throw signError
      }

      // Get user info from social login if available
      const { email: socialEmail, name: socialName } =
        await getUserInfoFromSocialLogin()

      // Send to server for verification
      const authRes = await api.post(apiEndpoints.auth.wallet, {
        message,
        signature,
        address,
        socialEmail,
        socialName
      })

      if (!authRes.success) {
        console.error('Authentication response:', authRes)
        throw new Error(authRes.error || 'Authentication failed')
      }

      // Refresh user data and team data
      await mutate(apiEndpoints.user.profile)
      await mutate(apiEndpoints.team)
      await mutate(
        key =>
          typeof key === 'string' &&
          key.startsWith(apiEndpoints.teams.base + '/')
      )
      router.refresh()
    } catch (error) {
      console.error('Authentication error:', error)

      if (error instanceof Error) {
        if (error.message.includes('User cancelled')) {
          // User cancelled wallet authentication - no action needed
        } else if (error.message.includes('TronLink')) {
          console.error(
            'TronLink wallet conflict detected. Please use a supported Ethereum wallet.'
          )
        } else {
          console.error('Authentication failed:', error.message)
        }
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Validate session matches current wallet address
  const validateSession = async () => {
    if (!address || !isConnected) return

    try {
      // Check if current session matches the connected wallet
      const response = await api.get<{ user: any }>(apiEndpoints.user.profile, {
        shouldShowErrorToast: false
      })

      if (response.success && response.data?.user) {
        const sessionWallet = response.data.user.walletAddress?.toLowerCase()
        const currentWallet = address.toLowerCase()

        if (sessionWallet !== currentWallet) {
          console.log('Session wallet mismatch, clearing session:', {
            session: sessionWallet,
            current: currentWallet
          })

          // Clear the mismatched session
          await fetch(apiEndpoints.auth.wallet, { method: 'DELETE' })

          // Clear user data
          await mutate(apiEndpoints.user.profile, { user: null }, false)

          setSessionValidated(false)
        } else {
          setSessionValidated(true)
        }
      }
    } catch (error) {
      console.error('Session validation error:', error)
    }
  }

  // Effect to handle wallet connection state (but not authentication)
  useEffect(() => {
    if (isConnected && address) {
      setWasConnected(true)
      // Validate session when wallet connects
      validateSession()
    }

    if (wasConnected && !isConnected) {
      handleWalletDisconnect()
    }
  }, [isConnected, address, wasConnected])

  return { isAuthenticating, authenticate, sessionValidated }
}
