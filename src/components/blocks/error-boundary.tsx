'use client'

import { useRouter } from 'next/navigation'
import { Component, ErrorInfo, ReactNode } from 'react'

import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error }: { error?: Error }) {
  const router = useRouter()

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push(appRoutes.dashboard.base)
  }

  return (
    <div className='flex min-h-[400px] flex-col items-center justify-center p-8'>
      <div className='max-w-md text-center'>
        <AlertTriangle className='text-destructive mx-auto mb-4 h-12 w-12' />
        <h2 className='mb-2 text-2xl font-semibold'>Something went wrong</h2>
        <p className='text-muted-foreground mb-6'>
          {error?.message ||
            'An unexpected error occurred. Please try refreshing the page.'}
        </p>
        <div className='flex justify-center gap-3'>
          <Button onClick={handleRefresh} variant='outline'>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh Page
          </Button>
          <Button onClick={handleGoHome}>
            <Home className='mr-2 h-4 w-4' />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

// Hook for error handling
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo)
  }
}
