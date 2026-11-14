import type {
  ProductTemplate,
  InventoryKPIs,
  StockMovement,
  StockAdjustmentRecord,
  AdjustmentReason,
  WarehouseOperationsDashboard
} from '@/types/inventoryTypes'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  GET_TEMPLATES_QUERY,
  GET_TEMPLATE_BY_ID_QUERY,
  GET_KARDEX_QUERY,
  GET_CATEGORIES_QUERY,
  GET_STOCK_LOCATIONS_QUERY,
  GET_STOCK_QUANTS_QUERY,
  GET_VARIANT_AVAILABILITY_QUERY,
  CREATE_PRODUCT_TEMPLATE_MUTATION,
  UPDATE_PRODUCT_TEMPLATE_MUTATION,
  DELETE_PRODUCT_TEMPLATE_MUTATION,
  CREATE_INVENTORY_ADJUSTMENT_MUTATION,
  APPLY_INVENTORY_ADJUSTMENT_MUTATION,
  GET_INVENTORY_ADJUSTMENTS_QUERY,
  GET_UNITS_OF_MEASURE_QUERY
} from '@/graphql/inventory.gql'
import type {
  GqlProductTemplate,
  GqlKardexPage,
  GqlStockMove,
  GqlStockLocation,
  GqlVariantAvailability,
  GqlStockQuant
} from '@/types/inventoryDto'
import {
  mapGqlTemplateToFrontend,
  serializeCreateTemplateInput,
  serializeUpdateTemplateInput,
  serializeAdjustmentInput,
  generateIdempotencyKey
} from '@/services/adapters/inventoryAdapter'
import { fetchActiveBcvRate } from '@/services/bcvService'
import { getWarehouseOperationOrders } from '@/services/inventory/operationOrdersService'
import { GET_TENANT_SETTING_QUERY, SET_TENANT_SETTING_MUTATION } from '@/graphql/pos.gql'

// Re-export modularized services so all existing '@/services/inventoryService' imports work seamlessly
export {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addWarehouseLocation,
  deleteWarehouseLocation
} from './inventory/categoryWarehouseService'
export {
  getWarehouseOperationOrderById,
  getWarehouseOperationOrders,
  createWarehouseOperationOrder,
  validateWarehouseOperationOrder,
  cancelWarehouseOperationOrder
} from './inventory/operationOrdersService'
export {
  calculateWeightedAverageCost,
  recalculateTemplateStandardCost,
  getSystemNegativeStockPolicy
} from './inventory/costingService'
export {
  getLandedCosts,
  getLandedCostById,
  calculateValuationAdjustments,
  createLandedCost,
  updateLandedCost,
  deleteLandedCost,
  validateLandedCost
} from './inventory/landedCostService'

// ==========================================
// PRODUCT TEMPLATES & VARIANTS CRUD (WITH IN-MEMORY CACHE)
// ==========================================
let cachedTemplates: ProductTemplate[] | null = null
let fetchTemplatesPromise: Promise<ProductTemplate[]> | null = null

export const invalidateTemplatesCache = (): void => {
  cachedTemplates = null
  fetchTemplatesPromise = null
}

export const getInventoryTemplates = async (forceRefresh = false): Promise<ProductTemplate[]> => {
  if (!forceRefresh && cachedTemplates) {
    return cachedTemplates
  }

  if (!forceRefresh && fetchTemplatesPromise) {
    return fetchTemplatesPromise
  }

  fetchTemplatesPromise = (async () => {
    try {
      const res = await executeGraphQL<{ templates: { nodes: GqlProductTemplate[] } }>(
        GET_TEMPLATES_QUERY,
        { page: 1, perPage: 100 },
        { timeoutMs: 5000 }
      )

      const mapped = (res?.templates?.nodes ?? []).map(mapGqlTemplateToFrontend)

      cachedTemplates = mapped

      return mapped
    } catch (err) {
      console.error('[inventoryService] No se pudieron cargar los productos:', err)
      throw err
    } finally {
      fetchTemplatesPromise = null
    }
  })()

  return fetchTemplatesPromise
}

