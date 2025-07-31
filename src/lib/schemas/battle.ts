import { z } from 'zod'

export const findMatchSchema = z.object({
  matchRange: z.number().min(5).max(50).optional()
})

export const createBattleSchema = z.object({
  player2Id: z.number().positive()
})

export const getBattleHistorySchema = z.object({
  page: z.number().positive().optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20)
})
