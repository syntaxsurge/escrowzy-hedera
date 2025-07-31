'use client'

import { useState, useEffect } from 'react'

import {
  AlertTriangle,
  PartyPopper,
  CheckCircle2,
  ExternalLink,
  Wallet,
  Hash,
  TrendingUp,
  Users,
  User
} from 'lucide-react'

import { ModalDialog } from '@/components/blocks/modal-utils'
import { Spinner } from '@/components/ui/spinner'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useUnifiedWalletInfo } from '@/context'
import { useTransaction } from '@/hooks/blockchain/use-transaction'
import { api } from '@/lib/api/http-client'
import { buildTxUrl, SUBSCRIPTION_MANAGER_ABI } from '@/lib/blockchain'
import { formatCryptoAmount } from '@/lib/blockchain/payment'
import { formatTeamMemberLimit } from '@/lib/utils/subscription'
import { type PaymentIntent } from '@/types/payment'

interface CryptoPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentIntent: PaymentIntent | null
  onPaymentSuccess?: (transactionHash: string, verificationData?: any) => void
}

export function CryptoPaymentModal({
  isOpen,
  onClose,
  paymentIntent,
  onPaymentSuccess
}: CryptoPaymentModalProps) {
  const [step, setStep] = useState<
    'confirm' | 'processing' | 'success' | 'failed'
  >('confirm')
  const [verificationData, setVerificationData] = useState<any>(null)
  const [wasOpen, setWasOpen] = useState(false)

  const { address } = useUnifiedWalletInfo()
  const { executeTransaction, isExecuting, transactionHash, reset } =
    useTransaction({
      onSuccess: async hash => {
        await confirmPaymentWithBackend(hash)
      },
      onError: () => {
        setStep('failed')
      },
      onStatusChange: status => {
        // Update UI based on transaction status
        if (status === 'confirmed') {
          setStep('success')
        } else if (status === 'failed') {
          setStep('failed')
        } else if (status === 'processing') {
          setStep('processing')
        }
      },
      tracking:
        paymentIntent && paymentIntent.plan
          ? {
              teamId: paymentIntent.teamId,
              userId: paymentIntent.userId,
              planId: paymentIntent.plan?.id || '',
              amount: paymentIntent.amount,
              currency: paymentIntent.currency
            }
          : undefined,
      showToast: true,
      dismissibleToast: false
    })

  // Reset state only when modal is first opened (not when staying open)
  useEffect(() => {
    if (isOpen && !wasOpen) {
      // Modal is being opened for the first time
      setStep('confirm')
      setVerificationData(null)
      reset()
      setWasOpen(true)
    } else if (!isOpen && wasOpen) {
      // Modal is being closed
      setWasOpen(false)
    }
  }, [isOpen, wasOpen, reset])

  // Handle transaction confirmation with backend
  const confirmPaymentWithBackend = async (txHash: string) => {
    if (!paymentIntent || !address) return

    try {
      const result = await api.post(apiEndpoints.payments.confirm, {
        teamId: paymentIntent.teamId, // Keep as number
        planId: paymentIntent.plan?.id || '',
        transactionHash: txHash, // Use correct field name
        fromAddress: address, // Add from address
        amount: paymentIntent.amountWei, // Add amount in wei
        networkId: paymentIntent.networkId // Use correct field name
      })

      if (result.success && result.data) {
        setVerificationData(result.data)
        // Ensure step is set to success after backend confirmation
        setStep('success')
        onPaymentSuccess?.(txHash, result.data)
        return true
      } else {
        throw new Error(result.error || 'Payment confirmation failed')
      }
    } catch (error) {
      console.error('Backend confirmation error:', error)
      // Backend confirmation failed, but transaction succeeded on-chain
      // Still show success to user as the blockchain transaction succeeded
      setStep('success')
      return false
    }
  }

  const handlePayment = async () => {
    if (!paymentIntent || !address) return

    try {
      await executeTransaction(
        {
          address: paymentIntent.contractAddress as `0x${string}`,
          abi: SUBSCRIPTION_MANAGER_ABI as any,
          functionName: 'paySubscription',
          args: [address as `0x${string}`, paymentIntent.planKey],
          value: BigInt(paymentIntent.amountWei),
          chainId: paymentIntent.networkId
        },
        {
          messages: {
            pendingMessage: `Purchasing ${paymentIntent.plan?.name || 'subscription'} plan...`,
            processingMessage: 'Processing your subscription payment...',
            confirmedMessage: paymentIntent.plan?.id?.includes('team')
              ? `Team ${paymentIntent.plan?.name || 'subscription'} plan activated successfully!`
              : `Personal ${paymentIntent.plan?.name || 'subscription'} plan activated successfully!`,
            failedMessage: 'Payment failed'
          }
        }
      )
    } catch (_) {
      // Error is already handled by the hook
    }
  }

  const handleClose = () => {
    if (!isExecuting) {
      onClose()
    }
  }

  const handleRetry = () => {
    setStep('confirm')
    reset()
  }

  if (!paymentIntent) return null

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={handleClose}
      title={
        step === 'confirm' ? (
          'Confirm Payment'
        ) : step === 'processing' ? (
          'Processing Payment'
        ) : step === 'success' ? (
          <span className='flex items-center gap-2'>
            <PartyPopper className='h-6 w-6 text-green-500' />
            Payment Confirmed On-Chain!
          </span>
        ) : (
          'Payment Failed'
        )
      }
      description={
        step === 'confirm' ? (
          'Please confirm the payment details below before proceeding.'
        ) : step === 'processing' ? (
          'Your transaction is being processed on the blockchain...'
        ) : step === 'success' ? (
          verificationData?.isTeamPlan ? (
            <>
              Your team has been upgraded to{' '}
              {paymentIntent?.plan?.name || 'the selected plan'}!
            </>
          ) : (
            <>
              Your personal account has been upgraded to{' '}
              {paymentIntent?.plan?.name || 'the selected plan'}!
            </>
          )
        ) : (
          'Your payment could not be completed.'
        )
      }
      useDialog={true}
      showCloseButton={true}
      showFooter={step !== 'processing'}
      confirmText={
        step === 'confirm' ? (
          isExecuting ? (
            <>
              <Spinner size='sm' className='mr-2' />
              Processing...
            </>
          ) : (
            'Confirm Payment'
          )
        ) : step === 'success' ? (
          <>Continue to Dashboard</>
        ) : (
          'Try Again'
        )
      }
      cancelText={
        step === 'confirm' ? 'Cancel' : step === 'failed' ? 'Cancel' : undefined
      }
      showCancel={step === 'confirm' || step === 'failed'}
      confirmButtonVariant={
        step === 'success'
          ? 'default'
          : step === 'failed'
            ? 'default'
            : 'default'
      }
      disableConfirmButton={step === 'confirm' && (isExecuting || !address)}
      asyncAction={false}
      onConfirm={
        step === 'confirm'
          ? handlePayment
          : step === 'success'
            ? () => {
                onClose()
                window.location.href = appRoutes.dashboard.base
              }
            : step === 'failed'
              ? handleRetry
              : () => {}
      }
      onCancel={step === 'failed' ? onClose : handleClose}
      maxWidth='3xl'
      contentClassName='max-h-[90vh] w-[95vw] sm:w-full'
      scrollable={step === 'success'}
      content={
        step === 'confirm' ? (
          <div className='space-y-4 py-4'>
            <div className='space-y-3 rounded-lg border p-4'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>Plan</span>
                <span className='text-sm font-medium'>
                  {paymentIntent.plan?.name || 'Selected Plan'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>Amount</span>
                <span className='text-sm font-medium'>
                  {formatCryptoAmount(paymentIntent.amount)}{' '}
                  {paymentIntent.currency}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>Network</span>
                <span className='text-sm font-medium'>
                  {paymentIntent.network.name}
                </span>
              </div>
            </div>
          </div>
        ) : step === 'processing' ? (
          <div className='flex flex-col items-center justify-center space-y-4 py-8'>
            <Spinner size='lg' className='text-primary' />
            <p className='text-muted-foreground text-sm'>
              This may take a few moments
            </p>
          </div>
        ) : step === 'success' ? (
          <div className='space-y-6 py-4'>
            <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg'>
              <CheckCircle2 className='h-10 w-10 text-white' />
            </div>

            <div className='space-y-3 text-center'>
              <h3 className='bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent'>
                Welcome to {paymentIntent?.plan?.name || 'your new plan'}!
              </h3>
              <p className='text-muted-foreground'>
                {verificationData?.isTeamPlan ? (
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

            {transactionHash && (
              <div className='space-y-4'>
                <div className='rounded-lg border bg-gradient-to-br from-green-50 to-blue-50 p-4 dark:from-green-950/20 dark:to-blue-950/20'>
                  <div className='mb-3 flex items-center gap-2'>
                    <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
                    <p className='font-semibold text-green-900 dark:text-green-100'>
                      Blockchain Transaction Verified
                    </p>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground flex items-center gap-1 text-sm'>
                        <Hash className='h-3 w-3' /> Transaction Hash
                      </span>
                      <div className='flex items-center gap-2'>
                        <code className='bg-muted rounded px-2 py-1 font-mono text-xs'>
                          {transactionHash.slice(0, 6)}...
                          {transactionHash.slice(-4)}
                        </code>
                        <a
                          href={buildTxUrl(
                            paymentIntent?.networkId || 1,
                            transactionHash
                          )}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 hover:text-blue-700 dark:text-blue-400'
                        >
                          <ExternalLink className='h-4 w-4' />
                        </a>
                      </div>
                    </div>

                    {verificationData?.blockNumber && (
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground text-sm'>
                          Block Number
                        </span>
                        <span className='text-sm font-medium'>
                          #{verificationData.blockNumber}
                        </span>
                      </div>
                    )}

                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground flex items-center gap-1 text-sm'>
                        <Wallet className='h-3 w-3' /> From Wallet
                      </span>
                      <code className='bg-muted rounded px-2 py-1 font-mono text-xs'>
                        {address
                          ? `${address.slice(0, 6)}...${address.slice(-4)}`
                          : ''}
                      </code>
                    </div>

                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground text-sm'>
                        Network
                      </span>
                      <span className='flex items-center gap-1 text-sm font-medium'>
                        {paymentIntent?.network.name}
                        <span className='text-green-600 dark:text-green-400'>
                          ✓
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground text-sm'>
                        Amount Paid
                      </span>
                      <span className='text-sm font-medium'>
                        {formatCryptoAmount(paymentIntent?.amount || '0')}{' '}
                        {paymentIntent?.currency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30'>
                  <p className='mb-2 text-sm font-medium text-blue-900 dark:text-blue-100'>
                    🎉 What's included in your {paymentIntent?.plan?.name || ''}{' '}
                    plan:
                  </p>
                  <ul className='space-y-1 text-sm text-blue-800 dark:text-blue-200'>
                    {paymentIntent?.plan?.features &&
                    paymentIntent.plan.features.length > 0 ? (
                      paymentIntent.plan.features.map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))
                    ) : verificationData?.isTeamPlan ? (
                      <>
                        <li>• Unlimited team members</li>
                        <li>• Advanced collaboration features</li>
                        <li>• Priority support</li>
                        <li>• Team analytics dashboard</li>
                      </>
                    ) : (
                      <>
                        <li>• All premium features unlocked</li>
                        <li>• Advanced analytics</li>
                        <li>• Priority support</li>
                        <li>• Custom integrations</li>
                      </>
                    )}
                    {paymentIntent?.plan?.maxMembers && (
                      <li className='mt-2 font-medium'>
                        •{' '}
                        {formatTeamMemberLimit(
                          typeof paymentIntent.plan?.maxMembers === 'string'
                            ? parseInt(paymentIntent.plan.maxMembers)
                            : paymentIntent.plan?.maxMembers
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='space-y-4 py-8'>
            <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30'>
              <AlertTriangle className='h-10 w-10 text-red-600 dark:text-red-400' />
            </div>

            <div className='space-y-2 text-center'>
              <p className='text-lg font-medium'>Transaction Failed</p>
              <p className='text-muted-foreground text-sm'>
                Please check your wallet and try again.
              </p>
            </div>
          </div>
        )
      }
    />
  )
}
