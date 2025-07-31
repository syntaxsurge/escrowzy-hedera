'use client'

import { useEffect, useState } from 'react'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { format } from 'date-fns'
import {
  Users,
  Activity,
  Shield,
  TrendingUp,
  UserCheck,
  UsersIcon,
  BarChart3,
  Loader2,
  DollarSign
} from 'lucide-react'
import { Line, Bar } from 'react-chartjs-2'

import { showErrorToast } from '@/components/blocks/toast-manager'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { apiEndpoints } from '@/config/api-endpoints'
import { useUnifiedChainInfo } from '@/context'
import { useLoading } from '@/hooks/use-loading'
import { api } from '@/lib/api/http-client'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PlatformStats {
  users: {
    totalUsers: number
    emailUsers: number
    adminUsers: number
    walletUsers: number
  }
  plans: {
    totalTeams: number
    freeTeams: number
    proTeams: number
    enterpriseTeams: number
  }
  activity: {
    totalActivities: number
    todayActivities: number
    weekActivities: number
  }
  teams: {
    totalTeams: number
    totalTeamMembers: number
    avgTeamSize: number
  }
  charts: {
    recentSignups: Array<{ date: string; count: number }>
    teamCreationTrend: Array<{ date: string; count: number }>
  }
}

interface ContractEarnings {
  totalUSD: number
  totalNative: string
  nativeCurrency: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [earnings, setEarnings] = useState<ContractEarnings | null>(null)
  const { isLoading: loading, execute } = useLoading({ initialState: true })
  const { chainId } = useUnifiedChainInfo()

  useEffect(() => {
    Promise.all([fetchStats(), fetchEarnings()])
  }, [chainId])

  const fetchStats = async () => {
    await execute(async () => {
      const response = await api.get(apiEndpoints.admin.stats)
      if (!response.success)
        throw new Error(response.error || 'Failed to fetch stats')

      setStats(response.data)
    }).catch(() => {
      showErrorToast('Error', 'Failed to fetch platform statistics')
    })
  }

  const fetchEarnings = async () => {
    try {
      const response = await api.get(
        `${apiEndpoints.admin.contract.earnings}?chainId=${chainId}`,
        { shouldShowErrorToast: false }
      )
      if (response.success && response.data.earnings) {
        setEarnings(response.data.earnings)
      }
    } catch (_error) {
      // Silently fail - earnings might not be available on all chains
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className='py-8 text-center'>
        <p className='text-muted-foreground'>Failed to load statistics</p>
      </div>
    )
  }

