'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useActionState, useState } from 'react'

import {
  Loader2,
  User as UserIcon,
  Mail,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Camera,
  Upload,
  X,
  Trash2,
  Shield,
  Key,
  AlertTriangle,
  Database,
  Users,
  CreditCard,
  Activity,
  Clock
} from 'lucide-react'
import useSWR, { mutate } from 'swr'

import { updateAccount, deleteAccount } from '@/app/actions'
import { SignMessageButton } from '@/components/blocks/blockchain/sign-message-button'
import { ModalDialog } from '@/components/blocks/modal-utils'
import {
  showSuccessToast,
  showErrorToast,
  showTransactionToast,
  updateTransactionToast
} from '@/components/blocks/toast-manager'
import { UserAvatar } from '@/components/blocks/user-avatar'
import {
  ModernLayout,
  ModernSection,
  ModernGrid
} from '@/components/layout/modern-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useUnifiedWalletInfo } from '@/context'
import { useWalletDisconnect } from '@/hooks/blockchain/use-wallet-disconnect'
import { useDialogState } from '@/hooks/use-dialog-state'
import { swrFetcher } from '@/lib/api/swr'
import type { User } from '@/lib/db/schema'

type UserWithPendingEmail = User & {
  pendingEmail?: string | null
}

type ActionState = {
  name?: string
  error?: string
  success?: string
}

type DeleteState = {
  password?: string
  error?: string
  success?: string
}

function AccountInformationSkeleton() {
  return (
    <ModernSection>
      <div className='animate-pulse space-y-6'>
        <div className='space-y-2'>
          <div className='bg-muted h-4 w-16 rounded'></div>
          <div className='bg-muted h-10 w-full rounded'></div>
        </div>
        <div className='space-y-2'>
          <div className='bg-muted h-4 w-24 rounded'></div>
          <div className='bg-muted h-10 w-full rounded'></div>
        </div>
        <div className='bg-muted h-10 w-32 rounded'></div>
      </div>
    </ModernSection>
  )
}

