import { z } from 'zod'

import { emailSchema, nonEmptyString } from './common'

// Update account schema
export const updateAccountSchema = z.object({
  name: nonEmptyString.max(100, 'Name is too long'),
  email: emailSchema.optional().or(z.literal(''))
})

// Delete account schema
export const deleteAccountSchema = z.object({
  password: nonEmptyString.describe(
    'Confirmation is required for account deletion'
  )
})
