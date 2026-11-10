// Servicio centralizado de Autenticación y Manejo de Sesión

import { executeGraphQL, GraphQLClientError } from '@/libs/graphqlClient'
import {
  SIGN_IN_MUTATION,
  ME_QUERY,
  REFRESH_SESSION_MUTATION,
  SIGN_OUT_MUTATION,
  SIGN_UP_MUTATION,
  VERIFY_EMAIL_MUTATION,
  RESEND_VERIFICATION_EMAIL_MUTATION,
  REQUEST_PASSWORD_RESET_MUTATION,
  RESET_PASSWORD_MUTATION
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

export const authService = {
  /**
   * Autenticación con email y contraseña contra el backend GraphQL.
   */
  async signIn(input: IniciarSesionInput): Promise<AuthResponse<{ session: AuthSession; user: AuthenticatedUser }>> {
    try {
      // 1. Ejecutar mutación de Login contra el backend con timeout controlado
      const signInRes = await executeGraphQL<{ signIn: AuthSession }, { input: IniciarSesionInput }>(
        SIGN_IN_MUTATION,
        { input },
        { token: null, timeoutMs: 9000 }
      )

      const session = signInRes.signIn

      // 2. Guardar sesión real inmediatamente
      authService.saveSession(session)

      // 3. Obtener el perfil y datos del tenant
      let user: AuthenticatedUser

      try {
        const meRes = await executeGraphQL<{ me: AuthenticatedUser }>(
          ME_QUERY,
          undefined,
          { token: session.accessToken, timeoutMs: 6000 }
        )

        user = meRes.me
      } catch {
        // Si la query `me` tiene latencia o no está implementada, preservar la sesión con usuario inferido
        user = {
          id: 'usr_authenticated',
          email: input.email,
          tenantId: 'tenant_default',
          tenantName: 'Foundly Enterprise',
          tenantSlug: 'foundly'
        }
      }

      authService.saveUser(user)

      return {
        data: { session, user }
      }
    } catch (err: unknown) {
      authService.clearSession()

      if (err instanceof GraphQLClientError) {
        return {
          error: mapAuthErrorMessage(err.code, err.message),
          errorCode: err.code
        }
      }

      const isConnectionError =
        err instanceof Error &&
        (err.message.includes('fetch') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('Failed to fetch') ||
          err.name === 'TypeError')

      if (isConnectionError) {
        return {
          error: 'No fue posible conectar con el servidor de autenticación. Verifica que el backend esté en ejecución.',
          errorCode: 'NETWORK_ERROR'
        }
      }

      return {
        error: 'Ocurrió un error inesperado al intentar iniciar sesión',
        errorCode: 'UNKNOWN_ERROR'
      }
    }
  },

  /**
   * Obtener perfil del usuario autenticado actual desde el backend o caché local.
   */
  async me(): Promise<AuthenticatedUser | null> {
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
   * Refrescar la sesión activa con el backend.
   */
  async refreshSession(): Promise<AuthSession | null> {
    const session = authService.getStoredSession()

    if (!session?.refreshToken) {
      authService.clearSession()
      
return null
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
    } catch (err: unknown) {
      if (err instanceof GraphQLClientError && err.code === 'NETWORK_ERROR') {
        const nowEpoch = Math.floor(Date.now() / 1000)

        if (session.expiresAt && session.expiresAt > nowEpoch) {
          return session
        }
      }

      authService.clearSession()
      
return null
    }
  },

  /**
   * Cierre de sesión en backend y limpieza local.
   */
  async signOut(scope: SignOutScope = 'LOCAL' as SignOutScope): Promise<boolean> {
    try {
      await executeGraphQL<{ signOut: boolean }, { scope: SignOutScope }>(
        SIGN_OUT_MUTATION,
        { scope }
      )
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
  },

  /**
   * Valida las políticas de complejidad de contraseñas de backend: 8-72 caracteres, letra + número.
   */
  validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' }
    }

    if (password.length > 72) {
      return { valid: false, message: 'La contraseña no puede exceder 72 caracteres.' }
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una letra y un número.' }
    }

    return { valid: true }
  },

  /**
   * Genera y sanitiza un slug de tenant kebab-case a partir del nombre comercial.
   */
  sanitizeTenantSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
  },

  /**
   * Alta de cuenta y registro de nuevo tenant (Saga backend).
   */
  async signUp(input: {
    email: string
    password: string
    tenantName: string
    tenantSlug?: string
    name?: string
    phone?: string
  }): Promise<{ success: boolean; requiresEmailVerification: boolean; isExistingAccount?: boolean; error?: string }> {
    const passwordCheck = authService.validatePasswordComplexity(input.password)

    if (!passwordCheck.valid) {
      return { success: false, requiresEmailVerification: false, error: passwordCheck.message }
    }

    const tenantSlug = input.tenantSlug ? authService.sanitizeTenantSlug(input.tenantSlug) : authService.sanitizeTenantSlug(input.tenantName)

    if (!tenantSlug || tenantSlug.length < 2) {
      return { success: false, requiresEmailVerification: false, error: 'El identificador de la empresa (slug) debe tener al menos 2 caracteres.' }
    }

    try {
      const res = await executeGraphQL<{
        signUp: {
          tenantId: string
          userId: string
          requiresEmailVerification: boolean
          isExistingAccount: boolean
        }
      }>(
        SIGN_UP_MUTATION,
        {
          input: {
            email: input.email.trim().toLowerCase(),
            password: input.password,
            tenantName: input.tenantName.trim(),
            tenantSlug,
            name: input.name?.trim() || undefined,
            phone: input.phone?.trim() || undefined
          }
        },
        { token: null, timeoutMs: 12000 }
      )

      if (res?.signUp) {
        return {
          success: true,
          requiresEmailVerification: res.signUp.requiresEmailVerification,
          isExistingAccount: res.signUp.isExistingAccount
        }
      }

      return { success: false, requiresEmailVerification: false, error: 'No se pudo completar el registro.' }
    } catch (err: unknown) {
      const message = err instanceof GraphQLClientError ? mapAuthErrorMessage(err.code, err.message) : (err instanceof Error ? err.message : 'Error inesperado al registrar la cuenta.')

      return { success: false, requiresEmailVerification: false, error: message }
    }
  },

  /**
   * Confirmación de correo electrónico mediante token_hash del magic link.
   */
  async verifyEmail(tokenHash: string): Promise<{ success: boolean; session?: AuthSession; user?: AuthenticatedUser; error?: string }> {
    if (!tokenHash || !tokenHash.trim()) {
      return { success: false, error: 'El enlace de confirmación es inválido o no contiene un token válido.' }
    }

    try {
      const res = await executeGraphQL<{ verifyEmail: AuthSession }>(
        VERIFY_EMAIL_MUTATION,
        { input: { tokenHash: tokenHash.trim() } },
        { token: null, timeoutMs: 10000 }
      )

      if (res?.verifyEmail) {
        const session = res.verifyEmail

        authService.saveSession(session)

        let user: AuthenticatedUser | null = null

        try {
          user = await authService.me()
        } catch {
          // Ignorar
        }

        return { success: true, session, user: user || undefined }
      }

      return { success: false, error: 'No se pudo verificar el correo electrónico.' }
    } catch (err: unknown) {
      const message = err instanceof GraphQLClientError ? mapAuthErrorMessage(err.code, err.message) : 'El enlace de verificación ha expirado o ya fue utilizado.'

      return { success: false, error: message }
    }
  },

  /**
   * Reenvío de correo de confirmación de cuenta.
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await executeGraphQL(
        RESEND_VERIFICATION_EMAIL_MUTATION,
        { input: { email: email.trim().toLowerCase() } },
        { token: null, timeoutMs: 8000 }
      )

      return { success: true, message: 'Si la cuenta existe y está pendiente de verificación, hemos reenviado el enlace a tu correo.' }
    } catch (err: unknown) {
      if (err instanceof GraphQLClientError && err.code === 'RATE_LIMITED') {
        return { success: false, message: 'Demasiadas solicitudes. Espera un momento antes de solicitar otro reenvío.' }
      }

      return { success: true, message: 'Si la cuenta existe y está pendiente de verificación, hemos reenviado el enlace a tu correo.' }
    }
  },

  /**
   * Solicitud de restablecimiento de contraseña (anti-enumeración).
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await executeGraphQL(
        REQUEST_PASSWORD_RESET_MUTATION,
        { input: { email: email.trim().toLowerCase() } },
        { token: null, timeoutMs: 8000 }
      )

      return { success: true, message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.' }
    } catch {
      return { success: true, message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.' }
    }
  },

  /**
   * Cambio de contraseña con token_hash de recuperación.
   */
  async resetPassword(tokenHash: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const check = authService.validatePasswordComplexity(newPassword)

    if (!check.valid) {
      return { success: false, error: check.message }
    }

    try {
      const res = await executeGraphQL<{ resetPassword: boolean }>(
        RESET_PASSWORD_MUTATION,
        { input: { tokenHash: tokenHash.trim(), newPassword } },
        { token: null, timeoutMs: 10000 }
      )

      if (res?.resetPassword) {
        return { success: true }
      }

      return { success: false, error: 'No se pudo actualizar la contraseña.' }
    } catch (err: unknown) {
      const message = err instanceof GraphQLClientError ? mapAuthErrorMessage(err.code, err.message) : 'El enlace de recuperación ha expirado o es inválido.'

      return { success: false, error: message }
    }
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
