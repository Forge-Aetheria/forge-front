// Adaptadores bidireccionales entre el esquema GraphQL de forge-backend y la UI de forge-front

import type {
  ProductTemplate,
  ProductVariant,
  ProductAttribute,
  ProductType,
  SENIAT_VATRate,
  ProductDeliveryPolicyOption,
  ProductInvoicingPolicyOption,
  ProductPurchaseControlOption,
  LandedCostSplitMethod
} from '@/types/inventoryTypes'
import type { GqlProductTemplate, GqlProductVariant } from '@/types/inventoryDto'

/**
 * Convierte un número o string a formato decimal string con hasta 4 decimales
 * requerido por las directivas @IsDecimal4 y el scalar Decimal en forge-backend.
 */
export const formatDecimalString = (val?: number | string | null, defaultValue = '0.0000'): string => {
  if (val === undefined || val === null || val === '') return defaultValue

  const num = typeof val === 'number' ? val : parseFloat(val)

  if (isNaN(num) || num < 0) return defaultValue

  return num.toFixed(4)
}

/**
 * Normaliza el tipo de producto al enum de backend.
 */
export const mapProductTypeToBackend = (type?: ProductType | string): 'STORABLE' | 'SERVICE' | 'CONSUMABLE' => {
  if (type === 'service') return 'SERVICE'
  if (type === 'consumable') return 'CONSUMABLE'

  return 'STORABLE'
}

/**
 * Normaliza la alícuota de IVA al enum de backend.
 */
export const mapVatAliquotToBackend = (
  rate?: SENIAT_VATRate | string
): 'GENERAL_16' | 'REDUCED_8' | 'LUXURY_31' | 'EXEMPT_0' | undefined => {
  if (rate === '16') return 'GENERAL_16'
  if (rate === '8') return 'REDUCED_8'
  if (rate === '31') return 'LUXURY_31'
  if (rate === 'EXEMPT') return 'EXEMPT_0'

  return undefined
}

export const mapDeliveryPolicyToBackend = (
  policy?: ProductDeliveryPolicyOption | string
): 'ORDERED' | 'DELIVERED' | 'DEFAULT' | undefined => {
  if (policy === 'ORDERED' || policy === 'DELIVERED' || policy === 'DEFAULT') return policy

  return undefined
}

export const mapInvoicingPolicyToBackend = (
  policy?: ProductInvoicingPolicyOption | string
): 'ORDERED_QUANTITIES' | 'DELIVERED_QUANTITIES' | undefined => {
  if (policy === 'ORDERED_QUANTITIES' || policy === 'DELIVERED_QUANTITIES') return policy

  return undefined
}

export const mapPurchaseControlPolicyToBackend = (
  policy?: ProductPurchaseControlOption | string
): 'ORDERED_QUANTITIES' | 'RECEIVED_QUANTITIES' | undefined => {
  if (policy === 'ORDERED_QUANTITIES' || policy === 'RECEIVED_QUANTITIES') return policy

  return undefined
}

export const mapLandedCostSplitMethodToBackend = (
  method?: LandedCostSplitMethod | string
): 'EQUAL' | 'BY_QUANTITY' | 'BY_COST' | 'BY_WEIGHT' | 'BY_VOLUME' | undefined => {
  if (
    method === 'EQUAL' ||
    method === 'BY_QUANTITY' ||
    method === 'BY_COST' ||
    method === 'BY_WEIGHT' ||
    method === 'BY_VOLUME'
  ) {
    return method
  }

  return undefined
}

export interface CreateTemplateVariantGqlInput {
  sku: string
  barcode?: string
  priceExtra?: string
  standardCost?: string
  attributeValueIds?: string[]
}

