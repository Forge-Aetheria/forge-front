import type {
  ProductTemplate,
  InventoryKPIs,
  StockMovement,
  StockAdjustmentRecord,
  AdjustmentReason,
  WarehouseOperationsDashboard,
  FiscalConfig
} from '@/types/inventoryTypes'
import type { GqlStockMove } from '@/types/inventoryDto'
import {
  getActiveBcvRate,
  getFiscalConfig,
  setFiscalConfigEnabled,
  loadStoredTemplates,
  saveStoredTemplates,
  loadStoredMovements,
  saveStoredMovements,
  loadStoredAdjustments,
  saveStoredAdjustments,
  loadStoredOperationOrders
} from './inventory/inventoryStorage'

// Re-export modularized services so all existing '@/services/inventoryService' imports work seamlessly
export { getActiveBcvRate, getFiscalConfig, setFiscalConfigEnabled }
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

// ==========================================
// PRODUCT TEMPLATES & VARIANTS CRUD (WITH IN-MEMORY CACHE)
// ==========================================
let cachedTemplates: ProductTemplate[] | null = null

export const invalidateTemplatesCache = (): void => {
  cachedTemplates = null
}

export const getInventoryTemplates = async (forceRefresh = false): Promise<ProductTemplate[]> => {
  if (!forceRefresh && cachedTemplates) {
    return cachedTemplates
  }

  const stored = loadStoredTemplates()
  cachedTemplates = stored
  return stored
}

export const getInventoryTemplateById = async (id: string): Promise<ProductTemplate | null> => {
  const templates = cachedTemplates || loadStoredTemplates()
  const item = templates.find(template => template.id === id) || null

  return item
}

/**
 * Consulta de histórico de Kárdex transaccional para una variante de producto.
 */
export const getVariantKardex = async (_variantId: string): Promise<GqlStockMove[]> => {
  return []
}

export const createProductTemplate = async (
  payload: Omit<ProductTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProductTemplate> => {
  const templates = loadStoredTemplates()
  const movements = loadStoredMovements()

  // Verify unique master SKU
  const duplicateMaster = templates.some(
    t => t.defaultCode.trim().toLowerCase() === payload.defaultCode.trim().toLowerCase()
  )

  if (duplicateMaster) {
    throw new Error(`El SKU "${payload.defaultCode}" ya está en uso por otro artículo.`)
  }

  const now = new Date().toISOString()
  const newId = `prod-${Date.now().toString().slice(-5)}`

  const newTemplate: ProductTemplate = {
    ...payload,
    id: newId,
    createdAt: now,
    updatedAt: now,
    variants: payload.variants.map((v, idx) => ({
      ...v,
      id: v.id || `var-${Date.now().toString().slice(-4)}-${idx + 1}`,
      templateId: newId,
      availableStock: Math.max(0, v.physicalStock - (v.reservedStock || 0))
    }))
  }

  // Register initial Kardex entries for variants with initial physical stock > 0
  if (newTemplate.productType !== 'service') {
    newTemplate.variants.forEach(variant => {
      if (variant.physicalStock > 0) {
        movements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fecha: now,
          producto_id: newTemplate.id,
          producto_nombre: newTemplate.name,
          variante_id: variant.id,
          variante_sku: variant.sku,
          uom_code: newTemplate.uomCode,
          tipo_movimiento: 'INITIAL_INVENTORY',
          documento_referencia: `INV-ALTA-${newTemplate.defaultCode}`,
          cantidad_entrada: variant.physicalStock,
          cantidad_salida: 0,
          costo_unitario_usd: variant.costPrice || newTemplate.standardCost,
          saldo_resultante: variant.physicalStock,
          motivo: 'Existencia inicial al registrar el producto en catálogo',
          almacen: 'Almacén Central',
          usuario_responsable: 'Administrador ERP'
        })
      }
    })
    saveStoredMovements(movements)
  }

  const updated = [newTemplate, ...templates]

  saveStoredTemplates(updated)
  invalidateTemplatesCache()

  return Promise.resolve(newTemplate)
}

export const updateProductTemplate = async (
  id: string,
  payload: Partial<ProductTemplate>
): Promise<ProductTemplate> => {
  const templates = loadStoredTemplates()
  const index = templates.findIndex(t => t.id === id)

  if (index === -1) {
    throw new Error('El producto solicitado no existe.')
  }

  // Check duplicate master SKU if changed
  if (payload.defaultCode) {
    const duplicate = templates.some(
      t =>
        t.id !== id &&
        t.defaultCode.trim().toLowerCase() === payload.defaultCode!.trim().toLowerCase()
    )

    if (duplicate) {
      throw new Error(`El SKU "${payload.defaultCode}" ya pertenece a otro artículo.`)
    }
  }

  const existing = templates[index]
  const updatedTemplate: ProductTemplate = {
    ...existing,
    ...payload,
    id: existing.id,
    updatedAt: new Date().toISOString(),
    variants: (payload.variants || existing.variants).map(v => ({
      ...v,
      templateId: existing.id,
      availableStock: Math.max(0, v.physicalStock - (v.reservedStock || 0))
    }))
  }

  templates[index] = updatedTemplate
  saveStoredTemplates(templates)
  invalidateTemplatesCache()

  return Promise.resolve(updatedTemplate)
}

