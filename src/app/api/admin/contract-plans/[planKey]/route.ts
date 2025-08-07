import { NextRequest } from 'next/server'

import { ethers } from 'ethers'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { isSupportedChainId } from '@/lib/blockchain'
import { formatCurrency } from '@/lib/utils/string'
import { convertWeiToUSD } from '@/lib/utils/token-helpers'
import { SubscriptionManagerService } from '@/services/blockchain/subscription-manager.service'

// GET /api/admin/contract-plans/[planKey] - Get plan by key from smart contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planKey: string }> }
) {
  const { planKey } = await params
  try {
    const session = await getSession()

    if (!session?.user) {
      return apiResponses.unauthorized()
    }

    const planKeyNum = parseInt(planKey)

    if (isNaN(planKeyNum)) {
      return apiResponses.error('Invalid plan key', 400)
    }

    const { searchParams } = new URL(request.url)
    const chainId = Number(searchParams.get('chainId'))

    if (!chainId || !isSupportedChainId(chainId)) {
      return apiResponses.error(
        `Unsupported or invalid chain ID: ${chainId}. Please connect to a supported network.`,
        400
      )
    }

    const contractService = new SubscriptionManagerService(chainId)

    if (!contractService.contractAddress) {
      return apiResponses.error(
        `Contract not configured for chain ${chainId}. Please check your environment configuration.`,
        400
      )
    }

    const planExists = await contractService.planExists(planKeyNum)
    if (!planExists) {
      return apiResponses.notFound('Plan')
    }

    const plan = await contractService.getPlan(planKeyNum)
    const priceUSD = await convertWeiToUSD(plan.priceWei, chainId)
    const planWithUSDPrice = {
      ...plan,
      priceUSD,
      priceFormatted: formatCurrency(priceUSD, { currency: 'USD' }),
      maxMembersFormatted:
        plan.maxMembers === ethers.MaxUint256
          ? 'Unlimited'
          : plan.maxMembers.toString()
    }

    return apiResponses.success({ plan: planWithUSDPrice })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch contract plan')
  }
}
