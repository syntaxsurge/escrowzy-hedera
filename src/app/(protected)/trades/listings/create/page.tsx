'use client'

import { useRouter } from 'next/navigation'

import { motion } from 'framer-motion'
import {
  Coins,
  Globe,
  Briefcase,
  Package,
  ArrowRight,
  Shield,
  Zap,
  Lock
} from 'lucide-react'

import { navigationProgress } from '@/components/providers/navigation-progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'

interface MarketOption {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  bgGradient: string
  features: string[]
  badge?: string
  available: boolean
}

export default function CreateListingPage() {
  const router = useRouter()

  const marketOptions: MarketOption[] = [
    {
      id: 'p2p',
      title: 'P2P Crypto Trading',
      description: 'Buy or sell cryptocurrency with secure escrow',
      icon: Coins,
      href: `${appRoutes.trades.listings.create}/p2p`,
      color: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
      features: [
        'Instant trades',
        'Multiple payment methods',
        'Battle for discounts'
      ],
      badge: 'Popular',
      available: true
    },
    {
      id: 'domain',
      title: 'Domain & Website',
      description: 'Transfer domains and websites safely',
      icon: Globe,
      href: `${appRoutes.trades.listings.create}/domain`,
      color: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-500/10 to-pink-500/10',
      features: ['Secure transfer', 'Escrow protection', 'Manual verification'],
      badge: 'New',
      available: true
    },
    {
      id: 'service',
      title: 'Services',
      description: 'Offer freelance or professional services',
      icon: Briefcase,
      href: `${appRoutes.trades.listings.create}/service`,
      color: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-500/10 to-emerald-500/10',
      features: ['Milestone payments', 'Dispute resolution', 'Rating system'],
      badge: 'Coming Soon',
      available: false
    },
    {
      id: 'digital',
      title: 'Digital Goods',
      description: 'Sell software, art, and digital products',
      icon: Package,
      href: `${appRoutes.trades.listings.create}/digital`,
      color: 'from-orange-500 to-red-600',
      bgGradient: 'from-orange-500/10 to-red-500/10',
      features: [
        'Instant delivery',
        'License management',
        'Automated fulfillment'
      ],
      badge: 'Coming Soon',
      available: false
    }
  ]

  const handleCardClick = (option: MarketOption) => {
    if (option.available) {
      // Start the navigation progress bar
      navigationProgress.start()
      router.push(option.href)
    }
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='space-y-4 text-center'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-primary/10 border-primary/20 inline-flex items-center gap-2 rounded-full border px-4 py-2'
        >
          <Shield className='text-primary h-4 w-4' />
          <span className='text-sm font-medium'>Secure Escrow Protection</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-4xl font-bold text-transparent'
        >
          What would you like to list?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='text-muted-foreground mx-auto max-w-2xl'
        >
          Choose the type of listing you want to create. All transactions are
          protected by our secure escrow system.
        </motion.p>
      </div>

      {/* Market Options Grid */}
      <div className='grid gap-6 md:grid-cols-2'>
        {marketOptions.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            whileHover={option.available ? { scale: 1.02 } : undefined}
            whileTap={option.available ? { scale: 0.98 } : undefined}
          >
            <Card
              className={cn(
                'relative cursor-pointer overflow-hidden transition-all duration-300',
                'border-2 hover:shadow-2xl',
                option.available
                  ? 'hover:border-primary/50'
                  : 'cursor-not-allowed opacity-60'
              )}
              onClick={() => handleCardClick(option)}
            >
              {/* Background Gradient */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-30',
                  option.bgGradient
                )}
              />

              {/* Badge */}
              {option.badge && (
                <div className='absolute top-4 right-4'>
                  <Badge
                    variant={option.available ? 'default' : 'secondary'}
                    className={cn(
                      'font-bold',
                      option.available &&
                        option.badge === 'New' &&
                        'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                      option.available &&
                        option.badge === 'Popular' &&
                        'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    )}
                  >
                    {option.badge}
                  </Badge>
                </div>
              )}

              <CardContent className='relative space-y-4 p-6'>
                {/* Icon and Title */}
                <div className='flex items-start gap-4'>
                  <div
                    className={cn(
                      'rounded-xl bg-gradient-to-br p-3 text-white',
                      option.color
                    )}
                  >
                    <option.icon className='h-6 w-6' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-xl font-bold'>{option.title}</h3>
                    <p className='text-muted-foreground mt-1 text-sm'>
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className='space-y-2'>
                  {option.features.map((feature, i) => (
                    <div key={i} className='flex items-center gap-2 text-sm'>
                      <div className='bg-primary h-1.5 w-1.5 rounded-full' />
                      <span className='text-muted-foreground'>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action */}
                {option.available && (
                  <div className='flex items-center justify-between pt-2'>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                      <Zap className='h-4 w-4 text-yellow-500' />
                      <span>Low fees</span>
                    </div>
                    <div className='text-primary flex items-center gap-1 font-medium'>
                      <span>Get Started</span>
                      <ArrowRight className='h-4 w-4' />
                    </div>
                  </div>
                )}

                {/* Coming Soon Overlay */}
                {!option.available && (
                  <div className='absolute inset-0 flex items-end justify-center p-4'>
                    <div className='bg-background/95 w-full rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 backdrop-blur-[2px]'>
                      <div className='flex items-center gap-2'>
                        <div className='flex-shrink-0'>
                          <Lock className='h-5 w-5 text-amber-500' />
                        </div>
                        <div className='flex-1'>
                          <p className='text-sm font-semibold text-amber-600 dark:text-amber-400'>
                            Coming Soon
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            We're working hard to bring you this feature
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
