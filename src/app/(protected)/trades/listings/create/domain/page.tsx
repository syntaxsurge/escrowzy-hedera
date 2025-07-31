'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Info,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { mutate } from 'swr'

import { GamifiedHeader } from '@/components/blocks/trading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { useUnifiedChainInfo } from '@/context'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api/http-client'
import { DEFAULT_CHAIN_ID } from '@/lib/blockchain'
import { createListingSchema } from '@/lib/schemas/listings'
import { handleFormSuccess } from '@/lib/utils/form'
import { DOMAIN_REGISTRARS, getSupportedTokensForChain } from '@/types/listings'

export default function CreateDomainListingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get the current chain and supported tokens
  const { chainId } = useUnifiedChainInfo()
  const supportedTokens = getSupportedTokensForChain(
    chainId || DEFAULT_CHAIN_ID
  )

  const form = useForm<any>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      listingCategory: 'domain',
      listingType: 'sell',
      domainName: '',
      price: '',
      tokenOffered: Object.keys(supportedTokens)[0] || '',
      registrar: '',
      domainAge: '',
      expiryDate: '',
      monthlyTraffic: '',
      monthlyRevenue: '',
      description: '',
      paymentWindow: 30
    }
  })

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)

      const response = await api.post(apiEndpoints.listings.create, data)

      if (response.success) {
        handleFormSuccess(toast, 'Domain listing created successfully!')
        // Invalidate the listings cache to ensure new listing shows
        await mutate(apiEndpoints.listings.user)
        router.push(appRoutes.trades.myListings)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='container mx-auto max-w-4xl space-y-6 p-4'>
      {/* Header */}
      <GamifiedHeader
        title='CREATE DOMAIN LISTING'
        subtitle='List your domain or website for sale with escrow protection'
        icon={<Globe className='h-8 w-8 text-white' />}
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

      {/* Domain Transfer Notice */}
      <Alert className='border-amber-500/50 bg-amber-50/10'>
        <Info className='h-4 w-4' />
        <AlertTitle>Manual Transfer Process</AlertTitle>
        <AlertDescription>
          Domain transfers are currently handled manually through our escrow
          team. After a buyer accepts your listing, you'll receive instructions
          to transfer the domain to our admin email:{' '}
          <strong>{envPublic.NEXT_PUBLIC_DOMAIN_ESCROW_EMAIL}</strong>. We'll
          then transfer it to the buyer upon payment confirmation.
          <br />
          <br />
          <strong>Coming Soon:</strong> Automated transfers with GoDaddy,
          Namecheap, and other major registrars.
        </AlertDescription>
      </Alert>

      {/* Tips Section */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='from-primary rounded-lg bg-gradient-to-br to-purple-600 p-2'>
                <TrendingUp className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='text-xs font-bold text-purple-600 uppercase dark:text-purple-400'>
                  Pro Tip
                </p>
                <p className='text-sm'>
                  Include traffic stats to increase buyer interest!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2'>
                <Calendar className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                  Important
                </p>
                <p className='text-sm'>
                  Provide accurate expiry dates for transparency
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-2'>
                <Users className='h-5 w-5 text-white' />
              </div>
              <div>
                <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                  Trust
                </p>
                <p className='text-sm'>100% secure escrow protection</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Card */}
      <Card className='relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5' />

        <CardHeader className='relative'>
          <CardTitle className='bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-black text-transparent'>
            Domain Listing Details
          </CardTitle>
        </CardHeader>

        <CardContent className='relative'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Basic Information */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>Basic Information</h3>

                {/* Domain Name */}
                <FormField
                  control={form.control}
                  name='domainName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='example.com'
                          className='font-mono'
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the full domain name without https://
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cryptocurrency Selection */}
                <FormField
                  control={form.control}
                  name='tokenOffered'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accepted Cryptocurrency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select cryptocurrency' />
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
                        The cryptocurrency buyers must pay to the smart contract
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-2 gap-4'>
                  {/* Price */}
                  <FormField
                    control={form.control}
                    name='price'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asking Price (USD)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='1000'
                            type='number'
                            min='1'
                          />
                        </FormControl>
                        <FormDescription>Set your price in USD</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Registrar */}
                  <FormField
                    control={form.control}
                    name='registrar'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Registrar</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select registrar' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(DOMAIN_REGISTRARS).map(
                              ([key, value]) => (
                                <SelectItem key={key} value={value}>
                                  {value}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Where the domain is registered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  {/* Domain Age */}
                  <FormField
                    control={form.control}
                    name='domainAge'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Age (Years)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='0'
                            type='number'
                            min='0'
                            onChange={e => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>How old is the domain</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiry Date */}
                  <FormField
                    control={form.control}
                    name='expiryDate'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input {...field} type='date' />
                        </FormControl>
                        <FormDescription>When does it expire</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Optional Information */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>Optional Information</h3>

                <div className='grid grid-cols-2 gap-4'>
                  {/* Monthly Traffic */}
                  <FormField
                    control={form.control}
                    name='monthlyTraffic'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Traffic</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='0'
                            type='number'
                            min='0'
                            onChange={e => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Average monthly visitors
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Monthly Revenue */}
                  <FormField
                    control={form.control}
                    name='monthlyRevenue'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Revenue (USD)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='0'
                            type='number'
                            min='0'
                            onChange={e => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>If monetized</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder='Describe your domain, its history, potential uses...'
                          className='min-h-[100px]'
                        />
                      </FormControl>
                      <FormDescription>
                        Help buyers understand the value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                    className='bg-gradient-to-r from-purple-600 to-pink-700 font-bold text-white shadow-lg hover:from-purple-700 hover:to-pink-800'
                  >
                    <Globe className='mr-2 h-5 w-5' />
                    CREATE DOMAIN LISTING
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
