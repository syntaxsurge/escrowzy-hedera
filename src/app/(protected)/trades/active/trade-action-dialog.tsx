'use client'

import { useState, useEffect, useRef } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Shield,
  CheckCircle,
  Clock,
  Wallet,
  Image as ImageIcon,
  Globe,
  Mail
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { z } from 'zod'

import { PaymentProofUpload } from '@/components/blocks/payment-proof-upload'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { apiEndpoints } from '@/config/api-endpoints'
import { envPublic } from '@/config/env.public'
import { useBlockchain } from '@/context'
import { useEscrow } from '@/hooks/blockchain/use-escrow'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api/http-client'
import { handleFormError } from '@/lib/utils/form'
import { formatCurrency } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'
import { uploadClient } from '@/services/upload-client'
import type { TradeWithUsers, TradeMetadata } from '@/types/trade'

interface TradeActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: TradeWithUsers
  actionType:
    | 'deposit'
    | 'fund'
    | 'payment_sent'
    | 'confirm'
    | 'dispute'
    | 'cancel'
  onSuccess: () => void
}

const fundSchema = z.object({
  transactionHash: z.string().min(1, 'Transaction hash is required')
})

const paymentSentSchema = z.object({
  paymentProof: z.string().optional(),
  notes: z.string().optional()
})

const confirmSchema = z.object({
  confirmationMessage: z.string().optional()
})

const disputeSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide a detailed reason (min 10 characters)'),
  evidence: z.string().optional()
})