export const getInventoryTemplateById = async (id: string): Promise<ProductTemplate | null> => {
  const res = await executeGraphQL<{ template: GqlProductTemplate | null }>(
    GET_TEMPLATE_BY_ID_QUERY,
    { id },
    { timeoutMs: 5000 }
  )

  return res?.template ? mapGqlTemplateToFrontend(res.template) : null
}

/**
 * Consulta de histórico de Kárdex transaccional para una variante de producto.
 */
export const getVariantKardex = async (variantId: string): Promise<GqlStockMove[]> => {
  try {
    const res = await executeGraphQL<{ kardex: GqlKardexPage }>(
      GET_KARDEX_QUERY,
      { variantId, page: 1, perPage: 50 },
      { timeoutMs: 4000 }
    )

    if (res?.kardex?.nodes) {
      return res.kardex.nodes
    }
  } catch {
    // Si falla o no hay datos, retornar array vacío
  }

  return []
}

export interface BackendCategoryNode {
  id: string
  name: string
  completeName?: string
  code?: string
}

let cachedBackendCategories: BackendCategoryNode[] | null = null

export const getInventoryFiscalConfig = async (): Promise<{ enabled: boolean }> => {
  const response = await executeGraphQL<{ tenantSetting: string }>(
    GET_TENANT_SETTING_QUERY,
    { key: 'inventory.fiscalEnabled' },
    { timeoutMs: 5000 }
  )

  return { enabled: response.tenantSetting === '' ? true : response.tenantSetting === 'true' }
}

export const setInventoryFiscalEnabled = async (enabled: boolean): Promise<void> => {
  await executeGraphQL(
    SET_TENANT_SETTING_MUTATION,
    { input: { key: 'inventory.fiscalEnabled', value: enabled ? 'true' : 'false' } },
    { timeoutMs: 5000 }
  )
}

export const getUnitsOfMeasure = async (): Promise<Array<{ id: string; code: string; name: string }>> => {
  const response = await executeGraphQL<{
    unitsOfMeasure: Array<{ id: string; code: string; name: string; isActive: boolean }>
  }>(GET_UNITS_OF_MEASURE_QUERY, undefined, { timeoutMs: 5000 })

  return response.unitsOfMeasure.filter(unit => unit.isActive)
}

export const fetchBackendCategories = async (): Promise<BackendCategoryNode[]> => {
  if (cachedBackendCategories && cachedBackendCategories.length > 0) {
    return cachedBackendCategories
  }

  try {
    const res = await executeGraphQL<{ categories: BackendCategoryNode[] }>(
      GET_CATEGORIES_QUERY,
      { take: 100 },
      { timeoutMs: 5000 }
    )

    if (res?.categories && Array.isArray(res.categories)) {
      cachedBackendCategories = res.categories
      
return res.categories
    }
  } catch (err) {
    console.warn('[inventoryService] No se pudieron cargar categorías de backend:', err)
  }

  return []
}

export const resolveCategoryId = async (categoryName?: string): Promise<string> => {
  const backendCats = await fetchBackendCategories()

  if (backendCats.length > 0) {
    if (categoryName) {
      const trimmed = categoryName.trim().toLowerCase()

      const matched = backendCats.find(
        c => c.name.toLowerCase() === trimmed || c.completeName?.toLowerCase() === trimmed
      )

      if (matched) return matched.id
    }

    return backendCats[0].id
  }

  // Fallback controlado si el backend no responde
  return 'c1'
}

let cachedStockLocations: GqlStockLocation[] | null = null

export const fetchStockLocations = async (): Promise<GqlStockLocation[]> => {
  if (cachedStockLocations && cachedStockLocations.length > 0) {
    return cachedStockLocations
  }

  try {
    const res = await executeGraphQL<{ stockLocations: GqlStockLocation[] }>(
      GET_STOCK_LOCATIONS_QUERY,
      { take: 100 },
      { timeoutMs: 5000 }
    )

    if (res?.stockLocations && Array.isArray(res.stockLocations)) {
      cachedStockLocations = res.stockLocations

      return res.stockLocations
    }
  } catch (err) {
    console.warn('[inventoryService] Error al cargar stockLocations de backend:', err)
  }

  return []
}

