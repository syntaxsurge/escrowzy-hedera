import { Suspense } from 'react'

import { Swords } from 'lucide-react'

import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import { GamifiedHeader } from '@/components/blocks/trading'
import { ModernSection, ModernGrid } from '@/components/layout/modern-layout'
import { getBattleHistoryTable } from '@/lib/db/queries/battles'
import { parseTableQueryParams } from '@/lib/table/table'
import { getUser } from '@/services/user'

import { BattleHistoryTable } from './battle-history-table'

interface BattleHistoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function BattleHistoryContent({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const user = await getUser()

  if (!user) {
    return (
      <ModernSection>
        <div className='py-12 text-center'>
          <p className='text-muted-foreground'>
            Please sign in to view your battle history.
          </p>
        </div>
      </ModernSection>
    )
  }

  const request = parseTableQueryParams(searchParams)
  const { data, pageCount, totalCount } = await getBattleHistoryTable(
    request,
    user.id
  )

  return (
    <ModernSection>
      <BattleHistoryTable
        data={data}
        pageCount={pageCount}
        totalCount={totalCount}
        userId={user.id}
      />
    </ModernSection>
  )
}

export default async function BattleHistoryPage({
  searchParams
}: BattleHistoryPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        <GamifiedHeader
          title='BATTLE HISTORY'
          subtitle='View your past battles and victories'
          icon={<Swords className='h-8 w-8 text-white' />}
        />

        <ModernGrid columns={1}>
          <Suspense fallback={<TableSkeleton />}>
            <BattleHistoryContent searchParams={resolvedSearchParams} />
          </Suspense>
        </ModernGrid>
      </div>
    </div>
  )
}
