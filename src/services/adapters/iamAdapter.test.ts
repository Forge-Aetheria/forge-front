import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { mapGqlUserToErpUser, type GqlTenantUser } from './iamAdapter'

const baseUser = (roles: GqlTenantUser['roles']): GqlTenantUser => ({
  id: 'user-1',
  email: 'user@forge.test',
  name: 'Test User',
  status: 'ACTIVE',
  roles
})

describe('mapGqlUserToErpUser', () => {
  it('preserves every assigned role with its exact provider ID', () => {
    const mapped = mapGqlUserToErpUser(
      baseUser([
        { id: 'ur-1', roleId: 'role-admin', role: { id: 'role-admin', name: 'admin', isSystem: true } },
        { id: 'ur-2', roleId: 'role-sales', role: { id: 'role-sales', name: 'Ventas', isSystem: false } }
      ])
    )

    assert.deepEqual(
      mapped.roles.map(role => role.id),
      ['role-admin', 'role-sales']
    )
    assert.equal(mapped.roleId, 'role-admin')
    assert.equal(mapped.roleName, 'admin')
    assert.equal(mapped.rol, 'ADMIN')
  })

  it('renders custom roles by name instead of collapsing them to UNASSIGNED', () => {
    const mapped = mapGqlUserToErpUser(
      baseUser([{ id: 'ur-1', roleId: 'role-auditor', role: { id: 'role-auditor', name: 'Auditor', isSystem: false } }])
    )

    assert.deepEqual(mapped.roles, [
      { id: 'role-auditor', name: 'Auditor', description: undefined, isSystem: false }
    ])
    assert.equal(mapped.roleName, 'Auditor')
    assert.equal(mapped.rol, 'UNASSIGNED')
  })

  it('handles users without roles explicitly', () => {
    const mapped = mapGqlUserToErpUser(baseUser([]))

    assert.deepEqual(mapped.roles, [])
    assert.equal(mapped.roleId, undefined)
    assert.equal(mapped.roleName, 'Sin Rol')
    assert.equal(mapped.rol, 'UNASSIGNED')
  })

  it('derives the primary role deterministically when several roles exist', () => {
    const mapped = mapGqlUserToErpUser(
      baseUser([
        { id: 'ur-1', roleId: 'role-z', role: { id: 'role-z', name: 'Zeta', isSystem: false } },
        { id: 'ur-2', roleId: 'role-a', role: { id: 'role-a', name: 'Almacén', isSystem: false } }
      ])
    )

    assert.equal(mapped.roleId, 'role-a')
    assert.equal(mapped.roleName, 'Almacén')
  })
})
