export const ACHIEVEMENTS = {
  FIRST_LOGIN: {
    id: 'first_login',
    name: 'Welcome Aboard!',
    description: 'Complete your first login',
    icon: '🎉',
    xpReward: 100,
    nftEligible: false,
    category: 'onboarding',
    rarity: 'common'
  },
  WEEK_STREAK: {
    id: 'week_streak',
    name: 'Dedicated User',
    description: '7 day login streak',
    icon: '🔥',
    xpReward: 500,
    nftEligible: true,
    category: 'engagement',
    rarity: 'rare'
  },
  MONTH_STREAK: {
    id: 'month_streak',
    name: 'Loyal Member',
    description: '30 day login streak',
    icon: '⭐',
    xpReward: 2000,
    nftEligible: true,
    category: 'engagement',
    rarity: 'epic'
  },
  YEAR_STREAK: {
    id: 'year_streak',
    name: 'Legendary Dedication',
    description: '365 day login streak',
    icon: '👑',
    xpReward: 10000,
    nftEligible: true,
    category: 'engagement',
    rarity: 'legendary'
  },
  FIRST_TEAM: {
    id: 'first_team',
    name: 'Team Player',
    description: 'Create or join your first team',
    icon: '👥',
    xpReward: 300,
    nftEligible: false,
    category: 'collaboration',
    rarity: 'common'
  },
  FIRST_MESSAGE: {
    id: 'first_message',
    name: 'Communicator',
    description: 'Send your first message',
    icon: '💬',
    xpReward: 150,
    nftEligible: false,
    category: 'social',
    rarity: 'common'
  },
  PROFILE_COMPLETE: {
    id: 'profile_complete',
    name: 'Identity Established',
    description: 'Complete your profile setup',
    icon: '✅',
    xpReward: 200,
    nftEligible: false,
    category: 'onboarding',
    rarity: 'common'
  },
  WALLET_CONNECTED: {
    id: 'wallet_connected',
    name: 'Web3 Pioneer',
    description: 'Connect your first wallet',
    icon: '🔗',
    xpReward: 250,
    nftEligible: false,
    category: 'blockchain',
    rarity: 'common'
  },
  FIRST_SUBSCRIPTION: {
    id: 'first_subscription',
    name: 'Premium Member',
    description: 'Activate your first subscription',
    icon: '💎',
    xpReward: 1000,
    nftEligible: true,
    category: 'premium',
    rarity: 'rare'
  },
  TEAM_LEADER: {
    id: 'team_leader',
    name: 'Leadership',
    description: 'Become a team owner',
    icon: '🎖️',
    xpReward: 750,
    nftEligible: true,
    category: 'collaboration',
    rarity: 'rare'
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Send 100 messages',
    icon: '🦋',
    xpReward: 1500,
    nftEligible: true,
    category: 'social',
    rarity: 'epic'
  },
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Among the first 1000 users',
    icon: '🚀',
    xpReward: 5000,
    nftEligible: true,
    category: 'special',
    rarity: 'legendary'
  },
  // Trading achievements
  FIRST_TRADE: {
    id: 'first_trade',
    name: 'First Trade',
    description: 'Complete your first trade successfully',
    icon: '💱',
    xpReward: 500,
    nftEligible: false,
    category: 'trading',
    rarity: 'common'
  },
  TRADE_VETERAN: {
    id: 'trade_veteran',
    name: 'Trade Veteran',
    description: 'Complete 10 successful trades',
    icon: '📊',
    xpReward: 1000,
    nftEligible: true,
    category: 'trading',
    rarity: 'rare'
  },
  TRADE_MASTER: {
    id: 'trade_master',
    name: 'Trade Master',
    description: 'Complete 50 successful trades',
    icon: '📈',
    xpReward: 2500,
    nftEligible: true,
    category: 'trading',
    rarity: 'epic'
  },
  WHALE_TRADER: {
    id: 'whale_trader',
    name: 'Whale Trader',
    description: 'Reach 1M in total trading volume',
    icon: '🐋',
    xpReward: 10000,
    nftEligible: true,
    category: 'trading',
    rarity: 'legendary'
  },
  SPEED_TRADER: {
    id: 'speed_trader',
    name: 'Speed Trader',
    description: 'Complete a trade in under 1 hour',
    icon: '⚡',
    xpReward: 750,
    nftEligible: false,
    category: 'trading',
    rarity: 'rare'
  },
  PERFECT_TRADER: {
    id: 'perfect_trader',
    name: 'Perfect Trader',
    description: 'Maintain 5-star rating for 25 trades',
    icon: '⭐',
    xpReward: 3000,
    nftEligible: true,
    category: 'trading',
    rarity: 'epic'
  },
  // Battle achievements
  FIRST_BATTLE: {
    id: 'first_battle',
    name: 'Arena Newcomer',
    description: 'Participate in your first battle',
    icon: '⚔️',
    xpReward: 300,
    nftEligible: false,
    category: 'battle',
    rarity: 'common'
  },
  BATTLE_WINNER: {
    id: 'battle_winner',
    name: 'Victor',
    description: 'Win your first battle',
    icon: '🏆',
    xpReward: 500,
    nftEligible: false,
    category: 'battle',
    rarity: 'common'
  },
  ARENA_VETERAN: {
    id: 'arena_veteran',
    name: 'Arena Veteran',
    description: 'Win 10 battles',
    icon: '🎖️',
    xpReward: 1500,
    nftEligible: true,
    category: 'battle',
    rarity: 'rare'
  },
  ARENA_CHAMPION: {
    id: 'arena_champion',
    name: 'Arena Champion',
    description: 'Win 50 battles',
    icon: '👑',
    xpReward: 5000,
    nftEligible: true,
    category: 'battle',
    rarity: 'epic'
  },
  UNDEFEATED: {
    id: 'undefeated',
    name: 'Undefeated',
    description: 'Win 10 battles in a row',
    icon: '🔥',
    xpReward: 3000,
    nftEligible: true,
    category: 'battle',
    rarity: 'epic'
  },
  COMBAT_MASTER: {
    id: 'combat_master',
    name: 'Combat Master',
    description: 'Reach 1000 Combat Power',
    icon: '💪',
    xpReward: 4000,
    nftEligible: true,
    category: 'battle',
    rarity: 'epic'
  },
  // P2P Listing achievements
  FIRST_LISTING: {
    id: 'first_listing',
    name: 'Market Maker',
    description: 'Create your first P2P listing',
    icon: '📝',
    xpReward: 400,
    nftEligible: false,
    category: 'trading',
    rarity: 'common'
  },
  ACTIVE_TRADER: {
    id: 'active_trader',
    name: 'Active Trader',
    description: 'Have 5 active listings at once',
    icon: '🔄',
    xpReward: 800,
    nftEligible: false,
    category: 'trading',
    rarity: 'rare'
  },
  // Dispute achievements
  DISPUTE_RESOLVER: {
    id: 'dispute_resolver',
    name: 'Peacemaker',
    description: 'Successfully resolve a dispute',
    icon: '🕊️',
    xpReward: 1000,
    nftEligible: true,
    category: 'trading',
    rarity: 'rare'
  },
  TRUSTED_TRADER: {
    id: 'trusted_trader',
    name: 'Trusted Trader',
    description: 'Complete 20 trades with no disputes',
    icon: '🤝',
    xpReward: 2000,
    nftEligible: true,
    category: 'trading',
    rarity: 'epic'
  }
} as const

