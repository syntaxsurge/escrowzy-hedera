import { ethers } from 'ethers'

import { withSubscriptionValidation } from '@/lib/blockchain/contract-validation'
import { formatCurrency } from '@/lib/utils/string'
import { formatNativeAmount } from '@/lib/utils/token-helpers'

// GET /api/admin/contract-plans - Get all plans from smart contract
export const GET = withSubscriptionValidation(
  async ({ subscriptionService }) => {
    // Try to get all plans first, fallback to active plans if getAllPlans is not available
    let plans
    try {
      plans = await subscriptionService.getAllPlans()
    } catch (error) {
      console.warn(
        'getAllPlans() not available, falling back to getActivePlans():',
        error
      )
      plans = await subscriptionService.getActivePlans()
    }

    const contractInfo = await subscriptionService.getContractInfo()

    // Convert Wei prices to USD for display and serialize BigInt values
    const plansWithUSDPrices = await Promise.all(
      plans.map(async plan => {
        const priceUSD = await subscriptionService.convertWeiToUSD(
          plan.priceWei
        )
        return {
          planKey: plan.planKey,
          name: plan.name,
          displayName: plan.displayName,
          description: plan.description,
          priceWei: plan.priceWei.toString(), // Convert BigInt to string
          priceUSD,
          priceFormatted: formatCurrency(priceUSD, { currency: 'USD' }),
          priceNative: Number(
            formatNativeAmount(plan.priceWei, contractInfo.chainId)
          ),
          maxMembers: plan.maxMembers, // This will be serialized below
          maxMembersFormatted:
            plan.maxMembers === ethers.MaxUint256
              ? 'Unlimited'
              : plan.maxMembers.toString(),
          features: plan.features,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder, // This will be serialized below
          isTeamPlan: plan.isTeamPlan || false,
          feeTierBasisPoints: plan.feeTierBasisPoints // This will be serialized below
        }
      })
    )

    // Serialize BigInt values to strings for JSON response
    const serializedPlans = plansWithUSDPrices.map(plan => ({
      ...plan,
      maxMembers: plan.maxMembers.toString(),
      sortOrder: plan.sortOrder.toString(),
      feeTierBasisPoints: plan.feeTierBasisPoints
        ? plan.feeTierBasisPoints.toString()
        : undefined
    }))

    // Sort plans by sortOrder
    const sortedPlans = serializedPlans.sort((a, b) => {
      const orderA = parseInt(a.sortOrder)
      const orderB = parseInt(b.sortOrder)
      return orderA - orderB
    })

    return {
      plans: sortedPlans.map(plan => ({
        ...plan,
        nativeCurrencySymbol: contractInfo.nativeCurrency
      })),
      contractInfo
    }
  }
)
