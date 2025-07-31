import { Suspense } from 'react'

import { Crown, Users } from 'lucide-react'

import { EmailRequirementNotice } from '@/components/blocks/email-requirement-notice'
import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import { getTeamMembers } from '@/lib/db/queries/team-members'
import { parseTableQueryParams } from '@/lib/table/table'
import { checkEmailVerificationStatus } from '@/lib/utils/user'
import { getUser, getTeam } from '@/services/user'

import { TeamMembersTable } from './team-members-table'
import { InviteTeamMemberForm } from './team-settings-client'

interface TeamSettingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function TeamMembersSection({ searchParams }: TeamSettingsPageProps) {
  const [teamData, currentUser] = await Promise.all([getTeam(), getUser()])

  if (!teamData) {
    return (
      <ModernSection
        title='Team Members'
        description='View and manage your team members'
      >
        <div className='py-12 text-center'>
          <Users className='text-muted-foreground/50 mx-auto h-12 w-12' />
          <h3 className='text-foreground mt-4 text-lg font-medium'>
            No team found
          </h3>
          <p className='text-muted-foreground mt-2 text-sm'>
            You need to create or join a team first.
          </p>
        </div>
      </ModernSection>
    )
  }

  const resolvedSearchParams = await searchParams
  const request = parseTableQueryParams(resolvedSearchParams)
  const { data, pageCount, totalCount } = await getTeamMembers(
    request,
    teamData.id
  )

  const currentUserMembership = data.find(
    member => member.userId === currentUser?.id
  )
  const isCurrentUserOwner = currentUserMembership?.role === 'owner'

  return (
    <ModernSection
      title='Team Members'
      description='View and manage your team members'
    >
      <TeamMembersTable
        data={data}
        pageCount={pageCount}
        totalCount={totalCount}
        isCurrentUserOwner={isCurrentUserOwner}
        currentUserId={currentUser?.id ? String(currentUser.id) : undefined}
        teamData={teamData}
      />
    </ModernSection>
  )
}

async function InviteTeamMember() {
  const [user, teamData] = await Promise.all([getUser(), getTeam()])

  if (!teamData) return null

  const currentUserMembership = teamData.teamMembers?.find(
    member => member.userId === user?.id
  )
  const isOwner = currentUserMembership?.role === 'owner'
  const emailStatus = checkEmailVerificationStatus(user)

  return (
    <ModernSection
      title='Invite Team Member'
      description='Add new members to your team'
    >
      {!isOwner ? (
        <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/20 dark:bg-amber-900/10'>
          <div className='flex items-center space-x-3'>
            <Crown className='h-5 w-5 text-amber-600' />
            <p className='text-sm text-amber-800 dark:text-amber-400'>
              You must be a team owner to invite new members.
            </p>
          </div>
        </div>
      ) : !emailStatus.hasEmail ? (
        <EmailRequirementNotice
          title='Email Required'
          message='Please add an email address to your account before inviting team members.'
        />
      ) : !emailStatus.isVerified ? (
        <EmailRequirementNotice
          title='Email Verification Required'
          message='Please verify your email address before inviting team members. Check your inbox for the verification email.'
        />
      ) : (
        <InviteTeamMemberForm />
      )}
    </ModernSection>
  )
}

export default async function TeamSettingsPage({
  searchParams
}: TeamSettingsPageProps) {
  return (
    <ModernLayout
      title='Team Settings'
      description='Manage your team members and collaboration settings'
    >
      <ModernGrid columns={1}>
        <Suspense fallback={<TableSkeleton />}>
          <TeamMembersSection searchParams={searchParams} />
        </Suspense>
        <Suspense
          fallback={
            <ModernSection>
              <div className='animate-pulse space-y-4'>
                <div className='bg-muted h-4 w-24 rounded'></div>
                <div className='bg-muted h-10 w-full rounded'></div>
                <div className='bg-muted h-4 w-16 rounded'></div>
                <div className='bg-muted h-10 w-32 rounded'></div>
              </div>
            </ModernSection>
          }
        >
          <InviteTeamMember />
        </Suspense>
      </ModernGrid>
    </ModernLayout>
  )
}