export const LEVELS = Array.from({ length: 100 }, (_, i) => {
  const level = i + 1
  const baseXP = 100
  const multiplier = 1.5
  const minXP =
    level === 1 ? 0 : Math.floor(baseXP * Math.pow(level - 1, multiplier))

  let title = 'Novice'
  let color = 'text-gray-500'
  let bgGradient = 'from-gray-500 to-gray-600'

  if (level >= 90) {
    title = 'Mythic'
    color = 'text-red-500'
    bgGradient = 'from-red-500 to-orange-500'
  } else if (level >= 75) {
    title = 'Legendary'
    color = 'text-yellow-500'
    bgGradient = 'from-yellow-400 to-yellow-600'
  } else if (level >= 60) {
    title = 'Master'
    color = 'text-purple-500'
    bgGradient = 'from-purple-500 to-pink-500'
  } else if (level >= 45) {
    title = 'Expert'
    color = 'text-indigo-500'
    bgGradient = 'from-indigo-500 to-purple-500'
  } else if (level >= 30) {
    title = 'Professional'
    color = 'text-blue-500'
    bgGradient = 'from-blue-500 to-indigo-500'
  } else if (level >= 20) {
    title = 'Advanced'
    color = 'text-cyan-500'
    bgGradient = 'from-cyan-500 to-blue-500'
  } else if (level >= 10) {
    title = 'Intermediate'
    color = 'text-green-500'
    bgGradient = 'from-green-500 to-cyan-500'
  } else if (level >= 5) {
    title = 'Beginner'
    color = 'text-emerald-500'
    bgGradient = 'from-emerald-500 to-green-500'
  }

  return {
    level,
    minXP,
    title,
    color,
    bgGradient,
    maxXP:
      level === 100
        ? Infinity
        : Math.floor(baseXP * Math.pow(level, multiplier))
  }
})

