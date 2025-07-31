import type { useToast } from '@/hooks/use-toast'

type ToastFunction = ReturnType<typeof useToast>['toast']

/**
 * Standard form error handler with toast notification
 */
export function handleFormError(
  error: unknown,
  toast: ToastFunction,
  customMessage?: string
) {
  console.error('Form error:', error)

  const message =
    customMessage ||
    (error instanceof Error ? error.message : 'An unexpected error occurred')

  toast({
    title: 'Error',
    description: message,
    variant: 'destructive'
  })
}

/**
 * Standard form success handler with toast notification
 */
export function handleFormSuccess(
  toast: ToastFunction,
  message: string,
  title: string = 'Success'
) {
  toast({
    title,
    description: message,
    variant: 'default'
  })
}

/**
 * Validate amount within min/max bounds
 */
export function validateAmountBounds(
  amount: number,
  min?: number | string | null,
  max?: number | string | null,
  tokenSymbol?: string
): string | null {
  const minNum = min ? parseFloat(min.toString()) : null
  const maxNum = max ? parseFloat(max.toString()) : null
  const suffix = tokenSymbol ? ` ${tokenSymbol}` : ''

  if (minNum !== null && amount < minNum) {
    return `Minimum amount is ${minNum}${suffix}`
  }

  if (maxNum !== null && amount > maxNum) {
    return `Maximum amount is ${maxNum}${suffix}`
  }

  return null
}

/**
 * Parse and validate a numeric input
 */
export function parseNumericInput(value: string): number | null {
  const num = parseFloat(value)
  return isNaN(num) || num <= 0 ? null : num
}

/**
 * Check if form data has actually changed from original values
 */
export function hasFormChanged<T extends Record<string, any>>(
  current: T,
  original: T,
  keys?: (keyof T)[]
): boolean {
  const keysToCheck = keys || (Object.keys(current) as (keyof T)[])

  return keysToCheck.some(key => {
    const currentVal = current[key]
    const originalVal = original[key]

    // Handle arrays
    if (Array.isArray(currentVal) && Array.isArray(originalVal)) {
      return JSON.stringify(currentVal) !== JSON.stringify(originalVal)
    }

    // Handle objects
    if (typeof currentVal === 'object' && typeof originalVal === 'object') {
      return JSON.stringify(currentVal) !== JSON.stringify(originalVal)
    }

    // Handle primitives
    return currentVal !== originalVal
  })
}
