'use client'

import useSWR from 'swr'

import { apiEndpoints } from '@/config/api-endpoints'
import { api } from '@/lib/api/http-client'
import type { User } from '@/lib/db/schema'

export function useSession() {
  const { data, error, isLoading } = useSWR<{ user: User | null }>(
    apiEndpoints.user.profile,
    () => api.get(apiEndpoints.user.profile).then((res: any) => res.data)
  )

  return {
    user: data?.user || null,
    isLoading,
    error
  }
}
