import { Activity, Shield, Users, CreditCard } from 'lucide-react'

import { ActivityType } from '@/lib/db/schema'

export const ACTIVITY_CATEGORIES = {
  security: [
    ActivityType.SIGN_IN,
    ActivityType.SIGN_OUT,
    ActivityType.WALLET_CONNECTED,
    ActivityType.WALLET_DISCONNECTED,
    ActivityType.USER_CREATED,
    ActivityType.USER_UPDATED,
    ActivityType.USER_DELETED,
    ActivityType.USER_UPDATED_BY_ADMIN,
    ActivityType.USER_DELETED_BY_ADMIN,
    ActivityType.BULK_USER_ROLES_UPDATED
  ],
  team: [
    ActivityType.CREATE_TEAM,
    ActivityType.INVITE_TEAM_MEMBER,
    ActivityType.ACCEPT_INVITATION,
    ActivityType.REJECT_INVITATION,
    ActivityType.REMOVE_TEAM_MEMBER,
    ActivityType.TEAM_CREATED,
    ActivityType.TEAM_UPDATED,
    ActivityType.TEAM_DELETED,
    ActivityType.MEMBER_ADDED,
    ActivityType.MEMBER_REMOVED
  ],
  billing: [
    ActivityType.PAYMENT_INITIATED,
    ActivityType.PAYMENT_CONFIRMED,
    ActivityType.PAYMENT_FAILED,
    ActivityType.PAYMENT_COMPLETED,
    ActivityType.SUBSCRIPTION_ACTIVATED,
    ActivityType.SUBSCRIPTION_CANCELLED,
    ActivityType.SUBSCRIPTION_EXPIRED,
    ActivityType.SUBSCRIPTION_CREATED,
    ActivityType.SUBSCRIPTION_UPDATED,
    ActivityType.SUBSCRIPTION_CANCELED,
    ActivityType.SUBSCRIPTION_UPDATED_BY_ADMIN,
    ActivityType.TEAM_PLAN_DOWNGRADED
  ]
} as const

export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES

