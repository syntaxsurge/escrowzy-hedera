'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group !z-[9999]'
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:max-w-[420px] group-[.toaster]:break-words group-[.toaster]:pointer-events-auto group-[.toaster]:z-[9999]',
          description:
            'group-[.toast]:text-muted-foreground group-[.toast]:break-words group-[.toast]:overflow-hidden',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:cursor-pointer group-[.toast]:pointer-events-auto',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:cursor-pointer group-[.toast]:pointer-events-auto',
          error:
            'group-[.toaster]:!bg-destructive group-[.toaster]:!text-destructive-foreground group-[.toaster]:!border-destructive',
          success:
            'group-[.toaster]:!bg-green-50 group-[.toaster]:!text-green-900 group-[.toaster]:!border-green-200 dark:group-[.toaster]:!bg-green-950 dark:group-[.toaster]:!text-green-100 dark:group-[.toaster]:!border-green-800',
          warning:
            'group-[.toaster]:!bg-amber-50 group-[.toaster]:!text-amber-900 group-[.toaster]:!border-amber-200 dark:group-[.toaster]:!bg-amber-950 dark:group-[.toaster]:!text-amber-100 dark:group-[.toaster]:!border-amber-800',
          info: 'group-[.toaster]:!bg-blue-50 group-[.toaster]:!text-blue-900 group-[.toaster]:!border-blue-200 dark:group-[.toaster]:!bg-blue-950 dark:group-[.toaster]:!text-blue-100 dark:group-[.toaster]:!border-blue-800'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
