'use client'

import { useState } from 'react'

import { Trophy, Medal, Crown, Shield } from 'lucide-react'
import useSWR from 'swr'

import { GamifiedHeader } from '@/components/blocks/trading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { api } from '@/lib/api/http-client'
import { formatNumber } from '@/lib/utils/string'
import { getUserDisplayName } from '@/lib/utils/user'

interface LeaderboardEntry {
  rank: number
  userId: number
  user: {
    id: number
    displayName: string | null
    username: string | null
    walletAddress: string | null
  }
  battleStats: {
    totalBattles: number
    battlesWon: number
    winRate: number
    combatPower: number
  }
  xp: number
  level: number
}

export default function BattleLeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all-time'>(
    'weekly'
  )

  const { data: leaderboardData, isLoading } = useSWR<LeaderboardEntry[]>(
    `${apiEndpoints.rewards.leaderboard}?type=battle&timeframe=${timeframe}`,
    async url => {
      const res = await api.get(url)
      if (!res.success)
        throw new Error(res.error || 'Failed to load leaderboard')
      return res.data
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className='h-6 w-6 text-yellow-500' />
      case 2:
        return <Trophy className='h-6 w-6 text-gray-400' />
      case 3:
        return <Medal className='h-6 w-6 text-amber-600' />
      default:
        return (
          <div className='flex h-6 w-6 items-center justify-center text-sm font-bold'>
            #{rank}
          </div>
        )
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30'
      case 2:
        return 'from-gray-400/20 to-slate-400/20 border-gray-400/30'
      case 3:
        return 'from-amber-600/20 to-orange-600/20 border-amber-600/30'
      default:
        return 'from-primary/10 to-purple-600/10 border-primary/20'
    }
  }

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Header */}
        <GamifiedHeader
          title='BATTLE LEADERBOARD'
          subtitle='Top warriors compete for glory and rewards'
          icon={<Trophy className='h-8 w-8 text-white' />}
        />

        {/* Stats Cards */}
        <div className='grid gap-4 md:grid-cols-3'>
          <Card className='group relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-yellow-600 uppercase dark:text-yellow-400'>
                    Top Warrior
                  </p>
                  <p className='text-2xl font-black'>
                    {leaderboardData?.[0]
                      ? getUserDisplayName(leaderboardData[0].user)
                      : '---'}
                  </p>
                </div>
                <Crown className='h-8 w-8 text-yellow-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-purple-600 uppercase dark:text-purple-400'>
                    Total Battles
                  </p>
                  <p className='text-2xl font-black'>
                    {formatNumber(
                      leaderboardData?.reduce(
                        (acc, entry) =>
                          acc + (entry.battleStats?.totalBattles || 0),
                        0
                      ) || 0
                    )}
                  </p>
                </div>
                <Shield className='h-8 w-8 text-purple-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 transition-all hover:scale-105'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                    Highest CP
                  </p>
                  <p className='text-2xl font-black'>
                    {formatNumber(
                      Math.max(
                        ...(leaderboardData?.map(
                          e => e.battleStats?.combatPower || 0
                        ) || [0])
                      )
                    )}
                  </p>
                </div>
                <Medal className='h-8 w-8 text-green-500' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-3xl font-black text-transparent'>
                ⚔️ WARRIORS RANKING
              </CardTitle>
              <Tabs
                value={timeframe}
                onValueChange={v => setTimeframe(v as any)}
              >
                <TabsList className='grid grid-cols-3'>
                  <TabsTrigger value='weekly'>Weekly</TabsTrigger>
                  <TabsTrigger value='monthly'>Monthly</TabsTrigger>
                  <TabsTrigger value='all-time'>All Time</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='py-12 text-center'>
                <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent' />
                <p className='text-muted-foreground mt-4'>
                  Loading warriors...
                </p>
              </div>
            ) : !leaderboardData || leaderboardData.length === 0 ? (
              <div className='py-12 text-center'>
                <Shield className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                <p className='text-muted-foreground'>
                  No battles yet. Be the first warrior!
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {leaderboardData.map(entry => (
                  <div
                    key={entry.userId}
                    className={`group relative overflow-hidden rounded-xl border-2 bg-gradient-to-r p-4 transition-all hover:scale-[1.02] ${getRankColor(entry.rank)}`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-4'>
                        {getRankIcon(entry.rank)}
                        <div>
                          <p className='font-bold'>
                            {getUserDisplayName(entry.user)}
                          </p>
                          <p className='text-muted-foreground text-sm'>
                            Level {entry.level || 0} • CP:{' '}
                            {formatNumber(entry.battleStats?.combatPower || 0)}
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='text-lg font-black'>
                          {entry.battleStats?.battlesWon || 0} /{' '}
                          {entry.battleStats?.totalBattles || 0}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {(entry.battleStats?.winRate || 0).toFixed(1)}% Win
                          Rate
                        </p>
                      </div>
                    </div>
                    {entry.rank <= 3 && (
                      <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
