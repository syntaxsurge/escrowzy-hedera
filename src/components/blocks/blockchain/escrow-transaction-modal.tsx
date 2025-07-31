'use client'

import React from 'react'

import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react'

import { modalConfirm } from '@/components/blocks/modal-utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { getNativeCurrencySymbol } from '@/lib/blockchain'

interface EscrowTransactionDetails {
  action: 'create' | 'fund' | 'confirm' | 'dispute' | 'cancel'
  amount?: string // (optional for dispute)
  fee?: string // in Native currency
  seller?: string
  buyer?: string
  escrowId?: number
  disputeReason?: string
  chainId?: number
}

interface EscrowTransactionModalProps {
  details: EscrowTransactionDetails
  onConfirm: () => Promise<string | undefined>
  onCancel?: () => void
}

export function showEscrowTransactionModal({
  details,
  onConfirm,
  onCancel
}: EscrowTransactionModalProps) {
  const getActionTitle = () => {
    switch (details.action) {
      case 'create':
        return 'Create Escrow Transaction'
      case 'fund':
        return 'Fund Escrow'
      case 'confirm':
        return 'Confirm Delivery'
      case 'dispute':
        return 'Raise Dispute'
      case 'cancel':
        return 'Cancel Escrow'
      default:
        return 'Confirm Transaction'
    }
  }

  const getActionDescription = () => {
    switch (details.action) {
      case 'create':
        return 'You are about to create a new escrow transaction. The funds will be held securely until the trade is completed.'
      case 'fund':
        return 'You are about to fund this escrow. The amount will be locked in the smart contract.'
      case 'confirm':
        return 'By confirming delivery, you acknowledge receipt of the item/service and release the funds to the seller.'
      case 'dispute':
        return 'You are about to raise a dispute. An arbitrator will review your case.'
      case 'cancel':
        return 'Cancelling the escrow will return any locked funds to the buyer.'
      default:
        return 'Please review the transaction details before confirming.'
    }
  }

  const totalAmount =
    details.amount && details.fee
      ? (parseFloat(details.amount) + parseFloat(details.fee)).toFixed(6)
      : details.amount || '0'

  return modalConfirm({
    title: (
      <div className='flex items-center gap-2'>
        <Shield className='text-primary h-5 w-5' />
        <span>{getActionTitle()}</span>
      </div>
    ),
    description: getActionDescription(),
    content: (
      <div className='space-y-4'>
        {/* Transaction Details */}
        <div className='bg-muted/50 space-y-3 rounded-lg border p-4'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>Action</span>
            <Badge variant='outline'>{details.action.toUpperCase()}</Badge>
          </div>

          {details.escrowId && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Escrow ID</span>
              <span className='font-mono text-sm'>#{details.escrowId}</span>
            </div>
          )}

          {details.amount && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Amount</span>
              <span className='font-semibold'>
                {details.amount}{' '}
                {details.chainId
                  ? getNativeCurrencySymbol(details.chainId)
                  : 'ETH'}
              </span>
            </div>
          )}

          {details.fee && (
            <>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>
                  Platform Fee (2.5%)
                </span>
                <span className='text-sm'>
                  {details.fee}{' '}
                  {details.chainId
                    ? getNativeCurrencySymbol(details.chainId)
                    : 'ETH'}
                </span>
              </div>
              <div className='border-t pt-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>Total Amount</span>
                  <span className='text-primary font-bold'>
                    {totalAmount}{' '}
                    {details.chainId
                      ? getNativeCurrencySymbol(details.chainId)
                      : 'ETH'}
                  </span>
                </div>
              </div>
            </>
          )}

          {details.seller && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Seller</span>
              <span className='font-mono text-xs'>
                {details.seller.slice(0, 6)}...{details.seller.slice(-4)}
              </span>
            </div>
          )}

          {details.buyer && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Buyer</span>
              <span className='font-mono text-xs'>
                {details.buyer.slice(0, 6)}...{details.buyer.slice(-4)}
              </span>
            </div>
          )}

          {details.disputeReason && (
            <div className='space-y-1'>
              <span className='text-muted-foreground text-sm'>
                Dispute Reason
              </span>
              <p className='text-sm'>{details.disputeReason}</p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            This transaction will be executed on the blockchain and cannot be
            reversed. Please ensure all details are correct before confirming.
          </AlertDescription>
        </Alert>

        {/* Gas Fee Notice */}
        {(details.action === 'create' || details.action === 'fund') && (
          <Alert className='border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950'>
            <AlertCircle className='h-4 w-4 text-yellow-600' />
            <AlertDescription className='text-yellow-800 dark:text-yellow-200'>
              Additional network gas fees will apply to this transaction.
            </AlertDescription>
          </Alert>
        )}
      </div>
    ),
    confirmText: 'Confirm Transaction',
    cancelText: 'Cancel',
    confirmButtonVariant: 'default',
    cancelButtonVariant: 'outline',
    asyncAction: true,
    loadingText: 'Processing transaction...',
    maxWidth: 'lg',
    useDialog: true,
    onConfirm: async () => {
      try {
        const txHash = await onConfirm()
        if (txHash) {
          // Show success modal
          modalConfirm({
            title: (
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='h-5 w-5 text-green-600' />
                <span>Transaction Successful</span>
              </div>
            ),
            description:
              'Your transaction has been successfully submitted to the blockchain.',
            content: (
              <div className='space-y-3'>
                <div className='bg-muted/50 rounded-lg border p-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground text-sm'>
                      Transaction Hash
                    </span>
                    <span className='font-mono text-xs'>
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </span>
                  </div>
                </div>
                <Alert className='border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'>
                  <CheckCircle2 className='h-4 w-4 text-green-600' />
                  <AlertDescription className='text-green-800 dark:text-green-200'>
                    The transaction is being processed. You will be notified
                    once it's confirmed.
                  </AlertDescription>
                </Alert>
              </div>
            ),
            showCancel: false,
            confirmText: 'Close',
            maxWidth: 'md',
            useDialog: true,
            onConfirm: () => {}
          })
        }
      } catch (error) {
        console.error('Transaction failed:', error)
        // Error handling is done in the hook
      }
    },
    onCancel: onCancel || (() => {})
  })
}

