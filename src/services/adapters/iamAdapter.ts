// Adaptador bidireccional entre el esquema GraphQL de IAM (forge-backend / BE-IAM-02) y la UI de forge-front

import type { ErpUser, SystemRole, UserAccountStatus } from '@/types/settingsTypes'

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
  const firstRole = gql.roles && gql.roles.length > 0 ? gql.roles[0].role : null
  const roleName = firstRole ? firstRole.name : 'UNASSIGNED'
  const rol = mapGqlRoleToSystemRole(roleName)

  const createdDate = gql.createdAt
    ? new Date(gql.createdAt).toLocaleDateString('es-VE')
    : 'Reciente'

  return {
    id: gql.id,
    nombre: gql.name || gql.email.split('@')[0],
    email: gql.email,
    telefono: gql.phone || undefined,
    avatarUrl: gql.avatarUrl || '/images/avatars/1.png',
    rol,
    roleId: firstRole?.id,
    roleName: firstRole?.name || 'Sin Rol',
    estado: mapUserStatusToFrontend(gql.status),
    creadoEn: createdDate
  }
}
