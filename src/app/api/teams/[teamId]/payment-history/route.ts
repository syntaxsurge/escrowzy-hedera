import { NextRequest } from 'next/server'

import { eq, desc, count, and, or, ilike, sql } from 'drizzle-orm'

import { apiResponses, withErrorHandler } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { db } from '@/lib/db/drizzle'
import { buildUserSearchCondition } from '@/lib/db/queries/users'
import { paymentHistory, users } from '@/lib/db/schema'
import { getTeamForUser } from '@/services/user'

export const GET = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ teamId: string }> }
  ) => {
    const { user, error } = await requireAuth()
    if (error) return error

    const params = await context.params
    const teamId = parseInt(params.teamId)

    // Check if user has access to this team
    const userTeam = await getTeamForUser()

    if (!userTeam || userTeam.id !== teamId) {
      return apiResponses.forbidden('Access denied')
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Search
    const globalFilter = searchParams.get('globalFilter')

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Column filters
    const statusFilter = searchParams.get('filter.status')
    const planIdFilter = searchParams.get('filter.planId')
    const chainIdFilter = searchParams.get('filter.chainId')
    const currencyFilter = searchParams.get('filter.currency')
    const amountFilter = searchParams.get('filter.amount')
    const transactionHashFilter = searchParams.get('filter.transactionHash')
    const userFilter = searchParams.get('filter.user')

    // Date filters
    const createdAtFrom = searchParams.get('filter.createdAt.from')
    const createdAtTo = searchParams.get('filter.createdAt.to')

    // Build where conditions - filter to show only current user's payments
    const whereConditions = [
      eq(paymentHistory.teamId, teamId),
      eq(paymentHistory.userId, user.id)
    ]

    if (globalFilter) {
      whereConditions.push(
        or(
          ilike(paymentHistory.planId, `%${globalFilter}%`),
          ilike(paymentHistory.transactionHash, `%${globalFilter}%`),
          ilike(paymentHistory.amount, `%${globalFilter}%`),
          ilike(paymentHistory.currency, `%${globalFilter}%`),
          ilike(paymentHistory.status, `%${globalFilter}%`),
          ilike(users.name, `%${globalFilter}%`),
          ilike(users.email, `%${globalFilter}%`)
        )!
      )
    }

    if (statusFilter) {
      whereConditions.push(eq(paymentHistory.status, statusFilter))
    }

    if (planIdFilter) {
      whereConditions.push(eq(paymentHistory.planId, planIdFilter))
    }

    if (chainIdFilter) {
      whereConditions.push(eq(paymentHistory.chainId, parseInt(chainIdFilter)))
    }

    if (currencyFilter) {
      whereConditions.push(eq(paymentHistory.currency, currencyFilter))
    }

    if (amountFilter) {
      whereConditions.push(ilike(paymentHistory.amount, `%${amountFilter}%`))
    }

    if (transactionHashFilter) {
      whereConditions.push(
        ilike(paymentHistory.transactionHash, `%${transactionHashFilter}%`)
      )
    }

    if (userFilter) {
      const searchCondition = buildUserSearchCondition(userFilter)
      if (searchCondition) {
        whereConditions.push(searchCondition)
      }
    }

    if (createdAtFrom) {
      whereConditions.push(sql`${paymentHistory.createdAt} >= ${createdAtFrom}`)
    }

    if (createdAtTo) {
      whereConditions.push(sql`${paymentHistory.createdAt} <= ${createdAtTo}`)
    }

    // Build sort order
    const getSortColumn = (sortBy: string) => {
      switch (sortBy) {
        case 'planId':
          return paymentHistory.planId
        case 'transactionHash':
          return paymentHistory.transactionHash
        case 'chainId':
          return paymentHistory.chainId
        case 'amount':
          return paymentHistory.amount
        case 'currency':
          return paymentHistory.currency
        case 'status':
          return paymentHistory.status
        case 'user':
          return users.email
        case 'createdAt':
        default:
          return paymentHistory.createdAt
      }
    }

    const sortColumn = getSortColumn(sortBy)
    const orderBy = sortOrder === 'desc' ? desc(sortColumn) : sortColumn

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined

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
          }
        })
        .from(paymentHistory)
        .leftJoin(users, eq(paymentHistory.userId, users.id))
        .where(whereClause!)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: count() })
        .from(paymentHistory)
        .leftJoin(users, eq(paymentHistory.userId, users.id))
        .where(whereClause!)
        .then(result => result[0]?.count || 0)
    ])

    return apiResponses.success({
      payments,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    })
  }
)