export interface CreateProductTemplateGqlInput {
  name: string
  categoryId: string
  basePrice: string
  productType?: 'STORABLE' | 'SERVICE' | 'CONSUMABLE'
  uomCode?: string
  vatAliquot?: 'GENERAL_16' | 'REDUCED_8' | 'LUXURY_31' | 'EXEMPT_0'
  withholdingIslr?: string
  targetMargin?: string
  notes?: string
  imageUrl?: string
  canBeSold?: boolean
  canBePurchased?: boolean
  weight?: string
  volume?: string
  deliveryPolicy?: 'ORDERED' | 'DELIVERED' | 'DEFAULT'
  invoicingPolicy?: 'ORDERED_QUANTITIES' | 'DELIVERED_QUANTITIES'
  purchaseControlPolicy?: 'ORDERED_QUANTITIES' | 'RECEIVED_QUANTITIES'
  isLandedCost?: boolean
  defaultSplitMethod?: 'EQUAL' | 'BY_QUANTITY' | 'BY_COST' | 'BY_WEIGHT' | 'BY_VOLUME'
  variants?: CreateTemplateVariantGqlInput[]
}

export interface UpdateProductTemplateGqlInput {
  name?: string
  categoryId?: string
  basePrice?: string
  productType?: 'STORABLE' | 'SERVICE' | 'CONSUMABLE'
  uomCode?: string
  vatAliquot?: 'GENERAL_16' | 'REDUCED_8' | 'LUXURY_31' | 'EXEMPT_0'
  withholdingIslr?: string
  targetMargin?: string
  notes?: string
  imageUrl?: string
  canBeSold?: boolean
  canBePurchased?: boolean
  weight?: string
  volume?: string
  deliveryPolicy?: 'ORDERED' | 'DELIVERED' | 'DEFAULT'
  invoicingPolicy?: 'ORDERED_QUANTITIES' | 'DELIVERED_QUANTITIES'
  purchaseControlPolicy?: 'ORDERED_QUANTITIES' | 'RECEIVED_QUANTITIES'
  isLandedCost?: boolean
  defaultSplitMethod?: 'EQUAL' | 'BY_QUANTITY' | 'BY_COST' | 'BY_WEIGHT' | 'BY_VOLUME'
}

/**
 * Serializa los datos del formulario frontend al input de creación atómica esperado por el backend GraphQL.
 */
export const serializeCreateTemplateInput = (
  payload: Omit<ProductTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  resolvedCategoryId: string
): CreateProductTemplateGqlInput => {
  const masterSku = payload.defaultCode.trim().toUpperCase()

  // Serializar variantes
  const variants: CreateTemplateVariantGqlInput[] = (payload.variants || []).map((v, idx) => ({
    sku: v.sku ? v.sku.trim().toUpperCase() : `${masterSku}-${idx + 1}`,
    barcode: v.barcode?.trim() || undefined,
    priceExtra: v.priceExtra ? formatDecimalString(v.priceExtra) : undefined,
    standardCost: v.costPrice ? formatDecimalString(v.costPrice) : formatDecimalString(payload.standardCost),
    attributeValueIds: undefined
  }))

  // Si no se definieron variantes explícitas en el formulario, generar la variante maestra por defecto
  if (variants.length === 0) {
    variants.push({
      sku: masterSku,
      barcode: payload.barcode?.trim() || undefined,
      standardCost: formatDecimalString(payload.standardCost),
      priceExtra: formatDecimalString(0)
    })
  }

  const isService = payload.productType === 'service'

  return {
    name: payload.name.trim(),
    categoryId: resolvedCategoryId,
    basePrice: formatDecimalString(payload.basePrice),
    productType: mapProductTypeToBackend(payload.productType),
    uomCode: payload.uomCode || 'un',
    vatAliquot: mapVatAliquotToBackend(payload.vatRate),
    withholdingIslr: payload.applyISLR ? '2.0000' : undefined,
    targetMargin: payload.targetMargin ? formatDecimalString(payload.targetMargin) : undefined,
    notes: payload.notes?.trim() || undefined,
    imageUrl: payload.imageUrl || undefined,
    canBeSold: payload.canBeSold !== false,
    canBePurchased: payload.canBePurchased !== false,
    weight: payload.weight ? formatDecimalString(payload.weight) : undefined,
    volume: payload.volume ? formatDecimalString(payload.volume) : undefined,
    deliveryPolicy: mapDeliveryPolicyToBackend(payload.deliveryPolicy),
    invoicingPolicy: mapInvoicingPolicyToBackend(payload.invoicingPolicy),
    purchaseControlPolicy: mapPurchaseControlPolicyToBackend(payload.purchaseControlPolicy),
    isLandedCost: isService ? Boolean(payload.isLandedCost) : false,
    defaultSplitMethod: isService && payload.isLandedCost ? mapLandedCostSplitMethodToBackend(payload.defaultSplitMethod) : undefined,
    variants
  }
}

