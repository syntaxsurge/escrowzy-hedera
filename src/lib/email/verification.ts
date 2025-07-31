import { apiEndpoints } from '@/config/api-endpoints'
import { envPublic } from '@/config/env.public'

import { sendEmail } from './index'

const APP_URL = envPublic.NEXT_PUBLIC_APP_URL

function generateVerificationEmailHtml(verificationUrl: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #f97316;">Email Verification Required</h2>
      <p>Hi there!</p>
      <p>Please verify your email address to complete your account setup.</p>
      <div style="margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        If you didn't request this verification, you can safely ignore this email.
      </p>
      <p style="color: #666; font-size: 14px;">
        This verification link will expire in 24 hours.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="color: #999; font-size: 12px;">
        ${envPublic.NEXT_PUBLIC_APP_NAME} - ${APP_URL}
      </p>
    </div>
  `
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${APP_URL}${apiEndpoints.auth.verifyEmail}?token=${token}`
  const emailSubject = 'Verify your email address'
  const emailHtml = generateVerificationEmailHtml(verificationUrl)

  return sendEmail(email, emailSubject, emailHtml)
}
