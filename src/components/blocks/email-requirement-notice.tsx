import Link from 'next/link'

import { Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { appRoutes } from '@/config/app-routes'

interface EmailRequirementNoticeProps {
  title: string
  message: string
  buttonText?: string
  buttonHref?: string
}

export function EmailRequirementNotice({
  title,
  message,
  buttonText = 'Add Email Address',
  buttonHref = appRoutes.dashboard.settings.base
}: EmailRequirementNoticeProps) {
  return (
    <div className='space-y-4'>
      <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/20 dark:bg-amber-900/10'>
        <div className='flex items-center space-x-3'>
          <Mail className='h-5 w-5 text-amber-600' />
          <div>
            <p className='font-medium text-amber-800 dark:text-amber-400'>
              {title}
            </p>
            <p className='text-sm text-amber-700 dark:text-amber-500'>
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className='flex justify-center'>
        <Link href={buttonHref}>
          <Button className='bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700'>
            <Mail className='mr-2 h-4 w-4' />
            {buttonText}
          </Button>
        </Link>
      </div>
    </div>
  )
}
