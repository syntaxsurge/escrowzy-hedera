'use client'

import { useState, useCallback } from 'react'

import { useToast } from '@/hooks/use-toast'

interface FeeCalculationResult {
  feePercentage: number
  feeAmount: number
  netAmount: number
  chainId: number
  userAddress: string
}

interface FeeValidationResult {
  isValid: boolean
  correctFee?: {
    feePercentage: number
    feeAmount: number
    netAmount: number
  }
  providedFee?: number
}

interface UserFeeInfo {
  userFeePercentage: number
  planFeeTiers: Record<number, number>
  chainId: number
  userAddress: string
}

/**
 * Hook for secure server-side fee calculation and validation
 * This ensures fees cannot be tampered with on the client side
 */
export function useSecureFee() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [feeInfo, setFeeInfo] = useState<UserFeeInfo | null>(null)

  /**
   * Calculate fee securely on the server
   */
  const calculateFee = useCallback(
    async (
      amount: string | number,
      chainId: number,
      userAddress?: string
    ): Promise<FeeCalculationResult | null> => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/trades/calculate-fee', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount,
            chainId,
            userAddress
          })
        })

        const data = await response.json()

        if (!data.success) {
          toast({
            title: 'Fee Calculation Error',
            description: data.error || 'Failed to calculate fee',
            variant: 'destructive'
          })
          return null
        }

        return {
          feePercentage: data.feePercentage,
          feeAmount: data.feeAmount,
          netAmount: data.netAmount,
          chainId: data.chainId,
          userAddress: data.userAddress
        }
      } catch (error) {
        console.error('Error calculating fee:', error)
        toast({
          title: 'Error',
          description: 'Failed to calculate fee. Please try again.',
          variant: 'destructive'
        })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Validate a client-calculated fee against the server
   */
  const validateFee = useCallback(
    async (
      amount: string | number,
      chainId: number,
      clientFee: number,
      userAddress?: string
    ): Promise<FeeValidationResult | null> => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/trades/validate-fee', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount,
            chainId,
            clientFee,
            userAddress
          })
        })

        const data = await response.json()

        if (!data.success && !data.isValid) {
          // Fee is invalid, return the correct fee
          return {
            isValid: false,
            correctFee: data.correctFee,
            providedFee: data.providedFee
          }
        }

        if (data.success && data.isValid) {
          return {
            isValid: true
          }
        }

        return null
      } catch (error) {
        console.error('Error validating fee:', error)
        toast({
          title: 'Error',
          description: 'Failed to validate fee. Please try again.',
          variant: 'destructive'
        })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Get user's fee information and all plan tiers
   */
  const getUserFeeInfo = useCallback(
    async (chainId: number): Promise<UserFeeInfo | null> => {
      try {
        setIsLoading(true)

        const response = await fetch(
          `/api/trades/calculate-fee?chainId=${chainId}`
        )

        const data = await response.json()

        if (!data.success) {
          toast({
            title: 'Error',
            description: data.error || 'Failed to fetch fee information',
            variant: 'destructive'
          })
          return null
        }

        const info: UserFeeInfo = {
          userFeePercentage: data.userFeePercentage,
          planFeeTiers: data.planFeeTiers,
          chainId: data.chainId,
          userAddress: data.userAddress
        }

        setFeeInfo(info)
        return info
      } catch (error) {
        console.error('Error fetching fee info:', error)
        toast({
          title: 'Error',
          description: 'Failed to fetch fee information. Please try again.',
          variant: 'destructive'
        })
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Format fee percentage for display
   */
  const formatFeePercentage = useCallback((percentage: number): string => {
    return `${percentage.toFixed(1)}%`
  }, [])

  /**
   * Calculate and format fee amount for display
   */
  const getFormattedFee = useCallback(
    async (
      amount: string | number,
      chainId: number,
      userAddress?: string
    ): Promise<{ fee: string; net: string; percentage: string } | null> => {
      const result = await calculateFee(amount, chainId, userAddress)

      if (!result) {
        return null
      }

      return {
        fee: result.feeAmount.toFixed(6),
        net: result.netAmount.toFixed(6),
        percentage: formatFeePercentage(result.feePercentage)
      }
    },
    [calculateFee, formatFeePercentage]
  )

  return {
    calculateFee,
    validateFee,
    getUserFeeInfo,
    getFormattedFee,
    formatFeePercentage,
    feeInfo,
    isLoading
  }
}
