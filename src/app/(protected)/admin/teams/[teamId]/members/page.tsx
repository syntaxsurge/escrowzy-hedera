import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { eq } from 'drizzle-orm'

import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import { ModernLayout, ModernSection } from '@/components/layout/modern-layout'
import { db } from '@/lib/db/drizzle'
import { getTeamMembersWithPagination } from '@/lib/db/queries/admin-team-members'
import { teams } from '@/lib/db/schema'
import { parseTableQueryParams } from '@/lib/table/table'

import { TeamMembersTable } from './team-members-table'

interface PageProps {
  params: Promise<{ teamId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function getTeam(teamId: string) {
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, parseInt(teamId)))
    .limit(1)

  return team[0]
}

export default async function TeamMembersPage({
  params,
  searchParams
}: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const team = await getTeam(resolvedParams.teamId)

  if (!team) {
    notFound()
  }

  const searchParamsObj = new URLSearchParams()
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      searchParamsObj.set(key, value)
    }
  })
  const tableRequest = parseTableQueryParams(searchParamsObj)
  const { data, pageCount, totalCount } = await getTeamMembersWithPagination(
    resolvedParams.teamId,
    tableRequest
  )

  return (
    <ModernLayout
      title={`Manage Team Members - ${team.name}`}
      description='Add, remove, and manage team member roles'
    >
      <ModernSection>
        <Suspense
          fallback={<TableSkeleton variant='simple' showSection={false} />}
        >
          <TeamMembersTable
            teamId={resolvedParams.teamId}
            teamName={team.name}
            data={data}
            pageCount={pageCount}
            totalCount={totalCount}
          />
        </Suspense>
      </ModernSection>
    </ModernLayout>
  )
}