/**
 * Serializa los cambios de actualización de una plantilla al input de actualización del backend.
 */
export const serializeUpdateTemplateInput = (
  payload: Partial<ProductTemplate>,
  resolvedCategoryId?: string
): UpdateProductTemplateGqlInput => {
  const input: UpdateProductTemplateGqlInput = {}

  if (payload.name) input.name = payload.name.trim()
  if (resolvedCategoryId) input.categoryId = resolvedCategoryId
  if (payload.basePrice !== undefined) input.basePrice = formatDecimalString(payload.basePrice)
  if (payload.productType) input.productType = mapProductTypeToBackend(payload.productType)
  if (payload.uomCode) input.uomCode = payload.uomCode
  if (payload.vatRate !== undefined) input.vatAliquot = mapVatAliquotToBackend(payload.vatRate)
  if (payload.applyISLR !== undefined) input.withholdingIslr = payload.applyISLR ? '2.0000' : undefined
  if (payload.targetMargin !== undefined) input.targetMargin = formatDecimalString(payload.targetMargin)
  if (payload.notes !== undefined) input.notes = payload.notes.trim() || undefined
  if (payload.imageUrl !== undefined) input.imageUrl = payload.imageUrl || undefined
  if (payload.canBeSold !== undefined) input.canBeSold = payload.canBeSold
  if (payload.canBePurchased !== undefined) input.canBePurchased = payload.canBePurchased
  if (payload.weight !== undefined) input.weight = payload.weight ? formatDecimalString(payload.weight) : undefined
  if (payload.volume !== undefined) input.volume = payload.volume ? formatDecimalString(payload.volume) : undefined
  if (payload.deliveryPolicy !== undefined) input.deliveryPolicy = mapDeliveryPolicyToBackend(payload.deliveryPolicy)
  if (payload.invoicingPolicy !== undefined) input.invoicingPolicy = mapInvoicingPolicyToBackend(payload.invoicingPolicy)
  if (payload.purchaseControlPolicy !== undefined) input.purchaseControlPolicy = mapPurchaseControlPolicyToBackend(payload.purchaseControlPolicy)
  if (payload.isLandedCost !== undefined) input.isLandedCost = payload.isLandedCost
  if (payload.defaultSplitMethod !== undefined) input.defaultSplitMethod = mapLandedCostSplitMethodToBackend(payload.defaultSplitMethod)

  return input
}

