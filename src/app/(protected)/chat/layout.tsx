import { ChatLayoutWrapper } from '@/components/chat/chat-layout-wrapper'
import {
  getDirectMessageUsersAction,
  getUnreadCountAction
} from '@/lib/actions/chat'
import { getTeamAction } from '@/lib/actions/team'
import { getCurrentUserAction } from '@/lib/actions/user'
import { checkEmailVerificationStatus } from '@/lib/utils/user'
import { getUserTrades } from '@/services/trade'

export const dynamic = 'force-dynamic'

export default async function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  let initialData = null

  try {
    const user = await getCurrentUserAction()
    const emailStatus = user
      ? checkEmailVerificationStatus(user)
      : { hasEmail: false, isVerified: false }

    if (user && emailStatus.hasEmail && emailStatus.isVerified) {
      const teamsData = await getTeamAction()
      const teams = teamsData.teams || []

      const teamsWithUnread = await Promise.all(
        teams.map(async team => {
          const contextId = `team_${team.id}`
          const unreadCount = await getUnreadCountAction('team', contextId)
          return {
            ...team,
            unreadCount
          }
        })
      )

      const directMessageUsers = await getDirectMessageUsersAction()

      const usersWithUnread = await Promise.all(
        directMessageUsers.map(async dmUser => {
          const userIdNum = Number(user.id)
          const dmUserIdNum = Number(dmUser.id)
          const sortedIds = [userIdNum, dmUserIdNum].sort((a, b) => a - b)
          const contextId = `dm_${sortedIds[0]}_${sortedIds[1]}`
          const unreadCount = await getUnreadCountAction('direct', contextId)
          return { ...dmUser, unreadCount }
        })
      )

      // Fetch user's active trades
      const tradesResult = await getUserTrades(user.id, {
        userId: user.id,
        status: [
          'created',
          'awaiting_deposit',
          'funded',
          'payment_sent',
          'delivered'
        ],
        role: 'both',
        page: 1,
        limit: 50
      })

      const tradesWithUnread = await Promise.all(
        (tradesResult.trades || []).map(async trade => {
          const contextId = `trade_${trade.id}`
          const unreadCount = await getUnreadCountAction('trade', contextId)
          const otherParty =
            trade.buyerId === user.id ? trade.seller : trade.buyer
          return {
            id: trade.id,
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: trade.currency,
            status: trade.status,
            createdAt: trade.createdAt,
            otherParty,
            unreadCount
          }
        })
      )

      initialData = {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified
        },
        teams: teamsWithUnread,
        directMessageUsers: usersWithUnread,
        trades: tradesWithUnread,
        emailStatus
      }
    } else {
      initialData = {
        user: user
          ? {
              id: user.id,
              email: user.email,
              emailVerified: user.emailVerified
            }
          : null,
        teams: [],
        directMessageUsers: [],
        trades: [],
        emailStatus
      }
    }
  } catch (error) {
    console.error('Chat layout error:', error)
  }

  return (
    <ChatLayoutWrapper initialData={initialData}>{children}</ChatLayoutWrapper>
  )
}
