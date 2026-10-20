// Types for Inventory, Product Catalog, Kardex & Warehouse Operations (Template vs. Variant pattern)

export type ProductType = 'storable' | 'consumable' | 'service'

export type SalesInvoicingPolicy = 'ORDERED' | 'DELIVERED'
export type PurchaseControlPolicy = 'ORDERED' | 'RECEIVED'
export type DeliveryPolicy = 'ALL_AT_ONCE' | 'PARTIAL'

export type ProductInvoicingPolicyOption = 'DEFAULT' | SalesInvoicingPolicy
export type ProductPurchaseControlOption = 'DEFAULT' | PurchaseControlPolicy
export type ProductDeliveryPolicyOption = 'DEFAULT' | DeliveryPolicy

export type SENIAT_VATRate = '16' | '8' | '0' | 'EXEMPT'

export type StockMovementType =
  | 'PURCHASE_RECEIPT'   // Entrada por compra a proveedor
  | 'SALE_DELIVERY'      // Salida por venta / despacho
  | 'ADJUSTMENT_IN'      // Ajuste positivo (sobrante físico)
  | 'ADJUSTMENT_OUT'     // Ajuste negativo (merma / daño / pérdida)
  | 'INITIAL_INVENTORY'  // Carga inicial de inventario
  | 'INTERNAL_TRANSFER'  // Traslado entre almacenes

export type AdjustmentReason =
  | 'CONTEO_FISICO'
  | 'ROTURA_MERMA'
  | 'CADUCIDAD'
  | 'CONSUMO_INTERNO'
  | 'CORRECCION_SISTEMA'

export interface ProductAttributeValue {
  id: string
  name: string // e.g. "Rojo", "Azul", "L", "XL", "5L"
}

export interface ProductAttribute {
  id: string
  name: string // e.g. "Color", "Talla", "Capacidad"
  values: ProductAttributeValue[]
}

export interface ProductVariant {
  id: string
  templateId: string
  sku: string
  barcode?: string
  combinationValues: { attributeName: string; valueName: string }[]
  costPrice: number
  priceExtra: number // Additional price over template basePrice
  physicalStock: number
  reservedStock: number
  availableStock: number // physicalStock - reservedStock
}

export interface ProductTemplate {
  id: string
  name: string
  defaultCode: string // Master SKU
  barcode?: string
  productType: ProductType
  uomCode: string // 'un', 'kg', 'L', 'm', 'paquete', 'hr', 'serv'
  categoryName: string
  tags: string[]
  canBeSold: boolean
  canBePurchased: boolean
  basePrice: number // USD
  standardCost: number // USD
  targetMargin?: number // % margen comercial deseado (ej. 35, 100, 150)
  notes?: string // Nota o información adicional del producto
  imageUrl?: string
  minStock?: number

  // Logística (Informativo)
  weight?: number // Peso en kg
  volume?: number // Volumen en m³

  // Fiscal Localization (SENIAT) - Optional / Feature flagged
  vatRate?: SENIAT_VATRate
  applyISLR?: boolean

  // Commercial Policies (Regla R6: Hierarchy Product Override > System Default)
  invoicingPolicy?: ProductInvoicingPolicyOption
  purchaseControlPolicy?: ProductPurchaseControlOption
  deliveryPolicy?: ProductDeliveryPolicyOption

  // Variants
  attributes: ProductAttribute[]
  variants: ProductVariant[]
  createdAt?: string
  updatedAt?: string
}

export interface InventoryKPIs {
  totalItems: number
  totalStockValue: number
  totalStockValueVes?: number
  lowStockCount: number
  outOfStockCount: number
}

export type WarehouseOperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER'

export type WarehouseOperationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'WAITING'
  | 'READY'
  | 'LATE'
  | 'COMPLETED'
  | 'CANCELLED'

export interface WarehouseOperationLine {
  id: string
  producto_id: string
  producto_nombre: string
  variante_id: string
  variante_sku: string
  uom_code: string
  cantidad_demanda: number
  cantidad_procesada: number
  costo_unitario_usd: number
}

