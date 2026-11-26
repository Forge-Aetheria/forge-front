import type { ErpPermission, PermissionModuleGroup } from '@/types/settingsTypes'

/** Groups the action catalog by `Permission.module`, deterministic order. */
export const groupPermissionsByModule = (
  permissions: readonly ErpPermission[]
): PermissionModuleGroup[] => {
  const byModule = new Map<string, ErpPermission[]>()

  for (const permission of permissions) {
    const list = byModule.get(permission.module) ?? []

    list.push(permission)
    byModule.set(permission.module, list)
  }

  return [...byModule.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([module, modulePermissions]) => ({
      module,
      permissions: [...modulePermissions].sort((left, right) => left.action.localeCompare(right.action))
    }))
}

export type ModuleSelectionState = 'all' | 'some' | 'none'

/** Computes whether a module is fully, partially or not selected. */
export const moduleSelectionState = (
  permissions: readonly ErpPermission[],
  selectedIds: ReadonlySet<string>
): ModuleSelectionState => {
  if (permissions.length === 0) {
    return 'none'
  }

  const selected = permissions.filter(permission => selectedIds.has(permission.id)).length

  if (selected === 0) return 'none'
  if (selected === permissions.length) return 'all'

  return 'some'
}

/** Returns a new selection set with all module actions selected or cleared. */
export const toggleModuleSelection = (
  permissions: readonly ErpPermission[],
  selectedIds: ReadonlySet<string>,
  select: boolean
): Set<string> => {
  const next = new Set(selectedIds)

  for (const permission of permissions) {
    if (select) {
      next.add(permission.id)
    } else {
      next.delete(permission.id)
    }
  }

  return next
}

/** Normalizes the selected set into the sorted `permissionIds` payload. */
export const computePermissionIds = (selectedIds: ReadonlySet<string>): string[] =>
  [...selectedIds].sort()

/** True when `nextIds` removes at least one permission from `previousIds`. */
export const isReduction = (
  previousIds: readonly string[],
  nextIds: readonly string[]
): boolean => {
  const next = new Set(nextIds)

  return previousIds.some(permissionId => !next.has(permissionId))
}

const ACTION_LABELS: Record<string, string> = {
  read: 'Leer',
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  write: 'Editar',
  manage: 'Gestionar',
  set: 'Configurar',
  post: 'Publicar',
  cancel: 'Cancelar',
  reverse: 'Revertir',
  close: 'Cerrar',
  reopen: 'Reabrir',
  approve: 'Aprobar',
  register: 'Registrar',
  convert: 'Convertir',
  recalculate: 'Recalcular',
  apply: 'Aplicar',
  validate: 'Validar',
  open: 'Abrir',
  void: 'Anular',
  assign: 'Asignar',
  status: 'Cambiar estado',
  drilldown: 'Detalle',
  export: 'Exportar',
  run: 'Ejecutar',
  repair: 'Reparar',
  read_drafts: 'Leer borradores'
}

/**
 * Human-readable label for a permission action. Uses the last segment of
 * `module:entity:verb` (never the raw code, e.g. `iam:integrity:read`).
 */
export const formatPermissionLabel = (action: string): string => {
  const verb = String(action).split(':').pop()?.trim().toLowerCase() ?? String(action)

  if (ACTION_LABELS[verb]) {
    return ACTION_LABELS[verb]
  }

  return verb.length > 0 ? `${verb.charAt(0).toUpperCase()}${verb.slice(1)}` : String(action)
}

