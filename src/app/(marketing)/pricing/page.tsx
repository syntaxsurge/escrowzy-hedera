'use client'

import { useState, useMemo, useEffect } from 'react'

import {
  Check,
  AlertTriangle,
  CreditCard,
  Zap,
  Shield,
  Database,
  Info,
  Users,
  PartyPopper,
  CheckCircle2,
  User,
  TrendingUp,
  Hash,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

import { refreshDashboardData } from '@/app/actions'
import { CryptoPaymentModal } from '@/components/blocks/blockchain/crypto-payment-modal'
import { LoadingWrapper } from '@/components/blocks/loading-wrapper'
import { ModalDialog } from '@/components/blocks/modal-utils'
import {
  CurrentPlanButton,
  PricingButton,
  ReactivatePlanButton,
  SelectPlanButton,
  UpgradeDowngradeButton
} from '@/components/blocks/pricing-button'
import {
  showSuccessToast,
  showErrorToast
} from '@/components/blocks/toast-manager'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Spinner } from '@/components/ui/spinner'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import {
  useUnifiedWalletInfo,
  useUnifiedChainInfo,
  useNetwork
} from '@/context'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useLoading } from '@/hooks/use-loading'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'
import { swrConfig, swrFetcher } from '@/lib/api/swr'
import type { SupportedChainIds } from '@/lib/blockchain'
import {
  DEFAULT_CHAIN_ID,
  isSupportedChainId,
  buildTxUrl,
  SUPPORTED_NETWORKS
} from '@/lib/blockchain'
import { formatPrice, formatPriceWithCurrency } from '@/lib/blockchain/payment'
import {
  canUpgradeToPlan,
  formatTeamMemberLimit
} from '@/lib/utils/subscription'
import { type PaymentIntent } from '@/types/payment'

// Extended type for contract plans that includes blockchain data
type ContractPlan = {
  id: string
  planKey: number
  name: string
  displayName: string
  description: string
  price: number
  priceWei?: string
  priceUSD?: number
  priceNative?: number
  nativeCurrencySymbol?: string
  isTeamPlan?: boolean
  features: string[]
  maxMembers: number | string
  isActive: boolean
  sortOrder: string | number
}

