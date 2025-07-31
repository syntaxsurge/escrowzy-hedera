#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Directory containing deployment files
const deploymentsDir = path.join(__dirname, '..', 'deployments')

// Ensure deployments directory exists
if (!fs.existsSync(deploymentsDir)) {
  console.log('No deployments directory found.')
  process.exit(0)
}

// Types for deployment data
interface Deployment {
  contractAddress: string
  chainId: number
  adminAddress: string
  timestamp?: number
  blockNumber?: number
}

interface Deployments {
  [chainId: string]: Deployment
}

// Read all deployment files
const deployments: Deployments = {}

// Read latest deployment files
const files = fs.readdirSync(deploymentsDir)
const latestFiles = files.filter(f => f.endsWith('-latest.json'))

latestFiles.forEach(file => {
  const content = fs.readFileSync(path.join(deploymentsDir, file), 'utf8')
  try {
    const deployment: Deployment = JSON.parse(content)
    const chainId = deployment.chainId.toString()
    deployments[chainId] = deployment
  } catch (e) {
    console.error(`Error parsing ${file}:`, e)
  }
})

// Write aggregated deployments
const aggregatedFile = path.join(deploymentsDir, 'all-deployments.json')
fs.writeFileSync(aggregatedFile, JSON.stringify(deployments, null, 2))

console.log(`Deployments aggregated to: ${aggregatedFile}`)
console.log('Deployed contracts:')
Object.entries(deployments).forEach(([chainId, deployment]) => {
  console.log(`  Chain ${chainId}: ${deployment.contractAddress}`)
})
