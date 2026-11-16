export const PLATFORM_ADMIN_ACCESS_QUERY = `
  query PlatformAdminAccess {
    platformAdminAccess {
      isPlatformAdmin
    }
  }
`

export const ELEVATE_PLATFORM_ADMIN_MUTATION = `
  mutation ElevatePlatformAdmin($input: ElevatePlatformAdminInput!) {
    elevatePlatformAdmin(input: $input) {
      token
      expiresAt
    }
  }
`

export const REVOKE_PLATFORM_ELEVATION_MUTATION = `
  mutation RevokePlatformElevation {
    revokePlatformElevation
  }
`

export const PLATFORM_TENANTS_QUERY = `
  query PlatformTenants($filter: PlatformTenantFilterInput) {
    platformTenants(filter: $filter) {
      id
      name
      slug
      status
      plan
      licenseStatus
      validUntil
      graceUntil
      activeModules
      userCount
    }
  }
`

export const PLATFORM_TENANT_QUERY = `
  query PlatformTenant($id: ID!) {
    platformTenant(id: $id) {
      tenant {
        id
        name
        slug
        status
        plan
        licenseStatus
        validUntil
        graceUntil
        activeModules
        userCount
      }
      ownerUsers {
        userId
        email
        roleNames
        hasAdminRole
      }
    }
  }
`

export const UPDATE_PLATFORM_TENANT_LICENSE_MUTATION = `
  mutation UpdatePlatformTenantLicense($input: UpdatePlatformTenantLicenseInput!) {
    updatePlatformTenantLicense(input: $input) {
      id
      name
      slug
      status
      plan
      licenseStatus
      validUntil
      graceUntil
      activeModules
      userCount
    }
  }
`

export const SET_PLATFORM_TENANT_MODULES_MUTATION = `
  mutation SetPlatformTenantModules($input: SetPlatformTenantModulesInput!) {
    setPlatformTenantModules(input: $input) {
      id
      name
      slug
      status
      plan
      licenseStatus
      validUntil
      graceUntil
      activeModules
      userCount
    }
  }
`

export const RECONCILE_PLATFORM_TENANT_OWNER_MUTATION = `
  mutation ReconcilePlatformTenantOwner($input: ReconcilePlatformTenantOwnerInput!) {
    reconcilePlatformTenantOwner(input: $input) {
      tenant {
        id
        name
        slug
        status
        plan
        licenseStatus
        validUntil
        graceUntil
        activeModules
        userCount
      }
      ownerUsers {
        userId
        email
        roleNames
        hasAdminRole
      }
    }
  }
`