export default function PricingPage() {
  const paymentModal = useDialogState<PaymentIntent>()
  const downgradeDialog = useDialogState()
  const downgradeRestrictionDialog = useDialogState()
  const teamDowngradeDialog = useDialogState()
  const individualPaidDowngradeDialog = useDialogState()
  const teamPaidDowngradeDialog = useDialogState()
  const welcomeFreeDialog = useDialogState<{
    isTeamPlan: boolean
    planName: string
  }>()
  const welcomeDialog = useDialogState<{
    plan: ContractPlan
    isTeamPlan: boolean
    transactionHash?: string
  }>()

  const [isDowngrading, setIsDowngrading] = useState(false)
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<{
    planId: string
    isTeamPlan: boolean
  } | null>(null)
  const { chainId } = useUnifiedChainInfo()
  const { isConnected } = useUnifiedWalletInfo()
  const { selectedChainId } = useNetwork()

  // Use SWR directly with apiEndpoints
  const {
    data: teamData,
    isLoading: teamLoading,
    mutate
  } = useSWR(apiEndpoints.team, swrFetcher, swrConfig)

  // Fetch current user profile
  const { data: currentUser } = useSWR(
    apiEndpoints.user.profile,
    swrFetcher,
    swrConfig
  )

  // Fetch user's personal subscription
  const {
    data: personalSubscriptionResponse,
    mutate: mutatePersonalSubscription
  } = useSWR(apiEndpoints.user.subscription, swrFetcher, swrConfig)

  // Extract the actual subscription data from the response
  // The API returns {subscription: {...}, userId: number}
  const personalSubscriptionData = personalSubscriptionResponse?.subscription

  // Fetch payment history to determine subscription status
  const {
    data: paymentHistory,
    isLoading: paymentLoading,
    mutate: mutatePaymentHistory
  } = useSWR(
    teamData?.id
      ? apiEndpoints.teams.paymentHistory(String(teamData.id))
      : null,
    swrFetcher,
    swrConfig
  )

  // Fetch plans from the selected network (prioritize user selection over wallet chain)
  const effectiveChainId = useMemo(() => {
    // Always use selectedChainId if available, regardless of connection status
    if (selectedChainId && isSupportedChainId(selectedChainId)) {
      return selectedChainId
    }
    // Fallback to wallet chain if connected
    if (isConnected && chainId && isSupportedChainId(chainId)) {
      return chainId
    }
    return DEFAULT_CHAIN_ID
  }, [selectedChainId, isConnected, chainId])

  // Use a stable key that doesn't change during chain switching
  // Only update when the user explicitly selects a network, not during auto-switching
  const [stableChainId, setStableChainId] = useState(effectiveChainId)

  useEffect(() => {
    // Only update stableChainId when selectedChainId changes (user action)
    // Ignore changes from wallet chain switching
    if (selectedChainId && isSupportedChainId(selectedChainId)) {
      setStableChainId(selectedChainId)
    }
  }, [selectedChainId])

  const {
    data: plansData,
    error: plansError,
    isLoading: plansLoading
  } = useSWR(
    `${apiEndpoints.contractPlans}?chainId=${stableChainId}`,
    swrFetcher,
    swrConfig
  )

  // Check for configuration error first - this should be checked before processing plans
  const hasConfigurationError = plansData?.type === 'configuration_error'

  const plans: ContractPlan[] = useMemo(() => {
    // If there's a configuration error, return empty array
    if (hasConfigurationError) {
      return []
    }

    // The API returns an object with plans property
    if (!plansData || !plansData.plans || !Array.isArray(plansData.plans)) {
      return []
    }

    const allPlans = plansData.plans.map((plan: any) => ({
      ...plan,
      id: plan.planKey.toString(),
      price: plan.priceUSD || 0,
      // Extract the feature text from feature objects
      features: plan.features
        .map((f: any) => (typeof f === 'string' ? f : f.feature || ''))
        .filter((f: string) => f.trim() !== '')
    }))

    // Filter only active plans and sort by sortOrder
    return allPlans
      .filter((plan: ContractPlan) => plan.isActive)
      .sort((a: ContractPlan, b: ContractPlan) => {
        const orderA =
          typeof a.sortOrder === 'string' ? parseInt(a.sortOrder) : a.sortOrder
        const orderB =
          typeof b.sortOrder === 'string' ? parseInt(b.sortOrder) : b.sortOrder
        return orderA - orderB
      })
  }, [plansData, hasConfigurationError])

  // Get current individual plan from personal subscription
  const currentIndividualPlan = personalSubscriptionData?.planId || 'free'

  // Get current team plan
  // Check both isTeamPlan flag and if planId contains 'team'
  const currentTeamPlan =
    teamData?.isTeamPlan || teamData?.planId?.toLowerCase().includes('team')
      ? teamData?.planId
      : null

  // Determine if subscriptions are active based on payment history
  const payments = Array.isArray(paymentHistory)
    ? paymentHistory
    : paymentHistory?.payments || []
  const activePayments = payments.filter((p: any) => p.status !== 'superseded')

  // Check if team subscription is active
  const isTeamSubscriptionActive = useMemo(() => {
    if (!currentTeamPlan || currentTeamPlan === 'free') {
      return true
    }

    // Check if user has active team subscription through team membership
    // Use the same logic as currentTeamPlan determination: check both isTeamPlan flag and if planId contains 'team'
    const hasTeamPlan =
      teamData?.isTeamPlan || teamData?.planId?.toLowerCase().includes('team')
    if (hasTeamPlan && teamData?.subscriptionExpiresAt) {
      const expiresAt = new Date(teamData.subscriptionExpiresAt)
      const now = new Date()

      // Compare timestamps to avoid timezone issues
      const expiresAtTime = expiresAt.getTime()
      const nowTime = now.getTime()
      const isActive = expiresAtTime > nowTime

      if (isActive) {
        return true
      }
    }

    // Get the latest non-superseded payment for the current team plan
    const latestTeamPayment = activePayments.find(
      (p: any) => p.status === 'confirmed' && p.planId === currentTeamPlan
    )

    if (!latestTeamPayment) return false

    // Check if the payment is still within its validity period
    const planDuration = currentTeamPlan.includes('monthly') ? 30 : 365
    const expirationDate = new Date(latestTeamPayment.createdAt)
    expirationDate.setDate(expirationDate.getDate() + planDuration)

    return expirationDate > new Date()
  }, [currentTeamPlan, activePayments, teamData])

  // Check if individual subscription is active
  const isIndividualSubscriptionActive = useMemo(() => {
    if (!currentIndividualPlan || currentIndividualPlan === 'free') {
      return true
    }

    // Check expiration date if it exists
    if (personalSubscriptionData?.subscriptionExpiresAt) {
      const expiresAt = new Date(personalSubscriptionData.subscriptionExpiresAt)
      const now = new Date()

      // Compare timestamps to avoid timezone issues
      const expiresAtTime = expiresAt.getTime()
      const nowTime = now.getTime()
      const isActive = expiresAtTime > nowTime

      return isActive
    }

    // If no expiration date but has isActive flag, use that
    return personalSubscriptionData?.isActive || false
  }, [currentIndividualPlan, personalSubscriptionData])

  const handleUpgrade = async (planId: string, isTeamPlan: boolean = false) => {
    if (!teamData) return

    try {
      // Handle free plan downgrade with confirmation dialog
      if (planId.toLowerCase() === 'free') {
        if (isTeamPlan) {
          // Team plan downgrade - check if user is the plan purchaser
          // Check if user is the team owner based on teamData
          // Check if user is the team owner
          if (teamData?.teamOwnerId !== currentUser?.id) {
            // Show restriction dialog for non-purchasers
            downgradeRestrictionDialog.open()
            return
          }
          teamDowngradeDialog.open()
        } else {
          // Individual plan downgrade
          downgradeDialog.open()
        }
        return
      }

      // Check if this is a downgrade for paid plans
      const currentPlan = isTeamPlan ? currentTeamPlan : currentIndividualPlan
      const isDowngrade = currentPlan && !canUpgradeToPlan(currentPlan, planId)

      if (isDowngrade) {
        // Store the pending plan details
        setPendingDowngradePlan({ planId, isTeamPlan })

        // Show appropriate downgrade dialog
        if (isTeamPlan) {
          // Check if user is the plan purchaser for team downgrades
          // Check if user is the team owner based on teamData
          // Check if user is the team owner
          if (teamData?.teamOwnerId !== currentUser?.id) {
            // Show restriction dialog for non-purchasers
            downgradeRestrictionDialog.open()
            return
          }
          teamPaidDowngradeDialog.open()
        } else {
          individualPaidDowngradeDialog.open()
        }
        return
      }

      // Proceed with upgrade/payment using the currently selected network
      const intentResponse = await api.post(apiEndpoints.payments.intent, {
        teamId: teamData.id,
        userId: currentUser?.id || 0,
        planId,
        networkId: stableChainId
      })
      if (!intentResponse.success) {
        throw new Error(
          intentResponse.error || 'Failed to create payment intent'
        )
      }
      const intent = intentResponse.data.paymentIntent
      paymentModal.setData(intent)
      paymentModal.open()
    } catch (error) {
      console.error('Failed to create payment intent:', error)
    }
  }

  const handleDowngradeConfirm = async () => {
    if (!teamData) return

    setIsDowngrading(true)

    // Show processing toast
    const toastId = toast.loading('Processing downgrade to free plan...', {
      description: 'Please wait while we update your subscription'
    })

    try {
      const response = await api.post(
        apiEndpoints.teams.downgrade(String(teamData.id))
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to downgrade to free plan')
      }

      // Refresh all data to show updated plan
      await Promise.all([
        mutate(),
        mutatePaymentHistory(),
        mutatePersonalSubscription()
      ])

      // Refresh server-side data
      await refreshDashboardData()

      // Close dialog
      downgradeDialog.close()

      // Dismiss loading toast and show success
      toast.dismiss(toastId)
      showSuccessToast(
        'Successfully downgraded to free plan',
        'Your individual subscription has been changed to the free plan'
      )

      // Show welcome to free plan dialog
      setTimeout(() => {
        welcomeFreeDialog.setData({
          isTeamPlan: false,
          planName: 'Free'
        })
        welcomeFreeDialog.open()
      }, 500)
    } catch (error: any) {
      console.error('Failed to downgrade:', error)

      // Dismiss loading toast
      toast.dismiss(toastId)

      // Check if it's a permission error
      if (
        error.message?.includes('Only the person who purchased the team plan')
      ) {
        downgradeDialog.close()
        downgradeRestrictionDialog.open()
      } else {
        showErrorToast(
          'Failed to downgrade to free plan',
          'Please try again or contact support if the issue persists'
        )
      }
    } finally {
      setIsDowngrading(false)
    }
  }

  const handleTeamDowngradeConfirm = async () => {
    if (!teamData) return

    setIsDowngrading(true)

    // Show processing toast
    const toastId = toast.loading('Processing team plan downgrade...', {
      description: 'Please wait while we update your team subscription'
    })

    try {
      const response = await api.post(
        apiEndpoints.teams.downgradeTeamPlan(String(teamData.id))
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to downgrade team plan')
      }

      // Refresh all data to show updated plan
      await Promise.all([
        mutate(),
        mutatePaymentHistory(),
        mutatePersonalSubscription()
      ])

      // Refresh server-side data
      await refreshDashboardData()

      // Close dialog
      teamDowngradeDialog.close()

      // Dismiss loading toast and show success
      toast.dismiss(toastId)
      showSuccessToast(
        'Successfully downgraded team plan to free',
        'Your team subscription has been changed to the free plan'
      )

      // Show welcome to free plan dialog
      setTimeout(() => {
        welcomeFreeDialog.setData({
          isTeamPlan: true,
          planName: 'Free'
        })
        welcomeFreeDialog.open()
      }, 500)
    } catch (error: any) {
      console.error('Failed to downgrade team plan:', error)

      // Dismiss loading toast
      toast.dismiss(toastId)

      // Check if it's a permission error
      if (
        error.message?.includes('Only the person who purchased the team plan')
      ) {
        teamDowngradeDialog.close()
        downgradeRestrictionDialog.open()
      } else {
        showErrorToast(
          'Failed to downgrade team plan',
          'Please try again or contact support if the issue persists'
        )
      }
    } finally {
      setIsDowngrading(false)
    }
  }

  const handlePaidDowngradeConfirm = async () => {
    if (!pendingDowngradePlan || !teamData) return

    // Close the dialog immediately
    individualPaidDowngradeDialog.close()
    teamPaidDowngradeDialog.close()

    // Proceed with the payment process for downgrade using the currently selected network
    try {
      const intentResponse = await api.post(apiEndpoints.payments.intent, {
        teamId: teamData.id,
        userId: currentUser?.id || 0,
        planId: pendingDowngradePlan.planId,
        networkId: stableChainId
      })
      if (!intentResponse.success) {
        throw new Error(
          intentResponse.error || 'Failed to create payment intent'
        )
      }
      const intent = intentResponse.data.paymentIntent
      paymentModal.setData(intent)
      paymentModal.open()
      setPendingDowngradePlan(null)
    } catch (error) {
      console.error('Failed to create payment intent:', error)
      setPendingDowngradePlan(null)
      showErrorToast('Failed to create payment intent', 'Please try again')
    }
  }

  return (
    <>
      <ModernLayout
        title='Choose Your Plan'
        description='Pay with native cryptocurrency for instant activation'
        addPadding={true}
        centerText={true}
      >
        {teamLoading ? (
          <LoadingWrapper
            isLoading={true}
            size='lg'
            className='mx-auto max-w-2xl'
          >
            <></>
          </LoadingWrapper>
        ) : plansLoading ? (
          <LoadingWrapper
            isLoading={true}
            size='lg'
            className='mx-auto max-w-2xl'
          >
            <></>
          </LoadingWrapper>
        ) : hasConfigurationError || plans.length === 0 ? (
          <div className='mx-auto max-w-2xl text-center'>
            {hasConfigurationError ? (
              <div className='rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20'>
                <h3 className='mb-2 text-lg font-medium text-amber-800 dark:text-amber-200'>
                  Contract Not Deployed
                </h3>
                <p className='text-amber-700 dark:text-amber-300'>
                  The subscription contract is not yet deployed on{' '}
                  {isSupportedChainId(stableChainId)
                    ? SUPPORTED_NETWORKS[stableChainId as SupportedChainIds]
                        ?.name
                    : 'this network'}
                  .
                </p>
                <p className='mt-3 text-sm text-amber-600 dark:text-amber-400'>
                  Please switch to a different network using the network
                  selector in the header.
                </p>
              </div>
            ) : plansError ? (
              <div className='rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/20'>
                <h3 className='mb-2 text-lg font-medium text-red-800 dark:text-red-200'>
                  Price Loading Error
                </h3>
                <p className='text-red-700 dark:text-red-300'>
                  Unable to load current pricing. This may be due to network
                  connectivity issues or temporary API unavailability. Please
                  try refreshing the page.
                </p>
                <p className='mt-2 text-sm text-red-600 dark:text-red-400'>
                  Error: {plansError.message || 'Failed to fetch pricing data'}
                </p>
              </div>
            ) : (
              <div className='rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20'>
                <p className='text-amber-800 dark:text-amber-200'>
                  Loading pricing plans... If this message persists, please
                  check your network connection.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Individual Plans */}
            <div className='mb-12'>
              <h2 className='mb-6 text-center text-2xl font-bold'>
                Individual Plans
              </h2>
              <p className='text-muted-foreground mb-6 text-center'>
                Choose the perfect plan for your personal needs with instant
                cryptocurrency payment
              </p>
              <div className='mx-auto grid max-w-6xl gap-8 md:grid-cols-3'>
                {plans
                  .filter(plan => !plan.isTeamPlan)
                  .map(plan => (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      currentPlan={currentIndividualPlan}
                      isSubscriptionActive={isIndividualSubscriptionActive}
                      onUpgrade={planId => handleUpgrade(planId, false)}
                      isAuthenticated={!!teamData}
                      isConnected={isConnected}
                      isLoading={
                        teamLoading || Boolean(teamData && paymentLoading)
                      }
                      isTeamPlan={false}
                      subscriptionExpiresAt={
                        personalSubscriptionData?.subscriptionExpiresAt
                      }
                    />
                  ))}
              </div>
            </div>

            {/* Team Plans */}
            {plans.filter(plan => plan.isTeamPlan).length > 0 && (
              <div>
                <h2 className='mb-6 text-center text-2xl font-bold'>
                  Team Plans
                </h2>
                <p className='text-muted-foreground mb-6 text-center'>
                  Team plans provide access to all team members when purchased
                  by the team owner
                </p>
                <div className='mx-auto grid max-w-4xl gap-8 md:grid-cols-2'>
                  {plans
                    .filter(plan => plan.isTeamPlan)
                    .map(plan => (
                      <PricingCard
                        key={plan.id}
                        plan={plan}
                        currentPlan={currentTeamPlan || ''}
                        isSubscriptionActive={isTeamSubscriptionActive}
                        onUpgrade={planId => handleUpgrade(planId, true)}
                        isAuthenticated={!!teamData}
                        isConnected={isConnected}
                        isLoading={
                          teamLoading || Boolean(teamData && paymentLoading)
                        }
                        isTeamPlan={true}
                        subscriptionExpiresAt={teamData?.subscriptionExpiresAt}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </ModernLayout>

      <CryptoPaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => {
          paymentModal.close()
          // Refresh data after modal is closed
          setTimeout(async () => {
            await Promise.all([
              mutate(),
              mutatePaymentHistory(),
              mutatePersonalSubscription()
            ])
          }, 100)
        }}
        paymentIntent={paymentModal.data}
        onPaymentSuccess={async (transactionHash, verificationData) => {
          // Immediately refresh data on payment success
          await Promise.all([
            mutate(),
            mutatePaymentHistory(),
            mutatePersonalSubscription()
          ])

          // Refresh server-side data
          await refreshDashboardData()

          // Find the plan details and prepare welcome dialog before closing payment modal
          if (paymentModal.data) {
            // Try to find by plan.id or plan.name
            const purchasedPlan = plans.find(
              p =>
                p.id === paymentModal.data?.plan.id ||
                p.name.toLowerCase() ===
                  paymentModal.data?.plan.name.toLowerCase() ||
                p.planKey.toString() === paymentModal.data?.plan.id
            )

            if (purchasedPlan) {
              // Set the data first
              welcomeDialog.setData({
                plan: purchasedPlan,
                isTeamPlan: verificationData?.isTeamPlan || false,
                transactionHash
              })

              // Close payment modal first, then open welcome dialog
              paymentModal.close()

              // Open welcome dialog after payment modal has fully closed
              setTimeout(() => {
                welcomeDialog.open()
              }, 750)
            } else {
              // Fallback: Create a basic plan object from payment data
              const fallbackPlan: ContractPlan = {
                id: paymentModal.data.plan.id,
                planKey: parseInt(paymentModal.data.plan.id) || 0,
                name: paymentModal.data.plan.name,
                displayName: paymentModal.data.plan.name,
                description: '',
                price:
                  typeof paymentModal.data.plan.price === 'string'
                    ? parseFloat(paymentModal.data.plan.price)
                    : paymentModal.data.plan.price || 0,
                features: paymentModal.data.plan.features || [],
                maxMembers: paymentModal.data.plan.maxMembers || 1,
                isActive: true,
                sortOrder: 0,
                isTeamPlan: verificationData?.isTeamPlan || false
              }

              // Set the data first
              welcomeDialog.setData({
                plan: fallbackPlan,
                isTeamPlan: verificationData?.isTeamPlan || false,
                transactionHash
              })

              // Close payment modal first, then open welcome dialog
              paymentModal.close()

              // Open welcome dialog after payment modal has fully closed
              setTimeout(() => {
                welcomeDialog.open()
              }, 750)
            }
          } else {
            // No payment data, just close the modal
            paymentModal.close()
          }
        }}
      />

      <ModalDialog
        open={downgradeDialog.isOpen}
        onOpenChange={open =>
          open ? downgradeDialog.open() : downgradeDialog.close()
        }
        title={
          <span className='flex items-center gap-2 text-amber-600'>
            <AlertTriangle className='h-5 w-5' />
            Downgrade Individual Plan to Free
          </span>
        }
        description='You are about to downgrade your individual plan to free. This will not affect your team subscription.'
        content={
          <div className='space-y-4'>
            <div className='space-y-3'>
              <h4 className='text-foreground font-medium'>
                You will lose access to the following individual plan features:
              </h4>
              <div className='grid gap-2'>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Zap className='h-4 w-4' />
                  Priority support for individual issues
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Shield className='h-4 w-4' />
                  Advanced individual security features
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Database className='h-4 w-4' />
                  Extended personal data retention
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <CreditCard className='h-4 w-4' />
                  Premium individual integrations
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/20 dark:bg-blue-900/10'>
              <p className='text-xs text-blue-700 dark:text-blue-300'>
                <strong>Note:</strong> Your team plan subscription (if any) will
                remain active and unaffected by this change. Individual and team
                plans are managed separately.
              </p>
            </div>

            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10'>
              <p className='text-xs text-amber-700 dark:text-amber-300'>
                <strong>Important:</strong> To regain access to premium
                individual features after downgrading, you will need to pay for
                the plan again. This downgrade takes effect immediately and
                cannot be undone without repurchasing.
              </p>
            </div>
          </div>
        }
        confirmationInput={{
          label: 'Type "DOWNGRADE" to confirm:',
          placeholder: 'Type DOWNGRADE to confirm',
          requiredValue: 'DOWNGRADE'
        }}
        confirmText={isDowngrading ? 'Downgrading...' : 'Confirm Downgrade'}
        confirmButtonVariant='destructive'
        cancelButtonVariant='outline'
        scrollable
        maxWidth='2xl'
        asyncAction
        loadingText='Downgrading...'
        disableConfirmButton={isDowngrading}
        confirmIcon={
          isDowngrading ? <Spinner size='sm' className='mr-2' /> : null
        }
        onConfirm={handleDowngradeConfirm}
        onCancel={() => {
          downgradeDialog.close()
        }}
      />

      <ModalDialog
        open={downgradeRestrictionDialog.isOpen}
        onOpenChange={open =>
          open
            ? downgradeRestrictionDialog.open()
            : downgradeRestrictionDialog.close()
        }
        title={
          <div className='flex items-center gap-2'>
            <Info className='h-4 w-4 text-amber-600 md:h-5 md:w-5' />
            Team Plan Downgrade Restricted
          </div>
        }
        description='Only the team plan purchaser can downgrade. You are not authorized to downgrade this team plan.'
        useDialog={true}
        contentClassName='flex max-h-[85vh] max-w-lg flex-col overflow-hidden md:max-h-[90vh]'
        confirmText='Go to Team Settings'
        cancelText='Close'
        confirmButtonVariant='default'
        showCancel={true}
        onConfirm={() => {
          downgradeRestrictionDialog.close()
          window.location.href = appRoutes.dashboard.settings.team
        }}
        onCancel={() => downgradeRestrictionDialog.close()}
        content={
          <div className='min-h-0 flex-1 overflow-y-auto py-2'>
            <div className='space-y-3 px-1 md:space-y-4'>
              <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 md:p-4 dark:border-blue-900/20 dark:bg-blue-900/10'>
                <p className='text-xs font-medium text-blue-700 md:text-sm dark:text-blue-300'>
                  Team Plan Downgrade Restriction
                </p>
                <p className='mt-1.5 text-xs text-blue-600 md:mt-2 md:text-sm dark:text-blue-400'>
                  Only the team member who purchased the current team plan can
                  downgrade it. This ensures that the person who paid for the
                  plan has control over subscription changes.
                </p>
              </div>

              <div className='rounded-lg border border-green-200 bg-green-50 p-3 md:p-4 dark:border-green-900/20 dark:bg-green-900/10'>
                <p className='text-xs font-medium text-green-700 md:text-sm dark:text-green-300'>
                  Upgrading is Open to All Team Members
                </p>
                <p className='mt-1.5 text-xs text-green-600 md:mt-2 md:text-sm dark:text-green-400'>
                  Any team member can upgrade the team plan. When you upgrade,
                  you become the new plan purchaser and gain the ability to
                  manage future downgrades.
                </p>
              </div>

              <div className='space-y-2 md:space-y-3'>
                <h4 className='text-xs font-medium md:text-sm'>
                  What can you do if you want a different plan?
                </h4>
                <ul className='text-muted-foreground space-y-1.5 text-xs md:space-y-2 md:text-sm'>
                  <li className='flex items-start gap-2'>
                    <span className='text-foreground flex-shrink-0'>•</span>
                    <span>
                      <strong className='font-semibold'>
                        Ask the current plan purchaser to downgrade:
                      </strong>{' '}
                      Contact the team member who purchased the current plan and
                      request they downgrade it
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-foreground flex-shrink-0'>•</span>
                    <span>
                      <strong className='font-semibold'>
                        Leave the team and create your own:
                      </strong>{' '}
                      You can leave this team and create a new one with the plan
                      you prefer
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-foreground flex-shrink-0'>•</span>
                    <span>
                      <strong className='font-semibold'>
                        Wait for the current plan to expire:
                      </strong>{' '}
                      Once the current plan expires, any team member can
                      purchase the new plan
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-foreground flex-shrink-0'>•</span>
                    <span>
                      <strong className='font-semibold'>
                        Upgrade the team plan:
                      </strong>{' '}
                      Purchase a higher tier plan to become the new plan
                      purchaser with downgrade privileges
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        }
      />

      <ModalDialog
        open={teamDowngradeDialog.isOpen}
        onOpenChange={open =>
          open ? teamDowngradeDialog.open() : teamDowngradeDialog.close()
        }
        title={
          <span className='flex items-center gap-2 text-amber-600'>
            <AlertTriangle className='h-5 w-5' />
            Downgrade Team Plan to Free
          </span>
        }
        description='You are about to downgrade your team plan to free. This will affect all team members.'
        content={
          <div className='space-y-4'>
            <div className='space-y-3'>
              <h4 className='text-foreground font-medium'>
                Your entire team will lose access to:
              </h4>
              <div className='grid gap-2'>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Users className='h-4 w-4' />
                  Unlimited team members (will be limited to basic plan)
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Zap className='h-4 w-4' />
                  Priority support for team issues
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Shield className='h-4 w-4' />
                  Advanced team security features
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Database className='h-4 w-4' />
                  Extended team data retention
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <CreditCard className='h-4 w-4' />
                  Premium team integrations
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10'>
              <p className='text-xs text-amber-700 dark:text-amber-300'>
                <strong>Warning:</strong> This action will immediately remove
                all premium team features for every member of your team. Team
                members will need to purchase individual plans if they want
                premium features.
              </p>
              <p className='mt-2 text-xs text-amber-700 dark:text-amber-300'>
                <strong>Important:</strong> Only the plan purchaser can
                downgrade the team plan. Any team member can upgrade the plan
                and become the new plan purchaser.
              </p>
            </div>
          </div>
        }
        confirmationInput={{
          label: 'Type "DOWNGRADE" to confirm:',
          placeholder: 'Type DOWNGRADE to confirm',
          requiredValue: 'DOWNGRADE'
        }}
        confirmText={
          isDowngrading ? 'Downgrading...' : 'Confirm Team Downgrade'
        }
        confirmButtonVariant='destructive'
        cancelButtonVariant='outline'
        scrollable
        maxWidth='2xl'
        asyncAction
        loadingText='Downgrading...'
        disableConfirmButton={isDowngrading}
        confirmIcon={
          isDowngrading ? <Spinner size='sm' className='mr-2' /> : null
        }
        onConfirm={handleTeamDowngradeConfirm}
        onCancel={() => {
          teamDowngradeDialog.close()
        }}
      />

      <ModalDialog
        open={individualPaidDowngradeDialog.isOpen}
        onOpenChange={open => {
          if (open) {
            individualPaidDowngradeDialog.open()
          } else {
            individualPaidDowngradeDialog.close()
            setPendingDowngradePlan(null)
          }
        }}
        title={
          <span className='flex items-center gap-2 text-amber-600'>
            <AlertTriangle className='h-5 w-5' />
            Downgrade Individual Plan
          </span>
        }
        description='You are about to downgrade your individual plan. This action requires payment and will take effect immediately.'
        content={
          <div className='space-y-4'>
            <div className='space-y-3'>
              <h4 className='text-foreground font-medium'>
                What happens when you downgrade:
              </h4>
              <div className='grid gap-2'>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <AlertTriangle className='h-4 w-4' />
                  You will lose access to higher-tier features immediately
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <CreditCard className='h-4 w-4' />
                  You will need to pay for the lower-tier plan
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Shield className='h-4 w-4' />
                  No refund for the remaining time on your current plan
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Zap className='h-4 w-4' />
                  To upgrade again, you'll need to pay the full price
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10'>
              <p className='text-xs text-amber-700 dark:text-amber-300'>
                <strong>Important:</strong> Downgrades require payment and are
                processed immediately. You will lose access to premium features
                right away. Consider if you might need these features before
                proceeding.
              </p>
            </div>
          </div>
        }
        confirmText='Continue with Downgrade'
        confirmButtonVariant='destructive'
        cancelButtonVariant='outline'
        scrollable
        maxWidth='2xl'
        disableConfirmButton={false}
        onConfirm={handlePaidDowngradeConfirm}
        onCancel={() => {
          setPendingDowngradePlan(null)
        }}
      />

      <ModalDialog
        open={teamPaidDowngradeDialog.isOpen}
        onOpenChange={open => {
          if (open) {
            teamPaidDowngradeDialog.open()
          } else {
            teamPaidDowngradeDialog.close()
            setPendingDowngradePlan(null)
          }
        }}
        title={
          <span className='flex items-center gap-2 text-amber-600'>
            <AlertTriangle className='h-5 w-5' />
            Downgrade Team Plan
          </span>
        }
        description='You are about to downgrade your team plan. This will affect all team members and requires payment.'
        content={
          <div className='space-y-4'>
            <div className='space-y-3'>
              <h4 className='text-foreground font-medium'>
                Impact on your team:
              </h4>
              <div className='grid gap-2'>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Users className='h-4 w-4' />
                  All team members will lose access to higher-tier features
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <AlertTriangle className='h-4 w-4' />
                  Team member limit will be reduced immediately
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Shield className='h-4 w-4' />
                  Advanced team collaboration features will be disabled
                </div>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                  <Database className='h-4 w-4' />
                  Data retention limits will apply to the lower plan
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/20 dark:bg-blue-900/10'>
              <p className='text-xs text-blue-700 dark:text-blue-300'>
                <strong>Note:</strong> Only the plan purchaser can downgrade the
                team plan. If you want a different plan, you can either:
              </p>
              <ul className='mt-2 ml-4 text-xs text-blue-600 dark:text-blue-400'>
                <li>• Ask the current plan purchaser to downgrade</li>
                <li>
                  • Leave the team and create your own with the desired plan
                </li>
                <li>• Wait for the current plan to expire</li>
              </ul>
            </div>

            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10'>
              <p className='text-xs text-amber-700 dark:text-amber-300'>
                <strong>Warning:</strong> This downgrade requires payment and
                takes effect immediately. Your team will lose access to premium
                features right away. To regain access to the higher plan, you'll
                need to upgrade and pay again.
              </p>
            </div>
          </div>
        }
        confirmText='Continue with Team Downgrade'
        confirmButtonVariant='destructive'
        cancelButtonVariant='outline'
        scrollable
        maxWidth='2xl'
        disableConfirmButton={false}
        onConfirm={handlePaidDowngradeConfirm}
        onCancel={() => {
          setPendingDowngradePlan(null)
        }}
      />

      {/* Welcome to Free Plan Dialog */}
      <ModalDialog
        open={welcomeFreeDialog.isOpen}
        onOpenChange={open =>
          open ? welcomeFreeDialog.open() : welcomeFreeDialog.close()
        }
        title={
          <span className='flex items-center gap-2'>
            <PartyPopper className='h-6 w-6 text-blue-500' />
            Welcome to the Free Plan
          </span>
        }
        description={
          welcomeFreeDialog.data?.isTeamPlan
            ? 'Your team has been successfully downgraded to the free plan'
            : 'Your individual subscription has been successfully downgraded to the free plan'
        }
        useDialog={true}
        showCloseButton={true}
        confirmText='Continue to Dashboard'
        confirmButtonVariant='default'
        showCancel={false}
        onConfirm={() => {
          welcomeFreeDialog.close()
          window.location.href = appRoutes.dashboard.base
        }}
        maxWidth='lg'
        content={
          <div className='space-y-4 py-4'>
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/20 dark:bg-blue-900/10'>
              <div className='flex gap-3'>
                <Info className='mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400' />
                <div className='space-y-2'>
                  <p className='font-medium text-blue-900 dark:text-blue-100'>
                    What's included in the Free Plan:
                  </p>
                  <ul className='space-y-1 text-sm text-blue-800 dark:text-blue-200'>
                    <li className='flex items-start gap-2'>
                      <Check className='mt-0.5 h-4 w-4 flex-shrink-0' />
                      <span>Basic features for personal use</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <Check className='mt-0.5 h-4 w-4 flex-shrink-0' />
                      <span>Community support</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <Check className='mt-0.5 h-4 w-4 flex-shrink-0' />
                      <span>
                        {welcomeFreeDialog.data?.isTeamPlan
                          ? 'Up to 3 team members'
                          : 'Individual workspace'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className='rounded-lg border p-4'>
              <p className='text-muted-foreground text-sm'>
                You can upgrade back to a paid plan anytime to regain access to
                premium features. Visit the{' '}
                <a
                  href={appRoutes.pricing}
                  className='font-medium text-blue-600 hover:underline dark:text-blue-400'
                >
                  pricing page
                </a>{' '}
                to explore available plans.
              </p>
            </div>
          </div>
        }
      />

      {/* Welcome Dialog for Paid Plans */}
      <ModalDialog
        open={welcomeDialog.isOpen}
        onOpenChange={open =>
          open ? welcomeDialog.open() : welcomeDialog.close()
        }
        title={
          <span className='flex items-center gap-2'>
            <PartyPopper className='h-6 w-6 text-green-500' />
            Welcome to {welcomeDialog.data?.plan.displayName}!
          </span>
        }
        description={
          welcomeDialog.data?.isTeamPlan
            ? `Your team has been successfully upgraded to ${welcomeDialog.data?.plan.displayName}`
            : `Your personal subscription has been successfully upgraded to ${welcomeDialog.data?.plan.displayName}`
        }
        useDialog={true}
        showCloseButton={true}
        confirmText='Continue to Dashboard'
        confirmButtonVariant='default'
        showCancel={false}
        onConfirm={() => {
          welcomeDialog.close()
          window.location.href = appRoutes.dashboard.base
        }}
        maxWidth='2xl'
        scrollable
        content={
          <div className='space-y-6 py-4'>
            <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg'>
              <CheckCircle2 className='h-10 w-10 text-white' />
            </div>

            <div className='space-y-3 text-center'>
              <h3 className='bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent'>
                Payment Confirmed!
              </h3>
              <p className='text-muted-foreground'>
                {welcomeDialog.data?.isTeamPlan ? (
                  <>
                    <Users className='mr-1 inline h-4 w-4' />
                    Your entire team now has access to premium features
                  </>
                ) : (
                  <>
                    <User className='mr-1 inline h-4 w-4' />
                    Your personal subscription is now active
                  </>
                )}
              </p>
            </div>

            {/* Plan Features */}
            <div className='rounded-lg border bg-gradient-to-br from-green-50 to-blue-50 p-4 dark:from-green-950/20 dark:to-blue-950/20'>
              <div className='mb-3 flex items-center gap-2'>
                <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
                <p className='font-semibold text-green-900 dark:text-green-100'>
                  What's included in {welcomeDialog.data?.plan.displayName}:
                </p>
              </div>
              <ul className='space-y-2'>
                {welcomeDialog.data?.plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                  >
                    <Check className='mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400' />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'>
                  <Check className='mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400' />
                  <span>
                    {formatTeamMemberLimit(
                      typeof welcomeDialog.data?.plan.maxMembers === 'string'
                        ? parseInt(welcomeDialog.data.plan.maxMembers)
                        : welcomeDialog.data?.plan.maxMembers || 0
                    )}
                  </span>
                </li>
              </ul>
            </div>

            {/* Transaction Details */}
            {welcomeDialog.data?.transactionHash && (
              <div className='rounded-lg border p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground flex items-center gap-1 text-sm'>
                    <Hash className='h-3 w-3' /> Transaction Hash
                  </span>
                  <div className='flex items-center gap-2'>
                    <code className='bg-muted rounded px-2 py-1 font-mono text-xs'>
                      {welcomeDialog.data.transactionHash.slice(0, 6)}...
                      {welcomeDialog.data.transactionHash.slice(-4)}
                    </code>
                    <a
                      href={buildTxUrl(
                        stableChainId,
                        welcomeDialog.data.transactionHash
                      )}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:text-blue-700 dark:text-blue-400'
                    >
                      <ExternalLink className='h-4 w-4' />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/20 dark:bg-blue-900/10'>
              <p className='text-xs text-blue-700 dark:text-blue-300'>
                <strong>Next Steps:</strong> Explore your new features in the
                dashboard. If you have any questions, our{' '}
                {welcomeDialog.data?.plan.name
                  .toLowerCase()
                  .includes('enterprise')
                  ? 'dedicated support team'
                  : 'support team'}{' '}
                is here to help!
              </p>
            </div>
          </div>
        }
      />
    </>
  )
}

function PricingCard({
  plan,
  currentPlan,
  isSubscriptionActive,
  onUpgrade,
  isAuthenticated,
  isConnected,
  isLoading,
  isTeamPlan: _isPlanTypeTeam,
  subscriptionExpiresAt
}: {
  plan: ContractPlan
  currentPlan: string
  isSubscriptionActive: boolean
  onUpgrade: (planId: string) => Promise<void>
  isAuthenticated: boolean
  isConnected: boolean
  isLoading?: boolean
  isTeamPlan?: boolean
  subscriptionExpiresAt?: Date | string | null
}) {
  // Compare plan names in lowercase to handle case differences
  // Also handle underscore/space variations (e.g., "team_enterprise" vs "team enterprise")
  // Normalize plan names for comparison - handle various formats
  const normalizePlanName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
      .replace(/plan$/i, '')
  }

  const normalizedCurrentPlan = currentPlan
    ? normalizePlanName(currentPlan)
    : ''
  const normalizedPlanName = normalizePlanName(plan.name)
  const normalizedPlanDisplayName = normalizePlanName(plan.displayName)
  const normalizedPlanId = normalizePlanName(plan.id)

  // Check multiple variations to handle different plan naming conventions
  const isCurrent = Boolean(
    currentPlan &&
      (normalizedPlanDisplayName === normalizedCurrentPlan ||
        normalizedPlanName === normalizedCurrentPlan ||
        normalizedPlanId === normalizedCurrentPlan ||
        // Also check if current plan contains the plan name (e.g., 'team_pro' contains 'pro')
        (plan.isTeamPlan &&
          normalizedCurrentPlan.includes(normalizedPlanName)) ||
        // Check exact match without normalization for edge cases
        currentPlan.toLowerCase() === plan.name.toLowerCase() ||
        currentPlan.toLowerCase() === plan.id.toLowerCase())
  )

  const _canUpgrade = canUpgradeToPlan(currentPlan || 'free', plan.name)
  const _canDowngrade = canUpgradeToPlan(plan.name, currentPlan || 'free')
  const _isFree = plan.name.toLowerCase() === 'free'
  const isPopular = plan.name.toLowerCase() === 'pro'
  const isTeamPlan = plan.isTeamPlan || false

  const loadingButton = useLoading({
    loadingText: 'Processing'
  })

  // Determine what kind of action this is
  const isDowngrade =
    plan.name.toLowerCase() === 'free' ||
    (currentPlan && canUpgradeToPlan(plan.name, currentPlan))
  const isUpgrade = !isDowngrade && !isCurrent
  const needsSelection = isTeamPlan
    ? !currentPlan
    : !currentPlan || currentPlan === 'free'

  // Get expiration date for current plan if it exists
  const getExpirationDate = () => {
    if (subscriptionExpiresAt) {
      return subscriptionExpiresAt
    }
    return undefined
  }

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-xl border p-6 shadow-lg transition-all duration-300',
        isCurrent && isAuthenticated
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 opacity-90 dark:from-blue-950/20 dark:to-blue-900/20'
          : isPopular
            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100/50 hover:shadow-xl dark:from-orange-950/20 dark:to-orange-900/20'
            : 'border-gray-200/60 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl dark:border-gray-700/60 dark:from-gray-900/70 dark:to-gray-800/50'
      )}
    >
      {/* Background decoration */}
      {isPopular && (
        <div className='absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br from-orange-400/20 to-pink-400/20 blur-xl' />
      )}
      {isCurrent && isAuthenticated && (
        <div className='absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-xl' />
      )}
      {isTeamPlan && (
        <div className='absolute -top-6 -left-6 h-16 w-16 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-400/20 blur-xl' />
      )}

      <div className='relative mb-6'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-foreground text-2xl font-bold'>
            {plan.displayName}
          </h2>
          {isPopular && (
            <span className='rounded-full bg-gradient-to-r from-orange-600 to-pink-600 px-3 py-1 text-xs font-medium text-white shadow-lg'>
              Most Popular
            </span>
          )}
          {isCurrent && isAuthenticated && (
            <span className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-xs font-medium text-white shadow-lg'>
              Current Plan
            </span>
          )}
          {isTeamPlan && !isCurrent && (
            <span className='rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 text-xs font-medium text-white shadow-lg'>
              Team Plan
            </span>
          )}
        </div>
        {plan.description && (
          <p className='text-muted-foreground text-sm'>{plan.description}</p>
        )}
      </div>

      <div className='mb-6'>
        <div className='flex items-baseline gap-2'>
          <span className='text-foreground text-4xl font-bold'>
            ${formatPrice(plan.priceUSD || 0, 0)}
          </span>
          <span className='text-muted-foreground text-lg'>
            {isTeamPlan ? '/month for entire team' : '/month'}
          </span>
        </div>
        {plan.priceNative !== undefined && plan.nativeCurrencySymbol && (
          <p className='text-muted-foreground mt-1 text-sm'>
            ≈{' '}
            {formatPriceWithCurrency(
              plan.priceNative,
              plan.nativeCurrencySymbol
            )}
          </p>
        )}
      </div>

      <ul className='mb-8 flex-1 space-y-3'>
        {plan.features.map((feature, index) => (
          <li key={index} className='flex items-start'>
            <Check className='mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-green-500' />
            <span className='text-foreground'>{feature}</span>
          </li>
        ))}
        <li className='flex items-start'>
          <Check className='mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-green-500' />
          <span className='text-foreground'>
            {formatTeamMemberLimit(
              typeof plan.maxMembers === 'string'
                ? parseInt(plan.maxMembers)
                : plan.maxMembers
            )}
          </span>
        </li>
      </ul>

      {/* Not connected - show connect wallet */}
      {!isConnected ? (
        <PricingButton
          isConnected={false}
          isAuthenticated={false}
          isLoading={false}
          isCurrent={false}
          isSubscriptionActive={false}
          buttonText=''
        />
      ) : !isAuthenticated ? (
        /* Connected but not authenticated - show sign message */
        <PricingButton
          isConnected={true}
          isAuthenticated={false}
          isLoading={false}
          isCurrent={false}
          isSubscriptionActive={false}
          buttonText=''
        />
      ) : isLoading ? (
        /* Loading state */
        <CurrentPlanButton isLoading />
      ) : isCurrent && (_isFree || isSubscriptionActive) ? (
        /* Current active plan (including free) - show muted button */
        <CurrentPlanButton
          expirationDate={
            !_isFree && subscriptionExpiresAt
              ? subscriptionExpiresAt
              : undefined
          }
        >
          Current Plan
        </CurrentPlanButton>
      ) : isCurrent && !isSubscriptionActive ? (
        /* Expired paid plan - show reactivate with expiration date */
        <ReactivatePlanButton
          isLoading={loadingButton.isLoading}
          onReactivate={() => loadingButton.execute(() => onUpgrade(plan.name))}
          expirationDate={getExpirationDate()}
        />
      ) : needsSelection ? (
        /* No plan - show select */
        <SelectPlanButton
          isLoading={loadingButton.isLoading}
          onSelect={() => loadingButton.execute(() => onUpgrade(plan.name))}
          isPopular={isPopular}
        />
      ) : (
        /* Upgrade or downgrade */
        <UpgradeDowngradeButton
          isUpgrade={isUpgrade}
          planDisplayName={plan.displayName}
          isTeamPlan={isTeamPlan}
          isLoading={loadingButton.isLoading}
          onAction={() => loadingButton.execute(() => onUpgrade(plan.name))}
          isPopular={isPopular}
        />
      )}
    </div>
  )
}
