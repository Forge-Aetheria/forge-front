import { UPSERT_EXCHANGE_RATE_MUTATION } from '@/graphql/accounting.gql'
import { executeGraphQL } from '@/libs/graphqlClient'
import { fetchActiveBcvRate, invalidateActiveBcvRateCache } from '@/services/bcvService'
import { TENANT_AVATAR_UPDATED_EVENT } from '@/utils/tenantAvatar'
import {
  CHANGE_MY_PASSWORD_MUTATION,
  ME_QUERY,
  UPDATE_MY_PROFILE_MUTATION
} from '@/graphql/auth.gql'
import {
  ACTIVATE_TENANT_USER_MUTATION,
  ASSIGN_ROLE_TO_USER_MUTATION,
  DEACTIVATE_TENANT_USER_MUTATION,
  GET_ASSIGNABLE_ROLES_QUERY,
  GET_MY_PERMISSIONS_QUERY,
  GET_TENANT_LICENSE_QUERY,
  GET_TENANT_ONBOARDING_QUERY,
  GET_TENANT_USERS_QUERY,
  INVITE_TENANT_USER_MUTATION,
  REVOKE_ROLE_FROM_USER_MUTATION,
  UPDATE_TENANT_USER_MUTATION
} from '@/graphql/iam.gql'
import { diffRoleIds, validateRoleIds } from '@/utils/roleSet'
import { GET_TENANT_SETTING_QUERY, SET_TENANT_SETTING_MUTATION } from '@/graphql/pos.gql'
import {
  mapGqlUserToErpUser,
  type GqlRole,
  type GqlTenantUser
} from '@/services/adapters/iamAdapter'
import type { AuthenticatedUser, ChangeMyPasswordResult } from '@/types/authTypes'
import type {
  BcvRateAuditEntry,
  BcvRateConfig,
  ChangePasswordInput,
  CommercialPoliciesSettings,
  CompanySettings,
  CreateUserInput,
  ErpUser,
  FiscalRulesConfig,
  SystemRole,
  UpdateProfileInput,
  UpdateUserInput,
  UserProfile
} from '@/types/settingsTypes'

const EMPTY_COMPANY: CompanySettings = {
  razonSocial: '',
  nombreComercial: '',
  rif: '',
  direccionFiscal: '',
  telefonoCorporativo: '',
  emailFacturacion: '',
  logoUrl: '',
  monedaBase: 'USD'
}

const DEFAULT_COMMERCIAL_POLICIES: CommercialPoliciesSettings = {
  salesInvoicingPolicyDefault: 'ORDERED',
  purchaseControlPolicyDefault: 'ORDERED',
  deliveryPolicyDefault: 'PARTIAL',
  negativeStockPolicy: 'FLEXIBLE',
  costosEnDestinoActivos: true
}

const DEFAULT_FISCAL_RULES: FiscalRulesConfig = {
  localizacionVeActiva: true,
  ivaGeneralPct: 16,
  ivaReducidoPct: 8,
  exentoPct: 0,
  igtfPct: 3,
  retencionIvaPorDefecto: 75,
  diasVigenciaCotizacion: 15,
  ...DEFAULT_COMMERCIAL_POLICIES
}

const normalizeRole = (role?: string | null, roles?: string[] | null): SystemRole => {
  const value = String(role || (roles && roles[0]) || '').toUpperCase()

  if (value.includes('ADMIN')) return 'ADMIN'
  if (value.includes('VENT')) return 'VENTAS'
  if (value.includes('COMPR')) return 'COMPRAS'
  if (value.includes('ALMAC')) return 'ALMACEN'
  if (value.includes('CAJ') || value.includes('POS')) return 'CAJERO_POS'

  return 'UNASSIGNED'
}

const mapMe = (me: AuthenticatedUser): UserProfile => ({
  id: me.id,
  nombre: me.name || me.email.split('@')[0],
  email: me.email,
  telefono: me.phone || '',
  avatarUrl: me.avatarUrl || '',
  rol: normalizeRole(me.role, me.roles),
  tenantId: me.tenantId,
  tenantName: me.tenantName,
  ultimoIngreso: me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString('es-VE') : undefined,
  creadoEn: me.createdAt ? new Date(me.createdAt).toLocaleDateString('es-VE') : ''
})

