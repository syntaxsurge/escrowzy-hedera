import { eq, inArray, ilike } from 'drizzle-orm'

import type { TableRequest, TableResponse } from '@/lib/table/table'

import { db } from '../drizzle'
import { paymentHistory, users } from '../schema'
import {
  createDateRangeFilter,
  createEnumFilter,
  executeTableQuery
} from './table-queries'

export interface PaymentHistoryWithUser {
  id: number
  teamId: number
  userId: number
  planId: string
  transactionHash: string
  chainId: number
  amount: string
  currency: string
  status: string
  createdAt: Date
  user: {
    id: number
    name: string | null
    email: string | null
    walletAddress: string
  }
}

export async function getTeamPaymentHistory(
  request: TableRequest,
  teamId: number,
  userId?: number
): Promise<TableResponse<PaymentHistoryWithUser>> {
  const searchColumns: string[] = [
    'planId',
    'transactionHash',
    'amount',
    'currency'
  ]

  const filterHandlers = {
    planId: (value: string) =>
      value ? ilike(paymentHistory.planId, `%${value}%`) : null,
    transactionHash: (value: string) =>
      value ? ilike(paymentHistory.transactionHash, `%${value}%`) : null,
    chainId: (value: string) => {
      const chainId = parseInt(value)
      return !isNaN(chainId) ? eq(paymentHistory.chainId, chainId) : null
    },
    amount: (value: string) =>
      value ? ilike(paymentHistory.amount, `%${value}%`) : null,
    currency: (value: string) =>
      value ? ilike(paymentHistory.currency, `%${value}%`) : null,
    status: createEnumFilter(paymentHistory.status, [
      'pending',
      'completed',
      'failed'
    ]),
    createdAt: createDateRangeFilter(paymentHistory.createdAt)
  }

  const baseConditions = userId
    ? [eq(paymentHistory.teamId, teamId), eq(paymentHistory.userId, userId)]
    : [eq(paymentHistory.teamId, teamId)]

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: paymentHistory,
    request,
    searchColumns,
    filterHandlers,
    baseConditions
  })

  const userIds = data.map((payment: any) => payment.userId).filter(Boolean)

  const usersData =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : []

  const usersMap = new Map(usersData.map(user => [user.id, user]))

  const enrichedData: PaymentHistoryWithUser[] = data.map((payment: any) => ({
    ...payment,
    user: usersMap.get(payment.userId) || {
      id: payment.userId,
      name: null,
      email: null,
      walletAddress: ''
    }
  }))

  return {
    data: enrichedData,
    pageCount,
    totalCount
  }
}

export async function getAdminPaymentHistory(
  request: TableRequest
): Promise<TableResponse<PaymentHistoryWithUser & { teamName?: string }>> {
  const searchColumns: string[] = [
    'planId',
    'transactionHash',
    'amount',
    'currency'
  ]

  const filterHandlers = {
    planId: (value: string) =>
      value ? ilike(paymentHistory.planId, `%${value}%`) : null,
    transactionHash: (value: string) =>
      value ? ilike(paymentHistory.transactionHash, `%${value}%`) : null,
    chainId: (value: string) => {
      const chainId = parseInt(value)
      return !isNaN(chainId) ? eq(paymentHistory.chainId, chainId) : null
    },
    amount: (value: string) =>
      value ? ilike(paymentHistory.amount, `%${value}%`) : null,
    currency: (value: string) =>
      value ? ilike(paymentHistory.currency, `%${value}%`) : null,
    status: createEnumFilter(paymentHistory.status, [
      'pending',
      'completed',
      'failed'
    ]),
    createdAt: createDateRangeFilter(paymentHistory.createdAt)
  }

  const { data, pageCount, totalCount } = await executeTableQuery({
    table: paymentHistory,
    request,
    searchColumns,
    filterHandlers,
    baseConditions: []
  })

  const userIds = data.map((payment: any) => payment.userId).filter(Boolean)

  const usersData =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : []

  const usersMap = new Map(usersData.map(user => [user.id, user]))

  const enrichedData = data.map((payment: any) => ({
    ...payment,
    user: usersMap.get(payment.userId) || {
      id: payment.userId,
      name: null,
      email: null,
      walletAddress: ''
    }
  }))

  return {
    data: enrichedData,
    pageCount,
    totalCount
  }
}