export const mapGqlTemplateToFrontend = (gql: GqlProductTemplate): ProductTemplate => {
  // Mapeo de Tipo de Producto
  let productType: ProductType = 'storable'

  if (gql.productType === 'CONSUMABLE') productType = 'consumable'
  if (gql.productType === 'SERVICE') productType = 'service'

  // Mapeo de Alícuota SENIAT
  let vatRate: SENIAT_VATRate | undefined

  if (gql.vatAliquot === 'GENERAL_16') vatRate = '16'
  else if (gql.vatAliquot === 'REDUCED_8') vatRate = '8'
  else if (gql.vatAliquot === 'EXEMPT_0') vatRate = 'EXEMPT'

  // Mapeo de Variantes
  const variants: ProductVariant[] = (gql.variants || []).map(v => mapGqlVariantToFrontend(v, gql.id))

  // Mapeo de Atributos EAV
  const attributes: ProductAttribute[] = (gql.attributes || []).map(attrRel => ({
    id: attrRel.attribute.id,
    name: attrRel.attribute.name,
    values: (attrRel.attribute.values || []).map(val => ({
      id: val.id,
      name: val.name
    }))
  }))

  const basePrice = typeof gql.basePrice === 'string' ? parseFloat(gql.basePrice) : Number(gql.basePrice || 0)
  const standardCost = variants.length > 0 ? variants[0].costPrice : 0

  return {
    id: gql.id,
    name: gql.name,
    defaultCode: variants.length > 0 ? variants[0].sku : `PROD-${gql.id.slice(0, 6)}`,
    barcode: variants.length > 0 ? variants[0].barcode : undefined,
    productType,
    uomCode: gql.uomCode || 'un',
    categoryName: gql.category?.name || 'General',
    tags: [gql.category?.name || 'Inventario'],
    canBeSold: gql.canBeSold !== false,
    canBePurchased: gql.canBePurchased !== false,
    basePrice,
    standardCost,
    targetMargin: gql.targetMargin ? parseFloat(String(gql.targetMargin)) : undefined,
    notes: gql.notes || undefined,
    imageUrl: gql.imageUrl || undefined,
    weight: gql.weight ? parseFloat(String(gql.weight)) : undefined,
    volume: gql.volume ? parseFloat(String(gql.volume)) : undefined,
    deliveryPolicy: gql.deliveryPolicy as ProductDeliveryPolicyOption | undefined,
    invoicingPolicy: gql.invoicingPolicy as ProductInvoicingPolicyOption | undefined,
    purchaseControlPolicy: gql.purchaseControlPolicy as ProductPurchaseControlOption | undefined,
    isLandedCost: Boolean(gql.isLandedCost),
    defaultSplitMethod: gql.defaultSplitMethod as LandedCostSplitMethod | undefined,
    vatRate,
    applyISLR: Boolean(gql.withholdingIslr),
    attributes,
    variants,
    createdAt: gql.createdAt || undefined,
    updatedAt: gql.updatedAt || undefined
  }
}

export const mapGqlVariantToFrontend = (gqlVar: GqlProductVariant, templateId: string): ProductVariant => {
  const priceExtra =
    typeof gqlVar.priceExtra === 'string' ? parseFloat(gqlVar.priceExtra) : Number(gqlVar.priceExtra || 0)

  const costPrice =
    typeof gqlVar.standardCost === 'string' ? parseFloat(gqlVar.standardCost) : Number(gqlVar.standardCost || 0)

  // Calcular stocks a partir de quants
  let physicalStock = 0
  let reservedStock = 0

  if (gqlVar.quants && gqlVar.quants.length > 0) {
    gqlVar.quants.forEach(q => {
      physicalStock += typeof q.quantity === 'string' ? parseFloat(q.quantity) : Number(q.quantity || 0)
      reservedStock +=
        typeof q.reservedQuantity === 'string' ? parseFloat(q.reservedQuantity) : Number(q.reservedQuantity || 0)
    })
  } else {
    physicalStock = 0
    reservedStock = 0
  }

  const combinationValues = (gqlVar.values || []).map(valRel => ({
    attributeName: valRel.attributeValue?.attribute?.name || 'Atributo',
    valueName: valRel.attributeValue?.name || 'Valor'
  }))

  return {
    id: gqlVar.id,
    templateId,
    sku: gqlVar.sku,
    barcode: gqlVar.barcode || undefined,
    combinationValues,
    costPrice,
    priceExtra,
    physicalStock,
    reservedStock,
    availableStock: Math.max(0, physicalStock - reservedStock)
  }
}

/**
 * Genera una clave de idempotencia UUIDv4 válida requerida por confirmStockMove.
 */
export const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8

    return v.toString(16)
  })
}

/**
 * Mapea el tipo de operación operativa al enum MoveType de backend.
 */
