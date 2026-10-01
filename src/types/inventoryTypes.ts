// Types for Inventory & Product Catalog (Template vs. Variant pattern)

export type ProductType = 'storable' | 'consumable' | 'service'

export type SENIAT_VATRate = '16' | '8' | '0' | 'EXEMPT'

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
  priceExtra: number // Additional cost over template basePrice
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
  uomCode: string // 'un', 'kg', 'L', 'm', 'paquete'
  categoryName: string
  tags: string[]
  canBeSold: boolean
  canBePurchased: boolean
  basePrice: number
  standardCost: number
  imageUrl?: string
  minStock?: number

  // Fiscal Localization (SENIAT) - Optional / Feature flagged
  vatRate?: SENIAT_VATRate
  applyISLR?: boolean

  // Variants
  attributes: ProductAttribute[]
  variants: ProductVariant[]
}

export interface InventoryKPIs {
  totalItems: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
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
