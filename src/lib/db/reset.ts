import { execSync } from 'node:child_process'

import postgres from 'postgres'

import { envServer } from '@/config/env.server'

/**
 * Completely wipes the current Postgres schema, then runs migrations
 * and seed scripts to restore a fresh development database.
 *
 * Usage:  pnpm run db:reset
 */
async function main() {
  /* -------------------------------- Drop schema ------------------------------- */
  const sql = postgres(envServer.POSTGRES_URL, { max: 1 })
  try {
    console.log('⏳  Dropping existing schema…')
    await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE')
    await sql.unsafe('CREATE SCHEMA public')
    console.log('✅  Schema dropped and recreated.')
  } finally {
    await sql.end()
  }

  /* ------------------------------- Migrations --------------------------------- */
  console.log('⏳  Regenerating migrations & pushing schema…')
  execSync('pnpm run db:push', { stdio: 'inherit' })
  console.log('✅  Migrations applied.')

  /* --------------------------------- Seeding ---------------------------------- */
  console.log('⏳  Seeding database…')
  execSync('pnpm run db:seed', { stdio: 'inherit' })
  console.log('🎉  Database reset and seeded successfully.')
}

main().catch(err => {
  console.error('❌  Database reset failed:', err)
  process.exit(1)
})
