import { count, eq } from 'drizzle-orm'

import { apiResponses } from '@/lib/api/server-utils'
import { withAdmin } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import {
  DatabaseQueryBuilder,
  extractQueryOptions
} from '@/lib/db/queries/query-builder'
import { paymentHistory, users, teams } from '@/lib/db/schema'

export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url)
    const options = extractQueryOptions(searchParams)

    // Define column mappings for filters and sorting
    const columnMappings = {
      planId: paymentHistory.planId,
      transactionHash: paymentHistory.transactionHash,
      chainId: paymentHistory.chainId,
      amount: paymentHistory.amount,
      currency: paymentHistory.currency,
      status: paymentHistory.status,
      user: users.email, // handled specially in query builder
      team: teams.name,
      createdAt: paymentHistory.createdAt
    }

    // Define global filter columns
    const globalFilterColumns = [
      paymentHistory.planId,
      paymentHistory.transactionHash,
      paymentHistory.amount,
      paymentHistory.currency,
      paymentHistory.status,
      users.name,
      users.email,
      teams.name
    ]

    // Build query using centralized query builder
    const queryBuilder = new DatabaseQueryBuilder(
      options,
      columnMappings,
      globalFilterColumns,
      paymentHistory.createdAt
    )

    const { whereClause, orderBy, limit, offset, page } = queryBuilder
      .withGlobalFilter()
      .withColumnFilters(searchParams)
      .withDateFilters(searchParams)
      .build()

    const [payments, totalCount] = await Promise.all([
      db
        .select({
          id: paymentHistory.id,
          planId: paymentHistory.planId,
          transactionHash: paymentHistory.transactionHash,
          chainId: paymentHistory.chainId,
          amount: paymentHistory.amount,
          currency: paymentHistory.currency,
          status: paymentHistory.status,
          createdAt: paymentHistory.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            walletAddress: users.walletAddress
          },
          team: {
            id: teams.id,
            name: teams.name
          }
        })
        .from(paymentHistory)
        .leftJoin(users, eq(paymentHistory.userId, users.id))
        .leftJoin(teams, eq(paymentHistory.teamId, teams.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: count() })
        .from(paymentHistory)
        .leftJoin(users, eq(paymentHistory.userId, users.id))
        .leftJoin(teams, eq(paymentHistory.teamId, teams.id))
        .where(whereClause)
        .then(result => result[0]?.count || 0)
    ])

    const result = DatabaseQueryBuilder.formatResult(
      payments,
      totalCount,
      page,
      limit
    )

    return apiResponses.success({
      payments: result.data,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage
    })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to fetch payment history')
  }
})