// Convenience functions for specific actions
export function confirmEscrowCreation(
  amount: string,
  seller: string,
  onConfirm: () => Promise<string | undefined>,
  chainId?: number
) {
  const fee = (parseFloat(amount) * 0.025).toFixed(6)
  return showEscrowTransactionModal({
    details: {
      action: 'create',
      amount,
      fee,
      seller,
      chainId
    },
    onConfirm
  })
}

export function confirmEscrowFunding(
  escrowId: number,
  amount: string,
  onConfirm: () => Promise<string | undefined>,
  chainId?: number
) {
  const fee = (parseFloat(amount) * 0.025).toFixed(6)
  return showEscrowTransactionModal({
    details: {
      action: 'fund',
      escrowId,
      amount,
      fee,
      chainId
    },
    onConfirm
  })
}

export function confirmDelivery(
  escrowId: number,
  amount: string,
  onConfirm: () => Promise<string | undefined>
) {
  return showEscrowTransactionModal({
    details: {
      action: 'confirm',
      escrowId,
      amount
    },
    onConfirm
  })
}

export function confirmDispute(
  escrowId: number,
  reason: string,
  onConfirm: () => Promise<string | undefined>
) {
  return showEscrowTransactionModal({
    details: {
      action: 'dispute',
      escrowId,
      disputeReason: reason
    },
    onConfirm
  })
}

export function confirmCancellation(
  escrowId: number,
  amount: string,
  onConfirm: () => Promise<string | undefined>
) {
  return showEscrowTransactionModal({
    details: {
      action: 'cancel',
      escrowId,
      amount
    },
    onConfirm
  })
}
