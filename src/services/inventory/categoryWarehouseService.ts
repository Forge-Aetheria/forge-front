import type {
  ProductCategory,
  Warehouse,
  WarehouseLocation
} from '@/types/inventoryTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  GET_WAREHOUSES_QUERY,
  CREATE_WAREHOUSE_MUTATION,
  UPDATE_WAREHOUSE_MUTATION,
  CREATE_STOCK_LOCATION_MUTATION
} from '@/graphql/inventory.gql'
import {
  loadStoredCategories,
  saveStoredCategories,
  loadStoredTemplates,
  saveStoredTemplates,
  loadStoredWarehouses,
  saveStoredWarehouses
} from './inventoryStorage'

// ==========================================
// CATEGORIES CRUD
// ==========================================
export const getProductCategories = async (): Promise<ProductCategory[]> => {
  return Promise.resolve(loadStoredCategories())
}

export const createProductCategory = async (input: {
  name: string
  code?: string
  description?: string
  cuentaIngresosId?: string
  cuentaIngresosCodigo?: string
  cuentaIngresosNombre?: string
  cuentaGastosId?: string
  cuentaGastosCodigo?: string
  cuentaGastosNombre?: string
  cuentaValoracionInventarioId?: string
  cuentaValoracionInventarioCodigo?: string
  cuentaValoracionInventarioNombre?: string
  cuentaCostosDestinoId?: string
  cuentaCostosDestinoCodigo?: string
  cuentaCostosDestinoNombre?: string
}): Promise<ProductCategory> => {
  const categories = loadStoredCategories()
  const trimmedName = input.name.trim()

  if (!trimmedName) {
    throw new Error('El nombre de la categoría es obligatorio.')
  }

  const duplicate = categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())

  if (duplicate) {
    throw new Error(`La categoría "${trimmedName}" ya existe.`)
  }

  const autoCode =
    (input.code || trimmedName.slice(0, 3))
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') || 'CAT'

  const newCat: ProductCategory = {
    id: `cat-${Date.now()}`,
    code: autoCode,
    name: trimmedName,
    description: input.description?.trim() || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    cuentaIngresosId: input.cuentaIngresosId,
    cuentaIngresosCodigo: input.cuentaIngresosCodigo,
    cuentaIngresosNombre: input.cuentaIngresosNombre,
    cuentaGastosId: input.cuentaGastosId,
    cuentaGastosCodigo: input.cuentaGastosCodigo,
    cuentaGastosNombre: input.cuentaGastosNombre,
    cuentaValoracionInventarioId: input.cuentaValoracionInventarioId,
    cuentaValoracionInventarioCodigo: input.cuentaValoracionInventarioCodigo,
    cuentaValoracionInventarioNombre: input.cuentaValoracionInventarioNombre,
    cuentaCostosDestinoId: input.cuentaCostosDestinoId,
    cuentaCostosDestinoCodigo: input.cuentaCostosDestinoCodigo,
    cuentaCostosDestinoNombre: input.cuentaCostosDestinoNombre
  }

  const updated = [...categories, newCat]

  saveStoredCategories(updated)

  return Promise.resolve(newCat)
}

export const updateProductCategory = async (
  id: string,
  changes: Partial<ProductCategory>
): Promise<ProductCategory> => {
  const categories = loadStoredCategories()
  const idx = categories.findIndex(c => c.id === id)

  if (idx === -1) {
    throw new Error('Categoría no encontrada.')
  }

  const oldName = categories[idx].name

  const updatedCat: ProductCategory = {
    ...categories[idx],
    ...changes,
    name: changes.name ? changes.name.trim() : categories[idx].name,
    code: changes.code ? changes.code.trim().toUpperCase() : categories[idx].code
  }

  categories[idx] = updatedCat
  saveStoredCategories(categories)

  // Sync products that were using the old category name
  if (changes.name && changes.name.trim() !== oldName) {
    const templates = loadStoredTemplates()
    let modified = false

    const synced = templates.map(t => {
      if (t.categoryName === oldName) {
        modified = true

        return { ...t, categoryName: updatedCat.name }
      }

      return t
    })

    if (modified) {
      saveStoredTemplates(synced)
    }
  }

  return Promise.resolve(updatedCat)
}

