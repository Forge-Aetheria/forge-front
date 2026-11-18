import type { ErpRole } from '@/types/settingsTypes'

/**
 * Pure helpers for the RBAC role-set model (TICK-054). Every write decision is
 * based on provider role IDs; names are used only for display and for the
 * best-effort administrator guard.
 */

const ADMIN_ROLE_NAMES = new Set(['ADMIN', 'ADMINISTRADOR', 'OWNER'])

export const normalizeRoleName = (name?: string | null): string =>
  String(name ?? '').trim().toUpperCase()

export const isAdministratorRole = (role?: { name?: string | null } | null): boolean => {
  if (!role?.name) {
    return false
  }

  return ADMIN_ROLE_NAMES.has(normalizeRoleName(role.name))
}

/**
 * Deterministic primary role: administrators first, then name and ID. Used for
 * legacy display, search and colour mapping only.
 */
export const selectPrimaryRole = (roles: readonly ErpRole[]): ErpRole | undefined => {
  if (roles.length === 0) {
    return undefined
  }

  return [...roles].sort((left, right) => {
    const leftAdmin = isAdministratorRole(left) ? 0 : 1
    const rightAdmin = isAdministratorRole(right) ? 0 : 1

    if (leftAdmin !== rightAdmin) {
      return leftAdmin - rightAdmin
    }

    return left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
  })[0]
}

export interface RoleDiff {
  toAssign: string[]
  toRevoke: string[]
}

/** Diff two role-ID sets, returning only the IDs that must change. */
export const diffRoleIds = (
  currentRoleIds: readonly string[],
  nextRoleIds: readonly string[]
): RoleDiff => {
  const current = new Set(currentRoleIds)
  const next = new Set(nextRoleIds)

  return {
    toAssign: [...next].filter(roleId => !current.has(roleId)).sort(),
    toRevoke: [...current].filter(roleId => !next.has(roleId)).sort()
  }
}

export interface RoleValidation {
  valid: boolean
  invalid: string[]
}

/** Reject IDs that are not in the tenant's assignable role catalog. */
export const validateRoleIds = (
  roleIds: readonly string[],
  assignableRoles: readonly { id: string }[]
): RoleValidation => {
  const allowed = new Set(assignableRoles.map(role => role.id))
  const invalid = [...new Set(roleIds)].filter(roleId => !allowed.has(roleId)).sort()

  return { valid: invalid.length === 0, invalid }
}

/** Roles that exist today but are not part of the next selection. */
export const summarizeRemovedRoles = (
  currentRoles: readonly ErpRole[],
  nextRoleIds: readonly string[]
): ErpRole[] => {
  const next = new Set(nextRoleIds)

  return currentRoles.filter(role => !next.has(role.id))
}

export interface RoleSetUser {
  id: string
  estado?: string | null
  roles: readonly ErpRole[]
}

/**
 * Best-effort UI guard: true when removing `nextRoleIds` would leave the tenant
 * without any active administrator. The provider policy (TICK-055) remains the
 * authority; this helper exists to block the obvious self-degradation case.
 */
export const wouldRemoveLastAdministrator = (
  target: RoleSetUser,
  directory: readonly RoleSetUser[],
  nextRoleIds: readonly string[]
): boolean => {
  if (target.estado && target.estado !== 'ACTIVO') {
    return false
  }

  if (!target.roles.some(isAdministratorRole)) {
    return false
  }

  const remainsAdministrator = target.roles.some(
    role => nextRoleIds.includes(role.id) && isAdministratorRole(role)
  )

  if (remainsAdministrator) {
    return false
  }

  const otherActiveAdministrators = directory.filter(
    other =>
      other.id !== target.id &&
      (!other.estado || other.estado === 'ACTIVO') &&
      other.roles.some(isAdministratorRole)
  )

  return otherActiveAdministrators.length === 0
}

