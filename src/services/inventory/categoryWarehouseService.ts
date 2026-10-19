import type {
  ProductCategory,
  Warehouse,
  WarehouseLocation
} from '@/types/inventoryTypes'
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
    createdAt: new Date().toISOString()
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
// WAREHOUSES & LOCATIONS CRUD (Padre-Hijo)
// ==========================================
export const getWarehouses = async (): Promise<Warehouse[]> => {
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

  const isDefault = Boolean(input.isDefault) || warehouses.length === 0

  const updatedList = isDefault
    ? warehouses.map(w => ({ ...w, isDefault: false }))
    : [...warehouses]

  const newWhId = `wh-${Date.now()}`
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
    id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
