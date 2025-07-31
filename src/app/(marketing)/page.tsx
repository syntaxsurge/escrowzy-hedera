'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import {
  Shield,
  Zap,
  Users,
  Sparkles,
  CheckCircle2,
  Star,
  Swords,
  Trophy,
  MessageSquare,
  Gamepad2,
  TrendingUp,
  Award,
  Flame,
  Target,
  HandshakeIcon,
  DollarSign,
  Lock,
  Rocket,
  Crown,
  Gem,
  ScrollText,
  Timer,
  ChevronRight,
  Activity,
  Percent,
  Gift,
  ShieldCheck,
  Coins,
  UserCheck,
  AlertTriangle,
  FileCheck,
  Hash,
  Layers
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { ACHIEVEMENTS } from '@/config/rewards'
import { cn } from '@/lib'

// Animated counter component
function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const duration = 2000
    const increment = end / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{count.toLocaleString()}</span>
}

// Floating achievement component
function FloatingAchievement({
  achievement,
  index
}: {
  achievement: any
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [20, -10, -10, -30]
      }}
      transition={{
        duration: 4,
        delay: index * 0.5,
        repeat: Infinity,
        repeatDelay: 3
      }}
      className='absolute'
      style={{
        left: `${20 + index * 15}%`,
        top: `${30 + (index % 3) * 20}%`
      }}
    >
      <Badge variant={achievement.rarity as any} className='shadow-xl'>
        <span className='mr-1'>{achievement.icon}</span>
        {achievement.name}
      </Badge>
    </motion.div>
  )
}

