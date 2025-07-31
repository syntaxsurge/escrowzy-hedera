import * as React from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-100 text-green-800 hover:bg-green-100/80',
        warning:
          'border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80',
        admin:
          'border-transparent bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md',
        // Gaming variants
        common:
          'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
        rare: 'border-blue-400 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300 shadow-sm shadow-blue-400/20 dark:border-blue-600 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300',
        epic: 'border-purple-400 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 hover:from-purple-200 hover:to-purple-300 shadow-md shadow-purple-400/30 dark:border-purple-600 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-300',
        legendary:
          'animate-pulse border-2 border-yellow-400 bg-gradient-to-r from-yellow-100 via-orange-100 to-yellow-100 text-yellow-800 hover:from-yellow-200 hover:via-orange-200 hover:to-yellow-200 shadow-lg shadow-yellow-400/40 dark:border-yellow-600 dark:from-yellow-900/50 dark:via-orange-900/50 dark:to-yellow-900/50 dark:text-yellow-300',
        gaming:
          'border-2 border-cyan-400 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 backdrop-blur-sm hover:from-cyan-500/30 hover:to-blue-500/30 shadow-neon shadow-cyan-400/50'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
