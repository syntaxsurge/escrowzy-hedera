import moduleAlias from 'module-alias'
import type { NextConfig } from 'next'

import { envPublic } from '@/config/env.public'

moduleAlias.addAlias('punycode', 'punycode/')

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true,
    authInterrupts: true
  },
  transpilePackages: ['wagmi', '@rainbow-me/rainbowkit'],

  async redirects() {
    return [
      {
        source: '/demo-video',
        destination:
          envPublic.NEXT_PUBLIC_DEMO_VIDEO_URL || 'https://youtu.be/xxxxxxx',
        permanent: false
      },
      {
        source: '/pitch-deck',
        destination:
          envPublic.NEXT_PUBLIC_PITCH_DECK_URL ||
          'https://www.canva.com/design/xxxxxxx/view',
        permanent: false
      }
    ]
  },

  webpack: (config, { isServer }) => {
    // Add externals for pino-pretty, lokijs, and encoding
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    if (!isServer) {
      // Fixes npm packages that depend on `fs`, `net`, `tls` modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
        perf_hooks: false,
        postgres: false,
        'postgres-js': false
      }

      // Prevent importing server-only modules in client bundles
      config.resolve.alias = {
        ...config.resolve.alias,
        postgres: false,
        'drizzle-orm/postgres-js': false,
        '@/lib/db/drizzle': false
      }
    }

    // Prevent WalletConnect and other Web3 modules from being bundled on server
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        bufferutil: 'commonjs bufferutil',
        '@walletconnect/universal-provider':
          'commonjs @walletconnect/universal-provider',
        '@walletconnect/ethereum-provider':
          'commonjs @walletconnect/ethereum-provider',
        viem: 'commonjs viem'
      })
    }

    return config
  }
}

export default nextConfig
