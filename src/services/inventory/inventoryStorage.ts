import {
  mockProductTemplates,
  defaultFiscalConfig,
  mockStockMovements,
  mockStockAdjustments,
  mockWarehouseOperationOrders,
  mockProductCategories,
  mockWarehouses
} from '@/data/inventory/mockInventoryData'
import type {
  ProductTemplate,
  FiscalConfig,
  StockMovement,
  StockAdjustmentRecord,
  WarehouseOperationOrder,
  ProductCategory,
  Warehouse
} from '@/types/inventoryTypes'

export const STORAGE_TEMPLATES_KEY = 'forge_inventory_templates_v2'
export const STORAGE_MOVEMENTS_KEY = 'forge_inventory_movements_v2'
export const STORAGE_ADJUSTMENTS_KEY = 'forge_inventory_adjustments_v2'
export const STORAGE_CATEGORIES_KEY = 'forge_inventory_categories_v1'
export const STORAGE_WAREHOUSES_KEY = 'forge_inventory_warehouses_v1'
export const STORAGE_OPERATION_ORDERS_KEY = 'forge_inventory_operation_orders_v1'
export const DEFAULT_BCV_RATE = 36.5

export const getActiveBcvRate = (): number => {
  return DEFAULT_BCV_RATE
}

export const getFiscalConfig = (): FiscalConfig => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('forge_fiscal_enabled')

    if (saved !== null) {
      return {
        ...defaultFiscalConfig,
        enabled: saved === 'true'
      }
    }
  }

  return defaultFiscalConfig
}

export const setFiscalConfigEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('forge_fiscal_enabled', enabled ? 'true' : 'false')
  }
}

export const loadStoredTemplates = (): ProductTemplate[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_TEMPLATES_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback to mock
      }
    }
  }

  return [...mockProductTemplates]
}

export const saveStoredTemplates = (templates: ProductTemplate[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(templates))
  }
}

export const loadStoredMovements = (): StockMovement[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_MOVEMENTS_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback to mock
      }
    }
  }

  return [...mockStockMovements]
}

export const saveStoredMovements = (movements: StockMovement[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_MOVEMENTS_KEY, JSON.stringify(movements))
  }
}

export const loadStoredAdjustments = (): StockAdjustmentRecord[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_ADJUSTMENTS_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback
      }
    }
  }

  return [...mockStockAdjustments]
}

export const saveStoredAdjustments = (adjustments: StockAdjustmentRecord[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_ADJUSTMENTS_KEY, JSON.stringify(adjustments))
  }
}

export const loadStoredCategories = (): ProductCategory[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_CATEGORIES_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback
      }
    }
  }

  return [...mockProductCategories]
}

export const saveStoredCategories = (categories: ProductCategory[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories))
  }
}

export const loadStoredWarehouses = (): Warehouse[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_WAREHOUSES_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback
      }
    }
  }

  return [...mockWarehouses]
}

export const saveStoredWarehouses = (warehouses: Warehouse[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_WAREHOUSES_KEY, JSON.stringify(warehouses))
  }
}

export const loadStoredOperationOrders = (): WarehouseOperationOrder[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_OPERATION_ORDERS_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback
      }
    }
  }

  return [...mockWarehouseOperationOrders]
}

export const saveStoredOperationOrders = (orders: WarehouseOperationOrder[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_OPERATION_ORDERS_KEY, JSON.stringify(orders))
  }
}