export const fetchVariantAvailability = async (variantId: string): Promise<GqlVariantAvailability | null> => {
  try {
    const res = await executeGraphQL<{ inventoryVariantAvailability: GqlVariantAvailability }>(
      GET_VARIANT_AVAILABILITY_QUERY,
      { variantId },
      { timeoutMs: 4000 }
    )

    if (res?.inventoryVariantAvailability) {
      return res.inventoryVariantAvailability
    }
  } catch (err) {
    console.warn('[inventoryService] Error al consultar disponibilidad de variante:', err)
  }

  return null
}

export const fetchStockQuants = async (variantId?: string): Promise<GqlStockQuant[]> => {
  try {
    const res = await executeGraphQL<{ stockQuants: GqlStockQuant[] }>(
      GET_STOCK_QUANTS_QUERY,
      {
        take: 100,
        where: variantId ? { variantId: { equals: variantId } } : undefined
      },
      { timeoutMs: 5000 }
    )

    if (res?.stockQuants && Array.isArray(res.stockQuants)) {
      return res.stockQuants
    }
  } catch (err) {
    console.warn('[inventoryService] Error al consultar stockQuants:', err)
  }

  return []
}

export const resolveDefaultStockLocations = async (): Promise<{ internalLocationId: string }> => {
  const locs = await fetchStockLocations()

  if (locs.length > 0) {
    const internal = locs.find(l => l.usage === 'INTERNAL') || locs[0]

    return { internalLocationId: internal.id }
  }

  return { internalLocationId: 'loc-default-internal' }
}