export const mapOperationTypeToMoveType = (
  tipo: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | string
): 'INCOMING' | 'OUTGOING' | 'INTERNAL_TRANSFER' => {
  if (tipo === 'RECEIPT') return 'INCOMING'
  if (tipo === 'DELIVERY') return 'OUTGOING'

  return 'INTERNAL_TRANSFER'
}

export interface CreateStockMoveGqlInput {
  variantId: string
  locationSrcId: string
  locationDstId: string
  quantity: string
  moveType: 'INCOMING' | 'OUTGOING' | 'INTERNAL_TRANSFER'
  referenceDoc?: string
}

export interface ConfirmStockMoveGqlInput {
  idempotencyKey: string
  unitCostUsd: string
  unitCostVes: string
  bcvRate: string
}

export const serializeCreateStockMoveInput = (params: {
  variantId: string
  locationSrcId: string
  locationDstId: string
  quantity: number | string
  moveType: 'INCOMING' | 'OUTGOING' | 'INTERNAL_TRANSFER'
  referenceDoc?: string
}): CreateStockMoveGqlInput => {
  return {
    variantId: params.variantId,
    locationSrcId: params.locationSrcId,
    locationDstId: params.locationDstId,
    quantity: formatDecimalString(params.quantity),
    moveType: params.moveType,
    referenceDoc: params.referenceDoc ? params.referenceDoc.trim() : undefined
  }
}

export const serializeConfirmStockMoveInput = (params: {
  idempotencyKey?: string
  unitCostUsd: number | string
  bcvRate: number | string
}): ConfirmStockMoveGqlInput => {
  const bcv = typeof params.bcvRate === 'number' ? params.bcvRate : parseFloat(params.bcvRate) || 1
  const costUsd = typeof params.unitCostUsd === 'number' ? params.unitCostUsd : parseFloat(params.unitCostUsd) || 0
  const costVes = costUsd * bcv

  return {
    idempotencyKey: params.idempotencyKey || generateIdempotencyKey(),
    unitCostUsd: formatDecimalString(costUsd),
    unitCostVes: formatDecimalString(costVes),
    bcvRate: formatDecimalString(bcv)
  }
}

export const serializeAdjustmentInput = (params: {
  locationId: string
  reason: 'PHYSICAL_COUNT' | 'LOSS' | 'DAMAGE' | 'SCRAP' | 'INITIAL_LOAD' | 'CORRECTION'
  auditType?: string
  lines: Array<{
    variantId: string
    theoreticalQuantity: number | string
    countedQuantity: number | string
    difference: number | string
  }>
  idempotencyKey?: string
}) => {
  return {
    locationId: params.locationId,
    reason: params.reason,
    auditType: params.auditType || 'CONTEO_FISICO',
    idempotencyKey: params.idempotencyKey || generateIdempotencyKey(),
    lines: params.lines.map(l => ({
      variantId: l.variantId,
      theoreticalQuantity: formatDecimalString(l.theoreticalQuantity),
      countedQuantity: formatDecimalString(l.countedQuantity),
      difference: formatDecimalString(l.difference)
    }))
  }
}

export const serializeLandedCostInput = (params: {
  date: string
  reference?: string
  notes?: string
  receipts: Array<{
    receiptType: 'PURCHASE_RECEPTION' | 'WAREHOUSE_OPERATION'
    receiptId: string
  }>
  costs: Array<{
    description: string
    splitMethod: 'EQUAL' | 'BY_QUANTITY' | 'BY_COST' | 'BY_WEIGHT' | 'BY_VOLUME'
    amountUsd: number | string
  }>
  idempotencyKey?: string
}) => {
  return {
    date: new Date(params.date).toISOString(),
    reference: params.reference?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
    idempotencyKey: params.idempotencyKey || generateIdempotencyKey(),
    receipts: params.receipts.map(r => ({
      receiptType: r.receiptType,
      receiptId: r.receiptId
    })),
    costs: params.costs.map(c => ({
      description: c.description.trim(),
      splitMethod: c.splitMethod,
      amountUsd: formatDecimalString(c.amountUsd)
    }))
  }
}