export const DAILY_QUESTS = {
  DAILY_LOGIN: {
    id: 'daily_login',
    name: 'Daily Check-in',
    description: 'Log in to the platform',
    xpReward: 50,
    icon: '📅',
    resetDaily: true,
    progress: { current: 0, required: 1 }
  },
  SEND_MESSAGES: {
    id: 'send_messages',
    name: 'Conversation Starter',
    description: 'Send 5 messages today',
    xpReward: 100,
    icon: '💬',
    resetDaily: true,
    progress: { current: 0, required: 5 }
  },
  TEAM_ACTIVITY: {
    id: 'team_activity',
    name: 'Team Contributor',
    description: 'Perform 3 team actions',
    xpReward: 150,
    icon: '🤝',
    resetDaily: true,
    progress: { current: 0, required: 3 }
  },
  PROFILE_VIEW: {
    id: 'profile_view',
    name: 'Profile Explorer',
    description: 'View 3 user profiles',
    xpReward: 75,
    icon: '👤',
    resetDaily: true,
    progress: { current: 0, required: 3 }
  },
  COMPLETE_TRADE: {
    id: 'complete_trade',
    name: 'Daily Trader',
    description: 'Complete 1 trade today',
    xpReward: 200,
    icon: '💰',
    resetDaily: true,
    progress: { current: 0, required: 1 }
  },
  BATTLE_PARTICIPATION: {
    id: 'battle_participation',
    name: 'Arena Fighter',
    description: 'Participate in 1 battle today',
    xpReward: 150,
    icon: '⚔️',
    resetDaily: true,
    progress: { current: 0, required: 1 }
  },
  CREATE_LISTING: {
    id: 'create_listing',
    name: 'Market Activity',
    description: 'Create or update a P2P listing',
    xpReward: 100,
    icon: '📋',
    resetDaily: true,
    progress: { current: 0, required: 1 }
  }
} as const

export const WEEKLY_QUESTS = {
  WEEKLY_STREAK: {
    id: 'weekly_streak',
    name: 'Consistent User',
    description: 'Log in 5 days this week',
    xpReward: 500,
    icon: '🗓️',
    resetWeekly: true,
    progress: { current: 0, required: 5 }
  },
  SOCIAL_WEEK: {
    id: 'social_week',
    name: 'Social Week',
    description: 'Send 50 messages this week',
    xpReward: 750,
    icon: '🌟',
    resetWeekly: true,
    progress: { current: 0, required: 50 }
  },
  TEAM_COLLABORATION: {
    id: 'team_collaboration',
    name: 'Team Synergy',
    description: 'Complete 10 team activities',
    xpReward: 1000,
    icon: '🏆',
    resetWeekly: true,
    progress: { current: 0, required: 10 }
  }
} as const

export const RARITY_COLORS = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-600 dark:text-gray-400',
    glow: ''
  },
  rare: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-400/20'
  },
  epic: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-400/30'
  },
  legendary: {
    bg: 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950',
    border: 'border-yellow-400 dark:border-yellow-600',
    text: 'text-yellow-600 dark:text-yellow-400',
    glow: 'shadow-yellow-400/40 animate-pulse'
  }
} as const

export const XP_MULTIPLIERS = {
  DOUBLE_XP_WEEKEND: 2,
  PREMIUM_BONUS: 1.5,
  TEAM_BONUS: 1.2,
  STREAK_BONUS: 1.1
} as const

export const LEADERBOARD_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'all_time'
} as const

export type Achievement = (typeof ACHIEVEMENTS)[keyof typeof ACHIEVEMENTS]
export type Level = (typeof LEVELS)[number]
export type DailyQuest = (typeof DAILY_QUESTS)[keyof typeof DAILY_QUESTS]
export type WeeklyQuest = (typeof WEEKLY_QUESTS)[keyof typeof WEEKLY_QUESTS]
export type Rarity = keyof typeof RARITY_COLORS