export const createProductTemplate = async (
  payload: Omit<ProductTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProductTemplate> => {
  // 1. Resolver el categoryId válido del backend
  const categoryId = await resolveCategoryId(payload.categoryName)

  // 2. Serializar payload para la mutación atómica GraphQL
  const input = serializeCreateTemplateInput(payload, categoryId)

  // 3. Ejecutar la mutación atómica contra forge-backend
  const res = await executeGraphQL<{ createProductTemplate: GqlProductTemplate }>(
    CREATE_PRODUCT_TEMPLATE_MUTATION,
    { input },
    { timeoutMs: 10000 }
  )

  if (res?.createProductTemplate) {
    const createdTemplate = mapGqlTemplateToFrontend(res.createProductTemplate)

    if (payload.categoryName && createdTemplate.categoryName === 'General') {
      createdTemplate.categoryName = payload.categoryName
    }

    invalidateTemplatesCache()

    return createdTemplate
  }

  throw new Error('El backend no retornó los datos del artículo creado.')
}

export const updateProductTemplate = async (
  id: string,
  payload: Partial<ProductTemplate>
): Promise<ProductTemplate> => {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

  if (isUuid) {
    let categoryId: string | undefined

    if (payload.categoryName) {
      categoryId = await resolveCategoryId(payload.categoryName)
    }

    const input = serializeUpdateTemplateInput(payload, categoryId)

    const res = await executeGraphQL<{ updateProductTemplate: GqlProductTemplate }>(
      UPDATE_PRODUCT_TEMPLATE_MUTATION,
      { id, input },
      { timeoutMs: 10000 }
    )

    if (res?.updateProductTemplate) {
      const mapped = mapGqlTemplateToFrontend(res.updateProductTemplate)

      invalidateTemplatesCache()

      return mapped
    }

    throw new Error('El backend no retornó los datos actualizados del producto.')
  }

  throw new Error('Solo se pueden actualizar productos sincronizados con el backend (UUID).')
}

export const deleteProductTemplate = async (id: string): Promise<void> => {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

  if (isUuid) {
    await executeGraphQL<{ deleteProductTemplate: boolean }>(
      DELETE_PRODUCT_TEMPLATE_MUTATION,
      { id },
      { timeoutMs: 10000 }
    )

    invalidateTemplatesCache()

    return
  }

  throw new Error('Solo se pueden eliminar productos sincronizados con el backend (UUID).')
}

// ==========================================
// KARDEX & STOCK ADJUSTMENTS
// ==========================================
export const getStockMovements = async (productId?: string): Promise<StockMovement[]> => {
  void productId

  // El backend expone kardex por variante; no hay query de listado global de movimientos.
  return []
}

export const getStockAdjustments = async (): Promise<StockAdjustmentRecord[]> => {
  const response = await executeGraphQL<{
    inventoryAdjustments: Array<{
      id: string
      auditNumber: string
      adjustmentState: string
      reason: string
      createdAt: string
      lines: Array<{
        id: string
        variantId: string
        theoreticalQuantity: string
        countedQuantity: string
        difference: string
      }>
    }>
  }>(GET_INVENTORY_ADJUSTMENTS_QUERY, { take: 100 }, { timeoutMs: 5000 })

  return response.inventoryAdjustments.flatMap(adjustment => {
    const line = adjustment.lines[0]

    if (!line) return []

    return [{
      id: adjustment.id,
      correlativo: adjustment.auditNumber,
      fecha: adjustment.createdAt,
      producto_id: '',
      producto_nombre: '',
      variante_id: line.variantId,
      variante_sku: '',
      uom_code: 'UNI',
      motivo: adjustment.reason as AdjustmentReason,
      stock_sistema: Number(line.theoreticalQuantity),
      stock_contado: Number(line.countedQuantity),
      diferencia: Number(line.difference),
      costo_unitario_usd: 0,
      impacto_usd: 0,
      observaciones: '',
      usuario_responsable: '',
      estado: (adjustment.adjustmentState === 'APPLIED' ? 'APPLIED' : 'DRAFT') as StockAdjustmentRecord['estado']
    }]
  })
}

export const applyStockAdjustment = async (input: {
  producto_id: string
  variante_id: string
  stock_contado: number
  motivo: AdjustmentReason
  observaciones?: string
  usuario_responsable?: string
}): Promise<StockAdjustmentRecord> => {
  void input.producto_id
  void input.usuario_responsable

  const defaultLoc = await resolveDefaultStockLocations()

  let reasonGql: 'PHYSICAL_COUNT' | 'LOSS' | 'DAMAGE' | 'SCRAP' | 'INITIAL_LOAD' | 'CORRECTION' = 'PHYSICAL_COUNT'

  if (input.motivo === 'ROTURA_MERMA') reasonGql = 'DAMAGE'
  else if (input.motivo === 'CADUCIDAD') reasonGql = 'SCRAP'
  else if (input.motivo === 'CONSUMO_INTERNO') reasonGql = 'LOSS'
  else if (input.motivo === 'CORRECCION_SISTEMA') reasonGql = 'CORRECTION'

  const payload = serializeAdjustmentInput({
    locationId: defaultLoc.internalLocationId,
    reason: reasonGql,
    lines: [{
      variantId: input.variante_id,
      theoreticalQuantity: input.stock_contado,
      countedQuantity: input.stock_contado,
      difference: 0
    }],
    idempotencyKey: generateIdempotencyKey()
  })

  const created = await executeGraphQL<{ createInventoryAdjustment: { id: string } }>(
    CREATE_INVENTORY_ADJUSTMENT_MUTATION,
    { input: payload },
    { timeoutMs: 10000 }
  )

  await executeGraphQL(
    APPLY_INVENTORY_ADJUSTMENT_MUTATION,
    { id: created.createInventoryAdjustment.id, idempotencyKey: generateIdempotencyKey() },
    { timeoutMs: 10000 }
  )

  const adjustments = await getStockAdjustments()
  const applied = adjustments.find(adjustment => adjustment.id === created.createInventoryAdjustment.id)

  if (!applied) {
    throw new Error('El ajuste fue aplicado pero no se pudo recargar desde el backend.')
  }

  return applied
}

// ==========================================
// DASHBOARD KPIS & FINANCIAL CALCULATORS
// ==========================================
export const calculateInventoryKPIs = (templates: ProductTemplate[], bcvRate = 0): InventoryKPIs => {
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
    totalStockValueVes: totalStockValue * bcvRate,
    lowStockCount,
    outOfStockCount
  }
}

