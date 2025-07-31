import { NextResponse } from 'next/server'

import { getCurrentUserAction } from '@/lib/actions/user'
import { getUserQuests } from '@/lib/db/queries/quests'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    // Fetch real quest data from database
    const quests = await getUserQuests(user.id, category)

    return NextResponse.json(quests)
  } catch (error) {
    console.error('Failed to fetch quest progress:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch quest progress',
        success: false
      },
      { status: 500 }
    )
  }
}
