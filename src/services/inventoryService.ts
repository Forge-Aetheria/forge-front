import { mockProductTemplates, defaultFiscalConfig } from '@/data/inventory/mockInventoryData'
import type { ProductTemplate, InventoryKPIs, FiscalConfig } from '@/types/inventoryTypes'

export const getInventoryTemplates = async (): Promise<ProductTemplate[]> => {
  // Simulating async API call for future backend compatibility
  return Promise.resolve([...mockProductTemplates])
}

export const getInventoryTemplateById = async (id: string): Promise<ProductTemplate | null> => {
  const item = mockProductTemplates.find(template => template.id === id) || null

  return Promise.resolve(item)
}

export const calculateInventoryKPIs = (templates: ProductTemplate[]): InventoryKPIs => {
  let totalStockValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  templates.forEach(template => {
    if (template.productType === 'service') return

    const totalAvailable = template.variants.reduce((acc, v) => acc + v.availableStock, 0)
    const totalPhysical = template.variants.reduce((acc, v) => acc + v.physicalStock, 0)
    const avgCost = template.standardCost

    totalStockValue += totalPhysical * avgCost

    if (totalAvailable === 0) {
      outOfStockCount += 1
    } else if (template.minStock && totalAvailable <= template.minStock) {
      lowStockCount += 1
    }
  })

  return {
    totalItems: templates.length,
    totalStockValue,
    lowStockCount,
    outOfStockCount
  }
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

export const calculateFinancials = (cost: number, price: number, vatRate?: string, fiscalEnabled = false) => {
  const marginAmount = price - cost
  const marginPercentage = price > 0 ? (marginAmount / price) * 100 : 0

  if (!fiscalEnabled || !vatRate || vatRate === 'EXEMPT' || vatRate === '0') {
    return {
      netCost: cost,
      netPrice: price,
      taxAmount: 0,
      totalPriceWithTax: price,
      marginAmount,
      marginPercentage,
      taxLabel: fiscalEnabled ? 'Exento (0%)' : null
    }
  }

  const taxPercent = parseFloat(vatRate) / 100
  const taxAmount = price * taxPercent
  const totalPriceWithTax = price + taxAmount

  return {
    netCost: cost,
    netPrice: price,
    taxAmount,
    totalPriceWithTax,
    marginAmount,
    marginPercentage,
    taxLabel: `IVA ${vatRate}%`
  }
}