function AccountInformation() {
  const { data } = useSWR<{ user: UserWithPendingEmail }>(
    apiEndpoints.user.profile,
    swrFetcher
  )
  const user = data?.user
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  )
  const searchParams = useSearchParams()
  const [isResending, setIsResending] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false)

  // Handle query parameters for email verification
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'email-verified') {
      showSuccessToast('Email verified successfully!')
      // Clean up URL
      window.history.replaceState({}, '', appRoutes.dashboard.settings.base)
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        'missing-token': 'Verification link is invalid',
        'invalid-token': 'Verification link is invalid',
        'expired-token': 'Verification link has expired',
        'verification-failed': 'Email verification failed',
        'email-already-verified':
          'This email is already verified by another user'
      }
      showErrorToast(errorMessages[error] || 'Verification failed')
      // Clean up URL
      window.history.replaceState({}, '', appRoutes.dashboard.settings.base)
    }
  }, [searchParams])

  // Refresh user data and show toast when update is successful
  useEffect(() => {
    if (state.success) {
      mutate(apiEndpoints.user.profile)
      showSuccessToast(state.success)
    }
    if (state.error) {
      showErrorToast(state.error)
    }
  }, [state.success, state.error])

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const response = await fetch(apiEndpoints.auth.resendVerification, {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        showSuccessToast('Verification email sent successfully!')
      } else {
        if (data.error === 'This email is already verified by another user') {
          // Refresh user data to remove pending email from UI
          mutate(apiEndpoints.user.profile)
          showErrorToast('This email has already been verified by another user')
        } else if (data.error === 'Email is already verified') {
          // Refresh user data to update UI
          mutate(apiEndpoints.user.profile)
          showSuccessToast('Email is already verified')
        } else {
          showErrorToast(data.error || 'Failed to send verification email')
        }
      }
    } catch (_error) {
      showErrorToast('Failed to send verification email')
    } finally {
      setIsResending(false)
    }
  }

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    try {
      // Use centralized upload API
      const formData = new FormData()
      formData.append('files', file)
      formData.append('uploadType', 'AVATARS')
      formData.append('context', `user-${user?.id}`)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        showSuccessToast('Avatar uploaded successfully!')
        mutate(apiEndpoints.user.profile)
      } else {
        showErrorToast(data.error || 'Failed to upload avatar')
      }
    } catch (_error) {
      showErrorToast('Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleAvatarDelete = async () => {
    setIsDeletingAvatar(true)
    try {
      const response = await fetch('/api/upload?type=AVATARS', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        showSuccessToast('Avatar removed successfully!')
        mutate(apiEndpoints.user.profile)
      } else {
        showErrorToast('Failed to remove avatar')
      }
    } catch (_error) {
      showErrorToast('Failed to remove avatar')
    } finally {
      setIsDeletingAvatar(false)
    }
  }

  return (
    <ModernSection
      title='Account Information'
      description='Update your personal details and preferences'
      variant='gradient'
    >
      <form className='space-y-6' action={formAction}>
        {/* Avatar Upload Section */}
        <div className='space-y-4'>
          <Label className='flex items-center gap-2 text-sm font-medium'>
            <Camera className='text-muted-foreground h-4 w-4' />
            Profile Picture
          </Label>
          <div className='flex items-center gap-6'>
            <UserAvatar
              user={user}
              size='xl'
              className='border-2 border-gray-200 dark:border-gray-700'
              fallbackClassName='text-lg'
            />
            <div className='flex flex-col gap-2'>
              <div className='flex gap-2'>
                <Label htmlFor='avatar-upload' className='cursor-pointer'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={isUploadingAvatar}
                    className='pointer-events-none'
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Spinner size='sm' className='mr-2' />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className='mr-2 h-4 w-4' />
                        Upload Avatar
                      </>
                    )}
                  </Button>
                </Label>
                <input
                  id='avatar-upload'
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
                {user?.avatarPath && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAvatarDelete}
                    disabled={isDeletingAvatar}
                  >
                    {isDeletingAvatar ? (
                      <>
                        <Spinner size='sm' className='mr-2' />
                        Removing...
                      </>
                    ) : (
                      <>
                        <X className='mr-2 h-4 w-4' />
                        Remove
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className='text-muted-foreground text-xs'>
                JPG, JPEG, PNG, GIF, WebP or SVG. Max size: 5MB
              </p>
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Label
            htmlFor='name'
            className='flex items-center gap-2 text-sm font-medium'
          >
            <UserIcon className='text-muted-foreground h-4 w-4' />
            Display Name
          </Label>
          <Input
            id='name'
            name='name'
            placeholder='Enter your display name'
            defaultValue={user?.name || ''}
            key={user?.name}
            className='h-11'
            required
          />
          <p className='text-muted-foreground text-xs'>
            This is how you'll appear to other team members
          </p>
        </div>

        <div className='space-y-2'>
          <Label
            htmlFor='email'
            className='flex items-center gap-2 text-sm font-medium'
          >
            <Mail className='text-muted-foreground h-4 w-4' />
            Email Address
          </Label>
          <div className='space-y-2'>
            <Input
              id='email'
              name='email'
              type='email'
              placeholder='Enter your email address'
              defaultValue={user?.email || ''}
              key={user?.email}
              className='h-11'
            />
            {user?.pendingEmail && user?.pendingEmail !== user?.email && (
              <div className='flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20'>
                <div className='flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 text-amber-600 dark:text-amber-500' />
                  <span className='text-sm text-amber-900 dark:text-amber-100'>
                    Pending email verification: {user.pendingEmail}
                  </span>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className='text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300'
                >
                  {isResending ? (
                    <>
                      <RefreshCw className='mr-2 h-3 w-3 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Resend verification'
                  )}
                </Button>
              </div>
            )}
            {user?.email && !user?.emailVerified && !user?.pendingEmail && (
              <div className='flex items-center gap-2 text-amber-600 dark:text-amber-500'>
                <AlertCircle className='h-4 w-4' />
                <span className='text-sm'>Email not verified</span>
              </div>
            )}
            {user?.email && user?.emailVerified && (
              <div className='flex items-center gap-2 text-green-600 dark:text-green-500'>
                <CheckCircle2 className='h-4 w-4' />
                <span className='text-sm'>Email verified</span>
              </div>
            )}
          </div>
          <p className='text-muted-foreground text-xs'>
            Used for team invitations and important notifications
          </p>
        </div>

        <Button
          type='submit'
          className='bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          disabled={isPending}
          size='lg'
        >
          {isPending ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Saving changes...
            </>
          ) : (
            <>
              <Save className='mr-2 h-4 w-4' />
              Save Changes
            </>
          )}
        </Button>
      </form>
    </ModernSection>
  )
}

