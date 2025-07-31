'use client'

import { useState } from 'react'

import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  CheckCircle,
  Globe,
  Eye
} from 'lucide-react'

import { AcceptListingDialog } from '@/app/(protected)/trades/listings/accept-listing-dialog'
import { UpdateListingDialog } from '@/app/(protected)/trades/listings/update-listing-dialog'
import { UserAvatar } from '@/components/blocks/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib'
import { formatRelativeTime } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'
import type { EscrowListingWithUser, DomainMetadata } from '@/types/listings'
import type { TradeWithUsers } from '@/types/trade'

import { RaiseDisputeButton } from './raise-dispute-button'
import { SellerDepositTimer } from './seller-deposit-timer'
import { UnifiedListingInfoCard } from './unified-listing-info-card'

interface GamifiedListingCardProps {
  listing: EscrowListingWithUser
  onAccept?: () => void
  onUpdate?: () => void
  showManageButton?: boolean
  // New props for trade mode
  tradeMode?: boolean
  tradeId?: number
  tradeStatus?: string
  onViewDetails?: () => void
  customActions?: React.ReactNode
  // Active trades specific props
  showActiveTradeInfo?: boolean
  depositDeadline?: string | Date | null
  isSeller?: boolean
  actionRequired?: string | null
  // Trade object for dispute functionality
  trade?: TradeWithUsers
  onTradeUpdate?: () => void
}

