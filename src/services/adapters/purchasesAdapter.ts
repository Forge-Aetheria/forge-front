// Adaptador bidireccional entre el esquema GraphQL de Compras (forge-backend / BE-PUR-01) y la UI de forge-front

import type {
  PurchaseQuote,
  PurchaseQuoteLine,
  PurchaseStatus,
  PaymentConditionType,
  CurrencyCode,
  BcvRate,
  SupplierLookup,
  CreatePurchaseQuotePayload
} from '@/types/purchasesTypes'

export const formatDecimalString = (val?: number | string | null, defaultValue = '0.0000'): string => {
  if (val === undefined || val === null || val === '') return defaultValue

  const num = typeof val === 'number' ? val : parseFloat(val)

  if (isNaN(num) || num < 0) return defaultValue

  return num.toFixed(4)
}

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

export const mapVatRateToBackend = (
  rate?: string
): 'GENERAL_16' | 'REDUCED_8' | 'LUXURY_31' | 'EXEMPT_0' => {
  if (rate === '16') return 'GENERAL_16'
  if (rate === '8') return 'REDUCED_8'
  if (rate === '31') return 'LUXURY_31'

  return 'EXEMPT_0'
}

export const mapVatRateToFrontend = (rate?: string | null): '16' | '8' | '0' | 'EXEMPT' => {
  if (rate === 'GENERAL_16') return '16'
  if (rate === 'REDUCED_8') return '8'
  if (rate === 'LUXURY_31') return '16'

  return 'EXEMPT'
}

export interface GqlPurchaseQuote {
  id: string
  code: string
  status: PurchaseStatus
  supplierId: string
  supplierReference?: string | null
  paymentCondition: string
  creditDays: number
  baseCurrency: string
  exchangeRate?: string | number | null
  validUntil: string
  estimatedDelivery: string
  appliesVat: boolean
  appliesIgtf: boolean
  notes?: string | null
  subtotal: string | number
  vatCredit: string | number
  igtfAmount: string | number
  totalUsd: string | number
  rate?: {
    rateId: string
    rate: string | number
    valueDate: string
    source: string
    capturedAt: string
  } | null
  lines?: Array<{
    id: string
    productId: string
    name?: string | null
    sku?: string | null
    uom?: string | null
    quantity: string | number
    unitCost: string | number
    discountPercent: string | number
    netSubtotal?: string | number | null
    vatRate?: string | null
    vatAmount?: string | number | null
    lineTotal?: string | number | null
  }> | null
  createdAt: string
  updatedAt: string
}

export const serializeCreatePurchaseQuoteInput = (
  payload: CreatePurchaseQuotePayload,
  idempotencyKey?: string
) => {
  const isCredit = payload.condicion_pago === 'CREDITO'
  const finalCreditDays = isCredit ? Number(payload.dias_credito || 0) : 0

  const lines = payload.items.map(item => ({
    productId: item.producto_id,
    name: undefined,
    uom: 'un',
    quantity: formatDecimalString(item.cantidad),
    unitCost: formatDecimalString(item.costo_unitario),
    discountPercent: formatDecimalString(item.descuento_proveedor_porcentaje || 0),
    vatRate: mapVatRateToBackend(item.alicuota_iva)
  }))

  return {
    supplierId: payload.proveedor_id,
    supplierReference: payload.referencia_proveedor?.trim() || undefined,
    paymentCondition: isCredit ? 'CREDIT' : 'CASH',
    creditDays: finalCreditDays,
    baseCurrency: payload.moneda_base || 'USD',
    validUntil: new Date(payload.fecha_vencimiento_cotizacion).toISOString(),
    estimatedDelivery: new Date(payload.fecha_estimada_entrega).toISOString(),
    appliesVat: payload.aplica_iva_compras !== false,
    appliesIgtf: Boolean(payload.aplica_igtf),
    notes: payload.observaciones?.trim() || undefined,
    negotiationTerms: payload.terminos_negociacion?.trim() || undefined,
    registerImmediately: Boolean(payload.registrar_cotizacion_inmediatamente),
    idempotencyKey: idempotencyKey || generateIdempotencyKey(),
    lines
  }
}

export const serializeReceptionInput = (params: {
  orderId: string
  warehouseId: string
  lines: Array<{ orderLineId: string; quantityReceived: number | string }>
  idempotencyKey?: string
}) => {
  return {
    orderId: params.orderId,
    warehouseId: params.warehouseId,
    idempotencyKey: params.idempotencyKey || generateIdempotencyKey(),
    lines: params.lines.map(l => ({
      orderLineId: l.orderLineId,
      quantityReceived: formatDecimalString(l.quantityReceived)
    }))
  }
}

