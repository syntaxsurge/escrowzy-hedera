import { withSubscriptionValidation } from '@/lib/blockchain/contract-validation'

// GET /api/contract-plans - Get active plans from smart contract for public use
export const GET = withSubscriptionValidation(
  async ({ subscriptionService }) => {
    const [activePlans, contractInfo] = await Promise.all([
      subscriptionService.getActivePlans(),
      subscriptionService.getContractInfo()
    ])

    // Convert contract plans to the format expected by the frontend
    const formattedPlans = await Promise.all(
      activePlans
        .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
        .map(async plan => {
          let priceUSD: number
          try {
            priceUSD = await subscriptionService.convertWeiToUSD(plan.priceWei)
          } catch (error) {
            // If price conversion fails, return null to indicate pricing unavailable
            throw new Error(
              `Price conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }

          return {
            id: plan.planKey,
            name: plan.name,
            displayName: plan.displayName,
            description: plan.description,
            price: priceUSD.toFixed(0), // Remove decimals for display
            currency: contractInfo.nativeCurrency,
            maxMembers:
              plan.maxMembers.toString() ===
              '115792089237316195423570985008687907853269984665640564039457584007913129639935'
                ? -1
                : Number(plan.maxMembers),
            isActive: plan.isActive,
            sortOrder: Number(plan.sortOrder),
            createdAt: new Date(),
            updatedAt: new Date(),
            features: plan.features.map((featureText, featureIndex) => ({
              id: plan.planKey * 100 + featureIndex,
              planId: plan.planKey,
              feature: featureText,
              sortOrder: featureIndex + 1,
              createdAt: new Date()
            })),
            // Contract-specific fields
            planKey: plan.planKey,
            priceWei: plan.priceWei.toString(),
            priceUSD: priceUSD,
            priceNative: Number(plan.priceWei) / 1e18, // Convert wei to native units
            nativeCurrencySymbol: contractInfo.nativeCurrency,
            isTeamPlan: plan.isTeamPlan
          }
        })
    )

    return {
      plans: formattedPlans,
      contractInfo,
      source: 'smart-contract',
      nativeCurrency: contractInfo.nativeCurrency
    }
  },
  false // Don't require authentication for public endpoint
)
