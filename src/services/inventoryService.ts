import { mockProductTemplates, defaultFiscalConfig } from '@/data/inventory/mockInventoryData'
import type { ProductTemplate, InventoryKPIs, FiscalConfig } from '@/types/inventoryTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  GET_TEMPLATES_QUERY,
  GET_TEMPLATE_BY_ID_QUERY,
  GET_KARDEX_QUERY
} from '@/graphql/inventory.gql'
import type { GqlProductTemplate, GqlKardexPage, GqlStockMove } from '@/types/inventoryDto'
import { mapGqlTemplateToFrontend } from '@/services/adapters/inventoryAdapter'

export const getInventoryTemplates = async (): Promise<ProductTemplate[]> => {
  try {
    const res = await executeGraphQL<{ templates: { nodes: GqlProductTemplate[] } }>(
      GET_TEMPLATES_QUERY,
      { page: 1, perPage: 100 }
    )

    if (res?.templates?.nodes && res.templates.nodes.length > 0) {
      return res.templates.nodes.map(mapGqlTemplateToFrontend)
    }
  } catch {
    // Fallback controlado a datos mock si el backend no está disponible o no hay red
  }

  return [...mockProductTemplates]
}

export const getInventoryTemplateById = async (id: string): Promise<ProductTemplate | null> => {
  try {
    const res = await executeGraphQL<{ template: GqlProductTemplate }>(
      GET_TEMPLATE_BY_ID_QUERY,
      { id }
    )

    if (res?.template) {
      return mapGqlTemplateToFrontend(res.template)
    }
  } catch {
    // Fallback a mock data
  }

  const item = mockProductTemplates.find(template => template.id === id) || null

  return item
}

/**
 * Consulta de histórico de Kárdex transaccional para una variante de producto.
 */
export const getVariantKardex = async (variantId: string): Promise<GqlStockMove[]> => {
  try {
    const res = await executeGraphQL<{ kardex: GqlKardexPage }>(
      GET_KARDEX_QUERY,
      { variantId, page: 1, perPage: 50 }
    )

    if (res?.kardex?.nodes) {
      return res.kardex.nodes
    }
  } catch {
    // Si falla o no hay datos, retornar array vacío
  }

  return []
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