export function getActivityFilterConditions(filterType: string): string[] {
  switch (filterType) {
    case 'security':
      return [...ACTIVITY_CATEGORIES.security]
    case 'team':
      return [...ACTIVITY_CATEGORIES.team]
    case 'billing':
      return [...ACTIVITY_CATEGORIES.billing]
    case 'all':
    default:
      return []
  }
}

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  // Security activities
  [ActivityType.SIGN_IN]: { label: 'Sign In', variant: 'default' },
  [ActivityType.SIGN_OUT]: { label: 'Sign Out', variant: 'secondary' },
  [ActivityType.SIGN_UP]: { label: 'Sign Up', variant: 'default' },
  [ActivityType.WALLET_CONNECTED]: {
    label: 'Wallet Connected',
    variant: 'default'
  },
  [ActivityType.WALLET_DISCONNECTED]: {
    label: 'Wallet Disconnected',
    variant: 'secondary'
  },
  [ActivityType.USER_CREATED]: { label: 'User Created', variant: 'default' },
  [ActivityType.USER_UPDATED]: {
    label: 'User Updated',
    variant: 'secondary'
  },
  [ActivityType.USER_DELETED]: {
    label: 'User Deleted',
    variant: 'destructive'
  },
  [ActivityType.USER_UPDATED_BY_ADMIN]: {
    label: 'Admin: User Updated',
    variant: 'outline'
  },
  [ActivityType.USER_DELETED_BY_ADMIN]: {
    label: 'Admin: User Deleted',
    variant: 'destructive'
  },
  [ActivityType.BULK_USER_ROLES_UPDATED]: {
    label: 'Admin: Bulk Role Update',
    variant: 'outline'
  },
  [ActivityType.UPDATE_PASSWORD]: {
    label: 'Password Updated',
    variant: 'secondary'
  },
  [ActivityType.DELETE_ACCOUNT]: {
    label: 'Account Deleted',
    variant: 'destructive'
  },
  [ActivityType.UPDATE_ACCOUNT]: {
    label: 'Account Updated',
    variant: 'secondary'
  },
  [ActivityType.UPDATE_PROFILE]: {
    label: 'Profile Updated',
    variant: 'secondary'
  },

  // Team activities
  [ActivityType.CREATE_TEAM]: { label: 'Team Created', variant: 'default' },
  [ActivityType.INVITE_TEAM_MEMBER]: {
    label: 'Member Invited',
    variant: 'default'
  },
  [ActivityType.ACCEPT_INVITATION]: {
    label: 'Invitation Accepted',
    variant: 'default'
  },
  [ActivityType.REJECT_INVITATION]: {
    label: 'Invitation Rejected',
    variant: 'secondary'
  },
  [ActivityType.REMOVE_TEAM_MEMBER]: {
    label: 'Member Removed',
    variant: 'destructive'
  },
  [ActivityType.UPDATE_TEAM_MEMBER_ROLE]: {
    label: 'Member Role Updated',
    variant: 'secondary'
  },
  [ActivityType.TEAM_CREATED]: { label: 'Team Created', variant: 'default' },
  [ActivityType.TEAM_UPDATED]: {
    label: 'Team Updated',
    variant: 'secondary'
  },
  [ActivityType.TEAM_DELETED]: {
    label: 'Team Deleted',
    variant: 'destructive'
  },
  [ActivityType.MEMBER_ADDED]: { label: 'Member Added', variant: 'default' },
  [ActivityType.MEMBER_REMOVED]: {
    label: 'Member Removed',
    variant: 'destructive'
  },

  // Billing activities
  [ActivityType.PAYMENT_INITIATED]: {
    label: 'Payment Initiated',
    variant: 'default'
  },
  [ActivityType.PAYMENT_CONFIRMED]: {
    label: 'Payment Confirmed',
    variant: 'default'
  },
  [ActivityType.PAYMENT_FAILED]: {
    label: 'Payment Failed',
    variant: 'destructive'
  },
  [ActivityType.PAYMENT_COMPLETED]: {
    label: 'Payment Completed',
    variant: 'default'
  },
  [ActivityType.SUBSCRIPTION_ACTIVATED]: {
    label: 'Subscription Activated',
    variant: 'default'
  },
  [ActivityType.SUBSCRIPTION_CANCELLED]: {
    label: 'Subscription Cancelled',
    variant: 'destructive'
  },
  [ActivityType.SUBSCRIPTION_EXPIRED]: {
    label: 'Subscription Expired',
    variant: 'destructive'
  },
  [ActivityType.SUBSCRIPTION_CREATED]: {
    label: 'Subscription Created',
    variant: 'default'
  },
  [ActivityType.SUBSCRIPTION_UPDATED]: {
    label: 'Subscription Updated',
    variant: 'secondary'
  },
  [ActivityType.SUBSCRIPTION_CANCELED]: {
    label: 'Subscription Canceled',
    variant: 'destructive'
  },
  [ActivityType.SUBSCRIPTION_UPGRADED]: {
    label: 'Subscription Upgraded',
    variant: 'default'
  },
  [ActivityType.SUBSCRIPTION_UPDATED_BY_ADMIN]: {
    label: 'Admin: Subscription Updated',
    variant: 'outline'
  },
  [ActivityType.TEAM_PLAN_DOWNGRADED]: {
    label: 'Team Plan Downgraded',
    variant: 'destructive'
  },
  [ActivityType.SUBSCRIPTION_DOWNGRADED]: {
    label: 'Subscription Downgraded',
    variant: 'destructive'
  },

  // Trade activities
  [ActivityType.TRADE_CREATED]: { label: 'Trade Created', variant: 'default' },
  [ActivityType.TRADE_FUNDED]: { label: 'Trade Funded', variant: 'default' },
  [ActivityType.TRADE_DELIVERED]: {
    label: 'Trade Delivered',
    variant: 'default'
  },
  [ActivityType.TRADE_COMPLETED]: {
    label: 'Trade Completed',
    variant: 'default'
  },
  [ActivityType.TRADE_DISPUTED]: {
    label: 'Trade Disputed',
    variant: 'destructive'
  },
  [ActivityType.TRADE_REFUNDED]: {
    label: 'Trade Refunded',
    variant: 'secondary'
  },
  [ActivityType.TRADE_CANCELLED]: {
    label: 'Trade Cancelled',
    variant: 'secondary'
  },

  // Listing activities
  [ActivityType.LISTING_CREATED]: {
    label: 'Listing Created',
    variant: 'default'
  },
  [ActivityType.LISTING_UPDATED]: {
    label: 'Listing Updated',
    variant: 'default'
  },
  [ActivityType.LISTING_DELETED]: {
    label: 'Listing Deleted',
    variant: 'secondary'
  },
  [ActivityType.LISTING_ACCEPTED]: {
    label: 'Listing Accepted',
    variant: 'default'
  },

  // Chat/Message activities
  [ActivityType.NEW_MESSAGE]: { label: 'New Message', variant: 'default' },
  [ActivityType.UNREAD_MESSAGES]: {
    label: 'Unread Messages',
    variant: 'default'
  },
  [ActivityType.MESSAGE_DELETED]: {
    label: 'Message Deleted',
    variant: 'secondary'
  },

  // Battle activities
  [ActivityType.BATTLE_MATCH_FOUND]: {
    label: 'Battle Match Found',
    variant: 'default'
  },
  [ActivityType.BATTLE_STARTED]: {
    label: 'Battle Started',
    variant: 'default'
  },
  [ActivityType.BATTLE_WON]: { label: 'Battle Won', variant: 'default' },
  [ActivityType.BATTLE_LOST]: { label: 'Battle Lost', variant: 'destructive' },
  [ActivityType.BATTLE_DRAW]: { label: 'Battle Draw', variant: 'secondary' },

  // Team notification activities
  [ActivityType.TEAM_INVITATION]: {
    label: 'Team Invitation',
    variant: 'default'
  },
  [ActivityType.TEAM_JOINED]: { label: 'Team Joined', variant: 'default' },
  [ActivityType.TEAM_LEFT]: { label: 'Team Left', variant: 'secondary' },
  [ActivityType.TEAM_KICKED]: {
    label: 'Kicked from Team',
    variant: 'destructive'
  },
  [ActivityType.UPDATE_TEAM_ROLE]: {
    label: 'Team Role Updated',
    variant: 'default'
  }
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  // Security
  [ActivityType.SIGN_IN]: 'Activity',
  [ActivityType.SIGN_OUT]: 'Activity',
  [ActivityType.SIGN_UP]: 'Activity',
  [ActivityType.WALLET_CONNECTED]: 'Shield',
  [ActivityType.WALLET_DISCONNECTED]: 'Shield',
  [ActivityType.USER_CREATED]: 'Shield',
  [ActivityType.USER_UPDATED]: 'Shield',
  [ActivityType.USER_DELETED]: 'Shield',
  [ActivityType.USER_UPDATED_BY_ADMIN]: 'Shield',
  [ActivityType.USER_DELETED_BY_ADMIN]: 'Shield',
  [ActivityType.BULK_USER_ROLES_UPDATED]: 'Shield',
  [ActivityType.UPDATE_PASSWORD]: 'Shield',
  [ActivityType.DELETE_ACCOUNT]: 'Shield',
  [ActivityType.UPDATE_ACCOUNT]: 'Shield',
  [ActivityType.UPDATE_PROFILE]: 'Shield',

  // Team
  [ActivityType.CREATE_TEAM]: 'Users',
  [ActivityType.INVITE_TEAM_MEMBER]: 'Users',
  [ActivityType.ACCEPT_INVITATION]: 'Users',
  [ActivityType.REJECT_INVITATION]: 'Users',
  [ActivityType.REMOVE_TEAM_MEMBER]: 'Users',
  [ActivityType.UPDATE_TEAM_MEMBER_ROLE]: 'Users',
  [ActivityType.TEAM_CREATED]: 'Users',
  [ActivityType.TEAM_UPDATED]: 'Users',
  [ActivityType.TEAM_DELETED]: 'Users',
  [ActivityType.MEMBER_ADDED]: 'Users',
  [ActivityType.MEMBER_REMOVED]: 'Users',

  // Billing
  [ActivityType.PAYMENT_INITIATED]: 'CreditCard',
  [ActivityType.PAYMENT_CONFIRMED]: 'CreditCard',
  [ActivityType.PAYMENT_FAILED]: 'CreditCard',
  [ActivityType.PAYMENT_COMPLETED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_ACTIVATED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_CANCELLED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_EXPIRED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_CREATED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_UPDATED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_CANCELED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_UPGRADED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_UPDATED_BY_ADMIN]: 'CreditCard',
  [ActivityType.TEAM_PLAN_DOWNGRADED]: 'CreditCard',
  [ActivityType.SUBSCRIPTION_DOWNGRADED]: 'CreditCard',

  // Trade activities
  [ActivityType.TRADE_CREATED]: 'ShoppingCart',
  [ActivityType.TRADE_FUNDED]: 'Package',
  [ActivityType.TRADE_DELIVERED]: 'Package',
  [ActivityType.TRADE_COMPLETED]: 'CheckCircle',
  [ActivityType.TRADE_DISPUTED]: 'AlertCircle',
  [ActivityType.TRADE_REFUNDED]: 'CreditCard',
  [ActivityType.TRADE_CANCELLED]: 'X',

  // Listing activities
  [ActivityType.LISTING_CREATED]: 'Plus',
  [ActivityType.LISTING_UPDATED]: 'Edit',
  [ActivityType.LISTING_DELETED]: 'Trash',
  [ActivityType.LISTING_ACCEPTED]: 'CheckCircle',

  // Chat/Message activities
  [ActivityType.NEW_MESSAGE]: 'MessageSquare',
  [ActivityType.UNREAD_MESSAGES]: 'MessageSquare',
  [ActivityType.MESSAGE_DELETED]: 'Trash',

  // Battle activities
  [ActivityType.BATTLE_MATCH_FOUND]: 'Swords',
  [ActivityType.BATTLE_STARTED]: 'Swords',
  [ActivityType.BATTLE_WON]: 'Crown',
  [ActivityType.BATTLE_LOST]: 'Swords',
  [ActivityType.BATTLE_DRAW]: 'Swords',

  // Team notification activities
  [ActivityType.TEAM_INVITATION]: 'UserPlus',
  [ActivityType.TEAM_JOINED]: 'Users',
  [ActivityType.TEAM_LEFT]: 'Users',
  [ActivityType.TEAM_KICKED]: 'UserX',
  [ActivityType.UPDATE_TEAM_ROLE]: 'Crown'
} as const

