import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import yaml from 'js-yaml'

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get config path from environment or use default
const configPath =
  process.env.BLOCKCHAIN_CONFIG_PATH || './config/blockchains.yaml'

let absolutePath

if (path.isAbsolute(configPath)) {
  absolutePath = configPath
} else {
  // Try current directory first
  absolutePath = path.join(process.cwd(), configPath)

  // If not found and we're in a subdirectory, try parent directory
  if (!fs.existsSync(absolutePath) && process.cwd().includes('/contracts')) {
    const parentPath = path.join(process.cwd(), '..', configPath)
    if (fs.existsSync(parentPath)) {
      absolutePath = parentPath
    }
  }
}

// Check if file exists
if (!fs.existsSync(absolutePath)) {
  throw new Error(`Blockchain configuration file not found: ${absolutePath}`)
}

// Load YAML file
const yamlContent = fs.readFileSync(absolutePath, 'utf8')
const rawConfig = yaml.load(yamlContent)

// Filter out disabled chains
const config = {
  ...rawConfig,
  chains: Object.entries(rawConfig.chains || {}).reduce((acc, [key, chain]) => {
    // Only include chains that are enabled (default to true if not specified)
    if (chain.enabled !== false) {
      // Remove the enabled field from the output
      const { enabled: _enabled, ...chainWithoutEnabled } = chain
      acc[key] = chainWithoutEnabled
    }
    return acc
  }, {})
}

// Function to convert JSON to TypeScript object notation
function jsonToTsObject(obj, indent = 0) {
  const spaces = '  '.repeat(indent)
  const nextIndent = indent + 1
  const nextSpaces = '  '.repeat(nextIndent)

  if (obj === null) return 'null'
  if (obj === undefined) return 'undefined'
  if (typeof obj === 'string') return `'${obj.replace(/'/g, "\\'")}'`
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return `[\n${obj.map(item => `${nextSpaces}${jsonToTsObject(item, nextIndent)}`).join(',\n')}\n${spaces}]`
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj)
    if (entries.length === 0) return '{}'
    return `{\n${entries
      .map(([key, value]) => {
        const needsQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        const keyStr = needsQuotes ? `'${key}'` : key
        const valueStr = jsonToTsObject(value, nextIndent)
        // Add line break after colon for long values
        if (
          valueStr.includes('\n') &&
          !valueStr.startsWith('{') &&
          !valueStr.startsWith('[')
        ) {
          return `${nextSpaces}${keyStr}:\n${nextSpaces}  ${valueStr}`
        }
        return `${nextSpaces}${keyStr}: ${valueStr}`
      })
      .join(',\n')}\n${spaces}}`
  }

  return String(obj)
}

// Generate TypeScript file
const outputPath = path.join(
  process.cwd(),
  'src/config/blockchain-config.generated.ts'
)
const outputContent = `// This file is auto-generated. Do not edit directly.
// Generated from: ${configPath}

import type { BlockchainConfig } from './blockchain-config-loader'

export const blockchainConfig: BlockchainConfig = ${jsonToTsObject(config)}
`

// Ensure directory exists
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Write the file
fs.writeFileSync(outputPath, outputContent)

console.log(`✓ Generated blockchain config at ${outputPath}`)
