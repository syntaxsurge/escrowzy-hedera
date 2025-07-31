import { ModernSection } from '@/components/layout/modern-layout'

interface TableSkeletonProps {
  rows?: number
  showSection?: boolean
  variant?: 'default' | 'simple'
}

export function TableSkeleton({
  rows = 5,
  showSection = true,
  variant = 'default'
}: TableSkeletonProps = {}) {
  const content = (
    <>
      {variant === 'default' ? (
        <div className='space-y-4'>
          <div className='flex gap-4'>
            <div className='bg-muted h-10 flex-1 animate-pulse rounded-lg' />
            <div className='bg-muted h-10 w-32 animate-pulse rounded-lg' />
          </div>
          <div className='border-border rounded-lg border'>
            <div className='bg-muted h-12 animate-pulse' />
            {[...Array(rows)].map((_, i) => (
              <div key={i} className='border-border border-t p-4'>
                <div className='bg-muted h-8 animate-pulse rounded' />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='bg-muted h-8 w-64 animate-pulse rounded' />
            <div className='bg-muted h-8 w-32 animate-pulse rounded' />
          </div>
          <div className='bg-muted h-96 w-full animate-pulse rounded' />
        </div>
      )}
    </>
  )

  if (showSection) {
    return <ModernSection>{content}</ModernSection>
  }

  return content
}
