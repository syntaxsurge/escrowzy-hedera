import { z } from 'zod'

const PublicEnv = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_NAME: z.string().optional().default(''),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3000'),

  // Wallet Provider
  NEXT_PUBLIC_WALLET_PROVIDER: z
    .enum(['thirdweb', 'rainbow-kit'])
    .optional()
    .default('rainbow-kit'),
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: z.string().optional().default(''),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional().default(''),

  // Email
  NEXT_PUBLIC_ADMIN_EMAIL: z
    .string()
    .email()
    .optional()
    .default('admin@example.com'),
  NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL: z
    .string()
    .email()
    .optional()
    .default('domains@escrowzy.com'),

  // Pusher (Real-time)
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional().default(''),

  // Blockchain
  BLOCKCHAIN_CONFIG_PATH: z
    .string()
    .optional()
    .default('./config/blockchains.yaml'),

  // External Links
  NEXT_PUBLIC_DEMO_VIDEO_URL: z.string().url().optional(),
  NEXT_PUBLIC_PITCH_DECK_URL: z.string().url().optional()
})

// For client-side, Next.js needs explicit access to each env var for build-time replacement
// Unfortunately, we can't avoid this duplication due to how Next.js works
const envVars =
  typeof window !== 'undefined'
    ? {
        // Client-side: use explicit env vars for Next.js build-time replacement
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_WALLET_PROVIDER: process.env.NEXT_PUBLIC_WALLET_PROVIDER,
        NEXT_PUBLIC_THIRDWEB_CLIENT_ID:
          process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        NEXT_PUBLIC_ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
        NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL:
          process.env.NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL,
        NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
        NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        BLOCKCHAIN_CONFIG_PATH: process.env.BLOCKCHAIN_CONFIG_PATH,
        NEXT_PUBLIC_DEMO_VIDEO_URL: process.env.NEXT_PUBLIC_DEMO_VIDEO_URL,
        NEXT_PUBLIC_PITCH_DECK_URL: process.env.NEXT_PUBLIC_PITCH_DECK_URL
      }
    : process.env // Server-side: use full process.env

const parsedEnv = PublicEnv.safeParse(envVars)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid public environment variables:',
    parsedEnv.error.flatten().fieldErrors
  )
  throw new Error('Invalid public environment variables')
}

export const envPublic = parsedEnv.data
