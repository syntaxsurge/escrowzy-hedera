'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

import { localStorageKeys } from '@/config/api-endpoints'
import {
  DEFAULT_CHAIN_ID,
  isSupportedChainId,
  type SupportedChainIds
} from '@/lib/blockchain'

interface NetworkContextValue {
  selectedChainId: SupportedChainIds
  setSelectedChainId: (chainId: SupportedChainIds) => void
  persistedChainId: SupportedChainIds | null
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [selectedChainId, setSelectedChainIdState] =
    useState<SupportedChainIds>(() => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(localStorageKeys.selectedNetwork)
        if (stored) {
          const chainId = Number(stored)
          if (isSupportedChainId(chainId)) {
            return chainId as SupportedChainIds
          }
        }
      }
      return DEFAULT_CHAIN_ID as SupportedChainIds
    })

  const [persistedChainId, setPersistedChainId] =
    useState<SupportedChainIds | null>(() => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(localStorageKeys.selectedNetwork)
        if (stored) {
          const chainId = Number(stored)
          if (isSupportedChainId(chainId)) {
            return chainId as SupportedChainIds
          }
        }
      }
      return null
    })

  const setSelectedChainId = (chainId: SupportedChainIds) => {
    setSelectedChainIdState(chainId)
    setPersistedChainId(chainId)
    localStorage.setItem(localStorageKeys.selectedNetwork, chainId.toString())
  }

  return (
    <NetworkContext.Provider
      value={{
        selectedChainId,
        setSelectedChainId,
        persistedChainId
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return context
}
