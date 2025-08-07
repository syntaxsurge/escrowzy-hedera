#!/usr/bin/env tsx

// Set IS_SCRIPT environment variable to bypass Next.js caching
process.env.IS_SCRIPT = 'true'

import fs from 'fs'
import path from 'path'
import { parseUnits } from 'viem'
import { fileURLToPath } from 'url'
import { loadBlockchainConfigAsync } from '../../src/config/blockchain-config-loader'
import { getCachedPrice } from '../../src/lib/api/price-service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ChainPrices {
  chainId: number
  chainName: string
  nativeSymbol: string
  proPriceWei: string
  enterprisePriceWei: string
}

async function generatePricesContract() {
  const config = await loadBlockchainConfigAsync()

  const chainPrices: ChainPrices[] = []
  const errors: string[] = []

  console.log('Generating price constants for all chains...\n')

  // Process each chain
  for (const [chainName, chainConfig] of Object.entries(config.chains)) {
    try {
      console.log(`Processing ${chainConfig.name}...`)

      // Get current crypto price using fallback service
      const priceResult = await getCachedPrice(chainConfig.coingeckoId, {
        symbol: chainConfig.nativeCurrency.symbol,
        coingeckoId: chainConfig.coingeckoId
      })

      const cryptoPrice = priceResult?.price
      if (!cryptoPrice || cryptoPrice <= 0) {
        throw new Error(
          `Invalid price for ${chainConfig.nativeCurrency.symbol}`
        )
      }

      const proUsd = config.subscriptionPricing.pro
      const enterpriseUsd = config.subscriptionPricing.enterprise

      // Convert USD to native currency
      const proInNative = proUsd / cryptoPrice
      const enterpriseInNative = enterpriseUsd / cryptoPrice

      // Convert to wei with proper decimals
      const proPriceWei = parseUnits(
        proInNative.toFixed(18),
        chainConfig.nativeCurrency.decimals
      )
      const enterprisePriceWei = parseUnits(
        enterpriseInNative.toFixed(18),
        chainConfig.nativeCurrency.decimals
      )

      chainPrices.push({
        chainId: chainConfig.chainId,
        chainName,
        nativeSymbol: chainConfig.nativeCurrency.symbol,
        proPriceWei: proPriceWei.toString(),
        enterprisePriceWei: enterprisePriceWei.toString()
      })

      console.log(
        `  ✓ ${chainConfig.nativeCurrency.symbol} price: $${cryptoPrice.toFixed(2)}`
      )
      console.log(
        `  ✓ Pro: $${proUsd} = ${proInNative.toFixed(6)} ${chainConfig.nativeCurrency.symbol}`
      )
      console.log(
        `  ✓ Enterprise: $${enterpriseUsd} = ${enterpriseInNative.toFixed(6)} ${chainConfig.nativeCurrency.symbol}\n`
      )
    } catch (error: any) {
      const errorMsg = `Failed to process ${chainName}: ${error.message}`
      errors.push(errorMsg)
      console.error(`  ✗ ${errorMsg}\n`)

      // Use fallback prices for failed chains
      const fallbackPro = parseUnits('3', chainConfig.nativeCurrency.decimals)
      const fallbackEnterprise = parseUnits(
        '5',
        chainConfig.nativeCurrency.decimals
      )

      chainPrices.push({
        chainId: chainConfig.chainId,
        chainName,
        nativeSymbol: chainConfig.nativeCurrency.symbol,
        proPriceWei: fallbackPro.toString(),
        enterprisePriceWei: fallbackEnterprise.toString()
      })
    }
  }

  // Generate Solidity contract
  const solidityContent = generateSolidityContent(
    chainPrices,
    config.subscriptionPricing
  )

  // Ensure directory exists
  const outputDir = path.join(__dirname, '..', 'src', 'generated')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write the Solidity file
  const outputPath = path.join(outputDir, 'Prices.sol')
  fs.writeFileSync(outputPath, solidityContent)

  console.log('========================================')
  console.log(`✓ Generated ${outputPath}`)
  console.log(`✓ Processed ${chainPrices.length} chains`)

  if (errors.length > 0) {
    console.log(`⚠ ${errors.length} chains used fallback prices`)
  }

  return chainPrices
}

function generateSolidityContent(
  chainPrices: ChainPrices[],
  subscriptionPricing: any
): string {
  const timestamp = new Date().toISOString()

  let content = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Auto-generated price constants
// Generated at: ${timestamp}
// USD Prices: Pro=$${subscriptionPricing.pro}, Enterprise=$${subscriptionPricing.enterprise}

library Prices {
    // Chain IDs
`

  // Add chain ID constants
  for (const chain of chainPrices) {
    const chainIdName = `CHAIN_${chain.chainName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    content += `    uint256 public constant ${chainIdName} = ${chain.chainId};\n`
  }

  content += `\n    // Get subscription prices for a specific chain
    function getPrices(uint256 chainId) internal pure returns (uint256 proPrice, uint256 enterprisePrice) {
`

  // Add price mapping logic
  for (let i = 0; i < chainPrices.length; i++) {
    const chain = chainPrices[i]
    const ifStatement = i === 0 ? 'if' : 'else if'
    content += `        ${ifStatement} (chainId == ${chain.chainId}) {
            // ${chain.chainName} (${chain.nativeSymbol})
            return (${chain.proPriceWei}, ${chain.enterprisePriceWei});
        }\n`
  }

  // Add default fallback
  content += `        else {
            // Default fallback prices
            revert("Unsupported chain ID");
        }
    }
    
    // Get pro subscription price for a specific chain
    function getProPrice(uint256 chainId) internal pure returns (uint256) {
        (uint256 proPrice, ) = getPrices(chainId);
        return proPrice;
    }
    
    // Get enterprise subscription price for a specific chain
    function getEnterprisePrice(uint256 chainId) internal pure returns (uint256) {
        (, uint256 enterprisePrice) = getPrices(chainId);
        return enterprisePrice;
    }
    
    // Get native currency symbol for a specific chain
    function getNativeCurrencySymbol(uint256 chainId) internal pure returns (string memory) {
`

  // Add native currency mapping
  for (let i = 0; i < chainPrices.length; i++) {
    const chain = chainPrices[i]
    const ifStatement = i === 0 ? 'if' : 'else if'
    content += `        ${ifStatement} (chainId == ${chain.chainId}) {
            return "${chain.nativeSymbol}";
        }\n`
  }

  content += `        else {
            return "NATIVE";
        }
    }
}
`

  return content
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePricesContract().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { generatePricesContract }
