import { z } from 'zod'

import { blockchainConfig } from './blockchain-config.generated'

// Zod schema for blockchain configuration
export const ChainConfigSchema = z.object({
  chainId: z.number(),
  name: z.string(),
  rpcUrl: z.string().url(),
  explorerUrl: z.string().url(),
  logo: z.string().url().optional(),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string(),
    decimals: z.number()
  }),
  coingeckoId: z.string(),
  isTestnet: z.boolean().optional().default(false),
  contractAddresses: z.object({
    subscriptionManager: z.string().optional().default(''),
    escrowCore: z.string().optional().default(''),
    achievementNFT: z.string().optional().default('')
  })
})

export const BlockchainConfigSchema = z.object({
  subscriptionPricing: z.object({
    pro: z.number(),
    enterprise: z.number()
  }),
  chains: z.record(z.string(), ChainConfigSchema)
})

export type BlockchainConfig = z.infer<typeof BlockchainConfigSchema>
export type ChainConfig = z.infer<typeof ChainConfigSchema>

// Main function to load blockchain configuration
export function loadBlockchainConfig(): BlockchainConfig {
  // Always use the pre-generated configuration
  // This is safe because the config is generated at build time
  return BlockchainConfigSchema.parse(blockchainConfig)
}

// Server-side async loader for blockchain configuration
export async function loadBlockchainConfigAsync() {
  return loadBlockchainConfig()
}