export const deleteProductTemplate = async (id: string): Promise<void> => {
  const templates = loadStoredTemplates()
  const filtered = templates.filter(t => t.id !== id)

  saveStoredTemplates(filtered)
  invalidateTemplatesCache()

  return Promise.resolve()
}

// ==========================================
// KARDEX & STOCK ADJUSTMENTS
// ==========================================
export const getStockMovements = async (productId?: string): Promise<StockMovement[]> => {
  const movements = loadStoredMovements()

  if (productId && productId !== 'ALL') {
    return Promise.resolve(movements.filter(m => m.producto_id === productId))
  }

  return Promise.resolve(movements)
}

export const getStockAdjustments = async (): Promise<StockAdjustmentRecord[]> => {
  return Promise.resolve(loadStoredAdjustments())
}

export const applyStockAdjustment = async (input: {
  producto_id: string
  variante_id: string
  stock_contado: number
  motivo: AdjustmentReason
  observaciones?: string
  usuario_responsable?: string
}): Promise<StockAdjustmentRecord> => {
  const templates = loadStoredTemplates()
  const movements = loadStoredMovements()
  const adjustments = loadStoredAdjustments()

  const tIdx = templates.findIndex(t => t.id === input.producto_id)

  if (tIdx === -1) {
    throw new Error('Producto no encontrado.')
  }

  const template = templates[tIdx]

  if (template.productType === 'service') {
    throw new Error('Los servicios no admiten ajustes de stock físico.')
  }

  const vIdx = template.variants.findIndex(v => v.id === input.variante_id)

  if (vIdx === -1) {
    throw new Error('Variante de producto no encontrada.')
  }

  const variant = template.variants[vIdx]
  const stockSistema = variant.physicalStock
  const stockContado = Math.max(0, input.stock_contado)
  const diferencia = stockContado - stockSistema

  // Update variant stock
  const newAvailable = Math.max(0, stockContado - variant.reservedStock)

  template.variants[vIdx] = {
    ...variant,
    physicalStock: stockContado,
    availableStock: newAvailable
  }
  template.updatedAt = new Date().toISOString()
  templates[tIdx] = template
  saveStoredTemplates(templates)
  invalidateTemplatesCache()

  const now = new Date().toISOString()
  const nextNumber = (adjustments.length + 1).toString().padStart(4, '0')
  const correlativo = `AJU-2026-${nextNumber}`
  const unitCost = variant.costPrice || template.standardCost

  const newAdjustment: StockAdjustmentRecord = {
    id: `adj-${Date.now()}`,
    correlativo,
    fecha: now,
    producto_id: template.id,
    producto_nombre: template.name,
    variante_id: variant.id,
    variante_sku: variant.sku,
    uom_code: template.uomCode,
    motivo: input.motivo,
    stock_sistema: stockSistema,
    stock_contado: stockContado,
    diferencia,
    costo_unitario_usd: unitCost,
    impacto_usd: diferencia * unitCost,
    observaciones: input.observaciones,
    usuario_responsable: input.usuario_responsable || 'Elena Rivas',
    estado: 'APPLIED'
  }

  adjustments.unshift(newAdjustment)
  saveStoredAdjustments(adjustments)

  // Generate Kardex movement if difference != 0
  if (diferencia !== 0) {
    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      fecha: now,
      producto_id: template.id,
      producto_nombre: template.name,
      variante_id: variant.id,
      variante_sku: variant.sku,
      uom_code: template.uomCode,
      tipo_movimiento: diferencia > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      documento_referencia: correlativo,
      cantidad_entrada: diferencia > 0 ? diferencia : 0,
      cantidad_salida: diferencia < 0 ? Math.abs(diferencia) : 0,
      costo_unitario_usd: unitCost,
      saldo_resultante: stockContado,
      motivo: input.observaciones || `Ajuste por ${input.motivo.replace('_', ' ')}`,
      almacen: 'Almacén Central',
      usuario_responsable: input.usuario_responsable || 'Elena Rivas'
    }

    movements.unshift(mov)
    saveStoredMovements(movements)
  }

  return Promise.resolve(newAdjustment)
}

// ==========================================
// DASHBOARD KPIS & FINANCIAL CALCULATORS
// ==========================================
export const calculateInventoryKPIs = (templates: ProductTemplate[]): InventoryKPIs => {
  let totalStockValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0
  const bcvRate = getActiveBcvRate()

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
  const templates = loadStoredTemplates()
  const kpis = calculateInventoryKPIs(templates)
  const bcvRate = getActiveBcvRate()
  const orders = loadStoredOperationOrders()

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
  fiscalEnabled = false
) => {
  const bcvRate = getActiveBcvRate()
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
