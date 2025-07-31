'use client'

import { useState, useMemo } from 'react'

import {
  DollarSign,
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  Clock,
  Pause,
  Play,
  Settings,
  Gavel,
  FileText,
  Hash
} from 'lucide-react'
import useSWR from 'swr'

import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import {
  ContractInfoCard,
  ContractTabs,
  ContractStatsCard,
  ContractEarningsCard,
  ContractSettingsCard,
  type ContractTab,
  type StatItem,
  type SettingField
} from '@/components/blocks/smart-contract'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiEndpoints } from '@/config/api-endpoints'
import { useUnifiedWalletInfo, useUnifiedChainInfo } from '@/context'
import {
  useAdminTransaction,
  useTransaction
} from '@/hooks/blockchain/use-transaction'
import { useLoading } from '@/hooks/use-loading'
import { cn } from '@/lib'
import { swrFetcher } from '@/lib/api/swr'
import {
  DEFAULT_CHAIN_ID,
  isSupportedChainId,
  getEscrowCoreAddress,
  ESCROW_CORE_ABI
} from '@/lib/blockchain'

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  FUNDED: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-green-100 text-green-800'
}

export function EscrowManager() {
  // Wallet and chain state
  const { chainId } = useUnifiedChainInfo()
  const { isConnected, address: walletAddress } = useUnifiedWalletInfo()
  const { executeTransaction } = useAdminTransaction()
  const { executeTransaction: executeEscrowTransaction } = useTransaction({
    showToast: true,
    dismissibleToast: false
  })

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Form states
  const [newFeePercentage, setNewFeePercentage] = useState('')
  const [newDisputeWindow, setNewDisputeWindow] = useState('')
  const [selectedDispute, setSelectedDispute] = useState<number | null>(null)
  const [disputeResolution, setDisputeResolution] = useState<
    'refund' | 'release'
  >('refund')
  const [disputeReason, setDisputeReason] = useState('')

  // Loading hooks
  const updateFeeButton = useLoading({
    defaultText: 'Update Fee',
    loadingText: 'Updating',
    icon: <Settings className='h-4 w-4' />,
    withButton: true
  })

  const updateWindowButton = useLoading({
    defaultText: 'Update Window',
    loadingText: 'Updating',
    icon: <Clock className='h-4 w-4' />,
    withButton: true
  })

  const resolveDisputeButton = useLoading({
    defaultText: 'Resolve Dispute',
    loadingText: 'Processing',
    icon: <Gavel className='h-4 w-4' />,
    withButton: true
  })

  const pauseButton = useLoading({
    defaultText: 'Pause Contract',
    loadingText: 'Processing',
    icon: <Pause className='h-4 w-4' />,
    withButton: true
  })

  // Determine effective chain ID
  const effectiveChainId =
    chainId && isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID
  const escrowAddress = getEscrowCoreAddress(effectiveChainId)

  // Fetch contract data
  const { data: statsData, error: statsError } = useSWR(
    `${apiEndpoints.admin.contract.escrow.stats}?chainId=${effectiveChainId}`,
    swrFetcher
  )

  const { data: escrowsData, error: escrowsError } = useSWR(
    activeTab === 'escrows' || activeTab === 'disputes'
      ? `${apiEndpoints.admin.contract.escrow.list}?chainId=${effectiveChainId}&type=${activeTab === 'disputes' ? 'disputed' : 'active'}`
      : null,
    swrFetcher
  )

  // Tab definitions
  const tabs: ContractTab[] = [
    { id: 'overview', label: 'Overview & Earnings', icon: Activity },
    { id: 'escrows', label: 'Active Escrows', icon: FileText },
    { id: 'disputes', label: 'Dispute Management', icon: AlertTriangle },
    { id: 'settings', label: 'Contract Settings', icon: Settings }
  ]

  // Stats for overview
  const overviewStats: StatItem[] = useMemo(() => {
    if (!statsData?.stats) return []
    const { stats } = statsData
    return [
      {
        title: 'Total Escrows',
        value: stats.totalEscrows,
        trend: {
          value: stats.activeEscrows,
          label: 'active',
          isPositive: true
        },
        icon: TrendingUp,
        iconColor: 'text-green-600'
      },
      {
        title: 'Total Volume',
        value: `${stats.totalVolume} ${stats.nativeCurrency}`,
        subtitle: `Avg: ${stats.averageEscrowValue} ${stats.nativeCurrency}`
      },
      {
        title: 'Dispute Rate',
        value: `${stats.disputeRate}%`,
        trend: {
          value: stats.disputedEscrows,
          label: 'disputes'
        },
        icon: AlertTriangle,
        iconColor: 'text-orange-600'
      },
      {
        title: 'Avg Completion',
        value: `${stats.averageCompletionTime}h`,
        trend: {
          value: stats.completedEscrows,
          label: 'completed',
          isPositive: true
        },
        icon: Clock,
        iconColor: 'text-blue-600'
      }
    ]
  }, [statsData])

  // Handlers
  const handleWithdrawFees = async (address: string, amount: string) => {
    if (!isConnected) {
      showErrorToast(
        'Wallet not connected',
        'Please connect your wallet to withdraw fees'
      )
      throw new Error('Wallet not connected')
    }

    await executeEscrowTransaction(
      {
        address: escrowAddress as `0x${string}`,
        abi: ESCROW_CORE_ABI,
        functionName: 'withdrawFees',
        args: [], // withdrawFees takes no parameters
        chainId: effectiveChainId
      },
      {
        messages: {
          pendingMessage: 'Withdrawing fees...',
          processingMessage: 'Processing withdrawal...',
          confirmedMessage: 'Fees withdrawn successfully!',
          failedMessage: 'Failed to withdraw fees'
        },
        onSuccess: () => {
          showSuccessToast(
            'Withdrawal successful',
            'Fees have been withdrawn to the fee recipient address'
          )
        }
      }
    )
  }

  const handleUpdateFee = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    if (!newFeePercentage) {
      showErrorToast('Missing fee', 'Please enter new fee percentage')
      return
    }

    await updateFeeButton.execute(async () => {
      await executeEscrowTransaction(
        {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'updateBaseFeePercentage',
          args: [parseFloat(newFeePercentage) * 100], // Convert to basis points
          chainId: effectiveChainId
        },
        {
          messages: {
            pendingMessage: 'Updating fee percentage...',
            processingMessage: 'Processing fee update...',
            confirmedMessage: 'Fee percentage updated successfully!',
            failedMessage: 'Failed to update fee percentage'
          },
          onSuccess: () => {
            showSuccessToast('Fee updated', `New fee: ${newFeePercentage}%`)
            setNewFeePercentage('')
          }
        }
      )
    })
  }

  const handleUpdateWindow = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    if (!newDisputeWindow) {
      showErrorToast('Missing window', 'Please enter dispute window in days')
      return
    }

    await updateWindowButton.execute(async () => {
      await executeEscrowTransaction(
        {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'updateDefaultDisputeWindow',
          args: [parseInt(newDisputeWindow) * 86400], // Convert days to seconds
          chainId: effectiveChainId
        },
        {
          messages: {
            pendingMessage: 'Updating dispute window...',
            processingMessage: 'Processing window update...',
            confirmedMessage: 'Dispute window updated successfully!',
            failedMessage: 'Failed to update dispute window'
          },
          onSuccess: () => {
            showSuccessToast(
              'Window updated',
              `New window: ${newDisputeWindow} days`
            )
            setNewDisputeWindow('')
          }
        }
      )
    })
  }

  const handleResolveDispute = async () => {
    if (!isConnected || selectedDispute === null) {
      showErrorToast(
        'Cannot resolve',
        'Please connect wallet and select a dispute'
      )
      return
    }

    await resolveDisputeButton.execute(async () => {
      await executeEscrowTransaction(
        {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'resolveDispute',
          args: [
            selectedDispute,
            disputeResolution === 'refund',
            disputeReason
          ],
          chainId: effectiveChainId
        },
        {
          messages: {
            pendingMessage: 'Resolving dispute...',
            processingMessage: 'Processing dispute resolution...',
            confirmedMessage: 'Dispute resolved successfully!',
            failedMessage: 'Failed to resolve dispute'
          },
          onSuccess: () => {
            showSuccessToast(
              'Dispute resolved',
              `Escrow #${selectedDispute} ${disputeResolution === 'refund' ? 'refunded to buyer' : 'released to seller'}`
            )
            setSelectedDispute(null)
            setDisputeReason('')
          }
        }
      )
    })
  }

  const handlePauseContract = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    const isPaused = statsData?.settings?.isPaused

    await pauseButton.execute(async () => {
      await executeEscrowTransaction(
        {
          address: escrowAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: isPaused ? 'unpause' : 'pause',
          args: [],
          chainId: effectiveChainId
        },
        {
          messages: {
            pendingMessage: isPaused
              ? 'Resuming contract...'
              : 'Pausing contract...',
            processingMessage: isPaused
              ? 'Processing resume...'
              : 'Processing pause...',
            confirmedMessage: isPaused
              ? 'Contract resumed successfully!'
              : 'Contract paused successfully!',
            failedMessage: isPaused
              ? 'Failed to resume contract'
              : 'Failed to pause contract'
          },
          onSuccess: () => {
            showSuccessToast(
              isPaused ? 'Contract resumed' : 'Contract paused',
              isPaused ? 'Contract is now active' : 'Contract is now paused'
            )
          }
        }
      )
    })
  }

  // Settings fields
  const feeSettings: SettingField[] = [
    {
      label: 'Current Fee',
      value: `${statsData?.settings?.feePercentage || 0}%`
    },
    {
      label: 'New Fee Percentage',
      input: (
        <Input
          type='number'
          step='0.1'
          min='0'
          max='10'
          placeholder='2.5'
          value={newFeePercentage}
          onChange={e => setNewFeePercentage(e.target.value)}
        />
      ),
      description: 'Enter value between 0% and 10%',
      action: {
        label: updateFeeButton.buttonContent as string,
        onClick: handleUpdateFee,
        disabled: updateFeeButton.isLoading || !isConnected
      }
    }
  ]

  const windowSettings: SettingField[] = [
    {
      label: 'Current Window',
      value: `${(statsData?.settings?.disputeWindow || 0) / 86400} days`
    },
    {
      label: 'New Window (days)',
      input: (
        <Input
          type='number'
          min='1'
          max='30'
          placeholder='7'
          value={newDisputeWindow}
          onChange={e => setNewDisputeWindow(e.target.value)}
        />
      ),
      description: 'Enter value between 1 and 30 days',
      action: {
        label: updateWindowButton.buttonContent as string,
        onClick: handleUpdateWindow,
        disabled: updateWindowButton.isLoading || !isConnected
      }
    }
  ]

  const contractControlSettings: SettingField[] = [
    {
      label: 'Contract Status',
      description: statsData?.settings?.isPaused
        ? 'Contract is paused'
        : 'Contract is active',
      badge: {
        label: statsData?.settings?.isPaused ? 'Paused' : 'Active',
        variant: statsData?.settings?.isPaused ? 'secondary' : 'default'
      },
      action: {
        label: statsData?.settings?.isPaused
          ? 'Resume Contract'
          : 'Pause Contract',
        onClick: handlePauseContract,
        disabled: pauseButton.isLoading || !isConnected,
        variant: statsData?.settings?.isPaused ? 'default' : 'destructive'
      }
    }
  ]

  if (statsError || statsData?.type === 'configuration_error') {
    return (
      <div className='space-y-6'>
        <Card className='border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
          <CardHeader>
            <CardTitle className='text-amber-700 dark:text-amber-400'>
              Smart Contract Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <p className='text-amber-600 dark:text-amber-300'>
                {statsData?.error ||
                  'The escrow smart contract is not configured for this network.'}
              </p>
              {statsData && (
                <div className='rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30'>
                  <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                    Current Network: {statsData.chainName || `Chain ${chainId}`}
                  </p>
                  <p className='text-sm text-amber-700 dark:text-amber-300'>
                    Supported chains: {statsData.supportedChains?.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Contract Info Card */}
      {escrowAddress && statsData?.contractInfo && (
        <ContractInfoCard
          title='Escrow Core Contract'
          contractAddress={escrowAddress}
          chainId={effectiveChainId}
          chainName={statsData.contractInfo.chainName}
          status={statsData.settings?.isPaused ? 'paused' : 'active'}
        />
      )}

      {/* Navigation Tabs */}
      <ContractTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && statsData && (
        <div className='space-y-6'>
          <ContractStatsCard stats={overviewStats} columns={4} />

          <ContractEarningsCard
            title='Withdraw Escrow Fees'
            description='Withdraw accumulated fees from completed escrows'
            earnings={{
              total: statsData.stats.totalFeesCollected,
              available: statsData.stats.availableFees,
              withdrawn: (
                parseFloat(statsData.stats.totalFeesCollected) -
                parseFloat(statsData.stats.availableFees)
              ).toFixed(4),
              currency: statsData.stats.nativeCurrency
            }}
            walletAddress={walletAddress}
            isConnected={isConnected}
            onWithdraw={handleWithdrawFees}
            showUSD={false}
          />
        </div>
      )}

      {/* Active Escrows Tab */}
      {activeTab === 'escrows' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Escrows</CardTitle>
            <CardDescription>
              View and manage all escrow transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {escrowsData?.escrows?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrowsData.escrows.map((escrow: any) => (
                    <TableRow key={escrow.escrowId}>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Hash className='text-muted-foreground h-3 w-3' />
                          {escrow.escrowId}
                        </div>
                      </TableCell>
                      <TableCell className='font-mono text-xs'>
                        {escrow.buyer.slice(0, 6)}...{escrow.buyer.slice(-4)}
                      </TableCell>
                      <TableCell className='font-mono text-xs'>
                        {escrow.seller.slice(0, 6)}...{escrow.seller.slice(-4)}
                      </TableCell>
                      <TableCell>
                        {escrow.amount} {escrow.nativeCurrency}
                      </TableCell>
                      <TableCell>
                        {escrow.fee} {escrow.nativeCurrency}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(statusColors[escrow.status])}>
                          {escrow.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(escrow.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className='text-muted-foreground py-8 text-center'>
                No active escrows found
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Active Disputes</CardTitle>
              <CardDescription>
                Review and resolve escrow disputes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escrowsData?.escrows?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Escrow ID</TableHead>
                      <TableHead>Parties</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escrowsData.escrows.map((escrow: any) => (
                      <TableRow key={escrow.escrowId}>
                        <TableCell>#{escrow.escrowId}</TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='text-xs'>
                              <span className='text-muted-foreground'>
                                Buyer:
                              </span>{' '}
                              {escrow.buyer.slice(0, 6)}...
                              {escrow.buyer.slice(-4)}
                            </div>
                            <div className='text-xs'>
                              <span className='text-muted-foreground'>
                                Seller:
                              </span>{' '}
                              {escrow.seller.slice(0, 6)}...
                              {escrow.seller.slice(-4)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {escrow.amount} {escrow.nativeCurrency}
                        </TableCell>
                        <TableCell>
                          {new Date(escrow.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setSelectedDispute(escrow.escrowId)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='text-muted-foreground py-8 text-center'>
                  No disputed escrows found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dispute Resolution Form */}
          {selectedDispute && (
            <Card>
              <CardHeader>
                <CardTitle>Resolve Dispute #{selectedDispute}</CardTitle>
                <CardDescription>
                  Review the evidence and make a resolution decision
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <Label>Resolution Decision</Label>
                  <Select
                    value={disputeResolution}
                    onValueChange={(value: 'refund' | 'release') =>
                      setDisputeResolution(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='refund'>Refund to Buyer</SelectItem>
                      <SelectItem value='release'>Release to Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor='disputeReason'>Resolution Reason</Label>
                  <Textarea
                    id='disputeReason'
                    placeholder='Provide detailed reasoning for this resolution...'
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className='flex gap-2'>
                  <Button
                    onClick={handleResolveDispute}
                    disabled={resolveDisputeButton.isLoading || !disputeReason}
                    className='flex-1'
                  >
                    {resolveDisputeButton.buttonContent}
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setSelectedDispute(null)
                      setDisputeReason('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <ContractSettingsCard
            title='Fee Configuration'
            description='Adjust the platform fee percentage for escrows'
            settings={feeSettings}
          />

          <ContractSettingsCard
            title='Dispute Window'
            description='Set the default dispute window period'
            settings={windowSettings}
          />

          <ContractSettingsCard
            title='Contract Control'
            description='Pause or resume the escrow contract'
            settings={contractControlSettings}
          />

          <Card>
            <CardHeader>
              <CardTitle>Fee Recipient</CardTitle>
              <CardDescription>
                Current address receiving platform fees
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label>Current Recipient</Label>
                <code className='bg-muted block rounded p-2 font-mono text-xs break-all'>
                  {statsData?.settings?.feeRecipient || '0x0000...0000'}
                </code>
              </div>
              <Button
                variant='outline'
                disabled={!isConnected}
                className='w-full'
              >
                Update Recipient
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
