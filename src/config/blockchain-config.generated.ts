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
        subscriptionManager: '0x48e265591746d51a66740035884b2067B53323c3',
        escrowCore: '0xC58aD84Be77d581E6d6e99836d23C06A354f1E58',
        achievementNFT: '0xD50507b2a82eF548A3E4996BB91D66fDeDEACf09'
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
        subscriptionManager: '0x9C2d41Cbde1e37A0d9C7e769594cCbc84d486835',
        escrowCore: '0xA099937F48BEecd170EDdF20F66eb738F54d9b63',
        achievementNFT: '0x79Dc4fbF279862ef631c01d6937A6fC31dfa6e2f'
      }
    }
  }
}
