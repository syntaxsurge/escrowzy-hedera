import { useState, useCallback } from 'react'

interface UseDialogStateReturn<T = any> {
  isOpen: boolean
  data: T | null
  open: (data?: T) => void
  close: () => void
  toggle: () => void
  setData: (data: T | null) => void
}

export function useDialogState<T = any>(
  initialState = false,
  initialData: T | null = null
): UseDialogStateReturn<T> {
  const [isOpen, setIsOpen] = useState(initialState)
  const [data, setData] = useState<T | null>(initialData)

  const open = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Optionally clear data on close
    // setData(null)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData
  }
}
