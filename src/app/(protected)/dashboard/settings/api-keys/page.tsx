'use client'

import Link from 'next/link'
import { useState } from 'react'

import { formatDistanceToNow } from 'date-fns'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  ExternalLink
} from 'lucide-react'
import useSWR, { mutate } from 'swr'

import { ModalDialog } from '@/components/blocks/modal-utils'
import {
  showSuccessToast,
  showErrorToast
} from '@/components/blocks/toast-manager'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useDialogState } from '@/hooks/use-dialog-state'
import { swrFetcher } from '@/lib/api/swr'

interface ApiKey {
  id: number
  name: string
  keyPrefix: string
  lastUsedAt: Date | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  fullKey?: string
}

interface Subscription {
  currentPlan: string
  isActive: boolean
}

function ApiKeysList() {
  const { data, error, isLoading } = useSWR<{ keys: ApiKey[] }>(
    apiEndpoints.settings.apiKeys.base,
    swrFetcher
  )
  const [deletingKeyId, setDeletingKeyId] = useState<number | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null)
  const deleteDialog = useDialogState()
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)

  const handleCopyKey = async (key: ApiKey) => {
    if (key.fullKey) {
      await navigator.clipboard.writeText(key.fullKey)
      setCopiedKeyId(key.id)
      showSuccessToast('API key copied to clipboard')
      setTimeout(() => setCopiedKeyId(null), 2000)
    }
  }

  const handleDeleteKey = async () => {
    if (!keyToDelete) return

    setDeletingKeyId(keyToDelete.id)
    try {
      const response = await fetch(
        apiEndpoints.settings.apiKeys.byId(keyToDelete.id.toString()),
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      if (response.ok) {
        showSuccessToast('API key revoked successfully')
        mutate(apiEndpoints.settings.apiKeys.base)
        deleteDialog.close()
      } else {
        const data = await response.json()
        showErrorToast(data.error || 'Failed to revoke API key')
      }
    } catch {
      showErrorToast('Failed to revoke API key')
    } finally {
      setDeletingKeyId(null)
      setKeyToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <Spinner size='lg' />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className='border-red-200 bg-red-50 dark:border-red-900/20 dark:bg-red-900/10'>
        <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400' />
        <AlertDescription className='text-red-900 dark:text-red-100'>
          Failed to load API keys
        </AlertDescription>
      </Alert>
    )
  }

  const keys = data?.keys || []

  if (keys.length === 0) {
    return (
      <div className='py-8 text-center'>
        <Key className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
        <p className='text-muted-foreground mb-4'>No API keys created yet</p>
        <p className='text-muted-foreground text-sm'>
          Create your first API key to start integrating with external
          applications
        </p>
      </div>
    )
  }

  return (
    <>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map(key => (
              <TableRow key={key.id}>
                <TableCell className='font-medium'>{key.name}</TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <code className='bg-muted rounded px-2 py-1 text-xs'>
                      {key.fullKey || key.keyPrefix}
                    </code>
                    {key.fullKey && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleCopyKey(key)}
                        className='h-7 w-7 p-0'
                      >
                        {copiedKeyId === key.id ? (
                          <CheckCircle className='h-3.5 w-3.5 text-green-600' />
                        ) : (
                          <Copy className='h-3.5 w-3.5' />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {key.isActive ? (
                    <Badge variant='success'>Active</Badge>
                  ) : (
                    <Badge variant='destructive'>Revoked</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {key.lastUsedAt ? (
                    <span className='text-muted-foreground text-sm'>
                      {formatDistanceToNow(new Date(key.lastUsedAt), {
                        addSuffix: true
                      })}
                    </span>
                  ) : (
                    <span className='text-muted-foreground text-sm'>Never</span>
                  )}
                </TableCell>
                <TableCell>
                  {key.expiresAt ? (
                    <span className='text-muted-foreground text-sm'>
                      {formatDistanceToNow(new Date(key.expiresAt), {
                        addSuffix: true
                      })}
                    </span>
                  ) : (
                    <span className='text-muted-foreground text-sm'>Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className='text-muted-foreground text-sm'>
                    {formatDistanceToNow(new Date(key.createdAt), {
                      addSuffix: true
                    })}
                  </span>
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setKeyToDelete(key)
                      deleteDialog.open()
                    }}
                    disabled={!key.isActive || deletingKeyId === key.id}
                    className='text-red-600 hover:text-red-700 dark:text-red-400'
                  >
                    {deletingKeyId === key.id ? (
                      <Spinner size='sm' />
                    ) : (
                      <Trash2 className='h-4 w-4' />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ModalDialog
        open={deleteDialog.isOpen}
        onOpenChange={open => {
          if (open) {
            deleteDialog.open()
          } else {
            deleteDialog.close()
            setKeyToDelete(null)
          }
        }}
        title={
          <div className='flex items-center gap-2 text-red-600'>
            <AlertTriangle className='h-5 w-5' />
            Revoke API Key
          </div>
        }
        description={`Are you sure you want to revoke the API key "${keyToDelete?.name}"? This action cannot be undone.`}
        showCancel={true}
        cancelText='Cancel'
        onCancel={() => deleteDialog.close()}
        confirmText='Revoke Key'
        confirmButtonVariant='destructive'
        confirmIcon={<Trash2 className='h-4 w-4' />}
        onConfirm={handleDeleteKey}
        asyncAction={true}
        loadingText='Revoking...'
      />
    </>
  )
}

function CreateApiKeyDialog() {
  const createDialog = useDialogState()
  const [keyName, setKeyName] = useState('')
  const [expiresIn, setExpiresIn] = useState('0')
  const [isCreating, setIsCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      showErrorToast('Please enter a name for the API key')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch(apiEndpoints.settings.apiKeys.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: keyName,
          expiresIn: parseInt(expiresIn)
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCreatedKey(data.key)
        showSuccessToast('API key created successfully')
        mutate(apiEndpoints.settings.apiKeys.base)
      } else {
        const data = await response.json()
        showErrorToast(data.error || 'Failed to create API key')
      }
    } catch {
      showErrorToast('Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyKey = async () => {
    if (createdKey?.fullKey) {
      await navigator.clipboard.writeText(createdKey.fullKey)
      setCopied(true)
      showSuccessToast('API key copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    createDialog.close()
    setKeyName('')
    setExpiresIn('0')
    setCreatedKey(null)
    setCopied(false)
  }

  return (
    <>
      <Button
        onClick={() => createDialog.open()}
        className='bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
      >
        <Plus className='mr-2 h-4 w-4' />
        Create API Key
      </Button>

      <ModalDialog
        open={createDialog.isOpen}
        onOpenChange={open => {
          if (open) {
            createDialog.open()
          } else {
            handleClose()
          }
        }}
        title={
          createdKey ? (
            <div className='flex items-center gap-2 text-green-600'>
              <CheckCircle className='h-5 w-5' />
              API Key Created Successfully
            </div>
          ) : (
            'Create New API Key'
          )
        }
        description={
          createdKey
            ? "Your API key has been created. Copy it now as you won't be able to see it again."
            : 'Create a new API key for external integrations'
        }
        showCancel={!createdKey}
        cancelText='Cancel'
        onCancel={handleClose}
        content={
          createdKey ? (
            <div className='space-y-4'>
              <Alert className='border-amber-200 bg-amber-50 dark:border-amber-900/20 dark:bg-amber-900/10'>
                <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                <AlertDescription className='text-amber-900 dark:text-amber-100'>
                  Save this API key securely. You won't be able to see it again
                  after closing this dialog.
                </AlertDescription>
              </Alert>

              <div className='space-y-2'>
                <Label>Your API Key</Label>
                <div className='flex gap-2'>
                  <Input
                    value={createdKey.fullKey}
                    readOnly
                    className='font-mono text-sm'
                  />
                  <Button variant='outline' size='sm' onClick={handleCopyKey}>
                    {copied ? (
                      <>
                        <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className='mr-2 h-4 w-4' />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/20 dark:bg-blue-900/10'>
                <p className='text-sm text-blue-900 dark:text-blue-100'>
                  <strong>Usage:</strong> Include this key in the Authorization
                  header:
                </p>
                <code className='mt-2 block text-xs text-blue-700 dark:text-blue-300'>
                  Authorization: Bearer {createdKey.fullKey}
                </code>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='key-name'>
                  API Key Name <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='key-name'
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  placeholder='e.g., Production API Key'
                  className='h-10'
                />
                <p className='text-muted-foreground text-xs'>
                  Choose a descriptive name to identify this key
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='expires-in'>Expiration</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger id='expires-in' className='h-10'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='0'>Never expires</SelectItem>
                    <SelectItem value='30'>30 days</SelectItem>
                    <SelectItem value='60'>60 days</SelectItem>
                    <SelectItem value='90'>90 days</SelectItem>
                    <SelectItem value='365'>1 year</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-muted-foreground text-xs'>
                  Set an expiration period for security
                </p>
              </div>
            </div>
          )
        }
        confirmText={createdKey ? 'Done' : 'Create Key'}
        confirmButtonVariant={createdKey ? 'default' : 'default'}
        confirmIcon={createdKey ? null : <Key className='h-4 w-4' />}
        onConfirm={createdKey ? handleClose : handleCreateKey}
        disableConfirmButton={!createdKey && (!keyName.trim() || isCreating)}
        asyncAction={!createdKey}
        loadingText='Creating...'
        maxWidth='lg'
      />
    </>
  )
}

export default function ApiKeysPage() {
  const { data: subscriptionData } = useSWR<Subscription>(
    apiEndpoints.user.subscription,
    swrFetcher
  )

  const hasEnterprise = subscriptionData?.currentPlan === 'enterprise'

  if (!hasEnterprise) {
    return (
      <ModernLayout
        title='API Keys'
        description='Generate and manage API keys for external integrations'
      >
        <ModernSection variant='gradient'>
          <div className='py-12 text-center'>
            <div className='mb-6 flex justify-center'>
              <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'>
                <Shield className='h-10 w-10' />
              </div>
            </div>
            <h2 className='mb-4 text-2xl font-bold'>Enterprise Feature</h2>
            <p className='text-muted-foreground mx-auto mb-8 max-w-md'>
              API keys are available exclusively for Enterprise plan
              subscribers. Upgrade to unlock API access and integrate with
              external applications.
            </p>
            <Link href={appRoutes.pricing}>
              <Button
                size='lg'
                className='bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
              >
                Upgrade to Enterprise
                <ExternalLink className='ml-2 h-4 w-4' />
              </Button>
            </Link>
          </div>
        </ModernSection>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout
      title='API Keys'
      description='Generate and manage API keys for external integrations'
    >
      <ModernGrid columns={1}>
        <ModernSection
          title='API Key Management'
          description='Create and manage API keys for programmatic access'
          variant='gradient'
        >
          <div className='space-y-6'>
            <Alert className='border-blue-200 bg-blue-50 dark:border-blue-900/20 dark:bg-blue-900/10'>
              <Info className='h-4 w-4 text-blue-600 dark:text-blue-400' />
              <AlertDescription className='text-blue-900 dark:text-blue-100'>
                API keys allow external applications to interact with your
                escrow service. Keep them secure and never share them publicly.{' '}
                <Link
                  href={appRoutes.apiDocs}
                  className='font-medium underline hover:no-underline'
                >
                  View API Documentation
                </Link>
              </AlertDescription>
            </Alert>

            <div className='mb-4 flex justify-end'>
              <CreateApiKeyDialog />
            </div>

            <ApiKeysList />

            <div className='grid gap-4 pt-4 md:grid-cols-3'>
              <div className='rounded-lg border p-4'>
                <div className='mb-2 flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white'>
                    <Activity className='h-5 w-5' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold'>10,000</p>
                    <p className='text-muted-foreground text-xs'>
                      Requests/hour
                    </p>
                  </div>
                </div>
              </div>

              <div className='rounded-lg border p-4'>
                <div className='mb-2 flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white'>
                    <Key className='h-5 w-5' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold'>10</p>
                    <p className='text-muted-foreground text-xs'>
                      Max API Keys
                    </p>
                  </div>
                </div>
              </div>

              <div className='rounded-lg border p-4'>
                <div className='mb-2 flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white'>
                    <Clock className='h-5 w-5' />
                  </div>
                  <div>
                    <p className='text-2xl font-bold'>99.9%</p>
                    <p className='text-muted-foreground text-xs'>Uptime SLA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModernSection>
      </ModernGrid>
    </ModernLayout>
  )
}
