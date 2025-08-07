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
        decimals: 8
      },
      coingeckoId: 'hedera-hashgraph',
      isTestnet: true,
      contractAddresses: {
        subscriptionManager: '0x5E03b2f7F16A2bC32E00374e4FfB954d5e29Db55',
        escrowCore: '0x30F75b2308bffd9F74b84DD8C6B2938bf59e4D17',
        achievementNFT: '0x320a5ef19efAa9b4522d6c325E62063040Ec144A'
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
        decimals: 8
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
