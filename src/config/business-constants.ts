// Trade constants
export const tradeConstants = {
  MIN_TRADE_AMOUNT: 10,
  MAX_TRADE_AMOUNT: 100000,
  DEFAULT_PAYMENT_TIME_LIMIT: 30 * 60 * 1000, // 30 minutes in ms
  SELLER_DEPOSIT_TIME_LIMIT: 48 * 60 * 60 * 1000, // 48 hours in ms
  DISPUTE_EVIDENCE_TIME_LIMIT: 72 * 60 * 60 * 1000, // 72 hours in ms
  AUTO_EXPIRE_TIME: 24 * 60 * 60 * 1000, // 24 hours in ms
  DEPOSIT_PERCENTAGE: 5, // 5% deposit
  MAX_IMAGES_PER_TRADE: 5,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  STATUS: {
    PENDING: 'pending',
    SELLER_DEPOSITING: 'seller_depositing',
    BUYER_DEPOSITING: 'buyer_depositing',
    IN_PROGRESS: 'in_progress',
    PAYMENT_SENT: 'payment_sent',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
  } as const
} as const

// Listing constants
export const listingConstants = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 1000000,
  MIN_AMOUNT: 0.00001,
  MAX_AMOUNT: 1000000,
  EXPIRY_TIME: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  DEFAULT_PAYMENT_WINDOW: 15, // 15 minutes default
  TYPES: {
    BUY: 'buy',
    SELL: 'sell'
  } as const,
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    EXPIRED: 'expired',
    COMPLETED: 'completed'
  } as const
} as const

// XP and rewards constants
export const rewardsConstants = {
  XP: {
    DAILY_LOGIN: 50,
    FIRST_TRADE: 100,
    COMPLETE_TRADE: 25,
    BATTLE_WIN: 50,
    BATTLE_LOSS: 10,
    QUEST_COMPLETE: 75,
    ACHIEVEMENT_UNLOCK: 100,
    REFERRAL: 150,
    WEEKLY_STREAK: 200,
    MONTHLY_STREAK: 500,
    CREATE_LISTING: 10,
    ACCEPT_LISTING: 15,
    RESOLVE_DISPUTE: 30
  },
  LEVELS: {
    XP_PER_LEVEL: 1000,
    MAX_LEVEL: 100,
    PRESTIGE_LEVELS: 10
  },
  STREAKS: {
    DAILY_RESET_HOUR: 0, // Midnight UTC
    WEEKLY_RESET_DAY: 1, // Monday
    MAX_DAILY_STREAK: 365,
    MAX_WEEKLY_STREAK: 52
  }
} as const

// Battle constants
export const battleConstants = {
  DAILY_LIMIT: 10,
  QUEUE_TIMEOUT: 60 * 1000, // 1 minute
  TURN_TIMEOUT: 30 * 1000, // 30 seconds
  COUNTDOWN_DELAY: 5000, // 5 second countdown before battle starts
  MAX_ROUNDS: 5,
  BASE_HEALTH: 100,
  BASE_DAMAGE: 20,
  CRITICAL_CHANCE: 0.15,
  CRITICAL_MULTIPLIER: 1.5,
  DISCOUNT_PERCENTAGE: 50, // 50% trading fee discount for winner
  DISCOUNT_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  MIN_WAGER: 0,
  MAX_WAGER: 1000,
  ACTIONS: {
    ATTACK: 'attack',
    DEFEND: 'defend',
    SPECIAL: 'special'
  } as const,
  STATUS: {
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout'
  } as const
} as const

// Subscription tiers
export const subscriptionTiers = {
  FREE: {
    name: 'Free',
    price: 0,
    maxTrades: 10,
    maxListings: 5,
    feePercentage: 2.5,
    features: ['basic_trades', 'basic_listings']
  },
  PRO: {
    name: 'Pro',
    price: 29.99,
    maxTrades: 100,
    maxListings: 50,
    feePercentage: 1.5,
    features: [
      'unlimited_trades',
      'unlimited_listings',
      'priority_support',
      'advanced_analytics'
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99.99,
    maxTrades: -1, // Unlimited
    maxListings: -1, // Unlimited
    feePercentage: 1.0,
    features: [
      'unlimited_everything',
      'dedicated_support',
      'custom_features',
      'api_access'
    ]
  }
} as const

// Fee structure
export const feeConstants = {
  BASE_PERCENTAGE: 2.5,
  MIN_FEE: 0.5,
  MAX_FEE: 500,
  BATTLE_DISCOUNT: 50, // 50% off
  VOLUME_DISCOUNTS: [
    { volume: 10000, discount: 0.1 }, // 10% off for > $10k volume
    { volume: 50000, discount: 0.2 }, // 20% off for > $50k volume
    { volume: 100000, discount: 0.3 } // 30% off for > $100k volume
  ],
  // Fee tiers by subscription plan
  TIER_PERCENTAGES: {
    free: 2.5,
    pro: 2.0,
    team: 1.5,
    enterprise: 1.5
  } as const
} as const

// File upload constants
export const uploadConstants = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_FILE_TYPES: ['application/pdf', 'application/zip', 'text/plain'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  UPLOAD_PATHS: {
    AVATARS: '/uploads/avatars',
    PAYMENT_PROOFS: '/uploads/payment-proofs',
    DOMAIN_TRANSFER_PROOFS: '/uploads/domain-transfer-proofs',
    DISPUTE_EVIDENCE: '/uploads/dispute-evidence',
    ATTACHMENTS: '/uploads/attachments'
  },
  UPLOAD_TYPES: {
    AVATARS: 'avatars',
    PAYMENT_PROOFS: 'payment-proofs',
    DOMAIN_TRANSFER_PROOFS: 'domain-transfer-proofs',
    DISPUTE_EVIDENCE: 'dispute-evidence',
    ATTACHMENTS: 'attachments'
  }
} as const

// Validation constants
export const validationConstants = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_TEAM_NAME_LENGTH: 3,
  MAX_TEAM_NAME_LENGTH: 50,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
  ETHEREUM_ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/
} as const

// Security constants
export const securityConstants = {
  JWT_EXPIRY: 7 * 24 * 60 * 60, // 7 days in seconds
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60, // 30 days in seconds
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  PASSWORD_RESET_EXPIRY: 1 * 60 * 60, // 1 hour in seconds
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in ms
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in ms
  TWO_FA_CODE_LENGTH: 6,
  API_KEY_LENGTH: 32,
  // API rate limits per hour by tier
  API_RATE_LIMITS: {
    free: 100,
    pro: 1000,
    team: 5000,
    enterprise: 10000
  } as const
} as const

// Server configuration
export const serverConfig = {
  defaultHost: 'localhost:3000',
  defaultProtocol: 'http' as const,
  developmentUrl: 'http://localhost:3000',
  localhostIp: '127.0.0.1'
} as const

// Email configuration
export const emailConfig = {
  defaultFrom: 'noreply@escrowzy.com',
  supportEmail: 'support@escrowzy.com',
  adminEmail: 'admin@escrowzy.com',
  // For seed data only
  testEmail: 'pending@example.com'
} as const
