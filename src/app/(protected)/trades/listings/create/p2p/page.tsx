'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ChevronRight,
  Coins,
  Info,
  Target,
  Sparkles,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { mutate } from 'swr'

import { InlinePriceDisplay } from '@/components/blocks/market'
import { GamifiedHeader } from '@/components/blocks/trading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Label } from '@/components/ui/label'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useUnifiedChainInfo } from '@/context'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api/http-client'
import { DEFAULT_CHAIN_ID } from '@/lib/blockchain'
import { createListingSchema } from '@/lib/schemas/listings'
import { handleFormError, handleFormSuccess } from '@/lib/utils/form'
import { getSupportedTokensForChain, PAYMENT_METHODS } from '@/types/listings'

export default function CreateP2PListingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [okxDexPrice, setOkxDexPrice] = useState<number | null>(null)
  const [okxDexError, setOkxDexError] = useState<any>(null)
  const [coingeckoPrice, setCoingeckoPrice] = useState<number | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  // Get the current chain and supported tokens
  const { chainId } = useUnifiedChainInfo()
  const supportedTokens = getSupportedTokensForChain(
    chainId || DEFAULT_CHAIN_ID
  )

  const form = useForm<any>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      listingCategory: 'p2p',
      listingType: 'sell',
      tokenOffered: Object.keys(supportedTokens)[0] || '',
      amount: '',
      pricePerUnit: '',
      minAmount: '',
      maxAmount: '',
      paymentMethods: [],
      paymentWindow: 15
    }
  })

  // Auto-select native currency when chain changes
  useEffect(() => {
    if (chainId) {
      const newSupportedTokens = getSupportedTokensForChain(chainId)
      const nativeCurrency = Object.keys(newSupportedTokens)[0]

      // Only update if the native currency is different from current selection
      // or if the current selection is not available in the new chain
      const currentToken = form.getValues('tokenOffered')
      if (
        !newSupportedTokens[currentToken] ||
        currentToken !== nativeCurrency
      ) {
        form.setValue('tokenOffered', nativeCurrency)
      }
    }
  }, [chainId, form])

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)

      // Validate min/max amounts
      if (data.minAmount && data.maxAmount) {
        const min = parseFloat(data.minAmount)
        const max = parseFloat(data.maxAmount)
        if (min > max) {
          handleFormError(
            new Error('Minimum amount cannot be greater than maximum amount'),
            toast,
            'Validation Error'
          )
          return
        }
      }

      // Include chainId in the submission
      const submissionData = {
        ...data,
        chainId: (chainId || DEFAULT_CHAIN_ID).toString()
      }

      const response = await api.post(
        apiEndpoints.listings.create,
        submissionData
      )

      if (response.success) {
        handleFormSuccess(toast, 'P2P listing created successfully!')
        // Invalidate the listings cache to ensure new listing shows
        await mutate(apiEndpoints.listings.user)
        router.push(appRoutes.trades.myListings)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const listingType = form.watch('listingType')
  const amount = form.watch('amount')
  const pricePerUnit = form.watch('pricePerUnit')
  const selectedToken = form.watch('tokenOffered')

  // Calculate total value
  const totalValue =
    amount && pricePerUnit
      ? (parseFloat(amount) * parseFloat(pricePerUnit)).toFixed(2)
      : '0.00'

  // Fetch market prices when token changes
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const fetchMarketPrices = async () => {
      if (!selectedToken || !mounted) return

      setLoadingPrice(true)
      try {
        // Get the chain name and metadata
        const { okxDexClient } = await import('@/lib/api/okx-dex-client')
        const { getChainMetadata } = await import('@/lib/blockchain')

        const currentChainId = chainId || DEFAULT_CHAIN_ID
        const okxChainName =
          await okxDexClient.getChainNameFromId(currentChainId)
        const chainMeta = getChainMetadata(currentChainId)

        // Map token to CoinGecko ID based on chain
        let coingeckoId = chainMeta?.coingeckoId

        // Use OKX chain name if supported, otherwise use the chain's name from metadata
        // This ensures we pass the correct chain context even for unsupported chains
        const chainName =
          okxChainName || chainMeta?.name?.toLowerCase() || 'ethereum'

        const params = new URLSearchParams({
          chain: chainName,
          coingeckoId: coingeckoId || 'ethereum',
          tokenAddress: 'native'
        })

        const response = await api.get(
          `${apiEndpoints.market.combinedStats}?${params.toString()}`
        )

        // Handle both wrapped and unwrapped response formats
        const data = response.data || response
        if (mounted && data) {
          // Set prices based on what's available
          setOkxDexPrice(data.okxDexPrice) // Will be null if chain not supported
          setOkxDexError(data.okxDexError) // Error information if any
          setCoingeckoPrice(data.coingeckoPrice)
        }
      } catch (error) {
        console.error('Failed to fetch market prices:', error)
      } finally {
        if (mounted) {
          setLoadingPrice(false)
        }
      }
    }

    // Debounce the fetch to avoid duplicate calls
    timeoutId = setTimeout(fetchMarketPrices, 300)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [selectedToken, chainId])

  const suggestedPrice = okxDexPrice || coingeckoPrice
  const priceDifference =
    suggestedPrice && pricePerUnit
      ? (
          ((parseFloat(pricePerUnit) - suggestedPrice) / suggestedPrice) *
          100
        ).toFixed(2)
      : null

  return (
    <div className='container mx-auto max-w-4xl space-y-6 p-4'>
      {/* Header */}
      <GamifiedHeader
        title='CREATE P2P LISTING'
        subtitle='Set up your cryptocurrency buy or sell offer'
        icon={<Coins className='h-8 w-8 text-white' />}
        actions={
          <Button
            variant='outline'
            onClick={() => router.push(appRoutes.trades.listings.create)}
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Options
          </Button>
        }
      />

      {/* Tips Section */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='from-primary rounded-lg bg-gradient-to-br to-purple-600 p-2'>
                <Target className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='text-xs font-bold text-purple-600 uppercase dark:text-purple-400'>
                  Pro Tip
                </p>
                <p className='text-sm'>
                  Set competitive prices to attract more traders!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2'>
                <Sparkles className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                  Achievement
                </p>
                <p className='text-sm'>
                  Complete your first trade to unlock rewards!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2'>
                <Info className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                  Safety First
                </p>
                <p className='text-sm'>All trades are protected by escrow!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Card */}
      <Card className='relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5' />

        <CardHeader className='relative'>
          <CardTitle className='bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-2xl font-black text-transparent'>
            P2P Trading Configuration
          </CardTitle>
        </CardHeader>

        <CardContent className='relative'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Listing Type */}
              <FormField
                control={form.control}
                name='listingType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I want to</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select listing type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='sell'>Sell Crypto</SelectItem>
                        <SelectItem value='buy'>Buy Crypto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {listingType === 'sell'
                        ? "You'll receive payment and release crypto"
                        : "You'll send payment and receive crypto"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Token Selection */}
              <FormField
                control={form.control}
                name='tokenOffered'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cryptocurrency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select token' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(supportedTokens).map(token => (
                          <SelectItem key={token} value={token}>
                            {token}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The cryptocurrency you want to {listingType} (native to
                      current chain)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                {/* Amount */}
                <FormField
                  control={form.control}
                  name='amount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='0.00'
                          type='number'
                          step='0.000001'
                          min='0'
                        />
                      </FormControl>
                      <FormDescription>
                        Quantity to {listingType}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price Per Unit */}
                <FormField
                  control={form.control}
                  name='pricePerUnit'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per unit (USD)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='0.00'
                          type='number'
                          step='0.01'
                          min='0'
                        />
                      </FormControl>
                      <FormDescription>Price in USD per token</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* OKX DEX Market Price Suggestion */}
              {selectedToken && (
                <Card className='border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Activity className='h-5 w-5 text-blue-500' />
                        <span className='text-sm font-semibold'>
                          Market Data
                        </span>
                      </div>
                      {loadingPrice && (
                        <span className='text-muted-foreground text-xs'>
                          Loading...
                        </span>
                      )}
                    </div>

                    {!loadingPrice && (suggestedPrice || coingeckoPrice) && (
                      <div className='mt-3 space-y-2'>
                        <div className='grid grid-cols-2 gap-4 text-sm'>
                          <InlinePriceDisplay
                            label='OKX DEX Price'
                            price={okxDexPrice}
                            error={okxDexError}
                          />
                          {(coingeckoPrice || !okxDexPrice) && (
                            <InlinePriceDisplay
                              label='CoinGecko'
                              price={coingeckoPrice}
                              error={null}
                              priceClassName='ml-2 font-bold text-green-600 dark:text-green-400'
                            />
                          )}
                        </div>

                        {pricePerUnit && priceDifference && (
                          <div className='border-t pt-2'>
                            <span className='text-muted-foreground text-xs'>
                              Your price is{' '}
                              <span
                                className={
                                  parseFloat(priceDifference) > 0
                                    ? 'text-red-500'
                                    : 'text-green-500'
                                }
                              >
                                {parseFloat(priceDifference) > 0 ? '+' : ''}
                                {priceDifference}%
                              </span>{' '}
                              compared to market
                            </span>
                          </div>
                        )}

                        {suggestedPrice && !pricePerUnit && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='w-full'
                            onClick={() =>
                              form.setValue(
                                'pricePerUnit',
                                suggestedPrice.toFixed(2)
                              )
                            }
                          >
                            <TrendingUp className='mr-2 h-4 w-4' />
                            Use Market Price (${suggestedPrice.toFixed(2)})
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Total Value Display */}
              {amount && pricePerUnit && (
                <div className='bg-muted rounded-lg p-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground text-sm'>
                      Total Value
                    </span>
                    <span className='text-lg font-semibold'>
                      ${totalValue} USD
                    </span>
                  </div>
                </div>
              )}

              <div className='grid grid-cols-2 gap-4'>
                {/* Min Amount */}
                <FormField
                  control={form.control}
                  name='minAmount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='0.00'
                          type='number'
                          step='0.000001'
                          min='0'
                        />
                      </FormControl>
                      <FormDescription>Minimum trade amount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Max Amount */}
                <FormField
                  control={form.control}
                  name='maxAmount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='0.00'
                          type='number'
                          step='0.000001'
                          min='0'
                        />
                      </FormControl>
                      <FormDescription>Maximum trade amount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Payment Window */}
              <FormField
                control={form.control}
                name='paymentWindow'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Window</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select payment window' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='15'>15 minutes</SelectItem>
                        <SelectItem value='30'>30 minutes</SelectItem>
                        <SelectItem value='60'>1 hour</SelectItem>
                        <SelectItem value='120'>2 hours</SelectItem>
                        <SelectItem value='240'>4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Time limit for deposit after trade acceptance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Methods */}
              <FormField
                control={form.control}
                name='paymentMethods'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accepted Payment Methods</FormLabel>
                    <FormDescription>
                      Select the payment methods you accept
                    </FormDescription>
                    <div className='mt-4 grid gap-4 md:grid-cols-2'>
                      {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
                        <div
                          key={key}
                          className='flex items-center space-x-2 rounded-lg border p-3'
                        >
                          <Checkbox
                            id={key}
                            checked={field.value?.includes(value)}
                            onCheckedChange={(
                              checked: boolean | 'indeterminate'
                            ) => {
                              const current = field.value || []
                              if (checked === true) {
                                field.onChange([...current, value])
                              } else if (checked === false) {
                                field.onChange(
                                  current.filter((v: string) => v !== value)
                                )
                              }
                            }}
                          />
                          <Label
                            htmlFor={key}
                            className='cursor-pointer text-sm font-normal'
                          >
                            {key
                              .split('_')
                              .map(
                                word =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase()
                              )
                              .join(' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Buttons */}
              <div className='border-primary/30 from-primary/10 relative rounded-xl border-2 bg-gradient-to-br to-purple-600/10 p-6'>
                <div className='bg-primary text-primary-foreground absolute top-0 left-0 flex -translate-y-1/2 items-center gap-2 rounded-full px-4 py-1 text-xs font-black'>
                  <ChevronRight className='h-3 w-3' />
                  FINAL STEP
                </div>
                <div className='flex justify-between gap-4'>
                  <Button
                    type='button'
                    variant='outline'
                    size='lg'
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className='border-2 font-bold'
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    type='submit'
                    size='lg'
                    isLoading={isSubmitting}
                    loadingText='Creating...'
                    className='bg-gradient-to-r from-blue-600 to-cyan-700 font-bold text-white shadow-lg hover:from-blue-700 hover:to-cyan-800'
                  >
                    <Coins className='mr-2 h-5 w-5' />
                    CREATE P2P LISTING
                  </LoadingButton>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
