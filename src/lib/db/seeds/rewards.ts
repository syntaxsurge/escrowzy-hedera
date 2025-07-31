import { db } from '../drizzle'
import { userGameData, achievementNFTs } from '../schema'
import type { User } from '../schema'

export async function seedRewards(users: {
  adminUser: User
  testUser1: User
  testUser2: User
  proUser: User
  enterpriseUser: User
}) {
  console.log('Seeding rewards data...')

  // Create game data for users
  await db.insert(userGameData).values([
    {
      userId: users.adminUser.id,
      xp: 50000,
      level: 50,
      combatPower: 5000,
      loginStreak: 15,
      lastLoginDate: new Date(),
      totalLogins: 100,
      achievements: {
        earned: [
          'early_adopter',
          'battle_master',
          'trade_veteran',
          'week_warrior'
        ],
        progress: {}
      },
      questProgress: {
        daily_login: { completed: true, progress: 1 },
        weekly_trades: { completed: true, progress: 10 },
        monthly_volume: { completed: false, progress: 8500 }
      },
      stats: {
        totalGamesPlayed: 100,
        gamesWon: 75,
        winStreak: 10,
        bestWinStreak: 15,
        totalDamageDealt: 100000,
        totalDamageTaken: 50000,
        questsCompleted: 50,
        achievementsUnlocked: 30,
        totalPlayTime: 10000,
        battlesWon: 75,
        battlesLost: 25
      }
    },
    {
      userId: users.testUser1.id,
      xp: 2500,
      level: 10,
      combatPower: 250,
      loginStreak: 3,
      lastLoginDate: new Date(),
      totalLogins: 20,
      achievements: {
        earned: ['first_trade', 'team_player'],
        progress: { trade_veteran: 2 }
      },
      questProgress: {
        daily_login: { completed: true, progress: 1 },
        weekly_trades: { completed: false, progress: 2 }
      },
      stats: {
        totalGamesPlayed: 20,
        gamesWon: 12,
        winStreak: 3,
        bestWinStreak: 5,
        totalDamageDealt: 10000,
        totalDamageTaken: 8000,
        questsCompleted: 10,
        achievementsUnlocked: 5,
        totalPlayTime: 2000,
        battlesWon: 12,
        battlesLost: 8
      }
    },
    {
      userId: users.testUser2.id,
      xp: 500,
      level: 5,
      combatPower: 150,
      loginStreak: 1,
      lastLoginDate: new Date(),
      totalLogins: 10,
      achievements: {
        earned: ['first_trade'],
        progress: { trade_veteran: 1, battle_master: 5 }
      },
      questProgress: {
        daily_login: { completed: true, progress: 1 }
      },
      stats: {
        totalGamesPlayed: 10,
        gamesWon: 5,
        winStreak: 1,
        bestWinStreak: 2,
        totalDamageDealt: 5000,
        totalDamageTaken: 5000,
        questsCompleted: 5,
        achievementsUnlocked: 3,
        totalPlayTime: 1000,
        battlesWon: 5,
        battlesLost: 5
      }
    },
    {
      userId: users.proUser.id,
      xp: 15000,
      level: 25,
      combatPower: 1500,
      loginStreak: 7,
      lastLoginDate: new Date(),
      totalLogins: 50,
      achievements: {
        earned: ['first_trade', 'hot_streak', 'trade_veteran'],
        progress: { battle_master: 35 }
      },
      questProgress: {
        daily_login: { completed: true, progress: 1 },
        weekly_battles: { completed: false, progress: 7 }
      },
      stats: {
        totalGamesPlayed: 50,
        gamesWon: 35,
        winStreak: 7,
        bestWinStreak: 10,
        totalDamageDealt: 50000,
        totalDamageTaken: 30000,
        questsCompleted: 25,
        achievementsUnlocked: 15,
        totalPlayTime: 5000,
        battlesWon: 35,
        battlesLost: 15
      }
    },
    {
      userId: users.enterpriseUser.id,
      xp: 30000,
      level: 35,
      combatPower: 3000,
      loginStreak: 30,
      lastLoginDate: new Date(),
      totalLogins: 75,
      achievements: {
        earned: [
          'first_trade',
          'trade_veteran',
          'volume_trader',
          'battle_master'
        ],
        progress: {}
      },
      questProgress: {
        monthly_volume: { completed: false, progress: 3500 }
      },
      stats: {
        totalGamesPlayed: 75,
        gamesWon: 60,
        winStreak: 12,
        bestWinStreak: 20,
        totalDamageDealt: 75000,
        totalDamageTaken: 40000,
        questsCompleted: 40,
        achievementsUnlocked: 25,
        totalPlayTime: 7500,
        battlesWon: 60,
        battlesLost: 15
      }
    }
  ])

  // Create achievement NFTs for users (simulate earned achievements)
  const achievementData = [
    {
      userId: users.adminUser.id,
      achievementId: 'early_adopter',
      tokenId: 1,
      metadataUri: 'ipfs://QmEarlyAdopter',
      mintedAt: new Date()
    },
    {
      userId: users.adminUser.id,
      achievementId: 'battle_master',
      tokenId: 2,
      metadataUri: 'ipfs://QmBattleMaster',
      mintedAt: new Date()
    },
    {
      userId: users.adminUser.id,
      achievementId: 'trade_veteran',
      tokenId: 3,
      metadataUri: 'ipfs://QmTradeVeteran',
      mintedAt: new Date()
    },
    {
      userId: users.testUser1.id,
      achievementId: 'first_trade',
      tokenId: 4,
      metadataUri: 'ipfs://QmFirstTrade',
      mintedAt: new Date()
    },
    {
      userId: users.testUser1.id,
      achievementId: 'team_player',
      tokenId: 5,
      metadataUri: 'ipfs://QmTeamPlayer',
      mintedAt: new Date()
    },
    {
      userId: users.proUser.id,
      achievementId: 'first_trade',
      tokenId: 6,
      metadataUri: 'ipfs://QmFirstTrade',
      mintedAt: new Date()
    },
    {
      userId: users.proUser.id,
      achievementId: 'hot_streak',
      tokenId: 7,
      metadataUri: 'ipfs://QmHotStreak',
      mintedAt: new Date()
    },
    {
      userId: users.enterpriseUser.id,
      achievementId: 'volume_trader',
      tokenId: 8,
      metadataUri: 'ipfs://QmVolumeTrader',
      mintedAt: new Date()
    },
    {
      userId: users.enterpriseUser.id,
      achievementId: 'battle_master',
      tokenId: 9,
      metadataUri: 'ipfs://QmBattleMaster',
      mintedAt: new Date()
    }
  ]

  await db.insert(achievementNFTs).values(achievementData)

  console.log('Rewards data and achievement NFTs seeded successfully')
}
