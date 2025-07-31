import { apiEndpoints } from '@/config/api-endpoints'
import { envServer } from '@/config/env.server'

const RESEND_API_KEY = envServer.RESEND_API_KEY
const FROM_EMAIL = envServer.FROM_EMAIL

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch(apiEndpoints.external.resend.emails, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Email send failed: ${error}`)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Re-export specific email functions for convenience
export { sendInvitationEmail } from './invitation'
export { sendVerificationEmail } from './verification'
