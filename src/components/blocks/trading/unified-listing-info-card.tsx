import {
  Coins,
  DollarSign,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Trophy,
  CreditCard
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { DomainMetadata } from '@/types/listings'

interface UnifiedListingInfoCardProps {
  // P2P Listing props
  amount?: string | null
  tokenOffered?: string | null
  pricePerUnit?: string | null
  minAmount?: string | null
  maxAmount?: string | null
  paymentMethods?: string[]

  // Domain Listing props
  domainMetadata?: DomainMetadata | null

  // Common props
  listingCategory?: 'p2p' | 'domain'
  className?: string
}

export function UnifiedListingInfoCard({
  amount,
  tokenOffered,
  pricePerUnit,
  minAmount,
  maxAmount,
  paymentMethods = [],
  domainMetadata,
  listingCategory = 'p2p',
  className
}: UnifiedListingInfoCardProps) {
  const isDomain = listingCategory === 'domain'

  if (isDomain && domainMetadata) {
    // Domain listing design
    return (
      <div className={`space-y-4 ${className || ''}`}>
        {/* Domain info card with purple gradient background */}
        <div className='from-primary/20 border-primary/30 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br via-purple-600/20 to-pink-600/20 p-5 backdrop-blur-sm'>
          <div className='space-y-4'>
            {/* Domain Name */}
            <div>
              <p className='text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase'>
                Domain Name
              </p>
              <p className='from-primary truncate bg-gradient-to-r to-purple-400 bg-clip-text text-2xl font-bold text-transparent'>
                {domainMetadata.domainName || 'N/A'}
              </p>
            </div>

            {/* Price and Registrar Row */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase'>
                  Price
                </p>
                <div className='from-primary bg-gradient-to-r to-purple-400 bg-clip-text text-xl font-bold text-transparent'>
                  ${amount || '0'}
                  {tokenOffered && (
                    <Badge
                      variant='outline'
                      className='ml-2 border-slate-300 bg-slate-100 text-xs dark:border-white/20 dark:bg-white/10'
                    >
                      {tokenOffered}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className='text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase'>
                  Registrar
                </p>
                <p className='truncate text-xl font-bold text-slate-900 dark:text-white'>
                  {domainMetadata.registrar || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Traffic and Revenue Row */}
            {(domainMetadata.monthlyTraffic ||
              domainMetadata.monthlyRevenue) && (
              <div className='grid grid-cols-2 gap-4'>
                {domainMetadata.monthlyTraffic && (
                  <div>
                    <p className='text-muted-foreground mb-1 flex items-center text-xs font-medium tracking-wider uppercase'>
                      <TrendingUp className='mr-1 h-3 w-3' />
                      Traffic/Mo
                    </p>
                    <p className='text-xl font-bold text-slate-900 dark:text-white'>
                      {domainMetadata.monthlyTraffic.toLocaleString()}
                    </p>
                  </div>
                )}
                {domainMetadata.monthlyRevenue && (
                  <div>
                    <p className='text-muted-foreground mb-1 flex items-center text-xs font-medium tracking-wider uppercase'>
                      <DollarSign className='mr-1 h-3 w-3' />
                      Revenue/Mo
                    </p>
                    <p className='text-xl font-bold text-slate-900 dark:text-white'>
                      ${domainMetadata.monthlyRevenue.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Expiry Date */}
            {domainMetadata.expiryDate && (
              <div className='flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 dark:bg-black/20'>
                <span className='text-muted-foreground flex items-center text-xs font-medium tracking-wider uppercase'>
                  <Calendar className='mr-2 h-4 w-4' />
                  EXPIRES
                </span>
                <span className='text-lg font-bold text-slate-900 dark:text-white'>
                  {new Date(domainMetadata.expiryDate).toLocaleDateString(
                    'en-US',
                    {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric'
                    }
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // P2P listing design
  const totalValue =
    amount && pricePerUnit
      ? (parseFloat(amount) * parseFloat(pricePerUnit)).toFixed(2)
      : '0.00'

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* P2P info card with purple gradient background */}
      <div className='from-primary/20 border-primary/30 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br via-purple-600/20 to-pink-600/20 p-5 backdrop-blur-sm'>
        <div className='space-y-4'>
          {/* Amount and Price Row */}
          <div className='grid grid-cols-2 gap-6'>
            <div>
              <p className='text-muted-foreground mb-2 flex items-center text-xs font-medium tracking-wider uppercase'>
                <Coins className='mr-1 h-3 w-3' />
                AMOUNT
              </p>
              <div className='from-primary bg-gradient-to-r to-purple-400 bg-clip-text text-3xl font-bold text-transparent'>
                {amount}{' '}
                {tokenOffered && (
                  <span className='text-2xl'>{tokenOffered}</span>
                )}
              </div>
            </div>
            <div>
              <p className='text-muted-foreground mb-2 flex items-center text-xs font-medium tracking-wider uppercase'>
                <DollarSign className='mr-1 h-3 w-3' />
                PRICE/UNIT
              </p>
              <div className='from-primary bg-gradient-to-r to-purple-400 bg-clip-text text-3xl font-bold text-transparent'>
                ${pricePerUnit || '0'}
              </div>
            </div>
          </div>

          {/* Total Value Badge */}
          <div className='flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 dark:bg-black/20'>
            <span className='text-muted-foreground flex items-center text-xs font-medium tracking-wider uppercase'>
              <Trophy className='mr-2 h-4 w-4' />
              TOTAL VALUE
            </span>
            <span className='text-lg font-bold text-slate-900 dark:text-white'>
              ${totalValue}
            </span>
          </div>

          {/* Trade Limits */}
          {(minAmount || maxAmount) && (
            <div className='rounded-lg bg-slate-100 px-4 py-3 dark:bg-black/20'>
              <p className='text-muted-foreground mb-1 flex items-center text-xs font-medium tracking-wider uppercase'>
                <ArrowRightLeft className='mr-2 h-3 w-3' />
                LIMITS:
              </p>
              <p className='text-lg font-semibold text-slate-900 dark:text-white'>
                {minAmount || '0'} - {maxAmount || '∞'} {tokenOffered}
              </p>
            </div>
          )}

          {/* Payment Methods */}
          {paymentMethods.length > 0 && (
            <div>
              <p className='text-muted-foreground mb-3 flex items-center text-xs font-medium tracking-wider uppercase'>
                <CreditCard className='mr-2 h-3 w-3' />
                PAYMENT METHODS
              </p>
              <div className='flex flex-wrap gap-2'>
                {paymentMethods.map((method, index) => (
                  <Badge
                    key={index}
                    variant='outline'
                    className='border-blue-500/50 bg-blue-500/10 text-blue-400'
                  >
                    <DollarSign className='mr-1 h-3 w-3' />
                    {method}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Also export a simplified version for trade cards that might need less detail
export function UnifiedTradeInfoCard({
  amount,
  currency,
  listingCategory,
  domainMetadata,
  paymentMethod,
  pricePerUnit,
  className
}: {
  amount?: string | null
  currency?: string | null
  listingCategory?: string | null
  domainMetadata?: any
  paymentMethod?: string
  pricePerUnit?: string
  className?: string
}) {
  const isDomain = listingCategory === 'domain'

  if (isDomain && domainMetadata?.domainInfo) {
    const domain = domainMetadata.domainInfo as DomainMetadata
    return (
      <UnifiedListingInfoCard
        amount={amount}
        tokenOffered={currency}
        domainMetadata={domain}
        listingCategory='domain'
        className={className}
      />
    )
  }

  // For P2P trades in active trades view
  return (
    <UnifiedListingInfoCard
      amount={amount}
      tokenOffered={currency}
      pricePerUnit={pricePerUnit}
      paymentMethods={paymentMethod ? [paymentMethod] : []}
      listingCategory='p2p'
      className={className}
    />
  )
}
