import { envPublic } from '@/config/env.public'

// Define available wallet providers as a const enum for type safety
export const WalletProviders = {
  THIRDWEB: 'thirdweb',
  RAINBOW_KIT: 'rainbow-kit'
} as const

export type WalletProvider =
  (typeof WalletProviders)[keyof typeof WalletProviders]

// Get the current wallet provider from environment variable
const WALLET_PROVIDER = envPublic.NEXT_PUBLIC_WALLET_PROVIDER as WalletProvider

// Validate that the wallet provider is supported
const SUPPORTED_PROVIDERS = Object.values(WalletProviders)
if (!SUPPORTED_PROVIDERS.includes(WALLET_PROVIDER)) {
  throw new Error(
    `Unsupported wallet provider: ${WALLET_PROVIDER}. Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`
  )
}

// Get the current wallet provider
export const getWalletProvider = (): WalletProvider => WALLET_PROVIDER

// Check if using a specific wallet provider
export const isWalletProvider = (provider: WalletProvider): boolean =>
  WALLET_PROVIDER === provider
