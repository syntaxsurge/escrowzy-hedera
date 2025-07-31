import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { envServer } from '@/config/env.server'

import * as schema from './schema'

export const client = postgres(envServer.POSTGRES_URL)
export const db = drizzle(client, { schema })
