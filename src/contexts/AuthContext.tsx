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
    const initializeAuth = async () => {
      const storedSession = authService.getStoredSession()
      const storedUser = authService.getStoredUser()

      if (!storedSession) {
        setState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false
        })

        return
      }

      // Verificar si la sesión expiró
      const nowEpoch = Math.floor(Date.now() / 1000)

      if (storedSession.expiresAt && storedSession.expiresAt < nowEpoch) {
        // Intentar refrescar
        const refreshed = await authService.refreshSession()

        if (!refreshed) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false
          })

          return
        }
      }

      setState({
        user: storedUser,
        session: storedSession,
        isLoading: false,
        isAuthenticated: true
      })

      // Refrescar usuario en segundo plano
      authService.me().then(freshUser => {
        if (freshUser) {
          setState(prev => ({ ...prev, user: freshUser }))
        }
      })
    }

    initializeAuth()
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
