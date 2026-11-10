// Servicio desacoplado de Ajustes Generales y Perfil de Usuario con persistencia localStorage (SPEC-007)

import { executeGraphQL } from '@/libs/graphqlClient'
import {
  ME_QUERY,
  UPDATE_MY_PROFILE_MUTATION,
  CHANGE_MY_PASSWORD_MUTATION
} from '@/graphql/auth.gql'
import {
  GET_TENANT_USERS_QUERY,
  GET_ASSIGNABLE_ROLES_QUERY,
  INVITE_TENANT_USER_MUTATION,
  UPDATE_TENANT_USER_MUTATION,
  SET_TENANT_USER_ROLES_MUTATION,
  ACTIVATE_TENANT_USER_MUTATION,
  DEACTIVATE_TENANT_USER_MUTATION,
  GET_MY_PERMISSIONS_QUERY
} from '@/graphql/iam.gql'
import {
  mapGqlUserToErpUser,
  generateIdempotencyKey,
  type GqlTenantUser,
  type GqlRole
} from '@/services/adapters/iamAdapter'
import type { AuthenticatedUser, ChangeMyPasswordResult } from '@/types/authTypes'
import type {
  UserProfile,
  UpdateProfileInput,
  ChangePasswordInput,
  SystemRole,
  CompanySettings,
  BcvRateConfig,
  BcvRateAuditEntry,
  ErpUser,
  UserAccountStatus,
  CreateUserInput,
  UpdateUserInput,
  FiscalRulesConfig,
  ModuleHubTile,
  CommercialPoliciesSettings
} from '@/types/settingsTypes'

const STORAGE_KEYS = {
  USER_PROFILE: 'foundly_user_profile',
  COMPANY_SETTINGS: 'foundly_company_settings',
  BCV_SETTINGS: 'foundly_bcv_settings',
  ERP_USERS: 'foundly_erp_users',
  FISCAL_RULES: 'foundly_fiscal_rules',
  COMMERCIAL_POLICIES: 'foundly_commercial_policies'
}

export const DEFAULT_COMMERCIAL_POLICIES: CommercialPoliciesSettings = {
  salesInvoicingPolicyDefault: 'ORDERED',
  purchaseControlPolicyDefault: 'ORDERED',
  deliveryPolicyDefault: 'PARTIAL',
  negativeStockPolicy: 'FLEXIBLE',
  costosEnDestinoActivos: true
}

// Initial Seeds
const DEFAULT_PROFILE: UserProfile = {
  id: 'usr-admin-01',
  nombre: 'John Doe',
  email: 'admin@vuexy.com',
  telefono: '+58 412-1234567',
  avatarUrl: '/images/avatars/1.png',
  rol: 'ADMIN',
  tenantId: 'ten-forge-01',
  tenantName: 'Distribuidora Global C.A.',
  ultimoIngreso: '19/10/2026, 04:30 PM',
  creadoEn: '2026-01-15'
}

const DEFAULT_COMPANY: CompanySettings = {
  razonSocial: 'Distribuidora Global de Suministros C.A.',
  nombreComercial: 'Forge Global Suministros',
  rif: 'J-40192834-5',
  direccionFiscal: 'Av. Las Américas, Torre Empresarial piso 7, Ofic. 7-A, Puerto Ordaz, Bolívar',
  telefonoCorporativo: '+58 286-9614420',
  emailFacturacion: 'administracion@forgeglobal.com.ve',
  logoUrl: '/images/foundly-icon.png',
  monedaBase: 'USD',
  salesInvoicingPolicyDefault: 'ORDERED',
  purchaseControlPolicyDefault: 'ORDERED',
  deliveryPolicyDefault: 'PARTIAL',
  negativeStockPolicy: 'FLEXIBLE',
  costosEnDestinoActivos: true
}

