import { NextResponse } from 'next/server'

import { getDisputesWithPagination } from '@/lib/db/queries/admin-disputes'
import { parseTableQueryParams } from '@/lib/table/table'
import { checkAdminRole } from '@/services/user'

export async function GET(request: Request) {
  try {
    const isAdmin = await checkAdminRole()
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tableRequest = parseTableQueryParams(searchParams)
    const response = await getDisputesWithPagination(tableRequest)

    return NextResponse.json({
      success: true,
      ...response
    })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disputes' },
      { status: 500 }
    )
  }
}
