'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Home } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { appRoutes } from '@/config/app-routes'
import { cn } from '@/lib'
import { toTitleCase } from '@/lib/utils/string'

interface BreadcrumbItemData {
  label: string
  href?: string
}

function generateBreadcrumbs(pathname: string): BreadcrumbItemData[] {
  const paths = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItemData[] = [
    { label: 'Home', href: appRoutes.home }
  ]

  // Build breadcrumb items
  let currentPath = ''
  paths.forEach((path, index) => {
    currentPath += `/${path}`

    // Format the label
    let label = toTitleCase(path.replace(/-/g, ' '))

    // Special cases for better labels
    if (path === 'dashboard') label = 'Dashboard'
    if (path === 'team-settings') label = 'Team Settings'

    breadcrumbs.push({
      label,
      href: index === paths.length - 1 ? undefined : currentPath
    })
  })

  return breadcrumbs
}

export function AutoBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  // Don't show breadcrumb on home page
  if (pathname === appRoutes.home) return null

  return (
    <Breadcrumb className={cn('mb-6', className)}>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1

          return (
            <div key={item.label} className='flex items-center'>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {!isLast && item.href ? (
                  <BreadcrumbLink asChild>
                    <Link
                      href={item.href}
                      className='flex items-center transition-colors'
                    >
                      {index === 0 && <Home className='mr-1.5 h-4 w-4' />}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className='flex items-center'>
                    {index === 0 && <Home className='mr-1.5 h-4 w-4' />}
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
