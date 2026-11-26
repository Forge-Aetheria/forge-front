// Adaptador bidireccional entre el esquema GraphQL de IAM (forge-backend / BE-IAM-02) y la UI de forge-front

import type { ErpRole, ErpUser, SystemRole, UserAccountStatus } from '@/types/settingsTypes'
import { selectPrimaryRole } from '../../utils/roleSet'

export const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8

    return v.toString(16)
  })
}

export interface GqlRole {
  id: string
  name: string
  description?: string | null
  isSystem?: boolean | null
  updatedAt?: string | null
  permissions?: Array<{
    permission: {
      id: string
      action: string
      module: string
      description?: string | null
    }
  }> | null
}

export interface GqlTenantUser {
  id: string
  email: string
  name?: string | null
  phone?: string | null
  avatarUrl?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED' | string
  lastLoginAt?: string | null
  createdAt?: string | null
  roles?: Array<{
    id?: string
    roleId?: string
    role: GqlRole
  }> | null
}

export const mapUserStatusToFrontend = (status?: string): UserAccountStatus => {
  if (status === 'INACTIVE' || status === 'SUSPENDED') return 'INACTIVO'
  if (status === 'INVITED') return 'INVITADO'

  return 'ACTIVO'
}

export const mapGqlRoleToSystemRole = (roleName?: string): SystemRole => {
  if (!roleName) return 'UNASSIGNED'

  const upper = roleName.trim().toUpperCase()

  if (upper === 'ADMIN' || upper === 'ADMINISTRADOR' || upper === 'OWNER') return 'ADMIN'
  if (upper === 'VENTAS' || upper === 'SALES') return 'VENTAS'
  if (upper === 'COMPRAS' || upper === 'PURCHASING') return 'COMPRAS'
  if (upper === 'ALMACEN' || upper === 'WAREHOUSE') return 'ALMACEN'
  if (upper === 'CAJERO_POS' || upper === 'POS' || upper === 'CAJERO') return 'CAJERO_POS'

  return 'UNASSIGNED'
}

export const mapGqlUserToErpUser = (gql: GqlTenantUser): ErpUser => {
  const roles: ErpRole[] = (gql.roles ?? [])
    .map(assignment => assignment.role)
    .filter(role => Boolean(role?.id))
    .map(role => ({
      id: role.id,
      name: role.name,
      description: role.description ?? undefined,
      isSystem: Boolean(role.isSystem)
    }))

  const primaryRole = selectPrimaryRole(roles)

  const rol: SystemRole = primaryRole
    ? mapGqlRoleToSystemRole(primaryRole.name)
    : 'UNASSIGNED'

  const createdDate = gql.createdAt
    ? new Date(gql.createdAt).toLocaleDateString('es-VE')
    : 'Reciente'

  return {
    id: gql.id,
    nombre: gql.name || gql.email.split('@')[0],
    email: gql.email,
    telefono: gql.phone || undefined,
    avatarUrl: gql.avatarUrl || '/images/avatars/1.png',
    roles,
    rol,
    roleId: primaryRole?.id,
    roleName: primaryRole?.name || 'Sin Rol',
    estado: mapUserStatusToFrontend(gql.status),
    creadoEn: createdDate
  }
}
