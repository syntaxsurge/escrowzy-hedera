import { useState } from 'react'

import { DollarSign } from 'lucide-react'

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
import { useLoading } from '@/hooks/use-loading'
import { cn } from '@/lib'

interface EarningsData {
  total: string
  available: string
  withdrawn: string
  currency: string
  totalUSD?: number
  availableUSD?: number
  withdrawnUSD?: number
}

interface ContractEarningsCardProps {
  title?: string
  description?: string
  earnings: EarningsData
  walletAddress?: string
  isConnected: boolean
  onWithdraw: (address: string, amount: string) => Promise<void>
  className?: string
  showUSD?: boolean
}

export function ContractEarningsCard({
  title = 'Contract Earnings',
  description = 'Withdraw accumulated earnings from the smart contract',
  earnings,
  walletAddress,
  isConnected,
  onWithdraw,
  className,
  showUSD = true
}: ContractEarningsCardProps) {
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const withdrawButton = useLoading({
    defaultText: 'Withdraw',
    loadingText: 'Processing',
    icon: <DollarSign className='h-4 w-4' />,
    withButton: true
  })

  const handleWithdraw = async () => {
    await withdrawButton.execute(async () => {
      await onWithdraw(withdrawAddress, withdrawAmount)
      setWithdrawAddress('')
      setWithdrawAmount('')
    })
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Earnings Overview */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {showUSD && earnings.totalUSD !== undefined ? (
                <>
                  <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                    ${earnings.totalUSD.toFixed(2)}
                  </div>
                  <div className='text-foreground/70 dark:text-foreground/80 text-sm'>
                    {earnings.total} {earnings.currency}
                  </div>
                </>
              ) : (
                <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                  {earnings.total} {earnings.currency}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Available for Withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {showUSD && earnings.availableUSD !== undefined ? (
                <>
                  <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                    ${earnings.availableUSD.toFixed(2)}
                  </div>
                  <div className='text-foreground/70 dark:text-foreground/80 text-sm'>
                    {earnings.available} {earnings.currency}
                  </div>
                </>
              ) : (
                <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                  {earnings.available} {earnings.currency}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Total Withdrawn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {showUSD && earnings.withdrawnUSD !== undefined ? (
                <>
                  <div className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
                    ${earnings.withdrawnUSD.toFixed(2)}
                  </div>
                  <div className='text-foreground/70 dark:text-foreground/80 text-sm'>
                    {earnings.withdrawn} {earnings.currency}
                  </div>
                </>
              ) : (
                <div className='text-2xl font-bold text-orange-600 dark:text-orange-400'>
                  {earnings.withdrawn} {earnings.currency}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Section */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='withdrawAddress'>Withdrawal Address</Label>
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
              <Label htmlFor='withdrawAmount'>
                Amount ({earnings.currency})
              </Label>
              <div className='flex gap-2'>
                <Input
                  id='withdrawAmount'
                  type='number'
                  step='0.001'
                  placeholder='0.000'
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className='flex-1'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setWithdrawAmount(earnings.available)}
                  disabled={parseFloat(earnings.available) === 0}
                  className='px-3 font-semibold'
                >
                  MAX
                </Button>
              </div>
              <p className='text-muted-foreground mt-1 text-xs'>
                Available: {earnings.available} {earnings.currency}
                {showUSD && earnings.availableUSD !== undefined && (
                  <> (${earnings.availableUSD.toFixed(2)})</>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={handleWithdraw}
            disabled={
              withdrawButton.isLoading ||
              !isConnected ||
              !withdrawAddress ||
              !withdrawAmount ||
              parseFloat(earnings.available) === 0
            }
            className='w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md transition-all duration-200 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
          >
            {!isConnected
              ? 'Connect Wallet to Withdraw'
              : withdrawButton.buttonContent}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
