// Tipos de dominio para el módulo de Autenticación (Contrato con forge-backend)

export interface AuthSession {
  accessToken: string
  refreshToken: string
  tokenType: string // always "bearer"
  expiresIn: number // seconds
  expiresAt: number // unix epoch seconds
}

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string
  phone?: string
  avatarUrl?: string
  role?: string
  roles?: string[]
  tenantId: string
  tenantName: string
  tenantSlug: string
  lastLoginAt?: string
  createdAt?: string
}

export interface UpdateMyProfileInput {
  name: string
  phone?: string
  avatarUrl?: string
}

export interface ChangeMyPasswordInput {
  currentPassword: string
  newPassword: string
  closeOtherSessions?: boolean
}

export interface ChangeMyPasswordResult {
  success: boolean
  message: string
}

export interface IniciarSesionInput {
  email: string
  password: string
}

export interface RefrescarSesionInput {
  refreshToken: string
}

export enum SignOutScope {
  LOCAL = 'LOCAL',
  GLOBAL = 'GLOBAL'
}

export interface AuthState {
  user: AuthenticatedUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthResponse<T> {
  data?: T
  error?: string
  errorCode?: string
}
