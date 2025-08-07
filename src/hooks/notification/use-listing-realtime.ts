'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

import {
  pusherEvents,
  pusherSystemEvents,
  pusherChannels
} from '@/config/api-endpoints'
import type { EscrowListing } from '@/lib/db/schema'
import { pusherClient } from '@/lib/pusher'

interface ListingWithUser extends EscrowListing {
  user: {
    id: number
    name: string | null
    walletAddress: string
    avatarPath: string | null
  }
}

interface UseListingRealtimeProps {
  listingId?: number
  userId?: number
  tokenPair?: string // e.g., "ETH/USD"
  onListingCreated?: (listing: ListingWithUser) => void
  onListingUpdated?: (listing: ListingWithUser) => void
  onListingDeleted?: (listingId: number) => void
  onListingAccepted?: (listingId: number, tradeId: number) => void
}

interface ListingRealtimeEvent {
  listing: ListingWithUser
  action: 'created' | 'updated' | 'deleted' | 'accepted'
  tradeId?: number
}

export function useListingRealtime({
  listingId,
  userId,
  tokenPair,
  onListingCreated,
  onListingUpdated,
  onListingDeleted,
  onListingAccepted
}: UseListingRealtimeProps = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const channelsRef = useRef<Set<any>>(new Set())

  useEffect(() => {
    if (!pusherClient) {
      setIsConnected(false)
      return
    }

    const channels: string[] = []

    // Subscribe to specific listing channel if listingId is provided
    if (listingId) {
      channels.push(pusherChannels.listing(listingId))
    }

    // Subscribe to user's listings channel if userId is provided
    if (userId) {
      channels.push(pusherChannels.userListings(userId))
    }

    // Subscribe to token pair channel if provided
    if (tokenPair) {
      channels.push(pusherChannels.listingsByPair(tokenPair))
    }

    // Always subscribe to global listings channel for general updates
    channels.push(pusherChannels.listingsGlobal)

    // Subscribe to channels
    channels.forEach(channelName => {
      const channel = pusherClient!.subscribe(channelName)
      channelsRef.current.add(channel)

      channel.bind(pusherSystemEvents.subscriptionSucceeded, () => {
        setIsConnected(true)
      })

      channel.bind(pusherSystemEvents.subscriptionError, () => {
        setIsConnected(false)
      })

      // Listen for new listings
      channel.bind(
        pusherEvents.listing.created,
        (event: ListingRealtimeEvent) => {
          setLastUpdate(new Date())

          if (onListingCreated) {
            onListingCreated(event.listing)
          }
        }
      )

      // Listen for listing updates
      channel.bind(
        pusherEvents.listing.updated,
        (event: ListingRealtimeEvent) => {
          setLastUpdate(new Date())

          if (onListingUpdated) {
            onListingUpdated(event.listing)
          }
        }
      )

      // Listen for listing deletions
      channel.bind(
        pusherEvents.listing.deleted,
        (event: { listingId: number }) => {
          setLastUpdate(new Date())

          if (onListingDeleted) {
            onListingDeleted(event.listingId)
          }
        }
      )

      // Listen for listing acceptance (trade creation)
      channel.bind(
        pusherEvents.listing.accepted,
        (event: { listingId: number; tradeId: number }) => {
          setLastUpdate(new Date())

          if (onListingAccepted) {
            onListingAccepted(event.listingId, event.tradeId)
          }
        }
      )

      // Listen for price updates
      channel.bind(
        pusherEvents.listing.priceUpdated,
        (event: {
          listingId: number
          newPrice: string
          listing: ListingWithUser
        }) => {
          setLastUpdate(new Date())

          if (onListingUpdated) {
            onListingUpdated(event.listing)
          }
        }
      )
    })

    // Cleanup function
    return () => {
      channelsRef.current.forEach(channel => {
        channel.unbind_all()
        pusherClient?.unsubscribe(channel.name)
      })
      channelsRef.current.clear()
    }
  }, [
    listingId,
    userId,
    tokenPair,
    onListingCreated,
    onListingUpdated,
    onListingDeleted,
    onListingAccepted
  ])

  const triggerManualUpdate = useCallback(() => {
    setLastUpdate(new Date())
  }, [])

  return {
    isConnected,
    lastUpdate,
    triggerManualUpdate
  }
}

// Hook for market data real-time updates
export function useMarketDataRealtime(
  tokenPair: string,
  onPriceUpdate?: (price: number, volume: number) => void,
  onOrderBookUpdate?: (bids: any[], asks: any[]) => void
) {
  const [isConnected, setIsConnected] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [volume24h, setVolume24h] = useState<number | null>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!pusherClient || !tokenPair) {
      setIsConnected(false)
      return
    }

    const channelName = pusherChannels.market(tokenPair)

    if (channelRef.current?.name === channelName) {
      return
    }

    if (channelRef.current) {
      pusherClient.unsubscribe(channelRef.current.name)
    }

    const channel = pusherClient.subscribe(channelName)
    channelRef.current = channel

    channel.bind(pusherSystemEvents.subscriptionSucceeded, () => {
      setIsConnected(true)
    })

    channel.bind(pusherSystemEvents.subscriptionError, () => {
      setIsConnected(false)
    })

    // Listen for price updates
    channel.bind(
      pusherEvents.swap.priceUpdated,
      (event: { price: number; volume: number }) => {
        setCurrentPrice(event.price)
        setVolume24h(event.volume)

        if (onPriceUpdate) {
          onPriceUpdate(event.price, event.volume)
        }
      }
    )

    // Listen for order book updates
    channel.bind(
      pusherEvents.swap.orderbookUpdated,
      (event: { bids: any[]; asks: any[] }) => {
        if (onOrderBookUpdate) {
          onOrderBookUpdate(event.bids, event.asks)
        }
      }
    )

    return () => {
      if (pusherClient && channel) {
        channel.unbind_all()
        pusherClient.unsubscribe(channelName)
      }
      channelRef.current = null
    }
  }, [tokenPair, onPriceUpdate, onOrderBookUpdate])

  return {
    isConnected,
    currentPrice,
    volume24h
  }
}
