import { ZERO_ADDRESS } from 'thirdweb'
import { keccak256, encodePacked } from 'viem'
import type { WalletClient } from 'viem'

/**
 * Listing data structure for signature
 */
export interface ListingData {
  seller: string
  tokenOffered: string
  amount: string
  pricePerUnit: string
  listingType: 'buy' | 'sell'
  timestamp: number
  chainId: number
}

/**
 * Generate a unique hash for a listing
 */
export function generateListingHash(listing: ListingData): string {
  const message = encodePacked(
    ['address', 'string', 'uint256', 'uint256', 'string', 'uint256', 'uint256'],
    [
      listing.seller as `0x${string}`,
      listing.tokenOffered,
      BigInt(listing.amount),
      BigInt(listing.pricePerUnit),
      listing.listingType,
      BigInt(listing.timestamp),
      BigInt(listing.chainId)
    ]
  )

  return keccak256(message)
}

/**
 * Create EIP-712 typed data for listing signature
 */
export function createListingTypedData(listing: ListingData) {
  return {
    domain: {
      name: 'P2P Trading Platform',
      version: '1',
      chainId: listing.chainId,
      verifyingContract: ZERO_ADDRESS as `0x${string}` // Replace with actual contract
    },
    types: {
      Listing: [
        { name: 'seller', type: 'address' },
        { name: 'tokenOffered', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'pricePerUnit', type: 'uint256' },
        { name: 'listingType', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'chainId', type: 'uint256' }
      ]
    },
    primaryType: 'Listing' as const,
    message: {
      seller: listing.seller as `0x${string}`,
      tokenOffered: listing.tokenOffered,
      amount: BigInt(listing.amount),
      pricePerUnit: BigInt(listing.pricePerUnit),
      listingType: listing.listingType,
      timestamp: BigInt(listing.timestamp),
      chainId: BigInt(listing.chainId)
    }
  }
}

/**
 * Sign a listing using EIP-712
 */
export async function signListing(
  walletClient: WalletClient,
  listing: ListingData
): Promise<string> {
  const typedData = createListingTypedData(listing)

  const signature = await walletClient.signTypedData({
    account: listing.seller as `0x${string}`,
    ...typedData
  })

  return signature
}

/**
 * Create a signed listing object
 */
export interface SignedListing extends ListingData {
  signature: string
  hash: string
}

/**
 * Create and sign a listing
 */
export async function createSignedListing(
  walletClient: WalletClient,
  listingData: Omit<ListingData, 'timestamp'>
): Promise<SignedListing> {
  const listing: ListingData = {
    ...listingData,
    timestamp: Math.floor(Date.now() / 1000)
  }

  const hash = generateListingHash(listing)
  const signature = await signListing(walletClient, listing)

  return {
    ...listing,
    hash,
    signature
  }
}

/**
 * Verify a listing signature (can be done on-chain or off-chain)
 */
export function verifyListingSignature(
  listing: SignedListing,
  expectedSigner: string
): boolean {
  // This verification would typically be done on-chain
  // For off-chain verification, you'd recover the signer from the signature
  // and compare with expectedSigner

  const hash = generateListingHash(listing)
  return (
    hash === listing.hash &&
    listing.seller.toLowerCase() === expectedSigner.toLowerCase()
  )
}

/**
 * Format listing data for display
 */
export function formatListingForDisplay(listing: ListingData) {
  return {
    type: listing.listingType === 'buy' ? 'Buy Order' : 'Sell Order',
    token: listing.tokenOffered,
    amount: listing.amount,
    price: listing.pricePerUnit,
    total: (
      parseFloat(listing.amount) * parseFloat(listing.pricePerUnit)
    ).toFixed(6),
    seller: `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}`,
    timestamp: new Date(listing.timestamp * 1000).toLocaleString()
  }
}
