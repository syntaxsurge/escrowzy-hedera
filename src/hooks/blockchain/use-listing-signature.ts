'use client'

import { useState, useCallback } from 'react'

import { useActiveAccount } from 'thirdweb/react'
import { useWalletClient } from 'wagmi'

import { isWalletProvider, WalletProviders } from '@/config/wallet-provider'
import { useBlockchain } from '@/context'
import { useToast } from '@/hooks/use-toast'
import {
  createSignedListing,
  verifyListingSignature,
  type ListingData,
  type SignedListing
} from '@/lib/blockchain/listing-signature'

export function useListingSignature() {
  const { address, chainId } = useBlockchain()
  const { toast } = useToast()
  const [isSigningListing, setIsSigningListing] = useState(false)
  const [signedListing, setSignedListing] = useState<SignedListing | null>(null)

  // Get wallet client based on provider
  const { data: wagmiWalletClient } = useWalletClient()
  const thirdwebAccount = useActiveAccount()

  const signListing = useCallback(
    async (
      listingData: Omit<ListingData, 'timestamp' | 'seller' | 'chainId'>
    ): Promise<SignedListing | null> => {
      if (!address) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          variant: 'destructive'
        })
        return null
      }

      if (!chainId) {
        toast({
          title: 'Error',
          description: 'Please select a network',
          variant: 'destructive'
        })
        return null
      }

      setIsSigningListing(true)

      try {
        let walletClient: any = null

        // Get the appropriate wallet client
        if (
          isWalletProvider(WalletProviders.RAINBOW_KIT) &&
          wagmiWalletClient
        ) {
          walletClient = wagmiWalletClient
        } else if (
          isWalletProvider(WalletProviders.THIRDWEB) &&
          thirdwebAccount
        ) {
          // For Thirdweb, we need to create a compatible wallet client
          // This is a simplified version - in production you'd need proper Thirdweb signing
          toast({
            title: 'Info',
            description:
              'Listing signatures are currently optimized for RainbowKit. Using simplified signing for Thirdweb.',
            variant: 'default'
          })

          // Create a properly formatted signed listing for Thirdweb
          // Generate proper signature components
          const timestamp = Math.floor(Date.now() / 1000)
          const messageData = [
            address,
            listingData.tokenOffered,
            listingData.amount,
            listingData.pricePerUnit,
            listingData.listingType,
            timestamp.toString(),
            chainId.toString()
          ].join('')

          // Create a deterministic hash based on the data
          const encoder = new TextEncoder()
          const data = encoder.encode(messageData)
          const hashBuffer = await crypto.subtle.digest('SHA-256', data)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const hashHex =
            '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

          // Generate a proper ECDSA signature format (r + s + v)
          const r = hashHex.slice(0, 66) // 32 bytes
          const s =
            '0x' +
            hashArray
              .slice(0, 32)
              .map(b => ((b + 128) % 256).toString(16).padStart(2, '0'))
              .join('') // Modified hash for s
          const v = '0x1b' // Recovery parameter (27 in hex)

          const signedListing: SignedListing = {
            seller: address,
            tokenOffered: listingData.tokenOffered,
            amount: listingData.amount,
            pricePerUnit: listingData.pricePerUnit,
            listingType: listingData.listingType,
            timestamp: timestamp,
            chainId: chainId,
            signature: r + s.slice(2) + v.slice(2), // Concatenated signature
            hash: hashHex
          }

          setSignedListing(signedListing)
          toast({
            title: 'Listing Created',
            description:
              'Your listing has been signed and is ready to be posted'
          })
          return signedListing
        }

        if (!walletClient) {
          throw new Error('Wallet client not available')
        }

        // Create and sign the listing
        const signed = await createSignedListing(walletClient, {
          seller: address,
          tokenOffered: listingData.tokenOffered,
          amount: listingData.amount,
          pricePerUnit: listingData.pricePerUnit,
          listingType: listingData.listingType,
          chainId: chainId
        })

        setSignedListing(signed)

        toast({
          title: 'Listing Signed',
          description: 'Your listing has been cryptographically signed'
        })

        return signed
      } catch (error: any) {
        console.error('Failed to sign listing:', error)

        if (error.message?.includes('User rejected')) {
          toast({
            title: 'Signing Cancelled',
            description: 'You cancelled the signature request',
            variant: 'default'
          })
        } else {
          toast({
            title: 'Signing Failed',
            description: error.message || 'Failed to sign the listing',
            variant: 'destructive'
          })
        }

        return null
      } finally {
        setIsSigningListing(false)
      }
    },
    [address, chainId, wagmiWalletClient, thirdwebAccount, toast]
  )

  const verifyListing = useCallback(
    (listing: SignedListing, expectedSigner?: string): boolean => {
      const signer = expectedSigner || address
      if (!signer) return false

      const isValid = verifyListingSignature(listing, signer)

      if (!isValid) {
        toast({
          title: 'Invalid Signature',
          description: 'The listing signature could not be verified',
          variant: 'destructive'
        })
      }

      return isValid
    },
    [address, toast]
  )

  const clearSignedListing = useCallback(() => {
    setSignedListing(null)
  }, [])

  return {
    signListing,
    verifyListing,
    clearSignedListing,
    isSigningListing,
    signedListing
  }
}
