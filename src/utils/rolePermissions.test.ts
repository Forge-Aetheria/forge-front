import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computePermissionIds,
  formatPermissionLabel,
  groupPermissionsByModule,
  isReduction,
  moduleSelectionState,
  toggleModuleSelection
} from './rolePermissions'
import type { ErpPermission } from '@/types/settingsTypes'

const permission = (id: string, module: string, action: string): ErpPermission => ({
  id,
  module,
  action
})

const catalog: ErpPermission[] = [
  permission('a1', 'INVENTORY', 'inventory:catalog:read'),
  permission('a2', 'INVENTORY', 'inventory:catalog:write'),
  permission('b1', 'POS', 'pos:shift:open'),
  permission('b2', 'POS', 'pos:shift:close')
]

describe('groupPermissionsByModule', () => {
  it('groups by module and orders modules and actions deterministically', () => {
    const groups = groupPermissionsByModule([...catalog].reverse())

    assert.deepEqual(
      groups.map(group => group.module),
      ['INVENTORY', 'POS']
    )
    assert.deepEqual(
      groups[0].permissions.map(item => item.action),
      ['inventory:catalog:read', 'inventory:catalog:write']
    )
  })

  it('returns an empty list for an empty catalog', () => {
    assert.deepEqual(groupPermissionsByModule([]), [])
  })
})

describe('moduleSelectionState', () => {
  const inventory = catalog.filter(item => item.module === 'INVENTORY')

  it('reports none, some and all', () => {
    assert.equal(moduleSelectionState(inventory, new Set()), 'none')
    assert.equal(moduleSelectionState(inventory, new Set(['a1'])), 'some')
    assert.equal(moduleSelectionState(inventory, new Set(['a1', 'a2'])), 'all')
  })

  it('treats an empty module as none', () => {
    assert.equal(moduleSelectionState([], new Set(['a1'])), 'none')
  })
})

describe('toggleModuleSelection', () => {
  const pos = catalog.filter(item => item.module === 'POS')

  it('selects every action of the module', () => {
    const next = toggleModuleSelection(pos, new Set(['a1']), true)

    assert.deepEqual([...next].sort(), ['a1', 'b1', 'b2'])
  })

  it('clears every action of the module without touching others', () => {
    const next = toggleModuleSelection(pos, new Set(['a1', 'b1', 'b2']), false)

    assert.deepEqual([...next].sort(), ['a1'])
  })
})

describe('computePermissionIds', () => {
  it('returns the selected ids sorted', () => {
    assert.deepEqual(computePermissionIds(new Set(['b1', 'a2', 'a1'])), ['a1', 'a2', 'b1'])
  })
})

describe('isReduction', () => {
  it('detects when the next set removes a permission', () => {
    assert.equal(isReduction(['a1', 'a2'], ['a1']), true)
  })

  it('is false for equal, empty-adding or superset changes', () => {
    assert.equal(isReduction(['a1'], ['a1']), false)
    assert.equal(isReduction(['a1'], ['a1', 'a2']), false)
    assert.equal(isReduction([], ['a1']), false)
  })
})

describe('formatPermissionLabel', () => {
  it('uses a human label from the last action segment', () => {
    assert.equal(formatPermissionLabel('iam:integrity:read'), 'Leer')
    assert.equal(formatPermissionLabel('iam:integrity:repair'), 'Reparar')
    assert.equal(formatPermissionLabel('accounting:entry:post'), 'Publicar')
    assert.equal(formatPermissionLabel('inventory:operation:create'), 'Crear')
  })

  it('falls back to a capitalized last segment', () => {
    assert.equal(formatPermissionLabel('module:entity:custom'), 'Custom')
  })
})
