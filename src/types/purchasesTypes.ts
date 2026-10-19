export type CurrencyCode = 'USD' | 'VES'

export type PurchaseStatus =
  | 'DRAFT' // Borrador inicial interno
  | 'RFQ_SENT' // Solicitud/Cotización de proveedor registrada (SC-2026-XXXX)
  | 'APPROVED' // Presupuesto de compra aprobado con costos congelados
  | 'PURCHASE_ORDER' // Confirmada como Orden de Compra en firme (OC-2026-XXXX)
  | 'CANCELED' // Anulada mediante Soft Delete con motivo de auditoría

export type PaymentConditionType = 'CONTADO' | 'CREDITO'

export type PurchaseItemNature = 'PHYSICAL_STOCK' | 'SERVICE_EXPENSE' | 'DROPSHIPPING'

export interface BcvRate {
  id: string
  tasa: number // Ej: 36.50
  fecha_valor: string // ISO Date YYYY-MM-DD
  fuente: 'BCV_OFICIAL'
  sincronizado_at: string // ISO Timestamp (CRON 7:00 AM)
}

export interface SupplierLookup {
  id: string
  identificacion: string // RIF o Cédula: ^[VEJG]-\d{8,9}(-\d)?$ (ej. J-30918273-4)
  razon_social: string
  nombre_comercial?: string
  rol_proveedor_activo: boolean // Debe ser true para permitir compras
  email: string
  telefono: string
  direccion_fiscal: string
  condicion_pago_default: PaymentConditionType
  dias_credito_default: number // 0 si es CONTADO, ej. 15, 30, 45 si es CREDITO
  moneda_negociacion_default: CurrencyCode
  retencion_iva_porcentaje?: 75 | 100 | 0 // Informativo SENIAT
  aplica_retencion_islr?: boolean // Informativo SENIAT
}

export interface PurchaseProductLookup {
  id: string
  sku: string
  nombre: string
  descripcion?: string
  uom_code: string // 'un', 'kg', 'L', 'paquete', 'serv'
  naturaleza: PurchaseItemNature
  is_physical_stock: boolean // Equivalente a manages_stock
  manages_stock: boolean
  costo_unitario_ult_compra_usd: number
  stock_fisico_actual: number
  stock_en_transito_actual: number // incoming_stock
  alicuota_iva: '16' | '8' | '0' | 'EXEMPT'
}

export interface PurchaseQuoteLine {
  id: string
  producto_id: string
  producto_sku: string
  producto_nombre: string
  uom_code: string
  is_physical_stock: boolean
  cantidad: number
  costo_unitario: number // En Moneda Base (USD)
  descuento_proveedor_porcentaje: number // 0 a 100%
  monto_descuento: number
  subtotal_neto: number // cantidad * (costo_unitario * (1 - descuento/100))
  alicuota_iva: '16' | '8' | '0' | 'EXEMPT'
  monto_credito_fiscal_iva: number
  total_linea: number
}

export interface PurchaseQuote {
  id: string
  correlativo: string // "BORRADOR" en DRAFT, "SC-2026-XXXX" en RFQ_SENT/APPROVED
  correlativo_orden_compra?: string // "OC-2026-XXXX" cuando estado === 'PURCHASE_ORDER'
  referencia_proveedor?: string // N° de cotización o proforma enviada por el proveedor
  proveedor: SupplierLookup
  estado: PurchaseStatus
  condicion_pago: PaymentConditionType
  dias_credito: number
  moneda_base: CurrencyCode
  tasa_bcv: BcvRate
  fecha_registro: string // ISO Date
  fecha_vencimiento_cotizacion: string // ISO Date (control de vigencia de costos del proveedor)
  fecha_estimada_entrega: string // ISO Date
  aplica_iva_compras: boolean
  aplica_igtf?: boolean
  items: PurchaseQuoteLine[]

  // Totales en Moneda Base (USD)
  subtotal_usd: number
  descuento_total_usd: number
  base_imponible_usd: number
  monto_exento_usd: number
  credito_fiscal_iva_usd: number
  igtf_usd: number
  total_usd: number

  // Totales en Moneda Local (VES)
  subtotal_ves: number
  descuento_total_ves: number
  base_imponible_ves: number
  monto_exento_ves: number
  credito_fiscal_iva_ves: number
  igtf_ves: number
  total_ves: number

  // Indicadores informativos de retención (si SENIAT_FORMAT está activo)
  retencion_iva_estimada_ves?: number

  observaciones?: string
  terminos_negociacion?: string
  motivo_anulacion?: string
  aprobado_por?: string
  aprobado_at?: string
  orden_compra_generada_at?: string
  stock_transito_notificado?: boolean
  created_at: string
  updated_at: string
}

export interface CreatePurchaseQuotePayload {
  proveedor_id: string
  referencia_proveedor?: string
  condicion_pago: PaymentConditionType
  dias_credito: number
  moneda_base: CurrencyCode
  fecha_vencimiento_cotizacion: string
  fecha_estimada_entrega: string
  aplica_iva_compras?: boolean
  aplica_igtf?: boolean
  observaciones?: string
  terminos_negociacion?: string
  items: {
    producto_id: string
    cantidad: number
    costo_unitario: number
    descuento_proveedor_porcentaje: number
    alicuota_iva?: '16' | '8' | '0' | 'EXEMPT'
  }[]
  registrar_cotizacion_inmediatamente?: boolean // false -> DRAFT, true -> RFQ_SENT (SC-2026-XXXX)
}

export interface PurchaseOrderConversionResponse {
  success: boolean
  purchase_order_id: string
  correlativo_orden_compra: string // Ej: "OC-2026-0019"
  quote_id: string
  estado: 'PURCHASE_ORDER'
  lineas_fisicas_en_transito: {
    producto_id: string
    producto_sku: string
    cantidad_en_transito_sumada: number
  }[]
  habilitada_recepcion_almacen: boolean
  habilitada_factura_cxp: boolean
  message: string
  created_at: string
}

export interface PurchasesFilterState {
  search: string
  estado: PurchaseStatus | 'ALL'
  proveedor_id: string
  fecha_desde?: string
  fecha_hasta?: string
}

export interface PurchaseVisibleColumns {
  refProveedor: boolean
  fechaVigencia: boolean
  costoUsd: boolean
  costoVes: boolean
  estado: boolean
}

export interface PurchasesFeatureFlags {
  // Desglose de Crédito Fiscal (IVA Compras 16% / 8% / Exento). Si es false, opera en modo Costo Neto Universal
  IVA_COMPRAS: boolean
  // Cálculo opcional de IGTF (3%) para pagos proyectados en divisas o según negociación con el proveedor
  IGTF: boolean
  // Validación estricta de formato fiscal venezolano (RIF/Cédula ^[VEJG]-\d{8,9}$) e indicadores de Retención IVA/ISLR
  SENIAT_FORMAT: boolean
  // Modo de notificación de inventario en tránsito al confirmar Orden de Compra ('ENABLED' | 'DISABLED')
  STOCK_TRANSIT_MODE: 'ENABLED' | 'DISABLED'
}

export interface PurchaseTotalsCalculation {
  subtotal_usd: number
  descuento_usd: number
  base_imponible_usd: number
  monto_exento_usd: number
  neto_imponible_usd: number
  credito_fiscal_iva_usd: number
  igtf_usd: number
  total_usd: number

  subtotal_ves: number
  descuento_ves: number
  base_imponible_ves: number
  monto_exento_ves: number
  neto_imponible_ves: number
  credito_fiscal_iva_ves: number
  igtf_ves: number
  total_ves: number
  retencion_iva_estimada_ves: number
}