const getTenantSetting = async (key: string): Promise<string> => {
  const response = await executeGraphQL<{ tenantSetting: string }>(
    GET_TENANT_SETTING_QUERY,
    { key },
    { timeoutMs: 5000 }
  )

  return response.tenantSetting
}

const setTenantSetting = async (key: string, value: unknown): Promise<void> => {
  await executeGraphQL(
    SET_TENANT_SETTING_MUTATION,
    { input: { key, value: JSON.stringify(value) } },
    { timeoutMs: 5000 }
  )
}

const createAuditEntryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bcv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const normalizeBcvHistory = (entries: BcvRateAuditEntry[]): BcvRateAuditEntry[] => {
  const seen = new Set<string>()

  return entries.map((entry, index) => {
    const baseId = entry.id || `bcv-history-${index}`
    let id = baseId
    let suffix = index

    while (seen.has(id)) {
      suffix += 1
      id = `${baseId}-${suffix}`
    }

    seen.add(id)

    return id === entry.id ? entry : { ...entry, id }
  })
}

const parseSetting = <T>(value: string, fallback: T): T => {
  if (!value) return fallback

  try {
    return { ...fallback, ...JSON.parse(value) } as T
  } catch {
    return fallback
  }
}

export type ErpUserWriteStage = 'profile' | 'status' | 'roles'

const STAGE_LABELS: Record<ErpUserWriteStage, string> = {
  profile: 'los datos de contacto',
  status: 'el estado de la cuenta',
  roles: 'los roles'
}

/** Raised when one write stage fails after another stage already committed. */
export class ErpUserPartialUpdateError extends Error {
  readonly failedStage: ErpUserWriteStage
  readonly completedStages: ErpUserWriteStage[]
  readonly originalError: unknown

  constructor(
    failedStage: ErpUserWriteStage,
    completedStages: ErpUserWriteStage[],
    originalError: unknown
  ) {
    const reason = originalError instanceof Error ? originalError.message : 'Error desconocido'

    super(`No se pudo actualizar ${STAGE_LABELS[failedStage]}: ${reason}`)
    this.name = 'ErpUserPartialUpdateError'
    this.failedStage = failedStage
    this.completedStages = completedStages
    this.originalError = originalError
  }
}

/** Raised when the write succeeded but the affected user could not be reloaded. */
export class ErpUserRefreshError extends Error {
  readonly userId: string
  readonly originalError: unknown

  constructor(userId: string, originalError: unknown) {
    super('El usuario se guardó, pero no se pudo recargar la información actualizada.')
    this.name = 'ErpUserRefreshError'
    this.userId = userId
    this.originalError = originalError
  }
}