export const deleteProductCategory = async (id: string): Promise<void> => {
  const categories = loadStoredCategories()
  const filtered = categories.filter(c => c.id !== id)

  saveStoredCategories(filtered)

  return Promise.resolve()
}

// ==========================================
// WAREHOUSES & LOCATIONS CRUD (Padre-Hijo con backend GraphQL BE-INV-03)
// ==========================================
export const getWarehouses = async (): Promise<Warehouse[]> => {
  try {
    const res = await executeGraphQL<{ warehouses: any[] }>(
      GET_WAREHOUSES_QUERY,
      { take: 50 },
      { timeoutMs: 5000 }
    )

    if (res?.warehouses && Array.isArray(res.warehouses) && res.warehouses.length > 0) {
      const stored = loadStoredWarehouses()

      const backendMapped: Warehouse[] = res.warehouses.map(w => {
        const localMatched = stored.find(s => s.id === w.id || s.code === w.code)

        return {
          id: w.id,
          code: w.code,
          name: w.name,
          address: w.address || '',
          manager: w.manager || 'Administrador ERP',
          isDefault: Boolean(w.isDefault),
          isActive: w.isActive !== false,
          createdAt: w.createdAt || new Date().toISOString(),
          locations: localMatched?.locations || [
            {
              id: `loc-${w.id}-1`,
              warehouseId: w.id,
              code: `${w.code}-GEN`,
              name: 'Ubicación General',
              type: 'INTERNAL',
              notes: 'Ubicación principal de almacén',
              isActive: true
            }
          ]
        }
      })

      saveStoredWarehouses(backendMapped)

      return backendMapped
    }
  } catch (err) {
    console.warn('[categoryWarehouseService] Fallback local para getWarehouses:', err)
  }

  return Promise.resolve(loadStoredWarehouses())
}

export const createWarehouse = async (input: {
  code: string
  name: string
  address?: string
  manager?: string
  isDefault?: boolean
}): Promise<Warehouse> => {
  const warehouses = loadStoredWarehouses()
  const cleanCode = input.code.trim().toUpperCase()
  const cleanName = input.name.trim()

  if (!cleanCode || !cleanName) {
    throw new Error('El código y el nombre del almacén son obligatorios.')
  }

  if (warehouses.some(w => w.code.toLowerCase() === cleanCode.toLowerCase())) {
    throw new Error(`El código de almacén "${cleanCode}" ya está en uso.`)
  }

  let backendId: string | undefined

  try {
    const res = await executeGraphQL<{ createWarehouse: { id: string } }>(
      CREATE_WAREHOUSE_MUTATION,
      {
        input: {
          code: cleanCode,
          name: cleanName,
          address: input.address?.trim() || undefined,
          manager: input.manager?.trim() || undefined,
          isDefault: Boolean(input.isDefault)
        }
      },
      { timeoutMs: 8000 }
    )

    if (res?.createWarehouse?.id) {
      backendId = res.createWarehouse.id
    }
  } catch (err: unknown) {
    console.warn('[categoryWarehouseService] Fallback local para createWarehouse:', err)
  }

  const isDefault = Boolean(input.isDefault) || warehouses.length === 0

  const updatedList = isDefault
    ? warehouses.map(w => ({ ...w, isDefault: false }))
    : [...warehouses]

  const newWhId = backendId || `wh-${Date.now()}`

  const newWarehouse: Warehouse = {
    id: newWhId,
    code: cleanCode,
    name: cleanName,
    address: input.address?.trim() || '',
    manager: input.manager?.trim() || 'Administrador ERP',
    isDefault,
    isActive: true,
    createdAt: new Date().toISOString(),
    locations: [
      {
        id: `loc-${Date.now()}-1`,
        warehouseId: newWhId,
        code: `${cleanCode}-GEN-01`,
        name: 'Ubicación Principal / Recepción General',
        type: 'INTERNAL',
        notes: 'Ubicación creada automáticamente con el almacén',
        isActive: true
      }
    ]
  }

  updatedList.push(newWarehouse)
  saveStoredWarehouses(updatedList)

  return Promise.resolve(newWarehouse)
}