export const getWarehouseOperationsDashboard = async (): Promise<WarehouseOperationsDashboard> => {
  const [templates, orders, bcv] = await Promise.all([
    getInventoryTemplates(),
    getWarehouseOperationOrders(),
    fetchActiveBcvRate()
  ])

  const bcvRate = bcv.ok ? bcv.data.rate : 0
  const kpis = calculateInventoryKPIs(templates, bcvRate)

  let valorVentaPotencialUsd = 0

  templates.forEach(t => {
    if (t.productType === 'service') return
    t.variants.forEach(v => {
      valorVentaPotencialUsd += v.availableStock * (t.basePrice + v.priceExtra)
    })
  })

  const activeOrders = orders.filter(
    op => op.estado !== 'COMPLETED' && op.estado !== 'CANCELLED'
  )

  const receipts = activeOrders.filter(op => op.tipo === 'RECEIPT')
  const deliveries = activeOrders.filter(op => op.tipo === 'DELIVERY')
  const transfers = activeOrders.filter(op => op.tipo === 'INTERNAL_TRANSFER')

  return Promise.resolve({
    recepciones_pendientes: receipts.length,
    recepciones_retrasadas: receipts.filter(r => r.estado === 'LATE').length,
    entregas_pendientes: deliveries.length,
    entregas_listas: deliveries.filter(d => d.estado === 'READY').length,
    transferencias_pendientes: transfers.length,
    articulos_stock_bajo: kpis.lowStockCount,
    articulos_agotados: kpis.outOfStockCount,
    total_articulos_catalogo: kpis.totalItems,
    valor_total_inventario_usd: kpis.totalStockValue,
    valor_total_inventario_ves: kpis.totalStockValue * bcvRate,
    valor_venta_potencial_usd: valorVentaPotencialUsd,
    valor_venta_potencial_ves: valorVentaPotencialUsd * bcvRate,
    tasa_bcv: bcvRate,
    operaciones_recientes: activeOrders.slice(0, 6).map(op => ({
      id: op.id,
      codigo: op.codigo,
      tercero_nombre: op.tercero_nombre,
      fecha_programada: op.fecha_programada,
      total_articulos: op.total_articulos,
      estado: op.estado,
      tipo: op.tipo,
      almacen_origen_nombre: op.almacen_origen_nombre,
      almacen_destino_nombre: op.almacen_destino_nombre
    }))
  })
}

export const calculateSuggestedPriceFromMargin = (
  cost: number,
  targetMarginPercent: number
): number => {
  if (cost <= 0) return 0
  const safeMargin = Math.max(0, targetMarginPercent)

  return Number((cost * (1 + safeMargin / 100)).toFixed(2))
}

export const calculateMarginFromPrice = (cost: number, price: number): number => {
  if (price <= 0) return 0
  if (cost <= 0) return 100
  const margin = ((price - cost) / cost) * 100

  return Number(margin.toFixed(1))
}

export const calculateFinancials = (
  cost: number,
  price: number,
  vatRate?: string,
  fiscalEnabled = false,
  bcvRate = 0
) => {
  const marginAmount = price - cost
  const marginPercentage = cost > 0 ? (marginAmount / cost) * 100 : price > 0 ? 100 : 0

  if (!fiscalEnabled || !vatRate || vatRate === 'EXEMPT' || vatRate === '0') {
    return {
      netCost: cost,
      netCostVes: cost * bcvRate,
      netPrice: price,
      netPriceVes: price * bcvRate,
      taxAmount: 0,
      taxAmountVes: 0,
      totalPriceWithTax: price,
      totalPriceWithTaxVes: price * bcvRate,
      marginAmount,
      marginAmountVes: marginAmount * bcvRate,
      marginPercentage,
      taxLabel: fiscalEnabled ? '0%' : null,
      taxFullLabel: fiscalEnabled ? 'Exento (0%)' : null
    }
  }

  const taxPercent = parseFloat(vatRate) / 100
  const taxAmount = price * taxPercent
  const totalPriceWithTax = price + taxAmount

  return {
    netCost: cost,
    netCostVes: cost * bcvRate,
    netPrice: price,
    netPriceVes: price * bcvRate,
    taxAmount,
    taxAmountVes: taxAmount * bcvRate,
    totalPriceWithTax,
    totalPriceWithTaxVes: totalPriceWithTax * bcvRate,
    marginAmount,
    marginAmountVes: marginAmount * bcvRate,
    marginPercentage,
    taxLabel: `${vatRate}%`,
    taxFullLabel: `IVA ${vatRate}%`
  }
}
