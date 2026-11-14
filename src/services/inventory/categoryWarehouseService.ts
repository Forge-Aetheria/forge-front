import type { ProductCategory, Warehouse, WarehouseLocation } from '@/types/inventoryTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  CREATE_PRODUCT_CATEGORY_MUTATION,
  CREATE_STOCK_LOCATION_MUTATION,
  CREATE_WAREHOUSE_MUTATION,
  DELETE_PRODUCT_CATEGORY_MUTATION,
  DELETE_STOCK_LOCATION_MUTATION,
  DELETE_WAREHOUSE_MUTATION,
  GET_CATEGORIES_QUERY,
  GET_WAREHOUSES_QUERY,
  UPDATE_PRODUCT_CATEGORY_MUTATION,
  UPDATE_WAREHOUSE_MUTATION
} from '@/graphql/inventory.gql'

interface GqlAccountRef {
  id: string
  code: string
  name: string
}

interface GqlCategory {
  id: string
  name: string
  code?: string | null
  completeName?: string
  description?: string | null
  isActive: boolean
  revenueAccount?: GqlAccountRef | null
  expenseAccount?: GqlAccountRef | null
  inventoryAccount?: GqlAccountRef | null
  landedCostAccount?: GqlAccountRef | null
}

interface GqlLocation {
  id: string
  code: string
  name: string
  completePath?: string | null
  warehouseId: string
  isActive: boolean
}

interface GqlWarehouse {
  id: string
  code: string
  name: string
  address?: string | null
  manager?: string | null
  isDefault: boolean
  isActive: boolean
  createdAt?: string
  locations?: GqlLocation[]
}

const mapCategory = (category: GqlCategory): ProductCategory => ({
  id: category.id,
  name: category.name,
  code: category.code || '',
  description: category.description || '',
  isActive: category.isActive,
  cuentaIngresosId: category.revenueAccount?.id,
  cuentaIngresosCodigo: category.revenueAccount?.code,
  cuentaIngresosNombre: category.revenueAccount?.name,
  cuentaGastosId: category.expenseAccount?.id,
  cuentaGastosCodigo: category.expenseAccount?.code,
  cuentaGastosNombre: category.expenseAccount?.name,
  cuentaValoracionInventarioId: category.inventoryAccount?.id,
  cuentaValoracionInventarioCodigo: category.inventoryAccount?.code,
  cuentaValoracionInventarioNombre: category.inventoryAccount?.name,
  cuentaCostosDestinoId: category.landedCostAccount?.id,
  cuentaCostosDestinoCodigo: category.landedCostAccount?.code,
  cuentaCostosDestinoNombre: category.landedCostAccount?.name
})

const mapLocation = (location: GqlLocation): WarehouseLocation => ({
  id: location.id,
  warehouseId: location.warehouseId,
  code: location.code,
  name: location.name,
  type: 'INTERNAL',
  notes: location.completePath || '',
  isActive: location.isActive
})

const mapWarehouse = (warehouse: GqlWarehouse): Warehouse => ({
  id: warehouse.id,
  code: warehouse.code,
  name: warehouse.name,
  address: warehouse.address || '',
  manager: warehouse.manager || '',
  isDefault: warehouse.isDefault,
  isActive: warehouse.isActive,
  createdAt: warehouse.createdAt || new Date().toISOString(),
  locations: (warehouse.locations || []).map(mapLocation)
})

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const response = await executeGraphQL<{ categories: GqlCategory[] }>(
    GET_CATEGORIES_QUERY,
    { take: 100 },
    { timeoutMs: 5000 }
  )

  return response.categories.map(mapCategory)
}

export const createProductCategory = async (input: {
  name: string
  code?: string
  description?: string
  cuentaIngresosId?: string
  cuentaGastosId?: string
  cuentaValoracionInventarioId?: string
  cuentaCostosDestinoId?: string
}): Promise<ProductCategory> => {
  const response = await executeGraphQL<{ createProductCategory: GqlCategory }>(
    CREATE_PRODUCT_CATEGORY_MUTATION,
    {
      input: {
        name: input.name.trim(),
        code: input.code?.trim().toUpperCase() || undefined,
        description: input.description?.trim() || undefined,
        revenueAccountId: input.cuentaIngresosId || undefined,
        expenseAccountId: input.cuentaGastosId || undefined,
        inventoryAccountId: input.cuentaValoracionInventarioId || undefined,
        landedCostAccountId: input.cuentaCostosDestinoId || undefined
      }
    },
    { timeoutMs: 8000 }
  )

  return mapCategory(response.createProductCategory)
}

export const updateProductCategory = async (
  id: string,
  changes: Partial<ProductCategory>
): Promise<ProductCategory> => {
  const response = await executeGraphQL<{ updateProductCategory: GqlCategory }>(
    UPDATE_PRODUCT_CATEGORY_MUTATION,
    {
      id,
      input: {
        name: changes.name?.trim() || undefined,
        code: changes.code?.trim().toUpperCase() || undefined,
        description: changes.description?.trim() || undefined,
        isActive: changes.isActive,
        revenueAccountId: changes.cuentaIngresosId,
        expenseAccountId: changes.cuentaGastosId,
        inventoryAccountId: changes.cuentaValoracionInventarioId,
        landedCostAccountId: changes.cuentaCostosDestinoId
      }
    },
    { timeoutMs: 8000 }
  )

  return mapCategory(response.updateProductCategory)
}

export const deleteProductCategory = async (id: string): Promise<void> => {
  await executeGraphQL(DELETE_PRODUCT_CATEGORY_MUTATION, { id }, { timeoutMs: 8000 })
}

export const getWarehouses = async (): Promise<Warehouse[]> => {
  const response = await executeGraphQL<{ warehouses: GqlWarehouse[] }>(
    GET_WAREHOUSES_QUERY,
    { take: 50 },
    { timeoutMs: 5000 }
  )

  return response.warehouses.map(mapWarehouse)
}

export const createWarehouse = async (input: {
  code: string
  name: string
  address?: string
  manager?: string
  isDefault?: boolean
}): Promise<Warehouse> => {
  const response = await executeGraphQL<{ createWarehouse: GqlWarehouse }>(
    CREATE_WAREHOUSE_MUTATION,
    {
      input: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        address: input.address?.trim() || undefined,
        manager: input.manager?.trim() || undefined,
        isDefault: Boolean(input.isDefault)
      }
    },
    { timeoutMs: 8000 }
  )

  return mapWarehouse(response.createWarehouse)
}

export const updateWarehouse = async (
  id: string,
  changes: Partial<Omit<Warehouse, 'id' | 'locations'>>
): Promise<Warehouse> => {
  const response = await executeGraphQL<{ updateWarehouse: GqlWarehouse }>(
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

  return mapWarehouse(response.updateWarehouse)
}

export const deleteWarehouse = async (id: string): Promise<void> => {
  await executeGraphQL(DELETE_WAREHOUSE_MUTATION, { id }, { timeoutMs: 8000 })
}

export const addWarehouseLocation = async (
  warehouseId: string,
  input: { code: string; name: string; type?: 'INTERNAL' | 'TRANSIT' | 'SCRAP'; notes?: string }
): Promise<WarehouseLocation> => {
  const response = await executeGraphQL<{ createStockLocation: GqlLocation }>(
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

  return mapLocation(response.createStockLocation)
}

export const deleteWarehouseLocation = async (_warehouseId: string, locationId: string): Promise<void> => {
  await executeGraphQL(DELETE_STOCK_LOCATION_MUTATION, { id: locationId }, { timeoutMs: 8000 })
}
