import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { validateSubscriptionRequest } from '@/lib/blockchain/contract-validation'
import { parseNativeAmount } from '@/lib/utils/token-helpers'
import {
  type CreatePlanParams,
  type UpdatePlanParams,
  type DeletePlanParams,
  type WithdrawEarningsParams,
  type SetPlanPriceParams
} from '@/services/blockchain/subscription-manager.service'

export async function POST(request: NextRequest) {
  try {
    // Validate request and get service
    const validationResult = await validateSubscriptionRequest(request)

    if ('error' in validationResult) {
      return validationResult.error
    }

    const { subscriptionService, chainId } = validationResult
    const body = await request.json()
    const { action, ...params } = body

    const contractInfo = await subscriptionService.getContractInfo()

    switch (action) {
      case 'createPlan': {
        // Get next available plan key
        const planKey = await subscriptionService.getNextAvailablePlanKey()

        // Direct type assertion - TypeScript will enforce required fields
        const createParams: CreatePlanParams = {
          planKey,
          ...params
        }

        // Convert USD to wei
        const priceWei = await subscriptionService.convertUSDToWei(
          createParams.priceUSD
        )

        // Prepare transaction data
        const data = subscriptionService.encodeContractFunctionData(
          'createPlan',
          subscriptionService.prepareSubscriptionParams(
            'createPlan',
            createParams,
            {
              priceWei: priceWei.toString()
            }
          )
        )

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey,
          priceWei: priceWei.toString(),
          contractInfo
        })
      }

      case 'updatePlan': {
        // Direct type assertion - TypeScript will enforce required fields
        const updateParams: UpdatePlanParams = params

        // Convert USD to wei
        const priceWei = await subscriptionService.convertUSDToWei(
          updateParams.priceUSD
        )

        // Prepare transaction data
        const data = subscriptionService.encodeContractFunctionData(
          'updatePlan',
          subscriptionService.prepareSubscriptionParams(
            'updatePlan',
            updateParams,
            {
              priceWei: priceWei.toString()
            }
          )
        )

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey: updateParams.planKey,
          priceWei: priceWei.toString(),
          contractInfo
        })
      }

      case 'deletePlan': {
        // Direct type assertion - TypeScript will enforce required fields
        const deleteParams: DeletePlanParams = params

        // Prepare transaction data
        const data = subscriptionService.encodeContractFunctionData(
          'deletePlan',
          subscriptionService.prepareSubscriptionParams(
            'deletePlan',
            deleteParams
          )
        )

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey: deleteParams.planKey,
          contractInfo
        })
      }

      case 'withdrawEarnings': {
        // Direct type assertion - TypeScript will enforce required fields
        const withdrawParams: WithdrawEarningsParams = params

        // Convert native amount to smallest unit using chain-specific decimals
        const amountWei = parseNativeAmount(
          withdrawParams.amountNative.toString(),
          chainId
        )

        // Prepare transaction data
        const data = subscriptionService.encodeContractFunctionData(
          'withdrawEarnings',
          subscriptionService.prepareSubscriptionParams(
            'withdrawEarnings',
            withdrawParams,
            {
              amountWei: amountWei.toString()
            }
          )
        )

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          amountWei: amountWei.toString(),
          contractInfo
        })
      }

      case 'setPlanPrice': {
        // Direct type assertion - TypeScript will enforce required fields
        const priceParams: SetPlanPriceParams = params

        // Convert USD to wei
        const priceWei = await subscriptionService.convertUSDToWei(
          priceParams.priceUSD
        )

        // Prepare transaction data
        const data = subscriptionService.encodeContractFunctionData(
          'setPlanPrice',
          subscriptionService.prepareSubscriptionParams(
            'setPlanPrice',
            priceParams,
            {
              priceWei: priceWei.toString()
            }
          )
        )

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey: priceParams.planKey,
          priceWei: priceWei.toString(),
          contractInfo
        })
      }

      default:
        return apiResponses.error(`Unsupported action: ${action}`, 400)
    }
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to prepare transaction data')
  }
}
