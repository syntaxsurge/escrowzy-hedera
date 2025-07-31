// Local storage keys
export const localStorageKeys = {
  authChecked: 'auth_checked',
  authLogout: 'auth_logout',
  contractCachePrefix: 'contract_cache_',
  onboardingPrefix: 'onboarding_',
  okxQueue: 'okx-queue-tasks',
  okxLastRequest: 'okx-last-request-time',
  selectedNetwork: 'selected-network',
  theme: 'theme'
} as const

export const apiEndpoints = {
  auth: {
    signOut: '/api/auth/signout',
    wallet: '/api/auth/wallet',
    verifyEmail: '/api/auth/verify-email',
    resendVerification: '/api/auth/resend-verification'
  },
  pusher: {
    auth: '/api/pusher/auth'
  },
  user: {
    profile: '/api/user',
    subscription: '/api/user/subscription'
  },
  team: '/api/team',
  notifications: {
    list: '/api/notifications',
    table: '/api/notifications/table'
  },
  teams: {
    base: '/api/teams',
    downgrade: (id: string) => `/api/teams/${id}/downgrade-free`,
    downgradeTeamPlan: (id: string) => `/api/teams/${id}/downgrade-team-plan`,
    paymentHistory: (id: string) => `/api/teams/${id}/payment-history`
  },
  teamMembers: {
    byId: (memberId: string) => `/api/team-members/${memberId}`
  },
  admin: {
    users: {
      base: '/api/admin/users',
      byId: (userId: string) => `/api/admin/users/${userId}`,
      bulkUpdate: '/api/admin/users/bulk-update'
    },
    achievements: {
      base: '/api/admin/achievements',
      recentMints: '/api/admin/achievements/recent-mints',
      settings: '/api/admin/achievements/settings',
      stats: '/api/admin/achievements/stats'
    },
    teams: {
      base: '/api/admin/teams',
      members: (teamId: string) => `/api/admin/teams/${teamId}/members`,
      memberRole: (teamId: string, memberId: string) =>
        `/api/admin/teams/${teamId}/members/${memberId}/role`,
      memberById: (teamId: string, memberId: string) =>
        `/api/admin/teams/${teamId}/members/${memberId}`,
      availableUsers: (teamId: string) =>
        `/api/admin/teams/${teamId}/available-users`
    },
    stats: '/api/admin/stats',
    paymentHistory: '/api/admin/payment-history',
    activityLogs: '/api/admin/activity-logs',
    contract: {
      transactions: '/api/admin/contract-transactions',
      plans: '/api/admin/contract-plans',
      byPlanKey: (planKey: string) => `/api/admin/contract-plans/${planKey}`,
      earnings: '/api/admin/contract-earnings',
      escrow: {
        stats: '/api/admin/contract/escrow/stats',
        list: '/api/admin/contract/escrow/list'
      },
      achievement: {
        stats: '/api/admin/contract/achievement/stats',
        list: '/api/admin/contract/achievement/list'
      }
    },
    blockchainConfig: {
      base: '/api/admin/blockchain-config',
      sync: '/api/admin/blockchain-config/sync',
      contractById: (contractId: string) =>
        `/api/admin/blockchain-config/contracts/${contractId}`
    },
    legalDocuments: {
      base: '/api/admin/legal-documents',
      byType: (type: string) => `/api/admin/legal-documents/${type}`
    },
    disputes: {
      base: '/api/admin/disputes',
      resolve: (id: string | number) => `/api/admin/disputes/${id}/resolve`
    }
  },
  payments: {
    intent: '/api/payments/intent',
    confirm: '/api/payments/confirm'
  },
  subscription: {
    validate: '/api/subscription/validate',
    combined: '/api/subscription/combined'
  },
  health: {
    db: '/api/health/db'
  },
  cron: {
    subscriptionCheck: '/api/cron/subscription-check',
    cleanupInvitations: '/api/cron/cleanup-invitations',
    syncTransactions: '/api/cron/sync-transactions',
    updateExpiredTrades: '/api/cron/update-expired-trades',
    cleanupSessions: '/api/cron/cleanup-sessions'
  },
  invitations: {
    base: '/api/invitations',
    byToken: (token: string) => `/api/invitations/${token}`,
    decline: (token: string) => `/api/invitations/${token}/decline`
  },
  activity: {
    base: '/api/activity',
    recent: '/api/activity/recent'
  },
  contractPlans: '/api/contract-plans',
  transactions: {
    sync: '/api/transactions/sync',
    track: '/api/transactions/track',
    status: '/api/transactions/status'
  },
  legalDocuments: {
    byType: (type: string) => `/api/legal-documents/${type}`
  },
  trades: {
    base: '/api/trades',
    create: '/api/trades/create',
    user: '/api/trades/user',
    userWithParams: (params: string) => `/api/trades/user?${params}`,
    table: '/api/trades/table',
    stats: '/api/trades/stats',
    byId: (id: string) => `/api/trades/${id}`,
    deposit: (id: string | number) => `/api/trades/${id}/deposit`,
    fund: (id: string | number) => `/api/trades/${id}/fund`,
    paymentSent: (id: string | number) => `/api/trades/${id}/payment-sent`,
    confirm: (id: string | number) => `/api/trades/${id}/confirm`,
    dispute: (id: string | number) => `/api/trades/${id}/dispute`,
    cancel: (id: string | number) => `/api/trades/${id}/cancel`,
    convertPrice: '/api/trades/convert-price'
  },
  listings: {
    base: '/api/listings',
    all: '/api/listings',
    user: '/api/listings/user',
    userStats: '/api/listings/user-stats',
    marketStats: '/api/listings/market-stats',
    create: '/api/listings/create',
    byId: (id: string) => `/api/listings/${id}`,
    accept: (id: string) => `/api/listings/${id}/accept`,
    delete: (id: string) => `/api/listings/${id}/delete`
  },
  battles: {
    findMatch: '/api/battles/find-match',
    create: '/api/battles/create',
    activeDiscount: '/api/battles/active-discount',
    history: '/api/battles/history',
    dailyLimit: '/api/battles/daily-limit',
    stats: '/api/battles/stats',
    statsByUserId: (userId: string | number) => `/api/battles/stats/${userId}`,
    activity: '/api/battles/activity',
    process: '/api/battles/process',
    state: '/api/battles/state',
    start: '/api/battles/start',
    invitations: '/api/battles/invitations',
    liveStats: '/api/battles/live-stats',
    queueInfo: '/api/battles/queue-info',
    accept: '/api/battles/accept',
    reject: '/api/battles/reject',
    invite: '/api/battles/invite',
    current: '/api/battles/current',
    action: '/api/battles/action'
  },
  rewards: {
    dailyLogin: '/api/rewards/daily-login',
    addXp: '/api/rewards/add-xp',
    questProgress: '/api/rewards/quest-progress',
    questProgressClaim: (questId: string) =>
      `/api/rewards/quest-progress/${questId}/claim`,
    checkAchievement: '/api/rewards/check-achievement',
    stats: '/api/rewards/stats',
    statsByUserId: (userId: string | number) => `/api/rewards/stats/${userId}`,
    achievements: '/api/rewards/achievements',
    achievementsByUserId: (userId: string | number) =>
      `/api/rewards/achievements/${userId}`,
    claimAchievement: '/api/rewards/claim-achievement',
    leaderboard: '/api/rewards/leaderboard',
    userRank: '/api/rewards/user-rank',
    questsByUserId: (userId: string | number) => `/api/rewards/quests/${userId}`
  },
  users: {
    tradingStats: (id: string) => `/api/users/${id}/trading-stats`
  },
  uploads: {
    base: '/api/upload',
    getFile: (path: string) => `/api/uploads/${path}`
  },
  fees: {
    preview: '/api/fees/preview'
  },
  swap: {
    chains: '/api/swap/chains',
    balances: '/api/swap/balances',
    tokens: '/api/swap/tokens',
    quote: '/api/swap/quote',
    price: '/api/swap/price',
    execute: '/api/swap/execute',
    marketStats: '/api/swap/market-stats',
    gasPrice: '/api/swap/gas-price',
    trendingPairs: '/api/swap/trending-pairs',
    liquidity: '/api/swap/liquidity',
    liquidityByChain: (chainId: string | number) =>
      `/api/swap/liquidity-${chainId}`,
    allTokens: '/api/swap/all-tokens',
    approve: '/api/swap/approve',
    executeWithSession: '/api/swap/execute-with-session'
  },
  settings: {
    apiKeys: {
      base: '/api/settings/api-keys',
      byId: (keyId: string) => `/api/settings/api-keys/${keyId}`
    }
  },
  queue: {
    cleanup: '/api/queue/cleanup',
    stats: '/api/queue/stats'
  },
  v1: {
    escrow: {
      create: '/api/v1/escrow/create',
      list: '/api/v1/escrow/list',
      byId: (id: string) => `/api/v1/escrow/${id}`,
      fund: (id: string) => `/api/v1/escrow/${id}/fund`,
      confirm: (id: string) => `/api/v1/escrow/${id}/confirm`,
      dispute: (id: string) => `/api/v1/escrow/${id}/dispute`
    }
  },
  external: {
    coingecko: {
      price: (coingeckoId: string) =>
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    },
    resend: {
      emails: 'https://api.resend.com/emails'
    },
    okxDex: {
      baseUrl: 'https://web3.okx.com',
      basePath: '/api/v5',
      endpoints: {
        // Market endpoints
        supportedChains: '/dex/market/supported/chain',
        marketPrice: '/dex/market/price',
        marketPriceInfo: '/dex/market/price-info',

        // Aggregator endpoints
        quote: '/dex/aggregator/quote',
        swap: '/dex/aggregator/swap',
        allTokens: '/dex/aggregator/all-tokens',
        liquiditySources: '/dex/aggregator/get-liquidity',
        approveTransaction: '/dex/aggregator/approve-transaction',
        tokenSearch: '/dex/aggregator/token-search',
        chainInfo: '/dex/aggregator/chain-info',

        // Balance endpoints
        balance: '/dex/balance/token-balance',
        balanceAll: '/dex/balance/all-token-balances-by-address',

        // Transaction history endpoints
        txHistory: '/dex/tx-history/address/transaction-list',
        txStatus: '/dex/tx-history/transaction/status',

        // Gas price endpoint
        gasPrice: '/wallet/pre-transaction/gas-price'
      }
    }
  },
  market: {
    okxPrices: '/api/market/okx-prices',
    arbitrage: '/api/market/arbitrage',
    combinedStats: '/api/market/combined-stats'
  }
} as const

