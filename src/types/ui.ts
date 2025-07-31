// Common UI Component Types

// Modal/Dialog Props
export interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children?: React.ReactNode
}

export interface ConfirmationModalProps extends BaseModalProps {
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

// Loading States
export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface AsyncState<T> extends LoadingState {
  data?: T | null
}

// User Display
export interface UserDisplayOptions {
  showEmail?: boolean
  showWallet?: boolean
  showAvatar?: boolean
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// Common Component Props
export interface WithClassName {
  className?: string
}

export interface WithChildren {
  children?: React.ReactNode
}

// Badge/Status Types
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'

export interface StatusConfig {
  label: string
  variant: BadgeVariant
  icon?: React.ComponentType<{ className?: string }>
}

// Table Cell Props
export interface CellProps<T = any> {
  value: T
  row?: any
  className?: string
}

// Action Props
export interface ActionButtonProps {
  label: string
  onClick: () => void | Promise<void>
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

// Toast/Notification Types
export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Search/Filter Props
export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export interface FilterOption {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

// Layout Props
export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

// Form Field Props
export interface FieldError {
  message: string
  type?: string
}

export interface FormFieldProps {
  label?: string
  description?: string
  error?: FieldError | string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  helperText?: string
}
