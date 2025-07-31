/**
 * Environment configuration for scripts and utilities
 * This file is used by Node.js scripts that run outside the Next.js environment
 * (e.g., contract utilities, deployment scripts, etc.)
 */

import path from 'path'
import { fileURLToPath } from 'url'

import dotenv from 'dotenv'
import { z } from 'zod'

// Determine the root directory (traverse up from current file location)
function findRootDir(startPath: string): string {
  let currentPath = startPath

  // Look for package.json as the root indicator
  while (currentPath !== '/') {
    const packageJsonPath = path.join(currentPath, 'package.json')
    if (require('fs').existsSync(packageJsonPath)) {
      return currentPath
    }
    currentPath = path.dirname(currentPath)
  }

  // Fallback to two directories up from scripts location
  return path.join(startPath, '..', '..')
}

// Load .env file from root directory
let rootDir: string
try {
  // Try to get __dirname for CommonJS environments
  if (typeof __dirname !== 'undefined') {
    rootDir = findRootDir(__dirname)
  } else {
    // ESM environment - use import.meta.url
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    rootDir = findRootDir(__dirname)
  }
} catch {
  // Fallback for environments where import.meta might not be available
  rootDir = process.cwd()
}

const envPath = path.join(rootDir, '.env')
dotenv.config({ path: envPath })

// Schema for script environment variables
const ScriptEnvSchema = z.object({
  // Node Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),

  // Blockchain Admin Configuration
  ADMIN_ADDRESS: z.string().optional().default(''),
  ADMIN_PRIVATE_KEY: z.string().optional().default(''),

  // External API Keys
  COINGECKO_API_KEY: z.string().optional().default(''),

  // Blockchain Configuration Path
  BLOCKCHAIN_CONFIG_PATH: z
    .string()
    .optional()
    .default('./config/blockchains.yaml'),

  // Next.js Runtime (for instrumentation)
  NEXT_RUNTIME: z.string().optional()
})

// Parse and validate environment variables
const parsedEnv = ScriptEnvSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables for scripts:',
    parsedEnv.error.flatten().fieldErrors
  )
  // Don't throw error for scripts - just warn
  console.warn('⚠️  Using default values for missing environment variables')
}

// Export the validated environment config
export const envScripts = parsedEnv.success
  ? parsedEnv.data
  : ScriptEnvSchema.parse({}) // Use defaults if parsing fails

// Helper functions for script usage
export const scriptEnv = {
  // Check environment
  isDevelopment: envScripts.NODE_ENV === 'development',
  isProduction: envScripts.NODE_ENV === 'production',
  isTest: envScripts.NODE_ENV === 'test',
  isNextRuntime: envScripts.NEXT_RUNTIME === 'nodejs',

  // Get admin configuration
  getAdminConfig() {
    return {
      address: envScripts.ADMIN_ADDRESS,
      privateKey: envScripts.ADMIN_PRIVATE_KEY
    }
  },

  // Get API keys
  getApiKeys() {
    return {
      coingecko: envScripts.COINGECKO_API_KEY
    }
  },

  // Get paths
  getPaths() {
    return {
      blockchainConfig: envScripts.BLOCKCHAIN_CONFIG_PATH,
      root: rootDir,
      env: envPath
    }
  },

  // Check if running in Next.js context
  isNextjsEnvironment() {
    return envScripts.NEXT_RUNTIME === 'nodejs'
  },

  // Validate required environment variables for deployment
  validateDeploymentEnv() {
    const errors: string[] = []

    if (!envScripts.ADMIN_ADDRESS) {
      errors.push('ADMIN_ADDRESS is required for deployment')
    }

    if (!envScripts.ADMIN_PRIVATE_KEY) {
      errors.push('ADMIN_PRIVATE_KEY is required for deployment')
    }

    if (errors.length > 0) {
      console.error('❌ Deployment environment validation failed:')
      errors.forEach(error => console.error(`  - ${error}`))
      return false
    }

    return true
  }
}

// Export root directory for scripts that need it
export const PROJECT_ROOT = rootDir
