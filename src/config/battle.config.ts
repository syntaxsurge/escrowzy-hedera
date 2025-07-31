/**
 * Centralized Battle System Configuration
 * All battle-related constants should be imported from this file
 */

export const BATTLE_CONFIG = {
  // Health and Round Settings
  MAX_HEALTH: 100,
  MAX_ROUNDS: 999, // Effectively unlimited - battle ends when HP reaches 0
  ROUND_INTERVAL: 3000, // 3 seconds between rounds
  CALCULATING_DURATION: 1000, // 1 second for calculating results
  BATTLE_DURATION_MS: 600000, // 10 minutes max battle duration

  // Base Damage Settings
  BASE_DAMAGE: 4,
  DAMAGE_VARIANCE: 2,
  CRITICAL_HIT_CHANCE: 0.15,
  CRITICAL_MULTIPLIER: 2,
  DODGE_CHANCE: 0.1,
  DEFEND_REDUCTION: 0.5,

  // Simultaneous Combat Settings
  ATTACK_VS_ATTACK_DAMAGE: 1.0, // Full damage when both attack
  ATTACK_VS_DEFEND_DAMAGE: 0.6, // Reduced damage when defender defends
  DEFEND_VS_DEFEND_DAMAGE: 0, // No damage when both defend
  ACTION_PROBABILITY_ATTACK: 0.7, // 70% chance to attack
  ACTION_PROBABILITY_DEFEND: 0.3, // 30% chance to defend

  // Strategic Energy System
  ENERGY_PER_CLICK: 2,
  DEFENSE_ENERGY_PER_CLICK: 3,
  MAX_ENERGY: 20,
  MAX_DEFENSE_ENERGY: 15,
  ENERGY_DAMAGE_MULTIPLIER: 0.15,
  DEFENSE_ENERGY_REDUCTION: 0.1,
  MAX_ENERGY_DAMAGE_BONUS: 2.0,
  ENERGY_CONSUME_PER_ATTACK: 5,
  DEFENSE_ENERGY_CONSUME: 2,

  // Action Cooldowns
  MANUAL_ACTION_COOLDOWN: 100, // 0.1 seconds between manual actions
  AUTO_ACTION_INTERVAL: 500, // 500ms for auto actions

  // Rewards and Discounts
  DISCOUNT_DURATION_HOURS: 24,
  WINNER_DISCOUNT_PERCENT: 25,
  WINNER_XP_BONUS: 100,
  LOSER_XP_BONUS: 25,

  // Combat Power Rewards/Penalties
  WINNER_CP_GAIN: 10, // Combat power gained on win
  LOSER_CP_LOSS: 5, // Combat power lost on defeat
  MIN_COMBAT_POWER: 100, // Minimum combat power (cannot go below this)

  // Battle States
  BATTLE_PREPARING_DURATION: 3000, // 3 seconds countdown
  INVITATION_TIMEOUT: 30000, // 30 seconds to accept invitation
  BATTLE_TIMEOUT: 600000, // 10 minutes max battle duration

  // Queue Processing
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // Base delay for exponential backoff
  LOCK_TIMEOUT: 5000, // 5 seconds lock timeout

  // Visual Feedback
  DAMAGE_ANIMATION_DURATION: 500,
  ENERGY_BAR_UPDATE_SPEED: 200,
  ROUND_SUMMARY_DISPLAY_TIME: 2000,
  CONFETTI_DURATION: 3000,
  CONFETTI_INTERVAL: 250,
  ACTION_INDICATOR_CLEAR_MULTIPLIER: 3, // Multiplier for DAMAGE_ANIMATION_DURATION
  ACTION_INDICATOR_CLEAR_DELAY: 300, // Delay to clear current attacker indicator

  // Polling and Refresh Intervals
  INVITATION_POLL_INTERVAL: 1000, // Poll every second for invitation acceptance
  INVITATION_REFRESH_INTERVAL: 5000, // Refresh invitations every 5 seconds
  QUEUE_REFRESH_INTERVAL: 2000, // Refresh queue status every 2 seconds
  STATS_REFRESH_INTERVAL: 30000, // Refresh battle stats every 30 seconds
  HISTORY_REFRESH_INTERVAL: 30000, // Refresh battle history every 30 seconds
  ACTIVITY_REFRESH_INTERVAL: 60000, // Refresh activity every minute
  DAILY_LIMIT_REFRESH_INTERVAL: 60000, // Refresh daily limit every minute

  // Energy System Timing
  ENERGY_RAPID_CLICK_THRESHOLD: 300, // Time in ms to detect rapid clicking
  ENERGY_RESET_THRESHOLD: 1000, // Time in ms to reset energy decay
  ENERGY_DECAY_INTERVAL: 500, // Interval for energy decay
  ENERGY_AUTO_ACTION_COOLDOWN: 500, // Cooldown for auto actions

  // Matchmaking Settings
  DEFAULT_MATCH_RANGE: 20, // 20% CP range
  CP_RANDOM_FACTOR: 50,
  SAME_OPPONENT_COOLDOWN_HOURS: 24,

  // Daily Battle Limits
  FREE_TIER_DAILY_LIMIT: 3,
  PRO_TIER_DAILY_LIMIT: 10,
  ENTERPRISE_TIER_DAILY_LIMIT: Infinity,

  // UI Positions for Action Indicators
  ACTION_INDICATOR_POSITIONS: {
    PLAYER1_LEFT: '25%',
    PLAYER2_LEFT: '75%',
    TOP: '20%',
    MIDDLE: '35%',
    BOTTOM: '50%'
  },

  // Round Summary Positions
  ROUND_SUMMARY_POSITIONS: {
    PLAYER1_LEFT: '25%',
    PLAYER2_LEFT: '75%',
    TOP: '40%'
  },

  // Battle Countdown Timing
  VS_DISPLAY_DURATION: 2000, // Duration to show VS screen
  COUNTDOWN_COMPLETE_DELAY: 500, // Delay after countdown completes

  // Time Calculation Constants
  MS_PER_HOUR: 1000 * 60 * 60,
  MS_PER_MINUTE: 1000 * 60,
  MS_PER_SECOND: 1000,

  // Matchmaking Slider Configuration
  MATCH_RANGE_MIN: 10,
  MATCH_RANGE_MAX: 50,
  MATCH_RANGE_STEP: 5,

  // Matchmaking UI Animation Durations (in ms)
  SEARCH_MESSAGE_INTERVAL: 2000, // Change message every 2 seconds
  SEARCH_ANIMATION_INCREMENT: 10, // Progress bar increment value
  SEARCH_ANIMATION_MAX: 100, // Progress bar max value

  // Matchmaking Animation Values
  ROTATE_ANIMATION_DURATION: 2, // seconds
  ROTATE_ANIMATION_DURATION_SLOW: 3, // seconds
  SCALE_ANIMATION_VALUES: [1, 1.2],
  ROTATE_ANIMATION_VALUES: [0, 10, -10, 0],
  OPACITY_ANIMATION_VALUES: [0.3, 1, 0.3],
  OPACITY_PULSE_VALUES: [0.5, 1, 0.5],
  Y_POSITION_ANIMATION_VALUES: [0, -10, 0],
  Y_POSITION_ANIMATION_DURATION: 1.5, // seconds
  Y_POSITION_ANIMATION_DELAY: 0.5, // seconds
  OPACITY_ANIMATION_DURATION: 0.5, // seconds
  ROTATE_FULL_CIRCLE: 360,
  ROTATE_REVERSE: -360,

  // Queue UI Default Values
  DEFAULT_QUEUE_POSITION: 1,
  DEFAULT_WAIT_TIME_SECONDS: 10
} as const

