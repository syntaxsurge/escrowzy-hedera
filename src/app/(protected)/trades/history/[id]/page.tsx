'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

import {
  MessageSquare,
  Shield,
  TrendingUp,
  Zap,
  ArrowLeft,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  Trophy,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Globe
} from 'lucide-react'
import useSWR from 'swr'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

import { TradeTimeline } from '@/components/blocks/trade-timeline'
import {
  GamifiedHeader,
  GamifiedStatsCards,
  ActionAlert,
  SellerDepositTimer,
  RaiseDisputeButton,
  type StatCard
} from '@/components/blocks/trading'
import { UserAvatar } from '@/components/blocks/user-avatar'
import { navigationProgress } from '@/components/providers/navigation-progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { apiEndpoints } from '@/config/api-endpoints'
import { refreshIntervals, appRoutes } from '@/config/app-routes'
import { useSession } from '@/hooks/use-session'
import { useTradeRealtime } from '@/hooks/use-trade-realtime'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'
import { getChainConfig, buildTxUrl } from '@/lib/blockchain'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'
import type { TradeWithUsers, TradeMetadata } from '@/types/trade'

import { TradeActionDialog } from '../../active/trade-action-dialog'

export default function TradeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useSession()
  const tradeId = params.id as string

  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<
    | 'deposit'
    | 'fund'
    | 'payment_sent'
    | 'confirm'
    | 'dispute'
    | 'cancel'
    | null
  >(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<Array<{ src: string }>>(
    []
  )

  // Fetch trade details
  const {
    data: trade,
    error,
    isLoading,
    mutate
  } = useSWR(
    apiEndpoints.trades.byId(tradeId),
    async () => {
      const res = await api.get(apiEndpoints.trades.byId(tradeId))
      return res.success ? res.data : null
    },
    {
      refreshInterval: refreshIntervals.MEDIUM,
      revalidateOnFocus: true
    }
  )

  // Real-time trade updates
  const handleTradeUpdate = useCallback(
    (updatedTrade: TradeWithUsers) => {
      if (updatedTrade.id.toString() === tradeId) {
        mutate(updatedTrade, false)
      }
    },
    [tradeId, mutate]
  )

  const handleStatusChange = useCallback(
    (tradeIdUpdated: number, newStatus: string) => {
      if (tradeIdUpdated.toString() === tradeId) {
        console.log(`Trade ${tradeIdUpdated} status changed to ${newStatus}`)
      }
    },
    [tradeId]
  )

  // Set up real-time listeners
  useTradeRealtime({
    userId: user?.id,
    onTradeUpdate: handleTradeUpdate,
    onStatusChange: handleStatusChange
  })

  if (isLoading) {
    return (
      <div className='container mx-auto py-6'>
        <div className='flex justify-center py-12'>
          <Spinner size='lg' />
        </div>
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className='container mx-auto py-6'>
        <Card className='p-8 text-center'>
          <p className='text-destructive mb-4'>Failed to load trade details</p>
          <Button
            variant='outline'
            onClick={() => {
              navigationProgress.start()
              router.push(appRoutes.trades.active)
            }}
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Active Trades
          </Button>
        </Card>
      </div>
    )
  }

  const isBuyer = user?.id === trade.buyerId
  const isSeller = user?.id === trade.sellerId
  const otherParty = isBuyer ? trade.seller : trade.buyer
  const userRole = isSeller ? 'seller' : 'buyer'
  const metadata = trade.metadata as TradeMetadata | null

  // Get action button config
  const getActionButton = () => {
    if (trade.status === 'awaiting_deposit' && isSeller) {
      return {
        action: 'deposit',
        label: 'Deposit Crypto to Escrow',
        icon: <Shield className='h-5 w-5' />,
        variant: 'default' as const,
        className:
          'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0'
      }
    }

    // For domain trades: seller marks domain transferred after buyer funds
    // For P2P trades: buyer marks payment sent after seller deposits
    if (trade.status === 'funded') {
      if (trade.listingCategory === 'domain' && isSeller) {
        return {
          action: 'payment_sent',
          label: 'Mark Domain Transferred to Admin',
          icon: <Globe className='h-5 w-5' />,
          variant: 'default' as const,
          className:
            'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0'
        }
      } else if (trade.listingCategory !== 'domain' && isBuyer) {
        return {
          action: 'payment_sent',
          label: 'Mark Payment Sent',
          icon: <DollarSign className='h-5 w-5' />,
          variant: 'default' as const,
          className:
            'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0'
        }
      }
    }

    if (trade.status === 'payment_sent') {
      // For domain trades: buyer confirms domain receipt
      // For P2P trades: seller confirms payment receipt
      if (trade.listingCategory === 'domain' && isBuyer) {
        return {
          action: 'confirm',
          label: 'Confirm Domain Receipt & Release Payment',
          icon: <Shield className='h-5 w-5' />,
          variant: 'default' as const,
          className:
            'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white border-0'
        }
      } else if (trade.listingCategory !== 'domain' && isSeller) {
        return {
          action: 'confirm',
          label: 'Confirm Payment & Release Crypto',
          icon: <Shield className='h-5 w-5' />,
          variant: 'default' as const,
          className:
            'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white border-0'
        }
      }
    }

    if (trade.status === 'created' && isBuyer) {
      return {
        action: 'fund',
        label: 'Fund Escrow',
        icon: <Shield className='h-5 w-5' />,
        variant: 'default' as const,
        className:
          'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white border-0'
      }
    }

    return null
  }

  const actionButton = getActionButton()

  const handleAction = (action: string) => {
    setActionType(action as any)
    setActionDialogOpen(true)
  }

  const handleActionSuccess = () => {
    setActionDialogOpen(false)
    setActionType(null)
    mutate()
  }

  // Calculate stats for the trade
  const getTradeStats = (): StatCard[] => {
    const stats: StatCard[] = [
      {
        title: 'Trade Amount',
        value: formatCurrency(trade.amount, trade.currency),
        icon: <DollarSign className='h-5 w-5 text-white' />,
        badge: trade.currency,
        colorScheme: 'blue'
      },
      {
        title: 'Trade Status',
        value: trade.status.replace(/_/g, ' ').toUpperCase(),
        icon: <Clock className='h-5 w-5 text-white' />,
        badge: 'LIVE',
        colorScheme:
          trade.status === 'completed'
            ? 'green'
            : trade.status === 'disputed'
              ? 'red'
              : 'yellow'
      },
      {
        title: 'Your Role',
        value: userRole.toUpperCase(),
        icon: <Users className='h-5 w-5 text-white' />,
        badge: isBuyer ? 'BUYER' : 'SELLER',
        colorScheme: isBuyer ? 'purple' : 'orange'
      },
      {
        title: 'Network',
        value: getChainConfig(trade.chainId)?.name || `Chain ${trade.chainId}`,
        icon: <Zap className='h-5 w-5 text-white' />,
        badge: 'BLOCKCHAIN',
        colorScheme: 'blue'
      }
    ]

    return stats
  }

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Back Button */}
        <Button
          variant='ghost'
          onClick={() => {
            navigationProgress.start()
            router.push(appRoutes.trades.active)
          }}
          className='group hover:bg-primary/10 flex items-center gap-2 font-bold'
        >
          <ArrowLeft className='h-4 w-4 transition-transform group-hover:-translate-x-1' />
          Back to Active Trades
        </Button>

        {/* Gaming Header */}
        <GamifiedHeader
          title={`TRADE #${trade.id}`}
          subtitle='Complete trade details and timeline'
          icon={<TrendingUp className='h-8 w-8 text-white' />}
          actions={
            <div className='flex gap-3'>
              <Button
                onClick={() => {
                  navigationProgress.start()
                  router.push(appRoutes.chat.trades(trade.id.toString()))
                }}
                className='group relative overflow-hidden border-2 border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30'
              >
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                <MessageSquare className='mr-2 h-5 w-5 animate-pulse' />
                <span className='relative z-10'>OPEN CHAT</span>
              </Button>
              {actionButton && (
                <Button
                  onClick={() => handleAction(actionButton.action)}
                  className={cn(
                    'font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl',
                    actionButton.className
                  )}
                >
                  <span className='relative z-10 flex items-center gap-2'>
                    {actionButton.icon}
                    {actionButton.label}
                  </span>
                </Button>
              )}
            </div>
          }
        />

        {/* Gaming Stats Dashboard */}
        <GamifiedStatsCards cards={getTradeStats()} />

        {/* Deposit Timer Alert */}
        {trade.status === 'awaiting_deposit' && trade.depositDeadline && (
          <SellerDepositTimer
            depositDeadline={trade.depositDeadline}
            isSeller={isSeller}
            className='mb-6'
          />
        )}

        {trade.status === 'disputed' && (
          <ActionAlert
            title='⚠️ TRADE UNDER DISPUTE'
            description='This trade is currently under dispute resolution. Our team will review and resolve it within 24-48 hours.'
            icon={<AlertCircle className='h-6 w-6 text-white' />}
            actionCount={1}
            variant='danger'
          />
        )}

        {/* Dispute Button for Completed/Cancelled/Refunded Trades */}
        <RaiseDisputeButton trade={trade} variant='card' onSuccess={mutate} />

        <div className='grid gap-8 lg:grid-cols-3'>
          {/* Left Column - Trade Info */}
          <div className='space-y-6 lg:col-span-2'>
            {/* Timeline */}
            <TradeTimeline
              status={trade.status}
              createdAt={trade.createdAt}
              completedAt={trade.completedAt}
              metadata={metadata}
              chainId={trade.chainId}
              listingCategory={trade.listingCategory}
            />

            {/* Trade Details Card */}
            <Card className='from-background via-muted/50 to-primary/5 dark:to-primary/10 border-2 bg-gradient-to-br backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-xl font-black'>
                  <Shield className='text-primary h-6 w-6' />
                  TRADE DETAILS
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Amount Section */}
                <div className='from-primary/20 border-primary/30 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br via-purple-600/20 to-pink-600/20 p-5 backdrop-blur-sm'>
                  <div className='bg-grid-white/5 dark:bg-grid-white/10 absolute inset-0' />
                  <div className='relative text-center'>
                    <p className='text-muted-foreground mb-2 text-sm font-bold tracking-wider uppercase'>
                      💎 Trade Amount
                    </p>
                    <div className='relative inline-block'>
                      <p className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-4xl font-black text-transparent'>
                        {formatCurrency(trade.amount, trade.currency)}
                      </p>
                    </div>
                    {metadata?.escrowNetAmount && isSeller && (
                      <div className='mt-3 space-y-1'>
                        <div className='text-sm font-bold text-green-600 dark:text-green-400'>
                          NET:{' '}
                          {formatCurrency(
                            metadata.escrowNetAmount,
                            trade.currency
                          )}
                        </div>
                        <div className='text-xs font-medium text-green-600/80 dark:text-green-400/80'>
                          -2.5% FEE
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method & Network */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='from-muted/50 to-muted/30 border-border/50 rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm'>
                    <p className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                      ⚡ Payment Method
                    </p>
                    <p className='mt-1 text-lg font-bold'>
                      {metadata?.paymentMethod || 'Bank Transfer'}
                    </p>
                  </div>
                  <div className='from-muted/50 to-muted/30 border-border/50 rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm'>
                    <p className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                      🔗 Network
                    </p>
                    <p className='mt-1 text-lg font-bold'>
                      {getChainConfig(trade.chainId)?.name ||
                        `Chain ${trade.chainId}`}
                    </p>
                  </div>
                </div>

                {/* Payment Proof */}
                {metadata?.paymentProofImages &&
                  metadata.paymentProofImages.length > 0 && (
                    <div className='space-y-3'>
                      <h4 className='flex items-center gap-2 text-sm font-bold tracking-wider uppercase'>
                        <ImageIcon className='h-4 w-4' />
                        Payment Proof
                      </h4>
                      <div className='grid grid-cols-3 gap-3'>
                        {metadata.paymentProofImages.map(
                          (image: string, index: number) => (
                            <button
                              key={index}
                              onClick={() => {
                                setLightboxImages([{ src: image }])
                                setLightboxOpen(true)
                              }}
                              className='group relative aspect-video overflow-hidden rounded-lg border-2 border-green-300 bg-green-50 transition-all hover:scale-105 hover:border-green-500 dark:border-green-700 dark:bg-green-950'
                            >
                              <img
                                src={image}
                                alt={`Payment proof ${index + 1}`}
                                className='h-full w-full object-cover'
                              />
                              <div className='absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100'>
                                <Eye className='h-8 w-8 text-white' />
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Dispute Evidence */}
                {trade.status === 'disputed' &&
                  (metadata?.disputeReason ||
                    metadata?.disputeEvidence ||
                    metadata?.disputeEvidenceImages) && (
                    <div className='space-y-3'>
                      <h4 className='flex items-center gap-2 text-sm font-bold tracking-wider uppercase'>
                        <AlertCircle className='h-4 w-4 text-red-500' />
                        Dispute Evidence
                      </h4>
                      <div className='space-y-3'>
                        {/* Dispute Reason */}
                        {metadata.disputeReason && (
                          <div className='rounded-lg bg-red-50 p-3 dark:bg-red-950'>
                            <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                              Reason:
                            </p>
                            <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                              {metadata.disputeReason}
                            </p>
                          </div>
                        )}

                        {/* Dispute Text Evidence */}
                        {metadata.disputeEvidence && (
                          <div className='rounded-lg bg-red-50 p-3 dark:bg-red-950'>
                            <p className='text-sm font-medium text-red-800 dark:text-red-200'>
                              Additional Evidence:
                            </p>
                            <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                              {metadata.disputeEvidence}
                            </p>
                          </div>
                        )}

                        {/* Dispute Images */}
                        {metadata.disputeEvidenceImages && (
                          <div className='grid grid-cols-3 gap-3'>
                            {metadata.disputeEvidenceImages
                              .split(',')
                              .filter(Boolean)
                              .map((image: string, index: number) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setLightboxImages([
                                      {
                                        src: image
                                      }
                                    ])
                                    setLightboxOpen(true)
                                  }}
                                  className='group relative aspect-video overflow-hidden rounded-lg border-2 border-red-300 bg-red-50 transition-all hover:scale-105 hover:border-red-500 dark:border-red-700 dark:bg-red-950'
                                >
                                  <img
                                    src={image}
                                    alt={`Dispute evidence ${index + 1}`}
                                    className='h-full w-full object-cover'
                                  />
                                  <div className='absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100'>
                                    <Eye className='h-8 w-8 text-white' />
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Transaction Hashes */}
                {metadata?.cryptoDepositTxHash && (
                  <a
                    href={buildTxUrl(
                      trade.chainId,
                      metadata.cryptoDepositTxHash
                    )}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group relative block overflow-hidden rounded-xl border-2 border-green-500/50 bg-gradient-to-br from-green-500/20 via-emerald-600/20 to-teal-600/20 p-4 backdrop-blur-sm transition-all hover:scale-105 hover:border-green-500 hover:shadow-xl hover:shadow-green-500/20'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='relative'>
                          <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-green-500 to-emerald-600 opacity-75 blur-lg' />
                          <div className='relative rounded-full bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 p-2 shadow-xl'>
                            <Shield className='h-5 w-5 text-white' />
                          </div>
                        </div>
                        <div className='flex-1'>
                          <p className='font-bold text-green-600 dark:text-green-400'>
                            Crypto Secured in Escrow
                          </p>
                          <div className='mt-1 flex items-center gap-2'>
                            <p className='font-mono text-xs text-green-600/80 dark:text-green-400/80'>
                              {metadata.cryptoDepositTxHash.slice(0, 10)}...
                              {metadata.cryptoDepositTxHash.slice(-8)}
                            </p>
                            <span className='text-xs text-green-600/60 dark:text-green-400/60'>
                              Click to view on explorer →
                            </span>
                          </div>
                        </div>
                      </div>
                      <ExternalLink className='h-4 w-4 text-green-600/60 transition-transform group-hover:scale-110' />
                    </div>
                  </a>
                )}

                {/* Release Transaction Hash */}
                {metadata?.claimTxHash && (
                  <a
                    href={buildTxUrl(trade.chainId, metadata.claimTxHash)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group relative block overflow-hidden rounded-xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 via-amber-600/20 to-orange-600/20 p-4 backdrop-blur-sm transition-all hover:scale-105 hover:border-yellow-500 hover:shadow-xl hover:shadow-yellow-500/20'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='relative'>
                          <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 opacity-75 blur-lg' />
                          <div className='relative rounded-full bg-gradient-to-r from-yellow-500 via-amber-600 to-orange-600 p-2 shadow-xl'>
                            <Trophy className='h-5 w-5 text-white' />
                          </div>
                        </div>
                        <div className='flex-1'>
                          <p className='font-bold text-yellow-600 dark:text-yellow-400'>
                            Funds Released to Buyer
                          </p>
                          <div className='mt-1 flex items-center gap-2'>
                            <p className='font-mono text-xs text-yellow-600/80 dark:text-yellow-400/80'>
                              {metadata.claimTxHash.slice(0, 10)}...
                              {metadata.claimTxHash.slice(-8)}
                            </p>
                            <span className='text-xs text-yellow-600/60 dark:text-yellow-400/60'>
                              Click to view on explorer →
                            </span>
                          </div>
                        </div>
                      </div>
                      <ExternalLink className='h-4 w-4 text-yellow-600/60 transition-transform group-hover:scale-110' />
                    </div>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Participants */}
          <div className='space-y-6'>
            {/* Your Info */}
            <Card className='from-background via-muted/50 to-primary/5 dark:to-primary/10 border-2 bg-gradient-to-br backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg font-black'>
                  <Users className='text-primary h-5 w-5' />
                  YOUR INFO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-4'>
                  <UserAvatar user={user} size='lg' />
                  <div>
                    <p className='text-lg font-bold'>
                      {getUserDisplayName(user)}
                    </p>
                    <Badge
                      variant='outline'
                      className={cn(
                        'mt-1 border-2 font-bold',
                        userRole === 'buyer'
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
                      )}
                    >
                      {userRole === 'buyer' ? '💰 BUYER' : '🏪 SELLER'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Counterparty Info */}
            <Card className='from-background via-muted/50 to-primary/5 dark:to-primary/10 border-2 bg-gradient-to-br backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg font-black'>
                  <Users className='text-primary h-5 w-5' />
                  COUNTERPARTY
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center gap-4'>
                  <UserAvatar user={otherParty} size='lg' />
                  <div>
                    <p className='text-lg font-bold'>
                      {getUserDisplayName(otherParty)}
                    </p>
                    <Badge
                      variant='outline'
                      className={cn(
                        'mt-1 border-2 font-bold',
                        userRole === 'seller'
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
                      )}
                    >
                      {userRole === 'seller' ? '💰 BUYER' : '🏪 SELLER'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className='space-y-3'>
                  <Button
                    variant='outline'
                    className='w-full justify-start font-bold'
                    onClick={() => {
                      navigationProgress.start()
                      router.push(appRoutes.chat.trades(trade.id.toString()))
                    }}
                  >
                    <MessageSquare className='mr-2 h-4 w-4' />
                    Send Message
                  </Button>

                  <RaiseDisputeButton
                    trade={trade}
                    variant='ghost'
                    onSuccess={mutate}
                  />

                  {/* Cancel button for domain trades in created status */}
                  {trade.listingCategory === 'domain' &&
                    trade.status === 'created' &&
                    isBuyer && (
                      <Button
                        variant='ghost'
                        className='text-muted-foreground w-full justify-start font-bold hover:bg-orange-500/10 hover:text-orange-500'
                        onClick={() => handleAction('cancel')}
                      >
                        <AlertCircle className='mr-2 h-4 w-4' />
                        Cancel Trade
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Trade Timestamps */}
            <Card className='from-background via-muted/50 to-primary/5 dark:to-primary/10 border-2 bg-gradient-to-br backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg font-black'>
                  <Clock className='text-primary h-5 w-5' />
                  TIMESTAMPS
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div>
                  <p className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                    Created
                  </p>
                  <p className='text-sm font-medium'>
                    {new Date(trade.createdAt).toLocaleString()}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {formatRelativeTime(trade.createdAt)}
                  </p>
                </div>

                {trade.completedAt && (
                  <div>
                    <p className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                      Completed
                    </p>
                    <p className='text-sm font-medium'>
                      {new Date(trade.completedAt).toLocaleString()}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {formatRelativeTime(trade.completedAt)}
                    </p>
                  </div>
                )}

                {trade.status === 'completed' && (
                  <div className='rounded-lg border-2 border-green-500/50 bg-green-500/10 p-3 text-center'>
                    <Trophy className='mx-auto mb-2 h-8 w-8 text-green-600 dark:text-green-400' />
                    <p className='text-sm font-bold text-green-600 dark:text-green-400'>
                      Trade Successful!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Action Dialog */}
      {actionType && (
        <TradeActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          trade={trade}
          actionType={actionType}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Lightbox for images */}
      {lightboxImages.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={lightboxImages}
        />
      )}
    </div>
  )
}
