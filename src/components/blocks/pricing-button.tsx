import React from 'react'

import { SignMessageButton } from '@/components/blocks/blockchain/sign-message-button'
import { UnifiedConnectButton } from '@/components/blocks/blockchain/unified-connect-button'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib'

interface CurrentPlanButtonProps {
  isLoading?: boolean
  className?: string
  children?: React.ReactNode
  expirationDate?: Date | string
}

export function CurrentPlanButton({
  isLoading = false,
  className,
  children = 'Current Plan',
  expirationDate
}: CurrentPlanButtonProps) {
  const getButtonText = () => {
    if (children !== 'Current Plan') return children

    if (expirationDate) {
      const date =
        typeof expirationDate === 'string'
          ? new Date(expirationDate)
          : expirationDate
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      })
      return `Current Plan (Expires ${formattedDate})`
    }

    return children
  }

  return (
    <Button
      disabled
      variant='outline'
      className={cn('w-full cursor-not-allowed opacity-60', className)}
    >
      {isLoading ? (
        <>
          <Spinner size='sm' className='mr-2' />
          Loading...
        </>
      ) : (
        getButtonText()
      )}
    </Button>
  )
}

interface PricingButtonProps {
  isConnected: boolean
  isAuthenticated: boolean
  isLoading?: boolean
  isCurrent: boolean
  isSubscriptionActive: boolean
  isPopular?: boolean
  buttonText: React.ReactNode
  onAction?: () => void | Promise<void>
  disabled?: boolean
  variant?: 'default' | 'outline'
  className?: string
}

export function PricingButton({
  isConnected,
  isAuthenticated,
  isLoading = false,
  isCurrent,
  isSubscriptionActive,
  isPopular = false,
  buttonText,
  onAction,
  disabled = false,
  variant = 'default',
  className
}: PricingButtonProps) {
  // Loading state
  if (isLoading && isAuthenticated) {
    return <CurrentPlanButton isLoading />
  }

  // Not connected - show connect wallet button
  if (!isConnected) {
    return (
      <div className='w-full'>
        <UnifiedConnectButton />
      </div>
    )
  }

  // Connected but not authenticated - show sign message button
  if (isConnected && !isAuthenticated) {
    return (
      <SignMessageButton
        variant={variant}
        className={cn(
          'w-full',
          isPopular &&
            !disabled &&
            'border-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg hover:from-orange-700 hover:to-pink-700',
          className
        )}
      >
        Sign to Access Dashboard
      </SignMessageButton>
    )
  }

  // Current plan with active subscription - show muted button
  if (isCurrent && isSubscriptionActive) {
    return <CurrentPlanButton>{buttonText}</CurrentPlanButton>
  }

  // All other cases - show action button
  return (
    <Button
      onClick={onAction}
      disabled={disabled}
      variant={variant}
      className={cn(
        'w-full',
        isPopular &&
          !disabled &&
          'border-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg hover:from-orange-700 hover:to-pink-700',
        className
      )}
    >
      {buttonText}
    </Button>
  )
}

interface ReactivatePlanButtonProps {
  isLoading?: boolean
  onReactivate: () => void | Promise<void>
  expirationDate?: Date | string
  className?: string
}

export function ReactivatePlanButton({
  isLoading = false,
  onReactivate,
  expirationDate,
  className
}: ReactivatePlanButtonProps) {
  const formatExpirationText = () => {
    if (!expirationDate) return 'Reactivate Plan'

    const date =
      typeof expirationDate === 'string'
        ? new Date(expirationDate)
        : expirationDate
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })

    return `Reactivate Plan (Expired ${formattedDate})`
  }

  return (
    <Button
      onClick={onReactivate}
      disabled={isLoading}
      variant='default'
      className={cn('w-full', className)}
    >
      {isLoading ? (
        <>
          <Spinner size='sm' className='mr-2' />
          Processing...
        </>
      ) : (
        formatExpirationText()
      )}
    </Button>
  )
}

interface UpgradeDowngradeButtonProps {
  isUpgrade: boolean
  planDisplayName: string
  isTeamPlan?: boolean
  isLoading?: boolean
  onAction: () => void | Promise<void>
  isPopular?: boolean
  className?: string
}

export function UpgradeDowngradeButton({
  isUpgrade,
  planDisplayName,
  isTeamPlan = false,
  isLoading = false,
  onAction,
  isPopular = false,
  className
}: UpgradeDowngradeButtonProps) {
  const getButtonText = () => {
    if (isTeamPlan) {
      const teamPlanName = planDisplayName.replace(/^Team\s+/i, '')
      return isUpgrade
        ? `Upgrade to Team ${teamPlanName}`
        : `Downgrade to Team ${teamPlanName}`
    }
    return isUpgrade
      ? `Upgrade to ${planDisplayName}`
      : `Downgrade to ${planDisplayName}`
  }

  return (
    <Button
      onClick={onAction}
      disabled={isLoading}
      variant={isUpgrade ? 'default' : 'outline'}
      className={cn(
        'w-full',
        isPopular &&
          isUpgrade &&
          !isLoading &&
          'border-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg hover:from-orange-700 hover:to-pink-700',
        className
      )}
    >
      {isLoading ? (
        <>
          <Spinner size='sm' className='mr-2' />
          Processing...
        </>
      ) : (
        getButtonText()
      )}
    </Button>
  )
}

interface SelectPlanButtonProps {
  isLoading?: boolean
  onSelect: () => void | Promise<void>
  isPopular?: boolean
  className?: string
}

export function SelectPlanButton({
  isLoading = false,
  onSelect,
  isPopular = false,
  className
}: SelectPlanButtonProps) {
  return (
    <Button
      onClick={onSelect}
      disabled={isLoading}
      variant='default'
      className={cn(
        'w-full',
        isPopular &&
          !isLoading &&
          'border-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg hover:from-orange-700 hover:to-pink-700',
        className
      )}
    >
      {isLoading ? (
        <>
          <Spinner size='sm' className='mr-2' />
          Processing...
        </>
      ) : (
        'Select Plan'
      )}
    </Button>
  )
}