export const updateWarehouse = async (
  id: string,
  changes: Partial<Omit<Warehouse, 'id' | 'locations'>>
): Promise<Warehouse> => {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

  if (isUuid) {
    try {
      await executeGraphQL(
        UPDATE_WAREHOUSE_MUTATION,
        {
          id,
          input: {
            code: changes.code?.trim().toUpperCase(),
            name: changes.name?.trim(),
            address: changes.address?.trim(),
            manager: changes.manager?.trim(),
            isDefault: changes.isDefault,
            isActive: changes.isActive
          }
        },
        { timeoutMs: 8000 }
      )
    } catch (err) {
      console.warn('[categoryWarehouseService] Error al actualizar warehouse en backend:', err)
    }
  }

  let warehouses = loadStoredWarehouses()
  const idx = warehouses.findIndex(w => w.id === id)

  if (idx === -1) {
    throw new Error('Almacén no encontrado.')
  }

  if (changes.isDefault) {
    warehouses = warehouses.map(w => ({ ...w, isDefault: w.id === id }))
  }

  const updated: Warehouse = {
    ...warehouses[idx],
    ...changes,
    code: changes.code ? changes.code.trim().toUpperCase() : warehouses[idx].code,
    name: changes.name ? changes.name.trim() : warehouses[idx].name
  }

  warehouses[idx] = updated
  saveStoredWarehouses(warehouses)

  return Promise.resolve(updated)
}

export const deleteWarehouse = async (id: string): Promise<void> => {
  const warehouses = loadStoredWarehouses()
  const filtered = warehouses.filter(w => w.id !== id)

  saveStoredWarehouses(filtered)

  return Promise.resolve()
}

export const addWarehouseLocation = async (
  warehouseId: string,
  input: {
    code: string
    name: string
    type?: 'INTERNAL' | 'TRANSIT' | 'SCRAP'
    notes?: string
  }
): Promise<WarehouseLocation> => {
  const isWhUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(warehouseId)
  let backendLocId: string | undefined

  if (isWhUuid) {
    try {
      const res = await executeGraphQL<{ createStockLocation: { id: string } }>(
        CREATE_STOCK_LOCATION_MUTATION,
        {
          input: {
            warehouseId,
            name: input.name.trim(),
            code: input.code.trim().toUpperCase(),
            locationType: input.type === 'TRANSIT' ? 'TRANSIT' : input.type === 'SCRAP' ? 'INVENTORY_LOSS' : 'INTERNAL',
            notes: input.notes?.trim() || undefined
          }
        },
        { timeoutMs: 8000 }
      )

      if (res?.createStockLocation?.id) {
        backendLocId = res.createStockLocation.id
      }
    } catch (err) {
      console.warn('[categoryWarehouseService] Error al crear ubicación en backend:', err)
    }
  }

  const warehouses = loadStoredWarehouses()
  const idx = warehouses.findIndex(w => w.id === warehouseId)

  if (idx === -1) {
    throw new Error('Almacén no encontrado.')
  }

  const cleanCode = input.code.trim().toUpperCase()
  const cleanName = input.name.trim()

  if (!cleanCode || !cleanName) {
    throw new Error('El código y el nombre de la ubicación son obligatorios.')
  }

  const wh = warehouses[idx]

  if (wh.locations.some(l => l.code.toLowerCase() === cleanCode.toLowerCase())) {
    throw new Error(`La ubicación "${cleanCode}" ya existe dentro de ${wh.name}.`)
  }

  const newLoc: WarehouseLocation = {
    id: backendLocId || `loc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    warehouseId,
    code: cleanCode,
    name: cleanName,
    type: input.type || 'INTERNAL',
    notes: input.notes?.trim() || '',
    isActive: true
  }

  wh.locations = [...wh.locations, newLoc]
  warehouses[idx] = wh
  saveStoredWarehouses(warehouses)

  return Promise.resolve(newLoc)
}

export const deleteWarehouseLocation = async (
  warehouseId: string,
  locationId: string
): Promise<void> => {
  const warehouses = loadStoredWarehouses()
  const idx = warehouses.findIndex(w => w.id === warehouseId)

  if (idx === -1) return Promise.resolve()

  warehouses[idx].locations = warehouses[idx].locations.filter(l => l.id !== locationId)
  saveStoredWarehouses(warehouses)

  return Promise.resolve()
}
