import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { requireAuth } from '@/lib/auth/auth-utils'
import { requireTeamMember } from '@/lib/auth/team-auth'
import { createIntentSchema } from '@/lib/schemas/payment'
import { createContractPlanService } from '@/services/blockchain/contract-plan'
import { createPaymentIntent } from '@/services/payment'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const { planId, networkId, teamId, userId } = createIntentSchema.parse(body)

    // Verify user has access to this team
    const teamAuth = await requireTeamMember(teamId, user.id)

    // Ensure the userId in the request matches the authenticated user
    // or the user is the team owner (who can purchase for the team)
    if (userId !== user.id && !teamAuth.isOwner) {
      return apiResponses.error(
        'You can only create payment intents for yourself or your team if you are the owner',
        403
      )
    }

    // Fetch plan details from smart contract
    const contractService = createContractPlanService(networkId)
    if (!contractService) {
      return apiResponses.error(
        'Smart contract not configured for this network',
        400
      )
    }

    // Get all active plans to find the one matching the planId
    const activePlans = await contractService.getActivePlans()
    const plan = activePlans.find(
      p => p.name.toLowerCase() === planId.toLowerCase()
    )

    if (!plan) {
      return apiResponses.error('Invalid plan ID', 400)
    }

    // Convert plan price from Wei to USD for display purposes
    const priceUSD = await contractService.convertWeiToUSD(plan.priceWei)

    const planDetails = {
      id: plan.name,
      name: plan.displayName,
      price: priceUSD.toFixed(0),
      currency: 'USD',
      planKey: plan.planKey,
      priceWei: plan.priceWei, // Pass the original Wei amount
      isTeamPlan: plan.isTeamPlan || plan.name.toLowerCase().includes('team'),
      features: plan.features,
      maxMembers: Number(plan.maxMembers)
    }

    const paymentIntent = await createPaymentIntent(
      teamId,
      userId || user.id,
      planDetails,
      networkId
    )

    return apiResponses.success({ paymentIntent })
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to create payment intent')
  }
}
