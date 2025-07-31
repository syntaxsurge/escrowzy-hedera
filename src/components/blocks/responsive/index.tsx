'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib'

// Responsive visibility components
interface ResponsiveProps {
  children: React.ReactNode
  className?: string
}

export function MobileOnly({ children, className }: ResponsiveProps) {
  return <div className={cn('block sm:hidden', className)}>{children}</div>
}

export function TabletOnly({ children, className }: ResponsiveProps) {
  return (
    <div className={cn('hidden sm:block lg:hidden', className)}>{children}</div>
  )
}

export function DesktopOnly({ children, className }: ResponsiveProps) {
  return <div className={cn('hidden lg:block', className)}>{children}</div>
}

export function MobileAndTablet({ children, className }: ResponsiveProps) {
  return <div className={cn('block lg:hidden', className)}>{children}</div>
}

export function TabletAndDesktop({ children, className }: ResponsiveProps) {
  return <div className={cn('hidden sm:block', className)}>{children}</div>
}

// Hook to detect screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setScreenSize({
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return screenSize
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: number
  className?: string
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 4,
  className
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    `gap-${gap}`,
    cols.mobile === 1 ? 'grid-cols-1' : `grid-cols-${cols.mobile}`,
    cols.tablet && `sm:grid-cols-${cols.tablet}`,
    cols.desktop && `lg:grid-cols-${cols.desktop}`,
    className
  )

  return <div className={gridClasses}>{children}</div>
}

// Responsive container with max width
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'xl',
  padding = true
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  }

  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  )
}

// Responsive text size
interface ResponsiveTextProps {
  children: React.ReactNode
  className?: string
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
}

export function ResponsiveText({
  children,
  className,
  size = 'base'
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl'
  }

  return <div className={cn(sizeClasses[size], className)}>{children}</div>
}

// Responsive stack (vertical on mobile, horizontal on desktop)
interface ResponsiveStackProps {
  children: React.ReactNode
  className?: string
  gap?: number
  breakpoint?: 'sm' | 'md' | 'lg'
}

export function ResponsiveStack({
  children,
  className,
  gap = 4,
  breakpoint = 'sm'
}: ResponsiveStackProps) {
  const stackClasses = cn(
    'flex flex-col',
    `gap-${gap}`,
    breakpoint === 'sm' && 'sm:flex-row',
    breakpoint === 'md' && 'md:flex-row',
    breakpoint === 'lg' && 'lg:flex-row',
    className
  )

  return <div className={stackClasses}>{children}</div>
}

// Mobile menu wrapper
interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function MobileMenu({
  isOpen,
  onClose,
  children,
  className
}: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div
        className='fixed inset-0 z-40 bg-black/50 sm:hidden'
        onClick={onClose}
      />
      <div
        className={cn(
          'bg-background fixed inset-x-0 top-0 z-50 border-b sm:hidden',
          'animate-in slide-in-from-top duration-200',
          className
        )}
      >
        {children}
      </div>
    </>
  )
}
