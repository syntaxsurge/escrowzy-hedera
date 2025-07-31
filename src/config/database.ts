// Database configuration
export const databaseConfig = {
  defaultConnection: {
    local: 'postgres://postgres:postgres@localhost:54322/postgres',
    docker: 'postgres://postgres:postgres@db:5432/postgres'
  },
  poolSettings: {
    max: 10,
    min: 2,
    idleTimeout: 30000,
    connectionTimeout: 20000
  },
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  },
  migrations: {
    tableName: 'drizzle_migrations',
    migrationsFolder: './src/lib/db/migrations'
  }
} as const
