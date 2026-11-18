import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  diffRoleIds,
  isAdministratorRole,
  normalizeRoleName,
  selectPrimaryRole,
  summarizeRemovedRoles,
  validateRoleIds,
  wouldRemoveLastAdministrator
} from './roleSet'

import type { ErpRole } from '@/types/settingsTypes'

const role = (id: string, name: string, isSystem = false): ErpRole => ({
  id,
  name,
  isSystem
})

describe('diffRoleIds', () => {
  it('returns the additions and removals between two sets', () => {
    assert.deepEqual(diffRoleIds(['a', 'b'], ['b', 'c']), {
      toAssign: ['c'],
      toRevoke: ['a']
    })
  })

  it('returns empty deltas for identical sets regardless of order', () => {
    assert.deepEqual(diffRoleIds(['b', 'a'], ['a', 'b']), { toAssign: [], toRevoke: [] })
  })
})

describe('validateRoleIds', () => {
  it('accepts only IDs present in the assignable catalog', () => {
    const allowed = [{ id: 'a' }, { id: 'b' }]

    assert.deepEqual(validateRoleIds(['a', 'b'], allowed), { valid: true, invalid: [] })
    assert.deepEqual(validateRoleIds(['a', 'stale'], allowed), {
      valid: false,
      invalid: ['stale']
    })
  })
})

describe('isAdministratorRole', () => {
  it('recognizes the canonical administrator names case-insensitively', () => {
    assert.equal(isAdministratorRole(role('1', 'ADMIN')), true)
    assert.equal(isAdministratorRole(role('1', 'Administrador')), true)
    assert.equal(isAdministratorRole(role('1', 'owner')), true)
  })

  it('does not treat custom roles as administrators', () => {
    assert.equal(isAdministratorRole(role('1', 'Auditor')), false)
    assert.equal(isAdministratorRole(undefined), false)
    assert.equal(normalizeRoleName('  Ventas '), 'VENTAS')
  })
})

describe('selectPrimaryRole', () => {
  it('prefers the administrator role and then a deterministic name order', () => {
    const roles = [role('c', 'Ventas'), role('a', 'Almacén'), role('b', 'ADMIN')]

    assert.equal(selectPrimaryRole(roles)?.id, 'b')
    assert.equal(selectPrimaryRole([role('z', 'Zeta'), role('a', 'Alfa')])?.id, 'a')
    assert.equal(selectPrimaryRole([]), undefined)
  })
})

describe('summarizeRemovedRoles', () => {
  it('lists the roles that are no longer selected', () => {
    const current = [role('a', 'ADMIN'), role('b', 'Ventas')]

    assert.deepEqual(
      summarizeRemovedRoles(current, ['b']).map(item => item.id),
      ['a']
    )
    assert.deepEqual(summarizeRemovedRoles(current, ['a', 'b']), [])
  })
})

describe('wouldRemoveLastAdministrator', () => {
  const admin = role('admin', 'admin')
  const sales = role('sales', 'Ventas')

  it('blocks removing the administrator role from the only active administrator', () => {
    const target = { id: 'u1', estado: 'ACTIVO', roles: [admin, sales] }

    assert.equal(wouldRemoveLastAdministrator(target, [target], ['sales']), true)
    assert.equal(wouldRemoveLastAdministrator(target, [target], ['admin', 'sales']), false)
  })

  it('allows the change when another active administrator exists', () => {
    const target = { id: 'u1', estado: 'ACTIVO', roles: [admin] }
    const other = { id: 'u2', estado: 'ACTIVO', roles: [admin] }

    assert.equal(wouldRemoveLastAdministrator(target, [target, other], []), false)
  })

  it('ignores non-administrators and inactive users', () => {
    const target = { id: 'u1', estado: 'ACTIVO', roles: [sales] }
    const inactiveAdmin = { id: 'u2', estado: 'INACTIVO', roles: [admin] }

    assert.equal(wouldRemoveLastAdministrator(target, [target, inactiveAdmin], []), false)
    assert.equal(
      wouldRemoveLastAdministrator(
        { id: 'u3', estado: 'INACTIVO', roles: [admin] },
        [{ id: 'u3', estado: 'INACTIVO', roles: [admin] }],
        []
      ),
      false
    )
    assert.equal(
      wouldRemoveLastAdministrator(
        { id: 'u4', estado: 'ACTIVO', roles: [admin] },
        [{ id: 'u4', estado: 'ACTIVO', roles: [admin] }, inactiveAdmin],
        []
      ),
      true
    )
  })
})
