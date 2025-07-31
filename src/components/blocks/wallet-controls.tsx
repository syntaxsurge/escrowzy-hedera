import { ChevronDown, Wallet } from 'lucide-react'

import { truncateAddress } from '@/lib'

// Centralized disconnect button UI
export function DisconnectButton({
  onClick,
  className = ''
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-0 px-4 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 dark:focus:bg-red-900/30 dark:focus:text-red-300 ${className}`}
    >
      <div className='flex items-center'>
        <div className='mr-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-2'>
          <svg
            className='h-4 w-4 text-white'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
            />
          </svg>
        </div>
        <span>Disconnect Wallet</span>
      </div>
    </div>
  )
}

// Centralized wallet address display button
export function WalletAddressButton({
  address,
  onClick,
  className = ''
}: {
  address: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg bg-gray-50/70 p-3 text-left transition-colors hover:bg-gray-100/70 dark:bg-gray-800/70 dark:hover:bg-gray-700/70 ${className}`}
    >
      <div className='h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1'>
        <Wallet className='h-4 w-4 text-white' />
      </div>
      <code className='flex-1 truncate font-mono text-sm font-medium text-gray-800 dark:text-gray-200'>
        {truncateAddress(address)}
      </code>
      <div className='flex items-center text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100'>
        <ChevronDown className='h-4 w-4' />
      </div>
    </button>
  )
}

// Centralized network display button
export function NetworkButton({
  chainName,
  chainIcon,
  onClick,
  isUnsupported = false,
  className = ''
}: {
  chainName: string
  chainIcon?: React.ReactNode
  onClick: () => void
  isUnsupported?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg bg-gray-50/70 p-3 text-left transition-colors hover:bg-gray-100/70 dark:bg-gray-800/70 dark:hover:bg-gray-700/70 ${className}`}
    >
      {chainIcon}
      <span className='flex-1 text-sm font-medium text-gray-800 dark:text-gray-200'>
        {chainName}
      </span>
      {isUnsupported && (
        <span className='rounded-full bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400'>
          Unsupported
        </span>
      )}
      <div className='flex items-center text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100'>
        <ChevronDown className='h-4 w-4' />
      </div>
    </button>
  )
}

// Centralized section header
export function WalletSectionHeader({
  icon,
  label
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className='mb-2 flex items-center gap-2'>
      <div className='text-gray-500 dark:text-gray-400'>{icon}</div>
      <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
        {label}
      </span>
    </div>
  )
}
