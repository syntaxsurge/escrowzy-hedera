'use client'

import { UserAvatar } from '@/components/blocks/user-avatar'

interface TypingIndicatorProps {
  userName?: string | null
  avatarUrl?: string | null
}

export function TypingIndicator({ userName, avatarUrl }: TypingIndicatorProps) {
  return (
    <div className='flex items-start gap-3'>
      <UserAvatar user={{ name: userName, avatarPath: avatarUrl }} size='sm' />
      <div className='bg-muted rounded-lg px-3 py-2'>
        <div className='flex items-center gap-1'>
          <span className='text-muted-foreground text-sm'>
            {userName || 'User'} is typing
          </span>
          <div className='flex gap-1'>
            <span className='bg-foreground/40 inline-block h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]'></span>
            <span className='bg-foreground/40 inline-block h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]'></span>
            <span className='bg-foreground/40 inline-block h-1.5 w-1.5 animate-bounce rounded-full'></span>
          </div>
        </div>
      </div>
    </div>
  )
}
