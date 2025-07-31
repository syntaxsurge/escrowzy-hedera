'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Clock,
  Mail,
  RefreshCw,
  Server,
  Shield
} from 'lucide-react'

import { SystemHealthLoading } from '@/components/blocks/health/system-health-loading'
import { apiEndpoints } from '@/config/api-endpoints'
import { refreshIntervals, appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { api } from '@/lib/api/http-client'

function DatabaseErrorContent() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const adminEmail = envPublic.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    // Check database health on mount and periodically
    const checkDatabaseHealth = async () => {
      try {
        const response = await api.get(apiEndpoints.health.db)

        if (response.success && response.data?.details?.status === 'healthy') {
          // Database is working, redirect to homepage
          router.push(appRoutes.home)
        } else {
          // Database is down, show error page
          setIsChecking(false)
        }
      } catch (_error) {
        // Database is down, show error page
        setIsChecking(false)
      }
    }

    // Check immediately
    checkDatabaseHealth()

    // Check every 5 seconds
    const interval = setInterval(checkDatabaseHealth, refreshIntervals.NORMAL)

    return () => clearInterval(interval)
  }, [router])

  // Show loading state while checking
  if (isChecking) {
    return <SystemHealthLoading />
  }
  return (
    <div className='from-background via-background to-muted/20 relative min-h-screen overflow-hidden bg-gradient-to-br'>
      {/* Animated background elements */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='from-primary/10 absolute -top-1/2 -left-1/2 h-[100vh] w-[100vh] animate-pulse rounded-full bg-gradient-to-br via-transparent to-transparent blur-3xl' />
        <div className='from-destructive/10 absolute -right-1/2 -bottom-1/2 h-[100vh] w-[100vh] animate-pulse rounded-full bg-gradient-to-tr via-transparent to-transparent blur-3xl' />
        <div className='absolute top-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl delay-1000' />
      </div>

      {/* Floating particles */}
      <div className='absolute inset-0 overflow-hidden'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='bg-foreground/10 animate-float absolute h-1 w-1 rounded-full'
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>

      <div className='relative flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8'>
        <div className='w-full max-w-2xl space-y-8'>
          {/* Error icon with animation */}
          <div className='flex justify-center'>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='bg-destructive/20 h-32 w-32 animate-ping rounded-full' />
              </div>
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='bg-destructive/30 h-24 w-24 animate-pulse rounded-full' />
              </div>
              <div className='from-destructive/80 to-destructive shadow-destructive/20 relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-2xl'>
                <AlertCircle className='h-10 w-10 text-white' />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className='space-y-4 text-center'>
            <h1 className='from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl'>
              Connection Lost
            </h1>
            <p className='text-muted-foreground mx-auto max-w-lg text-lg leading-relaxed sm:text-xl'>
              We're unable to establish a connection to our database servers at
              the moment.
            </p>
          </div>

          {/* Status cards */}
          <div className='grid gap-4 sm:grid-cols-3'>
            <div className='group border-border/50 bg-card/50 hover:border-destructive/50 hover:shadow-destructive/5 relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-all hover:shadow-lg'>
              <div className='from-destructive/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
              <div className='relative space-y-2'>
                <div className='bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-lg'>
                  <Server className='text-destructive h-5 w-5' />
                </div>
                <h3 className='text-sm font-semibold'>Database Server</h3>
                <p className='text-muted-foreground text-xs'>
                  Temporarily unavailable
                </p>
              </div>
            </div>

            <div className='group border-border/50 bg-card/50 relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-all hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5'>
              <div className='absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
              <div className='relative space-y-2'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10'>
                  <Activity className='h-5 w-5 text-orange-500' />
                </div>
                <h3 className='text-sm font-semibold'>System Status</h3>
                <p className='text-muted-foreground text-xs'>
                  Investigating issue
                </p>
              </div>
            </div>

            <div className='group border-border/50 bg-card/50 hover:border-primary/50 hover:shadow-primary/5 relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-all hover:shadow-lg'>
              <div className='from-primary/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
              <div className='relative space-y-2'>
                <div className='bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg'>
                  <Shield className='text-primary h-5 w-5' />
                </div>
                <h3 className='text-sm font-semibold'>Your Data</h3>
                <p className='text-muted-foreground text-xs'>Safe and secure</p>
              </div>
            </div>
          </div>

          {/* What's happening section */}
          <div className='border-border/50 bg-card/30 relative overflow-hidden rounded-3xl border backdrop-blur-xl'>
            <div className='from-primary/5 to-destructive/5 absolute inset-0 bg-gradient-to-br via-transparent' />
            <div className='relative p-6 sm:p-8'>
              <h2 className='mb-4 flex items-center gap-2 text-xl font-semibold'>
                <Clock className='text-muted-foreground h-5 w-5' />
                What's happening?
              </h2>
              <div className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <div className='bg-destructive/50 ring-destructive/10 mt-1 h-2 w-2 rounded-full ring-4' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>
                      Database Connection Failed
                    </p>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      Unable to establish connection to our primary database
                      cluster
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='mt-1 h-2 w-2 rounded-full bg-orange-500/50 ring-4 ring-orange-500/10' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>
                      Automatic Recovery Initiated
                    </p>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      Our systems are attempting to reconnect automatically
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-primary/50 ring-primary/10 mt-1 h-2 w-2 rounded-full ring-4' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>
                      Engineering Team Notified
                    </p>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      Our team has been alerted and is investigating the issue
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <Link
              href={appRoutes.home}
              className='group from-primary to-primary/80 text-primary-foreground hover:shadow-primary/20 relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br px-8 py-4 text-sm font-medium shadow-xl transition-all hover:scale-105 hover:shadow-2xl'
            >
              <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
              <RefreshCw className='h-4 w-4 transition-transform group-hover:rotate-180' />
              <span className='relative'>Try Again</span>
              <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
            </Link>

            <a
              href={`mailto:${adminEmail}`}
              className='group border-border bg-card/50 hover:border-primary/50 relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border px-8 py-4 text-sm font-medium shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:shadow-xl'
            >
              <div className='from-primary/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
              <Mail className='h-4 w-4' />
              <span className='relative'>Contact Support</span>
            </a>
          </div>

          {/* Support info */}
          <div className='space-y-2 text-center'>
            <p className='text-muted-foreground text-sm'>
              Need immediate assistance?
            </p>
            <a
              href={`mailto:${adminEmail}`}
              className='text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline'
            >
              <div className='h-2 w-2 animate-pulse rounded-full bg-green-500' />
              {adminEmail}
            </a>
          </div>

          {/* Error details */}
          <div className='flex justify-center'>
            <div className='border-border/50 bg-card/30 rounded-2xl border px-6 py-3 text-center backdrop-blur-xl'>
              <p className='text-muted-foreground font-mono text-xs'>
                Error Code: DB_CONNECTION_FAILED
              </p>
              <p className='text-muted-foreground font-mono text-xs'>
                Timestamp: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function DatabaseErrorPage() {
  return (
    <Suspense fallback={<SystemHealthLoading />}>
      <DatabaseErrorContent />
    </Suspense>
  )
}
