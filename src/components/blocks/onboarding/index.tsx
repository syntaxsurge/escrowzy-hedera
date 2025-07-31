'use client'

import { useEffect, useState } from 'react'

import { Steps } from 'intro.js-react'
import 'intro.js/introjs.css'

import { localStorageKeys } from '@/config/api-endpoints'

interface OnboardingStep {
  element?: string
  intro: string
  title?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
}

interface OnboardingTooltipsProps {
  enabled: boolean
  onComplete?: () => void
  onSkip?: () => void
  steps: OnboardingStep[]
}

export function OnboardingTooltips({
  enabled,
  onComplete,
  onSkip,
  steps
}: OnboardingTooltipsProps) {
  const [stepsEnabled, setStepsEnabled] = useState(false)

  useEffect(() => {
    // Delay to ensure DOM is ready
    if (enabled) {
      const timer = setTimeout(() => setStepsEnabled(true), 500)
      return () => clearTimeout(timer)
    } else {
      setStepsEnabled(false)
    }
  }, [enabled])

  const handleExit = () => {
    setStepsEnabled(false)
    onSkip?.()
  }

  const handleComplete = () => {
    setStepsEnabled(false)
    onComplete?.()
  }

  return (
    <Steps
      enabled={stepsEnabled}
      steps={steps}
      initialStep={0}
      onExit={handleExit}
      onComplete={handleComplete}
      options={{
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        doneLabel: 'Done',
        nextLabel: 'Next',
        prevLabel: 'Back',
        skipLabel: 'Skip',
        hidePrev: false,
        hideNext: false,
        tooltipClass: 'custom-tooltip',
        highlightClass: 'custom-highlight',
        scrollToElement: true,
        scrollPadding: 100,
        disableInteraction: false
      }}
    />
  )
}

// Dashboard Onboarding Steps
export const dashboardOnboardingSteps: OnboardingStep[] = [
  {
    intro:
      'Welcome to your Dashboard! This is your control center for managing trades, battles, and achievements.',
    title: 'Welcome!'
  },
  {
    element: '[data-tour="quick-stats"]',
    intro:
      'Keep track of your progress with quick stats showing your level, XP, combat power, and active discounts.',
    title: 'Your Stats',
    position: 'bottom'
  },
  {
    element: '[data-tour="create-listing"]',
    intro:
      'Start trading by creating a P2P listing. Set your terms and wait for others to accept.',
    title: 'Create Listings',
    position: 'bottom'
  },
  {
    element: '[data-tour="battle-arena"]',
    intro:
      'Enter the Battle Arena to compete with other traders and earn fee discounts!',
    title: 'Battle Arena',
    position: 'bottom'
  },
  {
    element: '[data-tour="active-trades"]',
    intro:
      'Monitor all your active trades here. Track status and communicate with trading partners.',
    title: 'Active Trades',
    position: 'top'
  }
]

// P2P Trading Onboarding Steps
export const tradingOnboardingSteps: OnboardingStep[] = [
  {
    element: '[data-tour="listing-filter"]',
    intro:
      'Filter listings by type, currency, and payment methods to find the perfect match.',
    title: 'Filter Options',
    position: 'bottom'
  },
  {
    element: '[data-tour="listing-card"]',
    intro:
      "Each listing shows the trader's reputation, rates, and available amounts.",
    title: 'Listing Details',
    position: 'top'
  },
  {
    element: '[data-tour="accept-listing"]',
    intro:
      'Click Accept to initiate a trade. The escrow will be created automatically on-chain.',
    title: 'Accept Listings',
    position: 'left'
  }
]

// Battle Arena Onboarding Steps
export const battleOnboardingSteps: OnboardingStep[] = [
  {
    element: '[data-tour="combat-power"]',
    intro:
      'Your Combat Power determines your strength in battles. Complete trades to increase it!',
    title: 'Combat Power',
    position: 'bottom'
  },
  {
    element: '[data-tour="find-match"]',
    intro:
      'Click to find an opponent with similar Combat Power for a fair fight.',
    title: 'Find Match',
    position: 'bottom'
  },
  {
    element: '[data-tour="battle-rewards"]',
    intro: 'Win battles to earn 25% fee discounts for 24 hours!',
    title: 'Battle Rewards',
    position: 'top'
  }
]

// Hook to manage onboarding state
export function useOnboarding(key: string) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(
      `${localStorageKeys.onboardingPrefix}${key}`
    )
    if (!seen) {
      setHasSeenOnboarding(false)
      setEnabled(true)
    }
  }, [key])

  const completeOnboarding = () => {
    localStorage.setItem(`${localStorageKeys.onboardingPrefix}${key}`, 'true')
    setHasSeenOnboarding(true)
    setEnabled(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(`${localStorageKeys.onboardingPrefix}${key}`)
    setHasSeenOnboarding(false)
    setEnabled(true)
  }

  return {
    hasSeenOnboarding,
    enabled,
    completeOnboarding,
    resetOnboarding
  }
}

// Custom styles for intro.js
export const onboardingStyles = `
  .custom-tooltip {
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  .custom-highlight {
    border: 2px solid hsl(var(--primary));
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .introjs-tooltip {
    max-width: 400px;
  }
  
  .introjs-tooltip-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  
  .introjs-button {
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 500;
  }
  
  .introjs-button:hover {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .introjs-skipbutton {
    color: hsl(var(--muted-foreground));
  }
  
  .introjs-progress {
    background-color: hsl(var(--primary));
  }
`
