'use client'

import React, { ReactNode } from 'react'

import { createRoot } from 'react-dom/client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib'

interface ModalConfirmOptions {
  title?: string | ReactNode
  description?: string | ReactNode
  confirmText?: string | ReactNode
  cancelText?: string | ReactNode
  confirmButtonVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  cancelButtonVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  content?: ReactNode
  confirmationInput?: {
    label?: string
    placeholder?: string
    requiredValue: string
    caseSensitive?: boolean
  }
  showCancel?: boolean
  disableConfirmButton?: boolean
  contentClassName?: string
  headerClassName?: string
  footerClassName?: string
  scrollable?: boolean
  maxWidth?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | 'full'
  onOpenChange?: (open: boolean) => void
  asyncAction?: boolean
  loadingText?: string
  confirmIcon?: ReactNode
  cancelIcon?: ReactNode
  useDialog?: boolean
  showCloseButton?: boolean
  showFooter?: boolean
  customFooter?: ReactNode
  hideDefaultButtons?: boolean
  bodyClassName?: string
}

interface ModalConfirmComponentProps extends ModalConfirmOptions {
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
}

const ModalConfirmComponent: React.FC<ModalConfirmComponentProps> = ({
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonVariant = 'destructive',
  cancelButtonVariant: _cancelButtonVariant = 'outline',
  content,
  confirmationInput,
  showCancel = true,
  disableConfirmButton = false,
  contentClassName,
  headerClassName,
  footerClassName,
  scrollable = false,
  maxWidth = 'lg',
  onOpenChange,
  asyncAction = false,
  loadingText = 'Processing...',
  confirmIcon,
  cancelIcon,
  useDialog = false,
  showCloseButton = true,
  showFooter = true,
  customFooter,
  hideDefaultButtons = false,
  bodyClassName,
  onConfirm,
  onCancel
}) => {
  const [open, setOpen] = React.useState(true)
  const [confirmationValue, setConfirmationValue] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isClicked, setIsClicked] = React.useState(false)

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setIsLoading(false)
      setIsClicked(false)
      setConfirmationValue('')
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    if (!newOpen) {
      onCancel()
    }
  }

  const handleConfirm = () => {
    // Always show loading immediately on click
    setIsClicked(true)

    if (asyncAction) {
      setIsLoading(true)
      // Use requestAnimationFrame to ensure UI updates before running async operation
      requestAnimationFrame(async () => {
        try {
          await onConfirm()
          setOpen(false)
        } catch (error) {
          console.error('Modal confirm action failed:', error)
          setIsLoading(false)
          setIsClicked(false)
        }
      })
    } else {
      // For non-async actions, show loading briefly then execute
      requestAnimationFrame(() => {
        try {
          onConfirm()
          setOpen(false)
        } catch (error) {
          console.error('Modal confirm action failed:', error)
          setIsClicked(false)
        }
      })
    }
  }

  const handleCancel = () => {
    setOpen(false)
    onCancel()
  }

  const isConfirmDisabled = () => {
    if (disableConfirmButton) return true
    if (isLoading) return true
    if (confirmationInput) {
      const inputMatches = confirmationInput.caseSensitive
        ? confirmationValue === confirmationInput.requiredValue
        : confirmationValue.toLowerCase() ===
          confirmationInput.requiredValue.toLowerCase()
      return !inputMatches
    }
    return false
  }

  const renderContent = () => {
    if (useDialog) {
      if (scrollable) {
        return (
          <DialogContent
            className={cn(
              'flex flex-col overflow-hidden',
              maxWidthClasses[maxWidth],
              contentClassName
            )}
            showCloseButton={showCloseButton}
          >
            <DialogHeader className={cn('flex-shrink-0', headerClassName)}>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </DialogHeader>

            <div
              className={cn(
                '-mx-6 flex-1 overflow-y-auto px-6 py-4',
                bodyClassName
              )}
            >
              {content}

              {confirmationInput && (
                <div className='mt-4 space-y-2'>
                  {confirmationInput.label && (
                    <Label htmlFor='confirmation-input'>
                      {confirmationInput.label}
                    </Label>
                  )}
                  <Input
                    id='confirmation-input'
                    type='text'
                    placeholder={confirmationInput.placeholder}
                    value={confirmationValue}
                    onChange={e => setConfirmationValue(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>

            {showFooter && (
              <DialogFooter
                className={cn('mt-4 flex-shrink-0', footerClassName)}
              >
                {customFooter
                  ? customFooter
                  : !hideDefaultButtons && (
                      <>
                        {showCancel && (
                          <Button
                            variant={_cancelButtonVariant}
                            onClick={handleCancel}
                            disabled={isLoading}
                          >
                            {cancelIcon}
                            {cancelText}
                          </Button>
                        )}
                        <Button
                          variant={confirmButtonVariant}
                          onClick={handleConfirm}
                          disabled={isConfirmDisabled()}
                        >
                          {isLoading || isClicked ? (
                            <>
                              <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                              {loadingText}
                            </>
                          ) : (
                            <>
                              {confirmIcon}
                              {confirmText}
                            </>
                          )}
                        </Button>
                      </>
                    )}
              </DialogFooter>
            )}
          </DialogContent>
        )
      }

      return (
        <DialogContent
          className={cn(maxWidthClasses[maxWidth], contentClassName)}
          showCloseButton={showCloseButton}
        >
          <DialogHeader className={headerClassName}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          {(content || confirmationInput) && (
            <div className={cn('my-4', bodyClassName)}>
              {content}

              {confirmationInput && (
                <div className='mt-4 space-y-2'>
                  {confirmationInput.label && (
                    <Label htmlFor='confirmation-input'>
                      {confirmationInput.label}
                    </Label>
                  )}
                  <Input
                    id='confirmation-input'
                    type='text'
                    placeholder={confirmationInput.placeholder}
                    value={confirmationValue}
                    onChange={e => setConfirmationValue(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          )}

          {showFooter && (
            <DialogFooter className={footerClassName}>
              {customFooter
                ? customFooter
                : !hideDefaultButtons && (
                    <>
                      {showCancel && (
                        <Button
                          variant={_cancelButtonVariant}
                          onClick={handleCancel}
                          disabled={isLoading}
                        >
                          {cancelIcon}
                          {cancelText}
                        </Button>
                      )}
                      <Button
                        variant={confirmButtonVariant}
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled()}
                      >
                        {isLoading || isClicked ? (
                          <>
                            <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                            {loadingText}
                          </>
                        ) : (
                          <>
                            {confirmIcon}
                            {confirmText}
                          </>
                        )}
                      </Button>
                    </>
                  )}
            </DialogFooter>
          )}
        </DialogContent>
      )
    }

    if (scrollable) {
      return (
        <AlertDialogContent
          className={cn(
            'flex flex-col overflow-hidden',
            maxWidthClasses[maxWidth],
            contentClassName
          )}
        >
          <AlertDialogHeader className={cn('flex-shrink-0', headerClassName)}>
            {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <div className='-mx-6 flex-1 overflow-y-auto px-6 py-4'>
            {content}

            {confirmationInput && (
              <div className='mt-4 space-y-2'>
                {confirmationInput.label && (
                  <Label htmlFor='confirmation-input'>
                    {confirmationInput.label}
                  </Label>
                )}
                <Input
                  id='confirmation-input'
                  type='text'
                  placeholder={confirmationInput.placeholder}
                  value={confirmationValue}
                  onChange={e => setConfirmationValue(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <AlertDialogFooter
            className={cn('mt-4 flex-shrink-0', footerClassName)}
          >
            {showCancel && (
              <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
                {cancelIcon}
                {cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isConfirmDisabled()}
              className={cn(
                confirmButtonVariant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : Button({ variant: confirmButtonVariant }).props?.className
              )}
            >
              {isLoading || isClicked ? (
                <>
                  <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  {loadingText}
                </>
              ) : (
                <>
                  {confirmIcon}
                  {confirmText}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )
    }

    return (
      <AlertDialogContent
        className={cn(maxWidthClasses[maxWidth], contentClassName)}
      >
        <AlertDialogHeader className={headerClassName}>
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {(content || confirmationInput) && (
          <div className='my-4'>
            {content}

            {confirmationInput && (
              <div className='mt-4 space-y-2'>
                {confirmationInput.label && (
                  <Label htmlFor='confirmation-input'>
                    {confirmationInput.label}
                  </Label>
                )}
                <Input
                  id='confirmation-input'
                  type='text'
                  placeholder={confirmationInput.placeholder}
                  value={confirmationValue}
                  onChange={e => setConfirmationValue(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter className={footerClassName}>
          {showCancel && (
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {cancelIcon}
              {cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className={cn(
              confirmButtonVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : Button({ variant: confirmButtonVariant }).props?.className
            )}
          >
            {isLoading || isClicked ? (
              <>
                <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                {loadingText}
              </>
            ) : (
              <>
                {confirmIcon}
                {confirmText}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    )
  }

  if (useDialog) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {renderContent()}
      </Dialog>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {renderContent()}
    </AlertDialog>
  )
}

interface ManagedModalProps extends ModalConfirmOptions {
  open: boolean
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  onOpenChange?: (open: boolean) => void
}

export const modalConfirm = (
  options: ModalConfirmOptions & {
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
  }
): void => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const cleanup = () => {
    setTimeout(() => {
      root.unmount()
      if (container.parentNode === document.body) {
        document.body.removeChild(container)
      }
    }, 100)
  }

  const handleConfirm = async () => {
    try {
      await options.onConfirm()
      cleanup()
    } catch (error) {
      console.error('Modal action failed:', error)
    }
  }

  const handleCancel = () => {
    options.onCancel?.()
    cleanup()
  }

  root.render(
    <ModalConfirmComponent
      {...options}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}

export const modalConfirmAsync = (
  message: string | ReactNode,
  onConfirm: () => Promise<void>,
  options?: Omit<ModalConfirmOptions, 'asyncAction'>
): Promise<boolean> => {
  return new Promise(resolve => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = () => {
      setTimeout(() => {
        root.unmount()
        if (container.parentNode === document.body) {
          document.body.removeChild(container)
        }
      }, 100)
    }

    const handleConfirm = async () => {
      try {
        await onConfirm()
        cleanup()
        resolve(true)
      } catch (error) {
        // Don't cleanup on error - let user retry or cancel
        console.error('Modal action failed:', error)
      }
    }

    const handleCancel = () => {
      cleanup()
      resolve(false)
    }

    const description = typeof message === 'string' ? message : undefined
    const content = typeof message === 'string' ? undefined : message

    root.render(
      <ModalConfirmComponent
        description={description}
        content={content}
        {...options}
        asyncAction={true}
        loadingText={options?.loadingText || 'Processing...'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  })
}

export const ModalDialog: React.FC<ManagedModalProps> = ({
  open,
  onConfirm,
  onCancel = () => {},
  onOpenChange,
  title,
  description,
  content,
  ...options
}) => {
  const [confirmationValue, setConfirmationValue] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isClicked, setIsClicked] = React.useState(false)
  const useDialog = options.useDialog ?? false

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setIsLoading(false)
      setIsClicked(false)
      setConfirmationValue('')
    }
  }, [open])

  const handleConfirm = () => {
    // Always show loading immediately on click
    setIsClicked(true)

    if (options.asyncAction) {
      setIsLoading(true)
      // Use requestAnimationFrame to ensure UI updates before running async operation
      requestAnimationFrame(async () => {
        try {
          await onConfirm()
          onOpenChange?.(false)
        } catch (error) {
          console.error('Modal confirm action failed:', error)
          setIsLoading(false)
          setIsClicked(false)
        }
      })
    } else {
      // For non-async actions, show loading briefly then execute
      requestAnimationFrame(() => {
        try {
          onConfirm()
          onOpenChange?.(false)
        } catch (error) {
          console.error('Modal confirm action failed:', error)
          setIsClicked(false)
        }
      })
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange?.(false)
  }

  const isConfirmDisabled = () => {
    if (options.disableConfirmButton) return true
    if (isLoading) return true
    if (options.confirmationInput) {
      const inputMatches = options.confirmationInput.caseSensitive
        ? confirmationValue === options.confirmationInput.requiredValue
        : confirmationValue.toLowerCase() ===
          options.confirmationInput.requiredValue.toLowerCase()
      return !inputMatches
    }
    return false
  }

  const renderScrollableContent = () => {
    if (useDialog) {
      return (
        <DialogContent
          className={cn(
            'flex flex-col overflow-hidden',
            maxWidthClasses[options.maxWidth || 'lg'],
            options.contentClassName
          )}
          showCloseButton={options.showCloseButton ?? true}
        >
          <DialogHeader
            className={cn('flex-shrink-0', options.headerClassName)}
          >
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div
            className={cn(
              '-mx-6 flex-1 overflow-y-auto px-6 py-4',
              options.bodyClassName
            )}
          >
            {content}

            {options.confirmationInput && (
              <div className='mt-4 space-y-2'>
                {options.confirmationInput.label && (
                  <Label htmlFor='confirmation-input'>
                    {options.confirmationInput.label}
                  </Label>
                )}
                <Input
                  id='confirmation-input'
                  type='text'
                  placeholder={options.confirmationInput.placeholder}
                  value={confirmationValue}
                  onChange={e => setConfirmationValue(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {options.showFooter !== false && (
            <DialogFooter
              className={cn('mt-4 flex-shrink-0', options.footerClassName)}
            >
              {options.customFooter
                ? options.customFooter
                : !options.hideDefaultButtons && (
                    <>
                      {options.showCancel !== false && (
                        <Button
                          variant={options.cancelButtonVariant || 'outline'}
                          onClick={handleCancel}
                          disabled={isLoading}
                        >
                          {options.cancelIcon}
                          {options.cancelText || 'Cancel'}
                        </Button>
                      )}
                      <Button
                        variant={options.confirmButtonVariant || 'destructive'}
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled()}
                      >
                        {isLoading || isClicked ? (
                          <>
                            <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                            {options.loadingText || 'Processing...'}
                          </>
                        ) : (
                          <>
                            {options.confirmIcon}
                            {options.confirmText || 'Confirm'}
                          </>
                        )}
                      </Button>
                    </>
                  )}
            </DialogFooter>
          )}
        </DialogContent>
      )
    }

    return (
      <AlertDialogContent
        className={cn(
          'flex flex-col overflow-hidden',
          maxWidthClasses[options.maxWidth || 'lg'],
          options.contentClassName
        )}
      >
        <AlertDialogHeader
          className={cn('flex-shrink-0', options.headerClassName)}
        >
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <div className='-mx-6 flex-1 overflow-y-auto px-6 py-4'>
          {content}

          {options.confirmationInput && (
            <div className='mt-4 space-y-2'>
              {options.confirmationInput.label && (
                <Label htmlFor='confirmation-input'>
                  {options.confirmationInput.label}
                </Label>
              )}
              <Input
                id='confirmation-input'
                type='text'
                placeholder={options.confirmationInput.placeholder}
                value={confirmationValue}
                onChange={e => setConfirmationValue(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter
          className={cn('mt-4 flex-shrink-0', options.footerClassName)}
        >
          {options.showCancel !== false && (
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {options.cancelIcon}
              {options.cancelText || 'Cancel'}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className={cn(
              (options.confirmButtonVariant || 'destructive') === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : Button({ variant: options.confirmButtonVariant }).props
                    ?.className
            )}
          >
            {isLoading || isClicked ? (
              <>
                <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                {options.loadingText || 'Processing...'}
              </>
            ) : (
              <>
                {options.confirmIcon}
                {options.confirmText || 'Confirm'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    )
  }

  const renderNormalContent = () => {
    if (useDialog) {
      return (
        <DialogContent
          className={cn(
            maxWidthClasses[options.maxWidth || 'lg'],
            options.contentClassName
          )}
          showCloseButton={options.showCloseButton ?? true}
        >
          <DialogHeader className={options.headerClassName}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          {(content || options.confirmationInput) && (
            <div className={cn('my-4', options.bodyClassName)}>
              {content}

              {options.confirmationInput && (
                <div className='mt-4 space-y-2'>
                  {options.confirmationInput.label && (
                    <Label htmlFor='confirmation-input'>
                      {options.confirmationInput.label}
                    </Label>
                  )}
                  <Input
                    id='confirmation-input'
                    type='text'
                    placeholder={options.confirmationInput.placeholder}
                    value={confirmationValue}
                    onChange={e => setConfirmationValue(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          )}

          {options.showFooter !== false && (
            <DialogFooter className={options.footerClassName}>
              {options.customFooter
                ? options.customFooter
                : !options.hideDefaultButtons && (
                    <>
                      {options.showCancel !== false && (
                        <Button
                          variant={options.cancelButtonVariant || 'outline'}
                          onClick={handleCancel}
                          disabled={isLoading}
                        >
                          {options.cancelIcon}
                          {options.cancelText || 'Cancel'}
                        </Button>
                      )}
                      <Button
                        variant={options.confirmButtonVariant || 'destructive'}
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled()}
                      >
                        {isLoading || isClicked ? (
                          <>
                            <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                            {options.loadingText || 'Processing...'}
                          </>
                        ) : (
                          <>
                            {options.confirmIcon}
                            {options.confirmText || 'Confirm'}
                          </>
                        )}
                      </Button>
                    </>
                  )}
            </DialogFooter>
          )}
        </DialogContent>
      )
    }

    return (
      <AlertDialogContent
        className={cn(
          maxWidthClasses[options.maxWidth || 'lg'],
          options.contentClassName
        )}
      >
        <AlertDialogHeader className={options.headerClassName}>
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {(content || options.confirmationInput) && (
          <div className='my-4'>
            {content}

            {options.confirmationInput && (
              <div className='mt-4 space-y-2'>
                {options.confirmationInput.label && (
                  <Label htmlFor='confirmation-input'>
                    {options.confirmationInput.label}
                  </Label>
                )}
                <Input
                  id='confirmation-input'
                  type='text'
                  placeholder={options.confirmationInput.placeholder}
                  value={confirmationValue}
                  onChange={e => setConfirmationValue(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter className={options.footerClassName}>
          {options.showCancel !== false && (
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {options.cancelIcon}
              {options.cancelText || 'Cancel'}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className={cn(
              (options.confirmButtonVariant || 'destructive') === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : Button({ variant: options.confirmButtonVariant }).props
                    ?.className
            )}
          >
            {isLoading || isClicked ? (
              <>
                <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                {options.loadingText || 'Processing...'}
              </>
            ) : (
              <>
                {options.confirmIcon}
                {options.confirmText || 'Confirm'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    )
  }

  if (useDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {options.scrollable ? renderScrollableContent() : renderNormalContent()}
      </Dialog>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {options.scrollable ? renderScrollableContent() : renderNormalContent()}
    </AlertDialog>
  )
}
