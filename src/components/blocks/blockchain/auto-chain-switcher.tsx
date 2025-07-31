'use client'

import { useAutoSwitchChain } from '@/hooks/blockchain/use-auto-switch-chain'

export function AutoChainSwitcher() {
  useAutoSwitchChain()
  return null
}
