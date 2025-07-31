import { z } from 'zod'

if (typeof window !== 'undefined') {
  throw new Error(
    'env.server.ts was imported in the browser. Use env.public.ts instead.'
  )
}

const ServerEnv = z.object({
  // Database
  POSTGRES_URL: z.string().url(),

  // Authentication
  AUTH_SECRET: z.string().min(1),

  // Cron Jobs
  CRON_SECRET: z.string().optional().default(''),

  // Email Service
  RESEND_API_KEY: z.string().optional().default(''),
  FROM_EMAIL: z.string().email().optional().default('noreply@example.com'),

  // Blockchain
  ADMIN_ADDRESS: z.string().optional().default(''),
  ADMIN_PRIVATE_KEY: z.string().optional().default(''),

  // External APIs
  COINGECKO_API_KEY: z.string().optional().default(''),
  OKX_DEX_API_KEY: z.string().optional().default(''),
  OKX_DEX_SECRET_KEY: z.string().optional().default(''),
  OKX_DEX_PASSPHRASE: z.string().optional().default(''),
  OKX_DEX_PROJECT_ID: z.string().optional().default(''),

  // Pusher (Real-time)
  PUSHER_APP_ID: z.string().optional().default(''),
  PUSHER_SECRET: z.string().optional().default(''),

  // Node Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development')
})

const parsedEnv = ServerEnv.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsedEnv.error.flatten().fieldErrors
  )
  throw new Error('Invalid environment variables')
}

export const envServer = parsedEnv.data
