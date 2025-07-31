import { Spinner } from '@/components/ui/spinner'

export function ChatLoading() {
  return (
    <div className='flex h-[calc(100vh-4rem)]'>
      <div className='bg-muted/10 w-64 border-r p-4'>
        <div className='bg-muted mb-4 h-8 w-32 animate-pulse rounded' />
        <div className='space-y-3'>
          <div className='bg-muted h-12 w-full animate-pulse rounded' />
          <div className='bg-muted h-12 w-full animate-pulse rounded' />
          <div className='bg-muted h-12 w-full animate-pulse rounded' />
        </div>
      </div>
      <div className='flex flex-1 items-center justify-center'>
        <div className='text-center'>
          <Spinner className='mx-auto mb-4 h-12 w-12' />
          <p className='text-muted-foreground'>Loading chat...</p>
        </div>
      </div>
    </div>
  )
}
