import 'server-only'
import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { isSupportedChainId, getSupportedChainIds } from '@/lib/blockchain'
import { createContractPlanService } from '@/services/blockchain/contract-plan'

export interface ContractValidationResult {
  chainId: number
  contractService: NonNullable<ReturnType<typeof createContractPlanService>>
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
}

export interface ContractValidationError {
  error: Response
}

/**
 * Centralized contract validation for admin routes
 * Validates session, chainId, and creates contract service
 */
export async function validateContractRequest(
  request: Request
): Promise<ContractValidationResult | ContractValidationError> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { error: apiResponses.unauthorized() }
    }

    const { searchParams } = new URL(request.url)
    const chainId = Number(searchParams.get('chainId'))

    if (!chainId || !isSupportedChainId(chainId)) {
      return {
        error: apiResponses.error(
          `Unsupported or invalid chain ID: ${chainId}. Please connect to a supported network.`,
          400
        )
      }
    }

    const contractService = createContractPlanService(chainId)
    if (!contractService) {
      return {
        error: apiResponses.error(
          `Contract not configured for chain ${chainId}. Please check your environment configuration.`,
          400
        )
      }
    }

    return {
      chainId,
      contractService,
      session
    }
  } catch (error) {
    return {
      error: apiResponses.handleError(error, 'Contract validation failed')
    }
  }
}

/**
 * Centralized contract handler wrapper
 */
export function withContractValidation<T>(
  handler: (
    validationResult: ContractValidationResult,
    request: Request
  ) => Promise<T>
) {
  return async (request: Request) => {
    const validationResult = await validateContractRequest(request)

    if ('error' in validationResult) {
      return validationResult.error
    }

    try {
      const result = await handler(validationResult, request)
      return apiResponses.success(result)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      // Check if it's a configuration error
      if (errorMessage.includes('Contract address not configured')) {
        return apiResponses.success({
          error: errorMessage,
          type: 'configuration_error',
          chainId: validationResult.chainId,
          supportedChains: getSupportedChainIds(),
          plans: []
        })
      }

      return apiResponses.handleError(error, 'Contract operation failed')
    }
  }
}
