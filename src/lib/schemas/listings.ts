import { z } from 'zod'

import {
  isValidPaymentMethod,
  isValidToken,
  TradeCategory
} from '@/types/listings'

import {
  positiveNumberString,
  optionalPositiveNumberString
} from '../schemas/common'

// Base listing fields shared by both P2P and domain listings
const baseListingSchema = z.object({
  paymentMethods: z
    .array(z.string())
    .min(1, 'At least one payment method is required')
    .refine(
      methods => methods.every(isValidPaymentMethod),
      'Invalid payment method'
    ),
  paymentWindow: z
    .number()
    .int()
    .min(5, 'Payment window must be at least 5 minutes')
    .max(1440, 'Payment window cannot exceed 24 hours')
    .optional()
    .default(15)
    .describe('Payment window in minutes')
})

// P2P-specific listing schema
export const createP2PListingSchema = baseListingSchema.extend({
  listingCategory: z.literal(TradeCategory.P2P),
  listingType: z.enum(['buy', 'sell']),
  chainId: z.string().optional(), // Add chainId as optional
  tokenOffered: z
    .string()
    .min(1, 'Token is required')
    .refine(isValidToken, 'Invalid token'),
  amount: positiveNumberString,
  pricePerUnit: positiveNumberString.describe('Price per unit is required'),
  minAmount: optionalPositiveNumberString,
  maxAmount: optionalPositiveNumberString
})

// Domain-specific listing schema with cryptocurrency selection
export const createDomainListingSchema = z.object({
  listingCategory: z.literal(TradeCategory.DOMAIN),
  listingType: z.literal('sell'), // Domains are always for sale
  domainName: z
    .string()
    .min(1, 'Domain name is required')
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain name format'
    ),
  registrar: z.string().min(1, 'Registrar is required'),
  price: positiveNumberString.describe('Price is required'),
  tokenOffered: z.string().min(1, 'Cryptocurrency is required'),
  domainAge: optionalPositiveNumberString,
  expiryDate: z.string().optional(),
  monthlyTraffic: optionalPositiveNumberString,
  monthlyRevenue: optionalPositiveNumberString,
  description: z.string().max(1000).optional(),
  paymentWindow: z
    .number()
    .int()
    .min(5, 'Payment window must be at least 5 minutes')
    .max(1440, 'Payment window cannot exceed 24 hours')
    .optional()
    .default(30)
    .describe('Payment window in minutes')
})

// Export individual schema types
export type CreateP2PListingInput = z.infer<typeof createP2PListingSchema>
export type CreateDomainListingInput = z.infer<typeof createDomainListingSchema>

// Combined create listing schema using discriminated union
// First define the union without refinements
const baseCreateListingSchema = z.discriminatedUnion('listingCategory', [
  createP2PListingSchema,
  createDomainListingSchema
])

// Then add refinements at the top level
export const createListingSchema = baseCreateListingSchema.superRefine(
  (data, ctx) => {
    if (data.listingCategory === TradeCategory.P2P) {
      // P2P-specific validations
      if (data.minAmount && data.maxAmount) {
        if (parseFloat(data.minAmount) > parseFloat(data.maxAmount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Min amount must be less than or equal to max amount',
            path: ['minAmount']
          })
        }
      }

      if (data.minAmount && data.amount) {
        if (parseFloat(data.minAmount) > parseFloat(data.amount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Min amount must be less than or equal to total amount',
            path: ['minAmount']
          })
        }
      }

      if (data.maxAmount && data.amount) {
        if (parseFloat(data.maxAmount) > parseFloat(data.amount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Max amount must be less than or equal to total amount',
            path: ['maxAmount']
          })
        }
      }
    }
  }
)

export type CreateListingInput = z.infer<typeof createListingSchema>

// Update listing schema
export const updateListingSchema = z.object({
  amount: optionalPositiveNumberString,
  pricePerUnit: optionalPositiveNumberString,
  minAmount: optionalPositiveNumberString.nullable(),
  maxAmount: optionalPositiveNumberString.nullable(),
  paymentMethods: z
    .array(z.string())
    .optional()
    .refine(methods => {
      if (!methods) return true
      return methods.length > 0 && methods.every(isValidPaymentMethod)
    }, 'Invalid payment method'),
  paymentWindow: z
    .number()
    .int()
    .min(5, 'Payment window must be at least 5 minutes')
    .max(1440, 'Payment window cannot exceed 24 hours')
    .optional(),
  isActive: z.boolean().optional()
})

export type UpdateListingInput = z.infer<typeof updateListingSchema>

// Accept listing schema
export const acceptListingSchema = z.object({
  amount: positiveNumberString,
  paymentMethod: z
    .string()
    .min(1, 'Payment method is required')
    .refine(method => {
      // For domain listings, paymentMethod is actually a token (ETH, BTC, etc.)
      // For P2P listings, it's a payment method from PAYMENT_METHODS
      // Check if it's a valid payment method or token
      const isValid = isValidPaymentMethod(method) || isValidToken(method)
      if (!isValid) {
        console.error(`Invalid payment method/token: "${method}"`)
      }
      return isValid
    }, 'Invalid payment method or token'),
  chainId: z.number().int().positive('Chain ID is required')
})

export type AcceptListingInput = z.infer<typeof acceptListingSchema>

// Get listings query schema
export const getListingsQuerySchema = z.object({
  listingCategory: z.enum(['p2p', 'domain']).optional(),
  listingType: z.enum(['buy', 'sell']).optional(),
  tokenOffered: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  paymentMethod: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === 'true')
    .pipe(z.boolean().optional()),
  // Domain-specific filters
  domainName: z.string().optional(),
  registrar: z.string().optional(),
  // Pagination and sorting
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z
    .enum(['createdAt', 'pricePerUnit', 'amount', 'price'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

export type GetListingsQuery = z.infer<typeof getListingsQuerySchema>
