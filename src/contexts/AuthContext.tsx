'use client'

// React Imports
import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

// Type Imports
import type { AuthenticatedUser, AuthSession, AuthState, IniciarSesionInput } from '@/types/authTypes'
import { authService } from '@/services/authService'

interface AuthContextType extends AuthState {
  signIn: (input: IniciarSesionInput) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter()

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false
  })

  // Cargar sesión existente al montar
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const storedSession = authService.getStoredSession()
        const storedUser = authService.getStoredUser()

        if (!storedSession) {
          if (isMounted) {
            setState({
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false
            })
          }

          return
        }

        // Verificar si la sesión expiró
        const nowEpoch = Math.floor(Date.now() / 1000)

        if (storedSession.expiresAt && storedSession.expiresAt < nowEpoch) {
          // Intentar refrescar
          const refreshed = await authService.refreshSession()

          if (!refreshed) {
            if (isMounted) {
              setState({
                user: null,
                session: null,
                isLoading: false,
                isAuthenticated: false
              })
            }

            return
          }
        }

        if (isMounted) {
          setState({
            user: storedUser,
            session: storedSession,
            isLoading: false,
            isAuthenticated: true
          })
        }

        // Refrescar usuario en segundo plano sólo si no se tiene en cache y el token es del backend real
        if (!storedUser && storedSession && !storedSession.accessToken.startsWith('demo_dev_token')) {
          authService
            .me()
            .then(freshUser => {
              if (freshUser && isMounted) {
                setState(prev => ({ ...prev, user: freshUser }))
              }
            })
            .catch(() => {})
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err)
        if (isMounted) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false
          })
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const signIn = async (input: IniciarSesionInput) => {
    setState(prev => ({ ...prev, isLoading: true }))

    const result = await authService.signIn(input)

    if (result.data) {
      setState({
        user: result.data.user,
        session: result.data.session,
        isLoading: false,
        isAuthenticated: true
      })

      return { success: true }
    }

    setState(prev => ({ ...prev, isLoading: false }))

    return { success: false, error: result.error }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    await authService.signOut()
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false
    })
    router.push('/login')
  }

  const refreshUser = async () => {
    const freshUser = await authService.me()

    if (freshUser) {
      setState(prev => ({ ...prev, user: freshUser }))
    }
  }

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      refreshUser
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider')
  }

  return context
}
