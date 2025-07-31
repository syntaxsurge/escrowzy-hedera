export const appRoutes = {
  home: '/',
  login: '/login',
  signIn: '/sign-in',
  pricing: '/pricing',
  privacy: '/privacy',
  terms: '/terms',
  apiDocs: '/api-docs',
  notFound: '/404',
  dbError: '/db-error',
  invite: (token: string) => `/invite/${token}`,

  chat: {
    base: '/chat',
    direct: (contextId: string) => `/chat/direct/${contextId}`,
    team: (teamId: string) => `/chat/team/${teamId}`,
    trades: (tradeId: string) => `/chat/trades/${tradeId}`
  },

  dashboard: {
    base: '/dashboard',
    activity: '/dashboard/activity',
    notifications: '/dashboard/notifications',
    invitations: '/dashboard/invitations',

    settings: {
      base: '/dashboard/settings',
      team: '/dashboard/settings/team',
      subscription: '/dashboard/settings/subscription',
      apiKeys: '/dashboard/settings/api-keys'
    }
  },

  admin: {
    base: '/admin',
    users: '/admin/users',
    teams: '/admin/teams',
    teamMembers: (teamId: string) => `/admin/teams/${teamId}/members`,
    activity: '/admin/activity',
    payments: '/admin/payments',
    disputes: '/admin/disputes',
    contracts: {
      subscription: '/admin/contracts/subscription',
      escrow: '/admin/contracts/escrow',
      achievementNft: '/admin/contracts/achievement-nft'
    },
    blockchainConfig: '/admin/blockchain-config',
    legalDocuments: '/admin/legal-documents'
  },

  trades: {
    base: '/trades',
    active: '/trades/active',
    swap: '/trades/swap',
    history: {
      base: '/trades/history',
      detail: (id: string) => `/trades/history/${id}`
    },
    myListings: '/trades/my-listings',
    listings: {
      base: '/trades/listings',
      create: '/trades/listings/create',
      withTab: (tab: string) => `/trades/listings?tab=${tab}`
    }
  },

  battles: {
    base: '/battles',
    arena: '/battles/arena',
    history: '/battles/history',
    leaderboard: '/battles/leaderboard',
    quests: '/battles/quests',
    achievements: '/battles/achievements'
  },

  battleArena: '/battle-arena',

  rewards: {
    base: '/rewards',
    leaderboard: '/rewards/leaderboard',
    quests: '/rewards/quests'
  },

  // Query parameter utilities
  withParams: {
    chatTab: (route: string) => `${route}?tab=chat`,
    tradesTab: (route: string) => `${route}?tab=trades`,
    teamId: (route: string, teamId: string) => `${route}?teamId=${teamId}`,
    tab: (route: string, tab: string) => `${route}?tab=${tab}`
  },

  // Static assets
  assets: {
    logo: '/images/escrowzy-logo.png',
    favicon: '/images/favicon.ico',
    placeholder: '/images/placeholder.png',
    notificationIcon: '/icon-192x192.png',
    gridBackground: '/grid.svg'
  },

  // External URLs
  external: {
    github: 'https://github.com/syntaxsurge/escrowzy'
  }
} as const

// Global Refresh Intervals (in milliseconds)
export const refreshIntervals = {
  REALTIME: 1000, // 1 second - for real-time polling
  FAST: 2000, // 2 seconds - for queue updates, copy feedback
  NORMAL: 5000, // 5 seconds - for regular updates, database health checks
  MEDIUM: 10000, // 10 seconds - for live stats polling, trade history updates
  SLOW: 30000, // 30 seconds - for stats/history, listings refresh
  VERY_SLOW: 60000, // 1 minute - for less critical updates, market stats
  TRANSACTION_POLLING: 2000, // 2 seconds - for blockchain transaction polling
  CHAT_POLLING: 3000, // 3 seconds - for chat message polling
  NOTIFICATION_POLLING: 15000, // 15 seconds - for notification updates
  SESSION_CHECK: 30000, // 30 seconds - for session validation
  PRICE_UPDATE: 20000, // 20 seconds - for price updates
  HEALTH_CHECK: 10000 // 10 seconds - for health checks
} as const

// UI Animation Durations (in milliseconds)
export const animationDurations = {
  INSTANT: 100,
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
  TOAST: 3000,
  SKELETON: 1500,
  FADE_IN: 150,
  FADE_OUT: 150,
  SLIDE: 250
} as const

// Time constants (in milliseconds)
export const timeConstants = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
} as const

// Timeout values
export const timeouts = {
  API_REQUEST: 30000, // 30 seconds
  FILE_UPLOAD: 120000, // 2 minutes
  TRANSACTION: 300000, // 5 minutes
  WEBSOCKET_RECONNECT: 5000, // 5 seconds
  FORM_SUBMIT: 60000, // 1 minute
  DEBOUNCE_DEFAULT: 500, // 500ms
  DEBOUNCE_SEARCH: 300, // 300ms
  THROTTLE_DEFAULT: 1000 // 1 second
} as const

// Rate limiting
export const rateLimits = {
  BATTLE_PER_DAY: 10,
  TRADES_PER_DAY: 100,
  LOGIN_ATTEMPTS: 5,
  API_CALLS_PER_MINUTE: 60,
  FILE_UPLOADS_PER_HOUR: 20,
  MESSAGES_PER_MINUTE: 30
} as const

// Pagination
export const pagination = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  TRADES_PER_PAGE: 20,
  LISTINGS_PER_PAGE: 20,
  NOTIFICATIONS_PER_PAGE: 15,
  MESSAGES_PER_LOAD: 50,
  USERS_PER_PAGE: 25
} as const