export const mapGqlPurchaseQuoteToFrontend = (
  gql: GqlPurchaseQuote,
  fallbackRate: number,
  supplier?: SupplierLookup
): PurchaseQuote => {
  const rateVal = gql.exchangeRate ? Number(gql.exchangeRate) : fallbackRate

  const tasaBcv: BcvRate = {
    id: gql.rate?.rateId || 'bcv-active',
    tasa: rateVal,
    fecha_valor: gql.rate?.valueDate || new Date().toISOString().slice(0, 10),
    fuente: 'BCV_OFICIAL',
    sincronizado_at: gql.rate?.capturedAt || new Date().toISOString()
  }

  const condicionPago: PaymentConditionType =
    gql.paymentCondition === 'CREDIT' ? 'CREDITO' : 'CONTADO'

  const proveedor: SupplierLookup = supplier ?? {
    id: gql.supplierId,
    identificacion: 'J-00000000-0',
    razon_social: 'Proveedor General',
    rol_proveedor_activo: true,
    email: '',
    telefono: '',
    direccion_fiscal: 'Venezuela',
    condicion_pago_default: condicionPago,
    dias_credito_default: gql.creditDays,
    moneda_negociacion_default: (gql.baseCurrency as CurrencyCode) || 'USD'
  }

  const items: PurchaseQuoteLine[] = (gql.lines || []).map((l, idx) => {
    const qty = typeof l.quantity === 'string' ? parseFloat(l.quantity) : Number(l.quantity || 0)
    const cost = typeof l.unitCost === 'string' ? parseFloat(l.unitCost) : Number(l.unitCost || 0)
    const disc = typeof l.discountPercent === 'string' ? parseFloat(l.discountPercent) : Number(l.discountPercent || 0)
    const net = typeof l.netSubtotal === 'string' ? parseFloat(l.netSubtotal) : qty * cost * (1 - disc / 100)
    const vat = typeof l.vatAmount === 'string' ? parseFloat(l.vatAmount) : 0
    const total = typeof l.lineTotal === 'string' ? parseFloat(l.lineTotal) : net + vat

    return {
      id: l.id || `line-${idx + 1}`,
      producto_id: l.productId,
      producto_sku: l.sku || l.name || `VAR-${idx + 1}`,
      producto_nombre: l.name || 'Artículo',
      uom_code: l.uom || 'un',
      is_physical_stock: true,
      cantidad: qty,
      costo_unitario: cost,
      descuento_proveedor_porcentaje: disc,
      monto_descuento: Number((qty * cost * (disc / 100)).toFixed(4)),
      subtotal_neto: Number(net.toFixed(4)),
      alicuota_iva: mapVatRateToFrontend(l.vatRate),
      monto_credito_fiscal_iva: Number(vat.toFixed(4)),
      total_linea: Number(total.toFixed(4))
    }
  })

  const subtotalUsd = typeof gql.subtotal === 'string' ? parseFloat(gql.subtotal) : Number(gql.subtotal || 0)
  const vatUsd = typeof gql.vatCredit === 'string' ? parseFloat(gql.vatCredit) : Number(gql.vatCredit || 0)
  const igtfUsd = typeof gql.igtfAmount === 'string' ? parseFloat(gql.igtfAmount) : Number(gql.igtfAmount || 0)
  const totalUsd = typeof gql.totalUsd === 'string' ? parseFloat(gql.totalUsd) : Number(gql.totalUsd || 0)

  return {
    id: gql.id,
    correlativo: gql.code || 'BORRADOR',
    correlativo_orden_compra: gql.status === 'PURCHASE_ORDER' ? gql.code : undefined,
    referencia_proveedor: gql.supplierReference || undefined,
    proveedor,
    estado: gql.status,
    condicion_pago: condicionPago,
    dias_credito: gql.creditDays,
    moneda_base: (gql.baseCurrency as CurrencyCode) || 'USD',
    tasa_bcv: tasaBcv,
    fecha_registro: gql.createdAt ? gql.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    fecha_vencimiento_cotizacion: gql.validUntil ? gql.validUntil.slice(0, 10) : new Date().toISOString().slice(0, 10),
    fecha_estimada_entrega: gql.estimatedDelivery ? gql.estimatedDelivery.slice(0, 10) : new Date().toISOString().slice(0, 10),
    aplica_iva_compras: gql.appliesVat,
    aplica_igtf: gql.appliesIgtf,
    items,
    subtotal_usd: Number(subtotalUsd.toFixed(2)),
    descuento_total_usd: 0,
    base_imponible_usd: Number(subtotalUsd.toFixed(2)),
    monto_exento_usd: 0,
    credito_fiscal_iva_usd: Number(vatUsd.toFixed(2)),
    igtf_usd: Number(igtfUsd.toFixed(2)),
    total_usd: Number(totalUsd.toFixed(2)),
    subtotal_ves: Number((subtotalUsd * rateVal).toFixed(2)),
    descuento_total_ves: 0,
    base_imponible_ves: Number((subtotalUsd * rateVal).toFixed(2)),
    monto_exento_ves: 0,
    credito_fiscal_iva_ves: Number((vatUsd * rateVal).toFixed(2)),
    igtf_ves: Number((igtfUsd * rateVal).toFixed(2)),
    total_ves: Number((totalUsd * rateVal).toFixed(2)),
    observaciones: gql.notes || undefined,
    created_at: gql.createdAt,
    updated_at: gql.updatedAt
  }
}
