import { useState, useCallback, ReactNode } from 'react'

import { Loader2 } from 'lucide-react'

interface UseLoadingOptions {
  initialState?: boolean
  defaultText?: string
  loadingText?: string
  icon?: ReactNode
  withButton?: boolean
}

interface UseLoadingReturn {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  execute: <T>(asyncFn: (() => Promise<T>) | Promise<T>) => Promise<T>
  buttonContent?: ReactNode
}

export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const {
    initialState = false,
    defaultText,
    loadingText = 'Loading',
    icon,
    withButton = false
  } = options

  const [isLoading, setIsLoading] = useState(initialState)

  const execute = useCallback(
    async <T,>(asyncFn: (() => Promise<T>) | Promise<T>): Promise<T> => {
      setIsLoading(true)
      try {
        if (typeof asyncFn === 'function') {
          return await asyncFn()
        }
        return await asyncFn
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const result: UseLoadingReturn = {
    isLoading,
    setIsLoading,
    execute
  }

  if (withButton && defaultText) {
    result.buttonContent = isLoading ? (
      <>
        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        {loadingText}
      </>
    ) : (
      <>
        {icon && <span className='mr-2'>{icon}</span>}
        {defaultText}
      </>
    )
  }

  return result
}
