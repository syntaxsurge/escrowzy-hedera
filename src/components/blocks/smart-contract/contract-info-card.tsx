import {
  Shield,
  Wallet,
  Network,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Pause
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib'
import { getExplorerUrl } from '@/lib/blockchain'

interface ContractInfoCardProps {
  title: string
  contractAddress: string
  chainId: number
  chainName: string
  status?: 'active' | 'paused'
  className?: string
}

export function ContractInfoCard({
  title,
  contractAddress,
  chainId,
  chainName,
  status,
  className
}: ContractInfoCardProps) {
  return (
    <Card
      className={cn(
        'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
        className
      )}
    >
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400' />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='flex items-center gap-2'>
            <Wallet className='text-muted-foreground h-4 w-4' />
            <div className='min-w-0 flex-1'>
              <p className='text-foreground text-sm font-medium'>
                Contract Address
              </p>
              <div className='flex items-center gap-2'>
                <code className='text-foreground font-mono text-xs break-all'>
                  {contractAddress}
                </code>
                <a
                  href={`${getExplorerUrl(chainId)}/address/${contractAddress}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                >
                  <ExternalLink className='h-3 w-3' />
                </a>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Network className='text-muted-foreground h-4 w-4' />
            <div>
              <p className='text-foreground text-sm font-medium'>Network</p>
              <p className='text-foreground text-sm'>{chainName}</p>
            </div>
          </div>
          {status && (
            <div className='flex items-center gap-2'>
              {status === 'paused' ? (
                <Pause className='h-4 w-4 text-yellow-600' />
              ) : (
                <CheckCircle className='h-4 w-4 text-green-600' />
              )}
              <div>
                <p className='text-foreground text-sm font-medium'>Status</p>
                <Badge variant={status === 'paused' ? 'secondary' : 'default'}>
                  {status === 'paused' ? 'Paused' : 'Active'}
                </Badge>
              </div>
            </div>
          )}
          {!status && (
            <div className='flex items-center gap-2'>
              <AlertCircle className='text-muted-foreground h-4 w-4' />
              <div>
                <p className='text-foreground text-sm font-medium'>Chain ID</p>
                <p className='text-foreground text-sm'>{chainId}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
