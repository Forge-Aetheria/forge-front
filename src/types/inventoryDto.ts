// DTOs para el módulo de Inventario GraphQL (Paridad con forge-backend)

export interface GqlProductCategory {
  id: string
  name: string
  completeName: string
}

export interface GqlAttributeValue {
  id: string
  name: string
  htmlColor?: string | null
  attribute?: {
    name: string
  }
}

export interface GqlVariantValue {
  attributeValue: GqlAttributeValue
}

export interface GqlStockQuant {
  id: string
  quantity: string | number
  reservedQuantity: string | number
}

export interface GqlProductVariant {
  id: string
  sku: string
  barcode?: string | null
  priceExtra: string | number
  standardCost: string | number
  isActive: boolean
  values: GqlVariantValue[]
  quants?: GqlStockQuant[]
}

export interface GqlProductAttribute {
  id: string
  attribute: {
    id: string
    name: string
    displayType: string
    values?: Array<{
      id: string
      name: string
      htmlColor?: string | null
    }>
  }
}

export interface GqlProductTemplate {
  id: string
  name: string
  uomCode: string
  productType: 'STORABLE' | 'CONSUMABLE' | 'SERVICE'
  basePrice: string | number
  vatAliquot?: 'GENERAL_16' | 'REDUCED_8' | 'EXEMPT_0' | 'ADDITIONAL_31' | null
  withholdingIslr?: string | null
  category: GqlProductCategory
  attributes: GqlProductAttribute[]
  variants: GqlProductVariant[]
}

export interface GqlStockValuationLayer {
  id: string
  bcvRate: string | number
  unitCostUsd: string | number
  unitCostVes: string | number
  quantity: string | number
}

export interface GqlStockMove {
  id: string
  moveType: 'INCOMING' | 'OUTGOING' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT'
  state: 'DRAFT' | 'DONE' | 'CANCELLED'
  quantity: string | number
  referenceDoc?: string | null
  createdAt: string
  locationSrc: {
    id: string
    completePath: string
  }
  locationDst: {
    id: string
    completePath: string
  }
  valuations: GqlStockValuationLayer[]
}

export interface GqlPageInfo {
  totalCount: number
  page: number
  perPage: number
  hasNextPage: boolean
}

export interface GqlKardexPage {
  nodes: GqlStockMove[]
  pageInfo: GqlPageInfo
}
