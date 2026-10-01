// Data models for Point of Sale (POS) Multi-Tenant & Dual-Currency Module

export type PaymentMethodType =
  | 'cash_usd'
  | 'cash_ves'
  | 'pos_debit'
  | 'pos_credit'
  | 'pago_movil'
  | 'zelle'
  | 'store_credit'

export type ChangeResolutionType = 'cash_ves' | 'pago_movil' | 'store_credit'

export interface POSCustomer {
  id: string
  name: string
  identification: string // RIF / CI (e.g. "V-18234567" or "J-40123456-0")
  email?: string
  phone?: string
  address?: string
}

export interface POSCartItem {
  id: string
  templateId: string
  variantId: string
  name: string
  variantLabel?: string // e.g. "Talla: L · Color: Azul"
  sku: string
  barcode?: string
  uom: string
  quantity: number
  unitPriceUSD: number
  costPriceUSD: number
  vatRate?: string // '16', '8', 'EXEMPT'
  totalUSD: number
  totalVES: number
}

export interface POSPaymentRecord {
  id: string
  method: PaymentMethodType
  methodName: string
  amountUSD: number
  amountVES: number
  exchangeRate: number
  causesIGTF: boolean
  igtfAmountUSD: number
  igtfAmountVES: number
  reference?: string
}

export interface ParkedOrder {
  id: string
  code: string // e.g. "ORD-001"
  customer: POSCustomer
  items: POSCartItem[]
  fiscalMode: boolean
  createdAt: string
  totalUSD: number
  totalVES: number
}

export interface POSTransactionSummary {
  subtotalUSD: number
  subtotalVES: number
  taxUSD: number
  taxVES: number
  igtfUSD: number
  igtfVES: number
  totalUSD: number
  totalVES: number
  totalPaidUSD: number
  totalPaidVES: number
  remainingUSD: number
  remainingVES: number
  changeUSD: number
  changeVES: number
}

export interface POSShift {
  id: string
  cashierName: string
  terminalName: string
  status: 'OPEN' | 'CLOSED'
  openingDate: string
  closingDate?: string
  exchangeRateBCV: number
  initialCashUSD: number
  initialCashVES: number
  totalSalesUSD: number
  totalSalesVES: number
  totalCashUSD: number
  totalCashVES: number
  declaredCashUSD?: number
  declaredCashVES?: number
  differenceUSD?: number
  differenceVES?: number
  cashOutsUSD: number // Sangrías
  cashOutsVES: number
}

export interface POSPaymentMethodConfig {
  type: PaymentMethodType
  name: string
  icon: string
  currency: 'USD' | 'VES'
  causesIGTF: boolean
}