// Pusher Channel Patterns
export const pusherChannels = {
  // User channels
  user: (userId: number) => `user-${userId}`,
  userTrades: (userId: number) => `user-trades-${userId}`,
  userConversations: (userId: number) => `user-${userId}-conversations`,

  // Trade channels
  trade: (tradeId: number) => `trade-${tradeId}`,
  tradesGlobal: 'trades-global',

  // Listing channels
  listing: (listingId: number) => `listing-${listingId}`,
  userListings: (userId: number) => `user-listings-${userId}`,
  listingsGlobal: 'listings-global',
  listingsByPair: (tokenPair: string) =>
    `listings-${tokenPair.replace('/', '-')}`,

  // Market data channels
  market: (tokenPair: string) => `market-${tokenPair.replace('/', '-')}`,

  // Battle channels
  battleStats: 'battle-stats',
  battleQueue: 'battle-queue',

  // Team channels
  team: (teamId: string) => `team-${teamId}`,

  // Presence channels for real-time status
  presence: (contextType: string, contextId: string) =>
    `presence-${contextType}-${contextId}`,

  // Trade messages channel
  tradeMessages: (tradeId: number) => `trade-messages-${tradeId}`,

  // Battle channel
  battle: (battleId: number) => `battle-${battleId}`,

  // Chat channel (generic)
  chat: (contextType: string, contextId: string | number) =>
    `chat-${contextType}-${contextId}`
} as const

