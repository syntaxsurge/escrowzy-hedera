import { NextRequest } from 'next/server'

import { ethers } from 'ethers'

import { apiResponses } from '@/lib/api/server-utils'
import { getSession } from '@/lib/auth/session'
import { isSupportedChainId } from '@/lib/blockchain'
import {
  createContractPlanService,
  type CreatePlanParams
} from '@/services/blockchain/contract-plan'

// POST /api/admin/contract-transactions - Prepare transaction data for wallet signing
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return apiResponses.unauthorized()
    }

    const body = await request.json()
    const { action, chainId, ...params } = body

    if (!chainId || !isSupportedChainId(chainId)) {
      return apiResponses.error(
        `Unsupported or invalid chain ID: ${chainId}. Please connect to a supported network.`,
        400
      )
    }

    const contractService = createContractPlanService(chainId)

    if (!contractService) {
      return apiResponses.error(
        `Contract not configured for chain ${chainId}. Please check your environment configuration.`,
        400
      )
    }

    const contractInfo = await contractService.getContractInfo()

    switch (action) {
      case 'createPlan': {
        const {
          name,
          displayName,
          description,
          priceUSD,
          maxMembers,
          features,
          isActive = true,
          sortOrder = 0,
          isTeamPlan = false
        } = params as Omit<CreatePlanParams, 'planKey'>

        // Validate required fields
        if (
          !name ||
          !displayName ||
          priceUSD === undefined ||
          maxMembers === undefined ||
          !features
        ) {
          return apiResponses.validationError(
            [
              'name',
              'displayName',
              'priceUSD',
              'maxMembers',
              'features'
            ].filter(field => {
              const values: Record<string, any> = {
                name,
                displayName,
                priceUSD,
                maxMembers,
                features
              }
              return (
                values[field] === undefined ||
                values[field] === null ||
                values[field] === ''
              )
            })
          )
        }

        // Validate features array
        if (!Array.isArray(features) || features.length === 0) {
          return apiResponses.error('Features must be a non-empty array', 400)
        }

        // Validate price
        if (typeof priceUSD !== 'number' || priceUSD < 0) {
          return apiResponses.error(
            'Price must be a valid positive number',
            400
          )
        }

        // Validate maxMembers
        if (
          !Number.isInteger(maxMembers) ||
          (maxMembers < 1 && maxMembers !== -1)
        ) {
          return apiResponses.error(
            'Max members must be a positive integer or -1 for unlimited',
            400
          )
        }

        // Get next available plan key
        const planKey = await contractService.getNextAvailablePlanKey()

        // Convert USD to wei
        const priceWei = await contractService.convertUSDToWei(priceUSD)

        // Prepare transaction data
        const iface = new ethers.Interface(contractInfo.abi)
        const data = iface.encodeFunctionData('createPlan', [
          planKey,
          name,
          displayName,
          description,
          priceWei,
          maxMembers === -1 ? ethers.MaxUint256 : maxMembers,
          features,
          isActive,
          sortOrder,
          isTeamPlan
        ])

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey,
          priceWei: priceWei.toString(),
          contractInfo
        })
      }

      case 'updatePlan': {
        const {
          planKey,
          name,
          displayName,
          description,
          priceUSD,
          maxMembers,
          features,
          isActive = true,
          sortOrder = 0,
          isTeamPlan = false
        } = params

        // Validate required fields
        if (
          planKey === undefined ||
          !name ||
          !displayName ||
          priceUSD === undefined ||
          maxMembers === undefined ||
          !features
        ) {
          return apiResponses.validationError(
            [
              'planKey',
              'name',
              'displayName',
              'priceUSD',
              'maxMembers',
              'features'
            ].filter(field => {
              const values: Record<string, any> = {
                planKey,
                name,
                displayName,
                priceUSD,
                maxMembers,
                features
              }
              return (
                values[field] === undefined ||
                values[field] === null ||
                values[field] === ''
              )
            })
          )
        }

        // Convert USD to wei
        const priceWei = await contractService.convertUSDToWei(priceUSD)

        // Prepare transaction data
        const iface = new ethers.Interface(contractInfo.abi)
        const data = iface.encodeFunctionData('updatePlan', [
          planKey,
          name,
          displayName,
          description,
          priceWei,
          maxMembers === -1 ? ethers.MaxUint256 : maxMembers,
          features,
          isActive,
          sortOrder,
          isTeamPlan
        ])

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey,
          priceWei: priceWei.toString(),
          contractInfo
        })
      }

      case 'deletePlan': {
        const { planKey } = params

        if (planKey === undefined) {
          return apiResponses.validationError(['planKey'])
        }

        // Prepare transaction data
        const iface = new ethers.Interface(contractInfo.abi)
        const data = iface.encodeFunctionData('deletePlan', [planKey])

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey,
          contractInfo
        })
      }

      case 'withdrawEarnings': {
        const { to, amountNative } = params

        if (!to || !amountNative) {
          return apiResponses.validationError(
            ['to', 'amountNative'].filter(field => !{ to, amountNative }[field])
          )
        }

        // Convert native amount to wei
        const amountWei = ethers.parseEther(amountNative.toString())

        // Prepare transaction data
        const iface = new ethers.Interface(contractInfo.abi)
        const data = iface.encodeFunctionData('withdrawEarnings', [
          to,
          amountWei
        ])

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          amountWei: amountWei.toString(),
          contractInfo
        })
      }

      case 'setPlanPrice': {
        const { planKey, priceUSD } = params

        if (planKey === undefined || priceUSD === undefined) {
          return apiResponses.validationError(['planKey', 'priceUSD'])
        }

        // Validate price
        if (typeof priceUSD !== 'number' || priceUSD < 0) {
          return apiResponses.error(
            'Price must be a valid positive number',
            400
          )
        }

        // Convert USD to wei
        const priceWei = await contractService.convertUSDToWei(priceUSD)

        // Prepare transaction data
        const iface = new ethers.Interface(contractInfo.abi)
        const data = iface.encodeFunctionData('setPlanPrice', [
          planKey,
          priceWei
        ])

        return apiResponses.success({
          transactionData: {
            to: contractInfo.address,
            data,
            value: '0x0'
          },
          planKey,
          priceWei: priceWei.toString(),
          contractInfo
        })
      }

      default:
        return apiResponses.error(`Unsupported action: ${action}`, 400)
    }
  } catch (error) {
    return apiResponses.handleError(error, 'Failed to prepare transaction data')
  }
}
