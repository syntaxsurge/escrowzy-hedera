import Link from 'next/link'
import { Suspense } from 'react'

import { Crown, CreditCard } from 'lucide-react'

import { TableSkeleton } from '@/components/blocks/table/table-skeleton'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'
import {
  getPlanDisplayName,
  formatTeamPlanName
} from '@/lib/utils/subscription'
import { getCombinedSubscriptionInfo } from '@/services/subscription'
import { getUser, getTeam } from '@/services/user'

import { PaymentHistoryTable } from './payment-history-table'

interface SubscriptionPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function SubscriptionPlans() {
  const [teamData, user] = await Promise.all([getTeam(), getUser()])

  if (!teamData || !user) return null

  const combinedSubscriptionInfo = await getCombinedSubscriptionInfo(
    teamData.id,
    user.id
  )

  const teamPlanName = formatTeamPlanName(
    combinedSubscriptionInfo?.teamSubscription?.planName || 'Free'
  )
  const personalPlanName = getPlanDisplayName(
    combinedSubscriptionInfo?.personalSubscription?.planName || 'Free'
  )

  const isTeamPlanActive = combinedSubscriptionInfo?.teamSubscription?.isActive
  const isPersonalPlanActive =
    combinedSubscriptionInfo?.personalSubscription?.isActive

  const teamExpiresAt = combinedSubscriptionInfo?.teamSubscription?.expiresAt
  const personalExpiresAt =
    combinedSubscriptionInfo?.personalSubscription?.expiresAt

  // Check if plans are free - free plans should not show expiration dates
  const isTeamPlanFree =
    (
      combinedSubscriptionInfo?.teamSubscription?.planName || 'free'
    ).toLowerCase() === 'free'
  const isPersonalPlanFree =
    (
      combinedSubscriptionInfo?.personalSubscription?.planName || 'free'
    ).toLowerCase() === 'free'

  return (
    <>
      <ModernSection
        title='Team Plan'
        description='Manage your team subscription and billing'
        variant='gradient'
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg'>
              <Crown className='h-6 w-6' />
            </div>
            <div>
              <p className='text-foreground text-lg font-semibold'>
                {teamPlanName} Plan
              </p>
              <p className='text-muted-foreground text-sm'>
                {isTeamPlanActive && !isTeamPlanFree
                  ? teamExpiresAt && new Date(teamExpiresAt) > new Date()
                    ? `Active subscription • Expires ${new Date(teamExpiresAt).toLocaleDateString()}`
                    : 'Active subscription'
                  : isTeamPlanFree
                    ? 'Free plan - Upgrade to unlock team features'
                    : 'Expired - Renew to restore access'}
              </p>
              {combinedSubscriptionInfo?.teamSubscription?.isTeamPlan && (
                <p className='text-muted-foreground mt-1 text-xs'>
                  {combinedSubscriptionInfo.teamSubscription.isOwner
                    ? '✓ You are the plan purchaser'
                    : '✓ Via team membership'}
                </p>
              )}
            </div>
          </div>
          <div className='flex gap-3'>
            <Link href={appRoutes.pricing}>
              <Button className='bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md transition-all duration-200 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg'>
                {isTeamPlanActive && !isTeamPlanFree
                  ? 'Manage Plan'
                  : 'Upgrade Team'}
              </Button>
            </Link>
          </div>
        </div>
      </ModernSection>

      <ModernSection
        title='Personal Plan'
        description='Manage your personal subscription'
        variant='gradient'
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'>
              <CreditCard className='h-6 w-6' />
            </div>
            <div>
              <p className='text-foreground text-lg font-semibold'>
                {personalPlanName} Plan
              </p>
              <p className='text-muted-foreground text-sm'>
                {isPersonalPlanActive && !isPersonalPlanFree
                  ? personalExpiresAt &&
                    new Date(personalExpiresAt) > new Date()
                    ? `Active subscription • Expires ${new Date(personalExpiresAt).toLocaleDateString()}`
                    : 'Active subscription'
                  : isPersonalPlanFree
                    ? 'Free plan - Upgrade for personal features'
                    : 'Expired - Renew to restore access'}
              </p>
            </div>
          </div>
          <div className='flex gap-3'>
            <Link href={appRoutes.pricing}>
              <Button className='bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:shadow-lg'>
                {isPersonalPlanActive && !isPersonalPlanFree
                  ? 'Manage Plan'
                  : 'Upgrade Personal'}
              </Button>
            </Link>
          </div>
        </div>
      </ModernSection>
    </>
  )
}

async function PaymentHistorySection({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const teamData = await getTeam()
  if (!teamData) return null
  return (
    <PaymentHistoryTable teamId={teamData.id} searchParams={searchParams} />
  )
}

function SubscriptionSkeleton() {
  return (
    <ModernSection variant='gradient'>
      <div className='flex animate-pulse items-center space-x-4'>
        <div className='bg-muted h-12 w-12 rounded-xl'></div>
        <div className='space-y-2'>
          <div className='bg-muted h-4 w-32 rounded'></div>
          <div className='bg-muted h-3 w-24 rounded'></div>
        </div>
      </div>
    </ModernSection>
  )
}

export default async function SubscriptionPage({
  searchParams
}: SubscriptionPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <ModernLayout
      title='Subscription & Billing'
      description='Manage your subscription plans and view payment history'
    >
      <ModernGrid columns={1}>
        <Suspense fallback={<SubscriptionSkeleton />}>
          <SubscriptionPlans />
        </Suspense>
      </ModernGrid>

      <ModernSection
        title='Payment History'
        description='View your subscription payment transactions'
      >
        <Suspense fallback={<TableSkeleton />}>
          <PaymentHistorySection searchParams={resolvedSearchParams} />
        </Suspense>
      </ModernSection>
    </ModernLayout>
  )
}
