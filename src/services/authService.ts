// Servicio centralizado de Autenticación y Manejo de Sesión

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
   * Autenticación inmediata con persistencia local.
   */
  async signIn(input: IniciarSesionInput): Promise<AuthResponse<{ session: AuthSession; user: AuthenticatedUser }>> {
    const normalizedEmail = input.email.trim().toLowerCase()

    const session: AuthSession = {
      ...DEMO_AUTH_SESSION,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30
    }

    const user: AuthenticatedUser = {
      id: 'usr-admin-01',
      email: normalizedEmail || DEMO_AUTH_USER.email,
      tenantId: DEMO_AUTH_USER.tenantId,
      tenantName: DEMO_AUTH_USER.tenantName,
      tenantSlug: DEMO_AUTH_USER.tenantSlug
    }

    authService.saveSession(session)
    authService.saveUser(user)

    return {
      data: { session, user }
    }
  },

  /**
   * Obtener perfil del usuario autenticado actual.
   */
  async me(): Promise<AuthenticatedUser | null> {
    const storedUser = authService.getStoredUser()
    if (storedUser) {
      return storedUser
    }

    const session = authService.getStoredSession()
    if (session) {
      return DEMO_AUTH_USER
    }

    return null
  },

  /**
   * Refrescar la sesión activa.
   */
  async refreshSession(_input?: RefrescarSesionInput): Promise<AuthSession | null> {
    const session = authService.getStoredSession()
    if (!session) {
      authService.clearSession()
      return null
    }

    const refreshed: AuthSession = {
      ...session,
      expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30
    }

    authService.saveSession(refreshed)
    return refreshed
  },

  /**
   * Cierre de sesión.
   */
  async signOut(_scope: SignOutScope = 'LOCAL' as SignOutScope): Promise<boolean> {
    authService.clearSession()
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
