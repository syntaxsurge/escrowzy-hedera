'use client'

import { useState, useEffect } from 'react'

import { Loader2, ChevronDown, MessageSquare } from 'lucide-react'

import { UserAvatar } from '@/components/blocks/user-avatar'
import { cn } from '@/lib'
import { getTeamMembersAction } from '@/lib/actions/team'

interface TeamMember {
  id: number
  name: string | null
  email: string | null
  walletAddress: string
  avatarPath: string | null
  role: string
  joinedAt: Date
}

interface TeamMembersListProps {
  teamId: number
  currentUserId: number
  onMemberClick: (userId: number) => void
}

export function TeamMembersList({
  teamId,
  currentUserId,
  onMemberClick
}: TeamMembersListProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (isExpanded && members.length === 0) {
      loadMembers()
    }
  }, [isExpanded])

  const loadMembers = async () => {
    setIsLoading(true)
    try {
      const result = await getTeamMembersAction(teamId, page, 10)
      if (page === 1) {
        setMembers(result.members)
      } else {
        setMembers(prev => [...prev, ...result.members])
      }
      setHasMore(result.hasMore)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Failed to load team members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className='ml-4'>
      <button
        onClick={handleToggle}
        className='hover:bg-muted/50 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
        Team Members
        {members.length > 0 && (
          <span className='text-muted-foreground text-xs'>
            ({members.length})
          </span>
        )}
      </button>

      {isExpanded && (
        <div className='mt-1 space-y-1'>
          {members.map(member => {
            return (
              <button
                key={member.id}
                onClick={() => onMemberClick(member.id)}
                className='hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors'
                disabled={member.id === currentUserId}
              >
                <UserAvatar
                  user={member}
                  walletAddress={member.walletAddress}
                  size='sm'
                  fallbackClassName='text-xs'
                />
                <div className='flex-1 text-left'>
                  <p className='text-sm'>
                    {member.name ||
                      `${member.walletAddress.slice(0, 6)}...${member.walletAddress.slice(-4)}`}
                  </p>
                  <p className='text-muted-foreground text-xs'>{member.role}</p>
                </div>
                {member.id !== currentUserId && (
                  <MessageSquare className='text-muted-foreground hover:text-primary h-4 w-4 transition-colors' />
                )}
              </button>
            )
          })}

          {isLoading && (
            <div className='flex items-center justify-center py-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
            </div>
          )}

          {hasMore && !isLoading && (
            <button
              onClick={loadMembers}
              className='text-primary hover:text-primary/80 w-full py-2 text-center text-xs font-medium'
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
