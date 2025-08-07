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
        subscriptionManager: '0x136FCa02340048C2B9BD44425604a4eA96477065',
        escrowCore: '0x7B8ebA26C79DF617b9e5E2523435F4BB84D73734',
        achievementNFT: '0x13769831301eD6beB4760BEc9886D734e22C6cfA'
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
    },
    baseSepolia: {
      chainId: 84532,
      name: 'Base Sepolia',
      rpcUrl: 'https://sepolia.base.org',
      explorerUrl: 'https://sepolia.basescan.org',
      logo: 'https://raw.githubusercontent.com/base/brand-kit/eba9e730be34f8c9ae7f9a21f32cc6aafebe2ad1/logo/TheSquare/Digital/Base_square_blue.svg',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      },
      coingeckoId: 'ethereum',
      isTestnet: true,
      contractAddresses: {
        subscriptionManager: '0x6e8462254076e115348248e55aDD7Ed52D44659e',
        escrowCore: '0xCbA5077A960787574b21bfD8CfbA9F2cce1F2D44',
        achievementNFT: '0xc799b3604aE80Aa283BDE2db97138F647EB3aBFe'
      }
    }
  }
}
