'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useActionState, useRef } from 'react'

import {
  Loader2,
  Mail,
  UserPlus,
  Crown,
  Users,
  Sparkles,
  Check,
  X
} from 'lucide-react'
import useSWR from 'swr'

import { acceptInvitation } from '@/app/actions'
import { SignMessageButton } from '@/components/blocks/blockchain/sign-message-button'
import { ClientOnly } from '@/components/client-only'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'
import { useUnifiedWalletInfo } from '@/context'
import { useLoading } from '@/hooks/use-loading'
import { api } from '@/lib/api/http-client'
import { swrConfig, swrFetcher } from '@/lib/api/swr'

// Dynamically import Web3 components to prevent SSR issues
const UnifiedConnectButton = dynamic(
  () =>
    import('@/components/blocks/blockchain/unified-connect-button').then(
      mod => ({
        default: mod.UnifiedConnectButton
      })
    ),
  { ssr: false, loading: () => <Button disabled>Connect Wallet</Button> }
)

interface InvitePageProps {
  params: Promise<{
    token: string
  }>
}

export default function InvitePage({ params }: InvitePageProps) {
  const [invitation, setInvitation] = useState<any>(null)
  const { isLoading: loading, execute } = useLoading({ initialState: true })
  const [token, setToken] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const { isConnected } = useUnifiedWalletInfo()
  const { data: user } = useSWR(
    apiEndpoints.user.profile,
    swrFetcher,
    swrConfig
  )
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await acceptInvitation(prevState, formData)
    },
    {
      error: ''
    }
  )
  const router = useRouter()

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params
      setToken(resolvedParams.token)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!token) return

    async function fetchInvitation() {
      await execute(async () => {
        try {
          const result = await api.get(apiEndpoints.invitations.byToken(token!))
          setInvitation(result.success ? result.data.invitation : null)
        } catch (_error) {
          setInvitation(null)
        }
      }).catch(error => {
        console.error('Failed to fetch invitation:', error)
        setInvitation(null)
      })
    }

    fetchInvitation()
  }, [token])

  useEffect(() => {
    if ('success' in state && state.success) {
      router.push(appRoutes.dashboard.base)
    }
  }, [state, router])

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'>
        <div className='relative'>
          <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 blur-3xl' />
          <Loader2 className='relative h-12 w-12 animate-spin text-blue-600 dark:text-blue-400' />
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'>
        <div className='relative w-full max-w-md'>
          <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-red-500/10 to-orange-500/10 blur-xl' />
          <Card className='relative overflow-hidden border border-red-200/20 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-red-500/20 dark:bg-gray-900/80'>
            <CardHeader className='relative space-y-6 p-8'>
              <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50'>
                <div className='flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600'>
                  <X className='h-8 w-8 text-white' />
                </div>
              </div>
              <CardTitle className='bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-center text-3xl font-bold text-transparent dark:from-white dark:to-gray-300'>
                Invalid Invitation
              </CardTitle>
            </CardHeader>
            <CardContent className='relative p-8 pt-0 text-center'>
              <p className='mb-8 text-lg text-gray-600 dark:text-gray-400'>
                This invitation link is invalid or has expired. Please contact
                your team administrator for a new invitation.
              </p>
              <Button
                onClick={() => router.push(appRoutes.home)}
                size='lg'
                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
              >
                Return to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'>
      <div className='absolute inset-0 bg-[url("/grid.svg")] [mask-image:linear-gradient(180deg,black,transparent)] bg-center opacity-5' />

      <div className='relative w-full max-w-lg'>
        <div className='absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl' />

        <Card className='relative overflow-hidden border border-gray-200/50 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80'>
          <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5' />

          <CardHeader className='relative space-y-6 p-8 pb-6'>
            <div className='flex justify-center'>
              <div className='relative'>
                <div className='absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-30 blur-xl' />
                <div className='relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50'>
                  <div className='flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg'>
                    <Mail className='h-10 w-10 text-white' />
                  </div>
                </div>
              </div>
            </div>

            <div className='space-y-3 text-center'>
              <h1 className='bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-4xl font-bold text-transparent dark:from-white dark:to-gray-300'>
                Team Invitation
              </h1>
              <p className='text-lg text-gray-600 dark:text-gray-400'>
                You've been invited to join an amazing team!
              </p>
            </div>
          </CardHeader>

          <CardContent className='relative space-y-6 p-8'>
            <div className='rounded-2xl border border-gray-200/50 bg-gradient-to-br from-gray-50/50 to-gray-100/50 p-6 backdrop-blur-sm dark:border-gray-700/50 dark:from-gray-800/50 dark:to-gray-900/50'>
              <div className='space-y-5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50'>
                      <Users className='h-6 w-6 text-blue-700 dark:text-blue-400' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                        Team Name
                      </p>
                      <p className='text-lg font-bold text-gray-900 dark:text-white'>
                        {invitation.teamName}
                      </p>
                    </div>
                  </div>
                  <Sparkles className='h-5 w-5 text-amber-500' />
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50'>
                      {invitation.role === 'owner' ? (
                        <Crown className='h-6 w-6 text-purple-700 dark:text-purple-400' />
                      ) : (
                        <UserPlus className='h-6 w-6 text-purple-700 dark:text-purple-400' />
                      )}
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                        Your Role
                      </p>
                      <p className='text-lg font-bold text-gray-900 capitalize dark:text-white'>
                        {invitation.role}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='border-t border-gray-200 pt-5 dark:border-gray-700'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='font-medium text-gray-500 dark:text-gray-400'>
                        Invited by
                      </span>
                      <span className='font-semibold text-gray-900 dark:text-white'>
                        {invitation.invitedBy}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='font-medium text-gray-500 dark:text-gray-400'>
                        Expires on
                      </span>
                      <span className='font-semibold text-gray-900 dark:text-white'>
                        {new Date(invitation.expiresAt).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ClientOnly
              fallback={
                <div className='flex h-20 items-center justify-center'>
                  <Loader2 className='h-6 w-6 animate-spin text-purple-400' />
                </div>
              }
            >
              {!isConnected ? (
                <div className='space-y-6'>
                  <div className='rounded-xl border border-blue-200 bg-blue-50 p-5 text-center dark:border-blue-800 dark:bg-blue-950/50'>
                    <p className='text-base font-medium text-blue-900 dark:text-blue-200'>
                      Connect your wallet to accept this invitation
                    </p>
                  </div>
                  <div className='flex justify-center'>
                    <UnifiedConnectButton />
                  </div>
                </div>
              ) : !user ? (
                <div className='space-y-6'>
                  <div className='rounded-xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-800 dark:bg-amber-950/50'>
                    <p className='text-base font-medium text-amber-900 dark:text-amber-200'>
                      Please sign the message to verify your wallet ownership
                    </p>
                  </div>
                  <div className='flex justify-center'>
                    <SignMessageButton className='bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl' />
                  </div>
                </div>
              ) : (
                <form ref={formRef} action={formAction} className='space-y-6'>
                  <input type='hidden' name='token' value={token || ''} />

                  {'error' in state && state.error && (
                    <div className='space-y-3 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/50'>
                      <p className='text-center text-base font-medium text-red-900 dark:text-red-200'>
                        {state.error}
                      </p>
                      {state.error?.includes('Team Settings') && (
                        <div className='flex justify-center'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              router.push(appRoutes.dashboard.settings.team)
                            }
                            className='border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70'
                          >
                            Go to Team Settings
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className='flex gap-4'>
                    <Button
                      type='button'
                      variant='outline'
                      size='lg'
                      onClick={async () => {
                        try {
                          await api.post(
                            apiEndpoints.invitations.decline(token!)
                          )
                          router.push(appRoutes.home)
                        } catch (error) {
                          console.error('Failed to decline invitation:', error)
                          router.push(appRoutes.home)
                        }
                      }}
                      className='flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      disabled={isPending}
                    >
                      <X className='mr-2 h-5 w-5' />
                      Decline
                    </Button>
                    <Button
                      type='submit'
                      size='lg'
                      disabled={isPending}
                      className='flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
                    >
                      {isPending ? (
                        <>
                          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <Check className='mr-2 h-5 w-5' />
                          Accept Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </ClientOnly>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
