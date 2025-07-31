#!/usr/bin/env -S npx tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getBlockchainConfig } from '../../src/lib/blockchain'
import { loadBlockchainConfigAsync } from '../../src/config/blockchain-config-loader'
import { envScripts, scriptEnv } from '../../src/config/env.scripts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Generate foundry.toml content
async function generateFoundryConfig() {
  const yamlConfig = await loadBlockchainConfigAsync()
  const blockchainConfig = getBlockchainConfig()

  let config = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
optimizer = true
optimizer_runs = 200
via_ir = true
solc = "0.8.25"
evm_version = "london"
fs_permissions = [{ access = "read-write", path = "./deployments" }]

# Remappings will be in remappings.txt
auto_detect_remappings = true

# RPC endpoints (dynamically generated from blockchain configuration)
[rpc_endpoints]\n`

  // Add RPC endpoints
  for (const [chainName, chainConfig] of Object.entries(yamlConfig.chains)) {
    const networkName = chainName
    config += `${networkName} = "${chainConfig.rpcUrl}"\n`
  }

  config += `\n# Etherscan API keys for verification
[etherscan]\n`

  // Add etherscan configs (Hedera uses Sourcify, not Etherscan)
  for (const [chainName, chainConfig] of Object.entries(yamlConfig.chains)) {
    const networkName = chainName
    // Skip Hedera networks as they use Sourcify
    if (!networkName.toLowerCase().includes('hedera')) {
      config += `${networkName} = { key = "" }\n`
    }
  }
  config += `# Hedera uses Sourcify for verification, not Etherscan\n`

  config += `\n# Test configuration
[fuzz]
runs = 256

[invariant]
runs = 256
depth = 15
fail_on_revert = false`

  return config
}

