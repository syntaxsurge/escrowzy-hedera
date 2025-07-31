import { appRoutes } from '@/config/app-routes'
import { ActivityType } from '@/lib/db/schema'
import type { ActivityLog } from '@/lib/db/schema'

export interface NotificationContent {
  title: string
  message: string
  actionUrl?: string
  notificationType?: string
}

export function transformActivityToNotification(
  activity: ActivityLog,
  teamName?: string
): NotificationContent {
  const team = teamName || 'the team'

  // If notification fields are already populated, use them
  if (activity.title && activity.message) {
    return {
      title: activity.title,
      message: activity.message,
      actionUrl: activity.actionUrl || undefined,
      notificationType: activity.notificationType || undefined
    }
  }

  // Transform based on action type
  switch (activity.action) {
    // Team notifications
    case ActivityType.ACCEPT_INVITATION:
      return {
        title: 'Team Joined',
        message: `You joined "${team}"`,
        notificationType: activity.action
      }

    case ActivityType.REMOVE_TEAM_MEMBER:
      return {
        title: 'Removed from Team',
        message: `You were removed from "${team}"`,
        notificationType: activity.action
      }

    case ActivityType.UPDATE_TEAM_ROLE:
      return {
        title: 'Role Updated',
        message: `Your role was updated in "${team}"`,
        notificationType: activity.action
      }

    // Subscription notifications
    case ActivityType.SUBSCRIPTION_UPGRADED:
      return {
        title: 'Subscription Updated',
        message: `Subscription plan updated for "${team}"`,
        notificationType: activity.action
      }

    case ActivityType.SUBSCRIPTION_DOWNGRADED:
      return {
        title: 'Subscription Downgraded',
        message: `Subscription plan downgraded for "${team}"`,
        notificationType: activity.action
      }

    case ActivityType.SUBSCRIPTION_CANCELLED:
      return {
        title: 'Subscription Cancelled',
        message: `Subscription cancelled for "${team}"`,
        notificationType: activity.action
      }

    // Trade notifications
    case ActivityType.TRADE_CREATED:
      return {
        title: 'New Trade Created',
        message: activity.metadata
          ? `Trade #${(activity.metadata as any).tradeId} has been created`
          : 'A new trade has been created',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.TRADE_FUNDED:
      return {
        title: 'Trade Funded',
        message: activity.metadata
          ? `Trade #${(activity.metadata as any).tradeId} has been funded`
          : 'Trade has been funded',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.TRADE_DELIVERED:
      return {
        title: 'Trade Delivered',
        message: activity.metadata
          ? `Trade #${(activity.metadata as any).tradeId} has been marked as delivered`
          : 'Trade has been delivered',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.TRADE_COMPLETED:
      return {
        title: 'Trade Completed',
        message: activity.metadata
          ? `Trade #${(activity.metadata as any).tradeId} has been completed`
          : 'Trade has been completed',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.TRADE_DISPUTED:
      return {
        title: 'Trade Disputed',
        message: activity.metadata
          ? `Trade #${(activity.metadata as any).tradeId} is under dispute`
          : 'Trade is under dispute',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.TRADE_REFUNDED:
      return {
        title: 'Trade Refunded',
        message: activity.metadata
          ? `Trade #${(activity.metadata as any).tradeId} has been refunded`
          : 'Trade has been refunded',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    // Chat notifications
    case ActivityType.NEW_MESSAGE:
      return {
        title: 'New Message',
        message: activity.metadata
          ? `${(activity.metadata as any).senderName}: ${(activity.metadata as any).preview}`
          : 'You have a new message',
        actionUrl: activity.metadata
          ? (activity.metadata as any).chatUrl
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.UNREAD_MESSAGES:
      return {
        title: 'Unread Messages',
        message: activity.metadata
          ? `You have ${(activity.metadata as any).count} unread messages`
          : 'You have unread messages',
        actionUrl: appRoutes.chat.base,
        notificationType: activity.action
      }

    // Battle notifications
    case ActivityType.BATTLE_MATCH_FOUND:
      return {
        title: 'Battle Match Found!',
        message: activity.metadata
          ? `Matched against ${(activity.metadata as any).opponentName}`
          : 'You have been matched for battle',
        actionUrl: appRoutes.battleArena,
        notificationType: activity.action
      }

    case ActivityType.BATTLE_WON:
      return {
        title: 'Victory!',
        message: activity.metadata
          ? `You won the battle! ${(activity.metadata as any).reward}`
          : 'You won the battle!',
        actionUrl: appRoutes.battleArena,
        notificationType: activity.action
      }

    case ActivityType.BATTLE_LOST:
      return {
        title: 'Defeat',
        message: 'Better luck next time! You earned 10 XP for participating.',
        actionUrl: appRoutes.battleArena,
        notificationType: activity.action
      }

    // Listing notifications
    case ActivityType.LISTING_ACCEPTED:
      return {
        title: 'Listing Accepted',
        message: activity.metadata
          ? `Your listing #${(activity.metadata as any).listingId} has been accepted`
          : 'Your listing has been accepted',
        actionUrl: activity.metadata
          ? appRoutes.trades.history.detail((activity.metadata as any).tradeId)
          : undefined,
        notificationType: activity.action
      }

    case ActivityType.LISTING_DELETED:
      return {
        title: 'Listing Removed',
        message: activity.metadata
          ? `Listing #${(activity.metadata as any).listingId} has been removed`
          : 'Listing has been removed',
        notificationType: activity.action
      }

    // Team invitation
    case ActivityType.TEAM_INVITATION:
      return {
        title: 'Team Invitation',
        message: activity.metadata
          ? `You've been invited to join "${(activity.metadata as any).teamName}"`
          : 'You have a team invitation',
        actionUrl: appRoutes.dashboard.invitations,
        notificationType: activity.action
      }

    default:
      return {
        title: 'Notification',
        message: 'You have a new notification',
        notificationType: activity.action || 'info'
      }
  }
}

export interface MessageNotification {
  type: 'trade' | 'team' | 'direct'
  contextId: string
  senderId: number
  senderName: string
  message: string
  tradeId?: number
}

export function createMessageNotification(
  notification: MessageNotification
): NotificationContent {
  switch (notification.type) {
    case 'trade':
      return {
        title: `Trade #${notification.tradeId} - New Message`,
        message: `${notification.senderName}: ${notification.message.substring(0, 100)}${
          notification.message.length > 100 ? '...' : ''
        }`
      }
    case 'team':
      return {
        title: 'Team Message',
        message: `${notification.senderName}: ${notification.message.substring(0, 100)}${
          notification.message.length > 100 ? '...' : ''
        }`
      }
    case 'direct':
      return {
        title: `Message from ${notification.senderName}`,
        message:
          notification.message.substring(0, 100) +
          (notification.message.length > 100 ? '...' : '')
      }
    default:
      return {
        title: 'New Message',
        message: `${notification.senderName}: ${notification.message.substring(0, 100)}`
      }
  }
}

export function shouldNotifyUser(
  userId: number,
  senderId: number,
  isWindowFocused: boolean = true,
  isChatOpen: boolean = false
): boolean {
  // Don't notify for own messages
  if (userId === senderId) return false

  // Always notify if window is not focused
  if (!isWindowFocused) return true

  // Notify if chat is not open
  if (!isChatOpen) return true

  return false
}
