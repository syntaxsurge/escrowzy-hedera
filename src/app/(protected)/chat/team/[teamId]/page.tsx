import { redirect } from 'next/navigation'

import { eq, and } from 'drizzle-orm'

import { UnifiedChatLayout } from '@/components/chat/unified-chat-layout'
import { appRoutes } from '@/config/app-routes'
import { getMessagesAction } from '@/lib/actions/chat'
import { getCurrentUserAction } from '@/lib/actions/user'
import { db } from '@/lib/db/drizzle'
import { teams, teamMembers } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

interface TeamChatPageProps {
  params: Promise<{
    teamId: string
  }>
}

export default async function TeamChatPage({ params }: TeamChatPageProps) {
  const user = await getCurrentUserAction()
  if (!user) {
    redirect(appRoutes.signIn)
  }

  const { teamId: teamIdParam } = await params
  const teamId = parseInt(teamIdParam)
  const contextId = `team_${teamId}`

  // Check membership and get team info
  const teamData = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      isMember: teamMembers.userId
    })
    .from(teams)
    .leftJoin(
      teamMembers,
      and(eq(teamMembers.teamId, teams.id), eq(teamMembers.userId, user.id))
    )
    .where(eq(teams.id, teamId))
    .limit(1)

  if (!teamData.length || !teamData[0].isMember) {
    redirect(appRoutes.chat.base)
  }

  const result = await getMessagesAction('team', contextId, { limit: 30 })

  return (
    <UnifiedChatLayout
      contextType='team'
      contextId={contextId}
      initialMessages={result.messages}
      currentUserId={user.id}
      currentUser={{
        id: user.id,
        name: user.name,
        walletAddress: user.walletAddress,
        email: user.email,
        avatarPath: user.avatarPath
      }}
      displayName={teamData[0].teamName}
      teamName={teamData[0].teamName}
    />
  )
}
