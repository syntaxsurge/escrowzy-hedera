import { cn } from '@/lib'

interface ModernLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  headerActions?: React.ReactNode
  addPadding?: boolean
  centerText?: boolean
}

export function ModernLayout({
  title,
  description,
  children,
  className,
  headerActions,
  addPadding = false,
  centerText = false
}: ModernLayoutProps) {
  return (
    <div
      className={cn(
        'space-y-8',
        addPadding && 'px-4 py-8 sm:px-6 lg:px-8',
        className
      )}
    >
      {/* Modern Header */}
      <div
        className={cn(
          'flex items-center',
          centerText ? 'justify-center' : 'justify-between'
        )}
      >
        <div className={cn('space-y-1', centerText && 'text-center')}>
          <h1 className='text-foreground text-3xl font-bold tracking-tight'>
            {title}
          </h1>
          {description && (
            <p className='text-muted-foreground text-lg'>{description}</p>
          )}
        </div>
        {headerActions && !centerText && (
          <div className='flex items-center gap-3'>{headerActions}</div>
        )}
      </div>

      {/* Content */}
      <div className='space-y-6'>{children}</div>
    </div>
  )
}

interface ModernSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'gradient'
}

export function ModernSection({
  title,
  description,
  children,
  className,
  variant = 'default'
}: ModernSectionProps) {
  const variants = {
    default:
      'rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6',
    glass:
      'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg',
    gradient:
      'rounded-2xl bg-gradient-to-br from-background/50 via-card/50 to-muted/30 border border-border/40 p-6 shadow-lg'
  }

  return (
    <div className={cn(variants[variant], className)}>
      {(title || description) && (
        <div className='mb-6 space-y-2'>
          {title && (
            <h2 className='text-foreground text-xl font-semibold'>{title}</h2>
          )}
          {description && (
            <p className='text-muted-foreground text-sm'>{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

interface ModernGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function ModernGrid({
  children,
  columns = 2,
  className
}: ModernGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn('grid gap-6', gridCols[columns], className)}>
      {children}
    </div>
  )
}
