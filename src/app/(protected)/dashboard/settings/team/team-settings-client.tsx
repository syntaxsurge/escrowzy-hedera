'use client'

import { useActionState, useEffect } from 'react'

import { Loader2, PlusCircle, LogOut } from 'lucide-react'
import { mutate } from 'swr'

import { inviteTeamMember, leaveTeam } from '@/app/actions'
import { modalConfirmAsync } from '@/components/blocks/modal-utils'
import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { apiEndpoints } from '@/config/api-endpoints'
import { appRoutes } from '@/config/app-routes'

type ActionState = {
  error?: string
  success?: string
}

export function InviteTeamMemberForm() {
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {})

  useEffect(() => {
    if (inviteState.success) {
      mutate(apiEndpoints.team)
      showSuccessToast(inviteState.success)
    }
    if (inviteState.error) {
      showErrorToast(inviteState.error)
    }
  }, [inviteState.success, inviteState.error])

  return (
    <form action={inviteAction} className='space-y-6'>
      <div className='space-y-2'>
        <Label htmlFor='email' className='text-sm font-medium'>
          Email Address
        </Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder='Enter team member email'
          className='h-11'
          required
          key={inviteState.success}
        />
      </div>

      <div className='space-y-3'>
        <Label className='text-sm font-medium'>Role</Label>
        <RadioGroup
          defaultValue='member'
          name='role'
          className='grid grid-cols-2 gap-4'
        >
          <div className='border-border flex items-center space-x-3 rounded-lg border p-3'>
            <RadioGroupItem value='member' id='member' />
            <Label htmlFor='member' className='flex-1 cursor-pointer'>
              <div>
                <p className='font-medium'>Member</p>
                <p className='text-muted-foreground text-xs'>Standard access</p>
              </div>
            </Label>
          </div>
          <div className='border-border flex items-center space-x-3 rounded-lg border p-3'>
            <RadioGroupItem value='owner' id='owner' />
            <Label htmlFor='owner' className='flex-1 cursor-pointer'>
              <div>
                <p className='font-medium'>Owner</p>
                <p className='text-muted-foreground text-xs'>Full access</p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Button
        type='submit'
        className='w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
        disabled={isInvitePending}
        size='lg'
      >
        {isInvitePending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Sending invitation...
          </>
        ) : (
          <>
            <PlusCircle className='mr-2 h-4 w-4' />
            Send Invitation
          </>
        )}
      </Button>
    </form>
  )
}

interface LeaveTeamButtonProps {
  teamData: any
  currentUserRole: string
  currentUserId: number
}

export function LeaveTeamButton({
  teamData,
  currentUserRole,
  currentUserId
}: LeaveTeamButtonProps) {
  const [leaveState, leaveAction, isLeavePending] = useActionState<
    ActionState,
    FormData
  >(leaveTeam, {})

  useEffect(() => {
    if (leaveState.success) {
      mutate(apiEndpoints.team)
      showSuccessToast(leaveState.success)
      // Redirect to dashboard after leaving team
      window.location.href = appRoutes.dashboard.base
    }
    if (leaveState.error) {
      showErrorToast(leaveState.error)
    }
  }, [leaveState.success, leaveState.error])

  const teamMemberCount = teamData?.teamMembers?.length || 0
  const isIntrinsicTeam = teamMemberCount <= 1
  const ownerCount =
    teamData?.teamMembers?.filter((member: any) => member.role === 'owner')
      .length || 0
  const isLastOwner = currentUserRole === 'owner' && ownerCount === 1
  const oldestMember = teamData?.teamMembers
    ?.filter(
      (member: any) =>
        member.userId !== currentUserId && member.role === 'member'
    )
    ?.sort(
      (a: any, b: any) =>
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    )[0]

  // Don't show leave button for intrinsic teams (single member)
  if (isIntrinsicTeam) {
    return null
  }

  const getLeaveScenarioMessage = () => {
    if (isLastOwner && oldestMember) {
      return `As the only owner, ownership will be automatically transferred to ${oldestMember.user.name || oldestMember.user.walletAddress} (the oldest team member) before you leave.`
    } else if (isLastOwner && !oldestMember) {
      return 'You cannot leave as the only owner of this team. Please promote another member to owner first, or remove all other members to dissolve the team.'
    } else if (currentUserRole === 'owner') {
      return 'You will leave the team as an owner. Other owners will continue to manage the team.'
    } else {
      return 'You will leave the team as a member.'
    }
  }

  const canLeave = !isLastOwner || oldestMember

  const handleLeaveTeam = async () => {
    if (!canLeave) {
      showErrorToast(
        'Cannot leave team',
        'As the only owner with no other members to promote, you cannot leave this team.'
      )
      return
    }

    await modalConfirmAsync(
      <div className='space-y-3'>
        <p className='text-foreground font-medium'>
          What happens when you leave:
        </p>

        <div className='space-y-2 text-sm'>
          <div className='flex items-start gap-2'>
            <span className='mt-1 text-blue-500'>•</span>
            <span>{getLeaveScenarioMessage()}</span>
          </div>

          <div className='flex items-start gap-2'>
            <span className='mt-1 text-blue-500'>•</span>
            <span>
              You will be moved back to your personal team automatically.
            </span>
          </div>

          <div className='flex items-start gap-2'>
            <span className='mt-1 text-blue-500'>•</span>
            <span>
              This action cannot be undone - you'll need a new invitation to
              rejoin.
            </span>
          </div>

          <div className='flex items-start gap-2'>
            <span className='mt-1 text-blue-500'>•</span>
            <span>
              Your personal team will remain intact with all your individual
              data.
            </span>
          </div>
        </div>
      </div>,
      async () => {
        const formData = new FormData()
        await leaveAction(formData)
      },
      {
        title: (
          <div className='flex items-center gap-2'>
            <LogOut className='h-5 w-5 text-red-500' />
            Leave Team Confirmation
          </div>
        ),
        confirmText: 'Leave Team',
        confirmButtonVariant: 'destructive',
        confirmIcon: <LogOut className='h-4 w-4' />,
        maxWidth: 'lg',
        loadingText: 'Leaving team...'
      }
    )
  }

  return (
    <Button
      variant='destructive'
      size='sm'
      className='bg-red-600 text-white hover:bg-red-700'
      disabled={isLeavePending || !canLeave}
      onClick={handleLeaveTeam}
    >
      <LogOut className='mr-2 h-4 w-4' />
      Leave Team
    </Button>
  )
}
