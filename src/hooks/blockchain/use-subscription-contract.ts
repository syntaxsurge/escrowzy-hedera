'use client'

import { useState, useCallback, useEffect } from 'react'

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi'

import { useBlockchain } from '@/context'
import { useToast } from '@/hooks/use-toast'
import {
  getSubscriptionManagerAddress,
  SUBSCRIPTION_MANAGER_ABI
} from '@/lib/blockchain'

export interface SubscriptionPlan {
  planKey: number
  name: string
  displayName: string
  description: string
  priceWei: bigint
  maxMembers: bigint
  features: string[]
  isActive: boolean
  sortOrder: bigint
  isTeamPlan: boolean
  feeTierBasisPoints: bigint
}

/**
 * Hook to interact with the SubscriptionManager contract
 */
export function useSubscriptionContract() {
  const { chainId, address } = useBlockchain()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Get contract address for current chain
  const contractAddress = chainId
    ? getSubscriptionManagerAddress(chainId)
    : undefined

  // Read user's fee tier
  const { data: userFeeTier, refetch: refetchUserFeeTier } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: 'getUserFeeTier',
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address
    }
  })

  // Read user's active subscription plan
  const { data: activePlanKey, refetch: refetchActivePlan } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: 'getActiveSubscriptionPlan',
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address
    }
  })

  // Read specific plan details
  const usePlanDetails = (planKey: number) => {
    return useReadContract({
      address: contractAddress as `0x${string}` | undefined,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: 'getPlan',
      args: [planKey],
      query: {
        enabled: !!contractAddress && planKey >= 0
      }
    })
  }

  // Read all active plans
  const { data: allPlans } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: 'getAllActivePlans',
    query: {
      enabled: !!contractAddress
    }
  })

  // Write contract functions
  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash
  })

  /**
   * Get user's fee percentage from contract
   */
  const getUserFeePercentage = useCallback((): number => {
    // Must have fee tier from contract, no defaults
    if (userFeeTier === undefined || userFeeTier === null) {
      throw new Error(
        'Unable to fetch fee tier from contract. Please ensure you are connected to the blockchain.'
      )
    }

    // Convert basis points to percentage (e.g., 250 -> 2.5)
    const basisPoints = Number(userFeeTier)
    return basisPoints / 100
  }, [userFeeTier])

  /**
   * Get fee tier for a specific plan
   */
  const getPlanFeeTier = useCallback((plan: SubscriptionPlan): number => {
    if (!plan?.feeTierBasisPoints) {
      throw new Error(
        'Plan fee tier not available. Please ensure the plan data is loaded from the contract.'
      )
    }

    // Convert basis points to percentage
    const basisPoints = Number(plan.feeTierBasisPoints)
    return basisPoints / 100
  }, [])

  /**
   * Format fee tier for display
   */
  const formatFeeTier = useCallback((basisPoints: bigint | number): string => {
    const points =
      typeof basisPoints === 'bigint' ? Number(basisPoints) : basisPoints
    return `${(points / 100).toFixed(1)}%`
  }, [])

  /**
   * Calculate fee amount based on user's tier
   */
  const calculateFeeAmount = useCallback(
    (amount: string | number): number => {
      const feePercentage = getUserFeePercentage()
      const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
      return amountNum * (feePercentage / 100)
    },
    [getUserFeePercentage]
  )

  /**
   * Update plan with new fee tier (admin only)
   */
  const updatePlanFeeTier = useCallback(
    async (
      planKey: number,
      name: string,
      displayName: string,
      description: string,
      priceWei: bigint,
      maxMembers: bigint,
      features: string[],
      isActive: boolean,
      sortOrder: bigint,
      isTeamPlan: boolean,
      feeTierBasisPoints: bigint
    ) => {
      if (!contractAddress) {
        toast({
          title: 'Error',
          description: 'Subscription contract not found on this network',
          variant: 'destructive'
        })
        return
      }

      try {
        setIsLoading(true)

        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: SUBSCRIPTION_MANAGER_ABI,
          functionName: 'updatePlan',
          args: [
            planKey,
            name,
            displayName,
            description,
            priceWei,
            maxMembers,
            features,
            isActive,
            sortOrder,
            isTeamPlan,
            feeTierBasisPoints
          ]
        })

        toast({
          title: 'Transaction Submitted',
          description: 'Updating plan fee tier...'
        })
      } catch (error) {
        console.error('Failed to update plan:', error)
        toast({
          title: 'Transaction Failed',
          description:
            error instanceof Error ? error.message : 'Failed to update plan',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    },
    [contractAddress, writeContract, toast]
  )

  // Refetch data when transaction is confirmed
  useEffect(() => {
    if (isSuccess) {
      refetchUserFeeTier()
      refetchActivePlan()
      toast({
        title: 'Success',
        description: 'Plan updated successfully'
      })
    }
  }, [isSuccess, refetchUserFeeTier, refetchActivePlan, toast])

  return {
    // Data
    userFeeTier,
    activePlanKey,
    allPlans: allPlans as SubscriptionPlan[] | undefined,

    // Functions
    getUserFeePercentage,
    getPlanFeeTier,
    formatFeeTier,
    calculateFeeAmount,
    updatePlanFeeTier,
    usePlanDetails,

    // Loading states
    isLoading: isLoading || isConfirming,

    // Refetch functions
    refetchUserFeeTier,
    refetchActivePlan
  }
}

/**
 * Hook to get fee information from EscrowCore contract
 */
export function useEscrowFees() {
  const { chainId, address } = useBlockchain()

  // Import EscrowCore ABI and address
  const { getEscrowCoreAddress, ESCROW_CORE_ABI } = require('@/lib/blockchain')
  const contractAddress = chainId ? getEscrowCoreAddress(chainId) : undefined

  // Read user's fee percentage from EscrowCore
  const { data: userFeePercentage } = useReadContract({
    address: contractAddress,
    abi: ESCROW_CORE_ABI,
    functionName: 'getUserFeePercentage',
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address
    }
  })

  /**
   * Calculate fee for a specific amount by directly calling the contract
   */
  const calculateFee = useCallback(
    async (amount: string | bigint) => {
      if (!contractAddress || !address) {
        throw new Error(
          'Cannot calculate fee without contract address and user address'
        )
      }

      const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount

      try {
        // Use dynamic import to get the public client
        const { getPublicClient } = await import(
          '@/lib/blockchain/blockchain-transaction'
        )
        const publicClient = getPublicClient(chainId || 1)

        if (!publicClient) {
          throw new Error('Unable to connect to blockchain')
        }

        // Directly read from the contract
        const fee = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ESCROW_CORE_ABI,
          functionName: 'calculateUserFee',
          args: [address, amountBigInt]
        })

        return fee as bigint
      } catch (error) {
        console.error('Failed to calculate fee from contract:', error)
        throw new Error(
          'Unable to calculate fee from contract. Please ensure you are connected to the blockchain.'
        )
      }
    },
    [contractAddress, address, chainId]
  )

  /**
   * Get fee percentage as a number
   */
  const getFeePercentage = useCallback((): number => {
    if (userFeePercentage === undefined || userFeePercentage === null) {
      throw new Error(
        'Unable to fetch user fee percentage from contract. Please ensure you are connected to the blockchain.'
      )
    }

    // Convert basis points to percentage
    const basisPoints = Number(userFeePercentage)
    return basisPoints / 100
  }, [userFeePercentage])

  return {
    userFeePercentage,
    getFeePercentage,
    calculateFee
  }
}
