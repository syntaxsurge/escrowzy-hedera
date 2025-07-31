'use client'

import dynamic from 'next/dynamic'
import { Suspense, ReactNode, useEffect, useRef, useState } from 'react'

import { Spinner } from '@/components/blocks/loading'
import { appRoutes } from '@/config/app-routes'

// Generic lazy load wrapper for any component
interface LazyLoadProps {
  fallback?: ReactNode
  children: ReactNode
}

export function LazyLoad({ fallback, children }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <Spinner size='md' />}>{children}</Suspense>
  )
}

// Dynamic import wrapper with loading state
interface DynamicComponentProps {
  loader: () => Promise<any>
  loading?: ReactNode
  [key: string]: any
}

export function DynamicComponent({
  loader,
  loading = <Spinner size='md' />,
  ...props
}: DynamicComponentProps) {
  const Component = dynamic(loader, {
    loading: () => <>{loading}</>,
    ssr: false
  })

  return <Component {...props} />
}

// Lazy load image with blur placeholder
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  alt,
  className,
  placeholder = appRoutes.assets.placeholder,
  onLoad,
  onError
}: LazyImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading='lazy'
      decoding='async'
      onLoad={onLoad}
      onError={e => {
        const target = e.target as HTMLImageElement
        target.src = placeholder
        onError?.()
      }}
    />
  )
}

// Intersection Observer wrapper for viewport-based loading

interface ViewportLazyLoadProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  threshold?: number
}

export function ViewportLazyLoad({
  children,
  fallback = <Spinner size='sm' />,
  rootMargin = '100px',
  threshold = 0.1
}: ViewportLazyLoadProps) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return <div ref={ref}>{isIntersecting ? children : fallback}</div>
}

// Heavy component loader
export const lazyLoadComponents = {
  // Heavy tables
  DataTable: dynamic(
    () =>
      import('@/components/blocks/table/data-table').then(mod => mod.DataTable),
    {
      loading: () => <Spinner size='lg' label='Loading table...' />
    }
  )
}

// Prefetch component on hover
export function usePrefetch(loader: () => Promise<any>) {
  const prefetch = () => {
    loader()
  }

  return { prefetch }
}
