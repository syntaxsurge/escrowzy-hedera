'use client'

import { useEffect, useRef } from 'react'

import { useBlockchain, useNetwork } from '@/context'

export function useAutoSwitchChain() {
  const { chainId, switchChain, isConnected } = useBlockchain()
  const { selectedChainId, setSelectedChainId } = useNetwork()
  const hasSwitchedRef = useRef(false)
  const lastConnectedChainRef = useRef<number | undefined>(undefined)
  const isFirstConnectionRef = useRef(true)

  // Update persisted chain when user manually switches while connected
  useEffect(() => {
    if (isConnected && chainId && chainId !== lastConnectedChainRef.current) {
      console.log('Chain changed while connected:', chainId)
      setSelectedChainId(chainId)
      lastConnectedChainRef.current = chainId
    }
  }, [chainId, isConnected, setSelectedChainId])

  // Auto-switch to selected chain on wallet connection
  useEffect(() => {
    // Only run when wallet connects
    if (
      isConnected &&
      chainId &&
      selectedChainId &&
      chainId !== selectedChainId &&
      switchChain &&
      !hasSwitchedRef.current &&
      isFirstConnectionRef.current
    ) {
      console.log(
        'Auto-switching to selected chain on connection:',
        selectedChainId
      )

      hasSwitchedRef.current = true
      isFirstConnectionRef.current = false

      // Try to switch to selected chain
      const timeoutId = setTimeout(() => {
        switchChain(selectedChainId).catch(error => {
          console.error('Failed to auto-switch chain:', error)
          // If it fails, update selected chain to current chain
          setSelectedChainId(chainId)
        })
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, chainId, selectedChainId, switchChain, setSelectedChainId])

  // Reset flags when disconnected
  useEffect(() => {
    if (!isConnected) {
      hasSwitchedRef.current = false
      isFirstConnectionRef.current = true
      lastConnectedChainRef.current = undefined
    }
  }, [isConnected])
}
