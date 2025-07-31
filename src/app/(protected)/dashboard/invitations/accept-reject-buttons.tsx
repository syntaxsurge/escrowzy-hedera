'use client'

import { useActionState, useEffect } from 'react'

import { CheckCircle2, XCircle, Loader2, Settings } from 'lucide-react'

import { acceptInvitation, rejectInvitation } from '@/app/actions'
import {
  showSuccessToast,
  showErrorToast
} from '@/components/blocks/toast-manager'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { appRoutes } from '@/config/app-routes'

type ActionState = {
  error?: string
  success?: string
}

export function AcceptRejectButtons({
  invitationId
}: {
  invitationId: string
}) {
  const [acceptState, acceptAction, isAcceptPending] = useActionState<
    ActionState,
    FormData
  >(acceptInvitation, {})

  const [rejectState, rejectAction, isRejectPending] = useActionState<
    ActionState,
    FormData
  >(rejectInvitation, {})

  useEffect(() => {
    if (acceptState.success) {
      showSuccessToast(acceptState.success)
      // Redirect to team settings after accepting
      window.location.href = appRoutes.dashboard.settings.team
    }
    if (acceptState.error) {
      showErrorToast(
        acceptState.error,
        acceptState.error.includes('Team Settings')
          ? 'Go to Team Settings to manage your team.'
          : undefined
      )
    }
  }, [acceptState.success, acceptState.error])

  useEffect(() => {
    if (rejectState.success) {
      showSuccessToast(rejectState.success)
      // Refresh the page to update the list
      window.location.reload()
    }
    if (rejectState.error) {
      showErrorToast(rejectState.error)
    }
  }, [rejectState.success, rejectState.error])

  const isLoading = isAcceptPending || isRejectPending

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Settings className='h-4 w-4' />
          )}
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <form action={acceptAction}>
          <input type='hidden' name='invitationId' value={invitationId} />
          <DropdownMenuItem asChild>
            <button
              type='submit'
              className='w-full cursor-pointer text-green-600 dark:text-green-400'
              disabled={isLoading}
            >
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Accept
            </button>
          </DropdownMenuItem>
        </form>
        <form action={rejectAction}>
          <input type='hidden' name='invitationId' value={invitationId} />
          <DropdownMenuItem asChild>
            <button
              type='submit'
              className='text-destructive w-full cursor-pointer'
              disabled={isLoading}
            >
              <XCircle className='mr-2 h-4 w-4' />
              Decline
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
