// This file is auto-generated. Do not edit directly.
// Generated from: ./config/blockchains.yaml

import type { BlockchainConfig } from './blockchain-config-loader'

export const blockchainConfig: BlockchainConfig = {
  subscriptionPricing: {
    pro: 3,
    enterprise: 5
  },
  chains: {
    hederaTestnet: {
      chainId: 296,
      name: 'Hedera Testnet',
      rpcUrl: 'https://testnet.hashio.io/api',
      explorerUrl: 'https://hashscan.io/testnet',
      logo: 'https://assets.coingecko.com/coins/images/3688/standard/hbar.png',
      nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18
      },
      coingeckoId: 'hedera-hashgraph',
      isTestnet: true,
      contractAddresses: {
        subscriptionManager: '0xF5FCDBe9d4247D76c7fa5d2E06dBA1e77887F518',
        escrowCore: '0x761D0dbB45654513AdF1BF6b5D217C0f8B3c5737',
        achievementNFT: '0x27E9062ee91A0D60De39984346cAeD53bE68024c'
      }
    },
    hederaMainnet: {
      chainId: 295,
      name: 'Hedera Mainnet',
      rpcUrl: 'https://mainnet.hashio.io/api',
      explorerUrl: 'https://hashscan.io/mainnet',
      logo: 'https://assets.coingecko.com/coins/images/3688/standard/hbar.png',
      nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18
      },
      coingeckoId: 'hedera-hashgraph',
      isTestnet: false,
      contractAddresses: {
        subscriptionManager: '',
        escrowCore: '',
        achievementNFT: ''
      }
    }
  }
}