// Pusher System Events
export const pusherSystemEvents = {
  subscriptionSucceeded: 'pusher:subscription_succeeded',
  subscriptionError: 'pusher:subscription_error',
  connectionEstablished: 'pusher:connection_established',
  error: 'pusher:error'
} as const

// Pusher Event Names
export const pusherEvents = {
  // Trade events
  trade: {
    updated: 'trade-updated',
    created: 'trade-created',
    statusChanged: 'trade-status-changed',
    funded: 'trade-funded',
    completed: 'trade-completed',
    disputed: 'trade-disputed',
    cancelled: 'trade-cancelled',
    expired: 'trade-expired',
    depositFailed: 'deposit-failed',
    depositConfirmed: 'deposit-confirmed',
    paymentSent: 'payment-sent',
    paymentReceived: 'payment-received',
    paymentProofUploaded: 'payment-proof-uploaded',
    proofUploaded: 'proof-uploaded',
    evidenceUploaded: 'evidence-uploaded'
  },

  // Battle events
  battle: {
    invitation: 'battle-invitation',
    accepted: 'battle-accepted',
    rejected: 'battle-rejected',
    started: 'battle-started',
    update: 'battle-update',
    completed: 'battle-completed',
    timeout: 'battle-timeout',
    error: 'battle-error',
    statsUpdated: 'stats-updated',
    queueUpdated: 'queue-updated',
    queueStatus: 'queue-status',
    roundStart: 'round-start',
    roundEnd: 'round-end',
    actionExecuted: 'action-executed',
    stateUpdate: 'state-update',
    inProgress: 'in-progress',
    waiting: 'waiting',
    playerJoined: 'player-joined',
    playerLeft: 'player-left',
    opponentAction: 'opponent-action'
  },

  // Chat events
  chat: {
    message: 'chat-message',
    typing: 'chat-typing',
    read: 'chat-read',
    messageNew: 'message-new',
    messageDeleted: 'message-deleted',
    messageEdited: 'message-edited',
    userJoined: 'user-joined',
    userLeft: 'user-left'
  },

  // Notification events
  notification: {
    created: 'notification-created',
    read: 'notification-read',
    achievement: 'achievement',
    levelUp: 'level-up',
    questCompleted: 'quest-completed'
  },

  // Listing events
  listing: {
    created: 'listing-created',
    updated: 'listing-updated',
    deleted: 'listing-deleted',
    accepted: 'listing-accepted',
    priceUpdated: 'listing-price-updated',
    orderbookUpdated: 'orderbook-updated'
  },

  // XP and rewards events
  rewards: {
    xpGained: 'xp-gained',
    levelUp: 'level-up',
    achievementUnlocked: 'achievement-unlocked',
    questCompleted: 'quest-completed',
    dailyLoginClaimed: 'daily-login-claimed'
  },

  // Team events
  team: {
    memberAdded: 'member-added',
    memberRemoved: 'member-removed',
    roleChanged: 'role-changed',
    invitationSent: 'invitation-sent'
  },

  // Swap events
  swap: {
    priceUpdated: 'price-updated',
    orderbookUpdated: 'orderbook-updated',
    transactionSubmitted: 'transaction-submitted',
    transactionConfirmed: 'transaction-confirmed',
    transactionFailed: 'transaction-failed'
  },

  // Queue events
  queue: {
    status: 'queue-status',
    taskCompleted: 'task-completed',
    taskFailed: 'task-failed'
  },

  // Transaction events
  transaction: {
    statusUpdate: 'transaction-status-update',
    confirmed: 'transaction-confirmed',
    failed: 'transaction-failed'
  },

  // Global events
  global: {
    statsUpdate: 'stats-update',
    systemMessage: 'system-message'
  }
} as const

// HTTP Headers Configuration
export const httpHeaders = {
  session: {
    userId: 'x-session-user-id',
    token: 'x-session-token'
  },
  rateLimit: {
    forwardedFor: 'x-forwarded-for',
    realIp: 'x-real-ip',
    userAgent: 'user-agent'
  },
  auth: {
    authorization: 'authorization'
  },
  security: {
    contentTypeOptions: 'X-Content-Type-Options',
    frameOptions: 'X-Frame-Options',
    xssProtection: 'X-XSS-Protection',
    referrerPolicy: 'Referrer-Policy',
    permissionsPolicy: 'Permissions-Policy',
    strictTransportSecurity: 'Strict-Transport-Security'
  }
} as const
