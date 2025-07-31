'use client'

import { createContext, useContext, ReactNode } from 'react'

import { appRoutes } from '@/config/app-routes'
import { useBattleRealtime } from '@/hooks/use-battle-realtime'
import { useListingRealtime } from '@/hooks/use-listing-realtime'
import { useMessageNotifications } from '@/hooks/use-message-notifications'
import { useSession } from '@/hooks/use-session'
import { useToast } from '@/hooks/use-toast'
import { useTradeRealtime } from '@/hooks/use-trade-realtime'
import type { TradeWithUsers } from '@/types/trade'

interface RealtimeNotificationsContextValue {
  isConnected: boolean
}

const RealtimeNotificationsContext =
  createContext<RealtimeNotificationsContextValue>({
    isConnected: false
  })

export function useRealtimeNotifications() {
  const context = useContext(RealtimeNotificationsContext)
  if (!context) {
    throw new Error(
      'useRealtimeNotifications must be used within RealtimeNotificationsProvider'
    )
  }
  return context
}

interface RealtimeNotificationsProviderProps {
  children: ReactNode
}

export function RealtimeNotificationsProvider({
  children
}: RealtimeNotificationsProviderProps) {
  const { user } = useSession()
  const { toast } = useToast()

  // Message notifications
  useMessageNotifications({
    userId: user?.id || 0,
    enabled: !!user
  })

  // Trade real-time updates
  const { isConnected: tradeConnected } = useTradeRealtime({
    userId: user?.id,
    onTradeUpdate: async (trade: TradeWithUsers) => {
      if (!user) return

      const isMyTrade = trade.buyerId === user.id || trade.sellerId === user.id
      if (!isMyTrade) return
    },
    onStatusChange: (tradeId: number, newStatus: string) => {
      // Status change is handled in onTradeUpdate
      console.log(`Trade ${tradeId} status changed to ${newStatus}`)
    }
  })

  // Battle real-time updates
  const { isConnected: battleConnected } = useBattleRealtime(user?.id, {
    onInvitationReceived: (_data: any) => {
      // Handled by the hook itself with toast
    },
    onBattleStarted: (_data: any) => {
      toast({
        title: '⚔️ Battle Starting!',
        description: 'Get ready to fight!'
      })
    }
  })

  // Listing real-time updates
  const { isConnected: listingConnected } = useListingRealtime({
    userId: user?.id,
    onListingAccepted: (listingId, tradeId) => {
      toast({
        title: 'Listing Accepted',
        description: `Your listing #${listingId} has been accepted. Trade #${tradeId} created. Click to view.`
      })
      // Navigate after a short delay
      setTimeout(() => {
        window.location.href = appRoutes.trades.history.detail(
          tradeId.toString()
        )
      }, 2000)
    },
    onListingDeleted: listingId => {
      toast({
        title: 'Listing Removed',
        description: `Listing #${listingId} has been removed from the market`
      })
    }
  })

  // Overall connection status
  const isConnected = tradeConnected || battleConnected || listingConnected

  return (
    <RealtimeNotificationsContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeNotificationsContext.Provider>
  )
}
