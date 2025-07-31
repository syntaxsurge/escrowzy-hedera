import { emailConfig } from '@/config/business-constants'

import { db } from '../drizzle'
import { teams, teamMembers, teamInvitations } from '../schema'
import type { User } from '../schema'

export async function seedTeams(users: {
  adminUser: User
  testUser1: User
  testUser2: User
  proUser: User
  enterpriseUser: User
}) {
  console.log('Seeding teams...')

  // Create admin team
  const [adminTeam] = await db
    .insert(teams)
    .values({
      name: 'Admin Team',
      planId: 'enterprise'
    })
    .returning()

  await db.insert(teamMembers).values({
    teamId: adminTeam.id,
    userId: users.adminUser.id,
    role: 'owner'
  })

  // Create test team with multiple members
  const [testTeam] = await db
    .insert(teams)
    .values({
      name: 'Development Team',
      planId: 'pro'
    })
    .returning()

  await db.insert(teamMembers).values([
    {
      teamId: testTeam.id,
      userId: users.testUser1.id,
      role: 'owner'
    },
    {
      teamId: testTeam.id,
      userId: users.testUser2.id,
      role: 'member'
    }
  ])

  // Create pro user's team
  const [proTeam] = await db
    .insert(teams)
    .values({
      name: 'Pro Team',
      planId: 'pro'
    })
    .returning()

  await db.insert(teamMembers).values({
    teamId: proTeam.id,
    userId: users.proUser.id,
    role: 'owner'
  })

  // Create enterprise team
  const [enterpriseTeam] = await db
    .insert(teams)
    .values({
      name: 'Enterprise Corp',
      planId: 'enterprise'
    })
    .returning()

  await db.insert(teamMembers).values({
    teamId: enterpriseTeam.id,
    userId: users.enterpriseUser.id,
    role: 'owner'
  })

  // Create some pending invitations
  const invitationToken = crypto.randomUUID()
  await db.insert(teamInvitations).values({
    teamId: testTeam.id,
    email: emailConfig.testEmail,
    role: 'member',
    token: invitationToken,
    invitedByUserId: users.testUser1.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  })

  console.log('Teams and team members seeded successfully')

  return {
    adminTeam,
    testTeam,
    proTeam,
    enterpriseTeam
  }
}
