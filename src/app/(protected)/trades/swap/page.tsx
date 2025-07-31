'use client'

import Link from 'next/link'
import { useState } from 'react'

import {
  ArrowDownUp,
  ArrowRightLeft,
  TrendingUp,
  Shield,
  Activity,
  Users,
  Globe,
  Fuel,
  Server,
  Network,
  AlertCircle
} from 'lucide-react'
import useSWR from 'swr'

import {
  GamifiedHeader,
  GamifiedStatsCards,
  type StatCard
} from '@/components/blocks/trading'
import { OKXQueueStatus } from '@/components/okx-queue-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useUnifiedChainInfo } from '@/context'
import { formatCurrency } from '@/lib/utils/string'
import { buildApiUrl } from '@/lib/utils/url'

import { SwapInterface } from './swap-interface'

export default function SwapPage() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'market'>(
    'swap'
  )
  const { chainId } = useUnifiedChainInfo()
  const [autoRefresh] = useState(true)

  // Fetch real market statistics from OKX API
  const { data: marketStats, error: marketError } = useSWR(
    chainId ? buildApiUrl(apiEndpoints.swap.marketStats, { chainId }) : null,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch market stats')
      return res.json()
    },
    {
      refreshInterval: autoRefresh ? 30000 : 0, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  )

  // Fetch gas prices
  const { data: gasData } = useSWR(
    chainId ? buildApiUrl(apiEndpoints.swap.gasPrice, { chainId }) : null,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch gas prices')
      return res.json()
    },
    {
      refreshInterval: autoRefresh ? 15000 : 0, // Refresh every 15 seconds
      revalidateOnFocus: true
    }
  )

  // Fetch trending pairs
  const { data: trendingPairs } = useSWR(
    chainId ? buildApiUrl(apiEndpoints.swap.trendingPairs, { chainId }) : null,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch trending pairs')
      return res.json()
    },
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false
    }
  )

  // Fetch liquidity sources
  const { data: liquidityData } = useSWR<any[]>(
    chainId ? apiEndpoints.swap.liquidityByChain(chainId) : null,
    async () => {
      try {
        const res = await fetch(apiEndpoints.swap.liquidity, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chainId })
        })
        if (!res.ok) {
          console.error('Failed to fetch liquidity sources')
          return []
        }
        const data = await res.json()
        return Array.isArray(data.liquiditySources) ? data.liquiditySources : []
      } catch (error) {
        console.error('Error fetching liquidity sources:', error)
        return []
      }
    },
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false
    }
  )

  // Calculate network status based on gas prices
  const getNetworkStatus = () => {
    if (!gasData?.gasPrice) return 'unknown'
    const avgGas = parseFloat(gasData.gasPrice.average)
    if (avgGas < 10) return 'low'
    if (avgGas < 30) return 'normal'
    if (avgGas < 50) return 'busy'
    return 'congested'
  }

  const networkStatus = getNetworkStatus()

  // Prepare stats cards with real data
  const statsCards: StatCard[] = [
    {
      title: `${marketStats?.stats?.nativeTokenSymbol || 'ETH'} Price`,
      value: marketStats?.stats?.nativeTokenPrice
        ? formatCurrency(marketStats.stats.nativeTokenPrice, 'USD')
        : '',
      subtitle:
        marketStats?.stats?.nativeToken24hChange !== undefined
          ? `${marketStats.stats.nativeToken24hChange > 0 ? '+' : ''}${marketStats.stats.nativeToken24hChange.toFixed(2)}% (24h)`
          : undefined,
      icon: <TrendingUp className='h-5 w-5 text-white' />,
      badge: 'LIVE',
      colorScheme:
        marketStats?.stats?.nativeToken24hChange > 0 ? 'green' : 'red',
      isLoading: !marketStats?.stats?.nativeTokenPrice
    },
    {
      title: 'Gas Price',
      value: gasData?.gasPrice?.average
        ? `${gasData.gasPrice.average} Gwei`
        : '',
      subtitle:
        networkStatus === 'low'
          ? 'Network idle'
          : networkStatus === 'normal'
            ? 'Normal activity'
            : networkStatus === 'busy'
              ? 'High activity'
              : networkStatus === 'unknown'
                ? undefined
                : 'Very congested',
      icon: <Fuel className='h-5 w-5 text-white' />,
      badge:
        networkStatus !== 'unknown' ? networkStatus.toUpperCase() : 'LOADING',
      colorScheme:
        networkStatus === 'low'
          ? 'green'
          : networkStatus === 'normal'
            ? 'blue'
            : networkStatus === 'busy'
              ? 'yellow'
              : 'red',
      isLoading: !gasData?.gasPrice
    },
    {
      title: 'Liquidity Sources',
      value: marketStats?.stats?.activeLiquiditySources ?? '',
      subtitle: marketStats?.stats ? 'Active DEX protocols' : undefined,
      icon: <Server className='h-5 w-5 text-white' />,
      badge: 'AGGREGATED',
      colorScheme: 'purple',
      isLoading: !marketStats?.stats
    },
    {
      title: 'Networks',
      value: marketStats?.stats?.supportedChains ?? '',
      subtitle: marketStats?.stats ? 'Supported chains' : undefined,
      icon: <Network className='h-5 w-5 text-white' />,
      badge: 'MULTI-CHAIN',
      colorScheme: 'blue',
      isLoading: !marketStats?.stats
    }
  ]

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Gaming Header */}
        <GamifiedHeader
          title='TOKEN SWAP'
          subtitle='Instant token swaps with best rates from multiple DEX aggregators'
          icon={<ArrowDownUp className='h-8 w-8 text-white' />}
          actions={
            <div className='flex gap-3'>
              <Button
                size='lg'
                className='border-0 bg-gradient-to-r from-purple-600 to-pink-700 font-bold text-white shadow-lg transition-all hover:scale-105 hover:from-purple-700 hover:to-pink-800 hover:shadow-xl'
                onClick={() => {
                  const swapSection = document.getElementById('swap-interface')
                  swapSection?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <ArrowRightLeft className='mr-2 h-5 w-5' />
                START SWAPPING
              </Button>
              <Link href={`${appRoutes.trades.listings.create}/p2p`}>
                <Button
                  size='lg'
                  variant='outline'
                  className='border-primary/30 hover:border-primary/50 hover:bg-primary/10 font-bold backdrop-blur-sm transition-all hover:scale-105'
                >
                  <Users className='mr-2 h-5 w-5' />
                  P2P TRADING
                </Button>
              </Link>
            </div>
          }
        />

        {/* Gaming Stats Cards */}
        <GamifiedStatsCards cards={statsCards} />

        {/* Gas Tracker Widget */}
        <Card className='relative overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
          <div className='absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-600'>
            <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
          </div>

          <div className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='rounded-lg bg-gradient-to-br from-blue-600 to-cyan-700 p-3 shadow-lg'>
                  <Fuel className='h-6 w-6 text-white' />
                </div>
                <div>
                  <h3 className='text-xl font-black'>NETWORK GAS TRACKER</h3>
                  <p className='text-muted-foreground'>
                    Current gas prices and network conditions
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <Badge
                  className={`border-0 font-bold ${
                    networkStatus === 'low'
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : networkStatus === 'normal'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : networkStatus === 'busy'
                          ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {networkStatus === 'low'
                    ? 'LOW FEES'
                    : networkStatus === 'normal'
                      ? 'NORMAL'
                      : networkStatus === 'busy'
                        ? 'BUSY'
                        : 'CONGESTED'}
                </Badge>
              </div>
            </div>

            {/* Gas Price Details */}
            <div className='mt-4 grid grid-cols-3 gap-4'>
              <div className='rounded-lg bg-black/10 p-3 dark:bg-white/10'>
                <p className='text-muted-foreground text-xs font-semibold'>
                  SLOW
                </p>
                {gasData?.gasPrice ? (
                  <p className='text-lg font-black'>
                    {gasData.gasPrice.slow} Gwei
                  </p>
                ) : (
                  <div className='flex h-7 items-center'>
                    <Spinner size='sm' className='text-muted-foreground' />
                  </div>
                )}
              </div>
              <div className='rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 ring-2 ring-blue-500/50'>
                <p className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
                  AVERAGE
                </p>
                {gasData?.gasPrice ? (
                  <p className='text-lg font-black'>
                    {gasData.gasPrice.average} Gwei
                  </p>
                ) : (
                  <div className='flex h-7 items-center'>
                    <Spinner
                      size='sm'
                      className='text-blue-600 dark:text-blue-400'
                    />
                  </div>
                )}
              </div>
              <div className='rounded-lg bg-black/10 p-3 dark:bg-white/10'>
                <p className='text-muted-foreground text-xs font-semibold'>
                  FAST
                </p>
                {gasData?.gasPrice ? (
                  <p className='text-lg font-black'>
                    {gasData.gasPrice.fast} Gwei
                  </p>
                ) : (
                  <div className='flex h-7 items-center'>
                    <Spinner size='sm' className='text-muted-foreground' />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as any)}
          className='space-y-6'
        >
          <TabsList className='bg-muted/50 grid w-full grid-cols-3 p-1'>
            <TabsTrigger
              value='swap'
              className='relative font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white'
            >
              <ArrowDownUp className='mr-2 h-4 w-4' />
              SWAP TOKENS
              {activeTab === 'swap' && (
                <div className='absolute -top-1 -right-1'>
                  <span className='flex h-3 w-3'>
                    <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75'></span>
                    <span className='relative inline-flex h-3 w-3 rounded-full bg-green-500'></span>
                  </span>
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger
              value='liquidity'
              className='font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white'
            >
              <Globe className='mr-2 h-4 w-4' />
              LIQUIDITY SOURCES
            </TabsTrigger>
            <TabsTrigger
              value='market'
              className='font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white'
            >
              <Activity className='mr-2 h-4 w-4' />
              MARKET ACTIVITY
            </TabsTrigger>
          </TabsList>

          <TabsContent value='swap' className='space-y-6'>
            {/* OKX Queue Status */}
            <OKXQueueStatus className='mb-4' showDetails={true} />
            <div id='swap-interface'>
              <SwapInterface />
            </div>
          </TabsContent>

          <TabsContent value='liquidity' className='space-y-6'>
            <Card className='p-6'>
              <h3 className='mb-6 text-xl font-black'>
                AVAILABLE LIQUIDITY SOURCES
              </h3>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {Array.isArray(liquidityData) &&
                  liquidityData.map((source: any) => (
                    <Card
                      key={source.id}
                      className='border-border/50 bg-muted/50 p-4'
                    >
                      <div className='flex items-center gap-3'>
                        {source.logo && (
                          <img
                            src={source.logo}
                            alt={source.name}
                            className='h-10 w-10 rounded-full'
                          />
                        )}
                        <div className='flex-1'>
                          <p className='font-bold'>{source.name}</p>
                          <p className='text-muted-foreground text-sm'>
                            DEX #{source.id}
                          </p>
                        </div>
                        <Badge variant='secondary' className='font-bold'>
                          ACTIVE
                        </Badge>
                      </div>
                    </Card>
                  ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value='market' className='space-y-6'>
            <Card className='p-6'>
              <h3 className='mb-6 text-xl font-black'>TRENDING PAIRS</h3>
              {trendingPairs?.pairs && trendingPairs.pairs.length > 0 ? (
                <div className='space-y-4'>
                  {trendingPairs.pairs.map((pair: any, index: number) => (
                    <Card
                      key={index}
                      className='border-border/50 bg-muted/50 p-4'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <div className='flex -space-x-2'>
                            {pair.from.logo && (
                              <img
                                src={pair.from.logo}
                                alt={pair.from.symbol}
                                className='border-background h-10 w-10 rounded-full border-2'
                              />
                            )}
                            {pair.to.logo && (
                              <img
                                src={pair.to.logo}
                                alt={pair.to.symbol}
                                className='border-background h-10 w-10 rounded-full border-2'
                              />
                            )}
                          </div>
                          <div>
                            <p className='font-bold'>
                              {pair.from.symbol} → {pair.to.symbol}
                            </p>
                            {pair.from.price && (
                              <p className='text-muted-foreground text-sm'>
                                1 {pair.from.symbol} ={' '}
                                {(
                                  pair.from.price / (pair.to.price || 1)
                                ).toFixed(4)}{' '}
                                {pair.to.symbol}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='text-right'>
                          {pair.from.priceChange24h !== undefined && (
                            <Badge
                              variant={
                                pair.from.priceChange24h >= 0
                                  ? 'default'
                                  : 'destructive'
                              }
                              className='font-bold'
                            >
                              {pair.from.priceChange24h > 0 ? '+' : ''}
                              {pair.from.priceChange24h.toFixed(2)}%
                            </Badge>
                          )}
                          {pair.volume24h && (
                            <p className='text-muted-foreground mt-1 text-xs'>
                              Vol: $
                              {parseFloat(pair.volume24h).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className='text-muted-foreground py-12 text-center'>
                  <Activity className='mx-auto mb-4 h-12 w-12 opacity-50' />
                  <p className='text-lg font-semibold'>
                    Loading market data...
                  </p>
                  <p className='mt-2'>Trending pairs will appear here</p>
                </div>
              )}

              {/* Market Info */}
              {marketError && (
                <Card className='mt-6 border-yellow-500/30 bg-yellow-500/10 p-4'>
                  <div className='flex items-center gap-3'>
                    <AlertCircle className='h-5 w-5 text-yellow-500' />
                    <div>
                      <p className='font-semibold'>
                        Market Data Temporarily Unavailable
                      </p>
                      <p className='text-muted-foreground text-sm'>
                        Using cached data. Will retry automatically.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* DEX Features Section */}
        <div className='grid gap-6 md:grid-cols-3'>
          <Card className='group relative overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transition-all hover:scale-105'>
            <div className='absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600'>
              <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
            </div>
            <div className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='rounded-lg bg-gradient-to-br from-purple-600 to-pink-700 p-3 shadow-lg transition-transform group-hover:rotate-12'>
                  <Globe className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-lg font-black'>PROTOCOL COVERAGE</h3>
              </div>
              <p className='text-muted-foreground mb-4'>
                Aggregating {marketStats?.stats?.activeLiquiditySources || '50'}
                + DEX protocols
              </p>
              <Badge className='border-0 bg-purple-500/20 font-bold text-purple-600 dark:text-purple-400'>
                BEST RATES
              </Badge>
            </div>
          </Card>

          <Card className='group relative overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 transition-all hover:scale-105'>
            <div className='absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-600'>
              <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
            </div>
            <div className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='rounded-lg bg-gradient-to-br from-blue-600 to-cyan-700 p-3 shadow-lg transition-transform group-hover:rotate-12'>
                  <Shield className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-lg font-black'>MEV PROTECTION</h3>
              </div>
              <p className='text-muted-foreground mb-4'>
                Protected from sandwich attacks
              </p>
              <Badge className='border-0 bg-blue-500/20 font-bold text-blue-600 dark:text-blue-400'>
                SECURED
              </Badge>
            </div>
          </Card>

          <Card className='group relative overflow-hidden border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 transition-all hover:scale-105'>
            <div className='absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600'>
              <div className='animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
            </div>
            <div className='p-6'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='rounded-lg bg-gradient-to-br from-green-600 to-emerald-700 p-3 shadow-lg transition-transform group-hover:rotate-12'>
                  <TrendingUp className='h-6 w-6 text-white' />
                </div>
                <h3 className='text-lg font-black'>PRICE OPTIMIZATION</h3>
              </div>
              <p className='text-muted-foreground mb-4'>
                Best execution across all venues
              </p>
              <Badge className='border-0 bg-green-500/20 font-bold text-green-600 dark:text-green-400'>
                OPTIMIZED
              </Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
