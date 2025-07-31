import { NextRequest } from 'next/server'

import { apiResponses } from '@/lib/api/server-utils'
import { confirmPaymentSchema } from '@/lib/schemas/payment'
import { verifyAndConfirmPayment } from '@/services/payment'
import { getUser } from '@/services/user'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return apiResponses.unauthorized()
    }

    const body = await request.json()
    const validatedData = confirmPaymentSchema.parse(body)

    // Verify blockchain transaction and update team plan only if successful
    try {
      const verification = await verifyAndConfirmPayment(
        validatedData.teamId,
        validatedData.planId,
        validatedData.transactionHash,
        validatedData.fromAddress,
        validatedData.amount,
        validatedData.networkId,
        user.id
      )

      return apiResponses.success({
        success: true,
        payment: {
          status: 'confirmed',
          ...verification
        }
      })
    } catch (verificationError) {
      console.error('Payment verification failed:', verificationError)
      return apiResponses.error(
        'Transaction verification failed or payment was not successful',
        400
      )
    }
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to confirm payment')
  }
}
