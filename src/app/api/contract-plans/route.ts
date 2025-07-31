import { apiResponses } from '@/lib/api/server-utils'
import { isSupportedChainId, getSupportedChainIds } from '@/lib/blockchain'
import { createContractPlanService } from '@/services/blockchain/contract-plan'

// GET /api/contract-plans - Get active plans from smart contract for public use
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chainId = Number(searchParams.get('chainId'))

    if (!chainId || !isSupportedChainId(chainId)) {
      return apiResponses.error(
        `Unsupported or invalid chain ID: ${chainId}. Please connect to a supported network.`,
        400
      )
    }

    const contractService = createContractPlanService(chainId)

    if (!contractService) {
      return apiResponses.error(
        `Contract not configured for chain ${chainId}. Please check your environment configuration.`,
        400
      )
    }

    const [activePlans, contractInfo] = await Promise.all([
      contractService.getActivePlans(),
      contractService.getContractInfo()
    ])

    // Convert contract plans to the format expected by the frontend
    const formattedPlans = await Promise.all(
      activePlans
        .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
        .map(async plan => {
          let priceUSD: number
          try {
            priceUSD = await contractService.convertWeiToUSD(plan.priceWei)
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

    return apiResponses.success({
      plans: formattedPlans,
      contractInfo,
      source: 'smart-contract',
      nativeCurrency: contractInfo.nativeCurrency
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // Check if it's a configuration error
    if (errorMessage.includes('Contract address not configured')) {
      // For configuration errors, return a special response that the frontend can handle
      return apiResponses.success({
        error: errorMessage,
        type: 'configuration_error',
        chainId: Number(new URL(request.url).searchParams.get('chainId')),
        supportedChains: getSupportedChainIds(),
        plans: [] // Return empty plans array for configuration errors
      })
    }

    // For other errors, return error status
    return apiResponses.handleError(error, 'Failed to fetch contract plans')
  }
}
