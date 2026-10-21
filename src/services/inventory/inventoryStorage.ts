import {
  mockProductTemplates,
  defaultFiscalConfig,
  mockStockMovements,
  mockStockAdjustments,
  mockWarehouseOperationOrders,
  mockProductCategories,
  mockWarehouses,
  mockLandedCosts
} from '@/data/inventory/mockInventoryData'
import type {
  ProductTemplate,
  FiscalConfig,
  StockMovement,
  StockAdjustmentRecord,
  WarehouseOperationOrder,
  ProductCategory,
  Warehouse,
  LandedCostRecord
} from '@/types/inventoryTypes'

export const STORAGE_TEMPLATES_KEY = 'forge_inventory_templates_v2'
export const STORAGE_MOVEMENTS_KEY = 'forge_inventory_movements_v2'
export const STORAGE_ADJUSTMENTS_KEY = 'forge_inventory_adjustments_v2'
export const STORAGE_CATEGORIES_KEY = 'forge_inventory_categories_v1'
export const STORAGE_WAREHOUSES_KEY = 'forge_inventory_warehouses_v1'
export const STORAGE_OPERATION_ORDERS_KEY = 'forge_inventory_operation_orders_v1'
export const STORAGE_LANDED_COSTS_KEY = 'forge_inventory_landed_costs_v1'
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
        const parsed: ProductCategory[] = JSON.parse(raw)

        return parsed.map(c => {
          const mockMatch = mockProductCategories.find(m => m.id === c.id || m.code === c.code)

          return {
            ...c,
            cuentaIngresosId: c.cuentaIngresosId || mockMatch?.cuentaIngresosId || 'acc-410101',
            cuentaIngresosCodigo: c.cuentaIngresosCodigo || mockMatch?.cuentaIngresosCodigo || '4.1.01.01',
            cuentaIngresosNombre: c.cuentaIngresosNombre || mockMatch?.cuentaIngresosNombre || 'Ingresos por Venta de Mercancías',
            cuentaGastosId: c.cuentaGastosId || mockMatch?.cuentaGastosId || 'acc-510101',
            cuentaGastosCodigo: c.cuentaGastosCodigo || mockMatch?.cuentaGastosCodigo || '5.1.01.01',
            cuentaGastosNombre: c.cuentaGastosNombre || mockMatch?.cuentaGastosNombre || 'Costo de Ventas de Mercancía',
            cuentaValoracionInventarioId: c.cuentaValoracionInventarioId || mockMatch?.cuentaValoracionInventarioId || (c.code === 'SRV' ? undefined : 'acc-110301'),
            cuentaValoracionInventarioCodigo: c.cuentaValoracionInventarioCodigo || mockMatch?.cuentaValoracionInventarioCodigo || (c.code === 'SRV' ? undefined : '1.1.03.01'),
            cuentaValoracionInventarioNombre: c.cuentaValoracionInventarioNombre || mockMatch?.cuentaValoracionInventarioNombre || (c.code === 'SRV' ? undefined : 'Inventario de Mercancía para la Venta'),
            cuentaCostosDestinoId: c.cuentaCostosDestinoId || mockMatch?.cuentaCostosDestinoId || (c.code === 'SRV' ? undefined : 'acc-110302'),
            cuentaCostosDestinoCodigo: c.cuentaCostosDestinoCodigo || mockMatch?.cuentaCostosDestinoCodigo || (c.code === 'SRV' ? undefined : '1.1.03.02'),
            cuentaCostosDestinoNombre: c.cuentaCostosDestinoNombre || mockMatch?.cuentaCostosDestinoNombre || (c.code === 'SRV' ? undefined : 'Mercancías en Tránsito / Costos en Destino')
          }
        })
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

export const loadStoredLandedCosts = (): LandedCostRecord[] => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_LANDED_COSTS_KEY)

    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        // Fallback
      }
    }
  }

  return [...mockLandedCosts]
}

export const saveStoredLandedCosts = (records: LandedCostRecord[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_LANDED_COSTS_KEY, JSON.stringify(records))
  }
}
