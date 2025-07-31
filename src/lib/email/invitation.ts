import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'

import { sendEmail } from './index'

const APP_URL = envPublic.NEXT_PUBLIC_APP_URL

function generateInvitationEmailHtml(
  inviterName: string,
  teamName: string,
  role: string,
  inviteUrl: string,
  isExistingUser: boolean
): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h2 style="color: #f97316;">Team Invitation</h2>
      <p>Hi there!</p>
      <p><strong>${inviterName}</strong> has invited you to join the team <strong>${teamName}</strong>.</p>
      <p>You've been invited as a <strong>${role}</strong>.</p>
      <div style="margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ${isExistingUser ? 'View Invitation' : 'Accept Invitation'}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        ${
          isExistingUser
            ? 'Sign in to your account to view and manage this invitation.'
            : 'Click the button above to create your account and join the team.'
        }
      </p>
      <p style="color: #666; font-size: 14px;">
        This invitation will expire in 7 days. If you don't want to join this team, you can ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">
      <p style="color: #999; font-size: 12px;">
        ${envPublic.NEXT_PUBLIC_APP_NAME} - ${APP_URL}
      </p>
    </div>
  `
}

export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  teamName: string,
  role: string,
  token: string,
  isExistingUser: boolean
) {
  const inviteUrl = isExistingUser
    ? `${APP_URL}${appRoutes.dashboard.invitations}`
    : `${APP_URL}/invite/${token}`

  const emailSubject = `You've been invited to join ${teamName}`
  const emailHtml = generateInvitationEmailHtml(
    inviterName,
    teamName,
    role,
    inviteUrl,
    isExistingUser
  )

  return sendEmail(email, emailSubject, emailHtml)
}
