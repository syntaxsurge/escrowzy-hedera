import { NextResponse } from 'next/server'

import { getCurrentUserAction } from '@/lib/actions/user'
import { claimQuestReward } from '@/lib/db/queries/quests'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const user = await getCurrentUserAction()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { questId } = await params

    if (!questId) {
      return NextResponse.json(
        { error: 'Quest ID is required' },
        { status: 400 }
      )
    }

    // Claim the quest reward with real database implementation
    const result = await claimQuestReward(user.id, questId)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          success: false
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        questId,
        xpEarned: result.xpEarned,
        message: result.message
      }
    })
  } catch (error) {
    console.error('Failed to claim quest reward:', error)
    return NextResponse.json(
      {
        error: 'Failed to claim quest reward',
        success: false
      },
      { status: 500 }
    )
  }
}
