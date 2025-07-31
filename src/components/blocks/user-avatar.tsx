import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib'
import type { User } from '@/lib/db/schema'
import { getUserAvatar, getUserInitials } from '@/lib/utils/user'

interface UserAvatarProps {
  user: Partial<User> | null | undefined
  walletAddress?: string | null
  className?: string
  fallbackClassName?: string
  showBorder?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'h-20 w-20'
}

const fontSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

export function UserAvatar({
  user,
  walletAddress,
  className,
  fallbackClassName,
  showBorder = false,
  size = 'sm'
}: UserAvatarProps) {
  const initials = getUserInitials({
    name: user?.name,
    email: user?.email,
    walletAddress: walletAddress || user?.walletAddress
  })
  const avatarUrl = getUserAvatar(user)

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        showBorder && 'border-2 border-white shadow-lg dark:border-gray-700',
        className
      )}
    >
      <AvatarImage src={avatarUrl} alt={user?.name || ''} />
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white',
          fontSizeClasses[size],
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
