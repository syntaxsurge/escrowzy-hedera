import { z } from 'zod'

import { emailSchema } from './common'

// Team member role enum
export const teamMemberRoleEnum = z.enum(['member', 'owner'])

// Downgrade schema
export const downgradeSchema = z.object({
  teamId: z.number()
})

// Invite team member schema
export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
  role: teamMemberRoleEnum.refine(
    role => role !== undefined,
    'Role is required'
  )
})

// Remove team member schema
export const removeTeamMemberSchema = z.object({
  memberId: z.string().transform(val => parseInt(val, 10))
})

// Accept invitation schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invalid invitation token').optional(),
  invitationId: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional()
})

// Reject invitation schema
export const rejectInvitationSchema = z.object({
  invitationId: z.string().transform(val => parseInt(val, 10))
})

// Update team member role schema
export const updateTeamMemberRoleSchema = z.object({
  memberId: z.string().transform(val => parseInt(val, 10)),
  role: z.enum(['owner', 'member'])
})

// Leave team schema
export const leaveTeamSchema = z.object({})
