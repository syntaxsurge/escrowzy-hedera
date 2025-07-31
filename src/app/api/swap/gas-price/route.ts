import { NextRequest, NextResponse } from 'next/server'

import { apiEndpoints } from '@/config/api-endpoints'
import { envServer } from '@/config/env.server'
import { getChainIndex } from '@/lib/config/chain-mappings'

interface GasPrice {
  slow: string
  average: string
  fast: string
  baseFee?: string
  priority?: {
    low: string
    medium: string
    high: string
  }
}

interface OKXGasPriceResponse {
  code: string
  data: Array<{
    // EVM fields
    normal?: string
    min?: string
    max?: string
    supportEip1559?: boolean
    eip1559Protocol?: {
      suggestBaseFee: string
      baseFee: string
      proposePriorityFee: string
      safePriorityFee: string
      fastPriorityFee: string
    }
    // UTXO fields
    normalFeeRate?: string
    maxFeeRate?: string
    minFeeRate?: string
    inscriptionOutput?: string
    minOutput?: string
    normalCost?: string
    maxCost?: string
    minCost?: string
  }>
  msg: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainId = searchParams.get('chainId')

    if (!chainId) {
      return NextResponse.json(
        {
          success: false,
          error: 'chainId parameter is required'
        },
        { status: 400 }
      )
    }

    const chainIndex = getChainIndex(chainId)
    const gasPrice = await fetchOKXGasPrice(chainIndex)

    if (!gasPrice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch gas price from OKX API'
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      chainId,
      gasPrice,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Gas price API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

async function fetchOKXGasPrice(chainIndex: string): Promise<GasPrice | null> {
  try {
    const url = `${apiEndpoints.external.okxDex.baseUrl}${apiEndpoints.external.okxDex.basePath}${apiEndpoints.external.okxDex.endpoints.gasPrice}`

    const timestamp = new Date().toISOString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add OKX API credentials if available
    if (
      envServer.OKX_DEX_API_KEY &&
      envServer.OKX_DEX_SECRET_KEY &&
      envServer.OKX_DEX_PASSPHRASE
    ) {
      const crypto = await import('crypto')
      const method = 'GET'
      const requestPath = `${apiEndpoints.external.okxDex.basePath}${apiEndpoints.external.okxDex.endpoints.gasPrice}?chainIndex=${chainIndex}`
      const message = timestamp + method + requestPath

      const hmac = crypto.createHmac('sha256', envServer.OKX_DEX_SECRET_KEY)
      hmac.update(message)
      const signature = hmac.digest('base64')

      headers['OK-ACCESS-KEY'] = envServer.OKX_DEX_API_KEY
      headers['OK-ACCESS-SIGN'] = signature
      headers['OK-ACCESS-TIMESTAMP'] = timestamp
      headers['OK-ACCESS-PASSPHRASE'] = envServer.OKX_DEX_PASSPHRASE
      headers['OK-ACCESS-PROJECT'] =
        envServer.OKX_DEX_PROJECT_ID || envServer.OKX_DEX_API_KEY
    }

    const response = await fetch(`${url}?chainIndex=${chainIndex}`, {
      method: 'GET',
      headers,
      next: { revalidate: 30 } // Cache for 30 seconds
    })

    if (!response.ok) {
      throw new Error(
        `OKX API error: ${response.status} ${response.statusText}`
      )
    }

    const data: OKXGasPriceResponse = await response.json()

    if (data.code !== '0' || !data.data || data.data.length === 0) {
      throw new Error(
        `OKX API returned error: ${data.msg || 'No data available'}`
      )
    }

    const gasPriceData = data.data[0]

    // Check if it's an EVM chain (has normal/min/max fields)
    if (gasPriceData.normal && gasPriceData.min && gasPriceData.max) {
      // Convert from wei to gwei - use proper decimal conversion
      const weiToGwei = (wei: string) => {
        const weiNum = BigInt(wei)
        const gweiWhole = weiNum / BigInt(1e9)
        const gweiRemainder = weiNum % BigInt(1e9)
        // Return with 2 decimal places for precision
        const decimal = ((gweiRemainder * BigInt(100)) / BigInt(1e9))
          .toString()
          .padStart(2, '0')
        return gweiWhole > 0 ? `${gweiWhole}.${decimal}` : `0.${decimal}`
      }

      const gasPrice: GasPrice = {
        slow: weiToGwei(gasPriceData.min),
        average: weiToGwei(gasPriceData.normal),
        fast: weiToGwei(gasPriceData.max),
        baseFee: gasPriceData.eip1559Protocol?.baseFee
          ? weiToGwei(gasPriceData.eip1559Protocol.baseFee)
          : weiToGwei(gasPriceData.min)
      }

      // Add EIP-1559 priority fees if available
      if (gasPriceData.supportEip1559 && gasPriceData.eip1559Protocol) {
        gasPrice.priority = {
          low: weiToGwei(gasPriceData.eip1559Protocol.safePriorityFee),
          medium: weiToGwei(gasPriceData.eip1559Protocol.proposePriorityFee),
          high: weiToGwei(gasPriceData.eip1559Protocol.fastPriorityFee)
        }
      }

      return gasPrice
    }

    // For UTXO chains, return fee rates as gas prices
    if (
      gasPriceData.normalFeeRate &&
      gasPriceData.minFeeRate &&
      gasPriceData.maxFeeRate
    ) {
      return {
        slow: gasPriceData.minFeeRate,
        average: gasPriceData.normalFeeRate,
        fast: gasPriceData.maxFeeRate,
        baseFee: gasPriceData.minFeeRate
      }
    }

    throw new Error('Invalid gas price data format from OKX API')
  } catch (error) {
    console.error('Failed to fetch OKX gas price:', error)
    throw error
  }
}
