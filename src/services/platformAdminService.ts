import {
  DELETE_PLATFORM_TENANT_MUTATION,
  ELEVATE_PLATFORM_ADMIN_MUTATION,
  PLATFORM_ADMIN_ACCESS_QUERY,
  PLATFORM_TENANT_QUERY,
  PLATFORM_TENANTS_QUERY,
  RECONCILE_PLATFORM_TENANT_OWNER_MUTATION,
  REVOKE_PLATFORM_ELEVATION_MUTATION,
  SET_PLATFORM_TENANT_MODULES_MUTATION,
  UPDATE_PLATFORM_TENANT_LICENSE_MUTATION
} from '@/graphql/platformAdmin.gql'
import { executeGraphQL } from '@/libs/graphqlClient'

export type PlatformPlanTier = 'FREE' | 'PRO'

export interface PlatformTenant {
  id: string
  name: string
  slug: string
  status: string
  plan: PlatformPlanTier
  licenseStatus: string
  validUntil: string | null
  graceUntil: string | null
  activeModules: string[]
  userCount: number
}

export interface PlatformTenantOwner {
  userId: string
  email: string
  roleNames: string[]
  hasAdminRole: boolean
}

export interface PlatformTenantDetail {
  tenant: PlatformTenant
  ownerUsers: PlatformTenantOwner[]
}

export interface PlatformElevation {
  token: string
  expiresAt: string
}

export interface PlatformTenantFilter {
  search?: string
  plan?: PlatformPlanTier
}

const elevationOptions = (elevationToken: string) => ({
  elevationToken,
  timeoutMs: 10000
})

export const platformAdminService = {
  async getAccessStatus(): Promise<boolean> {
    const response = await executeGraphQL<{ platformAdminAccess: { isPlatformAdmin: boolean } }>(
      PLATFORM_ADMIN_ACCESS_QUERY,
      undefined,
      { timeoutMs: 8000 }
    )

    
return response.platformAdminAccess.isPlatformAdmin
  },

  async elevate(password: string, pin: string): Promise<PlatformElevation> {
    const response = await executeGraphQL<{ elevatePlatformAdmin: PlatformElevation }>(
      ELEVATE_PLATFORM_ADMIN_MUTATION,
      { input: { password, pin } },
      { timeoutMs: 15000 }
    )

    
return response.elevatePlatformAdmin
  },

  async revokeElevation(elevationToken: string): Promise<boolean> {
    const response = await executeGraphQL<{ revokePlatformElevation: boolean }>(
      REVOKE_PLATFORM_ELEVATION_MUTATION,
      undefined,
      elevationOptions(elevationToken)
    )

    
return response.revokePlatformElevation
  },

  async listTenants(
    elevationToken: string,
    filter?: PlatformTenantFilter
  ): Promise<PlatformTenant[]> {
    const response = await executeGraphQL<{ platformTenants: PlatformTenant[] }>(
      PLATFORM_TENANTS_QUERY,
      { filter: filter ?? null },
      elevationOptions(elevationToken)
    )

    
return response.platformTenants
  },

  async getTenant(elevationToken: string, id: string): Promise<PlatformTenantDetail> {
    const response = await executeGraphQL<{ platformTenant: PlatformTenantDetail }>(
      PLATFORM_TENANT_QUERY,
      { id },
      elevationOptions(elevationToken)
    )

    
return response.platformTenant
  },

  async updateLicense(
    elevationToken: string,
    input: {
      tenantId: string
      plan: PlatformPlanTier
      validUntil?: string | null
      graceUntil?: string | null
    }
  ): Promise<PlatformTenant> {
    const response = await executeGraphQL<{ updatePlatformTenantLicense: PlatformTenant }>(
      UPDATE_PLATFORM_TENANT_LICENSE_MUTATION,
      { input },
      elevationOptions(elevationToken)
    )

    
return response.updatePlatformTenantLicense
  },

  async setModules(
    elevationToken: string,
    tenantId: string,
    activeModules: string[]
  ): Promise<PlatformTenant> {
    const response = await executeGraphQL<{ setPlatformTenantModules: PlatformTenant }>(
      SET_PLATFORM_TENANT_MODULES_MUTATION,
      { input: { tenantId, activeModules } },
      elevationOptions(elevationToken)
    )

    
return response.setPlatformTenantModules
  },

  async reconcileOwner(
    elevationToken: string,
    tenantId: string,
    userId: string
  ): Promise<PlatformTenantDetail> {
    const response = await executeGraphQL<{
      reconcilePlatformTenantOwner: PlatformTenantDetail
    }>(
      RECONCILE_PLATFORM_TENANT_OWNER_MUTATION,
      { input: { tenantId, userId } },
      elevationOptions(elevationToken)
    )

    
return response.reconcilePlatformTenantOwner
  },

  async deleteTenant(
    elevationToken: string,
    tenantId: string,
    confirmName: string
  ): Promise<boolean> {
    const response = await executeGraphQL<{ deletePlatformTenant: boolean }>(
      DELETE_PLATFORM_TENANT_MUTATION,
      { input: { tenantId, confirmName } },
      elevationOptions(elevationToken)
    )

    
return response.deletePlatformTenant
  }
}
