'use client'

import { useState, useMemo } from 'react'

import {
  Plus,
  Trash2,
  Save,
  X,
  DollarSign,
  Settings,
  Users,
  Edit3,
  ExternalLink,
  Wallet,
  Network,
  Shield,
  AlertCircle,
  Loader2
} from 'lucide-react'
import useSWR from 'swr'

import { LoadingWrapper } from '@/components/blocks/loading-wrapper'
import { ModalDialog, modalConfirmAsync } from '@/components/blocks/modal-utils'
import { showErrorToast } from '@/components/blocks/toast-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiEndpoints } from '@/config/api-endpoints'
import { useUnifiedWalletInfo, useUnifiedChainInfo } from '@/context'
import { useAdminTransaction } from '@/hooks/blockchain/use-transaction'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useLoading } from '@/hooks/use-loading'
import { cn } from '@/lib'
import {
  swrFetcher,
  invalidateContractPlans,
  invalidateContractEarnings
} from '@/lib/api/swr'
import {
  DEFAULT_CHAIN_ID,
  getExplorerUrl,
  isSupportedChainId
} from '@/lib/blockchain'
import { formatPriceWithCurrency } from '@/lib/blockchain/payment'
import { formatTeamMemberLimit } from '@/lib/utils/subscription'

interface ContractPlan {
  planKey: number
  name: string
  displayName: string
  description: string
  priceWei: string
  priceUSD: number
  priceFormatted: string
  priceNative?: number
  nativeCurrencySymbol?: string
  maxMembers: string
  maxMembersFormatted: string
  features: string[]
  isActive: boolean
  sortOrder: string
  isTeamPlan: boolean
}

interface ContractEarnings {
  totalNativeEarnings: string
  totalNativeWithdrawn: string
  availableNativeEarnings: string
  recordsCount: string
  totalUSD: number
  withdrawnUSD: number
  availableUSD: number
  totalNative: string
  withdrawnNative: string
  availableNative: string
  nativeCurrency: string
  totalFormatted: string
  withdrawnFormatted: string
  availableFormatted: string
}

interface ContractInfo {
  address: string
  chainId: number
  chainName: string
}

interface CreatePlanForm {
  name: string
  displayName: string
  description: string
  priceUSD: string
  maxMembers: string
  features: string[]
  isActive: boolean
  sortOrder: string
  isTeamPlan: boolean
}

interface EditPlanForm extends CreatePlanForm {
  planKey: number
}

