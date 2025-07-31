import { seedLegalDocuments } from './seeds/legal-documents'
import { seedPlatformContracts } from './seeds/platform-contracts'
import { seedRewards } from './seeds/rewards'
import { seedTeams } from './seeds/teams'
import { seedTrades } from './seeds/trades'
import { seedUsers } from './seeds/users'

async function seed() {
  try {
    console.log('🌱 Starting database seed process...')
    console.log('================================')

    // Seed users first as other seeds depend on them
    const users = await seedUsers()
    console.log('✅ Users seeded')

    // Seed teams with the created users
    await seedTeams(users)
    console.log('✅ Teams seeded')

    // Seed rewards data
    await seedRewards(users)
    console.log('✅ Rewards data seeded')

    // Seed trades, P2P and domain listings
    await seedTrades(users)
    console.log('✅ P2P and domain trades/listings seeded')

    // Seed legal documents
    await seedLegalDocuments(users.adminUser)
    console.log('✅ Legal documents seeded')

    // Seed platform contracts
    await seedPlatformContracts()
    console.log('✅ Platform contracts seeded')

    console.log('================================')
    console.log('🎉 Seed process completed successfully!')
    console.log('')
    console.log('Summary:')
    console.log('- Users created: 5')
    console.log('- Teams created: 4')
    console.log('- Game data initialized for all users')
    console.log('- Achievement NFTs minted: 9')
    console.log('- P2P Listings created: 2')
    console.log('- P2P Trades created: 2')
    console.log('- Domain Listings created: 2')
    console.log('- Domain Trades created: 2')
    console.log('- Battles created: 5')
    console.log('- Trading stats initialized')
    console.log('- Platform contracts configured')
    console.log('- Legal documents initialized')
    console.log('')
    console.log('You can now login with the admin wallet:')
    console.log('0x7CE33579392AEAF1791c9B0c8302a502B5867688')
  } catch (error) {
    console.error('❌ Seed process failed:', error)
    throw error
  }
}

// Run the seed function
seed()
  .catch(error => {
    console.error('Fatal error during seed:', error)
    process.exit(1)
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...')
    process.exit(0)
  })
