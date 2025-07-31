import { createUser } from '../queries/users'

export async function seedUsers() {
  console.log('Seeding users...')

  // Create admin user
  const adminUser = await createUser({
    walletAddress: '0x7CE33579392AEAF1791c9B0c8302a502B5867688',
    name: 'Admin User',
    role: 'admin'
  })

  // Create test users
  const testUser1 = await createUser({
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
    name: 'Alice Johnson',
    role: 'user'
  })

  const testUser2 = await createUser({
    walletAddress: '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed',
    name: 'Bob Smith',
    role: 'user'
  })

  const proUser = await createUser({
    walletAddress: '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    name: 'Charlie Davis',
    role: 'user'
  })

  const enterpriseUser = await createUser({
    walletAddress: '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
    name: 'Diana Martinez',
    role: 'user'
  })

  console.log('Users seeded successfully')

  return {
    adminUser,
    testUser1,
    testUser2,
    proUser,
    enterpriseUser
  }
}