function AccountStats() {
  const { data } = useSWR<{ user: UserWithPendingEmail }>(
    apiEndpoints.user.profile,
    swrFetcher
  )
  const user = data?.user

  const stats = [
    {
      label: 'Account Type',
      value: user?.role === 'admin' ? 'Administrator' : 'User',
      color: 'from-purple-500 to-indigo-600'
    },
    {
      label: 'Member Since',
      value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        : 'N/A',
      color: 'from-blue-500 to-cyan-600'
    }
  ]

  return (
    <ModernGrid columns={2}>
      {stats.map((stat, index) => (
        <ModernSection key={index} variant='gradient'>
          <div className='text-center'>
            <div
              className={`mb-2 h-1 w-full rounded-full bg-gradient-to-r ${stat.color}`}
            />
            <p className='text-foreground text-lg font-semibold'>
              {stat.value}
            </p>
            <p className='text-muted-foreground text-sm'>{stat.label}</p>
          </div>
        </ModernSection>
      ))}
    </ModernGrid>
  )
}

function SecuritySettings() {
  const { disconnect: walletDisconnect } = useUnifiedWalletInfo()
  const { disconnect } = useWalletDisconnect()
  const [authError, setAuthError] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const deleteDialog = useDialogState()
  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {})
  const [toastId, setToastId] = useState<string | number | null>(null)

  // Handle successful deletion
  useEffect(() => {
    if (deleteState.success) {
      // Update toast to success
      if (toastId) {
        updateTransactionToast(toastId, 'confirmed', {
          message: 'Account Deleted',
          description: 'Your account has been permanently deleted'
        })
      }
      // Close the modal before disconnecting
      deleteDialog.close()
      // Small delay to ensure toast is visible before redirect
      setTimeout(() => {
        // Disconnect wallet using centralized disconnect
        disconnect(walletDisconnect)
        // Note: disconnect function already handles redirect
      }, 1000)
    }
  }, [deleteState.success, disconnect, walletDisconnect, toastId, deleteDialog])

  // Show toast notification when deletion has an error
  useEffect(() => {
    if (deleteState.error) {
      // Update toast to failed if we have one
      if (toastId) {
        updateTransactionToast(toastId, 'failed', {
          message: 'Deletion Failed',
          description: deleteState.error
        })
      }

      if (deleteState.error.includes('User is not authenticated')) {
        setAuthError(true)
      }
    }
  }, [deleteState.error, toastId])

  const handleDeleteAccount = async () => {
    if (confirmationText.toUpperCase() !== 'DELETE') {
      showErrorToast('Please type "DELETE" to confirm')
      throw new Error('Invalid confirmation')
    }

    // Show processing toast
    const id = showTransactionToast('processing', {
      message: 'Deleting Account',
      description: 'Please wait while we permanently delete your account...',
      dismissible: false
    })
    setToastId(id)

    const formData = new FormData()
    formData.append('password', confirmationText)

    setAuthError(false)
    await deleteAction(formData)
  }

  return (
    <>
      {authError && (
        <Alert className='mb-6'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className='space-y-2'>
            <p>You need to sign a message to access this page.</p>
            <SignMessageButton size='sm' className='mt-2' />
          </AlertDescription>
        </Alert>
      )}
      <ModernGrid columns={2}>
        <ModernSection
          title='Wallet Authentication'
          description='Your secure Web3 authentication status'
          variant='gradient'
        >
          <div className='space-y-6'>
            <div className='flex items-center space-x-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg'>
                <Shield className='h-6 w-6' />
              </div>
              <div>
                <h3 className='text-foreground font-semibold'>
                  Wallet Secured
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Protected by your private key
                </p>
              </div>
            </div>

            <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/20 dark:bg-blue-900/10'>
              <div className='flex items-start space-x-3'>
                <Key className='mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400' />
                <div>
                  <p className='text-sm font-medium text-blue-900 dark:text-blue-100'>
                    No Password Required
                  </p>
                  <p className='mt-1 text-xs text-blue-700 dark:text-blue-300'>
                    Your wallet signature is your secure authentication method.
                    Keep your private key safe and never share it.
                  </p>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <h4 className='text-foreground font-medium'>Security Features</h4>
              <ul className='text-muted-foreground space-y-2 text-sm'>
                <li className='flex items-center'>
                  <div className='mr-2 h-1.5 w-1.5 rounded-full bg-green-500'></div>
                  Cryptographic signature verification
                </li>
                <li className='flex items-center'>
                  <div className='mr-2 h-1.5 w-1.5 rounded-full bg-green-500'></div>
                  No password storage required
                </li>
                <li className='flex items-center'>
                  <div className='mr-2 h-1.5 w-1.5 rounded-full bg-green-500'></div>
                  Secure wallet-based sessions
                </li>
              </ul>
            </div>
          </div>
        </ModernSection>

        <ModernSection
          title='Account Management'
          description='Advanced account and data management'
        >
          <div className='space-y-6'>
            <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/20 dark:bg-amber-900/10'>
              <div className='flex items-start space-x-3'>
                <AlertTriangle className='mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400' />
                <div>
                  <p className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                    Danger Zone
                  </p>
                  <p className='mt-1 text-xs text-amber-700 dark:text-amber-300'>
                    Account deletion is permanent and cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant='destructive'
              className='w-full'
              size='lg'
              disabled={isDeletePending}
              onClick={() => deleteDialog.open()}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete Account Permanently
            </Button>

            <ModalDialog
              open={deleteDialog.isOpen}
              onOpenChange={open => {
                if (open) {
                  deleteDialog.open()
                } else {
                  deleteDialog.close()
                  setConfirmationText('')
                  setToastId(null)
                }
              }}
              title={
                <div className='flex items-center gap-2 text-red-600'>
                  <AlertTriangle className='h-5 w-5' />
                  Delete Account Permanently
                </div>
              }
              description='This action will permanently delete your account and all associated data. This cannot be undone.'
              showCancel={true}
              cancelText='Cancel'
              onCancel={() => deleteDialog.close()}
              content={
                <div className='space-y-4'>
                  <div className='space-y-3'>
                    <h4 className='text-foreground font-medium'>
                      The following data will be permanently deleted:
                    </h4>
                    <div className='grid gap-2'>
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Database className='h-4 w-4' />
                        Your user account and profile information
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Users className='h-4 w-4' />
                        Team memberships and ownership transfers
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Activity className='h-4 w-4' />
                        All activity logs and history
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Mail className='h-4 w-4' />
                        Team invitations (sent and received)
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <CreditCard className='h-4 w-4' />
                        Payment history and transaction records
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Clock className='h-4 w-4' />
                        Session data and authentication tokens
                      </div>
                    </div>
                  </div>

                  <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/20 dark:bg-blue-900/10'>
                    <p className='text-xs text-blue-700 dark:text-blue-300'>
                      <strong>Note:</strong> If you are the only owner of a team
                      with other members, ownership will be automatically
                      transferred to the earliest member before deletion.
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label
                      htmlFor='confirmation-input'
                      className='text-sm font-medium'
                    >
                      Type "DELETE" to confirm:
                    </Label>
                    <Input
                      id='confirmation-input'
                      value={confirmationText}
                      onChange={e => setConfirmationText(e.target.value)}
                      placeholder='Type DELETE to confirm'
                      className='h-10'
                    />
                  </div>
                </div>
              }
              confirmText='Delete Account'
              confirmButtonVariant='destructive'
              confirmIcon={<Trash2 className='h-4 w-4' />}
              onConfirm={handleDeleteAccount}
              disableConfirmButton={
                confirmationText.toUpperCase() !== 'DELETE' || isDeletePending
              }
              asyncAction={true}
              loadingText='Deleting...'
              maxWidth='2xl'
            />
          </div>
        </ModernSection>
      </ModernGrid>
    </>
  )
}

export default function GeneralPage() {
  return (
    <ModernLayout
      title='Settings'
      description='Manage your account information, preferences, and security'
    >
      <AccountStats />

      <ModernGrid columns={1}>
        <Suspense fallback={<AccountInformationSkeleton />}>
          <AccountInformation />
        </Suspense>
      </ModernGrid>

      <SecuritySettings />
    </ModernLayout>
  )
}