export const settingsService = {
  async getUserProfile(): Promise<UserProfile> {
    const response = await executeGraphQL<{ me: AuthenticatedUser }>(ME_QUERY, undefined, {
      timeoutMs: 5000
    })

    return mapMe(response.me)
  },

  async updateUserProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const response = await executeGraphQL<{ updateMyProfile: { profile: AuthenticatedUser } }>(
      UPDATE_MY_PROFILE_MUTATION,
      {
        input: {
          name: input.nombre.trim(),
          phone: input.telefono?.trim() || undefined,
          avatarUrl: input.avatarUrl || undefined
        }
      },
      { timeoutMs: 8000 }
    )

    return mapMe(response.updateMyProfile.profile)
  },

  async changePassword(input: ChangePasswordInput): Promise<ChangeMyPasswordResult> {
    const response = await executeGraphQL<{
      changeMyPassword: { success: boolean; message: string }
    }>(
      CHANGE_MY_PASSWORD_MUTATION,
      {
        input: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          closeOtherSessions: false
        }
      },
      { timeoutMs: 8000 }
    )

    return response.changeMyPassword
  },

  async getCompanySettings(): Promise<CompanySettings> {
    const [onboarding, profileRaw] = await Promise.all([
      executeGraphQL<{
        tenantOnboarding: {
          legalName: string | null
          tradeName: string | null
          docType: string | null
          docNumber: string | null
          checkDigit: string | null
          fiscalAddress: string | null
          baseCurrency: 'USD' | 'VES' | null
        }
      }>(GET_TENANT_ONBOARDING_QUERY, undefined, { timeoutMs: 5000 }),
      getTenantSetting('company.profile')
    ])

    const onboardingData = onboarding.tenantOnboarding
    const profile = parseSetting<Partial<CompanySettings>>(profileRaw, {})

    return {
      ...EMPTY_COMPANY,
      ...profile,
      razonSocial: onboardingData.legalName || profile.razonSocial || '',
      nombreComercial: onboardingData.tradeName || profile.nombreComercial || '',
      rif:
        onboardingData.docType && onboardingData.docNumber
          ? `${onboardingData.docType}-${onboardingData.docNumber}${onboardingData.checkDigit ? `-${onboardingData.checkDigit}` : ''}`
          : profile.rif || '',
      direccionFiscal: onboardingData.fiscalAddress || profile.direccionFiscal || '',
      monedaBase: onboardingData.baseCurrency || profile.monedaBase || 'USD'
    }
  },

  async updateCompanySettings(input: Partial<CompanySettings>): Promise<CompanySettings> {
    const current = await this.getCompanySettings()
    const updated = { ...current, ...input }

    await setTenantSetting('company.profile', updated)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(TENANT_AVATAR_UPDATED_EVENT))
    }

    return updated
  },

  async getBcvSettings(): Promise<BcvRateConfig> {
    const [rate, configRaw] = await Promise.all([
      fetchActiveBcvRate(),
      getTenantSetting('company.bcvConfig')
    ])

    const config = parseSetting<Partial<BcvRateConfig>>(configRaw, {})

    return {
      tasaActiva: rate.ok ? rate.data.rate : 0,
      ultimaSincronizacion: rate.ok ? rate.data.capturedAt : '',
      modoActualizacion: config.modoActualizacion || 'AUTOMATICO_7AM',
      fuenteOficial: rate.ok ? rate.data.source : 'BCV',
      historial: normalizeBcvHistory(config.historial || [])
    }
  },

  async updateBcvSettings(input: Partial<BcvRateConfig>): Promise<BcvRateConfig> {
    const current = await this.getBcvSettings()
    const updated = { ...current, ...input }

    await setTenantSetting('company.bcvConfig', updated)

    return updated
  },

  async updateBcvRate(
    rate: number,
    mode: 'AUTOMATICO_7AM' | 'MANUAL' = 'MANUAL',
    reason?: string,
    responsible?: string
  ): Promise<BcvRateConfig> {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('La tasa debe ser mayor a cero.')
    }

    const saved = await executeGraphQL<{
      upsertExchangeRate: {
        id: string
        rate: string
        source: string
        effectiveDate: string
        updatedAt: string
      }
    }>(
      UPSERT_EXCHANGE_RATE_MUTATION,
      {
        input: {
          effectiveDate: new Date().toISOString(),
          rate: rate.toFixed(4),
          source: 'BCV'
        }
      },
      { timeoutMs: 5000 }
    )

    const savedRate = Number(saved.upsertExchangeRate.rate)

    invalidateActiveBcvRateCache()

    const current = await this.getBcvSettings()

    const entry: BcvRateAuditEntry = {
      id: createAuditEntryId(),
      fechaHora: new Date().toLocaleString('es-VE'),
      tasaVes: savedRate,
      origen: mode,
      responsableNombre: responsible || 'Administrador',
      motivo: reason
    }

    return this.updateBcvSettings({
      tasaActiva: savedRate,
      ultimaSincronizacion: saved.upsertExchangeRate.updatedAt,
      modoActualizacion: mode,
      historial: [entry, ...(current.historial || [])].slice(0, 50)
    })
  },

  async toggleBcvAutoMode(
    auto?: boolean,
    _responsible?: string
  ): Promise<BcvRateConfig> {
    void _responsible

    const current = await this.getBcvSettings()

    const nextMode = auto === undefined
      ? current.modoActualizacion === 'AUTOMATICO_7AM' ? 'MANUAL' : 'AUTOMATICO_7AM'
      : auto ? 'AUTOMATICO_7AM' : 'MANUAL'

    return this.updateBcvSettings({ modoActualizacion: nextMode })
  },

  async getFiscalRules(): Promise<FiscalRulesConfig> {
    return parseSetting(await getTenantSetting('company.fiscalRules'), DEFAULT_FISCAL_RULES)
  },

  async updateFiscalRules(input: Partial<FiscalRulesConfig>): Promise<FiscalRulesConfig> {
    const updated = { ...(await this.getFiscalRules()), ...input }

    await setTenantSetting('company.fiscalRules', updated)

    return updated
  },

  async getCommercialPolicies(): Promise<CommercialPoliciesSettings> {
    return parseSetting(await getTenantSetting('company.commercialPolicies'), DEFAULT_COMMERCIAL_POLICIES)
  },

  async updateCommercialPolicies(
    input: Partial<CommercialPoliciesSettings>
  ): Promise<CommercialPoliciesSettings> {
    const updated = { ...(await this.getCommercialPolicies()), ...input }

    await setTenantSetting('company.commercialPolicies', updated)

    return updated
  },

  async getTenantLicense(): Promise<{ plan: string; status: string; activeModules: string[] }> {
    const response = await executeGraphQL<{
      tenantLicense: { plan: string; status: string; activeModules: string[] }
    }>(GET_TENANT_LICENSE_QUERY, undefined, { timeoutMs: 5000 })

    return response.tenantLicense
  },

  async getMyPermissions(): Promise<string[]> {
    const response = await executeGraphQL<{ myPermissions: string[] }>(
      GET_MY_PERMISSIONS_QUERY,
      undefined,
      { timeoutMs: 5000 }
    )

    return response.myPermissions || []
  },

  async getAssignableRoles(): Promise<GqlRole[]> {
    const response = await executeGraphQL<{ assignableRoles: GqlRole[] }>(
      GET_ASSIGNABLE_ROLES_QUERY,
      { take: 100 },
      { timeoutMs: 5000 }
    )

    return response.assignableRoles || []
  },

  async getErpUsers(): Promise<ErpUser[]> {
    const response = await executeGraphQL<{ tenantUsers: GqlTenantUser[] }>(
      GET_TENANT_USERS_QUERY,
      { take: 100 },
      { timeoutMs: 5000 }
    )

    return response.tenantUsers.map(mapGqlUserToErpUser)
  },

  async createErpUser(input: CreateUserInput): Promise<ErpUser> {
    const roles = await this.getAssignableRoles()
    const role = roles.find(item => item.id === input.initialRoleId)

    if (!role) {
      throw new Error('El rol seleccionado no está disponible en el tenant.')
    }

    await executeGraphQL(
      INVITE_TENANT_USER_MUTATION,
      {
        input: {
          email: input.email.trim().toLowerCase(),
          name: input.nombre.trim(),
          phone: input.telefono?.trim() || undefined,
          roleIds: [role.id],
          idempotencyKey: crypto.randomUUID()
        }
      },
      { timeoutMs: 10000 }
    )

    const users = await this.getErpUsers()
    const created = users.find(user => user.email.toLowerCase() === input.email.toLowerCase())

    if (!created) throw new Error('El usuario fue invitado pero no se pudo recargar.')

    return created
  },

  async assignUserRole(userId: string, roleId: string): Promise<void> {
    await executeGraphQL(
      ASSIGN_ROLE_TO_USER_MUTATION,
      { userId, roleId },
      { timeoutMs: 8000 }
    )
  },

  async revokeUserRole(userId: string, roleId: string): Promise<void> {
    await executeGraphQL(
      REVOKE_ROLE_FROM_USER_MUTATION,
      { userId, roleId },
      { timeoutMs: 8000 }
    )
  },

  async updateUserRoles(
    userId: string,
    currentRoleIds: string[],
    nextRoleIds: string[]
  ): Promise<void> {
    const assignableRoles = await this.getAssignableRoles()


    // A role that is already assigned but no longer assignable must remain
    // removable/retainable; validate only against the current + assignable IDs.
    const validation = validateRoleIds(nextRoleIds, [
      ...assignableRoles,
      ...currentRoleIds.map(id => ({ id }))
    ])

    if (!validation.valid) {
      throw new Error(`Rol(es) no disponible(s) en el tenant: ${validation.invalid.join(', ')}`)
    }

    const { toAssign, toRevoke } = diffRoleIds(currentRoleIds, nextRoleIds)

    for (const roleId of toRevoke) {
      await this.revokeUserRole(userId, roleId)
    }

    for (const roleId of toAssign) {
      await this.assignUserRole(userId, roleId)
    }
  },

  async updateErpUserProfile(
    id: string,
    input: Pick<UpdateUserInput, 'nombre' | 'telefono'>
  ): Promise<void> {
    await executeGraphQL(
      UPDATE_TENANT_USER_MUTATION,
      { input: { userId: id, name: input.nombre.trim(), phone: input.telefono?.trim() || undefined } },
      { timeoutMs: 8000 }
    )
  },

  async updateErpUserStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<void> {
    const mutation =
      estado === 'ACTIVO' ? ACTIVATE_TENANT_USER_MUTATION : DEACTIVATE_TENANT_USER_MUTATION

    await executeGraphQL(mutation, { input: { userId: id } }, { timeoutMs: 8000 })
  },

  async updateErpUser(id: string, input: UpdateUserInput): Promise<ErpUser> {
    const current = (await this.getErpUsers()).find(user => user.id === id)

    if (!current) {
      throw new Error(`Usuario "${id}" no encontrado.`)
    }

    const currentRoleIds = current.roles.map(role => role.id)
    const nextStatus = input.estado === 'INVITADO' ? null : input.estado
    const statusChanged = nextStatus !== null && nextStatus !== current.estado

    const stages: Array<{
      stage: ErpUserWriteStage
      run: () => Promise<void>
    }> = [
      { stage: 'profile', run: () => this.updateErpUserProfile(id, input) }
    ]

    if (statusChanged) {
      stages.push({
        stage: 'status',
        run: async () => {
          if (nextStatus !== null) {
            await this.updateErpUserStatus(id, nextStatus)
          }
        }
      })
    }

    stages.push({
      stage: 'roles',
      run: () => this.updateUserRoles(id, currentRoleIds, input.roleIds)
    })

    const completedStages: ErpUserWriteStage[] = []

    for (const { stage, run } of stages) {
      try {
        await run()
        completedStages.push(stage)
      } catch (error) {
        throw new ErpUserPartialUpdateError(stage, completedStages, error)
      }
    }

    try {
      const users = await this.getErpUsers()
      const updated = users.find(user => user.id === id)

      if (!updated) throw new Error('El usuario fue actualizado pero no se pudo recargar.')

      return updated
    } catch (error) {
      throw new ErpUserRefreshError(id, error)
    }
  },

  async toggleErpUserStatus(
    id: string,
    estado?: 'ACTIVO' | 'INACTIVO' | 'INVITADO'
  ): Promise<ErpUser> {
    const usersBefore = await this.getErpUsers()
    const current = usersBefore.find(user => user.id === id)

    const nextStatus: 'ACTIVO' | 'INACTIVO' =
      estado === 'ACTIVO' || estado === 'INACTIVO'
        ? estado
        : current?.estado === 'ACTIVO'
          ? 'INACTIVO'
          : 'ACTIVO'

    await this.updateErpUserStatus(id, nextStatus)

    const users = await this.getErpUsers()
    const updated = users.find(user => user.id === id)

    if (!updated) throw new Error('El estado del usuario se actualizó pero no se pudo recargar.')

    return updated
  }
}

export { DEFAULT_COMMERCIAL_POLICIES }
export default settingsService