export function GamifiedListingCard({
  listing,
  onAccept,
  onUpdate,
  showManageButton = false,
  tradeMode = false,
  tradeId,
  tradeStatus: _tradeStatus,
  onViewDetails,
  customActions,
  showActiveTradeInfo = false,
  depositDeadline,
  isSeller,
  actionRequired,
  trade,
  onTradeUpdate
}: GamifiedListingCardProps) {
  const { user } = useSession()
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const isOwnListing = user?.id === listing.userId
  const isDomainListing = listing.listingCategory === 'domain'
  const domainMetadata = isDomainListing
    ? (listing.metadata as DomainMetadata)
    : null

  // Parse payment methods from JSON
  const paymentMethods = Array.isArray(listing.paymentMethods)
    ? listing.paymentMethods
    : typeof listing.paymentMethods === 'string'
      ? JSON.parse(listing.paymentMethods)
      : []

  const handleAcceptSuccess = () => {
    setAcceptDialogOpen(false)
    if (onAccept) onAccept()
    // Navigation is handled in the dialog itself
  }

  const handleUpdateSuccess = () => {
    setUpdateDialogOpen(false)
    if (onUpdate) onUpdate()
  }

  // Get listing type config
  const getListingTypeConfig = () => {
    if (isDomainListing) {
      return {
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/50',
        borderColor: 'border-purple-500/60',
        shadowColor: 'shadow-purple-500/20',
        icon: <Globe className='h-4 w-4' />,
        label: 'DOMAIN',
        actionLabel: 'Buy Domain',
        actionColor:
          'from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
      }
    } else if (listing.listingType === 'sell') {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/50',
        borderColor: 'border-green-500/60',
        shadowColor: 'shadow-green-500/20',
        icon: <TrendingDown className='h-4 w-4' />,
        label: 'SELLING',
        actionLabel: 'Buy Now',
        actionColor:
          'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
      }
    } else {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
        borderColor: 'border-blue-500/60',
        shadowColor: 'shadow-blue-500/20',
        icon: <TrendingUp className='h-4 w-4' />,
        label: 'BUYING',
        actionLabel: 'Sell Now',
        actionColor:
          'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
      }
    }
  }

  const typeConfig = getListingTypeConfig()

  return (
    <>
      <Card
        className={cn(
          'group relative flex h-full flex-col overflow-hidden transition-all duration-500',
          'hover:scale-[1.02] hover:shadow-2xl',
          'from-background via-muted/50 to-primary/5 dark:to-primary/10 bg-gradient-to-br',
          'border-2 backdrop-blur-sm',
          isHovered && typeConfig.borderColor,
          isHovered && 'shadow-xl',
          isHovered && typeConfig.shadowColor,
          !isHovered && 'border-border/50 hover:border-border'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gaming Progress Bar / Trade Status */}
        <div className='absolute top-0 right-0 left-0 h-3 bg-black/20 dark:bg-white/10'>
          <div className='relative h-full overflow-hidden'>
            <div
              className='from-primary relative h-full bg-gradient-to-r via-purple-600 to-pink-600 transition-all duration-1000'
              style={{ width: listing.isActive || tradeMode ? '100%' : '0%' }}
            >
              <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
            </div>
          </div>
          <div className='absolute top-0 left-0 flex h-full w-full items-center justify-center'>
            <span className='text-[8px] font-bold text-white/80 drop-shadow-md'>
              {tradeMode && tradeId
                ? `TRADE #${tradeId}`
                : listing.isActive
                  ? 'ACTIVE'
                  : 'INACTIVE'}
            </span>
          </div>
        </div>

        {/* Own Listing Badge */}
        {isOwnListing && (
          <div className='absolute top-6 right-6 z-10'>
            <div className='relative'>
              <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 opacity-75 blur-lg' />
              <div className='relative rounded-full border border-white/20 bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 text-xs font-black text-white uppercase shadow-xl'>
                <Shield className='mr-1 inline h-3 w-3' />
                YOUR LISTING
              </div>
            </div>
          </div>
        )}

        <CardHeader className='pt-12 pb-4'>
          {/* Action Required Alert at Top of Header */}
          {showActiveTradeInfo && actionRequired && (
            <div className='mb-4 rounded-lg border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 dark:from-blue-950/50 dark:to-cyan-950/50'>
              <div className='flex items-center gap-2'>
                <div className='rounded-full bg-blue-500 p-1.5 text-white'>
                  <Zap className='h-4 w-4' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-semibold'>Action Required</p>
                  <p className='text-muted-foreground text-xs'>
                    {actionRequired}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className='flex items-start justify-between gap-3'>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <div className='from-primary/20 absolute inset-0 rounded-full bg-gradient-to-r to-purple-600/20 blur-xl' />
                <UserAvatar
                  user={listing.user}
                  size='lg'
                  className='border-primary/20 relative border-2'
                />
                {listing.isActive && (
                  <div className='absolute -right-1 -bottom-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 p-1.5 shadow-lg'>
                    <CheckCircle className='h-3 w-3 text-white' />
                  </div>
                )}
              </div>
              <div className='max-w-[60%]'>
                <p className='text-foreground mb-3 text-xl font-black'>
                  {getUserDisplayName(listing.user)}
                </p>
                <div className='flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'border-2 text-xs font-bold',
                      listing.listingType === 'sell'
                        ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    )}
                  >
                    {typeConfig.icon}
                    <span className='ml-1'>{typeConfig.label}</span>
                  </Badge>
                  {!isDomainListing && (
                    <Badge
                      variant='outline'
                      className='from-primary/10 border-primary/30 bg-gradient-to-r to-purple-600/10 font-bold'
                    >
                      {listing.tokenOffered}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className='text-right'>
              <Badge
                variant='outline'
                className='from-primary/10 border-primary/30 mb-2 bg-gradient-to-r to-purple-600/10 font-bold'
              >
                ID #{listing.id}
              </Badge>
              <p className='text-muted-foreground text-xs font-medium'>
                {formatRelativeTime(listing.createdAt)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className='flex-1 space-y-4'>
          {/* Active Trade Info - Timer */}
          {showActiveTradeInfo && depositDeadline && (
            <SellerDepositTimer
              depositDeadline={depositDeadline}
              isSeller={isSeller}
            />
          )}

          {/* Unified Listing Info Card */}
          <UnifiedListingInfoCard
            amount={listing.amount}
            tokenOffered={listing.tokenOffered}
            pricePerUnit={listing.pricePerUnit}
            minAmount={listing.minAmount}
            maxAmount={listing.maxAmount}
            paymentMethods={paymentMethods}
            domainMetadata={domainMetadata}
            listingCategory={listing.listingCategory as 'p2p' | 'domain'}
          />
        </CardContent>

        <CardFooter className='mt-auto flex flex-col gap-3 pt-6 pb-6'>
          {tradeMode ? (
            // Trade mode: show custom actions or view details button
            <>
              {customActions ? (
                customActions
              ) : onViewDetails ? (
                <Button
                  size='lg'
                  className={cn(
                    'group relative h-12 w-full overflow-hidden border-0 bg-gradient-to-r text-base font-black text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl',
                    'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  )}
                  onClick={onViewDetails}
                >
                  <div className='absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full' />
                  <Eye className='mr-2 h-5 w-5' />
                  <span className='tracking-wider uppercase'>VIEW DETAILS</span>
                </Button>
              ) : null}
              {/* Show dispute button for active trades */}
              {trade && (
                <RaiseDisputeButton
                  trade={trade}
                  variant='default'
                  showOnPages='active'
                  className='w-full'
                  onSuccess={onTradeUpdate}
                />
              )}
            </>
          ) : isOwnListing && showManageButton ? (
            <Button
              variant='outline'
              size='lg'
              className='from-background/80 to-muted/80 border-primary/30 hover:border-primary/50 hover:bg-primary/10 w-full border-2 bg-gradient-to-r font-bold backdrop-blur-sm transition-all hover:scale-105'
              onClick={() => setUpdateDialogOpen(true)}
            >
              MANAGE LISTING
            </Button>
          ) : !isOwnListing ? (
            <Button
              size='lg'
              className={cn(
                'group relative h-12 w-full overflow-hidden border-0 bg-gradient-to-r text-base font-black text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl',
                typeConfig.actionColor
              )}
              onClick={() => setAcceptDialogOpen(true)}
            >
              <div className='absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full' />
              <Zap className='mr-2 h-5 w-5' />
              <span className='tracking-wider uppercase'>
                {typeConfig.actionLabel}
              </span>
            </Button>
          ) : null}
        </CardFooter>
      </Card>

      {/* Accept Listing Dialog */}
      <AcceptListingDialog
        open={acceptDialogOpen}
        onOpenChange={setAcceptDialogOpen}
        listing={listing}
        onSuccess={handleAcceptSuccess}
      />

      {/* Update Listing Dialog */}
      {isOwnListing && (
        <UpdateListingDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          listing={listing}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </>
  )
}