  const signupChartData = {
    labels: stats.charts.recentSignups.map(d =>
      format(new Date(d.date), 'MMM d')
    ),
    datasets: [
      {
        label: 'New Users',
        data: stats.charts.recentSignups.map(d => d.count),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const teamChartData = {
    labels: stats.charts.teamCreationTrend.map(d =>
      format(new Date(d.date), 'MMM d')
    ),
    datasets: [
      {
        label: 'New Teams',
        data: stats.charts.teamCreationTrend.map(d => d.count),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  }

  return (
    <div className='space-y-8'>
      <div className='relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 shadow-2xl'>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20' />
        <div className='absolute -top-4 -right-4 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-3xl' />
        <div className='absolute -bottom-4 -left-4 h-72 w-72 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl' />
        <div className='relative z-10'>
          <h1 className='bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-4xl font-bold text-transparent'>
            Admin Dashboard
          </h1>
          <p className='mt-3 max-w-2xl text-lg text-slate-300'>
            Comprehensive platform insights and management tools for monitoring
            user activity, revenue trends, and system performance.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='group relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20'>
          <div className='absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <CardHeader className='relative flex flex-row items-center justify-between space-y-0 pb-3'>
            <CardTitle className='text-sm font-semibold text-slate-600 dark:text-slate-300'>
              Total Users
            </CardTitle>
            <div className='rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg shadow-blue-500/30'>
              <Users className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative'>
            <div className='text-3xl font-bold text-blue-600 dark:text-blue-400'>
              {stats.users.totalUsers.toLocaleString()}
            </div>
            <div className='mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400'>
              <div className='flex items-center gap-1'>
                <UserCheck className='h-3 w-3' />
                <span>{stats.users.emailUsers}</span>
              </div>
              <span>•</span>
              <span>
                {stats.users.totalUsers > 0
                  ? (
                      (stats.users.emailUsers / stats.users.totalUsers) *
                      100
                    ).toFixed(0)
                  : 0}
                % with email
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20'>
          <div className='absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <CardHeader className='relative flex flex-row items-center justify-between space-y-0 pb-3'>
            <CardTitle className='text-sm font-semibold text-slate-600 dark:text-slate-300'>
              Total Teams
            </CardTitle>
            <div className='rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-3 shadow-lg shadow-orange-500/30'>
              <UsersIcon className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative'>
            <div className='text-3xl font-bold text-orange-600 dark:text-orange-400'>
              {stats.teams.totalTeams}
            </div>
            <div className='mt-2 text-xs text-slate-500 dark:text-slate-400'>
              {stats.teams.totalTeamMembers} total members
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20'>
          <div className='absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <CardHeader className='relative flex flex-row items-center justify-between space-y-0 pb-3'>
            <CardTitle className='text-sm font-semibold text-slate-600 dark:text-slate-300'>
              Activity Today
            </CardTitle>
            <div className='rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-3 shadow-lg shadow-purple-500/30'>
              <Activity className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative'>
            <div className='text-3xl font-bold text-purple-600 dark:text-purple-400'>
              {stats.activity.todayActivities}
            </div>
            <div className='mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400'>
              <span>{stats.activity.weekActivities} this week</span>
              <span>•</span>
              <span>
                {stats.activity.totalActivities.toLocaleString()} total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-0 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20'>
          <div className='absolute inset-0 rounded-lg bg-gradient-to-br from-yellow-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <CardHeader className='relative flex flex-row items-center justify-between space-y-0 pb-3'>
            <CardTitle className='text-sm font-semibold text-slate-600 dark:text-slate-300'>
              Total Revenue
            </CardTitle>
            <div className='rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 shadow-lg shadow-yellow-500/30'>
              <DollarSign className='h-5 w-5 text-white' />
            </div>
          </CardHeader>
          <CardContent className='relative'>
            <div className='text-3xl font-bold text-yellow-600 dark:text-yellow-400'>
              ${earnings?.totalUSD.toFixed(2) || '0.00'}
            </div>
            <div className='mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400'>
              <span>
                {earnings?.totalNative || '0'}{' '}
                {earnings?.nativeCurrency || 'ETH'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card className='group relative overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl'>
          <div className='absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-purple-600/10 dark:from-blue-500/30 dark:via-indigo-500/20 dark:to-purple-500/15' />
          <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <div className='absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-3xl' />
          <CardHeader className='relative'>
            <CardTitle className='flex items-center gap-3'>
              <div className='rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg shadow-blue-500/30'>
                <TrendingUp className='h-5 w-5 text-white' />
              </div>
              <div>
                <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent dark:from-blue-400 dark:to-indigo-400'>
                  User Growth
                </span>
                <CardDescription className='mt-1 text-slate-600 dark:text-slate-400'>
                  New user signups over the last 30 days
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className='relative p-6'>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='h-[280px]'>
                <Line data={signupChartData} options={chartOptions} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl'>
          <div className='absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-600/15 to-teal-600/10 dark:from-emerald-500/30 dark:via-green-500/20 dark:to-teal-500/15' />
          <div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <div className='absolute -top-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 blur-3xl' />
          <CardHeader className='relative'>
            <CardTitle className='flex items-center gap-3'>
              <div className='rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 shadow-lg shadow-emerald-500/30'>
                <BarChart3 className='h-5 w-5 text-white' />
              </div>
              <div>
                <span className='bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-xl font-bold text-transparent dark:from-emerald-400 dark:to-green-400'>
                  Team Creation
                </span>
                <CardDescription className='mt-1 text-slate-600 dark:text-slate-400'>
                  New teams created over the last 30 days
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className='relative p-6'>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='h-[280px]'>
                <Bar data={teamChartData} options={chartOptions} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className='grid gap-6 md:grid-cols-3'>
        <Card className='group relative overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl'>
          <div className='absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-purple-600/10 dark:from-blue-500/30 dark:via-indigo-500/20 dark:to-purple-500/15' />
          <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <div className='absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-3xl' />
          <CardHeader className='relative pb-4'>
            <CardTitle className='flex items-center gap-3'>
              <div className='rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg shadow-blue-500/30'>
                <Shield className='h-5 w-5 text-white' />
              </div>
              <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent dark:from-blue-400 dark:to-indigo-400'>
                User Breakdown
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='relative space-y-4 p-6 pt-2'>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Admin Users
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {stats.users.adminUsers}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-blue-500' />
                </div>
              </div>
            </div>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Wallet Connected
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {stats.users.walletUsers}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-blue-500' />
                </div>
              </div>
            </div>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Email Verified
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {stats.users.totalUsers > 0
                      ? (
                          (stats.users.emailUsers / stats.users.totalUsers) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-blue-500' />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl'>
          <div className='absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-600/15 to-rose-600/10 dark:from-purple-500/30 dark:via-pink-500/20 dark:to-rose-500/15' />
          <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <div className='absolute -top-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl' />
          <CardHeader className='relative pb-4'>
            <CardTitle className='flex items-center gap-3'>
              <div className='rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-lg shadow-purple-500/30'>
                <Activity className='h-5 w-5 text-white' />
              </div>
              <span className='bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-xl font-bold text-transparent dark:from-purple-400 dark:to-pink-400'>
                Activity Overview
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='relative space-y-4 p-6 pt-2'>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Today
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-purple-600 dark:text-purple-400'>
                    {stats.activity.todayActivities}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-purple-500' />
                </div>
              </div>
            </div>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  This Week
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-purple-600 dark:text-purple-400'>
                    {stats.activity.weekActivities}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-purple-500' />
                </div>
              </div>
            </div>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Total
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-purple-600 dark:text-purple-400'>
                    {stats.activity.totalActivities.toLocaleString()}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-purple-500' />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='group relative overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl'>
          <div className='absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-600/15 to-teal-600/10 dark:from-emerald-500/30 dark:via-green-500/20 dark:to-teal-500/15' />
          <div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
          <div className='absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 blur-3xl' />
          <CardHeader className='relative pb-4'>
            <CardTitle className='flex items-center gap-3'>
              <div className='rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 shadow-lg shadow-emerald-500/30'>
                <Users className='h-5 w-5 text-white' />
              </div>
              <span className='bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-xl font-bold text-transparent dark:from-emerald-400 dark:to-green-400'>
                Plan Distribution
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='relative space-y-4 p-6 pt-2'>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Free Plans
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                    {stats.plans.freeTeams}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-emerald-500' />
                </div>
              </div>
            </div>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Pro Plans
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                    {stats.plans.proTeams}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-emerald-500' />
                </div>
              </div>
            </div>
            <div className='rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60'>
              <div className='flex items-center justify-between py-3'>
                <span className='text-slate-600 dark:text-slate-400'>
                  Enterprise Plans
                </span>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                    {stats.plans.enterpriseTeams}
                  </span>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-emerald-500' />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
