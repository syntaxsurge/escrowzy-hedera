'use client'

import { type ColumnDef } from '@tanstack/react-table'
import {
  Crown,
  User,
  ExternalLink,
  Shield,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

import { PlanCell } from '@/components/blocks/table/plan-cell'
import { RelativeTime } from '@/components/blocks/table/relative-time'
import { UserCell } from '@/components/blocks/table/user-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { truncateAddress } from '@/lib'
import { buildTxUrl, getChainNickname } from '@/lib/blockchain'
import {
  formatPaymentAmountWithCurrency,
  formatPlanName
} from '@/lib/blockchain/payment'

import type { ColumnConfig } from '../../../lib/table/table-columns-config'

// Map string icon names to components
const iconMap = {
  Crown,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Clock
}

// Map format functions
const formatFunctions = {
  formatPlanName,
  getNetworkName: getChainNickname
}

// Convert column configs to TanStack table columns
export function renderTableColumns<T extends Record<string, any>>(
  configs: ColumnConfig[],
  customRenderers?: Record<string, (row: T) => React.ReactNode>
): ColumnDef<T>[] {
  return configs.map((config): ColumnDef<T> => {
    switch (config.type) {
      case 'select':
        return {
          id: config.id || 'select',
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value: boolean) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label='Select all'
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
              aria-label='Select row'
            />
          ),
          enableSorting: config.enableSorting ?? false,
          enableHiding: config.enableHiding ?? false
        }

      case 'user':
        if (!config.accessorKey)
          throw new Error('User column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting,
          cell: ({ row }) => {
            const user = row.original[config.accessorKey || 'user']
            if (!user) return null

            return (
              <UserCell
                name={user.name}
                email={config.config?.showEmail ? user.email : undefined}
                walletAddress={
                  config.config?.showWallet ? user.walletAddress : undefined
                }
              />
            )
          }
        }

      case 'date':
        if (!config.accessorKey)
          throw new Error('Date column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          cell: ({ row }) => {
            const date = row.original[config.accessorKey!]
            if (!date) return null

            const format = config.config?.format || 'relative'

            if (format === 'relative') {
              return <RelativeTime date={date} />
            }

            const dateStr = typeof date === 'string' ? date : date.toISOString()

            if (format === 'date') {
              return (
                <span className='text-sm'>
                  {new Date(dateStr).toLocaleDateString()}
                </span>
              )
            }

            return (
              <span className='text-sm'>
                {new Date(dateStr).toLocaleString()}
              </span>
            )
          }
        }

      case 'status':
        if (!config.accessorKey)
          throw new Error('Status column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          enableColumnFilter: config.enableColumnFilter ?? true,
          cell: ({ row }) => {
            const value = row.original[config.accessorKey!]
            const status = config.config?.statuses?.find(
              (s: any) => s.value === value
            )

            if (!status) return value

            const Icon = status.icon
              ? iconMap[status.icon as keyof typeof iconMap]
              : null

            return (
              <Badge variant={status.variant} className={status.className}>
                {Icon && <Icon className='mr-1 h-3 w-3' />}
                {status.label || status.value}
              </Badge>
            )
          },
          filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
          }
        }

      case 'role':
        if (!config.accessorKey)
          throw new Error('Role column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          enableColumnFilter: config.enableColumnFilter ?? true,
          cell: ({ row }) => {
            const value = row.original[config.accessorKey!]
            const status = config.config?.statuses?.find(
              (s: any) => s.value === value
            )

            if (!status) return value

            const Icon = status.icon
              ? iconMap[status.icon as keyof typeof iconMap]
              : null

            return (
              <Badge variant={status.variant} className={status.className}>
                {Icon && <Icon className='mr-1 h-3 w-3' />}
                {status.label || status.value}
              </Badge>
            )
          },
          filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
          }
        }

      case 'plan':
        if (!config.accessorKey)
          throw new Error('Plan column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          cell: ({ row }) => {
            const personalPlan = row.original.personalPlanId
            const teamPlan = row.original[config.accessorKey || 'planId']

            return <PlanCell personalPlan={personalPlan} teamPlan={teamPlan} />
          }
        }

      case 'hash':
        if (!config.accessorKey)
          throw new Error('Hash column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          cell: ({ row }) => {
            const hash = row.original[config.accessorKey!]
            const chainId = row.original.chainId

            if (!hash) return null

            const displayHash = config.config?.truncate
              ? truncateAddress(hash)
              : hash

            return (
              <Button
                variant='link'
                size='sm'
                className='h-auto p-0 font-mono'
                asChild
              >
                <a
                  href={buildTxUrl(chainId, hash)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-1'
                >
                  {displayHash}
                  <ExternalLink className='h-3 w-3' />
                </a>
              </Button>
            )
          }
        }

      case 'amount':
        if (!config.accessorKey)
          throw new Error('Amount column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          cell: ({ row }) => {
            const amount = row.original[config.accessorKey || 'amount']
            const chainId = row.original.chainId
            const currency = row.original.currency || ''

            return (
              <span className='font-mono'>
                {formatPaymentAmountWithCurrency(amount, chainId, currency)}
              </span>
            )
          }
        }

      case 'badge':
        if (!config.accessorKey)
          throw new Error('Badge column requires accessorKey')
        return {
          accessorKey: config.accessorKey,
          header: config.header,
          enableSorting: config.enableSorting ?? true,
          cell: ({ row }) => {
            const value = row.original[config.accessorKey!]
            let displayValue = value

            if (config.config?.formatValue) {
              const formatFn = formatFunctions[
                config.config.formatValue as keyof typeof formatFunctions
              ] as ((value: any) => string) | undefined
              if (formatFn) {
                displayValue = formatFn(value)
              }
            }

            return (
              <Badge variant={config.config?.variant || 'secondary'}>
                {displayValue}
              </Badge>
            )
          }
        }

      case 'actions':
        return {
          id: config.id || 'actions',
          header: config.header || '',
          enableSorting: false,
          cell: ({ row }) => {
            const renderer = customRenderers?.[config.id || 'actions']
            return renderer ? renderer(row.original) : null
          }
        }

      case 'custom':
        // First check if there's a custom renderer for the id
        if (config.id && customRenderers?.[config.id]) {
          // If there's an accessorKey, use it for data access and sorting
          if (config.accessorKey) {
            return {
              id: config.id,
              accessorKey: config.accessorKey,
              header: config.header,
              enableSorting: config.enableSorting,
              enableColumnFilter: config.enableColumnFilter,
              cell: ({ row }) => customRenderers[config.id!](row.original)
            }
          }
          // Otherwise just use id without accessor
          return {
            id: config.id,
            header: config.header,
            enableSorting: config.enableSorting,
            enableColumnFilter: config.enableColumnFilter,
            cell: ({ row }) => customRenderers[config.id!](row.original)
          }
        }

        if (config.accessorKey === 'chainId') {
          return {
            accessorKey: config.accessorKey,
            header: config.header,
            enableSorting: config.enableSorting ?? true,
            enableColumnFilter: config.enableColumnFilter ?? true,
            cell: ({ row }) => (
              <span className='text-sm'>
                {getChainNickname(row.original.chainId)}
              </span>
            )
          }
        }

        // Custom column with accessorKey and custom renderer
        if (config.accessorKey && customRenderers?.[config.accessorKey]) {
          return {
            id: config.id || config.accessorKey,
            accessorKey: config.accessorKey,
            header: config.header,
            enableSorting: config.enableSorting,
            enableColumnFilter: config.enableColumnFilter,
            cell: ({ row }) =>
              customRenderers[config.accessorKey!](row.original)
          }
        }

        // Default custom column with accessorKey
        if (config.accessorKey) {
          return {
            accessorKey: config.accessorKey,
            header: config.header,
            enableSorting: config.enableSorting,
            enableColumnFilter: config.enableColumnFilter
          }
        }

        // Default custom column with id
        return {
          id: config.id || 'custom',
          header: config.header,
          enableSorting: config.enableSorting,
          enableColumnFilter: config.enableColumnFilter,
          accessorFn: () => ''
        }

      default:
        // Default case with accessorKey
        if (config.accessorKey) {
          return {
            accessorKey: config.accessorKey,
            header: config.header,
            enableSorting: config.enableSorting,
            enableColumnFilter: config.enableColumnFilter
          }
        }

        // Default case without accessorKey
        return {
          id: config.id || 'default',
          header: config.header,
          enableSorting: config.enableSorting,
          enableColumnFilter: config.enableColumnFilter,
          accessorFn: () => ''
        }
    }
  })
}