export function TradeActionDialog({
  open,
  onOpenChange,
  trade,
  actionType,
  onSuccess
}: TradeActionDialogProps) {
  const { toast } = useToast()
  const { address, chainId } = useBlockchain()
  const {
    createEscrow,
    fundEscrow,
    confirmDelivery,
    calculateFee,
    isLoading: isBlockchainLoading
  } = useEscrow()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentProofFiles, setPaymentProofFiles] = useState<File[]>([])
  const [disputeEvidenceFiles, setDisputeEvidenceFiles] = useState<File[]>([])
  const [uploadingProof, setUploadingProof] = useState(false)
  const [depositTimeLeft, setDepositTimeLeft] = useState<number | null>(null)
  const [isCreatingEscrow, setIsCreatingEscrow] = useState(false)
  const [calculatedFee, setCalculatedFee] = useState<string>('0')
  const [nativeAmount, setNativeAmount] = useState<string | null>(null)
  const [nativeSymbol, setNativeSymbol] = useState<string | null>(null)
  const [nativePrice, setNativePrice] = useState<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<Array<{ src: string }>>(
    []
  )
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasShownExpiredToastRef = useRef(false)

  // Calculate fee when dialog opens or trade amount changes
  useEffect(() => {
    if (open && trade.amount) {
      calculateFee(trade.amount, address)
        .then(fee => {
          setCalculatedFee(fee)
        })
        .catch(() => {
          // Fallback to default calculation if async fails
          const defaultFee = (parseFloat(trade.amount) * 0.025).toFixed(6)
          setCalculatedFee(defaultFee)
        })
    }
  }, [open, trade.amount, address, calculateFee])

  // Reset native conversion state when dialog closes
  useEffect(() => {
    if (!open) {
      setNativeAmount(null)
      setNativeSymbol(null)
      setNativePrice(null)
    }
  }, [open])

  // Calculate deposit deadline countdown
  useEffect(() => {
    if (open && actionType === 'deposit' && trade.depositDeadline) {
      // Check first if already expired before doing anything else
      const now = new Date().getTime()
      const deadline = new Date(trade.depositDeadline!).getTime()
      const initialTimeLeft = deadline - now

      if (initialTimeLeft <= 0) {
        // Already expired, show toast once and exit immediately
        // Check if we haven't shown the toast yet for this dialog session
        if (!hasShownExpiredToastRef.current) {
          hasShownExpiredToastRef.current = true
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            toast({
              title: 'Deposit Deadline Expired',
              description:
                'The deposit window has closed. Trade will be cancelled.',
              variant: 'destructive'
            })
            onOpenChange(false)
          }, 100) // Small delay to ensure dialog state is settled
        }
        return // Don't set up timer or do anything else
      }

      // Not expired yet, set up normal timer
      const updateTimer = () => {
        const now = new Date().getTime()
        const deadline = new Date(trade.depositDeadline!).getTime()
        const timeLeft = Math.max(0, deadline - now)
        setDepositTimeLeft(Math.floor(timeLeft / 1000)) // in seconds

        if (timeLeft <= 0) {
          // Clear the interval immediately
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }

          toast({
            title: 'Deposit Deadline Expired',
            description:
              'The deposit window has closed. Trade will be cancelled.',
            variant: 'destructive'
          })
          onOpenChange(false)
          return
        }
      }

      // Set initial time and start interval
      updateTimer()
      intervalRef.current = setInterval(updateTimer, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    // Reset when dialog closes
    if (!open) {
      setDepositTimeLeft(null)
      hasShownExpiredToastRef.current = false // Reset the flag when dialog closes
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [open, actionType, trade.depositDeadline, toast, onOpenChange])

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Get appropriate schema based on action type
  const getSchema = () => {
    switch (actionType) {
      case 'deposit':
        // For deposit, we don't need form validation since we handle it via blockchain
        return z.object({})
      case 'fund':
        // For domain trades, we don't need transactionHash since we handle payment via wallet
        return trade.listingCategory === 'domain' ? z.object({}) : fundSchema
      case 'payment_sent':
        return paymentSentSchema
      case 'confirm':
        return confirmSchema
      case 'dispute':
        return disputeSchema
      case 'cancel':
        return z.object({
          reason: z.string().optional()
        })
      default:
        return z.object({})
    }
  }

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      transactionHash: '',
      escrowId: 0,
      paymentProof: '',
      notes: '',
      confirmationMessage: '',
      reason: '',
      evidence: ''
    }
  })

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)

      let endpoint = ''
      let payload = {}
      let method = 'PUT'

      switch (actionType) {
        case 'deposit':
          // For seller depositing crypto to escrow
          if (!address) {
            toast({
              title: 'Wallet Not Connected',
              description: 'Please connect your wallet to deposit crypto',
              variant: 'destructive'
            })
            return
          }

          try {
            let finalEscrowId = trade.escrowId
            let txHash = ''

            // If no escrow exists, create one and fund it in the same transaction
            if (!finalEscrowId) {
              setIsCreatingEscrow(true)

              // In P2P trades:
              // - The seller (person selling crypto) creates the escrow and deposits crypto
              // - The buyer (person buying crypto) sends fiat payment
              // For the smart contract:
              // - msg.sender (current user = seller) becomes the contract's "buyer" (because they're depositing)
              // - The trade buyer becomes the contract's "seller" (because they'll receive the crypto)
              const tradeBuyerAddress =
                trade.buyer?.walletAddress || trade.buyerId // Trade buyer who will receive crypto

              // Create and fund escrow in one transaction using autoFund
              const createResult = await createEscrow({
                seller: tradeBuyerAddress as string, // Trade buyer will receive the crypto from escrow
                amount: trade.amount,
                disputeWindow: 7 * 24 * 60 * 60, // 7 days
                metadata: `Trade #${trade.id}`,
                autoFund: true // This will fund the escrow in the same transaction
              })

              if (
                !createResult.txHash ||
                createResult.escrowId === null ||
                createResult.escrowId === undefined
              ) {
                throw new Error(
                  'Failed to create and fund escrow - could not get escrow ID'
                )
              }

              txHash = createResult.txHash
              finalEscrowId = createResult.escrowId

              setIsCreatingEscrow(false)
            } else {
              // Escrow already exists, just fund it
              const fundTxHash = await fundEscrow(finalEscrowId, trade.amount)

              if (!fundTxHash) {
                throw new Error('Failed to fund escrow')
              }

              txHash = fundTxHash
            }

            // Update the backend with the transaction details
            endpoint = apiEndpoints.trades.deposit(trade.id)
            payload = {
              transactionHash: txHash,
              escrowId: finalEscrowId
            }
            method = 'POST'
          } catch (blockchainError) {
            console.error('Blockchain error:', blockchainError)
            setIsCreatingEscrow(false)
            throw new Error('Failed to deposit crypto to escrow')
          }
          break

        case 'fund':
          // For domain trades, handle wallet payment directly
          if (trade.listingCategory === 'domain') {
            if (!address) {
              toast({
                title: 'Wallet Not Connected',
                description: 'Please connect your wallet to send payment',
                variant: 'destructive'
              })
              return
            }

            try {
              setIsCreatingEscrow(true)

              // For domain trades, buyer creates and funds escrow
              const sellerAddress =
                trade.seller?.walletAddress || trade.sellerId

              // Convert USD amount to native currency via API
              const conversionResponse = await fetch(
                apiEndpoints.trades.convertPrice,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    usdAmount: trade.amount,
                    chainId: trade.chainId
                  })
                }
              )

              if (!conversionResponse.ok) {
                throw new Error('Failed to convert USD to native currency')
              }

              const conversionResult = await conversionResponse.json()
              const convertedNativeAmount = conversionResult.data.nativeAmount

              // Store the conversion info for display in the dialog
              setNativeAmount(convertedNativeAmount)
              setNativePrice(conversionResult.data.nativePrice)

              // Get native currency symbol
              import('@/lib/blockchain').then(({ getNativeCurrencySymbol }) => {
                const symbol = getNativeCurrencySymbol(trade.chainId)
                setNativeSymbol(symbol)
              })

              // Create and fund escrow in one transaction
              const createResult = await createEscrow({
                seller: sellerAddress as string, // Domain seller will receive payment
                amount: convertedNativeAmount, // Use converted native amount instead of USD
                disputeWindow: 7 * 24 * 60 * 60, // 7 days
                metadata: `Domain Trade #${trade.id}`,
                autoFund: true // Fund in the same transaction
              })

              if (
                !createResult.txHash ||
                createResult.escrowId === null ||
                createResult.escrowId === undefined
              ) {
                throw new Error('Failed to create and fund escrow')
              }

              // Update backend with transaction details
              endpoint = apiEndpoints.trades.fund(trade.id)
              payload = {
                transactionHash: createResult.txHash,
                escrowId: createResult.escrowId
              }
              method = 'POST'

              setIsCreatingEscrow(false)
            } catch (blockchainError) {
              console.error('Blockchain error:', blockchainError)
              setIsCreatingEscrow(false)
              throw new Error('Failed to send payment to escrow')
            }
          } else {
            // P2P trades use manual transaction hash
            endpoint = apiEndpoints.trades.fund(trade.id)
            payload = { transactionHash: data.transactionHash }
          }
          break

        case 'payment_sent':
          // First upload proof if files are selected
          if (paymentProofFiles.length > 0) {
            setUploadingProof(true)
            try {
              // Use centralized upload client
              const uploadResult = await uploadClient.uploadFiles(
                paymentProofFiles,
                {
                  uploadType:
                    trade.listingCategory === 'domain'
                      ? 'DOMAIN_TRANSFER_PROOFS'
                      : 'PAYMENT_PROOFS',
                  context: `trade-${trade.id}`,
                  onProgress: progress => {
                    console.log(`Upload progress: ${progress}%`)
                  }
                }
              )

              if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Failed to upload proof')
              }

              // Now mark payment as sent
              endpoint = apiEndpoints.trades.paymentSent(trade.id)
              payload = {
                paymentProof: uploadResult.urls?.join(',') || '',
                notes: data.notes
              }
              method = 'POST'
            } catch (uploadError: any) {
              console.error('Upload error:', uploadError)
              // Show more specific error message
              const errorMessage =
                uploadError.message || 'Failed to upload proof'
              throw new Error(errorMessage)
            } finally {
              setUploadingProof(false)
            }
          } else {
            // No files, just mark as sent
            endpoint = apiEndpoints.trades.paymentSent(trade.id)
            payload = { paymentProof: data.paymentProof, notes: data.notes }
            method = 'POST'
          }
          break

        case 'confirm':
          // When seller confirms payment, also release funds from escrow
          if (trade.status === 'payment_sent') {
            // Check if wallet is connected
            if (!address) {
              toast({
                title: 'Wallet Not Connected',
                description:
                  'Please connect your wallet to confirm payment and release funds',
                variant: 'destructive'
              })
              return
            }

            // Check if escrowId exists
            if (!trade.escrowId) {
              toast({
                title: 'No Escrow Found',
                description: 'This trade does not have an associated escrow.',
                variant: 'destructive'
              })
              setIsSubmitting(false)
              return
            }

            try {
              // Call smart contract to release funds to buyer
              const releaseTxHash = await confirmDelivery(trade.escrowId)

              if (releaseTxHash) {
                // Update backend with confirmation and release transaction
                endpoint = apiEndpoints.trades.confirm(trade.id)
                payload = {
                  message: data.confirmationMessage,
                  releaseTxHash: releaseTxHash
                }
              }
            } catch (error: any) {
              console.error('Error releasing funds:', error)
              handleFormError(
                error,
                toast,
                'Failed to release funds from escrow'
              )
              setIsSubmitting(false)
              return
            }
          } else {
            // For other confirm actions, just update the backend
            endpoint = apiEndpoints.trades.confirm(trade.id)
            payload = { message: data.confirmationMessage }
          }
          break

        case 'dispute':
          // First upload evidence images if files are selected
          if (disputeEvidenceFiles.length > 0) {
            setUploadingProof(true)
            try {
              // Use centralized upload client for dispute evidence
              const uploadResult = await uploadClient.uploadFiles(
                disputeEvidenceFiles,
                {
                  uploadType: 'DISPUTE_EVIDENCE',
                  context: `trade-${trade.id}`,
                  onProgress: progress => {
                    console.log(
                      `Dispute evidence upload progress: ${progress}%`
                    )
                  }
                }
              )

              if (!uploadResult.success) {
                throw new Error(
                  uploadResult.error || 'Failed to upload evidence'
                )
              }

              // Now raise dispute with uploaded evidence
              endpoint = apiEndpoints.trades.dispute(trade.id)
              payload = {
                reason: data.reason,
                evidence: data.evidence,
                evidenceImages: uploadResult.urls?.join(',') || ''
              }
              method = 'POST'
            } catch (uploadError: any) {
              console.error('Upload error:', uploadError)
              // Show more specific error message
              const errorMessage =
                uploadError.message || 'Failed to upload evidence'
              throw new Error(errorMessage)
            } finally {
              setUploadingProof(false)
            }
          } else {
            // No files, just raise dispute with text evidence
            endpoint = apiEndpoints.trades.dispute(trade.id)
            payload = { reason: data.reason, evidence: data.evidence }
            method = 'POST'
          }
          break

        case 'cancel':
          endpoint = apiEndpoints.trades.cancel(trade.id)
          payload = { reason: data.reason || 'Trade cancelled by user' }
          method = 'POST'
          break
      }

      const response =
        method === 'POST'
          ? await api.post(endpoint, payload, { shouldShowErrorToast: false })
          : await api.put(endpoint, payload, { shouldShowErrorToast: false })

      if (response.success) {
        form.reset()
        setPaymentProofFiles([])
        setDisputeEvidenceFiles([])

        // Show success toast for specific actions
        if (actionType === 'cancel') {
          toast({
            title: 'Trade Cancelled',
            description: 'The trade has been successfully cancelled.',
            variant: 'default'
          })
        } else if (actionType === 'dispute') {
          toast({
            title: 'Dispute Raised',
            description: 'Your dispute has been submitted for review.',
            variant: 'default'
          })
        } else if (actionType === 'payment_sent') {
          toast({
            title:
              trade.listingCategory === 'domain'
                ? 'Domain Transfer Initiated'
                : 'Payment Marked as Sent',
            description:
              trade.listingCategory === 'domain'
                ? 'Admin has been notified to verify the domain transfer.'
                : 'The seller has been notified of your payment.',
            variant: 'default'
          })
        } else if (actionType === 'confirm') {
          toast({
            title: 'Trade Confirmed',
            description:
              trade.status === 'payment_sent'
                ? 'Payment confirmed and crypto released successfully.'
                : 'Trade has been confirmed successfully.',
            variant: 'default'
          })
        } else if (actionType === 'fund') {
          toast({
            title: 'Escrow Funded Successfully',
            description:
              trade.listingCategory === 'domain'
                ? 'Payment sent to escrow successfully. Waiting for seller to transfer the domain.'
                : 'Trade has been funded successfully.',
            variant: 'default'
          })
        }

        onSuccess()
      } else {
        throw new Error(response.error || `Failed to ${actionType} trade`)
      }
    } catch (error) {
      handleFormError(error, toast, `Failed to ${actionType} trade`)
    } finally {
      setIsSubmitting(false)
      setUploadingProof(false)
    }
  }

  const getDialogTitle = () => {
    switch (actionType) {
      case 'deposit':
        return 'Deposit Crypto to Escrow'
      case 'fund':
        return 'Fund Escrow'
      case 'payment_sent':
        return trade.listingCategory === 'domain'
          ? 'Mark Domain Transferred'
          : 'Mark Payment as Sent'
      case 'confirm':
        return trade.status === 'payment_sent'
          ? trade.listingCategory === 'domain'
            ? 'Confirm Domain Receipt & Release Payment'
            : 'Confirm Payment & Release Crypto'
          : trade.status === 'funded'
            ? 'Confirm Delivery'
            : 'Confirm Receipt'
      case 'dispute':
        return 'Raise Dispute'
      case 'cancel':
        return 'Cancel Trade'
      default:
        return 'Trade Action'
    }
  }

  const getDialogDescription = () => {
    switch (actionType) {
      case 'deposit':
        return 'Securely deposit crypto to the escrow smart contract. The funds will be held until the trade is completed. You have 15 minutes to complete this action.'
      case 'fund':
        return 'Send funds to the escrow smart contract to proceed with the trade'
      case 'payment_sent':
        return trade.listingCategory === 'domain'
          ? 'Confirm that you have initiated the domain transfer to the buyer'
          : 'Mark that you have sent the fiat payment to the seller'
      case 'confirm':
        return trade.status === 'payment_sent'
          ? trade.listingCategory === 'domain'
            ? 'Confirm that you have received the domain transfer and release the payment from escrow to the seller. This will complete the trade.'
            : 'Confirm that you have received the fiat payment and release the crypto from escrow to the buyer. This will complete the trade.'
          : trade.status === 'funded'
            ? 'Confirm that you have delivered the goods/services to the buyer'
            : 'Confirm that you have received the goods/services from the seller'
      case 'dispute':
        return 'Raise a dispute if there are issues with this trade'
      case 'cancel':
        return 'Cancel this trade. This action cannot be undone.'
      default:
        return ''
    }
  }

  const handleImageClick = (images: string[]) => {
    setLightboxImages(images.map(src => ({ src })))
    setLightboxOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          {/* Trade Summary */}
          <Card className='bg-muted p-4'>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>Trade ID</span>
                <span className='font-mono'>#{trade.id}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>Amount</span>
                <span className='font-medium'>
                  {formatCurrency(trade.amount, trade.currency)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>
                  Counterparty
                </span>
                <span className='font-medium'>
                  {getUserDisplayName(
                    trade.buyer?.id === trade.buyerId
                      ? trade.seller
                      : trade.buyer
                  )}
                </span>
              </div>
            </div>
          </Card>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-6'
              data-no-progress='true'
            >
              {actionType === 'deposit' && (
                <>
                  {/* Deposit Timer */}
                  {depositTimeLeft !== null && (
                    <Alert
                      variant={
                        depositTimeLeft < 300 ? 'destructive' : 'default'
                      }
                    >
                      <Clock className='h-4 w-4' />
                      <AlertDescription>
                        <div className='flex items-center justify-between'>
                          <span>
                            Time remaining to deposit:{' '}
                            <strong>{formatTimeLeft(depositTimeLeft)}</strong>
                          </span>
                          {depositTimeLeft < 300 && (
                            <Badge variant='destructive'>Urgent</Badge>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert>
                    <Shield className='h-4 w-4' />
                    <AlertDescription>
                      <div className='space-y-2'>
                        <p>
                          The escrow smart contract will receive{' '}
                          <strong>
                            {formatCurrency(trade.amount, trade.currency)}
                          </strong>{' '}
                          automatically when you confirm the transaction.
                        </p>
                        <div className='space-y-1 text-sm'>
                          <div className='flex justify-between'>
                            <span>Amount:</span>
                            <span className='font-mono'>
                              {trade.amount} {trade.currency}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Platform Fee (2.5%):</span>
                            <span className='font-mono'>
                              {calculatedFee} {trade.currency}
                            </span>
                          </div>
                          <Separator className='my-1' />
                          <div className='flex justify-between font-medium'>
                            <span>Total to Deposit:</span>
                            <span className='font-mono'>
                              {(
                                parseFloat(trade.amount) +
                                parseFloat(calculatedFee)
                              ).toFixed(6)}{' '}
                              {trade.currency}
                            </span>
                          </div>
                          <div className='text-muted-foreground flex justify-between'>
                            <span>You'll Receive (after fee):</span>
                            <span className='font-mono'>
                              {(
                                parseFloat(trade.amount) -
                                parseFloat(calculatedFee)
                              ).toFixed(6)}{' '}
                              {trade.currency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Wallet Connection Status */}
                  {!address ? (
                    <Alert variant='destructive'>
                      <Wallet className='h-4 w-4' />
                      <AlertDescription>
                        Please connect your wallet to deposit crypto to escrow
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Card className='bg-muted p-4'>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>
                            Connected Wallet:
                          </span>
                          <span className='font-mono'>
                            {address.slice(0, 6)}...{address.slice(-4)}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>
                            Network:
                          </span>
                          <Badge variant='outline'>Chain ID: {chainId}</Badge>
                        </div>
                      </div>
                    </Card>
                  )}

                  {trade.escrowId ? (
                    <Card className='bg-muted p-4'>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>
                            Escrow ID:
                          </span>
                          <span className='font-mono font-medium'>
                            #{trade.escrowId}
                          </span>
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          This escrow was created when the trade was initiated
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <Card className='border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20'>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center gap-2'>
                          <CheckCircle className='h-4 w-4 text-green-600 dark:text-green-400' />
                          <span className='font-medium text-green-700 dark:text-green-300'>
                            Escrow will be automatically created
                          </span>
                        </div>
                        <p className='text-xs text-green-600 dark:text-green-400'>
                          When you click "Deposit to Escrow", a new escrow will
                          be created and funded in a single transaction.
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Instructions */}
                  <Alert>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      <ol className='list-inside list-decimal space-y-1 text-sm'>
                        <li>
                          Click "Deposit to Escrow" below to start the
                          transaction
                        </li>
                        <li>
                          Approve the transaction in your wallet when prompted
                        </li>
                        <li>Wait for blockchain confirmation</li>
                        <li>
                          The funds will be securely held in escrow until trade
                          completion
                        </li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {actionType === 'payment_sent' && (
                <>
                  {trade.listingCategory === 'domain' ? (
                    <>
                      <Alert>
                        <Globe className='h-4 w-4' />
                        <AlertDescription>
                          <div className='space-y-2'>
                            <p className='font-medium'>
                              Transfer the domain to our admin for verification
                            </p>
                            <div className='space-y-1 text-sm'>
                              <div className='flex justify-between'>
                                <span>Domain:</span>
                                <span className='font-medium'>
                                  {(trade.metadata as TradeMetadata)?.domainInfo
                                    ?.domainName || 'N/A'}
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Current Registrar:</span>
                                <span className='font-medium'>
                                  {(trade.metadata as TradeMetadata)?.domainInfo
                                    ?.registrar || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <Alert className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'>
                        <Mail className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                        <AlertDescription>
                          <div className='space-y-2'>
                            <p className='font-semibold text-blue-700 dark:text-blue-300'>
                              Transfer to Admin Email:
                            </p>
                            <div className='rounded-md bg-white p-3 dark:bg-gray-900'>
                              <p className='font-mono text-sm font-bold'>
                                {envPublic.NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL}
                              </p>
                            </div>
                            <div className='space-y-1 text-xs text-blue-600 dark:text-blue-400'>
                              <p>
                                ℹ️ For security, domains are first transferred
                                to our admin who verifies the transfer before
                                sending to the buyer.
                              </p>
                              <p>📝 Steps:</p>
                              <ol className='ml-4 list-decimal space-y-1'>
                                <li>
                                  Initiate transfer to the admin email above
                                </li>
                                <li>
                                  Complete any verification steps from your
                                  registrar
                                </li>
                                <li>Upload proof of transfer initiation</li>
                                <li>Mark as transferred once initiated</li>
                              </ol>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <Alert variant='default'>
                        <Shield className='h-4 w-4' />
                        <AlertDescription>
                          <p className='text-sm'>
                            The admin will verify the transfer and then send the
                            domain to the buyer ({trade.buyer?.email || 'buyer'}
                            ). Once confirmed, your payment will be released
                            from escrow.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </>
                  ) : (
                    <Alert>
                      <Shield className='h-4 w-4' />
                      <AlertDescription>
                        <div className='space-y-2'>
                          <p>
                            Send the fiat payment to the seller using the agreed
                            payment method.
                          </p>
                          <div className='space-y-1 text-sm'>
                            <div className='flex justify-between'>
                              <span>Amount to Send:</span>
                              <span className='font-medium'>
                                {formatCurrency(trade.amount, 'USD')}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span>Payment Method:</span>
                              <span className='font-medium'>
                                {(trade.metadata as TradeMetadata)
                                  ?.paymentMethod || 'Bank Transfer'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Proof Upload */}
                  <div className='space-y-2'>
                    <FormLabel>
                      {trade.listingCategory === 'domain'
                        ? 'Domain Transfer Proof'
                        : 'Payment Proof Screenshot'}{' '}
                      <Badge variant='destructive' className='ml-1'>
                        Required
                      </Badge>
                    </FormLabel>
                    <PaymentProofUpload
                      onFilesSelected={setPaymentProofFiles}
                      maxFiles={3}
                      required
                      disabled={isSubmitting || uploadingProof}
                      label={
                        trade.listingCategory === 'domain'
                          ? 'Upload Domain Transfer Proof'
                          : 'Upload Payment Proof'
                      }
                    />
                    <FormDescription>
                      {trade.listingCategory === 'domain'
                        ? `Upload screenshots showing the domain transfer has been initiated to ${envPublic.NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL} (transfer request, confirmation email, registrar screenshot, etc.)`
                        : 'Upload screenshots of your payment confirmation (bank transfer receipt, payment app screenshot, etc.)'}
                    </FormDescription>
                  </div>

                  <FormField
                    control={form.control}
                    name='notes'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='Reference number, sender name, or any other details...'
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Add any additional information that helps the seller
                          identify your payment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Warning */}
                  <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      {trade.listingCategory === 'domain'
                        ? 'Only mark as transferred after you have actually initiated the domain transfer. False claims may result in account suspension.'
                        : 'Only mark as sent after you have actually completed the payment. False claims may result in account suspension.'}
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {actionType === 'fund' && (
                <>
                  {trade.listingCategory === 'domain' ? (
                    <>
                      <Alert>
                        <Shield className='h-4 w-4' />
                        <AlertDescription>
                          <div className='space-y-2'>
                            <p>
                              You will send{' '}
                              <span className='font-bold'>
                                {formatCurrency(trade.amount, trade.currency)}
                              </span>{' '}
                              to the escrow smart contract.
                            </p>
                            {nativeAmount && nativeSymbol && nativePrice && (
                              <div className='rounded-md bg-blue-50 p-2 dark:bg-blue-950/30'>
                                <p className='text-sm font-medium'>
                                  Equivalent in {nativeSymbol}:{' '}
                                  <span className='font-mono font-bold text-blue-700 dark:text-blue-300'>
                                    {nativeAmount} {nativeSymbol}
                                  </span>
                                </p>
                                <p className='text-xs text-blue-600 dark:text-blue-400'>
                                  at current rate: 1 {nativeSymbol} = $
                                  {nativePrice.toFixed(2)}
                                </p>
                              </div>
                            )}
                            <p className='text-sm'>
                              The payment will be held securely until you
                              confirm receiving the domain.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>

                      {/* Domain Details */}
                      {(trade.metadata as TradeMetadata)?.domainInfo && (
                        <Card className='border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20'>
                          <div className='space-y-2'>
                            <div className='flex items-center gap-2'>
                              <Globe className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                              <span className='font-semibold text-blue-700 dark:text-blue-300'>
                                Domain Information
                              </span>
                            </div>
                            <div className='space-y-1 text-sm'>
                              <div className='flex justify-between'>
                                <span>Domain:</span>
                                <span className='font-medium'>
                                  {
                                    (trade.metadata as TradeMetadata).domainInfo
                                      ?.domainName
                                  }
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Registrar:</span>
                                <span className='font-medium'>
                                  {
                                    (trade.metadata as TradeMetadata).domainInfo
                                      ?.registrar
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Instructions */}
                      <Alert>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>
                          <ol className='list-inside list-decimal space-y-1 text-sm'>
                            <li>
                              Click "Send Payment" below to start the
                              transaction
                            </li>
                            <li>Approve the transaction in your wallet</li>
                            <li>Wait for blockchain confirmation</li>
                            <li>
                              Once confirmed, wait for seller to transfer the
                              domain
                            </li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </>
                  ) : (
                    <>
                      <Alert>
                        <Shield className='h-4 w-4' />
                        <AlertDescription>
                          Send exactly{' '}
                          {formatCurrency(trade.amount, trade.currency)} to the
                          escrow contract. The transaction hash will be verified
                          on-chain.
                        </AlertDescription>
                      </Alert>

                      <FormField
                        control={form.control}
                        name='transactionHash'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction Hash</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder='0x...' />
                            </FormControl>
                            <FormDescription>
                              Enter the transaction hash after sending funds to
                              escrow
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}

              {actionType === 'confirm' && (
                <>
                  {/* Display payment proof images if they exist */}
                  {trade.status === 'payment_sent' &&
                    (trade.metadata as TradeMetadata)?.paymentProofImages &&
                    (trade.metadata as TradeMetadata).paymentProofImages!
                      .length > 0 && (
                      <Card className='border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20'>
                        <div className='space-y-3'>
                          <div className='flex items-center gap-2'>
                            <ImageIcon className='h-5 w-5 text-green-600 dark:text-green-400' />
                            <span className='font-semibold text-green-700 dark:text-green-300'>
                              Payment Proof Attached
                            </span>
                          </div>
                          <div className='grid grid-cols-2 gap-2'>
                            {(
                              trade.metadata as TradeMetadata
                            ).paymentProofImages!.map(
                              (image: string, index: number) => (
                                <div
                                  key={index}
                                  className='relative aspect-video overflow-hidden rounded-lg border-2 border-green-300 dark:border-green-700'
                                >
                                  <img
                                    src={image}
                                    alt={`Payment proof ${index + 1}`}
                                    className='h-full w-full cursor-pointer object-cover transition-transform hover:scale-105'
                                    onClick={() =>
                                      handleImageClick(
                                        (trade.metadata as TradeMetadata)
                                          .paymentProofImages!
                                      )
                                    }
                                  />
                                  <div className='absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-2'>
                                    <p className='text-xs font-medium text-white'>
                                      Screenshot {index + 1}
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                          <p className='text-xs text-green-600 dark:text-green-400'>
                            Click on images to view in lightbox
                          </p>
                        </div>
                      </Card>
                    )}

                  {/* Show escrow release info when confirming payment */}
                  {trade.status === 'payment_sent' && (
                    <>
                      <Alert className='border-blue-500 bg-blue-50 dark:bg-blue-950/20'>
                        <Shield className='h-4 w-4 text-blue-600' />
                        <AlertDescription>
                          <div className='space-y-2'>
                            <p className='font-semibold text-blue-700 dark:text-blue-300'>
                              Confirm Payment & Release Crypto
                            </p>
                            <p>
                              By confirming, you acknowledge receiving the fiat
                              payment and will release{' '}
                              {formatCurrency(trade.amount, trade.currency)}{' '}
                              from escrow to the buyer.
                            </p>
                            <p className='text-sm text-blue-600 dark:text-blue-400'>
                              This action will complete the trade and cannot be
                              undone.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>

                      {/* Wallet connection status */}
                      {!address ? (
                        <Alert variant='destructive'>
                          <Wallet className='h-4 w-4' />
                          <AlertDescription>
                            Please connect your wallet to confirm payment and
                            release funds
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Card className='bg-muted p-4'>
                          <div className='space-y-2'>
                            <div className='flex justify-between text-sm'>
                              <span className='text-muted-foreground'>
                                Connected Wallet:
                              </span>
                              <span className='font-mono'>
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </span>
                            </div>
                            {trade.escrowId && (
                              <div className='flex justify-between text-sm'>
                                <span className='text-muted-foreground'>
                                  Escrow ID:
                                </span>
                                <span className='font-mono'>
                                  #{trade.escrowId}
                                </span>
                              </div>
                            )}
                            <div className='flex justify-between text-sm'>
                              <span className='text-muted-foreground'>
                                Amount to release:
                              </span>
                              <span className='font-bold'>
                                {formatCurrency(trade.amount, trade.currency)}
                              </span>
                            </div>
                            <div className='flex justify-between text-sm'>
                              <span className='text-muted-foreground'>
                                To buyer:
                              </span>
                              <span className='font-mono text-xs'>
                                {trade.buyer?.walletAddress?.slice(0, 6)}...
                                {trade.buyer?.walletAddress?.slice(-4)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      )}
                    </>
                  )}

                  {trade.status !== 'payment_sent' && (
                    <Alert>
                      <CheckCircle className='h-4 w-4' />
                      <AlertDescription>
                        {trade.status === 'funded'
                          ? 'By confirming delivery, you acknowledge that you have sent the goods/services to the buyer.'
                          : 'By confirming receipt, funds will be released to the seller. This action cannot be undone.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name='confirmationMessage'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='Add any notes about the transaction...'
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Add any additional information about the trade
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {actionType === 'dispute' && (
                <>
                  <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      Raising a dispute will freeze the trade until resolved.
                      Please try to resolve issues with the counterparty first.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name='reason'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Dispute</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='Describe the issue in detail...'
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a detailed explanation of the problem
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='evidence'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Evidence (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='Links to screenshots, transaction IDs, or other proof...'
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide any additional evidence text to support your
                          claim
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Evidence Image Upload */}
                  <div className='space-y-2'>
                    <FormLabel>
                      Upload Evidence Screenshots
                      <Badge variant='outline' className='ml-2'>
                        Optional
                      </Badge>
                    </FormLabel>
                    <PaymentProofUpload
                      onFilesSelected={setDisputeEvidenceFiles}
                      maxFiles={5}
                      disabled={isSubmitting || uploadingProof}
                    />
                    <FormDescription>
                      Upload screenshots, transaction confirmations, or any
                      visual evidence (max 5 images)
                    </FormDescription>
                  </div>
                </>
              )}

              {actionType === 'cancel' && (
                <>
                  <Alert>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      Are you sure you want to cancel this trade? This action
                      cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <FormField
                    control={form.control}
                    name='reason'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Reason for Cancellation (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='Please provide a reason for cancelling...'
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Let the other party know why you're cancelling
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Separator />

              <div className='flex justify-end space-x-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type='submit'
                  isLoading={
                    isSubmitting ||
                    uploadingProof ||
                    isBlockchainLoading ||
                    isCreatingEscrow
                  }
                  variant={
                    actionType === 'dispute' || actionType === 'cancel'
                      ? 'destructive'
                      : 'default'
                  }
                  className=''
                  disabled={
                    (actionType === 'payment_sent' &&
                      paymentProofFiles.length === 0) ||
                    (actionType === 'deposit' && !address)
                  }
                  loadingText={
                    uploadingProof
                      ? 'Uploading proof...'
                      : isBlockchainLoading
                        ? 'Processing blockchain transaction...'
                        : isCreatingEscrow
                          ? 'Creating escrow and depositing...'
                          : actionType === 'deposit'
                            ? 'Depositing...'
                            : actionType === 'fund'
                              ? 'Processing...'
                              : actionType === 'confirm'
                                ? 'Confirming...'
                                : actionType === 'payment_sent'
                                  ? 'Marking as sent...'
                                  : 'Submitting...'
                  }
                >
                  {actionType === 'deposit' && 'Deposit to Escrow'}
                  {actionType === 'fund' &&
                    (trade.listingCategory === 'domain'
                      ? isCreatingEscrow
                        ? 'Processing Payment...'
                        : 'Send Payment'
                      : 'Confirm Funding')}
                  {actionType === 'payment_sent' &&
                    (trade.listingCategory === 'domain'
                      ? 'Mark Domain Transferred to Admin'
                      : 'Mark Payment as Sent')}
                  {actionType === 'confirm' &&
                    (trade.status === 'payment_sent' ? (
                      <span className='relative z-10 flex items-center gap-2'>
                        <CheckCircle className='h-5 w-5' />
                        Confirm & Release Crypto
                      </span>
                    ) : (
                      'Confirm'
                    ))}
                  {actionType === 'dispute' && 'Raise Dispute'}
                  {actionType === 'cancel' && 'Cancel Trade'}
                </LoadingButton>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxImages}
      />
    </>
  )
}
