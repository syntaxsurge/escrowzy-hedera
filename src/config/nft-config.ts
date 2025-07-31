/**
 * NFT and IPFS Configuration
 * Centralizes all NFT metadata, IPFS gateway settings, and achievement configurations
 */

// IPFS Configuration
export const ipfsConfig = {
  // Primary IPFS gateway (can be changed to other gateways like Pinata, Infura, etc.)
  gateway: 'https://ipfs.io/ipfs/',

  // Alternative gateways for fallback
  alternativeGateways: [
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.ipfs.io/ipfs/'
  ],

  // Achievement NFT metadata base URI
  achievementBaseUri: 'ipfs://QmQfesvAL4kVAhrGqo6gBP7ntzMYdK73UfhiU/',

  // Achievement metadata URIs (relative to base URI)
  achievementMetadata: {
    firstTrade: 'first-trade.json',
    tenTrades: 'ten-trades.json',
    hundredTrades: 'hundred-trades.json',
    thousandTrades: 'thousand-trades.json',
    firstBattle: 'first-battle.json',
    firstWin: 'first-win.json',
    battleMaster: 'battle-master.json',
    disputeResolver: 'dispute-resolver.json',
    trustedTrader: 'trusted-trader.json',
    earlyAdopter: 'early-adopter.json',
    hotStreak: 'hot-streak.json',
    volumeTrader: 'volume-trader.json',
    teamPlayer: 'team-player.json'
  },

  // Legacy achievement URIs (for backward compatibility)
  legacyMetadataUris: {
    earlyAdopter: 'ipfs://QmEarlyAdopter',
    battleMaster: 'ipfs://QmBattleMaster',
    tradeVeteran: 'ipfs://QmTradeVeteran',
    firstTrade: 'ipfs://QmFirstTrade',
    teamPlayer: 'ipfs://QmTeamPlayer',
    hotStreak: 'ipfs://QmHotStreak',
    volumeTrader: 'ipfs://QmVolumeTrader'
  }
} as const

// NFT Collection Configuration
export const nftConfig = {
  // Achievement NFT Collection
  achievement: {
    name: 'Escrowzy Achievement NFT',
    symbol: 'ESCHIEVE',
    maxSupply: 10000,
    royaltyBps: 250, // 2.5% royalty
    defaultMetadataBaseUri: ipfsConfig.achievementBaseUri
  },

  // Contract deployment settings
  deployment: {
    gasLimit: 3000000,
    confirmations: 2
  }
} as const

// Helper functions for working with IPFS URIs
export const ipfsHelpers = {
  /**
   * Get the full IPFS URI for an achievement
   */
  getAchievementUri(
    achievementType: keyof typeof ipfsConfig.achievementMetadata
  ): string {
    return `${ipfsConfig.achievementBaseUri}${ipfsConfig.achievementMetadata[achievementType]}`
  },

  /**
   * Convert IPFS URI to HTTP gateway URL
   */
  toGatewayUrl(ipfsUri: string, gateway?: string): string {
    const selectedGateway = gateway || ipfsConfig.gateway
    const hash = ipfsUri.replace('ipfs://', '')
    return `${selectedGateway}${hash}`
  },

  /**
   * Extract IPFS hash from URI
   */
  extractHash(ipfsUri: string): string {
    return ipfsUri.replace('ipfs://', '').split('/')[0]
  },

  /**
   * Validate if a string is a valid IPFS URI
   */
  isValidIpfsUri(uri: string): boolean {
    return uri.startsWith('ipfs://') && uri.length > 7
  },

  /**
   * Get legacy URI if exists, otherwise return new format
   */
  getLegacyOrNewUri(achievementType: string): string {
    const legacyKey =
      achievementType as keyof typeof ipfsConfig.legacyMetadataUris
    const metadataKey =
      achievementType as keyof typeof ipfsConfig.achievementMetadata

    if (legacyKey in ipfsConfig.legacyMetadataUris) {
      return ipfsConfig.legacyMetadataUris[legacyKey]
    }

    if (metadataKey in ipfsConfig.achievementMetadata) {
      return ipfsHelpers.getAchievementUri(metadataKey)
    }

    return ''
  }
}

// Achievement metadata structure type
export interface AchievementMetadata {
  name: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  external_url?: string
}

// Export all achievement types for type safety
export type AchievementType = keyof typeof ipfsConfig.achievementMetadata

// Export legacy achievement types
export type LegacyAchievementType = keyof typeof ipfsConfig.legacyMetadataUris
