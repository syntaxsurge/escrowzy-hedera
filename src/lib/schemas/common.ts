import { z } from 'zod'

/**
 * Common validation schemas and refinements
 */

export const positiveNumberString = z
  .string()
  .min(1, 'Amount is required')
  .refine(val => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'Must be a positive number')

export const optionalPositiveNumberString = z
  .string()
  .optional()
  .refine(val => {
    if (!val || val === '') return true
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'Must be a positive number')

export const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')

export const transactionHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash')

export const emailSchema = z.string().email('Invalid email address')

export const urlSchema = z.string().url('Invalid URL')

export const nonEmptyString = z.string().min(1, 'This field is required')