export function SubscriptionManager() {
  // Wallet and chain state
  const { chainId } = useUnifiedChainInfo()
  const { isConnected, address: walletAddress } = useUnifiedWalletInfo()
  const { executeTransaction } = useAdminTransaction()

  // Tab state
  const [activeTab, setActiveTab] = useState<'earnings' | 'plans'>('earnings')

  // Plan management state
  const createPlanDialog = useDialogState()
  const [editingPlan, setEditingPlan] = useState<number | null>(null)
  const [deletingPlanKey, setDeletingPlanKey] = useState<number | null>(null)
  const [createPlanForm, setCreatePlanForm] = useState<CreatePlanForm>({
    name: '',
    displayName: '',
    description: '',
    priceUSD: '',
    maxMembers: '3',
    features: [],
    isActive: true,
    sortOrder: '0',
    isTeamPlan: false
  })
  const [editPlanForm, setEditPlanForm] = useState<EditPlanForm | null>(null)

  // Withdrawal state
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawAmountNative, setWithdrawAmountNative] = useState('')
  const [, setIsWithdrawing] = useState(false)

  // Reloading state for plans
  const [isReloadingPlans, setIsReloadingPlans] = useState(false)

  // Loading button hooks
  const saveButton = useLoading({
    defaultText: 'Save',
    loadingText: 'Saving',
    icon: <Save className='h-4 w-4' />,
    withButton: true
  })

  const deleteButton = useLoading({
    defaultText: 'Delete',
    loadingText: 'Deleting',
    icon: <Trash2 className='h-4 w-4' />,
    withButton: true
  })

  const createPlanButton = useLoading({
    defaultText: 'Create Plan',
    loadingText: 'Creating',
    icon: <Plus className='h-4 w-4' />,
    withButton: true
  })

  const withdrawButton = useLoading({
    defaultText: 'Withdraw',
    loadingText: 'Processing',
    icon: <DollarSign className='h-4 w-4' />,
    withButton: true
  })

  // Fetch contract data from the user's selected chain
  // Fallback to Ethereum mainnet if user's chain is not supported
  const effectiveChainId =
    chainId && isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID
  const { data: contractPlansData, error: plansError } = useSWR(
    `${apiEndpoints.admin.contract.plans}?chainId=${effectiveChainId}`,
    swrFetcher
  )
  const { data: contractEarningsData, error: earningsError } = useSWR(
    `${apiEndpoints.admin.contract.earnings}?chainId=${effectiveChainId}`,
    swrFetcher
  )

  const contractPlans: ContractPlan[] = useMemo(() => {
    const plans = contractPlansData?.plans || []
    // Sort plans by sortOrder
    return [...plans].sort((a, b) => {
      const orderA = parseInt(a.sortOrder || '0')
      const orderB = parseInt(b.sortOrder || '0')
      return orderA - orderB
    })
  }, [contractPlansData?.plans])

  const contractEarnings: ContractEarnings | null =
    contractEarningsData?.earnings || null
  const contractInfo: ContractInfo | null =
    contractPlansData?.contractInfo ||
    contractEarningsData?.contractInfo ||
    null

  // Helper function to reload plans with loading state
  const reloadPlansWithDelay = async () => {
    setIsReloadingPlans(true)
    // Wait 3 seconds before fetching updated data
    await new Promise(resolve => setTimeout(resolve, 3000))
    await invalidateContractPlans()
    // Also refresh earnings data as plan changes may affect earnings
    await invalidateContractEarnings()
    setIsReloadingPlans(false)
  }

  // Plan management functions
  const handleCreatePlan = async () => {
    if (!isConnected) {
      showErrorToast(
        'Wallet not connected',
        'Please connect your wallet to create a plan'
      )
      return
    }

    if (
      !createPlanForm.name ||
      !createPlanForm.displayName ||
      !createPlanForm.priceUSD
    ) {
      showErrorToast(
        'Missing required fields',
        'Please fill in all required fields'
      )
      return
    }

    // Find the next available plan key
    const existingKeys = contractPlans.map(plan => plan.planKey)
    let nextPlanKey = 3 // Start from 3 (0=free, 1=pro, 2=enterprise are reserved)
    while (existingKeys.includes(nextPlanKey) && nextPlanKey < 255) {
      nextPlanKey++
    }

    if (nextPlanKey >= 255) {
      showErrorToast(
        'Plan limit reached',
        'Maximum number of plans reached (255)'
      )
      return
    }

    await executeTransaction(
      'createPlan',
      {
        planKey: nextPlanKey,
        name: createPlanForm.name,
        displayName: createPlanForm.displayName,
        description: createPlanForm.description,
        priceUSD: parseFloat(createPlanForm.priceUSD),
        maxMembers:
          createPlanForm.maxMembers === '-1'
            ? -1
            : parseInt(createPlanForm.maxMembers),
        features: createPlanForm.features.filter(f => f.trim() !== ''),
        isActive: createPlanForm.isActive,
        sortOrder: parseInt(createPlanForm.sortOrder),
        isTeamPlan: createPlanForm.isTeamPlan
      },
      effectiveChainId,
      {
        onSuccess: async () => {
          createPlanDialog.close()
          resetCreatePlanForm()
          // Reload plans with loading state
          await reloadPlansWithDelay()
        }
      }
    )
  }

  const handleUpdatePlan = async () => {
    if (!isConnected) {
      showErrorToast(
        'Wallet not connected',
        'Please connect your wallet to update a plan'
      )
      return
    }

    if (!editPlanForm) return

    await executeTransaction(
      'updatePlan',
      {
        planKey: editPlanForm.planKey,
        name: editPlanForm.name,
        displayName: editPlanForm.displayName,
        description: editPlanForm.description,
        priceUSD: parseFloat(editPlanForm.priceUSD),
        maxMembers:
          editPlanForm.maxMembers === '-1'
            ? -1
            : parseInt(editPlanForm.maxMembers),
        features: editPlanForm.features.filter(f => f.trim() !== ''),
        isActive: editPlanForm.isActive,
        sortOrder: parseInt(editPlanForm.sortOrder),
        isTeamPlan: editPlanForm.isTeamPlan
      },
      effectiveChainId,
      {
        onSuccess: async () => {
          setEditingPlan(null)
          setEditPlanForm(null)
          // Reload plans with loading state
          await reloadPlansWithDelay()
        }
      }
    )
  }

  const handleDeletePlan = async (planKey: number) => {
    if (!isConnected) {
      showErrorToast(
        'Wallet not connected',
        'Please connect your wallet to delete a plan'
      )
      return
    }

    setDeletingPlanKey(planKey)

    await executeTransaction('deletePlan', { planKey }, effectiveChainId, {
      onSuccess: async () => {
        setDeletingPlanKey(null)

        // Reload plans with loading state
        await reloadPlansWithDelay()
      },
      onError: () => {
        setDeletingPlanKey(null)
      }
    })
  }

  const handleWithdraw = async () => {
    if (!isConnected) {
      showErrorToast(
        'Wallet not connected',
        'Please connect your wallet to withdraw earnings'
      )
      return
    }

    if (!withdrawAddress || !withdrawAmountNative) {
      showErrorToast(
        'Missing required fields',
        'Please enter both withdrawal address and amount'
      )
      return
    }

    // Validate withdrawal amount
    const amount = parseFloat(withdrawAmountNative)
    if (isNaN(amount) || amount <= 0) {
      showErrorToast('Invalid amount', 'Please enter a valid withdrawal amount')
      return
    }

    // Check if amount exceeds available balance
    if (
      contractEarnings &&
      amount > parseFloat(contractEarnings.availableNative)
    ) {
      showErrorToast(
        'Insufficient balance',
        'Withdrawal amount exceeds available balance'
      )
      return
    }

    setIsWithdrawing(true)
    await executeTransaction(
      'withdrawEarnings',
      {
        to: withdrawAddress,
        amountNative: withdrawAmountNative
      },
      effectiveChainId,
      {
        onSuccess: async () => {
          setWithdrawAddress('')
          setWithdrawAmountNative('')
          await invalidateContractEarnings()
          setIsWithdrawing(false)
        },
        onError: () => {
          setIsWithdrawing(false)
        }
      }
    )
  }

  const startEditingPlan = (plan: ContractPlan) => {
    setEditPlanForm({
      planKey: plan.planKey,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      priceUSD: plan.priceUSD.toString(),
      maxMembers:
        plan.maxMembersFormatted === 'Unlimited' ? '-1' : plan.maxMembers,
      features: [...plan.features],
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      isTeamPlan: plan.isTeamPlan
    })
    setEditingPlan(plan.planKey)
  }

  const resetCreatePlanForm = () => {
    setCreatePlanForm({
      name: '',
      displayName: '',
      description: '',
      priceUSD: '',
      maxMembers: '3',
      features: [],
      isActive: true,
      sortOrder: '0',
      isTeamPlan: false
    })
  }

  const addFeature = (isEditing = false) => {
    if (isEditing && editPlanForm) {
      setEditPlanForm({
        ...editPlanForm,
        features: [...editPlanForm.features, '']
      })
    } else {
      setCreatePlanForm(prev => ({
        ...prev,
        features: [...prev.features, '']
      }))
    }
  }

  const updateFeature = (index: number, value: string, isEditing = false) => {
    if (isEditing && editPlanForm) {
      setEditPlanForm({
        ...editPlanForm,
        features: editPlanForm.features.map((f, i) => (i === index ? value : f))
      })
    } else {
      setCreatePlanForm(prev => ({
        ...prev,
        features: prev.features.map((f, i) => (i === index ? value : f))
      }))
    }
  }

  const removeFeature = (index: number, isEditing = false) => {
    if (isEditing && editPlanForm) {
      setEditPlanForm({
        ...editPlanForm,
        features: editPlanForm.features.filter((_, i) => i !== index)
      })
    } else {
      setCreatePlanForm(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }))
    }
  }

  return (
    <div className='space-y-6'>
      {/* Contract Info Card */}
      {contractInfo && (
        <Card className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              Subscription Manager Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div className='flex items-center gap-2'>
                <Wallet className='text-muted-foreground h-4 w-4' />
                <div className='min-w-0 flex-1'>
                  <p className='text-foreground text-sm font-medium'>
                    Contract Address
                  </p>
                  <div className='flex items-center gap-2'>
                    <code className='text-foreground font-mono text-xs break-all'>
                      {contractInfo.address}
                    </code>
                    <a
                      href={`${getExplorerUrl(contractInfo.chainId)}/address/${contractInfo.address}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                    >
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Network className='text-muted-foreground h-4 w-4' />
                <div>
                  <p className='text-foreground text-sm font-medium'>Network</p>
                  <p className='text-foreground text-sm'>
                    {contractInfo.chainName}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <AlertCircle className='text-muted-foreground h-4 w-4' />
                <div>
                  <p className='text-foreground text-sm font-medium'>
                    Chain ID
                  </p>
                  <p className='text-foreground text-sm'>
                    {contractInfo.chainId}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className='border-border border-b'>
        <nav className='-mb-px flex space-x-8'>
          <button
            onClick={() => setActiveTab('earnings')}
            className={cn(
              'border-b-2 px-1 py-2 text-sm font-medium',
              activeTab === 'earnings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <DollarSign className='mr-2 inline h-4 w-4' />
            Subscription Earnings
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={cn(
              'border-b-2 px-1 py-2 text-sm font-medium',
              activeTab === 'plans'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <Settings className='mr-2 inline h-4 w-4' />
            Subscription Plans
          </button>
        </nav>
      </div>

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <>
          {earningsError ||
          contractEarningsData?.type === 'configuration_error' ? (
            <Card className='border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
              <CardHeader>
                <CardTitle className='text-amber-700 dark:text-amber-400'>
                  Smart Contract Not Configured
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <p className='text-amber-600 dark:text-amber-300'>
                    {contractEarningsData?.error ||
                      'The subscription smart contract is not configured for this network.'}
                  </p>
                  {(contractEarningsData?.type === 'configuration_error' ||
                    contractEarningsData?.error) && (
                    <div className='rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30'>
                      <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                        Current Network:{' '}
                        {contractEarningsData?.chainName || `Chain ${chainId}`}
                      </p>
                      <p className='text-sm text-amber-700 dark:text-amber-300'>
                        Supported chains:{' '}
                        {contractEarningsData?.supportedChains?.join(', ') ||
                          'Ethereum, Polygon, Optimism, Arbitrum, Base'}
                      </p>
                      <p className='mt-2 text-sm text-amber-700 dark:text-amber-300'>
                        To view earnings on this network, please deploy the
                        smart contract and configure the contract address in
                        your environment variables.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : contractEarnings ? (
            <>
              {/* Earnings Overview */}
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Total Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                        ${contractEarnings.totalUSD.toFixed(2)}
                      </div>
                      <div className='text-foreground/70 dark:text-foreground/80 text-sm'>
                        {contractEarnings.totalNative}{' '}
                        {contractEarnings.nativeCurrency}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Available for Withdrawal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                        ${contractEarnings.availableUSD.toFixed(2)}
                      </div>
                      <div className='text-foreground/70 dark:text-foreground/80 text-sm'>
                        {contractEarnings.availableNative}{' '}
                        {contractEarnings.nativeCurrency}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Total Withdrawn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
                        ${contractEarnings.withdrawnUSD.toFixed(2)}
                      </div>
                      <div className='text-foreground/70 dark:text-foreground/80 text-sm'>
                        {contractEarnings.withdrawnNative}{' '}
                        {contractEarnings.nativeCurrency}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Withdrawal Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Withdraw Contract Earnings</CardTitle>
                  <CardDescription>
                    Withdraw earnings directly from the smart contract. All
                    withdrawals are recorded on the blockchain.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div>
                      <Label htmlFor='withdrawAddress'>
                        Withdrawal Address
                      </Label>
                      <div className='flex gap-2'>
                        <Input
                          id='withdrawAddress'
                          placeholder='0x...'
                          value={withdrawAddress}
                          onChange={e => setWithdrawAddress(e.target.value)}
                          className='flex-1'
                        />
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            if (walletAddress) {
                              setWithdrawAddress(walletAddress)
                            }
                          }}
                          disabled={!walletAddress}
                          className='px-3 font-semibold whitespace-nowrap'
                        >
                          USE WALLET
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor='withdrawAmountNative'>
                        Amount ({contractEarnings?.nativeCurrency || 'Native'})
                      </Label>
                      <div className='flex gap-2'>
                        <Input
                          id='withdrawAmountNative'
                          type='number'
                          step='0.001'
                          placeholder='0.000'
                          value={withdrawAmountNative}
                          onChange={e =>
                            setWithdrawAmountNative(e.target.value)
                          }
                          className='flex-1'
                        />
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setWithdrawAmountNative(
                              contractEarnings.availableNative
                            )
                          }
                          disabled={
                            !contractEarnings.availableNative ||
                            parseFloat(contractEarnings.availableNative) === 0
                          }
                          className='px-3 font-semibold'
                        >
                          MAX
                        </Button>
                      </div>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        Available: {contractEarnings.availableNative}{' '}
                        {contractEarnings.nativeCurrency} ($
                        {contractEarnings.availableUSD.toFixed(2)})
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => withdrawButton.execute(handleWithdraw)}
                    disabled={
                      withdrawButton.isLoading ||
                      !isConnected ||
                      !contractEarnings.availableNative ||
                      parseFloat(contractEarnings.availableNative) === 0
                    }
                    className='w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md transition-all duration-200 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {!isConnected
                      ? 'Connect Wallet to Withdraw'
                      : withdrawButton.buttonContent}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className='flex min-h-[400px] items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin' />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <LoadingWrapper
          isLoading={isReloadingPlans}
          variant='default'
          size='lg'
          label='Reloading plans...'
          className='min-h-[400px]'
        >
          {plansError || contractPlansData?.type === 'configuration_error' ? (
            <Card className='border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
              <CardHeader>
                <CardTitle className='text-amber-700 dark:text-amber-400'>
                  Smart Contract Not Configured
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <p className='text-amber-600 dark:text-amber-300'>
                    {contractPlansData?.error ||
                      'The subscription smart contract is not configured for this network.'}
                  </p>
                  {(contractPlansData?.type === 'configuration_error' ||
                    contractPlansData?.error) && (
                    <div className='rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30'>
                      <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                        Current Network:{' '}
                        {contractPlansData?.chainName || `Chain ${chainId}`}
                      </p>
                      <p className='text-sm text-amber-700 dark:text-amber-300'>
                        Supported chains:{' '}
                        {contractPlansData?.supportedChains?.join(', ') ||
                          'Ethereum, Polygon, Optimism, Arbitrum, Base'}
                      </p>
                      <p className='mt-2 text-sm text-amber-700 dark:text-amber-300'>
                        To manage plans on this network, please deploy the smart
                        contract and configure the contract address in your
                        environment variables.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : contractPlans.length === 0 ? (
            <Card className='border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
              <CardHeader>
                <CardTitle className='text-amber-700 dark:text-amber-400'>
                  No Plans Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <p className='text-amber-600 dark:text-amber-300'>
                    No plans are currently configured in the smart contract.
                  </p>
                  <Button onClick={() => createPlanDialog.open()}>
                    <Plus className='mr-2 h-4 w-4' />
                    Create Your First Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Plans Header */}
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-foreground text-2xl font-bold tracking-tight'>
                    Smart Contract Plan Management
                  </h2>
                  <p className='text-muted-foreground'>
                    Create, edit, and manage subscription plans directly on the
                    blockchain
                  </p>
                </div>
                <Button onClick={() => createPlanDialog.open()}>
                  <Plus className='mr-2 h-4 w-4' />
                  Create Plan
                </Button>
              </div>

              {/* Plans Grid */}
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {contractPlans.map(plan => (
                  <Card
                    key={plan.planKey}
                    className='relative flex h-full flex-col'
                  >
                    <CardHeader>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0 flex-1'>
                          <div className='mb-2 flex flex-wrap items-center gap-2'>
                            <CardTitle className='text-xl break-words'>
                              {plan.displayName}
                            </CardTitle>
                            <Badge
                              variant={plan.isActive ? 'default' : 'secondary'}
                              className='shrink-0'
                            >
                              Plan Key: {plan.planKey}
                            </Badge>
                          </div>
                          <CardDescription className='break-words'>
                            {plan.description}
                          </CardDescription>
                        </div>
                        <div className='flex shrink-0 space-x-2'>
                          {editingPlan === plan.planKey ? (
                            <>
                              <Button
                                size='sm'
                                onClick={() =>
                                  saveButton.execute(handleUpdatePlan)
                                }
                                disabled={
                                  !editPlanForm ||
                                  saveButton.isLoading ||
                                  !isConnected
                                }
                              >
                                {saveButton.buttonContent}
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setEditingPlan(null)
                                  setEditPlanForm(null)
                                }}
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => startEditingPlan(plan)}
                              >
                                <Edit3 className='h-4 w-4' />
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={async () => {
                                  await modalConfirmAsync(
                                    `Are you sure you want to delete the "${plan.displayName}" plan? This action cannot be undone and will be permanently recorded on the blockchain.`,
                                    async () => {
                                      await deleteButton.execute(() =>
                                        handleDeletePlan(plan.planKey)
                                      )
                                    },
                                    {
                                      title: 'Delete Plan',
                                      confirmText: 'Delete Plan',
                                      confirmButtonVariant: 'destructive',
                                      confirmIcon: (
                                        <Trash2 className='h-4 w-4' />
                                      ),
                                      loadingText: 'Deleting plan...'
                                    }
                                  )
                                }}
                                disabled={
                                  plan.planKey === 0 ||
                                  deletingPlanKey === plan.planKey ||
                                  !isConnected
                                } // Can't delete free plan
                              >
                                {deletingPlanKey === plan.planKey ? (
                                  deleteButton.buttonContent
                                ) : (
                                  <Trash2 className='h-4 w-4' />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className='flex-1 space-y-4'>
                      {editingPlan === plan.planKey && editPlanForm ? (
                        <div className='space-y-3'>
                          <div>
                            <Label htmlFor='editDisplayName'>
                              Display Name
                            </Label>
                            <Input
                              id='editDisplayName'
                              value={editPlanForm.displayName}
                              onChange={e =>
                                setEditPlanForm({
                                  ...editPlanForm,
                                  displayName: e.target.value
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor='editSortOrder'>Sort Order</Label>
                            <Input
                              id='editSortOrder'
                              type='number'
                              value={editPlanForm.sortOrder}
                              onChange={e =>
                                setEditPlanForm({
                                  ...editPlanForm,
                                  sortOrder: e.target.value
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor='editPriceUSD'>Price (USD)</Label>
                            <Input
                              id='editPriceUSD'
                              type='number'
                              value={editPlanForm.priceUSD}
                              onChange={e =>
                                setEditPlanForm({
                                  ...editPlanForm,
                                  priceUSD: e.target.value
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor='editMaxMembers'>Max Members</Label>
                            <Input
                              id='editMaxMembers'
                              value={editPlanForm.maxMembers}
                              onChange={e =>
                                setEditPlanForm({
                                  ...editPlanForm,
                                  maxMembers: e.target.value
                                })
                              }
                              placeholder='-1 for unlimited'
                            />
                          </div>
                          <div>
                            <Label>Features</Label>
                            <div className='space-y-2'>
                              {editPlanForm.features.length > 0 ? (
                                editPlanForm.features.map((feature, index) => (
                                  <div key={index} className='flex space-x-2'>
                                    <Input
                                      value={feature}
                                      onChange={e =>
                                        updateFeature(
                                          index,
                                          e.target.value,
                                          true
                                        )
                                      }
                                      placeholder='e.g., 24/7 Support, Advanced Analytics, Priority Updates'
                                    />
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      onClick={() => removeFeature(index, true)}
                                    >
                                      <X className='h-4 w-4' />
                                    </Button>
                                  </div>
                                ))
                              ) : (
                                <div className='text-muted-foreground bg-muted/20 rounded-md border px-3 py-2 text-sm italic'>
                                  No features added yet. Click "Add Feature" to
                                  add plan features.
                                </div>
                              )}
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => addFeature(true)}
                              >
                                <Plus className='mr-2 h-4 w-4' />
                                Add Feature
                              </Button>
                              <p className='text-muted-foreground text-xs'>
                                Add unlimited features to showcase what's
                                included in this plan. Features are optional.
                              </p>
                            </div>
                          </div>
                          <div className='space-y-2'>
                            <div className='flex items-center space-x-2'>
                              <input
                                type='checkbox'
                                id='editIsActive'
                                checked={editPlanForm.isActive}
                                onChange={e =>
                                  setEditPlanForm({
                                    ...editPlanForm,
                                    isActive: e.target.checked
                                  })
                                }
                                className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                              />
                              <Label
                                htmlFor='editIsActive'
                                className='text-sm font-medium'
                              >
                                Plan is active and visible to users
                              </Label>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <input
                                type='checkbox'
                                id='editIsTeamPlan'
                                checked={editPlanForm.isTeamPlan}
                                onChange={e =>
                                  setEditPlanForm({
                                    ...editPlanForm,
                                    isTeamPlan: e.target.checked
                                  })
                                }
                                className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                              />
                              <Label
                                htmlFor='editIsTeamPlan'
                                className='text-sm font-medium'
                              >
                                Team Plan (allows multiple members)
                              </Label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className='text-foreground text-3xl font-bold'>
                              ${plan.priceUSD.toFixed(0)}
                              <span className='text-muted-foreground text-base font-normal'>
                                /month
                              </span>
                            </div>
                            {plan.priceNative !== undefined &&
                              plan.nativeCurrencySymbol && (
                                <p className='text-muted-foreground mt-1 text-sm'>
                                  ≈{' '}
                                  {formatPriceWithCurrency(
                                    plan.priceNative,
                                    plan.nativeCurrencySymbol
                                  )}
                                </p>
                              )}
                          </div>

                          <div className='flex items-center space-x-2'>
                            <Users className='text-muted-foreground h-4 w-4' />
                            <span className='text-foreground text-sm'>
                              {formatTeamMemberLimit(
                                plan.maxMembersFormatted === 'Unlimited'
                                  ? -1
                                  : parseInt(plan.maxMembers)
                              )}
                            </span>
                          </div>

                          <div className='space-y-2'>
                            {plan.features
                              .filter(feature => feature.trim() !== '')
                              .map((feature, index) => (
                                <div
                                  key={index}
                                  className='flex items-center space-x-2'
                                >
                                  <div className='h-2 w-2 rounded-full bg-green-500' />
                                  <span className='text-foreground text-sm'>
                                    {feature}
                                  </span>
                                </div>
                              ))}
                            {plan.features.filter(
                              feature => feature.trim() !== ''
                            ).length === 0 && (
                              <div className='flex items-center space-x-2'>
                                <div className='h-2 w-2 rounded-full bg-gray-400' />
                                <span className='text-muted-foreground text-sm italic'>
                                  No features defined
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                    {editingPlan !== plan.planKey && (
                      <CardFooter className='bg-muted/50 border-t pt-4'>
                        <div className='flex w-full items-center justify-between'>
                          <Badge
                            variant={plan.isActive ? 'default' : 'secondary'}
                          >
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className='text-muted-foreground text-xs'>
                            Order: {plan.sortOrder}
                          </span>
                        </div>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>

              {/* Create Plan Modal */}
              <ModalDialog
                open={createPlanDialog.isOpen}
                onOpenChange={open => {
                  open ? createPlanDialog.open() : createPlanDialog.close()
                  if (!open) {
                    resetCreatePlanForm()
                  }
                }}
                title='Create New Plan on Smart Contract'
                description='Create a new subscription plan directly on the blockchain.'
                useDialog={true}
                showCloseButton={true}
                contentClassName='max-h-[90vh] max-w-2xl overflow-y-auto'
                confirmText={
                  !isConnected ? 'Connect Wallet to Create Plan' : 'Create Plan'
                }
                cancelText='Cancel'
                confirmButtonVariant='default'
                disableConfirmButton={
                  createPlanButton.isLoading || !isConnected
                }
                asyncAction={true}
                loadingText='Creating plan...'
                onConfirm={() => createPlanButton.execute(handleCreatePlan)}
                onCancel={() => {
                  createPlanDialog.close()
                  resetCreatePlanForm()
                }}
                content={
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <Label htmlFor='planName'>Plan Name (ID)</Label>
                        <Input
                          id='planName'
                          placeholder='e.g., premium'
                          value={createPlanForm.name}
                          onChange={e =>
                            setCreatePlanForm(prev => ({
                              ...prev,
                              name: e.target.value
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor='planDisplayName'>Display Name</Label>
                        <Input
                          id='planDisplayName'
                          placeholder='e.g., Premium Plan'
                          value={createPlanForm.displayName}
                          onChange={e =>
                            setCreatePlanForm(prev => ({
                              ...prev,
                              displayName: e.target.value
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor='planSortOrder'>Sort Order</Label>
                      <Input
                        id='planSortOrder'
                        type='number'
                        placeholder='0'
                        value={createPlanForm.sortOrder}
                        onChange={e =>
                          setCreatePlanForm(prev => ({
                            ...prev,
                            sortOrder: e.target.value
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor='planDescription'>Description</Label>
                      <Input
                        id='planDescription'
                        placeholder='Brief description of the plan'
                        value={createPlanForm.description}
                        onChange={e =>
                          setCreatePlanForm(prev => ({
                            ...prev,
                            description: e.target.value
                          }))
                        }
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <Label htmlFor='planPriceUSD'>Price (USD)</Label>
                        <Input
                          id='planPriceUSD'
                          type='number'
                          placeholder='29'
                          value={createPlanForm.priceUSD}
                          onChange={e =>
                            setCreatePlanForm(prev => ({
                              ...prev,
                              priceUSD: e.target.value
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor='planMaxMembers'>Max Members</Label>
                        <Input
                          id='planMaxMembers'
                          placeholder='25 (or -1 for unlimited)'
                          value={createPlanForm.maxMembers}
                          onChange={e =>
                            setCreatePlanForm(prev => ({
                              ...prev,
                              maxMembers: e.target.value
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Features</Label>
                      <div className='space-y-2'>
                        {createPlanForm.features.length > 0 ? (
                          createPlanForm.features.map((feature, index) => (
                            <div key={index} className='flex space-x-2'>
                              <Input
                                placeholder='e.g., 24/7 Support, Advanced Analytics, Priority Updates'
                                value={feature}
                                onChange={e =>
                                  updateFeature(index, e.target.value)
                                }
                              />
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => removeFeature(index)}
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className='text-muted-foreground bg-muted/20 rounded-md border px-3 py-2 text-sm italic'>
                            No features added yet. Click "Add Feature" to add
                            plan features.
                          </div>
                        )}
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => addFeature()}
                        >
                          <Plus className='mr-2 h-4 w-4' />
                          Add Feature
                        </Button>
                        <p className='text-muted-foreground text-xs'>
                          Add unlimited features to showcase what's included in
                          this plan. Features are optional.
                        </p>
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                      <div className='flex items-center space-x-2'>
                        <input
                          type='checkbox'
                          id='planIsActive'
                          checked={createPlanForm.isActive}
                          onChange={e =>
                            setCreatePlanForm(prev => ({
                              ...prev,
                              isActive: e.target.checked
                            }))
                          }
                          className='rounded'
                        />
                        <Label htmlFor='planIsActive'>Active Plan</Label>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <input
                          type='checkbox'
                          id='planIsTeamPlan'
                          checked={createPlanForm.isTeamPlan}
                          onChange={e =>
                            setCreatePlanForm(prev => ({
                              ...prev,
                              isTeamPlan: e.target.checked
                            }))
                          }
                          className='rounded'
                        />
                        <Label htmlFor='planIsTeamPlan'>Team Plan</Label>
                      </div>
                    </div>
                  </div>
                }
              />
            </>
          )}
        </LoadingWrapper>
      )}
    </div>
  )
}
