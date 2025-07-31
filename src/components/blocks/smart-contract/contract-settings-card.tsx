import { ReactNode } from 'react'

import { Settings } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export interface SettingField {
  label: string
  value?: string | number | boolean
  input?: ReactNode
  description?: string
  action?: {
    label: string
    onClick: () => void | Promise<void>
    disabled?: boolean
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  }
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

interface ContractSettingsCardProps {
  title: string
  description?: string
  settings: SettingField[]
  className?: string
  icon?: ReactNode
}

export function ContractSettingsCard({
  title,
  description,
  settings,
  className,
  icon = <Settings className='h-5 w-5' />
}: ContractSettingsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className='space-y-4'>
        {settings.map((setting, index) => (
          <div key={index} className='space-y-2'>
            {setting.value !== undefined ? (
              <div className='flex items-center justify-between'>
                <div>
                  <p className='font-medium'>{setting.label}</p>
                  {setting.description && (
                    <p className='text-muted-foreground text-sm'>
                      {setting.description}
                    </p>
                  )}
                  {typeof setting.value === 'boolean' ? (
                    <Badge
                      variant={setting.value ? 'default' : 'secondary'}
                      className='mt-1'
                    >
                      {setting.value ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ) : (
                    <div className='mt-1 text-lg font-semibold'>
                      {setting.value}
                    </div>
                  )}
                </div>
                {setting.badge && (
                  <Badge variant={setting.badge.variant || 'default'}>
                    {setting.badge.label}
                  </Badge>
                )}
              </div>
            ) : (
              <>
                <Label>{setting.label}</Label>
                {setting.input}
                {setting.description && (
                  <p className='text-muted-foreground text-xs'>
                    {setting.description}
                  </p>
                )}
              </>
            )}
            {setting.action && (
              <Button
                onClick={setting.action.onClick}
                disabled={setting.action.disabled}
                variant={setting.action.variant || 'default'}
                className='w-full'
              >
                {setting.action.label}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
