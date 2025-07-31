import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { okxDexClient } from '@/lib/api/okx-dex-client'

const BalanceRequestSchema = z.object({
  walletAddress: z.string(),
  chainId: z.number(),
  tokenAddresses: z.array(z.string()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = BalanceRequestSchema.parse(body)

    // Check if chain is supported by OKX
    const chainIdStr = validatedData.chainId.toString()
    if (!okxDexClient.isChainSupported(chainIdStr)) {
      // Return empty balances for unsupported chains
      return NextResponse.json({
        success: true,
        balances: [],
        message: 'Chain not supported by OKX DEX'
      })
    }

    try {
      // Get token balances from OKX
      const balances = await okxDexClient.getTokenBalances(
        validatedData.walletAddress,
        chainIdStr
      )

      // Transform the balance data to include necessary fields
      const transformedBalances = balances.map((balance: any) => {
        // Parse decimals from the balance object or use default
        const decimals = parseInt(balance.decimal || '18')

        // The balance from OKX is already formatted, not in wei
        // So we don't need to divide by decimals
        const formattedBalance = balance.balance || '0'

        // Calculate USD value
        const balanceUsd =
          balance.tokenPrice && balance.balance
            ? (
                parseFloat(balance.balance) * parseFloat(balance.tokenPrice)
              ).toFixed(2)
            : '0'

        return {
          tokenContractAddress: balance.tokenContractAddress || '',
          tokenSymbol: balance.symbol || balance.tokenSymbol || '',
          tokenName: balance.tokenName || balance.symbol || '',
          tokenDecimals: decimals.toString(),
          balance: formattedBalance,
          rawBalance: balance.rawBalance || '',
          balanceUsd,
          tokenPrice: balance.tokenPrice || '0',
          tokenLogo: balance.tokenLogoUrl || balance.tokenLogo || undefined,
          isRiskToken: balance.isRiskToken || false
        }
      })

      // Log for debugging
      console.log(
        `Fetched ${transformedBalances.length} token balances for ${validatedData.walletAddress}`
      )
      if (transformedBalances.length > 0) {
        console.log('Sample balance:', transformedBalances[0])
      }

      return NextResponse.json({
        success: true,
        balances: transformedBalances
      })
    } catch (error) {
      console.log('Failed to fetch from OKX, returning empty balances:', error)
      // Return empty array if OKX fails (user might not have balances)
      return NextResponse.json({
        success: true,
        balances: []
      })
    }
  } catch (error) {
    console.error('Balance API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch balances',
        balances: []
      },
      { status: 500 }
    )
  }
}
