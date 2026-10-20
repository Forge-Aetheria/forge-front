// Servicio centralizado de Autenticación y Manejo de Sesión

import { executeGraphQL, GraphQLClientError } from '@/libs/graphqlClient'
import {
  SIGN_IN_MUTATION,
  ME_QUERY,
  REFRESH_SESSION_MUTATION,
  SIGN_OUT_MUTATION
} from '@/graphql/auth.gql'
import type {
  AuthSession,
  AuthenticatedUser,
  IniciarSesionInput,
  RefrescarSesionInput,
  SignOutScope,
  AuthResponse
} from '@/types/authTypes'

const SESSION_STORAGE_KEY = 'foundly_auth_session'
const USER_STORAGE_KEY = 'foundly_auth_user'

export const DEMO_AUTH_USER: AuthenticatedUser = {
  id: 'usr-admin-01',
  email: 'admin@vuexy.com',
  tenantId: 'ten-forge-01',
  tenantName: 'Distribuidora Global C.A.',
  tenantSlug: 'distribuidora-global'
}

export const DEMO_AUTH_SESSION: AuthSession = {
  accessToken: 'demo_access_token_forge_2026',
  refreshToken: 'demo_refresh_token_forge_2026',
  tokenType: 'bearer',
  expiresIn: 86400 * 30, // 30 días
  expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30
}

export const authService = {
  /**
   * Autenticación con email y contraseña.
   * Soporta tanto backend GraphQL real como fallback de Modo Demo cuando no hay conexión local.
   */
  async signIn(input: IniciarSesionInput): Promise<AuthResponse<{ session: AuthSession; user: AuthenticatedUser }>> {
    const normalizedEmail = input.email.trim().toLowerCase()
    const isDemoAccount = normalizedEmail === 'admin@vuexy.com' || normalizedEmail === 'demo@forge.com'

    // 0. Si son credenciales demo designadas, autenticar de inmediato
    if (isDemoAccount) {
      const session = DEMO_AUTH_SESSION
      const user = { ...DEMO_AUTH_USER, email: normalizedEmail }

      authService.saveSession(session)
      authService.saveUser(user)

      return {
        data: { session, user }
      }
    }

    try {
      // 1. Ejecutar mutación de Login contra el backend
      const signInRes = await executeGraphQL<{ signIn: AuthSession }, { input: IniciarSesionInput }>(
        SIGN_IN_MUTATION,
        { input },
        { token: null } // No enviar token previo
      )

      const session = signInRes.signIn

      // 2. Guardar sesión temporalmente para autorizar la query `me`
      authService.saveSession(session)

      // 3. Obtener el perfil y datos del tenant
      const meRes = await executeGraphQL<{ me: AuthenticatedUser }>(
        ME_QUERY,
        undefined,
        { token: session.accessToken }
      )

      const user = meRes.me

      authService.saveUser(user)

      return {
        data: { session, user }
      }
    } catch (err: unknown) {
      // Si el backend no responde (offline / fetch failed), permitir fallback en modo desarrollo
      const isConnectionError =
        err instanceof Error &&
        (err.message.includes('fetch') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('Failed to fetch') ||
          err.name === 'TypeError')

      if (isConnectionError) {
        console.warn('[authService] Backend offline en http://localhost:4000/graphql. Iniciando sesión en Modo Demo.')

        const session = DEMO_AUTH_SESSION
        const user: AuthenticatedUser = {
          ...DEMO_AUTH_USER,
          email: normalizedEmail
        }

        authService.saveSession(session)
        authService.saveUser(user)

        return {
          data: { session, user }
        }
      }

      authService.clearSession()

      if (err instanceof GraphQLClientError) {
        return {
          error: mapAuthErrorMessage(err.code, err.message),
          errorCode: err.code
        }
      }

      return {
        error: 'Ocurrió un error inesperado al intentar iniciar sesión',
        errorCode: 'UNKNOWN_ERROR'
      }
    }
  },

  /**
   * Obtener perfil del usuario autenticado actual.
   */
  async me(): Promise<AuthenticatedUser | null> {
    const session = authService.getStoredSession()

    if (session?.accessToken?.startsWith('demo_')) {
      return authService.getStoredUser() || DEMO_AUTH_USER
    }

    try {
      const res = await executeGraphQL<{ me: AuthenticatedUser }>(ME_QUERY)

      const user = res.me

      authService.saveUser(user)

      return user
    } catch {
      return authService.getStoredUser()
    }
  },

  /**
   * Refrescar la sesión activa con el refresh token.
   */
  async refreshSession(): Promise<AuthSession | null> {
    const session = authService.getStoredSession()

    if (!session?.refreshToken) {
      authService.clearSession()

      return null
    }

    if (session.accessToken?.startsWith('demo_')) {
      const refreshed: AuthSession = {
        ...session,
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30
      }

      authService.saveSession(refreshed)

      return refreshed
    }

    try {
      const res = await executeGraphQL<{ refreshSession: AuthSession }, { input: RefrescarSesionInput }>(
        REFRESH_SESSION_MUTATION,
        { input: { refreshToken: session.refreshToken } },
        { token: null }
      )

      const newSession = res.refreshSession

      authService.saveSession(newSession)

      return newSession
    } catch {
      authService.clearSession()

      return null
    }
  },

  /**
   * Cierre de sesión.
   */
  async signOut(scope: SignOutScope = 'LOCAL' as SignOutScope): Promise<boolean> {
    const session = authService.getStoredSession()

    try {
      if (!session?.accessToken?.startsWith('demo_')) {
        await executeGraphQL<{ signOut: boolean }, { scope: SignOutScope }>(
          SIGN_OUT_MUTATION,
          { scope }
        )
      }
    } catch {
      // Ignorar errores al cerrar sesión si el token ya expiró
    } finally {
      authService.clearSession()
    }

    return true
  },

  /**
   * Persistencia local de sesión.
   */
  saveSession(session: AuthSession): void {
    if (typeof window === 'undefined') return

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    // Cookie para middleware de Next.js
    document.cookie = `foundly_access_token=${session.accessToken}; path=/; max-age=${session.expiresIn}; SameSite=Lax`
  },

  getStoredSession(): AuthSession | null {
    if (typeof window === 'undefined') return null

    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY)

      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  saveUser(user: AuthenticatedUser): void {
    if (typeof window === 'undefined') return

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  },

  getStoredUser(): AuthenticatedUser | null {
    if (typeof window === 'undefined') return null

    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY)

      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  clearSession(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    document.cookie = 'foundly_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
}

/**
 * Mapeo de códigos de error de backend a mensajes amigables para el usuario.
 */
function mapAuthErrorMessage(code?: string, originalMessage?: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Correo electrónico o contraseña incorrectos.'
    case 'EMAIL_NOT_CONFIRMED':
      return 'Tu cuenta aún no ha sido verificada. Revisa tu correo electrónico para confirmarla.'
    case 'ACCOUNT_NOT_PROVISIONED':
      return 'La cuenta no cuenta con un espacio de trabajo o empresa configurada.'
    case 'FORBIDDEN':
      return 'Tu empresa se encuentra inactiva o suspendida. Contacta a soporte.'
    case 'RATE_LIMITED':
      return 'Demasiados intentos fallidos. Por favor, espera un minuto antes de reintentar.'
    case 'NETWORK_ERROR':
      return 'No fue posible conectar con el servidor de autenticación. Verifica tu conexión.'
    default:
      return originalMessage || 'Error al autenticar con el servidor.'
  }
}
