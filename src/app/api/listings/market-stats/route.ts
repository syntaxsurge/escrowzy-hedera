import { apiResponses } from '@/lib/api/server-utils'
import { getMarketStats } from '@/services/listings'

export async function GET() {
  try {
    const stats = await getMarketStats()
    return apiResponses.success(stats)
  } catch (error) {
    console.error('Error fetching market stats:', error)
    return apiResponses.error('Failed to fetch market statistics')
  }
}
