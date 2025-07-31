import { toTitleCase } from './string'

export function canUpgradeToPlan(
  currentPlan: string,
  targetPlan: string
): boolean {
  // Simple logic based on plan names
  // This assumes plans follow a hierarchy: free < pro < enterprise < team_pro < team_enterprise
  const planHierarchy: Record<string, number> = {
    free: 0,
    pro: 1,
    enterprise: 2,
    team_pro: 3,
    team_enterprise: 4
  }

  // Normalize plan names - handle "team pro" and "team_pro" variations
  const normalizedCurrent = currentPlan.toLowerCase().replace(/\s+/g, '_')
  const normalizedTarget = targetPlan.toLowerCase().replace(/\s+/g, '_')

  const currentLevel = planHierarchy[normalizedCurrent] ?? 0
  const targetLevel = planHierarchy[normalizedTarget] ?? 0

  return targetLevel > currentLevel
}

export function formatTeamMemberLimit(maxMembers: number): string {
  if (maxMembers === -1 || maxMembers > 9999) {
    return 'Unlimited team members'
  }
  return `${maxMembers} team member${maxMembers === 1 ? '' : 's'}`
}

export function getPlanDisplayName(planName: string): string {
  return toTitleCase(planName || 'free')
}

export function formatTeamPlanName(planName: string): string {
  const displayName = getPlanDisplayName(planName)

  // Remove redundant "Team" prefix from team plans
  if (planName.toLowerCase().includes('team_')) {
    return displayName.replace(/^Team\s+/i, '')
  }

  return displayName
}

// Plan hierarchy with team plans
export const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
  team_pro: 3,
  team_enterprise: 4
}

export function getHighestTeamPlan(
  paymentHistory: { planId: string; status: string }[]
): string {
  // Filter confirmed payments only
  const confirmedPayments = paymentHistory.filter(p => p.status === 'confirmed')

  if (confirmedPayments.length === 0) {
    return 'free'
  }

  // Find the highest plan based on hierarchy
  let highestPlan = 'free'
  let highestLevel = 0

  for (const payment of confirmedPayments) {
    const planLevel = PLAN_HIERARCHY[payment.planId.toLowerCase()] ?? 0
    if (planLevel > highestLevel) {
      highestLevel = planLevel
      highestPlan = payment.planId.toLowerCase()
    }
  }

  return highestPlan
}

export function getMemberPlan(
  userId: number,
  teamPlanId: string,
  paymentHistory: { userId: number; planId: string; status: string }[]
): string {
  // Check if user has made any payments
  const userPayments = paymentHistory.filter(
    p => p.userId === userId && p.status === 'confirmed'
  )

  if (userPayments.length === 0) {
    // User hasn't paid, they get the team's plan or free
    return teamPlanId || 'free'
  }

  // Find the highest plan the user has paid for
  let highestPlan = teamPlanId || 'free'
  let highestLevel = PLAN_HIERARCHY[highestPlan.toLowerCase()] ?? 0

  for (const payment of userPayments) {
    const planLevel = PLAN_HIERARCHY[payment.planId.toLowerCase()] ?? 0
    if (planLevel > highestLevel) {
      highestLevel = planLevel
      highestPlan = payment.planId.toLowerCase()
    }
  }

  return highestPlan
}