const DEFAULT_BCV: BcvRateConfig = {
  tasaActiva: 54.20,
  ultimaSincronizacion: 'Hoy a las 07:00 AM - BCV Oficial',
  modoActualizacion: 'AUTOMATICO_7AM',
  fuenteOficial: 'Banco Central de Venezuela (BCV)',
  historial: [
    {
      id: 'bcv-hist-01',
      fechaHora: '19/10/2026 07:00 AM',
      tasaVes: 54.20,
      origen: 'AUTOMATICO_7AM',
      responsableNombre: 'Sistema (CRON BCV)',
      motivo: 'Sincronización matutina automática'
    },
    {
      id: 'bcv-hist-02',
      fechaHora: '18/10/2026 07:00 AM',
      tasaVes: 53.95,
      origen: 'AUTOMATICO_7AM',
      responsableNombre: 'Sistema (CRON BCV)',
      motivo: 'Sincronización matutina automática'
    },
    {
      id: 'bcv-hist-03',
      fechaHora: '17/10/2026 02:45 PM',
      tasaVes: 53.80,
      origen: 'MANUAL',
      responsableNombre: 'John Doe (Administrador)',
      motivo: 'Ajuste extraordinario vespertino de cierre semanal'
    }
  ]
}

const DEFAULT_USERS: ErpUser[] = [
  {
    id: 'usr-admin-01',
    nombre: 'John Doe',
    email: 'admin@vuexy.com',
    telefono: '+58 412-1234567',
    avatarUrl: '/images/avatars/1.png',
    rol: 'ADMIN',
    estado: 'ACTIVO',
    ultimoIngreso: '19/10/2026 04:30 PM',
    creadoEn: '15/01/2026'
  },
  {
    id: 'usr-02',
    nombre: 'Elena Rivas',
    email: 'elena.rivas@forgeglobal.com',
    telefono: '+58 414-9876543',
    avatarUrl: '/images/avatars/2.png',
    rol: 'ALMACEN',
    estado: 'ACTIVO',
    ultimoIngreso: '19/10/2026 03:15 PM',
    creadoEn: '20/01/2026'
  },
  {
    id: 'usr-03',
    nombre: 'Carlos Mendoza',
    email: 'carlos.m@forgeglobal.com',
    telefono: '+58 424-5551234',
    avatarUrl: '/images/avatars/3.png',
    rol: 'VENTAS',
    estado: 'ACTIVO',
    ultimoIngreso: '19/10/2026 01:20 PM',
    creadoEn: '01/02/2026'
  },
  {
    id: 'usr-04',
    nombre: 'Mariana Salazar',
    email: 'mariana.s@forgeglobal.com',
    telefono: '+58 416-8889900',
    avatarUrl: '/images/avatars/4.png',
    rol: 'COMPRAS',
    estado: 'ACTIVO',
    ultimoIngreso: '18/10/2026 05:40 PM',
    creadoEn: '10/02/2026'
  },
  {
    id: 'usr-05',
    nombre: 'Roberto Padrón',
    email: 'cajero.puerto@forgeglobal.com',
    telefono: '+58 412-3334455',
    avatarUrl: '/images/avatars/5.png',
    rol: 'CAJERO_POS',
    estado: 'ACTIVO',
    ultimoIngreso: '19/10/2026 11:10 AM',
    creadoEn: '05/03/2026'
  }
]

const DEFAULT_FISCAL_RULES: FiscalRulesConfig = {
  localizacionVeActiva: true,
  ivaGeneralPct: 16,
  ivaReducidoPct: 8,
  exentoPct: 0,
  igtfPct: 3,
  retencionIvaPorDefecto: 75,
  diasVigenciaCotizacion: 15,
  salesInvoicingPolicyDefault: 'ORDERED',
  purchaseControlPolicyDefault: 'ORDERED',
  deliveryPolicyDefault: 'PARTIAL',
  negativeStockPolicy: 'FLEXIBLE',
  costosEnDestinoActivos: true
}

// Helpers for localStorage
const getStoredItem = <T>(key: string, defaultVal: T): T => {
  if (typeof window === 'undefined') return defaultVal

  try {
    const item = localStorage.getItem(key)

    return item ? JSON.parse(item) : defaultVal
  } catch {
    return defaultVal
  }
}

const setStoredItem = <T>(key: string, val: T): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (e) {
    console.error(`Error saving to localStorage key "${key}":`, e)
  }
}

