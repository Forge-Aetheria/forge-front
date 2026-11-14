'use client'

import { useEffect, type ReactNode } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

import { useAuth } from '@/contexts/AuthContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { authService } from '@/services/authService'

export const OnboardingGuard = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { state, isLoading, error, refresh } = useOnboarding()
  const router = useRouter()
  const pathname = usePathname()

  const resolving = authLoading || isLoading || (!state && !error)

  useEffect(() => {
    if (authLoading || isLoading || !isAuthenticated) {
      return
    }

    if (error?.code === 'UNAUTHENTICATED') {
      authService.clearSession()
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`)

      return
    }

    if (error) {
      return
    }

    if (state && !state.onboardingCompleted && pathname !== '/onboarding') {
      router.replace('/onboarding')
    }
  }, [authLoading, isLoading, isAuthenticated, error, state, pathname, router])

  if (resolving) {
    return (
      <Box className='flex items-center justify-center min-bs-screen w-full'>
        <CircularProgress size={40} className='text-primary' />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (error) {
    const forbidden = error.code === 'FORBIDDEN'

    return (
      <Box className='flex items-center justify-center min-bs-screen w-full p-6'>
        <Alert
          severity={forbidden ? 'warning' : 'error'}
          className='max-is-[560px]'
          action={
            <Button color='inherit' size='small' onClick={() => void refresh()}>
              Reintentar
            </Button>
          }
        >
          <AlertTitle>
            {forbidden ? 'No tienes permiso para completar el onboarding' : 'No se pudo cargar el onboarding'}
          </AlertTitle>
          {forbidden
            ? 'Tu rol no posee el permiso iam:settings:manage. Solicita a un administrador que complete la configuración inicial.'
            : error.message}
        </Alert>
      </Box>
    )
  }

  if (!state || !state.onboardingCompleted) {
    return (
      <Box className='flex items-center justify-center min-bs-screen w-full'>
        <CircularProgress size={40} className='text-primary' />
      </Box>
    )
  }

  return <>{children}</>
}
