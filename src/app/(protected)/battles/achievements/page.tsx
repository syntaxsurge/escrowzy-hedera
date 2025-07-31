'use client'

import { useState } from 'react'

import {
  Award,
  Trophy,
  Shield,
  Swords,
  Crown,
  Star,
  Lock,
  CheckCircle,
  Sparkles,
  Zap
} from 'lucide-react'
import useSWR from 'swr'

import { GamifiedHeader } from '@/components/blocks/trading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib'
import { api } from '@/lib/api/http-client'

interface UserAchievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  xpReward: number
  nftEligible: boolean
  progress: {
    current: number
    target: number
  }
  unlockedAt?: string
  claimedAt?: string
  isUnlocked: boolean
  isClaimable: boolean
}

export default function BattleAchievementsPage() {
  const { toast } = useToast()
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const { data: achievementsData, mutate } = useSWR<UserAchievement[]>(
    `${apiEndpoints.rewards.achievements}?category=battle`,
    async url => {
      const res = await api.get(url)
      if (!res.success)
        throw new Error(res.error || 'Failed to load achievements')
      return res.data
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  const handleClaimAchievement = async (achievementId: string) => {
    try {
      setClaimingId(achievementId)
      const res = await api.post(apiEndpoints.rewards.claimAchievement, {
        achievementId
      })

      if (res.success) {
        toast({
          title: 'Achievement Claimed!',
          description: `You earned ${res.data.xpEarned} XP!`
        })
        await mutate()
      } else {
        throw new Error(res.error || 'Failed to claim achievement')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to claim achievement',
        variant: 'destructive'
      })
    } finally {
      setClaimingId(null)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30'
      case 'epic':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
      case 'rare':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-500/30'
    }
  }

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
      case 'epic':
        return 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
      case 'rare':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
      default:
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
    }
  }

  const getAchievementIcon = (id: string) => {
    if (id.includes('champion')) return <Crown className='h-6 w-6' />
    if (id.includes('veteran')) return <Shield className='h-6 w-6' />
    if (id.includes('winner')) return <Trophy className='h-6 w-6' />
    if (id.includes('battle')) return <Swords className='h-6 w-6' />
    return <Award className='h-6 w-6' />
  }

  const unlockedAchievements = achievementsData?.filter(a => a.isUnlocked) || []
  const lockedAchievements = achievementsData?.filter(a => !a.isUnlocked) || []

  const stats = {
    total: achievementsData?.length || 0,
    unlocked: unlockedAchievements.length,
    claimable: achievementsData?.filter(a => a.isClaimable).length || 0,
    legendary: unlockedAchievements.filter(a => a.rarity === 'legendary')
      .length,
    epic: unlockedAchievements.filter(a => a.rarity === 'epic').length,
    rare: unlockedAchievements.filter(a => a.rarity === 'rare').length
  }

  const AchievementCard = ({
    achievement
  }: {
    achievement: UserAchievement
  }) => {
    const progress =
      achievement.progress.target > 0
        ? (achievement.progress.current / achievement.progress.target) * 100
        : 0

    return (
      <Card
        className={cn(
          'group relative overflow-hidden transition-all hover:scale-[1.02]',
          achievement.isUnlocked
            ? getRarityColor(achievement.rarity)
            : 'border-gray-700/30 bg-gradient-to-br from-gray-800/20 to-gray-900/20 opacity-75'
        )}
      >
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'rounded-lg p-2',
                  achievement.isUnlocked
                    ? 'from-primary bg-gradient-to-br to-purple-600'
                    : 'bg-gray-700/50'
                )}
              >
                {achievement.isUnlocked ? (
                  getAchievementIcon(achievement.id)
                ) : (
                  <Lock className='h-6 w-6 text-gray-500' />
                )}
              </div>
              <div>
                <CardTitle className='text-lg'>{achievement.name}</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  {achievement.description}
                </p>
              </div>
            </div>
            <div className='flex flex-col items-end gap-2'>
              <Badge className={getRarityBadgeColor(achievement.rarity)}>
                {achievement.rarity.toUpperCase()}
              </Badge>
              {achievement.nftEligible && (
                <Badge variant='secondary' className='gap-1'>
                  <Sparkles className='h-3 w-3' />
                  NFT
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!achievement.isUnlocked && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Progress</span>
                <span className='font-medium'>
                  {achievement.progress.current} / {achievement.progress.target}
                </span>
              </div>
              <Progress value={progress} className='h-2' />
            </div>
          )}

          <div className='flex items-center justify-between'>
            <Badge variant='outline' className='gap-1'>
              <Star className='h-3 w-3' />+{achievement.xpReward} XP
            </Badge>

            {achievement.isClaimable && (
              <Button
                size='sm'
                className='bg-gradient-to-r from-green-600 to-emerald-700 font-bold text-white hover:from-green-700 hover:to-emerald-800'
                onClick={() => handleClaimAchievement(achievement.id)}
                disabled={claimingId === achievement.id}
              >
                {claimingId === achievement.id ? (
                  <>
                    <div className='mr-2 h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent' />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Zap className='mr-2 h-3 w-3' />
                    Claim
                  </>
                )}
              </Button>
            )}

            {achievement.isUnlocked && !achievement.isClaimable && (
              <Badge variant='success' className='gap-1'>
                <CheckCircle className='h-3 w-3' />
                Claimed
              </Badge>
            )}
          </div>

          {achievement.unlockedAt && (
            <p className='text-muted-foreground text-xs'>
              Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='from-background via-background to-primary/5 dark:to-primary/10 min-h-screen bg-gradient-to-br'>
      <div className='container mx-auto space-y-8 py-6'>
        {/* Header */}
        <GamifiedHeader
          title='BATTLE ACHIEVEMENTS'
          subtitle='Unlock achievements and earn exclusive rewards'
          icon={<Award className='h-8 w-8 text-white' />}
        />

        {/* Stats Cards */}
        <div className='grid gap-4 md:grid-cols-6'>
          <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-2'>
                <CheckCircle className='h-5 w-5 text-green-500' />
                <div>
                  <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                    Unlocked
                  </p>
                  <p className='text-xl font-black'>
                    {stats.unlocked}/{stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-2'>
                <Zap className='h-5 w-5 text-blue-500' />
                <div>
                  <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                    Claimable
                  </p>
                  <p className='text-xl font-black'>{stats.claimable}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-2'>
                <Crown className='h-5 w-5 text-yellow-500' />
                <div>
                  <p className='text-xs font-bold text-yellow-600 uppercase dark:text-yellow-400'>
                    Legendary
                  </p>
                  <p className='text-xl font-black'>{stats.legendary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-2'>
                <Star className='h-5 w-5 text-purple-500' />
                <div>
                  <p className='text-xs font-bold text-purple-600 uppercase dark:text-purple-400'>
                    Epic
                  </p>
                  <p className='text-xl font-black'>{stats.epic}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-2'>
                <Shield className='h-5 w-5 text-blue-500' />
                <div>
                  <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                    Rare
                  </p>
                  <p className='text-xl font-black'>{stats.rare}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-2'>
                <Trophy className='h-5 w-5 text-orange-500' />
                <div>
                  <p className='text-xs font-bold text-orange-600 uppercase dark:text-orange-400'>
                    Progress
                  </p>
                  <p className='text-xl font-black'>
                    {Math.round((stats.unlocked / stats.total) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Swords className='text-primary h-6 w-6' />
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-3xl font-black text-transparent'>
                WARRIOR ACHIEVEMENTS
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue='unlocked' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='unlocked' className='gap-2'>
                  <CheckCircle className='h-4 w-4' />
                  Unlocked ({unlockedAchievements.length})
                </TabsTrigger>
                <TabsTrigger value='locked' className='gap-2'>
                  <Lock className='h-4 w-4' />
                  Locked ({lockedAchievements.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value='unlocked' className='mt-6'>
                {unlockedAchievements.length === 0 ? (
                  <div className='py-12 text-center'>
                    <Trophy className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <p className='text-muted-foreground'>
                      No achievements unlocked yet
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      Start battling to earn achievements!
                    </p>
                  </div>
                ) : (
                  <div className='grid gap-4 md:grid-cols-2'>
                    {unlockedAchievements.map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value='locked' className='mt-6'>
                {lockedAchievements.length === 0 ? (
                  <div className='py-12 text-center'>
                    <Award className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <p className='text-muted-foreground'>
                      All achievements unlocked!
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      You are a true warrior!
                    </p>
                  </div>
                ) : (
                  <div className='grid gap-4 md:grid-cols-2'>
                    {lockedAchievements.map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
