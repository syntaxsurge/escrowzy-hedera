import Link from 'next/link'

import { appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className='mt-auto border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'>
      <div className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 gap-8 md:grid-cols-4'>
          {/* Brand Section */}
          <div className='space-y-3'>
            <h3 className='text-lg font-semibold'>
              {envPublic.NEXT_PUBLIC_APP_NAME}
            </h3>
            <p className='text-muted-foreground text-sm'>
              {envPublic.NEXT_PUBLIC_APP_DESCRIPTION}
            </p>
          </div>

          {/* Quick Links */}
          <div className='space-y-3'>
            <h4 className='text-muted-foreground text-sm font-semibold tracking-wider uppercase'>
              Quick Links
            </h4>
            <ul className='space-y-2'>
              <li>
                <Link
                  href={appRoutes.pricing}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href={appRoutes.dashboard.base}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href={appRoutes.dashboard.settings.team}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  Team Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers */}
          <div className='space-y-3'>
            <h4 className='text-muted-foreground text-sm font-semibold tracking-wider uppercase'>
              Developers
            </h4>
            <ul className='space-y-2'>
              <li>
                <Link
                  href={appRoutes.apiDocs}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  API Documentation
                </Link>
              </li>
              <li>
                <Link
                  href={appRoutes.dashboard.settings.apiKeys}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  API Keys
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className='space-y-3'>
            <h4 className='text-muted-foreground text-sm font-semibold tracking-wider uppercase'>
              Legal
            </h4>
            <ul className='space-y-2'>
              <li>
                <Link
                  href={appRoutes.terms}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href={appRoutes.privacy}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='mt-8 border-t border-gray-200 pt-8 dark:border-gray-800'>
          <div className='flex flex-col items-center justify-between space-y-4 text-center md:flex-row md:space-y-0 md:text-left'>
            <p className='text-muted-foreground text-sm'>
              © {currentYear} {envPublic.NEXT_PUBLIC_APP_NAME}. All rights
              reserved.
            </p>
            <p className='text-muted-foreground text-sm'>
              Built with blockchain technology for the decentralized future.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
