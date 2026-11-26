import type { ErpPermission, ErpRole } from '@/types/settingsTypes'
import type { GqlRole } from './iamAdapter'

/** GraphQL `Permission` catalogue entry. */
export interface GqlPermission {
  id: string
  action: string
  module: string
  description?: string | null
}

export const mapGqlPermissionToErpPermission = (permission: GqlPermission): ErpPermission => ({
  id: permission.id,
  action: permission.action,
  module: permission.module,
  description: permission.description ?? undefined
})

/** Maps a GraphQL role (with nested permissions) to the frontend role model. */
export const mapGqlRoleToErpRole = (role: GqlRole): ErpRole => {
  const permissions = (role.permissions ?? [])
    .map(entry => entry?.permission)
    .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission?.id))
    .map(mapGqlPermissionToErpPermission)

  return {
    id: role.id,
    name: role.name,
    description: role.description ?? undefined,
    isSystem: Boolean(role.isSystem),
    permissions,
    updatedAt: role.updatedAt ?? undefined
  }
}