export default function HomePage() {
  const [combatPower, setCombatPower] = useState(450)
  const [selectedTier, setSelectedTier] = useState('pro')
  const [battleWinner, setBattleWinner] = useState<
    'player' | 'opponent' | null
  >(null)

  // Sample achievements for floating animation
  const floatingAchievements = [
    ACHIEVEMENTS.FIRST_TRADE,
    ACHIEVEMENTS.BATTLE_WINNER,
    ACHIEVEMENTS.TEAM_LEADER,
    ACHIEVEMENTS.PERFECT_TRADER,
    ACHIEVEMENTS.ARENA_CHAMPION,
    ACHIEVEMENTS.SOCIAL_BUTTERFLY
  ]

  const platformStats = {
    totalUsers: 12847,
    activeTrades: 324,
    battlesNow: 89,
    totalVolume: 54280000
  }

  const tierFees = {
    free: { fee: 2.5, battles: 3, teamMembers: 1 },
    pro: { fee: 2.0, battles: 10, teamMembers: 10 },
    enterprise: { fee: 1.5, battles: 'Unlimited', teamMembers: 50 }
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/20 to-blue-950 dark:from-black dark:via-purple-950/30 dark:to-blue-950/20'>
      {/* Animated background particles */}
      <div className='absolute inset-0'>
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute h-1 w-1 rounded-full bg-cyan-400/20'
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          {/* Live Stats Ticker */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-8 flex flex-wrap justify-center gap-6 text-center'
          >
            {[
              {
                label: 'Active Users',
                value: platformStats.totalUsers,
                icon: Users,
                color: 'text-green-400'
              },
              {
                label: 'Live Trades',
                value: platformStats.activeTrades,
                icon: TrendingUp,
                color: 'text-blue-400'
              },
              {
                label: 'Battles Now',
                value: platformStats.battlesNow,
                icon: Swords,
                color: 'text-red-400'
              },
              {
                label: 'Total Volume',
                value: platformStats.totalVolume,
                icon: DollarSign,
                color: 'text-yellow-400',
                prefix: '$'
              }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className='rounded-lg border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-sm'
              >
                <div className='flex items-center gap-2'>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                  <div className='text-left'>
                    <p className='text-xs text-gray-400'>{stat.label}</p>
                    <p className='text-lg font-bold text-white'>
                      {stat.prefix}
                      <AnimatedCounter value={stat.value} />
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Hero Content */}
          <div className='relative'>
            {/* Floating Achievements */}
            <div className='pointer-events-none absolute inset-0'>
              {floatingAchievements.map((achievement, i) => (
                <FloatingAchievement
                  key={achievement.id}
                  achievement={achievement}
                  index={i}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className='relative text-center'
            >
              <Badge
                variant='gaming'
                className='mb-4 inline-flex animate-pulse text-sm'
              >
                <Sparkles className='mr-1 h-3 w-3' />
                HEDERA HELLO FUTURE: ORIGINS
              </Badge>

              <h1 className='mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-7xl lg:text-8xl'>
                {envPublic.NEXT_PUBLIC_APP_NAME.toUpperCase()} ARENA
              </h1>

              <p className='mx-auto mb-8 max-w-3xl text-xl text-gray-300 sm:text-2xl'>
                The world's first gamified P2P trading platform where you
                <span className='font-bold text-cyan-400'>
                  {' '}
                  battle for discounts
                </span>
                ,{' '}
                <span className='font-bold text-purple-400'>
                  earn achievement NFTs
                </span>
                , and{' '}
                <span className='font-bold text-yellow-400'>
                  level up your trading power
                </span>
              </p>

              {/* CTA Buttons */}
              <div className='mb-12 flex flex-col justify-center gap-4 sm:flex-row'>
                <Link href={appRoutes.dashboard.base}>
                  <Button
                    size='lg'
                    className='group w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold tracking-wider text-white uppercase shadow-2xl shadow-cyan-500/25 transition-all hover:scale-105 hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/50 sm:w-auto'
                  >
                    <Gamepad2 className='mr-2 h-5 w-5' />
                    ENTER THE ARENA
                    <ChevronRight className='ml-1 h-5 w-5 transition-transform group-hover:translate-x-1' />
                  </Button>
                </Link>
                <Button
                  size='lg'
                  variant='outline'
                  className='w-full border-purple-500/50 bg-purple-950/30 text-purple-300 backdrop-blur-sm hover:bg-purple-950/50 hover:text-purple-200 sm:w-auto'
                  onClick={() => {
                    const battleSection = document.querySelector('#battle-demo')
                    battleSection?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Trophy className='mr-2 h-5 w-5' />
                  WATCH BATTLE DEMO
                </Button>
              </div>

              {/* Combat Power Calculator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className='mx-auto max-w-2xl'
              >
                <Card className='border-cyan-500/30 bg-black/60 backdrop-blur-lg'>
                  <CardHeader>
                    <CardTitle className='flex items-center justify-center gap-2 text-cyan-400'>
                      <Shield className='h-5 w-5' />
                      YOUR COMBAT POWER CALCULATOR
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-3 gap-2'>
                      {[
                        { count: 3, type: 'Common', power: 50 },
                        { count: 2, type: 'Rare', power: 100 },
                        { count: 1, type: 'Epic', power: 200 }
                      ].map(nft => (
                        <Button
                          key={nft.type}
                          variant='outline'
                          size='sm'
                          className='border-white/20 hover:bg-white/10'
                          onClick={() =>
                            setCombatPower(prev => prev + nft.power)
                          }
                        >
                          +{nft.count} {nft.type}
                        </Button>
                      ))}
                    </div>
                    <div className='rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4'>
                      <div className='flex items-center justify-between'>
                        <span className='text-gray-400'>Total Power:</span>
                        <span className='text-3xl font-black text-cyan-400'>
                          {combatPower} CP
                        </span>
                      </div>
                      <Progress
                        value={(combatPower / 1000) * 100}
                        className='mt-2'
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-5xl'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='text-center'
          >
            {/* Achievement-style badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className='mb-6 inline-block'
            >
              <Badge
                variant='gaming'
                className='animate-pulse px-4 py-2 text-sm'
              >
                <Trophy className='mr-2 h-4 w-4' />
                ACHIEVEMENT UNLOCKED: WATCH THE GAMEPLAY
              </Badge>
            </motion.div>

            <h2 className='mb-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
              SEE THE ARENA IN ACTION
            </h2>
            <p className='mx-auto mb-8 max-w-2xl text-lg text-gray-300'>
              Watch how traders battle for discounts, earn NFTs, and level up in
              the world's first gamified P2P trading platform
            </p>

            {/* Video Container with Gaming Frame */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className='relative mx-auto max-w-4xl'
            >
              {/* Animated border glow */}
              <div className='absolute -inset-2 animate-pulse rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 opacity-30 blur-xl' />

              {/* Video wrapper */}
              <div className='relative overflow-hidden rounded-xl border-2 border-yellow-500/50 bg-black/80 backdrop-blur-lg'>
                {/* Gaming-style header */}
                <div className='flex items-center justify-between border-b border-yellow-500/30 bg-gradient-to-r from-orange-950/50 to-red-950/50 px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <div className='flex gap-1.5'>
                      <div className='h-3 w-3 rounded-full bg-red-500' />
                      <div className='h-3 w-3 rounded-full bg-yellow-500' />
                      <div className='h-3 w-3 rounded-full bg-green-500' />
                    </div>
                    <span className='text-sm font-bold text-yellow-400'>
                      DEMO MODE
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Activity className='h-4 w-4 animate-pulse text-green-400' />
                    <span className='text-xs text-gray-400'>
                      LIVE RECORDING
                    </span>
                  </div>
                </div>

                {/* YouTube Video Embed */}
                <div className='relative aspect-video w-full'>
                  <iframe
                    className='absolute inset-0 h-full w-full'
                    src={
                      envPublic.NEXT_PUBLIC_DEMO_VIDEO_URL
                        ? `https://www.youtube.com/embed/${envPublic.NEXT_PUBLIC_DEMO_VIDEO_URL.split('/').pop()}`
                        : 'https://www.youtube.com/embed/xxxxxxx'
                    }
                    title='Escrowzy Demo - Gamified P2P Trading Platform'
                    frameBorder='0'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    allowFullScreen
                  />
                </div>

                {/* Gaming-style footer */}
                <div className='border-t border-yellow-500/30 bg-gradient-to-r from-orange-950/50 to-red-950/50 px-4 py-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <Badge variant='rare' className='text-xs'>
                        <Gamepad2 className='mr-1 h-3 w-3' />
                        TUTORIAL
                      </Badge>
                      <span className='text-xs text-gray-400'>
                        Watch to earn +50 XP
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Star className='h-4 w-4 text-yellow-400' />
                      <Star className='h-4 w-4 text-yellow-400' />
                      <Star className='h-4 w-4 text-yellow-400' />
                      <Star className='h-4 w-4 text-yellow-400' />
                      <Star className='h-4 w-4 text-yellow-400' />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Call to action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className='mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row'
            >
              <Link href={appRoutes.dashboard.base}>
                <Button
                  size='lg'
                  className='group bg-gradient-to-r from-yellow-600 to-orange-600 font-bold tracking-wider text-white uppercase hover:from-yellow-500 hover:to-orange-500'
                >
                  <Rocket className='mr-2 h-5 w-5' />
                  TRY IT YOURSELF
                  <ChevronRight className='ml-1 h-5 w-5 transition-transform group-hover:translate-x-1' />
                </Button>
              </Link>
              <Button
                size='lg'
                variant='outline'
                className='border-orange-500/50 bg-orange-950/30 text-orange-300 hover:bg-orange-950/50'
                onClick={() => {
                  const defiSection = document.querySelector('#track-1')
                  defiSection?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <ScrollText className='mr-2 h-5 w-5' />
                LEARN MORE
              </Button>
            </motion.div>

            {/* Stats bar */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className='mt-12 flex flex-wrap justify-center gap-6 text-center'
            >
              {[
                { label: 'Views', value: '1.2K+', icon: Activity },
                { label: 'Likes', value: '98%', icon: Star },
                { label: 'Shares', value: '250+', icon: Zap },
                { label: 'Comments', value: '45+', icon: MessageSquare }
              ].map(stat => (
                <div
                  key={stat.label}
                  className='flex items-center gap-2 rounded-lg border border-orange-500/20 bg-black/40 px-4 py-2'
                >
                  <stat.icon className='h-4 w-4 text-orange-400' />
                  <div className='text-left'>
                    <p className='text-xs text-gray-500'>{stat.label}</p>
                    <p className='font-bold text-orange-300'>{stat.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Hedera Integration Section */}
      <section className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center'
          >
            <Badge variant='legendary' className='mb-4 text-sm'>
              <Layers className='mr-1 h-3 w-3' />
              HEDERA HELLO FUTURE: ORIGINS
            </Badge>
            <h2 className='mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
              POWERED BY HEDERA HASHGRAPH
            </h2>
            <p className='mx-auto mb-12 max-w-2xl text-lg text-gray-400'>
              Built on the world's most sustainable and efficient distributed
              ledger technology
            </p>
          </motion.div>

          <div className='grid gap-8 md:grid-cols-2'>
            {/* Hedera Services Integration */}
            <Card className='border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-purple-950/30 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-blue-400'>
                  <TrendingUp className='h-5 w-5' />
                  Hedera Network Services
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>Token Service (HTS)</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>Smart Contract Service 2.0</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>Consensus Service (HCS)</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>File Service (HFS)</span>
                  </div>
                </div>
                <div className='rounded-lg bg-blue-950/40 p-3'>
                  <p className='text-xs text-blue-300'>
                    Native token creation, instant finality, and predictable
                    fees
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Hedera Performance */}
            <Card className='border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-pink-950/30 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-purple-400'>
                  <Zap className='h-5 w-5' />
                  Hedera Performance
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>10,000+ TPS Capacity</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>$0.0001 USD Fixed Fees</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>3-5 Second Finality</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-400' />
                    <span className='text-sm'>Carbon Negative Network</span>
                  </div>
                </div>
                <div className='rounded-lg bg-purple-950/40 p-3'>
                  <p className='text-xs text-purple-300'>
                    Enterprise-grade performance for gaming and DeFi
                    applications
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Track #1: DeFi Features */}
      <section
        id='track-1'
        className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'
      >
        <div className='mx-auto max-w-7xl'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center'
          >
            <Badge variant='rare' className='mb-4 text-sm'>
              DEFI / TOKENIZATION TRACK
            </Badge>
            <h2 className='mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
              TRUSTLESS DEFI ESCROW SYSTEM
            </h2>
            <p className='mx-auto mb-12 max-w-2xl text-lg text-gray-400'>
              Complete smart contract-based escrow with P2P trading, automated
              payments, and multi-tier fee structures
            </p>
          </motion.div>

          <div className='grid gap-8 lg:grid-cols-2'>
            {/* Escrow Flow Visualization */}
            <Card className='group relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-cyan-950/30 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-blue-400'>
                  <Lock className='h-5 w-5' />
                  Smart Contract Escrow Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {[
                    {
                      step: 1,
                      title: 'Create Escrow',
                      desc: 'Buyer initiates trade with terms'
                    },
                    {
                      step: 2,
                      title: 'Fund Contract',
                      desc: 'Seller deposits crypto into escrow'
                    },
                    {
                      step: 3,
                      title: 'Payment Sent',
                      desc: 'Buyer sends fiat payment off-chain'
                    },
                    {
                      step: 4,
                      title: 'Auto Release',
                      desc: 'Smart contract releases funds'
                    }
                  ].map((step, i) => (
                    <motion.div
                      key={step.step}
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className='flex items-center gap-4 rounded-lg border border-blue-500/20 bg-blue-950/20 p-3'
                    >
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-lg font-bold text-white'>
                        {step.step}
                      </div>
                      <div className='flex-1'>
                        <p className='font-semibold text-blue-300'>
                          {step.title}
                        </p>
                        <p className='text-sm text-gray-400'>{step.desc}</p>
                      </div>
                      <CheckCircle2 className='h-5 w-5 text-green-400' />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fee Calculator */}
            <Card className='border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-pink-950/30 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-purple-400'>
                  <Percent className='h-5 w-5' />
                  Dynamic Fee Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={selectedTier}
                  onValueChange={setSelectedTier}
                  className='w-full'
                >
                  <TabsList className='grid w-full grid-cols-3 bg-black/40'>
                    <TabsTrigger value='free'>Free</TabsTrigger>
                    <TabsTrigger value='pro'>Pro</TabsTrigger>
                    <TabsTrigger value='enterprise'>Enterprise</TabsTrigger>
                  </TabsList>
                  {Object.entries(tierFees).map(([tier, data]) => (
                    <TabsContent key={tier} value={tier} className='space-y-4'>
                      <div className='rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4'>
                        <div className='mb-4 flex items-center justify-between'>
                          <span className='text-gray-400'>Trading Fee:</span>
                          <span className='text-3xl font-black text-purple-400'>
                            {data.fee}%
                          </span>
                        </div>
                        <div className='space-y-2 text-sm'>
                          <div className='flex justify-between'>
                            <span className='text-gray-400'>
                              Daily Battles:
                            </span>
                            <span className='font-semibold text-pink-400'>
                              {data.battles}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-gray-400'>Team Members:</span>
                            <span className='font-semibold text-pink-400'>
                              {data.teamMembers}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='rounded-lg border border-purple-500/20 bg-black/40 p-3'>
                        <p className='text-sm text-gray-400'>
                          On a $10,000 trade, you save{' '}
                          <span className='font-bold text-purple-400'>
                            ${((2.5 - data.fee) * 100).toFixed(0)}
                          </span>{' '}
                          compared to Free tier
                        </p>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Feature Grid */}
          <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {[
              {
                icon: HandshakeIcon,
                title: 'P2P Trading',
                desc: 'Buy/sell with escrow protection'
              },
              {
                icon: Coins,
                title: 'Multi-Currency',
                desc: 'ETH & ERC20 support'
              },
              {
                icon: Timer,
                title: 'Auto-Release',
                desc: 'Time-based fund release'
              },
              {
                icon: AlertTriangle,
                title: 'Dispute System',
                desc: '2-layer resolution engine'
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className='group h-full border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 backdrop-blur-sm transition-all hover:scale-105 hover:border-cyan-500/40'>
                  <CardContent className='flex flex-col items-center p-6 text-center'>
                    <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20'>
                      <feature.icon className='h-6 w-6 text-cyan-400' />
                    </div>
                    <h3 className='mb-2 font-bold text-cyan-300'>
                      {feature.title}
                    </h3>
                    <p className='text-sm text-gray-400'>{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Track #2: Gaming Features */}
      <section className='relative z-10 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center'
          >
            <Badge variant='epic' className='mb-4 text-sm'>
              GAMIFIED DEFI EXPERIENCE
            </Badge>
            <h2 className='mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
              BATTLE ARENA & ACHIEVEMENT SYSTEM
            </h2>
            <p className='mx-auto mb-12 max-w-2xl text-lg text-gray-400'>
              PvP battles, NFT achievements, 100-level progression, and daily
              quests - trading has never been this fun
            </p>
          </motion.div>

          {/* Battle Demo */}
          <Card
            id='battle-demo'
            className='mb-12 overflow-hidden border-purple-500/30 bg-black/60 backdrop-blur-lg'
          >
            <CardHeader>
              <CardTitle className='flex items-center justify-center gap-2 text-purple-400'>
                <Swords className='h-6 w-6' />
                LIVE BATTLE DEMONSTRATION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-8 lg:grid-cols-3'>
                {/* Player 1 */}
                <motion.div
                  animate={
                    battleWinner === 'player' ? { scale: [1, 1.1, 1] } : {}
                  }
                  className='text-center'
                >
                  <div className='relative mx-auto mb-4 h-32 w-32'>
                    <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 blur-xl' />
                    <div className='relative flex h-full w-full items-center justify-center rounded-full border-4 border-cyan-500 bg-black'>
                      <Trophy className='h-12 w-12 text-cyan-400' />
                    </div>
                  </div>
                  <h3 className='mb-2 text-xl font-bold text-cyan-400'>YOU</h3>
                  <div className='space-y-2'>
                    <Badge variant='rare'>Level 42</Badge>
                    <p className='text-2xl font-black text-white'>680 CP</p>
                  </div>
                </motion.div>

                {/* VS Animation */}
                <div className='flex items-center justify-center'>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className='relative'
                  >
                    <div className='text-6xl font-black text-yellow-400'>
                      VS
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className='absolute -inset-4 rounded-full bg-yellow-400/20 blur-xl'
                    />
                  </motion.div>
                </div>

                {/* Player 2 */}
                <motion.div
                  animate={
                    battleWinner === 'opponent' ? { scale: [1, 1.1, 1] } : {}
                  }
                  className='text-center'
                >
                  <div className='relative mx-auto mb-4 h-32 w-32'>
                    <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-red-500 to-orange-500 blur-xl' />
                    <div className='relative flex h-full w-full items-center justify-center rounded-full border-4 border-red-500 bg-black'>
                      <Flame className='h-12 w-12 text-red-400' />
                    </div>
                  </div>
                  <h3 className='mb-2 text-xl font-bold text-red-400'>
                    OPPONENT
                  </h3>
                  <div className='space-y-2'>
                    <Badge variant='epic'>Level 38</Badge>
                    <p className='text-2xl font-black text-white'>620 CP</p>
                  </div>
                </motion.div>
              </div>

              {/* Battle Button */}
              <div className='mt-8 text-center'>
                <Button
                  size='lg'
                  className='bg-gradient-to-r from-red-600 to-orange-600 font-bold tracking-wider text-white uppercase hover:from-red-500 hover:to-orange-500'
                  onClick={() => {
                    setBattleWinner(Math.random() > 0.5 ? 'player' : 'opponent')
                    setTimeout(() => setBattleWinner(null), 3000)
                  }}
                >
                  <Swords className='mr-2 h-5 w-5' />
                  INITIATE BATTLE
                </Button>
                {battleWinner && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='mt-4'
                  >
                    <Badge
                      variant={
                        battleWinner === 'player' ? 'success' : 'destructive'
                      }
                      className='text-lg'
                    >
                      {battleWinner === 'player'
                        ? '🎉 YOU WIN! 25% Fee Discount for 24 Hours!'
                        : '💀 DEFEATED! Try Again!'}
                    </Badge>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gaming Features Grid */}
          <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
            {[
              {
                title: 'Achievement NFTs',
                icon: Award,
                desc: '35+ achievements across 5 categories',
                stats: 'Common to Legendary rarity',
                color: 'from-yellow-500 to-orange-500'
              },
              {
                title: '100-Level System',
                icon: TrendingUp,
                desc: 'Progress from Novice to Mythic',
                stats: 'XP from trades, battles, quests',
                color: 'from-green-500 to-emerald-500'
              },
              {
                title: 'Daily Quests',
                icon: Target,
                desc: '7 daily & 3 weekly challenges',
                stats: 'Bonus XP & rewards',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                title: 'Combat Power',
                icon: Shield,
                desc: 'NFT-based battle strength',
                stats: 'Affects matchmaking',
                color: 'from-purple-500 to-pink-500'
              },
              {
                title: 'Winner Discounts',
                icon: Gift,
                desc: '25% trading fee reduction',
                stats: 'Active for 24 hours',
                color: 'from-red-500 to-rose-500'
              },
              {
                title: 'Leaderboards',
                icon: Crown,
                desc: 'Global rankings & rewards',
                stats: 'Daily, weekly, all-time',
                color: 'from-indigo-500 to-purple-500'
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className='group h-full overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-pink-950/20 backdrop-blur-sm transition-all hover:scale-105'>
                  <CardHeader>
                    <div className='flex items-start'>
                      <div
                        className={cn(
                          'inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r p-3',
                          feature.color
                        )}
                      >
                        <feature.icon className='h-6 w-6 text-white' />
                      </div>
                    </div>
                    <CardTitle className='text-purple-300'>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='mb-2 text-gray-400'>{feature.desc}</p>
                    <p className='text-sm font-semibold text-purple-400'>
                      {feature.stats}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Track #3: Collaboration Features */}
      <section className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center'
          >
            <Badge variant='rare' className='mb-4 text-sm'>
              SOCIAL & COLLABORATIVE FEATURES
            </Badge>
            <h2 className='mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
              TEAM & SOCIAL FEATURES
            </h2>
            <p className='mx-auto mb-12 max-w-2xl text-lg text-gray-400'>
              Create teams, chat in real-time, resolve disputes together, and
              earn social achievement NFTs
            </p>
          </motion.div>

          <div className='grid gap-8 lg:grid-cols-2'>
            {/* Team System */}
            <Card className='border-green-500/30 bg-gradient-to-br from-green-950/30 to-emerald-950/30 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-green-400'>
                  <Users className='h-5 w-5' />
                  Team Management System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='rounded-lg bg-green-950/40 p-4'>
                    <h4 className='mb-3 font-semibold text-green-300'>
                      Team Benefits
                    </h4>
                    <div className='space-y-2'>
                      {[
                        'Shared subscription benefits',
                        'Team-wide achievement tracking',
                        'Collaborative dispute resolution',
                        'Team chat channels',
                        'Shared activity logs'
                      ].map(benefit => (
                        <div key={benefit} className='flex items-center gap-2'>
                          <CheckCircle2 className='h-4 w-4 text-green-400' />
                          <span className='text-sm text-gray-300'>
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded-lg border border-green-500/20 bg-black/40 p-3 text-center'>
                      <p className='text-2xl font-bold text-green-400'>10</p>
                      <p className='text-xs text-gray-400'>Max Members</p>
                    </div>
                    <div className='rounded-lg border border-green-500/20 bg-black/40 p-3 text-center'>
                      <p className='text-2xl font-bold text-green-400'>5</p>
                      <p className='text-xs text-gray-400'>Team Quests</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat System */}
            <Card className='border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-teal-950/30 backdrop-blur-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-emerald-400'>
                  <MessageSquare className='h-5 w-5' />
                  Real-time Communication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {[
                    {
                      user: 'TraderPro',
                      message: 'Payment sent via PayPal!',
                      time: '2 min ago',
                      type: 'trade'
                    },
                    {
                      user: 'CryptoKing',
                      message: 'Thanks, confirming now...',
                      time: '1 min ago',
                      type: 'trade'
                    },
                    {
                      user: 'System',
                      message: 'Trade completed successfully! 🎉',
                      time: 'Just now',
                      type: 'system'
                    }
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        'rounded-lg p-3',
                        msg.type === 'system'
                          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20'
                          : 'bg-black/40'
                      )}
                    >
                      <div className='flex items-start justify-between'>
                        <div>
                          <p
                            className={cn(
                              'font-semibold',
                              msg.type === 'system'
                                ? 'text-green-400'
                                : 'text-emerald-300'
                            )}
                          >
                            {msg.user}
                          </p>
                          <p className='text-sm text-gray-400'>{msg.message}</p>
                        </div>
                        <span className='text-xs text-gray-500'>
                          {msg.time}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Social Features */}
          <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {[
              {
                icon: MessageSquare,
                title: 'Trade Chat',
                desc: 'Negotiate in real-time'
              },
              {
                icon: FileCheck,
                title: 'Evidence Upload',
                desc: 'Dispute resolution files'
              },
              {
                icon: UserCheck,
                title: 'Invite System',
                desc: 'Email-based onboarding'
              },
              {
                icon: Activity,
                title: 'Activity Logs',
                desc: 'Full audit trail'
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className='group h-full border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 backdrop-blur-sm transition-all hover:scale-105'>
                  <CardContent className='flex flex-col items-center p-6 text-center'>
                    <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20'>
                      <feature.icon className='h-6 w-6 text-emerald-400' />
                    </div>
                    <h3 className='mb-2 font-bold text-emerald-300'>
                      {feature.title}
                    </h3>
                    <p className='text-sm text-gray-400'>{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Track #4: Wildcard Features */}
      <section className='relative z-10 bg-gradient-to-b from-transparent via-red-950/10 to-transparent px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center'
          >
            <Badge variant='legendary' className='mb-4 text-sm'>
              INNOVATIVE GAME MECHANICS
            </Badge>
            <h2 className='mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl'>
              GAME-CHANGING INNOVATIONS
            </h2>
            <p className='mx-auto mb-12 max-w-2xl text-lg text-gray-400'>
              Where DeFi meets gaming in ways never seen before - battle for
              trading discounts and level up your financial power
            </p>
          </motion.div>

          {/* Unique Features Showcase */}
          <div className='mb-12 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 via-orange-950/20 to-yellow-950/20 p-8 backdrop-blur-sm'>
            <div className='grid gap-8 lg:grid-cols-3'>
              {[
                {
                  title: 'Battle → Discount',
                  icon: Swords,
                  desc: 'Win PvP battles to get 25% off trading fees',
                  unique: 'WORLD FIRST'
                },
                {
                  title: 'Trade → XP',
                  icon: TrendingUp,
                  desc: 'Every transaction earns experience points',
                  unique: 'GAMIFIED DEFI'
                },
                {
                  title: 'NFT → Power',
                  icon: Gem,
                  desc: 'Achievement NFTs boost combat strength',
                  unique: 'CROSS-UTILITY'
                }
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                  className='text-center'
                >
                  <Badge variant='gaming' className='mb-3'>
                    {feature.unique}
                  </Badge>
                  <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500'>
                    <feature.icon className='h-8 w-8 text-white' />
                  </div>
                  <h3 className='mb-2 text-xl font-bold text-orange-400'>
                    {feature.title}
                  </h3>
                  <p className='text-gray-400'>{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Trading Card Preview */}
          <Card className='overflow-hidden border-yellow-500/30 bg-black/60 backdrop-blur-lg'>
            <CardHeader>
              <CardTitle className='flex items-center justify-center gap-2 text-yellow-400'>
                <Layers className='h-6 w-6' />
                P2P LISTINGS AS TRADING CARDS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {[
                  {
                    trader: 'WhaleKing',
                    level: 87,
                    cp: 2450,
                    rating: 5.0,
                    trades: 523,
                    price: 3850,
                    amount: '0.5-2.0 ETH',
                    rarity: 'legendary'
                  },
                  {
                    trader: 'CryptoNinja',
                    level: 45,
                    cp: 980,
                    rating: 4.9,
                    trades: 127,
                    price: 3845,
                    amount: '0.1-1.0 ETH',
                    rarity: 'epic'
                  },
                  {
                    trader: 'NewTrader',
                    level: 12,
                    cp: 250,
                    rating: 4.7,
                    trades: 15,
                    price: 3840,
                    amount: '0.05-0.5 ETH',
                    rarity: 'common'
                  }
                ].map((listing, i) => (
                  <motion.div
                    key={listing.trader}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05, rotate: [-1, 1, -1, 0] }}
                    className={cn(
                      'relative overflow-hidden rounded-lg border-2 p-4',
                      listing.rarity === 'legendary' &&
                        'border-yellow-400 bg-gradient-to-br from-yellow-950/40 to-orange-950/40',
                      listing.rarity === 'epic' &&
                        'border-purple-400 bg-gradient-to-br from-purple-950/40 to-pink-950/40',
                      listing.rarity === 'common' &&
                        'border-gray-400 bg-gradient-to-br from-gray-950/40 to-slate-950/40'
                    )}
                  >
                    {/* Card Header */}
                    <div className='mb-3 flex items-start justify-between'>
                      <div>
                        <p className='font-bold text-white'>{listing.trader}</p>
                        <Badge variant={listing.rarity as any} className='mt-1'>
                          Lvl {listing.level}
                        </Badge>
                      </div>
                      <div className='text-right'>
                        <p className='text-xs text-gray-400'>Combat Power</p>
                        <p className='text-lg font-bold text-yellow-400'>
                          {listing.cp}
                        </p>
                      </div>
                    </div>

                    {/* Price Display */}
                    <div className='mb-3 rounded-lg bg-black/60 p-3'>
                      <p className='text-2xl font-black text-green-400'>
                        ${listing.price}
                        <span className='text-sm font-normal text-gray-400'>
                          /ETH
                        </span>
                      </p>
                      <p className='text-xs text-gray-400'>{listing.amount}</p>
                    </div>

                    {/* Stats */}
                    <div className='flex justify-between text-xs'>
                      <div className='flex items-center gap-1'>
                        <Star className='h-3 w-3 text-yellow-400' />
                        <span className='text-gray-400'>{listing.rating}</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Hash className='h-3 w-3 text-blue-400' />
                        <span className='text-gray-400'>
                          {listing.trades} trades
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Platform Stats Section */}
      <section className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className='text-center'
          >
            <h2 className='mb-12 text-4xl font-black text-white sm:text-5xl'>
              BUILT ON{' '}
              <span className='bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent'>
                HEDERA
              </span>{' '}
              ×{' '}
              <span className='bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
                HASHGRAPH
              </span>
            </h2>
          </motion.div>

          <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
            {[
              {
                label: 'Smart Contracts',
                value: '3',
                desc: 'Production-ready',
                icon: ScrollText
              },
              {
                label: 'Gas Optimized',
                value: '99%',
                desc: 'Lower than competitors',
                icon: Zap
              },
              {
                label: 'Response Time',
                value: '<2s',
                desc: 'Lightning fast',
                icon: Timer
              },
              {
                label: 'Security Score',
                value: 'A+',
                desc: 'Audited & tested',
                icon: ShieldCheck
              }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className='group h-full border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 backdrop-blur-sm transition-all hover:scale-105'>
                  <CardContent className='p-6 text-center'>
                    <stat.icon className='mx-auto mb-3 h-8 w-8 text-cyan-400' />
                    <p className='text-3xl font-black text-white'>
                      {stat.value}
                    </p>
                    <p className='mt-1 font-semibold text-cyan-400'>
                      {stat.label}
                    </p>
                    <p className='mt-2 text-sm text-gray-400'>{stat.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='relative z-10 px-4 py-20 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className='mx-auto max-w-4xl text-center'
        >
          <Badge variant='legendary' className='mb-6 text-sm'>
            <Rocket className='mr-1 h-3 w-3' />
            READY TO LAUNCH
          </Badge>

          <h2 className='mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400 bg-clip-text text-5xl font-black text-transparent sm:text-6xl'>
            JOIN THE REVOLUTION
          </h2>

          <p className='mx-auto mb-8 max-w-2xl text-xl text-gray-300'>
            Experience the future of decentralized trading where every
            transaction is a quest, every trade levels you up, and battles
            determine your fees
          </p>

          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <Link href={appRoutes.dashboard.base}>
              <Button
                size='lg'
                className='group w-full bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 text-lg font-black tracking-wider text-white uppercase shadow-2xl shadow-purple-500/25 transition-all hover:scale-105 hover:shadow-purple-500/50 sm:w-auto'
              >
                <Gamepad2 className='mr-2 h-6 w-6' />
                START YOUR JOURNEY
                <ChevronRight className='ml-2 h-6 w-6 transition-transform group-hover:translate-x-2' />
              </Button>
            </Link>
          </div>

          <div className='mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-green-400' />
              <span>Smart Contracts Live</span>
            </div>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-green-400' />
              <span>100% On-Chain</span>
            </div>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-green-400' />
              <span>Production Ready</span>
            </div>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-green-400' />
              <span>Open Source</span>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
