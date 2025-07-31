import { useEffect } from 'react'

import useSWR from 'swr'

import { apiEndpoints } from '@/config/api-endpoints'
import { useUnifiedWalletInfo } from '@/context'
import { mutateGlobalSWR } from '@/lib/api/swr'

/**
 * Hook to automatically validate and update subscription status
 * Should be used on protected pages to ensure subscription is current
 */
export function useSubscriptionValidation() {
  const { isConnected } = useUnifiedWalletInfo()
  const { data, error } = useSWR(
    isConnected ? apiEndpoints.subscription.validate : null,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  useEffect(() => {
    if (data?.status === 'inactive') {
      // Subscription expired, refresh team data
      mutateGlobalSWR(apiEndpoints.team)
      mutateGlobalSWR(apiEndpoints.user.profile)
    }
  }, [data?.status])

  return {
    isValidating: !data && !error,
    subscriptionStatus: data?.status,
    planName: data?.planName,
    error
  }
}
