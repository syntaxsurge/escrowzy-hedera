// Edge-compatible environment config
// This file is used in middleware and other edge runtime contexts

import { z } from 'zod'

const EdgeEnv = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),

  // Authentication
  AUTH_SECRET: z.string().optional().default(''),

  // Cron
  CRON_SECRET: z.string().optional().default('')
})

// Parse environment variables
const parsedEnv = EdgeEnv.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  CRON_SECRET: process.env.CRON_SECRET
})

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid edge environment variables:',
    parsedEnv.error.flatten().fieldErrors
  )
  // Don't throw in edge runtime, use defaults
}

const data = parsedEnv.success ? parsedEnv.data : EdgeEnv.parse({})

export const envEdge = {
  // Node Environment
  nodeEnv: data.NODE_ENV,
  isDevelopment: data.NODE_ENV === 'development',
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',

  // Authentication
  authSecret: data.AUTH_SECRET,

  // Cron
  cronSecret: data.CRON_SECRET
} as const