export interface WarehouseOperationOrder {
  id: string
  codigo: string // ej: "IN/2026/0091", "OUT/2026/0042", "INT/2026/0015"
  tipo: WarehouseOperationType
  estado: WarehouseOperationStatus
  tercero_nombre: string // Proveedor, Cliente o "Movimiento Interno"
  documento_origen?: string // ej: "OC-2026-0018", "COT-2026-0042", "REQ-ALM-04"
  almacen_origen_id?: string
  almacen_origen_nombre: string
  ubicacion_origen_nombre?: string
  almacen_destino_id?: string
  almacen_destino_nombre: string
  ubicacion_destino_nombre?: string
  fecha_programada: string
  fecha_efectiva?: string
  total_articulos: number
  responsable: string
  notas?: string
  lineas: WarehouseOperationLine[]
  createdAt?: string
}

export interface WarehouseOperationItem {
  id: string
  codigo: string
  tercero_nombre: string
  fecha_programada: string
  total_articulos: number
  estado: WarehouseOperationStatus
  tipo: WarehouseOperationType
  almacen_origen_nombre?: string
  almacen_destino_nombre?: string
}

export interface WarehouseOperationsDashboard {
  recepciones_pendientes: number
  recepciones_retrasadas: number
  entregas_pendientes: number
  entregas_listas: number
  transferencias_pendientes?: number
  articulos_stock_bajo: number
  articulos_agotados: number
  total_articulos_catalogo: number
  valor_total_inventario_usd: number
  valor_total_inventario_ves: number
  valor_venta_potencial_usd: number
  valor_venta_potencial_ves: number
  tasa_bcv: number
  operaciones_recientes: WarehouseOperationItem[]
}

export interface StockMovement {
  id: string
  fecha: string // ISO String
  producto_id: string
  producto_nombre: string
  variante_id: string
  variante_sku: string
  uom_code: string
  tipo_movimiento: StockMovementType
  documento_referencia: string // ej: "COT-2026-0042", "OC-2026-0018", "AJU-2026-0003"
  cantidad_entrada: number
  cantidad_salida: number
  costo_unitario_usd: number
  saldo_resultante: number
  motivo?: string
  almacen?: string
  usuario_responsable: string
}

export interface StockAdjustmentRecord {
  id: string
  correlativo: string // ej: "AJU-2026-0001"
  fecha: string
  producto_id: string
  producto_nombre: string
  variante_id: string
  variante_sku: string
  uom_code: string
  motivo: AdjustmentReason
  stock_sistema: number
  stock_contado: number
  diferencia: number // stock_contado - stock_sistema
  costo_unitario_usd: number
  impacto_usd: number // diferencia * costo_unitario_usd
  observaciones?: string
  usuario_responsable: string
  estado: 'APPLIED'
}

export interface FiscalConfig {
  enabled: boolean
  authority: 'SENIAT' | 'NONE'
  defaultVATRate: SENIAT_VATRate
}

export interface InventoryFilterState {
  search: string
  productType: 'ALL' | ProductType
  category: string
  stockStatus: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  operation: 'ALL' | 'CAN_SELL' | 'CAN_BUY'
}

export interface KardexFilterState {
  search: string
  movementType: 'ALL' | StockMovementType
  productId: string
  dateFrom?: string
  dateTo?: string
}

export interface ProductCategory {
  id: string
  name: string
  code: string // ej. "TEX", "HER", "QUI"
  description?: string
  isActive: boolean
  createdAt?: string
}

export interface WarehouseLocation {
  id: string
  warehouseId: string
  code: string // ej. "PAS-A-EST-01"
  name: string // ej. "Pasillo A - Estante 1"
  type: 'INTERNAL' | 'TRANSIT' | 'SCRAP'
  notes?: string
  isActive: boolean
}

export interface Warehouse {
  id: string
  code: string // ej. "ALM-CENTRAL"
  name: string // ej. "Almacén Central"
  address?: string
  manager?: string
  isDefault: boolean
  isActive: boolean
  locations: WarehouseLocation[]
  createdAt?: string
}