// Generate deployment script helper
async function generateDeploymentHelper() {
  const yamlConfig = await loadBlockchainConfigAsync()

  // Get admin config from environment
  const { address: adminAddress, privateKey: adminPrivateKey } =
    scriptEnv.getAdminConfig()

  let script = `#!/bin/bash
# Auto-generated deployment helper script
# This script helps deploy contracts to all configured networks

set -e

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "Error: Foundry is not installed."
    echo "Please install Foundry by running:"
    echo "  curl -L https://foundry.paradigm.xyz | bash"
    echo "  foundryup"
    exit 1
fi

# Ensure deployments directory exists
mkdir -p deployments

# Load environment variables from parent directory
if [ -f ../.env ]; then
    set -a
    source ../.env
    set +a
fi

# Use PRIVATE_KEY if set, otherwise use ADMIN_PRIVATE_KEY from .env
DEPLOY_PRIVATE_KEY=\${PRIVATE_KEY:-\${ADMIN_PRIVATE_KEY}}

if [ -z "$DEPLOY_PRIVATE_KEY" ]; then
    echo "Error: No private key found for deployment."
    echo ""
    echo "Please set either:"
    echo "1. ADMIN_PRIVATE_KEY in .env file"
    echo "2. PRIVATE_KEY environment variable"
    echo "3. Use Foundry's keystore: cast wallet import deployer"
    exit 1
fi

# Use ADMIN_ADDRESS from .env
ADMIN_ADDRESS=\${ADMIN_ADDRESS}

# Function to deploy to a specific network
deploy_to_network() {
    local network=$1
    local verify_flag=$2
    
    echo "Deploying to $network..."
    
    # First, generate the blockchain config file
    echo "Generating blockchain configuration..."
    (cd .. && npm run prebuild) > /dev/null 2>&1
    
    # Convert USD prices to native currency for this network
    if npx tsx --version &> /dev/null; then
        echo "Converting USD prices to native currency..."
        # Capture the export commands from the conversion script
        PRICE_EXPORTS=$(NODE_OPTIONS='--no-warnings=ExperimentalWarning' npx tsx utils/convert-prices.ts $network | tail -3)
        eval "$PRICE_EXPORTS"
    else
        echo "Warning: tsx not found, using default prices"
    fi
    
    # Export ADMIN_ADDRESS for the forge script
    export ADMIN_ADDRESS
    
    # Deploy based on network type
    if [[ "$network" == "hederaTestnet" || "$network" == "hederaMainnet" ]]; then
        # Hedera deployment - uses special script with transaction batching
        echo "Deploying to Hedera network (using optimized script)..."
        forge script script/DeployHedera.s.sol:DeployHederaScript --rpc-url $network --private-key $DEPLOY_PRIVATE_KEY --broadcast --slow --legacy
        
        if [ "$verify_flag" = "--verify" ]; then
            echo ""
            echo "Note: For Hedera verification, use Sourcify separately:"
            echo "forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_PATH> --chain-id $([[ \"$network\" == \"hederaTestnet\" ]] && echo 296 || echo 295) --verifier sourcify --verifier-url https://server-verify.hashscan.io/"
        fi
    elif [ "$verify_flag" = "--verify" ]; then
        forge script script/Deploy.s.sol --rpc-url $network --private-key $DEPLOY_PRIVATE_KEY --broadcast --verify
    else
        forge script script/Deploy.s.sol --rpc-url $network --private-key $DEPLOY_PRIVATE_KEY --broadcast
    fi
}

# Function to aggregate deployments after completion
aggregate_deployments() {
    # Try using npx tsx first (will use local installation)
    # Use NODE_OPTIONS to suppress experimental warnings
    if npx tsx --version &> /dev/null; then
        echo ""
        echo "Aggregating deployment data..."
        NODE_OPTIONS='--no-warnings=ExperimentalWarning' npx tsx utils/aggregate-deployments.ts
    elif command -v tsx &> /dev/null; then
        echo ""
        echo "Aggregating deployment data..."
        NODE_OPTIONS='--no-warnings=ExperimentalWarning' tsx utils/aggregate-deployments.ts
    elif command -v ts-node &> /dev/null; then
        echo ""
        echo "Aggregating deployment data..."
        NODE_OPTIONS='--no-warnings=ExperimentalWarning' ts-node utils/aggregate-deployments.ts
    else
        echo ""
        echo "Note: tsx not found, consider installing it with 'pnpm add -D tsx'"
    fi
}

# Deploy to all networks or specific network
if [ "$1" = "--all" ]; then
    echo "Deploying to all configured networks..."
`

  // Add deployment commands for each network
  for (const [chainName, chainConfig] of Object.entries(yamlConfig.chains)) {
    script += `    deploy_to_network ${chainName} $2\n`
  }

  script += `    aggregate_deployments
elif [ -n "$1" ]; then
    deploy_to_network $1 $2
    aggregate_deployments
else
    echo "Usage: ./deploy.sh [--all | network-name] [--verify]"
    echo ""
    echo "Available networks:"
`

  // List available networks
  for (const [chainName, chainConfig] of Object.entries(yamlConfig.chains)) {
    script += `    echo "  - ${chainName} (Chain ID: ${chainConfig.chainId})"\n`
  }

  script += `    echo ""
    echo "Environment variables (set in .env file):"
    echo "  ADMIN_ADDRESS - Admin address for contracts"
    echo "  ADMIN_PRIVATE_KEY - Private key for deployment (required)"
    echo ""
    echo "Alternative: Use Foundry keystore"
    echo "  cast wallet import deployer"
    echo "  forge script ... --account deployer"
fi`

  return script
}

// Main execution
async function main() {
  try {
    // Generate foundry.toml
    const foundryConfig = await generateFoundryConfig()
    const foundryConfigPath = path.join(__dirname, '..', 'foundry.toml')
    fs.writeFileSync(foundryConfigPath, foundryConfig)
    console.log('✓ Generated foundry.toml')

    // Generate deployment helper
    const deployHelper = await generateDeploymentHelper()
    const deployHelperPath = path.join(__dirname, '..', 'deploy.sh')
    fs.writeFileSync(deployHelperPath, deployHelper)
    fs.chmodSync(deployHelperPath, '755')
    console.log('✓ Generated deploy.sh')

    console.log('\nConfiguration generated successfully!')
    const yamlConfig = await loadBlockchainConfigAsync()
    console.log('Networks configured:', Object.keys(yamlConfig.chains).length)

    // Check if private key is available
    const { privateKey: adminPrivateKey } = scriptEnv.getAdminConfig()
    if (!adminPrivateKey) {
      console.warn('\n⚠️  Warning: No ADMIN_PRIVATE_KEY found in .env file')
      console.log(
        'Deployment will require ADMIN_PRIVATE_KEY in .env or PRIVATE_KEY environment variable'
      )
    }
  } catch (error: any) {
    console.error('Error generating configuration:', error.message)
    process.exit(1)
  }
}

main()
