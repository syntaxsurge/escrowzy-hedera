'use client'

import type { SWRConfiguration } from 'swr'
import { mutate } from 'swr'

import { api } from '@/lib/api/http-client'

import { apiEndpoints } from '../../config/api-endpoints'
import { SUPPORTED_CHAIN_IDS } from '../blockchain'

// Centralized SWR configuration to prevent unnecessary re-fetching
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // Dedupe requests within 1 minute
  refreshInterval: 0 // Disable auto-refresh
}

// SWR fetcher that can be used in client components
export const swrFetcher = async (url: string) => {
  const result = await api.get(url, { shouldShowErrorToast: false })
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch')
  }
  return result.data
}

/**
 * Mutate a global SWR cache key
 * @param key - The SWR cache key to invalidate
 */
export async function mutateGlobalSWR(key: string) {
  return mutate(key)
}

/**
 * Invalidate all SWR caches for contract plans across all chain IDs
 * This ensures real-time updates are reflected everywhere
 */
export async function invalidateContractPlans() {
  // Invalidate cache for all possible chain IDs
  const chainIds = SUPPORTED_CHAIN_IDS

  const mutations = chainIds.map((chainId: number) =>
    mutate(`${apiEndpoints.contractPlans}?chainId=${chainId}`)
  )

  // Also invalidate admin endpoints
  const adminMutations = chainIds.map((chainId: number) =>
    mutate(`${apiEndpoints.admin.contract.plans}?chainId=${chainId}`)
  )

  await Promise.all([...mutations, ...adminMutations])
}

/**
 * Invalidate all SWR caches for contract earnings across all chain IDs
 */
export async function invalidateContractEarnings() {
  const chainIds = SUPPORTED_CHAIN_IDS

  const mutations = chainIds.map((chainId: number) =>
    mutate(`${apiEndpoints.admin.contract.earnings}?chainId=${chainId}`)
  )

  await Promise.all(mutations)
}
