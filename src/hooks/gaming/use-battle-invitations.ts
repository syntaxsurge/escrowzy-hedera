'use client'

import { useCallback, useEffect, useState } from 'react'

import useSWR from 'swr'

import {
  apiEndpoints,
  pusherChannels,
  pusherEvents
} from '@/config/api-endpoints'
import { BATTLE_CONFIG } from '@/config/battle.config'
import { api } from '@/lib/api/http-client'
import type { BattleInvitation } from '@/lib/db/schema'
import { pusherClient } from '@/lib/pusher'

interface InvitationWithUser extends BattleInvitation {
  fromUser: {
    id: number
    name: string
    email?: string | null
    walletAddress: string
  }
}

export function useBattleInvitations(userId?: number) {
  // Removed toast - all notifications handled in UI
  const [pendingInvitations, setPendingInvitations] = useState<
    InvitationWithUser[]
  >([])

  // Fetch invitations
  const { data, error, mutate } = useSWR<{ data: InvitationWithUser[] }>(
    userId ? apiEndpoints.battles.invitations : null,
    (url: string) => api.get(url).then(res => res.data),
    { refreshInterval: BATTLE_CONFIG.INVITATION_REFRESH_INTERVAL }
  )

  // Accept invitation
  const acceptInvitation = useCallback(
    async (invitationId: number) => {
      try {
        const response = await api.post(apiEndpoints.battles.accept, {
          invitationId
        })

        if (response.data.success) {
          // No toast - UI handles battle starting state

          // Remove from pending list
          setPendingInvitations(prev =>
            prev.filter(inv => inv.id !== invitationId)
          )

          mutate()
          return response.data.data
        }
      } catch (_error: any) {
        // Don't show any toasts - let the UI handle all errors
        return null
      }
    },
    [mutate]
  )

  // Reject invitation
  const rejectInvitation = useCallback(
    async (invitationId: number) => {
      try {
        const response = await api.post(apiEndpoints.battles.reject, {
          invitationId
        })

        if (response.data.success) {
          // Remove from pending list
          setPendingInvitations(prev =>
            prev.filter(inv => inv.id !== invitationId)
          )

          mutate()
          return true
        }
      } catch (_error: any) {
        // Don't show any toasts - let the UI handle all errors
        return false
      }
    },
    [mutate]
  )

  // Send invitation
  const sendInvitation = useCallback(async (toUserId: number) => {
    try {
      const response = await api.post(apiEndpoints.battles.invite, { toUserId })

      if (response.data.success) {
        // No toast - UI handles invitation sent state
        return response.data.data
      }
    } catch (_error: any) {
      // Don't show any toasts - let the UI handle all errors
      return null
    }
  }, [])

  // Setup Pusher for real-time updates
  useEffect(() => {
    if (!userId || !pusherClient) return

    const channel = pusherClient.subscribe(pusherChannels.user(userId))

    channel.bind(
      pusherEvents.battle.invitation,
      (invitation: InvitationWithUser) => {
        // Use improved display name
        const displayName =
          invitation.fromUser?.name ||
          invitation.fromUser?.email ||
          (invitation.fromUser?.walletAddress
            ? `${invitation.fromUser.walletAddress.slice(0, 6)}...${invitation.fromUser.walletAddress.slice(-4)}`
            : 'Anonymous Warrior')

        setPendingInvitations(prev => [
          ...prev,
          {
            ...invitation,
            fromUser: {
              ...invitation.fromUser,
              name: displayName
            }
          }
        ])

        // Don't show toast - UI will handle the invitation display

        mutate()
      }
    )

    channel.bind(pusherEvents.battle.started, (data: any) => {
      // Remove the invitation from pending when battle starts
      setPendingInvitations(prev =>
        prev.filter(inv => inv.id !== data.invitationId)
      )
    })

    channel.bind(pusherEvents.battle.accepted, (data: any) => {
      // Remove the invitation when accepted
      setPendingInvitations(prev =>
        prev.filter(inv => inv.id !== data.invitationId)
      )
    })

    channel.bind(pusherEvents.battle.rejected, (data: any) => {
      // Remove the invitation when rejected
      setPendingInvitations(prev =>
        prev.filter(inv => inv.id !== data.invitationId)
      )
    })

    return () => {
      channel.unbind(pusherEvents.battle.invitation)
      channel.unbind(pusherEvents.battle.started)
      channel.unbind(pusherEvents.battle.accepted)
      channel.unbind(pusherEvents.battle.rejected)
      pusherClient?.unsubscribe(pusherChannels.user(userId))
    }
  }, [userId, mutate])

  // Update pending invitations from SWR data
  useEffect(() => {
    if (data?.data) {
      setPendingInvitations(data.data)
    }
  }, [data])

  return {
    pendingInvitations,
    acceptInvitation,
    rejectInvitation,
    sendInvitation,
    isLoading: !data && !error,
    error
  }
}
