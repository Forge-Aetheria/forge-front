// Definiciones GraphQL para el módulo IAM (Roles, Permisos y Administración de Usuarios - BE-IAM-02)

export const GET_TENANT_USERS_QUERY = `
  query GetTenantUsers($search: String, $roleId: ID, $status: UserStatus, $take: Int, $skip: Int) {
    tenantUsers(search: $search, roleId: $roleId, status: $status, take: $take, skip: $skip) {
      id
      email
      name
      phone
      avatarUrl
      status
      lastLoginAt
      createdAt
      roles {
        id
        roleId
        role {
          id
          name
          description
          isSystem
        }
      }
    }
  }
`

export const GET_TENANT_USER_QUERY = `
  query GetTenantUser($id: ID!) {
    tenantUser(id: $id) {
      id
      email
      name
      phone
      avatarUrl
      status
      lastLoginAt
      createdAt
      roles {
        id
        roleId
        role {
          id
          name
          description
          isSystem
        }
      }
    }
  }
`

export const GET_ASSIGNABLE_ROLES_QUERY = `
  query GetAssignableRoles($take: Int, $skip: Int) {
    assignableRoles(take: $take, skip: $skip) {
      id
      name
      description
      isSystem
    }
  }
`

export const GET_ROLES_QUERY = `
  query GetRoles($take: Int, $skip: Int) {
    roles(take: $take, skip: $skip) {
      id
      name
      description
      isSystem
      permissions {
        permission {
          id
          action
          module
          description
        }
      }
    }
  }
`

export const GET_PERMISSIONS_QUERY = `
  query GetPermissions($take: Int, $skip: Int) {
    permissions(take: $take, skip: $skip) {
      id
      action
      module
      description
    }
  }
`

export const GET_MY_PERMISSIONS_QUERY = `
  query GetMyPermissions {
    myPermissions
  }
`

export const INVITE_TENANT_USER_MUTATION = `
  mutation InviteTenantUser($input: InviteTenantUserInput!) {
    inviteTenantUser(input: $input) {
      ok
      message
    }
  }
`

export const UPDATE_TENANT_USER_MUTATION = `
  mutation UpdateTenantUser($input: UpdateTenantUserInput!) {
    updateTenantUser(input: $input) {
      id
      name
      phone
      updatedAt
    }
  }
`

export const SET_TENANT_USER_ROLES_MUTATION = `
  mutation SetTenantUserRoles($input: SetTenantUserRolesInput!) {
    setTenantUserRoles(input: $input) {
      id
      roles {
        id
        roleId
        role {
          id
          name
          description
          isSystem
        }
      }
    }
  }
`

export const ACTIVATE_TENANT_USER_MUTATION = `
  mutation ActivateTenantUser($input: TenantUserStatusInput!) {
    activateTenantUser(input: $input) {
      id
      status
    }
  }
`

export const DEACTIVATE_TENANT_USER_MUTATION = `
  mutation DeactivateTenantUser($input: TenantUserStatusInput!) {
    deactivateTenantUser(input: $input) {
      id
      status
    }
  }
`

export const CREATE_ROLE_MUTATION = `
  mutation CreateRole($input: CrearRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      isSystem
    }
  }
`

export const UPDATE_ROLE_MUTATION = `
  mutation UpdateRole($input: ActualizarRoleInput!) {
    updateRole(input: $input) {
      id
      name
      description
      isSystem
    }
  }
`

export const DELETE_ROLE_MUTATION = `
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id) {
      id
    }
  }
`

export const SET_ROLE_PERMISSIONS_MUTATION = `
  mutation SetRolePermissions($id: ID!, $permissionIds: [ID!]!) {
    setRolePermissions(id: $id, permissionIds: $permissionIds) {
      id
      name
    }
  }
`