export const BATTLE_MESSAGES = {
  // Battle States
  PREPARING: 'PREPARING BATTLE...',
  CALCULATING: 'Calculating Results...',
  ROUND_COMPLETE: 'Round Complete!',
  BATTLE_COMPLETE: 'Battle Complete!',
  WARRIORS_ENTERING: 'Warriors entering the arena...',
  WARRIORS_ARE_ENTERING: 'Warriors are entering the arena',

  // Invitation States
  INVITATION_SENT: 'INVITATION SENT!',
  BATTLE_CHALLENGE: 'BATTLE CHALLENGE!',
  INVITATION_EXPIRED: 'INVITATION EXPIRED',
  INVITATION_EXPIRED_DESC:
    'The battle invitation has expired or is no longer valid.',
  SEARCH_NEW_OPPONENT: 'Search for a new opponent to battle!',

  // Battle UI
  BATTLE_LABEL: 'BATTLE!',
  VICTORY: 'VICTORY!',
  DEFEAT: 'DEFEAT',
  PROCESSING_RESULTS: 'Processing Results...',
  CALCULATING_REWARDS: 'Calculating rewards and updating stats',

  // Round Messages
  CALCULATING_ROUND_DAMAGE: 'CALCULATING ROUND',
  NEXT_ROUND_IN: 'Next Round In',
  FIGHT_TIMER: 'Fight Timer',
  FINAL_SECONDS: 'FINAL SECONDS!',
  ONE_MINUTE_LEFT: 'One minute left!',
  BATTLE_ENDS_TIMEOUT: 'Battle ends on timeout or 0 HP',

  // Result Messages
  WON_BY_TIMEOUT: 'WON BY TIMEOUT - HIGHER HP',
  WON_BY_KNOCKOUT: 'WON BY KNOCKOUT - OPPONENT 0 HP',
  LOST_BY_TIMEOUT: 'LOST BY TIMEOUT - LOWER HP',
  LOST_BY_KNOCKOUT: 'LOST BY KNOCKOUT - YOUR HP REACHED 0',
  CONGRATULATIONS: "Congratulations, warrior! You've conquered your opponent!",
  BETTER_LUCK: 'Better luck next time, warrior! Keep training!',

  // Action Labels
  ATTACK_ACTION: 'ATTACK!',
  DEFEND_ACTION: 'DEFEND!',
  ATTACKS: 'ATTACKS!',
  DEFENDS: 'DEFENDS!',
  MISS: 'MISS!',
  HIT: 'HIT',

  // Action Results
  CRITICAL_HIT: 'CRITICAL HIT!',
  DODGED: 'DODGED!',
  BLOCKED: 'BLOCKED!',
  DEFENDED: 'DEFENDED!',

  // Matchmaking Messages
  IN_MATCHMAKING_QUEUE: 'IN MATCHMAKING QUEUE',
  SEARCHING_FOR_OPPONENT: 'SEARCHING FOR OPPONENT',
  YOU_ARE_IN_QUEUE: 'You are in the queue, waiting for opponents...',
  FINDING_WARRIORS: 'Finding warriors within',
  LEAVE_QUEUE: 'Leave Queue',
  CANCEL_SEARCH: 'Cancel Search',
  FIND_OPPONENT: 'Find Opponent',
  SEARCHING_TEXT: 'Searching...',

  // Matchmaking Search Messages (shown in rotation)
  SEARCH_MESSAGES: [
    'Scanning the battlefield...',
    'Looking for worthy opponents...',
    'Analyzing combat powers...',
    'Matching skill levels...',
    'Finding the perfect challenge...',
    'Almost there...'
  ],

  // Queue UI Labels
  QUEUE_POSITION: 'Queue Position',
  EST_WAIT_TIME: 'Est. Wait Time',
  MATCH_RANGE: 'Match Range',
  NARROW_RANGE: 'Narrow (±10%)',
  WIDE_RANGE: 'Wide (±50%)',
  CP_RANGE_INFO: 'Opponents will have between',
  AND: 'and',
  COMBAT_POWER: 'Combat Power',

  // Player Labels
  YOU: 'YOU',
  VS: 'VS',
  SEARCHING_PLAYER: 'SEARCHING...',
  UNKNOWN_CP: '??? CP',
  CP_SUFFIX: 'CP',
  RANGE_PREFIX: '±',
  RANGE_SUFFIX: '% CP',

  // Battle Info Messages
  DAILY_LIMIT_REACHED: 'Daily battle limit reached. Resets in',
  WIN_DISCOUNT_INFO:
    'Win battles to earn 25% off platform fees for 24 hours! Higher Combat Power increases your chances of winning.',

  // Errors
  NOT_PARTICIPANT: 'You are not a participant in this battle',
  BATTLE_NOT_FOUND: 'Battle not found',
  BATTLE_ALREADY_STARTED: 'Battle has already started',
  BATTLE_ALREADY_COMPLETED: 'Battle has already been completed',
  BATTLE_TIMEOUT: 'Battle timed out',
  INVALID_ACTION: 'Invalid action',
  RATE_LIMITED: 'Too many actions, please wait'
} as const

