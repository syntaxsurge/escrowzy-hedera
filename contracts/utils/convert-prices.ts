#!/usr/bin/env tsx
import { parseUnits } from 'viem'
import { loadBlockchainConfigAsync } from '../../src/config/blockchain-config-loader'
import { getCryptoPriceCLI } from '../../src/lib/api/coingecko-cli'
import { scriptEnv } from '../../src/config/env.scripts'

async function convertUsdToPrices() {
  const config = await loadBlockchainConfigAsync()
  const networkName = process.argv[2]

  if (!networkName) {
    console.error('Please provide a network name as argument')
    process.exit(1)
  }

  const chainConfig = config.chains[networkName]
  if (!chainConfig) {
    console.error(`Network ${networkName} not found in configuration`)
    process.exit(1)
  }

  try {
    // Get Coingecko API key from environment if available
    const { coingecko: coingeckoApiKey } = scriptEnv.getApiKeys()
    const cryptoPrice = await getCryptoPriceCLI(
      chainConfig.coingeckoId,
      coingeckoApiKey
    )

    if (cryptoPrice <= 0) {
      throw new Error('Invalid crypto price')
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

    // Use console.error to ensure output is shown (goes to stderr)
    console.error(
      `\nPricing for ${chainConfig.name} (${chainConfig.nativeCurrency.symbol}):`
    )
    console.error(
      `Current ${chainConfig.nativeCurrency.symbol} price: $${cryptoPrice.toFixed(2)}`
    )
    console.error(
      `Pro Plan: $${proUsd} = ${proInNative.toFixed(6)} ${chainConfig.nativeCurrency.symbol}`
    )
    console.error(
      `Enterprise Plan: $${enterpriseUsd} = ${enterpriseInNative.toFixed(6)} ${chainConfig.nativeCurrency.symbol}`
    )
    console.error(`Pro Price (wei): ${proPriceWei.toString()}`)
    console.error(`Enterprise Price (wei): ${enterprisePriceWei.toString()}`)

    // Export as environment variables for the deployment script
    // Output to stdout (not logger) so it can be captured by shell script
    console.log(`export PRO_PRICE_WEI=${proPriceWei.toString()}`)
    console.log(`export ENTERPRISE_PRICE_WEI=${enterprisePriceWei.toString()}`)
    console.log(
      `export NATIVE_CURRENCY_SYMBOL="${chainConfig.nativeCurrency.symbol}"`
    )
  } catch (error: any) {
    console.error('Error converting prices:', error.message)
    process.exit(1)
  }
}

convertUsdToPrices()
