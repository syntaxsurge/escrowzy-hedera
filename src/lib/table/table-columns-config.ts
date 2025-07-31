// This file contains column configurations that can be serialized and passed from server to client components
// The actual rendering logic is applied separately in the client component

export interface ColumnConfig {
  id?: string
  accessorKey?: string
  header: string
  enableSorting?: boolean
  enableHiding?: boolean
  enableColumnFilter?: boolean
  type:
    | 'select'
    | 'user'
    | 'date'
    | 'status'
    | 'role'
    | 'plan'
    | 'hash'
    | 'actions'
    | 'amount'
    | 'badge'
    | 'custom'
  config?: any
}

// User column config
export interface UserColumnConfig {
  header?: string
  accessorKey?: string
  showEmail?: boolean
  showWallet?: boolean
}

export function createUserColumnConfig(
  options: UserColumnConfig = {}
): ColumnConfig {
  const {
    header = 'User',
    accessorKey = 'user',
    showEmail = true,
    showWallet = true
  } = options

  return {
    accessorKey,
    header,
    type: 'user',
    config: { showEmail, showWallet }
  }
}

// Date column config
export interface DateColumnConfig {
  header?: string
  accessorKey: string
  format?: 'relative' | 'absolute' | 'date'
  enableSorting?: boolean
}

export function createDateColumnConfig(
  options: DateColumnConfig
): ColumnConfig {
  const {
    header = 'Date',
    accessorKey,
    format = 'relative',
    enableSorting = true
  } = options

  return {
    accessorKey,
    header,
    type: 'date',
    enableSorting,
    config: { format }
  }
}

// Status column config
export interface StatusConfigItem {
  value: string
  label?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  icon?: string
  className?: string
}

export interface StatusColumnConfig {
  header?: string
  accessorKey: string
  statuses: StatusConfigItem[]
}

export function createStatusColumnConfig(
  options: StatusColumnConfig
): ColumnConfig {
  const { header = 'Status', accessorKey, statuses } = options

  return {
    accessorKey,
    header,
    type: 'status',
    enableSorting: true,
    enableColumnFilter: true,
    config: { statuses }
  }
}

// Role column config
export function createRoleColumnConfig(accessorKey = 'role'): ColumnConfig {
  return createStatusColumnConfig({
    header: 'Role',
    accessorKey,
    statuses: [
      { value: 'owner', variant: 'default', icon: 'Crown' },
      { value: 'admin', variant: 'default', icon: 'Shield' },
      { value: 'member', variant: 'secondary', icon: 'User' },
      { value: 'user', variant: 'secondary', icon: 'User' }
    ]
  })
}

// Plan column config
export function createPlanColumnConfig(accessorKey = 'planId'): ColumnConfig {
  return {
    accessorKey,
    header: 'Plan',
    type: 'plan',
    enableSorting: true
  }
}

// Hash column config
export interface HashColumnConfig {
  header?: string
  accessorKey: string
  truncate?: boolean
}

export function createHashColumnConfig(
  options: HashColumnConfig
): ColumnConfig {
  const { header = 'Transaction', accessorKey, truncate = true } = options

  return {
    accessorKey,
    header,
    type: 'hash',
    enableSorting: true,
    config: { truncate }
  }
}

// Amount column config
export interface AmountColumnConfig {
  header?: string
  accessorKey?: string
}

export function createAmountColumnConfig(
  options: AmountColumnConfig = {}
): ColumnConfig {
  const { header = 'Amount', accessorKey = 'amount' } = options

  return {
    accessorKey,
    header,
    type: 'amount',
    enableSorting: true
  }
}

// Badge column config
export interface BadgeColumnConfig {
  header: string
  accessorKey: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  formatValue?: string // Name of the format function to use
  enableSorting?: boolean
}

export function createBadgeColumnConfig(
  options: BadgeColumnConfig
): ColumnConfig {
  const {
    header,
    accessorKey,
    variant = 'secondary',
    formatValue,
    enableSorting = true
  } = options

  return {
    accessorKey,
    header,
    type: 'badge',
    enableSorting,
    config: { variant, formatValue }
  }
}

// Payment status column config
export function createPaymentStatusColumnConfig(): ColumnConfig {
  return createStatusColumnConfig({
    header: 'Status',
    accessorKey: 'status',
    statuses: [
      { value: 'pending', variant: 'secondary', icon: 'Clock' },
      {
        value: 'confirmed',
        variant: 'default',
        icon: 'CheckCircle',
        className:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      },
      {
        value: 'completed',
        variant: 'default',
        icon: 'CheckCircle',
        className:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      },
      { value: 'failed', variant: 'destructive', icon: 'XCircle' }
    ]
  })
}

// Invitation status column config
export function createInvitationStatusColumnConfig(): ColumnConfig {
  return createStatusColumnConfig({
    header: 'Status',
    accessorKey: 'status',
    statuses: [
      { value: 'pending', variant: 'secondary', icon: 'Clock' },
      {
        value: 'accepted',
        variant: 'default',
        icon: 'CheckCircle',
        className:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      },
      { value: 'declined', variant: 'destructive', icon: 'XCircle' }
    ]
  })
}

// Select column config
export function createSelectColumnConfig(): ColumnConfig {
  return {
    id: 'select',
    type: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ''
  }
}

// Actions column config
export interface ActionsColumnConfig {
  header?: string
}

export function createActionsColumnConfig(
  options: ActionsColumnConfig = {}
): ColumnConfig {
  const { header = '' } = options

  return {
    id: 'actions',
    header,
    type: 'actions',
    enableSorting: false
  }
}
