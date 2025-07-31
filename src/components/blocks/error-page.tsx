import Link from 'next/link'

import { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  statusCode: string
  icon: LucideIcon
  title: string
  description: string
  primaryAction: {
    label: string
    href?: string
    onClick?: () => void
    icon: LucideIcon
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
    icon: LucideIcon
  }
  note?: string
  gradientColors: {
    blur: string
    text: string
    button: string
    buttonHover: string
    iconBg: string
  }
}

export function ErrorPage({
  statusCode,
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  note = 'If you believe you should have access to this resource, please contact support team for assistance.',
  gradientColors
}: ErrorPageProps) {
  const PrimaryIcon = primaryAction.icon
  const SecondaryIcon = secondaryAction?.icon
  return (
    <div className='flex min-h-[calc(100vh-64px)] items-center justify-center px-4'>
      <div className='max-w-2xl space-y-8 text-center'>
        {/* Logo and status code */}
        <div className='relative'>
          <div className='absolute inset-0 opacity-30 blur-3xl'>
            <div className={`h-full w-full ${gradientColors.blur}`} />
          </div>
          <div className='relative space-y-4'>
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${gradientColors.iconBg} backdrop-blur-sm`}
            >
              <Icon className='h-10 w-10 text-purple-600 dark:text-purple-400' />
            </div>
            <h1 className='text-8xl font-bold tracking-tighter'>
              <span
                className={`${gradientColors.text} bg-clip-text text-transparent`}
              >
                {statusCode}
              </span>
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className='space-y-6'>
          <div className='space-y-3'>
            <h2 className='text-foreground text-3xl font-bold tracking-tight'>
              {title}
            </h2>
            <p className='text-muted-foreground mx-auto max-w-md text-lg'>
              {description}
            </p>
          </div>

          {/* Action buttons */}
          <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
            {primaryAction.href ? (
              <Button
                asChild
                size='lg'
                className={`${gradientColors.button} text-white shadow-lg transition-all duration-200 ${gradientColors.buttonHover} hover:shadow-xl`}
              >
                <Link href={primaryAction.href}>
                  <PrimaryIcon className='mr-2 h-4 w-4' />
                  {primaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={primaryAction.onClick}
                size='lg'
                className={`${gradientColors.button} text-white shadow-lg transition-all duration-200 ${gradientColors.buttonHover} hover:shadow-xl`}
              >
                <PrimaryIcon className='mr-2 h-4 w-4' />
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction &&
              (secondaryAction.href ? (
                <Button
                  asChild
                  variant='outline'
                  size='lg'
                  className='border-muted-foreground/20 hover:bg-muted/50'
                >
                  <Link href={secondaryAction.href}>
                    {SecondaryIcon && (
                      <SecondaryIcon className='mr-2 h-4 w-4' />
                    )}
                    {secondaryAction.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={secondaryAction.onClick}
                  variant='outline'
                  size='lg'
                  className='border-muted-foreground/20 hover:bg-muted/50'
                >
                  {SecondaryIcon && <SecondaryIcon className='mr-2 h-4 w-4' />}
                  {secondaryAction.label}
                </Button>
              ))}
          </div>
        </div>

        {/* Info box */}
        {note && (
          <div className='bg-muted/30 border-muted-foreground/10 mt-12 rounded-xl border p-6 backdrop-blur-sm'>
            <p className='text-muted-foreground text-sm'>
              <span className='text-foreground font-medium'>Note:</span> {note}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
