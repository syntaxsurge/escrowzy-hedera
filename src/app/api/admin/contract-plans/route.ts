import { ethers } from 'ethers'

import { withContractValidation } from '@/services/blockchain/contract-validation'

// GET /api/admin/contract-plans - Get all plans from smart contract
export const GET = withContractValidation(async ({ contractService }) => {
  // Try to get all plans first, fallback to active plans if getAllPlans is not available
  let plans
  try {
    plans = await contractService.getAllPlans()
  } catch (error) {
    console.warn(
      'getAllPlans() not available, falling back to getActivePlans():',
      error
    )
    plans = await contractService.getActivePlans()
  }

  const contractInfo = await contractService.getContractInfo()

  // Convert Wei prices to USD for display and serialize BigInt values
  const plansWithUSDPrices = await Promise.all(
    plans.map(async plan => ({
      planKey: plan.planKey,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      priceWei: plan.priceWei.toString(), // Convert BigInt to string
      priceUSD: await contractService.convertWeiToUSD(plan.priceWei),
      priceFormatted: await contractService.formatPriceForDisplay(
        plan.priceWei
      ),
      priceNative: Number(ethers.formatEther(plan.priceWei)),
      maxMembers: plan.maxMembers, // This will be serialized below
      maxMembersFormatted:
        plan.maxMembers === ethers.MaxUint256
          ? 'Unlimited'
          : plan.maxMembers.toString(),
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder, // This will be serialized below
      isTeamPlan: plan.isTeamPlan || false
    }))
  )

  // Serialize BigInt values to strings for JSON response
  const serializedPlans = plansWithUSDPrices.map(plan => ({
    ...plan,
    maxMembers: plan.maxMembers.toString(),
    sortOrder: plan.sortOrder.toString()
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
})
