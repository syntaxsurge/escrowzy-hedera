import { Suspense } from 'react'

import { EmailRequirementNotice } from '@/components/blocks/email-requirement-notice'
import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import { getTeamInvitations } from '@/lib/db/queries/team-invitations'
import { parseTableQueryParams } from '@/lib/table/table'
import { checkEmailVerificationStatus } from '@/lib/utils/user'
import { getUser } from '@/services/user'

import { InvitationsTable } from './invitations-table'

interface InvitationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function InvitationsContent({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const user = await getUser()
  const emailStatus = checkEmailVerificationStatus(user)

  if (!emailStatus.hasEmail) {
    return (
      <ModernSection>
        <EmailRequirementNotice
          title='Email Required'
          message='Please add an email address to your account to receive team invitations.'
        />
      </ModernSection>
    )
  }

  if (!emailStatus.isVerified) {
    return (
      <ModernSection>
        <EmailRequirementNotice
          title='Email Verification Required'
          message='Please verify your email address to view and accept team invitations. Check your inbox for the verification email.'
        />
      </ModernSection>
    )
  }

  const request = parseTableQueryParams(searchParams)
  const { data, pageCount, totalCount } = await getTeamInvitations(
    request,
    user!.email
  )

  return (
    <ModernSection>
      <InvitationsTable
        data={data}
        pageCount={pageCount}
        totalCount={totalCount}
      />
    </ModernSection>
  )
}

export default async function InvitationsPage({
  searchParams
}: InvitationsPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <ModernLayout
      title='Team Invitations'
      description='View and manage your team invitations'
    >
      <ModernGrid columns={1}>
        <Suspense fallback={<TableSkeleton />}>
          <InvitationsContent searchParams={resolvedSearchParams} />
        </Suspense>
      </ModernGrid>
    </ModernLayout>
  )
}
