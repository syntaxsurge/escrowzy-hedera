import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { isSupportedChainId, getSupportedChainIds } from '@/lib/blockchain'
import { AchievementNFTService } from '@/services/blockchain/achievement-nft.service'
import { EscrowCoreService } from '@/services/blockchain/escrow-core.service'
import { SubscriptionManagerService } from '@/services/blockchain/subscription-manager.service'

// ============================================================================
// Base Types
// ============================================================================

interface BaseValidationResult {
  chainId: number
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>
}

interface ValidationError {
  error: Response
}

// ============================================================================
// Service-Specific Validation Results
// ============================================================================

export interface EscrowValidationResult extends BaseValidationResult {
  escrowService: EscrowCoreService
}

export interface AchievementValidationResult extends BaseValidationResult {
  achievementService: AchievementNFTService
}

export interface SubscriptionValidationResult extends BaseValidationResult {
  subscriptionService: SubscriptionManagerService
}

// Export legacy name for backward compatibility (will be removed later)
export interface ContractValidationResult extends SubscriptionValidationResult {
  contractService: SubscriptionManagerService
}

export interface ContractValidationError extends ValidationError {}

// ============================================================================
// Generic Validation Function
// ============================================================================

async function validateContractRequestBase(
  request: Request,
  requireAuth: boolean = true
): Promise<{ chainId: number; session: any } | ValidationError> {
  try {
    // Check authentication if required
    if (requireAuth) {
      const session = await getSession()
      if (!session?.user) {
        return { error: apiResponses.unauthorized() }
      }

      // Extract chainId from request
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

      return { chainId, session }
    } else {
      // For public endpoints, still validate chainId
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

      return { chainId, session: null }
    }
  } catch (error) {
    return {
      error: apiResponses.handleError(error, 'Contract validation failed')
    }
  }
}

// ============================================================================
// Escrow Contract Validation
// ============================================================================

export async function validateEscrowRequest(
  request: Request,
  requireAuth: boolean = true
): Promise<EscrowValidationResult | ValidationError> {
  const baseResult = await validateContractRequestBase(request, requireAuth)

  if ('error' in baseResult) {
    return baseResult
  }

  const escrowService = new EscrowCoreService(baseResult.chainId)

  if (!escrowService.contractAddress) {
    return {
      error: apiResponses.error(
        `Escrow contract not configured for chain ${baseResult.chainId}. Please check your environment configuration.`,
        400
      )
    }
  }

  return {
    chainId: baseResult.chainId,
    session: baseResult.session,
    escrowService
  }
}

export function withEscrowValidation<T>(
  handler: (
    validationResult: EscrowValidationResult,
    request: Request
  ) => Promise<T>,
  requireAuth: boolean = true
) {
  return async (request: Request) => {
    const validationResult = await validateEscrowRequest(request, requireAuth)

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
      if (errorMessage.includes('contract address not configured')) {
        return apiResponses.success({
          error: errorMessage,
          type: 'configuration_error',
          chainId: validationResult.chainId,
          supportedChains: getSupportedChainIds()
        })
      }

      return apiResponses.handleError(error, 'Escrow operation failed')
    }
  }
}

// ============================================================================
// Achievement Contract Validation
// ============================================================================

export async function validateAchievementRequest(
  request: Request,
  requireAuth: boolean = true
): Promise<AchievementValidationResult | ValidationError> {
  const baseResult = await validateContractRequestBase(request, requireAuth)

  if ('error' in baseResult) {
    return baseResult
  }

  const achievementService = new AchievementNFTService(baseResult.chainId)

  if (!achievementService.contractAddress) {
    return {
      error: apiResponses.error(
        `Achievement contract not configured for chain ${baseResult.chainId}. Please check your environment configuration.`,
        400
      )
    }
  }

  return {
    chainId: baseResult.chainId,
    session: baseResult.session,
    achievementService
  }
}

export function withAchievementValidation<T>(
  handler: (
    validationResult: AchievementValidationResult,
    request: Request
  ) => Promise<T>,
  requireAuth: boolean = true
) {
  return async (request: Request) => {
    const validationResult = await validateAchievementRequest(
      request,
      requireAuth
    )

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
      if (errorMessage.includes('contract address not configured')) {
        return apiResponses.success({
          error: errorMessage,
          type: 'configuration_error',
          chainId: validationResult.chainId,
          supportedChains: getSupportedChainIds()
        })
      }

      return apiResponses.handleError(error, 'Achievement operation failed')
    }
  }
}

// ============================================================================
// Subscription Contract Validation
// ============================================================================

export async function validateSubscriptionRequest(
  request: Request,
  requireAuth: boolean = true
): Promise<SubscriptionValidationResult | ValidationError> {
  const baseResult = await validateContractRequestBase(request, requireAuth)

  if ('error' in baseResult) {
    return baseResult
  }

  const subscriptionService = new SubscriptionManagerService(baseResult.chainId)

  if (!subscriptionService.contractAddress) {
    return {
      error: apiResponses.error(
        `Subscription contract not configured for chain ${baseResult.chainId}. Please check your environment configuration.`,
        400
      )
    }
  }

  return {
    chainId: baseResult.chainId,
    session: baseResult.session,
    subscriptionService
  }
}

export function withSubscriptionValidation<T>(
  handler: (
    validationResult: SubscriptionValidationResult,
    request: Request
  ) => Promise<T>,
  requireAuth: boolean = true
) {
  return async (request: Request) => {
    const validationResult = await validateSubscriptionRequest(
      request,
      requireAuth
    )

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

      return apiResponses.handleError(error, 'Subscription operation failed')
    }
  }
}

// ============================================================================
// Legacy Compatibility (to be removed)
// ============================================================================

export async function validateContractRequest(
  request: Request
): Promise<ContractValidationResult | ContractValidationError> {
  const result = await validateSubscriptionRequest(request, true)

  if ('error' in result) {
    return result
  }

  // Map to legacy format
  return {
    ...result,
    contractService: result.subscriptionService
  }
}

export function withContractValidation<T>(
  handler: (
    validationResult: ContractValidationResult,
    request: Request
  ) => Promise<T>
) {
  return withSubscriptionValidation((result, request) => {
    // Map to legacy format
    const legacyResult: ContractValidationResult = {
      ...result,
      contractService: result.subscriptionService
    }
    return handler(legacyResult, request)
  }, true)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract chainId from request body (for POST requests)
 */
export async function getChainIdFromBody(
  request: Request
): Promise<number | null> {
  try {
    const body = await request.json()
    return body.chainId ? Number(body.chainId) : null
  } catch {
    return null
  }
}

/**
 * Validate chainId without full contract validation
 */
export function validateChainId(chainId: number): Response | null {
  if (!chainId || !isSupportedChainId(chainId)) {
    return apiResponses.error(
      `Unsupported or invalid chain ID: ${chainId}. Supported chains: ${getSupportedChainIds().join(', ')}`,
      400
    )
  }
  return null
}
