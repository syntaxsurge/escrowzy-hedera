import { getNativeCurrencySymbol } from '@/lib/blockchain'
import { formatNativeAmount } from '@/lib/utils/token-helpers'
import { withContractValidation } from '@/services/blockchain/contract-validation'

// GET /api/admin/contract-earnings - Get earnings summary from smart contract
export const GET = withContractValidation(
  async ({ contractService, chainId }) => {
    const nativeCurrency = getNativeCurrencySymbol(chainId)

    const [earningsSummary, contractInfo] = await Promise.all([
      contractService.getEarningsSummary(),
      contractService.getContractInfo()
    ])

    // Convert Wei amounts to USD and ETH for display
    const [totalUSD, withdrawnUSD, availableUSD] = await Promise.all([
      contractService.convertWeiToUSD(earningsSummary.totalNativeEarnings),
      contractService.convertWeiToUSD(earningsSummary.totalNativeWithdrawn),
      contractService.convertWeiToUSD(earningsSummary.availableNativeEarnings)
    ])

    const formattedEarnings = {
      totalNativeEarnings: earningsSummary.totalNativeEarnings.toString(),
      totalNativeWithdrawn: earningsSummary.totalNativeWithdrawn.toString(),
      availableNativeEarnings:
        earningsSummary.availableNativeEarnings.toString(),
      recordsCount: earningsSummary.recordsCount.toString(),
      // USD values
      totalUSD: totalUSD,
      withdrawnUSD: withdrawnUSD,
      availableUSD: availableUSD,
      // Native currency values for display
      totalNative: formatNativeAmount(
        earningsSummary.totalNativeEarnings,
        chainId
      ),
      withdrawnNative: formatNativeAmount(
        earningsSummary.totalNativeWithdrawn,
        chainId
      ),
      availableNative: formatNativeAmount(
        earningsSummary.availableNativeEarnings,
        chainId
      ),
      nativeCurrency: nativeCurrency,
      // Formatted display values
      totalFormatted: `$${totalUSD.toFixed(2)} (${formatNativeAmount(earningsSummary.totalNativeEarnings, chainId)} ${nativeCurrency})`,
      withdrawnFormatted: `$${withdrawnUSD.toFixed(2)} (${formatNativeAmount(earningsSummary.totalNativeWithdrawn, chainId)} ${nativeCurrency})`,
      availableFormatted: `$${availableUSD.toFixed(2)} (${formatNativeAmount(earningsSummary.availableNativeEarnings, chainId)} ${nativeCurrency})`
    }

    return {
      earnings: formattedEarnings,
      contractInfo
    }
  }
)
