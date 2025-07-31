'use client'

import { UserPlus } from 'lucide-react'

import { type TeamInvitationWithDetails } from '@/types/database'

export function TeamInvitationCell({
  invitation
}: {
  invitation: TeamInvitationWithDetails
}) {
  return (
    <div className='flex items-center space-x-3'>
      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md'>
        <UserPlus className='h-5 w-5' />
      </div>
      <div>
        <p className='font-medium'>{invitation.team?.name || 'Unknown Team'}</p>
        <p className='text-muted-foreground text-sm'>
          Invited by{' '}
          {invitation.invitedBy?.name ||
            invitation.invitedBy?.email ||
            'Unknown'}
        </p>
      </div>
    </div>
  )
}
