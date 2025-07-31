import type { Config } from 'drizzle-kit'

import { envServer } from '@/config/env.server'

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: envServer.POSTGRES_URL
  }
} satisfies Config