export function formatActivityType(type: ActivityType): string {
  // First check if we have a pre-defined label
  const config = ACTIVITY_TYPE_CONFIG[type]
  if (config) {
    return config.label
  }

  // If not, convert underscore format to title case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Icon component mapping
const iconComponentMap = {
  Activity,
  Shield,
  Users,
  CreditCard
} as const

export function getActivityIcon(activityType: ActivityType) {
  const iconName = ACTIVITY_ICONS[activityType] || 'Activity'
  return iconComponentMap[iconName as keyof typeof iconComponentMap] || Activity
}

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  // Security - Sign in/out
  [ActivityType.SIGN_IN]: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.SIGN_OUT]: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30',
  [ActivityType.SIGN_UP]: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.WALLET_CONNECTED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.WALLET_DISCONNECTED]:
    'text-red-600 bg-red-50 dark:bg-red-900/30',

  // User management
  [ActivityType.USER_CREATED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.USER_UPDATED]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.USER_DELETED]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.USER_UPDATED_BY_ADMIN]:
    'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
  [ActivityType.USER_DELETED_BY_ADMIN]:
    'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.BULK_USER_ROLES_UPDATED]:
    'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
  [ActivityType.UPDATE_PASSWORD]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.DELETE_ACCOUNT]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.UPDATE_ACCOUNT]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.UPDATE_PROFILE]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',

  // Team
  [ActivityType.CREATE_TEAM]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.INVITE_TEAM_MEMBER]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.ACCEPT_INVITATION]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.REJECT_INVITATION]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.REMOVE_TEAM_MEMBER]:
    'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.UPDATE_TEAM_MEMBER_ROLE]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.TEAM_CREATED]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.TEAM_UPDATED]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.TEAM_DELETED]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.MEMBER_ADDED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.MEMBER_REMOVED]: 'text-red-600 bg-red-50 dark:bg-red-900/30',

  // Billing
  [ActivityType.PAYMENT_INITIATED]:
    'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
  [ActivityType.PAYMENT_CONFIRMED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.PAYMENT_FAILED]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.PAYMENT_COMPLETED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.SUBSCRIPTION_ACTIVATED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.SUBSCRIPTION_CANCELLED]:
    'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  [ActivityType.SUBSCRIPTION_EXPIRED]:
    'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.SUBSCRIPTION_CREATED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.SUBSCRIPTION_UPDATED]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.SUBSCRIPTION_CANCELED]:
    'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  [ActivityType.SUBSCRIPTION_UPGRADED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.SUBSCRIPTION_UPDATED_BY_ADMIN]:
    'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
  [ActivityType.TEAM_PLAN_DOWNGRADED]:
    'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.SUBSCRIPTION_DOWNGRADED]:
    'text-orange-600 bg-orange-50 dark:bg-orange-900/30',

  // Trade activities
  [ActivityType.TRADE_CREATED]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.TRADE_FUNDED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.TRADE_DELIVERED]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.TRADE_COMPLETED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.TRADE_DISPUTED]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.TRADE_REFUNDED]:
    'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  [ActivityType.TRADE_CANCELLED]:
    'text-gray-600 bg-gray-50 dark:bg-gray-900/30',

  // Listing activities
  [ActivityType.LISTING_CREATED]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.LISTING_UPDATED]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.LISTING_DELETED]:
    'text-gray-600 bg-gray-50 dark:bg-gray-900/30',
  [ActivityType.LISTING_ACCEPTED]:
    'text-green-600 bg-green-50 dark:bg-green-900/30',

  // Chat/Message activities
  [ActivityType.NEW_MESSAGE]: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.UNREAD_MESSAGES]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.MESSAGE_DELETED]:
    'text-gray-600 bg-gray-50 dark:bg-gray-900/30',

  // Battle activities
  [ActivityType.BATTLE_MATCH_FOUND]:
    'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  [ActivityType.BATTLE_STARTED]:
    'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  [ActivityType.BATTLE_WON]: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.BATTLE_LOST]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.BATTLE_DRAW]: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30',

  // Team notification activities
  [ActivityType.TEAM_INVITATION]:
    'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  [ActivityType.TEAM_JOINED]: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  [ActivityType.TEAM_LEFT]: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30',
  [ActivityType.TEAM_KICKED]: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  [ActivityType.UPDATE_TEAM_ROLE]:
    'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
} as const