export const BATTLE_ACTION_TYPES = {
  ATTACK: 'attack',
  DEFEND: 'defend'
} as const

export const BATTLE_STATUS = {
  PREPARING: 'preparing',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export const BATTLE_PHASES = {
  COUNTDOWN: 'countdown',
  FIGHTING: 'fighting',
  COMPLETED: 'completed'
} as const

export const BATTLE_ICONS = {
  ATTACK: '⚔️',
  DEFEND: '🛡️',
  TIMEOUT: '⏱️',
  DEATH: '💀',
  WARNING: '⚠️',
  POWER: '💪',
  ENERGY: '⚡',
  ROBOT: '🤖',
  CYCLE: '🔄',
  TIMER: '⏰',
  GAME: '🎮',
  CRITICAL: '💥',
  FIRE: '🔥',
  SHIELD_SMALL: '🛡️',
  BULB: '💡'
} as const

// UI Style Classes
export const BATTLE_STYLES = {
  // Gradient Classes
  GRADIENTS: {
    VICTORY: 'from-yellow-500 via-amber-500 to-orange-500',
    DEFEAT: 'from-red-500 via-pink-500 to-rose-500',
    ENERGY: 'from-yellow-500 to-orange-500',
    SPECIAL: 'from-yellow-500 to-orange-500',
    PURPLE_PINK: 'from-purple-500 to-pink-500',
    YELLOW_AMBER: 'from-yellow-500 to-amber-500',
    ORANGE_RED: 'from-orange-500 to-red-500',
    STATS_ATTACK: 'from-red-500 to-orange-500',
    STATS_DEFENSE: 'from-blue-500 to-purple-500'
  },
  // Color Classes
  COLORS: {
    WINNER: 'text-yellow-500',
    LOSER: 'text-gray-500',
    ATTACK: 'text-red-500',
    DEFEND: 'text-blue-500',
    CRITICAL: 'text-orange-500',
    DAMAGE: 'text-red-600',
    HEAL: 'text-green-500',
    ENERGY: 'text-yellow-500',
    INACTIVE: 'text-gray-400'
  },
  // Button States
  BUTTON_STATES: {
    ATTACK_HOVER: 'hover:border-red-500 hover:bg-red-500/20',
    DEFEND_HOVER: 'hover:border-blue-500 hover:bg-blue-500/20',
    SPECIAL_READY: 'border-yellow-500 shadow-lg shadow-yellow-500/50',
    DISABLED: 'cursor-not-allowed border-gray-300 bg-gray-100 dark:bg-gray-800'
  },
  // Badge Styles
  BADGES: {
    WINNER: 'bg-orange-500/20 text-orange-500 dark:text-orange-400',
    LOSER: 'bg-red-500/20 text-red-500 dark:text-red-400',
    ACTIVE:
      'animate-pulse bg-gradient-to-r from-orange-500 to-red-500 text-white'
  }
} as const

// Type exports for better type safety
export type BattleAction = keyof typeof BATTLE_ACTION_TYPES
export type BattleStatus = (typeof BATTLE_STATUS)[keyof typeof BATTLE_STATUS]
export type BattlePhase = (typeof BATTLE_PHASES)[keyof typeof BATTLE_PHASES]

// Helper functions for battle calculations
export const BattleCalculations = {
  /**
   * Generate random action for a player
   */
  generateRandomAction(): 'attack' | 'defend' {
    return Math.random() < BATTLE_CONFIG.ACTION_PROBABILITY_ATTACK
      ? 'attack'
      : 'defend'
  },

  /**
   * Calculate damage for simultaneous combat
   */
  calculateSimultaneousDamage(
    attackerPower: number,
    defenderPower: number,
    attackerEnergy: number,
    attackerAction: 'attack' | 'defend',
    defenderAction: 'attack' | 'defend',
    isCritical: boolean
  ): number {
    // If attacker is defending, no damage dealt
    if (attackerAction === 'defend') {
      return 0
    }

    // Base damage calculation
    const baseDamage =
      BATTLE_CONFIG.BASE_DAMAGE + Math.random() * BATTLE_CONFIG.DAMAGE_VARIANCE

    // Energy multiplier
    const rawEnergyMultiplier =
      1 + attackerEnergy * BATTLE_CONFIG.ENERGY_DAMAGE_MULTIPLIER
    const energyMultiplier = Math.min(
      rawEnergyMultiplier,
      BATTLE_CONFIG.MAX_ENERGY_DAMAGE_BONUS
    )

    // Power ratio
    const powerRatio = attackerPower / (attackerPower + defenderPower)
    const powerMultiplier = 0.5 + powerRatio

    // Action-based damage modifier
    const actionModifier =
      defenderAction === 'defend'
        ? BATTLE_CONFIG.ATTACK_VS_DEFEND_DAMAGE
        : BATTLE_CONFIG.ATTACK_VS_ATTACK_DAMAGE

    // Critical multiplier
    const critMultiplier = isCritical ? BATTLE_CONFIG.CRITICAL_MULTIPLIER : 1

    return Math.floor(
      baseDamage *
        powerMultiplier *
        energyMultiplier *
        actionModifier *
        critMultiplier
    )
  },

  /**
   * Calculate damage with all modifiers (legacy single attacker)
   */
  calculateDamage(
    attackPower: number,
    defensePower: number,
    attackerEnergy: number,
    isCritical: boolean
  ): number {
    const baseDamage =
      BATTLE_CONFIG.BASE_DAMAGE + Math.random() * BATTLE_CONFIG.DAMAGE_VARIANCE

    const rawEnergyMultiplier =
      1 + attackerEnergy * BATTLE_CONFIG.ENERGY_DAMAGE_MULTIPLIER
    const energyMultiplier = Math.min(
      rawEnergyMultiplier,
      BATTLE_CONFIG.MAX_ENERGY_DAMAGE_BONUS
    )

    const powerRatio = attackPower / (attackPower + defensePower)
    const damageMultiplier = (0.5 + powerRatio) * energyMultiplier

    const critMultiplier = isCritical ? BATTLE_CONFIG.CRITICAL_MULTIPLIER : 1

    return Math.floor(baseDamage * damageMultiplier * critMultiplier)
  },

  /**
   * Apply defense reduction to damage
   */
  applyDefense(damage: number, defenseEnergy: number): number {
    const defenseReduction =
      BATTLE_CONFIG.DEFEND_REDUCTION -
      defenseEnergy * BATTLE_CONFIG.DEFENSE_ENERGY_REDUCTION

    return Math.floor(damage * Math.max(0.1, defenseReduction))
  },

  /**
   * Check if action is critical hit
   */
  isCriticalHit(): boolean {
    return Math.random() < BATTLE_CONFIG.CRITICAL_HIT_CHANCE
  },

  /**
   * Check if attack is dodged
   */
  isDodged(defenderDefenseEnergy: number): boolean {
    const dodgeChance = Math.max(
      0,
      BATTLE_CONFIG.DODGE_CHANCE - defenderDefenseEnergy * 0.005
    )
    return Math.random() < dodgeChance
  },

  /**
   * Calculate energy consumption
   */
  consumeEnergy(
    currentEnergy: number,
    actionType: 'attack' | 'defend'
  ): number {
    if (actionType === 'attack') {
      return Math.max(
        0,
        currentEnergy - BATTLE_CONFIG.ENERGY_CONSUME_PER_ATTACK
      )
    }
    return currentEnergy
  },

  /**
   * Calculate defense energy consumption
   */
  consumeDefenseEnergy(
    currentDefenseEnergy: number,
    wasBlocked: boolean
  ): number {
    if (wasBlocked) {
      return Math.max(
        0,
        currentDefenseEnergy - BATTLE_CONFIG.DEFENSE_ENERGY_CONSUME
      )
    }
    return currentDefenseEnergy
  },

  /**
   * Get discount expiration date
   */
  getDiscountExpirationDate(): Date {
    const date = new Date()
    date.setHours(date.getHours() + BATTLE_CONFIG.DISCOUNT_DURATION_HOURS)
    return date
  },

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(attemptNumber: number): number {
    return Math.pow(2, attemptNumber) * BATTLE_CONFIG.RETRY_DELAY_BASE
  }
}

export default BATTLE_CONFIG
