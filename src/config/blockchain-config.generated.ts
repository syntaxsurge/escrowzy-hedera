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
        subscriptionManager: '0x4AD722AEFf2D98ABB879aA4f7E907659263C3641',
        escrowCore: '0x8b1B9DCa3dAc6A2fb0AE3518D1e33DC277fc7B25',
        achievementNFT: '0xee946764766Fa09e54794F2a0aA3CB3A133e163E'
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
