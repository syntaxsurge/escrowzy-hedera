'use client'

import { useEffect, useState } from 'react'

import useSWR from 'swr'

import { TradingSidebar } from '@/components/blocks/trading'
import { apiEndpoints } from '@/config/api-endpoints'
import { refreshIntervals } from '@/config/app-routes'
import { api } from '@/lib/api/http-client'

export default function TradesLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [stats, setStats] = useState({
    activeTrades: 0,
    disputedTrades: 0,
    activeListings: 0
  })

  // Fetch trading stats for sidebar
  const { data: tradesData } = useSWR(
    apiEndpoints.trades.userWithParams('status=active'),
    async () => {
      const res = await api.get(
        apiEndpoints.trades.userWithParams('status=active')
      )
      return res.success ? res.data : null
    },
    {
      refreshInterval: refreshIntervals.SLOW,
      revalidateOnFocus: true
    }
  )

  const { data: listingsData } = useSWR(
    apiEndpoints.listings.userStats,
    async () => {
      const res = await api.get(apiEndpoints.listings.userStats)
      return res.success ? res.data : null
    },
    {
      refreshInterval: refreshIntervals.SLOW,
      revalidateOnFocus: true
    }
  )

  useEffect(() => {
    if (tradesData) {
      const activeTrades =
        tradesData.trades?.filter((t: any) =>
          [
            'created',
            'awaiting_deposit',
            'funded',
            'payment_sent',
            'delivered'
          ].includes(t.status)
        ).length || 0

      const disputedTrades =
        tradesData.trades?.filter((t: any) => t.status === 'disputed').length ||
        0

      setStats(prev => ({
        ...prev,
        activeTrades,
        disputedTrades
      }))
    }
  }, [tradesData])

  useEffect(() => {
    if (listingsData) {
      setStats(prev => ({
        ...prev,
        activeListings: listingsData.activeListings || 0
      }))
    }
  }, [listingsData])

  return (
    <div className='flex min-h-screen'>
      <div className='sticky top-16 z-40 h-[calc(100vh-4rem)]'>
        <TradingSidebar
          activeTrades={stats.activeTrades}
          disputedTrades={stats.disputedTrades}
          activeListings={stats.activeListings}
          className='h-full'
        />
      </div>
      <div className='w-full flex-1 overflow-x-hidden'>{children}</div>
    </div>
  )
}
