'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Split,
  Image as ImageIcon,
  DollarSign
} from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'

import { ServerSideTable } from '@/components/blocks/table/server-side-table'
import {
  showSuccessToast,
  showErrorToast
} from '@/components/blocks/toast-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { apiEndpoints } from '@/config/api-endpoints'
import { useDialogState } from '@/hooks/use-dialog-state'
import { useLoading } from '@/hooks/use-loading'
import { api } from '@/lib/api/http-client'
import type { DisputedTradeWithUsers } from '@/lib/db/queries/admin-disputes'
import {
  createDateColumnConfig,
  createBadgeColumnConfig,
  type ColumnConfig
} from '@/lib/table/table-columns-config'
import { formatCurrency } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'
import type { TradeMetadata } from '@/types/trade'

import 'yet-another-react-lightbox/styles.css'

interface DisputesTableProps {
  data: DisputedTradeWithUsers[]
  pageCount: number
  totalCount: number
}

export function DisputesTable({
  data,
  pageCount,
  totalCount
}: DisputesTableProps) {
  const router = useRouter()
  const resolveDialog = useDialogState<DisputedTradeWithUsers>()
  const viewDetailsDialog = useDialogState<DisputedTradeWithUsers>()
  const { isLoading: isResolving, execute: executeResolve } = useLoading()

  const [resolution, setResolution] = useState<
    'release_to_seller' | 'refund_to_buyer' | 'split'
  >('release_to_seller')
  const [splitPercentage, setSplitPercentage] = useState(50)
  const [notes, setNotes] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<Array<{ src: string }>>(
    []
  )

  const handleResolveDispute = async () => {
    if (!resolveDialog.data) return

    if (!notes || notes.length < 10) {
      showErrorToast('Please provide detailed notes (min 10 characters)')
      return
    }

    await executeResolve(async () => {
      const response = await api.post(
        apiEndpoints.admin.disputes.resolve(resolveDialog.data!.id),
        {
          resolution,
          notes,
          ...(resolution === 'split' && { splitPercentage })
        }
      )

      if (response.success) {
        showSuccessToast('Dispute resolved successfully')
        resolveDialog.close()
        router.refresh()
      } else {
        showErrorToast(response.error || 'Failed to resolve dispute')
      }
    })
  }

  const handleViewImages = (images: string | string[]) => {
    const imageArray =
      typeof images === 'string' ? images.split(',').filter(Boolean) : images

    if (imageArray.length > 0) {
      setLightboxImages(
        imageArray.map(src => ({
          src: src.startsWith('/') ? `/api/uploads/${src}` : src
        }))
      )
      setLightboxOpen(true)
    }
  }

  const columnConfigs: ColumnConfig[] = [
    {
      accessorKey: 'id',
      header: 'Trade ID',
      type: 'custom',
      enableSorting: true
    },
    {
      id: 'parties',
      header: 'Parties',
      type: 'custom',
      enableSorting: false
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      type: 'custom',
      enableSorting: true
    },
    createBadgeColumnConfig({
      header: 'Category',
      accessorKey: 'listingCategory',
      enableSorting: true
    }),
    {
      id: 'reason',
      header: 'Dispute Reason',
      type: 'custom',
      enableSorting: false
    },
    createDateColumnConfig({
      header: 'Disputed At',
      accessorKey: 'disputedAt',
      format: 'relative',
      enableSorting: true
    }),
    {
      id: 'actions',
      header: 'Actions',
      type: 'custom',
      enableSorting: false
    }
  ]

  const customRenderers = {
    id: (trade: DisputedTradeWithUsers) => (
      <div className='font-mono text-sm'>#{trade.id}</div>
    ),
    parties: (trade: DisputedTradeWithUsers) => (
      <div className='space-y-2 text-sm'>
        <div>
          <span className='text-muted-foreground'>Buyer:</span>{' '}
          <span className='font-medium'>
            {trade.buyer ? getUserDisplayName(trade.buyer) : 'Unknown'}
          </span>
        </div>
        <div>
          <span className='text-muted-foreground'>Seller:</span>{' '}
          <span className='font-medium'>
            {trade.seller ? getUserDisplayName(trade.seller) : 'Unknown'}
          </span>
        </div>
      </div>
    ),
    amount: (trade: DisputedTradeWithUsers) => (
      <div className='font-medium'>
        {formatCurrency(trade.amount, trade.currency)}
      </div>
    ),
    reason: (trade: DisputedTradeWithUsers) => {
      const metadata = trade.metadata as TradeMetadata
      return (
        <div className='max-w-xs'>
          <p className='line-clamp-2 text-sm'>
            {metadata?.disputeReason || 'No reason provided'}
          </p>
        </div>
      )
    },
    actions: (trade: DisputedTradeWithUsers) => (
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => viewDetailsDialog.open(trade)}
        >
          <Eye className='mr-1 h-4 w-4' />
          View
        </Button>
        <Button
          variant='default'
          size='sm'
          onClick={() => {
            resolveDialog.open(trade)
            setResolution('release_to_seller')
            setSplitPercentage(50)
            setNotes('')
          }}
        >
          <AlertTriangle className='mr-1 h-4 w-4' />
          Resolve
        </Button>
      </div>
    )
  }

  return (
    <>
      <ServerSideTable
        data={data}
        columnConfigs={columnConfigs}
        customRenderers={customRenderers}
        pageCount={pageCount}
        totalCount={totalCount}
      />

      {/* Resolve Dispute Dialog */}
      <Dialog
        open={resolveDialog.isOpen}
        onOpenChange={open => !open && resolveDialog.close()}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              Resolve Dispute - Trade #{resolveDialog.data?.id}
            </DialogTitle>
            <DialogDescription>
              Review the dispute details and provide a resolution
            </DialogDescription>
          </DialogHeader>

          {resolveDialog.data && (
            <div className='space-y-4'>
              {/* Trade Summary */}
              <div className='bg-muted space-y-2 rounded-lg p-4'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>Amount</span>
                  <span className='font-medium'>
                    {formatCurrency(
                      resolveDialog.data.amount,
                      resolveDialog.data.currency
                    )}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>Buyer</span>
                  <span className='text-sm'>
                    {resolveDialog.data.buyer
                      ? getUserDisplayName(resolveDialog.data.buyer)
                      : 'Unknown'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>Seller</span>
                  <span className='text-sm'>
                    {resolveDialog.data.seller
                      ? getUserDisplayName(resolveDialog.data.seller)
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Dispute Details */}
              <div className='space-y-3'>
                <div>
                  <Label className='text-sm font-medium'>Dispute Reason</Label>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {(resolveDialog.data.metadata as TradeMetadata)
                      ?.disputeReason || 'No reason provided'}
                  </p>
                </div>

                {(resolveDialog.data.metadata as TradeMetadata)
                  ?.disputeEvidence && (
                  <div>
                    <Label className='text-sm font-medium'>Evidence</Label>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      {
                        (resolveDialog.data.metadata as TradeMetadata)
                          .disputeEvidence
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Resolution Options */}
              <div className='space-y-4'>
                <div>
                  <Label>Resolution Type</Label>
                  <Select
                    value={resolution}
                    onValueChange={(value: any) => setResolution(value)}
                  >
                    <SelectTrigger className='mt-2'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='release_to_seller'>
                        <div className='flex items-center gap-2'>
                          <CheckCircle className='h-4 w-4 text-green-600' />
                          Release to Seller
                        </div>
                      </SelectItem>
                      <SelectItem value='refund_to_buyer'>
                        <div className='flex items-center gap-2'>
                          <XCircle className='h-4 w-4 text-red-600' />
                          Refund to Buyer
                        </div>
                      </SelectItem>
                      <SelectItem value='split'>
                        <div className='flex items-center gap-2'>
                          <Split className='h-4 w-4 text-orange-600' />
                          Split Between Parties
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {resolution === 'split' && (
                  <div>
                    <Label>Split Percentage (Seller Gets)</Label>
                    <div className='mt-2 space-y-3'>
                      <div className='flex items-center gap-4'>
                        <Slider
                          value={[splitPercentage]}
                          onValueChange={([value]) => setSplitPercentage(value)}
                          min={0}
                          max={100}
                          step={5}
                          className='flex-1'
                        />
                        <div className='w-20'>
                          <Input
                            type='number'
                            value={splitPercentage}
                            onChange={e =>
                              setSplitPercentage(Number(e.target.value))
                            }
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                      <div className='text-muted-foreground flex justify-between text-sm'>
                        <span>Buyer: {100 - splitPercentage}%</span>
                        <span>Seller: {splitPercentage}%</span>
                      </div>
                      <div className='flex justify-between text-sm font-medium'>
                        <span>
                          Buyer gets:{' '}
                          {formatCurrency(
                            (
                              (parseFloat(resolveDialog.data.amount) *
                                (100 - splitPercentage)) /
                              100
                            ).toFixed(2),
                            resolveDialog.data.currency
                          )}
                        </span>
                        <span>
                          Seller gets:{' '}
                          {formatCurrency(
                            (
                              (parseFloat(resolveDialog.data.amount) *
                                splitPercentage) /
                              100
                            ).toFixed(2),
                            resolveDialog.data.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Resolution Notes (Required)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder='Provide detailed notes about your resolution decision...'
                    rows={4}
                    className='mt-2'
                  />
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Min 10 characters. These notes will be saved for record
                    keeping.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={resolveDialog.close}>
              Cancel
            </Button>
            <LoadingButton
              isLoading={isResolving}
              onClick={handleResolveDispute}
              variant='default'
            >
              <DollarSign className='mr-1 h-4 w-4' />
              Resolve Dispute
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsDialog.isOpen}
        onOpenChange={open => !open && viewDetailsDialog.close()}
      >
        <DialogContent className='max-h-[80vh] max-w-3xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              Dispute Details - Trade #{viewDetailsDialog.data?.id}
            </DialogTitle>
          </DialogHeader>

          {viewDetailsDialog.data && (
            <div className='space-y-6'>
              {/* Trade Information */}
              <div>
                <h3 className='mb-3 text-sm font-semibold'>
                  Trade Information
                </h3>
                <div className='bg-muted grid grid-cols-2 gap-4 rounded-lg p-4'>
                  <div>
                    <span className='text-muted-foreground text-sm'>
                      Trade ID
                    </span>
                    <p className='font-mono'>#{viewDetailsDialog.data.id}</p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-sm'>
                      Amount
                    </span>
                    <p className='font-medium'>
                      {formatCurrency(
                        viewDetailsDialog.data.amount,
                        viewDetailsDialog.data.currency
                      )}
                    </p>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-sm'>
                      Category
                    </span>
                    <div className='mt-1'>
                      <Badge
                        variant={
                          viewDetailsDialog.data.listingCategory === 'domain'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {viewDetailsDialog.data.listingCategory === 'domain'
                          ? 'Domain'
                          : 'P2P'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className='text-muted-foreground text-sm'>
                      Escrow ID
                    </span>
                    <p className='font-mono'>
                      {viewDetailsDialog.data.escrowId || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div>
                <h3 className='mb-3 text-sm font-semibold'>Parties Involved</h3>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-muted rounded-lg p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Buyer</h4>
                    <div className='space-y-1 text-sm'>
                      <p className='break-words'>
                        {viewDetailsDialog.data?.buyer?.name || 'Unknown'}
                      </p>
                      <p className='text-muted-foreground break-words'>
                        {viewDetailsDialog.data?.buyer?.email}
                      </p>
                      <p className='font-mono text-xs break-all'>
                        {viewDetailsDialog.data?.buyer?.walletAddress}
                      </p>
                    </div>
                  </div>
                  <div className='bg-muted rounded-lg p-4'>
                    <h4 className='mb-2 text-sm font-medium'>Seller</h4>
                    <div className='space-y-1 text-sm'>
                      <p className='break-words'>
                        {viewDetailsDialog.data?.seller?.name || 'Unknown'}
                      </p>
                      <p className='text-muted-foreground break-words'>
                        {viewDetailsDialog.data?.seller?.email}
                      </p>
                      <p className='font-mono text-xs break-all'>
                        {viewDetailsDialog.data?.seller?.walletAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dispute Information */}
              <div>
                <h3 className='mb-3 text-sm font-semibold'>
                  Dispute Information
                </h3>
                <div className='space-y-3'>
                  <div>
                    <Label className='text-sm'>Reason</Label>
                    <p className='bg-muted mt-1 rounded-lg p-3 text-sm'>
                      {(viewDetailsDialog.data.metadata as TradeMetadata)
                        ?.disputeReason || 'No reason provided'}
                    </p>
                  </div>

                  {(viewDetailsDialog.data.metadata as TradeMetadata)
                    ?.disputeEvidence && (
                    <div>
                      <Label className='text-sm'>Text Evidence</Label>
                      <p className='bg-muted mt-1 rounded-lg p-3 text-sm'>
                        {
                          (viewDetailsDialog.data.metadata as TradeMetadata)
                            .disputeEvidence
                        }
                      </p>
                    </div>
                  )}

                  {/* Evidence Images */}
                  <div className='flex flex-wrap gap-2'>
                    {(viewDetailsDialog.data.metadata as TradeMetadata)
                      ?.disputeEvidenceImages && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          handleViewImages(
                            (viewDetailsDialog.data?.metadata as TradeMetadata)
                              .disputeEvidenceImages!
                          )
                        }
                      >
                        <ImageIcon className='mr-2 h-4 w-4' />
                        View Evidence Images
                      </Button>
                    )}

                    {(viewDetailsDialog.data.metadata as TradeMetadata)
                      ?.paymentProofImages && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          handleViewImages(
                            (viewDetailsDialog.data?.metadata as TradeMetadata)
                              .paymentProofImages!
                          )
                        }
                      >
                        <ImageIcon className='mr-2 h-4 w-4' />
                        View Payment Proof
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className='mb-3 text-sm font-semibold'>Timeline</h3>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Trade Created</span>
                    <span>
                      {new Date(
                        viewDetailsDialog.data.createdAt
                      ).toLocaleString()}
                    </span>
                  </div>
                  {(viewDetailsDialog.data.metadata as TradeMetadata)
                    ?.fundedAt && (
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Funded</span>
                      <span>
                        {new Date(
                          (
                            viewDetailsDialog.data.metadata as TradeMetadata
                          ).fundedAt!
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {(viewDetailsDialog.data.metadata as TradeMetadata)
                    ?.disputedAt && (
                    <div className='flex justify-between text-sm'>
                      <span className='text-muted-foreground'>Disputed</span>
                      <span>
                        {new Date(
                          (
                            viewDetailsDialog.data.metadata as TradeMetadata
                          ).disputedAt!
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox for Images */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxImages}
      />
    </>
  )
}