export const normalizeSystemRole = (role?: string | null, roles?: string[] | null): SystemRole => {
  const candidate = String(role || (roles && roles[0]) || '').trim().toUpperCase()

  if (candidate === 'ADMIN' || candidate === 'OWNER' || candidate === 'SUPERADMIN') {
    return 'ADMIN'
  }

  if (candidate === 'VENTAS' || candidate === 'SALES') return 'VENTAS'
  if (candidate === 'COMPRAS' || candidate === 'PURCHASING') return 'COMPRAS'
  if (candidate === 'ALMACEN' || candidate === 'WAREHOUSE') return 'ALMACEN'
  if (candidate === 'CAJERO_POS' || candidate === 'POS' || candidate === 'CAJERO') return 'CAJERO_POS'

  return 'UNASSIGNED'
}

export const settingsService = {
  // 1. User Profile (Conexión GraphQL con forge-backend y fallback resiliente)
  getUserProfile: async (): Promise<UserProfile> => {
    // 1. Intentar obtener perfil en tiempo real desde el backend GraphQL (Query `me`)
    try {
      const res = await executeGraphQL<{ me: AuthenticatedUser }>(ME_QUERY, undefined, { timeoutMs: 5000 })

      if (res?.me) {
        const me = res.me
        const role = normalizeSystemRole(me.role, me.roles)

        const profile: UserProfile = {
          id: me.id,
          nombre: me.name || me.email.split('@')[0],
          email: me.email,
          telefono: me.phone || '',
          avatarUrl: me.avatarUrl || '/images/avatars/1.png',
          rol: role,
          tenantId: me.tenantId,
          tenantName: me.tenantName,
          ultimoIngreso: me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString('es-VE') : undefined,
          creadoEn: me.createdAt ? new Date(me.createdAt).toLocaleDateString('es-VE') : 'Reciente'
        }

        // Cache local
        setStoredItem(STORAGE_KEYS.USER_PROFILE, profile)

        if (typeof window !== 'undefined') {
          localStorage.setItem('foundly_auth_user', JSON.stringify({ ...me, role }))
        }

        return profile
      }
    } catch (err) {
      console.warn('[settingsService] Backend offline o latencia en me, usando caché local:', err)
    }

    // Fallback: leer de almacenamiento local
    const stored = getStoredItem<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_PROFILE)

    if (typeof window !== 'undefined') {
      try {
        const rawAuthUser = localStorage.getItem('foundly_auth_user')

        if (rawAuthUser) {
          const authUser = JSON.parse(rawAuthUser)

          if (authUser?.email) {
            return {
              ...stored,
              id: authUser.id || stored.id,
              nombre: authUser.name || stored.nombre,
              email: authUser.email || stored.email,
              telefono: authUser.phone !== undefined ? authUser.phone : stored.telefono,
              avatarUrl: authUser.avatarUrl || stored.avatarUrl,
              rol: normalizeSystemRole(authUser.role, authUser.roles),
              tenantId: authUser.tenantId || stored.tenantId,
              tenantName: authUser.tenantName || stored.tenantName
            }
          }
        }
      } catch (err) {
        console.error('Error resolving user profile from auth:', err)
      }
    }

    return stored
  },

  updateUserProfile: async (input: UpdateProfileInput): Promise<UserProfile> => {
    // 1. Intentar actualizar en backend GraphQL (Mutación `updateMyProfile`)
    let updatedBackendProfile: AuthenticatedUser | null = null

    try {
      const res = await executeGraphQL<
        { updateMyProfile: { profile: AuthenticatedUser } },
        { input: { name: string; phone?: string; avatarUrl?: string } }
      >(
        UPDATE_MY_PROFILE_MUTATION,
        {
          input: {
            name: input.nombre.trim(),
            phone: input.telefono?.trim() || undefined,
            avatarUrl: input.avatarUrl || undefined
          }
        },
        { timeoutMs: 6000 }
      )

      if (res?.updateMyProfile?.profile) {
        updatedBackendProfile = res.updateMyProfile.profile
      }
    } catch (err) {
      console.warn('[settingsService] Fallback a persistencia local para updateUserProfile:', err)
    }

    const current = getStoredItem<UserProfile>(STORAGE_KEYS.USER_PROFILE, DEFAULT_PROFILE)

    const updated: UserProfile = {
      ...current,
      nombre: updatedBackendProfile?.name || input.nombre.trim(),
      telefono: updatedBackendProfile?.phone !== undefined ? updatedBackendProfile.phone : input.telefono?.trim(),
      avatarUrl: updatedBackendProfile?.avatarUrl || input.avatarUrl || current.avatarUrl
    }

    setStoredItem(STORAGE_KEYS.USER_PROFILE, updated)

    if (typeof window !== 'undefined') {
      try {
        const rawAuthUser = localStorage.getItem('foundly_auth_user')

        if (rawAuthUser) {
          const authUser = JSON.parse(rawAuthUser)

          const newAuthUser = {
            ...authUser,
            name: updated.nombre,
            phone: updated.telefono,
            avatarUrl: updated.avatarUrl
          }

          localStorage.setItem('foundly_auth_user', JSON.stringify(newAuthUser))
        }
      } catch {
        // Ignorar
      }
    }

    // Sincronizar también en directorio local de usuarios ERP
    const users = getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)

    const syncUsers = users.map(u =>
      u.id === updated.id
        ? { ...u, nombre: updated.nombre, telefono: updated.telefono, avatarUrl: updated.avatarUrl }
        : u
    )

    setStoredItem(STORAGE_KEYS.ERP_USERS, syncUsers)

    return updated
  },

  changePassword: async (input: ChangePasswordInput): Promise<{ success: boolean; message: string }> => {
    if (input.newPassword.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' }
    }

    if (input.newPassword !== input.confirmPassword) {
      return { success: false, message: 'La confirmación de la contraseña no coincide.' }
    }

    // 1. Intentar actualizar contraseña en backend GraphQL (Mutación `changeMyPassword`)
    try {
      const res = await executeGraphQL<
        { changeMyPassword: ChangeMyPasswordResult },
        { input: { currentPassword: string; newPassword: string; closeOtherSessions?: boolean } }
      >(
        CHANGE_MY_PASSWORD_MUTATION,
        {
          input: {
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
            closeOtherSessions: false
          }
        },
        { timeoutMs: 6000 }
      )

      if (res?.changeMyPassword) {
        return {
          success: res.changeMyPassword.success,
          message: res.changeMyPassword.message || 'Contraseña actualizada exitosamente.'
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar la contraseña en el servidor.'

      return {
        success: false,
        message: errorMessage
      }
    }

    return { success: true, message: 'Contraseña actualizada exitosamente.' }
  },

  // 2. Company Settings
  getCompanySettings: async (): Promise<CompanySettings> => {
    return getStoredItem<CompanySettings>(STORAGE_KEYS.COMPANY_SETTINGS, DEFAULT_COMPANY)
  },

  updateCompanySettings: async (input: Partial<CompanySettings>): Promise<CompanySettings> => {
    const current = getStoredItem<CompanySettings>(STORAGE_KEYS.COMPANY_SETTINGS, DEFAULT_COMPANY)
    const updated: CompanySettings = { ...current, ...input }

    setStoredItem(STORAGE_KEYS.COMPANY_SETTINGS, updated)

    return updated
  },

  // 3. BCV & Currency Settings
  getBcvSettings: async (): Promise<BcvRateConfig> => {
    return getStoredItem<BcvRateConfig>(STORAGE_KEYS.BCV_SETTINGS, DEFAULT_BCV)
  },

  updateBcvRate: async (
    tasa: number,
    modo: 'AUTOMATICO_7AM' | 'MANUAL',
    motivo: string,
    responsable: string
  ): Promise<BcvRateConfig> => {
    const current = getStoredItem<BcvRateConfig>(STORAGE_KEYS.BCV_SETTINGS, DEFAULT_BCV)
    const now = new Date()
    const fechaHora = now.toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })

    const newAuditEntry: BcvRateAuditEntry = {
      id: `bcv-hist-${Date.now()}`,
      fechaHora,
      tasaVes: Number(tasa),
      origen: modo,
      responsableNombre: responsable,
      motivo: motivo.trim() || undefined
    }

    const updated: BcvRateConfig = {
      ...current,
      tasaActiva: Number(tasa),
      ultimaSincronizacion:
        modo === 'AUTOMATICO_7AM'
          ? `Hoy a las 07:00 AM - BCV Oficial`
          : `Fijada manualmente el ${fechaHora}`,
      modoActualizacion: modo,
      historial: [newAuditEntry, ...current.historial]
    }

    setStoredItem(STORAGE_KEYS.BCV_SETTINGS, updated)

    return updated
  },

  toggleBcvAutoMode: async (auto: boolean, responsable: string): Promise<BcvRateConfig> => {
    const current = getStoredItem<BcvRateConfig>(STORAGE_KEYS.BCV_SETTINGS, DEFAULT_BCV)
    const modo = auto ? 'AUTOMATICO_7AM' : 'MANUAL'

    return settingsService.updateBcvRate(
      current.tasaActiva,
      modo,
      auto ? 'Reanudada sincronización automática BCV' : 'Pausada sincronización para control manual',
      responsable
    )
  },

  // 4. ERP Users & Roles (RBAC con backend GraphQL BE-IAM-02)
  getAssignableRoles: async (): Promise<GqlRole[]> => {
    try {
      const res = await executeGraphQL<{ assignableRoles: GqlRole[] }>(
        GET_ASSIGNABLE_ROLES_QUERY,
        { take: 50 },
        { timeoutMs: 5000 }
      )

      if (res?.assignableRoles && Array.isArray(res.assignableRoles)) {
        return res.assignableRoles
      }
    } catch (err) {
      console.warn('[settingsService] Fallback a roles predeterminados:', err)
    }

    return [
      { id: 'role-admin', name: 'Administrador', description: 'Acceso total al sistema', isSystem: true },
      { id: 'role-ventas', name: 'Ventas', description: 'Cotizaciones y pedidos', isSystem: true },
      { id: 'role-compras', name: 'Compras', description: 'Abastecimiento y órdenes', isSystem: true },
      { id: 'role-almacen', name: 'Almacén', description: 'Inventario y kárdex', isSystem: true },
      { id: 'role-cajero', name: 'Cajero POS', description: 'Punto de venta y turnos', isSystem: true }
    ]
  },

  getMyPermissions: async (): Promise<string[]> => {
    try {
      const res = await executeGraphQL<{ myPermissions: string[] }>(
        GET_MY_PERMISSIONS_QUERY,
        undefined,
        { timeoutMs: 4000 }
      )

      if (res?.myPermissions && Array.isArray(res.myPermissions)) {
        return res.myPermissions
      }
    } catch {
      // Ignorar
    }

    return []
  },

  getErpUsers: async (): Promise<ErpUser[]> => {
    try {
      const res = await executeGraphQL<{ tenantUsers: GqlTenantUser[] }>(
        GET_TENANT_USERS_QUERY,
        { take: 100 },
        { timeoutMs: 5000 }
      )

      if (res?.tenantUsers && Array.isArray(res.tenantUsers)) {
        const mappedUsers = res.tenantUsers.map(mapGqlUserToErpUser)

        if (mappedUsers.length > 0) {
          const backendIds = new Set(mappedUsers.map(u => u.id))
          const stored = getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)
          const localOnly = stored.filter(u => !backendIds.has(u.id) && u.id.startsWith('usr-'))
          const combined = [...mappedUsers, ...localOnly]

          setStoredItem(STORAGE_KEYS.ERP_USERS, combined)

          return combined
        }
      }
    } catch (err) {
      console.warn('[settingsService] Error al consultar tenantUsers de backend:', err)
    }

    return getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)
  },

  createErpUser: async (input: CreateUserInput): Promise<ErpUser> => {
    // 1. Intentar resolver el roleId si se envió solo el rol conceptual
    try {
      const roles = await settingsService.getAssignableRoles()
      let targetRole = roles.find(r => r.name.toLowerCase() === input.rol.toLowerCase())

      if (!targetRole && input.rol === 'ADMIN') {
        targetRole = roles.find(r => r.name.toUpperCase().includes('ADMIN') || r.isSystem)
      }

      const initialRoleId = targetRole?.id || roles[0]?.id

      if (initialRoleId && initialRoleId.length > 10) {
        const res = await executeGraphQL<{ inviteTenantUser: { ok: boolean; message: string } }>(
          INVITE_TENANT_USER_MUTATION,
          {
            input: {
              email: input.email.trim().toLowerCase(),
              name: input.nombre.trim(),
              phone: input.telefono?.trim() || undefined,
              initialRoleId
            }
          },
          { timeoutMs: 10000 }
        )

        if (res?.inviteTenantUser?.ok) {
          // Refrescar usuarios de backend
          const refreshed = await settingsService.getErpUsers()
          const created = refreshed.find(u => u.email.toLowerCase() === input.email.toLowerCase())

          if (created) return created
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar usuario en el servidor.'

      throw new Error(msg)
    }

    const users = getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)

    if (users.some(u => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error(`Ya existe un usuario registrado con el correo ${input.email}`)
    }

    const now = new Date()
    const creadoEn = now.toLocaleDateString('es-VE')

    const newUser: ErpUser = {
      id: `usr-${Date.now()}`,
      nombre: input.nombre.trim(),
      email: input.email.trim().toLowerCase(),
      telefono: input.telefono?.trim(),
      avatarUrl: `/images/avatars/${(users.length % 8) + 1}.png`,
      rol: input.rol,
      estado: input.estado || 'ACTIVO',
      creadoEn
    }

    const updated = [newUser, ...users]

    setStoredItem(STORAGE_KEYS.ERP_USERS, updated)

    return newUser
  },

  updateErpUser: async (id: string, input: UpdateUserInput): Promise<ErpUser> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      // 1. Actualizar datos básicos (nombre y teléfono)
      try {
        await executeGraphQL(
          UPDATE_TENANT_USER_MUTATION,
          {
            input: {
              userId: id,
              name: input.nombre.trim(),
              phone: input.telefono?.trim() || undefined
            }
          },
          { timeoutMs: 8000 }
        )

        // 2. Resolver y actualizar roles si aplica
        const roles = await settingsService.getAssignableRoles()

        const targetRole = roles.find(
          r => r.name.toLowerCase() === input.rol.toLowerCase() || (input.rol === 'ADMIN' && r.name.toUpperCase().includes('ADMIN'))
        )

        if (targetRole) {
          const idempotencyKey = generateIdempotencyKey()

          await executeGraphQL(
            SET_TENANT_USER_ROLES_MUTATION,
            {
              input: {
                userId: id,
                roleIds: [targetRole.id],
                idempotencyKey
              }
            },
            { timeoutMs: 8000 }
          )
        }

        // 3. Actualizar estado (activo / inactivo)
        if (input.estado === 'INACTIVO') {
          await executeGraphQL(
            DEACTIVATE_TENANT_USER_MUTATION,
            { input: { userId: id, reason: 'Desactivado por administrador' } },
            { timeoutMs: 8000 }
          )
        } else if (input.estado === 'ACTIVO') {
          await executeGraphQL(
            ACTIVATE_TENANT_USER_MUTATION,
            { input: { userId: id } },
            { timeoutMs: 8000 }
          )
        }

        const refreshed = await settingsService.getErpUsers()
        const updated = refreshed.find(u => u.id === id)

        if (updated) return updated
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar el usuario en el servidor.'

        throw new Error(msg)
      }
    }

    const users = getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)
    const target = users.find(u => u.id === id)

    if (!target) {
      throw new Error('Usuario no encontrado.')
    }

    // Protection of last active admin
    if (target.rol === 'ADMIN' && input.rol !== 'ADMIN') {
      const activeAdmins = users.filter(u => u.rol === 'ADMIN' && u.estado === 'ACTIVO')

      if (activeAdmins.length <= 1) {
        throw new Error('No es posible revocar el rol al único Administrador activo del sistema.')
      }
    }

    if (target.rol === 'ADMIN' && input.estado === 'INACTIVO') {
      const activeAdmins = users.filter(u => u.rol === 'ADMIN' && u.estado === 'ACTIVO' && u.id !== id)

      if (activeAdmins.length === 0) {
        throw new Error('No es posible desactivar al único Administrador activo del sistema.')
      }
    }

    if (input.password && input.password.trim().length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.')
    }

    const updatedUsers = users.map(u =>
      u.id === id
        ? {
            ...u,
            nombre: input.nombre.trim(),
            telefono: input.telefono?.trim(),
            rol: input.rol,
            estado: input.estado
          }
        : u
    )

    setStoredItem(STORAGE_KEYS.ERP_USERS, updatedUsers)

    return updatedUsers.find(u => u.id === id)!
  },

  toggleErpUserStatus: async (id: string): Promise<ErpUser> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      const users = await settingsService.getErpUsers()
      const target = users.find(u => u.id === id)

      if (!target) throw new Error('Usuario no encontrado.')

      try {
        if (target.estado === 'ACTIVO') {
          await executeGraphQL(
            DEACTIVATE_TENANT_USER_MUTATION,
            { input: { userId: id, reason: 'Desactivación administrativa' } },
            { timeoutMs: 8000 }
          )
        } else {
          await executeGraphQL(
            ACTIVATE_TENANT_USER_MUTATION,
            { input: { userId: id } },
            { timeoutMs: 8000 }
          )
        }

        const refreshed = await settingsService.getErpUsers()

        return refreshed.find(u => u.id === id)!
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cambiar el estado del usuario en el servidor.'

        throw new Error(msg)
      }
    }

    const users = getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)
    const target = users.find(u => u.id === id)

    if (!target) throw new Error('Usuario no encontrado.')

    const newStatus: UserAccountStatus = target.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'

    if (target.rol === 'ADMIN' && newStatus === 'INACTIVO') {
      const otherActiveAdmins = users.filter(u => u.rol === 'ADMIN' && u.estado === 'ACTIVO' && u.id !== id)

      if (otherActiveAdmins.length === 0) {
        throw new Error('No es posible desactivar al único Administrador activo del sistema.')
      }
    }

    const updatedUsers = users.map(u => (u.id === id ? { ...u, estado: newStatus } : u))

    setStoredItem(STORAGE_KEYS.ERP_USERS, updatedUsers)

    return updatedUsers.find(u => u.id === id)!
  },

  deleteErpUser: async (id: string): Promise<void> => {
    const users = getStoredItem<ErpUser[]>(STORAGE_KEYS.ERP_USERS, DEFAULT_USERS)
    const target = users.find(u => u.id === id)

    if (!target) throw new Error('Usuario no encontrado.')

    if (target.rol === 'ADMIN') {
      const otherActiveAdmins = users.filter(u => u.rol === 'ADMIN' && u.estado === 'ACTIVO' && u.id !== id)

      if (otherActiveAdmins.length === 0) {
        throw new Error('No es posible eliminar al único Administrador del sistema.')
      }
    }

    const filtered = users.filter(u => u.id !== id)

    setStoredItem(STORAGE_KEYS.ERP_USERS, filtered)
  },

  // 5. Fiscal Rules
  getFiscalRules: async (): Promise<FiscalRulesConfig> => {
    return getStoredItem<FiscalRulesConfig>(STORAGE_KEYS.FISCAL_RULES, DEFAULT_FISCAL_RULES)
  },

  updateFiscalRules: async (input: Partial<FiscalRulesConfig>): Promise<FiscalRulesConfig> => {
    const current = getStoredItem<FiscalRulesConfig>(STORAGE_KEYS.FISCAL_RULES, DEFAULT_FISCAL_RULES)
    const updated: FiscalRulesConfig = { ...current, ...input }

    setStoredItem(STORAGE_KEYS.FISCAL_RULES, updated)

    return updated
  },

  // 5.1 Commercial Policies (Regla R6)
  getCommercialPolicies: async (): Promise<CommercialPoliciesSettings> => {
    return getStoredItem<CommercialPoliciesSettings>(
      STORAGE_KEYS.COMMERCIAL_POLICIES,
      DEFAULT_COMMERCIAL_POLICIES
    )
  },

  updateCommercialPolicies: async (
    input: Partial<CommercialPoliciesSettings>
  ): Promise<CommercialPoliciesSettings> => {
    const current = getStoredItem<CommercialPoliciesSettings>(
      STORAGE_KEYS.COMMERCIAL_POLICIES,
      DEFAULT_COMMERCIAL_POLICIES
    )

    const updated: CommercialPoliciesSettings = { ...current, ...input }

    setStoredItem(STORAGE_KEYS.COMMERCIAL_POLICIES, updated)

    return updated
  },

  // 6. Odoo Hub Tiles (Summary tiles linking to existing modules)
  getModuleHubTiles: async (): Promise<ModuleHubTile[]> => {
    return [
      {
        id: 'hub-wh',
        modulo: 'INVENTARIO',
        titulo: 'Almacenes y Ubicaciones',
        descripcionCorta: 'Gestión de almacenes físicos, estantes, pasillos y centros de distribución.',
        icono: 'tabler-building-warehouse',
        colorAccent: '#6C5CE7',
        bgAccent: '#F0EEF9',
        rutaDestino: '/inventory/settings/warehouses',
        metricasResumen: [
          { label: 'Almacenes Físicos', valor: '2 activos' },
          { label: 'Ubicaciones', valor: '6 zonas' }
        ]
      },
      {
        id: 'hub-cat',
        modulo: 'INVENTARIO',
        titulo: 'Categorías de Productos',
        descripcionCorta: 'Estructura taxonómica, familias comerciales y cuentas contables por defecto.',
        icono: 'tabler-category',
        colorAccent: '#6C5CE7',
        bgAccent: '#F0EEF9',
        rutaDestino: '/inventory/settings/categories',
        metricasResumen: [{ label: 'Categorías', valor: '5 registradas' }]
      },
      {
        id: 'hub-pos-terminal',
        modulo: 'POS',
        titulo: 'Terminales y Cajas POS',
        descripcionCorta: 'Puntos de venta habilitados para emisión de tickets rápidos y cobro presencial.',
        icono: 'tabler-device-tablet',
        colorAccent: '#0284C7',
        bgAccent: '#E0F2FE',
        rutaDestino: '/pos/terminal',
        metricasResumen: [
          { label: 'Caja Principal', valor: 'Operativa' },
          { label: 'Moneda de Cobro', valor: 'Bimonetaria' }
        ]
      },
      {
        id: 'hub-pos-shifts',
        modulo: 'POS',
        titulo: 'Turnos y Arqueos de Caja',
        descripcionCorta: 'Historial de aperturas, cierres ciegos y diferencias de caja en USD y VES.',
        icono: 'tabler-clock-dollar',
        colorAccent: '#0284C7',
        bgAccent: '#E0F2FE',
        rutaDestino: '/pos/shifts',
        metricasResumen: [{ label: 'Turno Activo', valor: '#TUR-0024' }]
      },
      {
        id: 'hub-contacts',
        modulo: 'CONTACTOS',
        titulo: 'Directorio de Terceros',
        descripcionCorta: 'Clientes, Proveedores y Empresas con RIF, condición fiscal y términos comerciales.',
        icono: 'tabler-address-book',
        colorAccent: '#10B981',
        bgAccent: '#E8F5E9',
        rutaDestino: '/contacts',
        metricasResumen: [
          { label: 'Clientes', valor: '12 registrados' },
          { label: 'Proveedores', valor: '5 calificados' }
        ]
      },
      {
        id: 'hub-sales',
        modulo: 'VENTAS',
        titulo: 'Ventas y Cotizaciones',
        descripcionCorta: 'Presupuestos bimonetarios con tasa BCV congelada y emisión de órdenes de venta.',
        icono: 'tabler-file-invoice',
        colorAccent: '#F59E0B',
        bgAccent: '#FEF3C7',
        rutaDestino: '/sales/quotes',
        metricasResumen: [{ label: 'Vigencia Cotización', valor: '15 días' }]
      },
      {
        id: 'hub-purchases',
        modulo: 'COMPRAS',
        titulo: 'Compras y Abastecimiento',
        descripcionCorta: 'Solicitudes de cotización a proveedores, aprobación de costos y órdenes de compra.',
        icono: 'tabler-shopping-bag',
        colorAccent: '#8B5CF6',
        bgAccent: '#EDE9FE',
        rutaDestino: '/purchases/quotes',
        metricasResumen: [{ label: 'Moneda Base', valor: 'USD' }]
      }
    ]
  }
}
