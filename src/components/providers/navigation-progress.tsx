'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import NProgress from 'nprogress'

import { isApiPath } from '@/lib/utils/url'

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3,
  easing: 'ease',
  speed: 500
})

// Custom CSS for the progress bar
const progressStyles = `
  #nprogress {
    pointer-events: none;
  }

  #nprogress .bar {
    background: hsl(var(--primary));
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    box-shadow: 0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary));
  }

  #nprogress .peg {
    display: block;
    position: absolute;
    right: 0px;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary));
    opacity: 1.0;
    transform: rotate(3deg) translate(0px, -4px);
  }

  .nprogress-custom-parent {
    overflow: hidden;
    position: relative;
  }

  .nprogress-custom-parent #nprogress .bar {
    position: absolute;
  }
`

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    // Inject custom styles
    if (
      typeof window !== 'undefined' &&
      !document.getElementById('nprogress-custom-styles')
    ) {
      const style = document.createElement('style')
      style.id = 'nprogress-custom-styles'
      style.innerHTML = progressStyles
      document.head.appendChild(style)
    }

    // Handle route changes
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    // Listen to native navigation events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // Check if it's an internal navigation
      const isInternalLink = href.startsWith('/') || href.startsWith('#')
      const isSamePage = href === pathname || href === '#'
      const isDownload = anchor.hasAttribute('download')
      const isNewTab = anchor.target === '_blank'
      const isMailto = href.startsWith('mailto:')
      const isTel = href.startsWith('tel:')

      if (
        isInternalLink &&
        !isSamePage &&
        !isDownload &&
        !isNewTab &&
        !isMailto &&
        !isTel
      ) {
        handleStart()
      }
    }

    // Listen to form submissions
    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement

      // Skip forms that explicitly opt out of progress bar
      if (form.dataset.noProgress === 'true') {
        return
      }

      const action = form.action

      if (action && !isApiPath(action)) {
        handleStart()
      }
    }

    // Listen to popstate (browser back/forward)
    const handlePopState = () => {
      handleStart()
      // Use a small delay to ensure the progress bar is visible
      setTimeout(handleComplete, 100)
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('submit', handleSubmit)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('submit', handleSubmit)
      window.removeEventListener('popstate', handlePopState)
      handleComplete()
    }
  }, [pathname])

  return null
}

// Utility function to manually trigger progress
export const navigationProgress = {
  start: () => NProgress.start(),
  done: () => NProgress.done(),
  set: (value: number) => NProgress.set(value),
  inc: (value?: number) => NProgress.inc(value)
}
