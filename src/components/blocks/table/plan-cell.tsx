import { User, Users } from 'lucide-react'

interface PlanCellProps {
  personalPlan?: string | null
  teamPlan?: string | null
}

const planLabels: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
  team_pro: 'Team Pro',
  team_enterprise: 'Team Enterprise'
}

export function PlanCell({ personalPlan, teamPlan }: PlanCellProps) {
  const formatPlanName = (plan: string) => {
    return planLabels[plan] || plan
  }

  return (
    <div className='flex flex-col gap-1.5'>
      {personalPlan && (
        <div className='flex items-center gap-2'>
          <User className='text-muted-foreground h-3.5 w-3.5' />
          <span className='text-sm'>{formatPlanName(personalPlan)}</span>
        </div>
      )}
      {teamPlan && (
        <div className='flex items-center gap-2'>
          <Users className='text-muted-foreground h-3.5 w-3.5' />
          <span className='text-sm'>{formatPlanName(teamPlan)}</span>
        </div>
      )}
      {!personalPlan && !teamPlan && (
        <span className='text-muted-foreground text-sm'>No plan</span>
      )}
    </div>
  )
}
