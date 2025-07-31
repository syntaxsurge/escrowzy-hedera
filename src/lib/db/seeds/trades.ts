import { getSupportedChainIds, getNativeCurrencySymbol } from '@/lib/blockchain'

import { db } from '../drizzle'
import { trades, escrowListings, battles, userTradingStats } from '../schema'
import type { User } from '../schema'

export async function seedTrades(users: {
  adminUser: User
  testUser1: User
  testUser2: User
  proUser: User
  enterpriseUser: User
}) {
  console.log('Seeding P2P and domain listings with trades...')

  // Get the first supported chain ID for seeding
  const supportedChains = getSupportedChainIds()
  const defaultChainId = supportedChains[0]
  const currency = getNativeCurrencySymbol(defaultChainId)

  // Create P2P listings (only 2)
  await db.insert(escrowListings).values([
    {
      userId: users.testUser1.id,
      listingCategory: 'p2p',
      listingType: 'sell',
      tokenOffered: currency,
      amount: '500.0',
      pricePerUnit: '1.5',
      minAmount: '10',
      maxAmount: '500',
      paymentMethods: ['bank_transfer', 'paypal'],
      isActive: true
    },
    {
      userId: users.testUser2.id,
      listingCategory: 'p2p',
      listingType: 'buy',
      tokenOffered: currency,
      amount: '1000',
      pricePerUnit: '1.45',
      minAmount: '50',
      maxAmount: '1000',
      paymentMethods: ['bank_transfer', 'wise'],
      isActive: true
    },
    // Domain listings (only 2)
    {
      userId: users.adminUser.id,
      listingCategory: 'domain',
      listingType: 'sell',
      amount: '5000',
      metadata: {
        domainName: 'cryptoexchange.com',
        registrar: 'GoDaddy',
        expiryDate: '2025-12-15',
        monthlyTraffic: 15000,
        monthlyRevenue: 2500,
        description: 'Premium crypto exchange domain with established traffic',
        transferMethod: 'push',
        includesWebsite: false,
        category: 'cryptocurrency'
      },
      isActive: true
    },
    {
      userId: users.proUser.id,
      listingCategory: 'domain',
      listingType: 'sell',
      amount: '15000',
      metadata: {
        domainName: 'defiprotocol.io',
        registrar: 'Namecheap',
        expiryDate: '2026-03-20',
        monthlyTraffic: 45000,
        monthlyRevenue: 8500,
        description:
          'High-traffic DeFi domain with active community and revenue',
        transferMethod: 'escrow',
        includesWebsite: true,
        websiteStack: 'Next.js, TypeScript, Tailwind',
        category: 'defi'
      },
      isActive: true
    }
  ])

  // Create sample trades for P2P
  await db.insert(trades).values([
    {
      escrowId: 1,
      chainId: defaultChainId,
      buyerId: users.testUser2.id,
      sellerId: users.testUser1.id,
      amount: '100',
      currency,
      listingCategory: 'p2p',
      status: 'completed',
      metadata: {
        paymentMethod: 'bank_transfer',
        completionTime: '45 minutes',
        rating: 5
      },
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      escrowId: 2,
      chainId: defaultChainId,
      buyerId: users.proUser.id,
      sellerId: users.testUser2.id,
      amount: '250',
      currency,
      listingCategory: 'p2p',
      status: 'funded',
      metadata: {
        paymentMethod: 'wise'
      },
      depositedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    },
    // Domain trades
    {
      escrowId: 3,
      chainId: defaultChainId,
      buyerId: users.testUser2.id,
      sellerId: users.adminUser.id,
      amount: '3333',
      currency,
      listingCategory: 'domain',
      status: 'completed',
      metadata: {
        domainName: 'cryptoexchange.com',
        transferMethod: 'push',
        completionTime: '2 hours',
        rating: 5,
        escrowAgent: 'Escrow.com'
      },
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    },
    {
      escrowId: 4,
      chainId: defaultChainId,
      buyerId: users.enterpriseUser.id,
      sellerId: users.proUser.id,
      amount: '10000',
      currency,
      listingCategory: 'domain',
      status: 'payment_sent',
      metadata: {
        domainName: 'defiprotocol.io',
        transferMethod: 'escrow',
        includesWebsite: true
      },
      paymentSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
  ])

  // Create battles
  await db.insert(battles).values([
    {
      player1Id: users.testUser1.id,
      player2Id: users.testUser2.id,
      winnerId: users.testUser1.id,
      player1CP: 250,
      player2CP: 150,
      feeDiscountPercent: 25,
      discountExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires tomorrow
    },
    {
      player1Id: users.proUser.id,
      player2Id: users.enterpriseUser.id,
      winnerId: users.enterpriseUser.id,
      player1CP: 1500,
      player2CP: 3000,
      feeDiscountPercent: 25,
      discountExpiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // Expired 1 hour ago
    },
    {
      player1Id: users.adminUser.id,
      player2Id: users.proUser.id,
      winnerId: users.adminUser.id,
      player1CP: 5000,
      player2CP: 1500,
      feeDiscountPercent: 25,
      discountExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // Expires in 12 hours
    },
    {
      player1Id: users.testUser1.id,
      player2Id: users.enterpriseUser.id,
      winnerId: users.enterpriseUser.id,
      player1CP: 250,
      player2CP: 3000,
      feeDiscountPercent: 25,
      discountExpiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Expired 2 days ago
    },
    {
      player1Id: users.testUser2.id,
      player2Id: users.proUser.id,
      winnerId: users.proUser.id,
      player1CP: 150,
      player2CP: 1500,
      feeDiscountPercent: 25,
      discountExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // Expires in 6 hours
    }
  ])

  // Create trading stats
  await db.insert(userTradingStats).values([
    {
      userId: users.adminUser.id,
      totalTrades: 50,
      successfulTrades: 48,
      totalVolume: '150000',
      avgCompletionTime: 35, // minutes
      disputesWon: 2,
      disputesLost: 0,
      rating: 5
    },
    {
      userId: users.testUser1.id,
      totalTrades: 15,
      successfulTrades: 14,
      totalVolume: '25000',
      avgCompletionTime: 45,
      disputesWon: 1,
      disputesLost: 0,
      rating: 5
    },
    {
      userId: users.testUser2.id,
      totalTrades: 8,
      successfulTrades: 7,
      totalVolume: '12000',
      avgCompletionTime: 50,
      disputesWon: 0,
      disputesLost: 1,
      rating: 4
    },
    {
      userId: users.proUser.id,
      totalTrades: 30,
      successfulTrades: 29,
      totalVolume: '85000',
      avgCompletionTime: 40,
      disputesWon: 1,
      disputesLost: 0,
      rating: 5
    },
    {
      userId: users.enterpriseUser.id,
      totalTrades: 75,
      successfulTrades: 73,
      totalVolume: '500000',
      avgCompletionTime: 30,
      disputesWon: 2,
      disputesLost: 0,
      rating: 5
    }
  ])

  console.log(
    'Trades (P2P and domains), battles, and trading stats seeded successfully'
  )
  console.log('- P2P listings created: 2')
  console.log('- Domain listings created: 2')
  console.log('- P2P trades created: 2')
  console.log('- Domain trades created: 2')
}
