// Queries y Mutaciones GraphQL para el módulo IAM (Roles y Permisos de forge-backend)

export const ROLES_QUERY = `
  query Roles {
    roles {
      id
      name
      description
      isSystem
      createdAt
    }
  }
`

export const ASSIGNABLE_ROLES_QUERY = `
  query AssignableRoles {
    assignableRoles {
      id
      name
      description
      isSystem
      createdAt
    }
  }
`

export const MY_PERMISSIONS_QUERY = `
  query MyPermissions {
    myPermissions
  }
`
