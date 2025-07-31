'use client'

import { useState } from 'react'

import {
  Scroll,
  Target,
  Zap,
  CheckCircle,
  Timer,
  Sparkles,
  Swords
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
import { api } from '@/lib/api/http-client'
import { formatNumber } from '@/lib/utils/string'

interface Quest {
  id: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  category: 'battle'
  xpReward: number
  requirements: {
    type: string
    target: number
    current: number
  }
  isCompleted: boolean
  isClaimable: boolean
  expiresAt?: string
}

export default function BattleQuestsPage() {
  const { toast } = useToast()
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null)

  const { data: questsData, mutate } = useSWR<Quest[]>(
    `${apiEndpoints.rewards.questProgress}?category=battle`,
    async url => {
      const res = await api.get(url)
      if (!res.success) throw new Error(res.error || 'Failed to load quests')
      return res.data
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  const dailyQuests = questsData?.filter(q => q.type === 'daily') || []
  const weeklyQuests = questsData?.filter(q => q.type === 'weekly') || []
  const specialQuests = questsData?.filter(q => q.type === 'special') || []

  const handleClaimReward = async (questId: string) => {
    try {
      setClaimingQuestId(questId)
      const res = await api.post(
        apiEndpoints.rewards.questProgressClaim(questId)
      )

      if (res.success) {
        toast({
          title: 'Quest Completed!',
          description: `You earned ${res.data.xpEarned} XP!`
        })
        await mutate()
      } else {
        throw new Error(res.error || 'Failed to claim reward')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to claim reward',
        variant: 'destructive'
      })
    } finally {
      setClaimingQuestId(null)
    }
  }

  const getQuestIcon = (questType: string) => {
    switch (questType) {
      case 'daily':
        return <Timer className='h-5 w-5' />
      case 'weekly':
        return <Target className='h-5 w-5' />
      case 'special':
        return <Sparkles className='h-5 w-5' />
      default:
        return <Scroll className='h-5 w-5' />
    }
  }

  const QuestCard = ({ quest }: { quest: Quest }) => {
    const progress =
      quest.requirements.target > 0
        ? (quest.requirements.current / quest.requirements.target) * 100
        : 0

    return (
      <Card
        className={`group relative overflow-hidden transition-all hover:scale-[1.02] ${
          quest.isCompleted
            ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
            : 'border-primary/20 from-primary/5 bg-gradient-to-br to-purple-600/5'
        }`}
      >
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2'>
              {getQuestIcon(quest.type)}
              <CardTitle className='text-lg'>{quest.name}</CardTitle>
            </div>
            <div className='flex items-center gap-2'>
              {quest.isCompleted && (
                <Badge variant='success' className='gap-1'>
                  <CheckCircle className='h-3 w-3' />
                  Completed
                </Badge>
              )}
              <Badge variant='secondary'>
                +{formatNumber(quest.xpReward)} XP
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground text-sm'>{quest.description}</p>

          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium'>
                {quest.requirements.current} / {quest.requirements.target}
              </span>
            </div>
            <Progress value={progress} className='h-2' />
          </div>

          {quest.isClaimable && (
            <Button
              className='w-full bg-gradient-to-r from-green-600 to-emerald-700 font-bold text-white hover:from-green-700 hover:to-emerald-800'
              onClick={() => handleClaimReward(quest.id)}
              disabled={claimingQuestId === quest.id}
            >
              {claimingQuestId === quest.id ? (
                <>
                  <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent' />
                  Claiming...
                </>
              ) : (
                <>
                  <Zap className='mr-2 h-4 w-4' />
                  Claim Reward
                </>
              )}
            </Button>
          )}

          {quest.expiresAt && (
            <p className='text-muted-foreground text-xs'>
              Expires: {new Date(quest.expiresAt).toLocaleString()}
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
          title='BATTLE QUESTS'
          subtitle='Complete challenges to earn XP and unlock rewards'
          icon={<Scroll className='h-8 w-8 text-white' />}
        />

        {/* Stats Cards */}
        <div className='grid gap-4 md:grid-cols-4'>
          <Card className='group relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <Timer className='h-8 w-8 text-yellow-500' />
                <div>
                  <p className='text-xs font-bold text-yellow-600 uppercase dark:text-yellow-400'>
                    Daily Active
                  </p>
                  <p className='text-2xl font-black'>
                    {dailyQuests.filter(q => !q.isCompleted).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <Target className='h-8 w-8 text-purple-500' />
                <div>
                  <p className='text-xs font-bold text-purple-600 uppercase dark:text-purple-400'>
                    Weekly Active
                  </p>
                  <p className='text-2xl font-black'>
                    {weeklyQuests.filter(q => !q.isCompleted).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <Sparkles className='h-8 w-8 text-blue-500' />
                <div>
                  <p className='text-xs font-bold text-blue-600 uppercase dark:text-blue-400'>
                    Special Active
                  </p>
                  <p className='text-2xl font-black'>
                    {specialQuests.filter(q => !q.isCompleted).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='group relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <CheckCircle className='h-8 w-8 text-green-500' />
                <div>
                  <p className='text-xs font-bold text-green-600 uppercase dark:text-green-400'>
                    Completed
                  </p>
                  <p className='text-2xl font-black'>
                    {questsData?.filter(q => q.isCompleted).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quest Tabs */}
        <Card className='group border-primary/20 from-primary/5 relative overflow-hidden border-2 bg-gradient-to-br to-purple-600/5 shadow-2xl'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Swords className='text-primary h-6 w-6' />
              <CardTitle className='from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-3xl font-black text-transparent'>
                WARRIOR CHALLENGES
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue='daily' className='w-full'>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='daily' className='gap-2'>
                  <Timer className='h-4 w-4' />
                  Daily ({dailyQuests.length})
                </TabsTrigger>
                <TabsTrigger value='weekly' className='gap-2'>
                  <Target className='h-4 w-4' />
                  Weekly ({weeklyQuests.length})
                </TabsTrigger>
                <TabsTrigger value='special' className='gap-2'>
                  <Sparkles className='h-4 w-4' />
                  Special ({specialQuests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value='daily' className='mt-6 space-y-4'>
                {dailyQuests.length === 0 ? (
                  <div className='py-12 text-center'>
                    <Timer className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <p className='text-muted-foreground'>
                      No daily quests available
                    </p>
                  </div>
                ) : (
                  dailyQuests.map(quest => (
                    <QuestCard key={quest.id} quest={quest} />
                  ))
                )}
              </TabsContent>

              <TabsContent value='weekly' className='mt-6 space-y-4'>
                {weeklyQuests.length === 0 ? (
                  <div className='py-12 text-center'>
                    <Target className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <p className='text-muted-foreground'>
                      No weekly quests available
                    </p>
                  </div>
                ) : (
                  weeklyQuests.map(quest => (
                    <QuestCard key={quest.id} quest={quest} />
                  ))
                )}
              </TabsContent>

              <TabsContent value='special' className='mt-6 space-y-4'>
                {specialQuests.length === 0 ? (
                  <div className='py-12 text-center'>
                    <Sparkles className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <p className='text-muted-foreground'>
                      No special quests available
                    </p>
                  </div>
                ) : (
                  specialQuests.map(quest => (
                    <QuestCard key={quest.id} quest={quest} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
