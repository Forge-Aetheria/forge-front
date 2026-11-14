'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { onboardingService, type OnboardingError, type OnboardingResult } from '@/services/onboardingService'
import { authService } from '@/services/authService'
import type {
  CompleteTenantOnboardingInput,
  TenantOnboardingPayload,
  TenantOnboardingStatus
} from '@/types/onboardingTypes'

interface OnboardingContextType {
  state: TenantOnboardingStatus | null
  isLoading: boolean
  error: OnboardingError | null
  isForbidden: boolean
  refresh: () => Promise<TenantOnboardingStatus | null>
  complete: (
    input: CompleteTenantOnboardingInput
  ) => Promise<OnboardingResult<TenantOnboardingPayload>>
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<TenantOnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<OnboardingError | null>(null)

  const refresh = useCallback(async (): Promise<TenantOnboardingStatus | null> => {
    if (!isAuthenticated) {
      setState(null)
      setError(null)
      setIsLoading(false)

      return null
    }

    setIsLoading(true)
    setError(null)

    const result = await onboardingService.getStatus()

    if (result.ok) {
      setState(result.data)
      setIsLoading(false)

      return result.data
    }

    if (result.error.code === 'UNAUTHENTICATED') {
      authService.clearSession()
    }

    setState(null)
    setError(result.error)
    setIsLoading(false)

    return null
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setState(null)
      setError(null)
      setIsLoading(false)

      return
    }

    void refresh()
  }, [isAuthenticated, refresh])

  const complete = useCallback(
    async (
      input: CompleteTenantOnboardingInput
    ): Promise<OnboardingResult<TenantOnboardingPayload>> => {
      const result = await onboardingService.complete(input)

      if (!result.ok) {
        if (result.error.code === 'UNAUTHENTICATED') {
          authService.clearSession()
        }

        return result
      }

      await refresh()

      return result
    },
    [refresh]
  )

  const value = useMemo<OnboardingContextType>(
    () => ({
      state,
      isLoading,
      error,
      isForbidden: error?.code === 'FORBIDDEN',
      refresh,
      complete
    }),
    [state, isLoading, error, refresh, complete]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext)

  if (!context) {
    throw new Error('useOnboarding debe ser utilizado dentro de OnboardingProvider')
  }

  return context
}
