import { executeGraphQL } from '@/libs/graphqlClient'
import { fetchActiveBcvRate } from '@/services/bcvService'
import {
  CHANGE_MY_PASSWORD_MUTATION,
  ME_QUERY,
  UPDATE_MY_PROFILE_MUTATION
} from '@/graphql/auth.gql'
import {
  ACTIVATE_TENANT_USER_MUTATION,
  DEACTIVATE_TENANT_USER_MUTATION,
  GET_ASSIGNABLE_ROLES_QUERY,
  GET_MY_PERMISSIONS_QUERY,
  GET_TENANT_LICENSE_QUERY,
  GET_TENANT_ONBOARDING_QUERY,
  GET_TENANT_USERS_QUERY,
  INVITE_TENANT_USER_MUTATION,
  SET_TENANT_USER_ROLES_MUTATION,
  UPDATE_TENANT_USER_MUTATION
} from '@/graphql/iam.gql'
import { GET_TENANT_SETTING_QUERY, SET_TENANT_SETTING_MUTATION } from '@/graphql/pos.gql'
import {
  mapGqlUserToErpUser,
  type GqlRole,
  type GqlTenantUser
} from '@/services/adapters/iamAdapter'
import type { AuthenticatedUser, ChangeMyPasswordResult } from '@/types/authTypes'
import type {
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

const parseSetting = <T>(value: string, fallback: T): T => {
  if (!value) return fallback

  try {
    return { ...fallback, ...JSON.parse(value) } as T
  } catch {
    return fallback
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
      historial: config.historial || []
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
    _reason?: string,
    _responsible?: string
  ): Promise<BcvRateConfig> {
    void _reason
    void _responsible

    return this.updateBcvSettings({ tasaActiva: rate, modoActualizacion: mode })
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
    const role = roles.find(item => normalizeRole(item.name) === input.rol) || roles[0]

    if (!role) throw new Error('No hay roles asignables en el tenant.')

    await executeGraphQL(
      INVITE_TENANT_USER_MUTATION,
      {
        input: {
          email: input.email.trim().toLowerCase(),
          name: input.nombre.trim(),
          phone: input.telefono?.trim() || undefined,
          initialRoleId: role.id,
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

  async updateErpUser(id: string, input: UpdateUserInput): Promise<ErpUser> {
    await executeGraphQL(
      UPDATE_TENANT_USER_MUTATION,
      { input: { userId: id, name: input.nombre.trim(), phone: input.telefono?.trim() || undefined } },
      { timeoutMs: 8000 }
    )

    const roles = await this.getAssignableRoles()
    const role = roles.find(item => normalizeRole(item.name) === input.rol)

    if (role) {
      await executeGraphQL(
        SET_TENANT_USER_ROLES_MUTATION,
        {
          input: {
            userId: id,
            roleIds: [role.id],
            idempotencyKey: crypto.randomUUID()
          }
        },
        { timeoutMs: 8000 }
      )
    }

    await this.toggleErpUserStatus(id, input.estado)

    const users = await this.getErpUsers()
    const updated = users.find(user => user.id === id)

    if (!updated) throw new Error('El usuario fue actualizado pero no se pudo recargar.')

    return updated
  },

  async toggleErpUserStatus(
    id: string,
    estado?: 'ACTIVO' | 'INACTIVO' | 'INVITADO'
  ): Promise<ErpUser> {
    const usersBefore = await this.getErpUsers()
    const current = usersBefore.find(user => user.id === id)
    const nextStatus = estado || (current?.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO')
    const mutation = nextStatus === 'ACTIVO' ? ACTIVATE_TENANT_USER_MUTATION : DEACTIVATE_TENANT_USER_MUTATION

    await executeGraphQL(mutation, { input: { userId: id } }, { timeoutMs: 8000 })

    const users = await this.getErpUsers()
    const updated = users.find(user => user.id === id)

    if (!updated) throw new Error('El estado del usuario se actualizó pero no se pudo recargar.')

    return updated
  }
}

export { DEFAULT_COMMERCIAL_POLICIES }
export default settingsService
