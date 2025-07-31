import React from 'react'

import { User, Mail, Wallet } from 'lucide-react'

import { truncateAddress } from '@/lib'

interface UserCellProps {
  name?: string | null
  email?: string | null
  walletAddress?: string | null
}

export function UserCell({ name, email, walletAddress }: UserCellProps) {
  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-1.5'>
        <User className='text-muted-foreground h-3 w-3' />
        <span className='font-medium'>{name || '-'}</span>
      </div>
      <div className='text-muted-foreground flex items-center gap-1.5 text-sm'>
        <Mail className='h-3 w-3' />
        <span>{email || '-'}</span>
      </div>
      <div className='text-muted-foreground flex items-center gap-1.5 text-sm'>
        <Wallet className='h-3 w-3' />
        {walletAddress ? (
          <span className='font-mono'>{truncateAddress(walletAddress)}</span>
        ) : (
          <span>-</span>
        )}
      </div>
    </div>
  )
}
