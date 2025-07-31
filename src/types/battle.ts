import type { battles } from '@/lib/db/schema'

export type Battle = typeof battles.$inferSelect
export type NewBattle = typeof battles.$inferInsert

export interface BattleResult {
  id: number
  winnerId: number | null
  loserId: number | null
  winnerCP: number
  loserCP: number
  player1CP: number
  player2CP: number
  feeDiscountPercent: number
  discountExpiresAt: Date | null
  winnerXP: number
  loserXP: number
}

export interface BattleMatchmakingParams {
  userId: number
  combatPower: number
  matchRange?: number // Percentage range for matching (default 20%)
}

export interface BattleDiscount {
  userId: number
  discountPercent: number
  expiresAt: Date
  battleId: number
}

export interface BattleHistory {
  battles: Battle[]
  totalBattles: number
  wins: number
  losses: number
  winRate: number
  currentStreak: number
  bestStreak: number
}

export interface DailyBattleLimit {
  userId: number
  battlesUsed: number
  maxBattles: number
  resetsAt: Date
}

export interface CreateBattleRequest {
  player2Id: number
}

export interface FindMatchRequest {
  matchRange?: number
}

export interface BattleStats {
  totalBattles: number
  wins: number
  losses: number
  winRate: number
  averageCP: number
  totalDiscountsEarned: number
  activeDiscount?: BattleDiscount
}
