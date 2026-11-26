/**
 * In-Memory Reactive Store for E2E / Integration Mocking
 * Simulates PostgreSQL database state for forge-front test sessions.
 */

export interface MockUser {
  id: string
  email: string
  nombre: string
  telefono?: string
  rol: string
  tenantId: string
  tenantName: string
  avatarUrl?: string
}

export interface MockUoM {
  code: string
  name: string
  active: boolean
  isBase?: boolean
}

export interface MockCategory {
  id: string
  name: string
  code?: string
  completeName?: string
  isActive: boolean
  description?: string
  revenueAccount?: { id: string; code: string; name: string }
  expenseAccount?: { id: string; code: string; name: string }
}

export interface MockWarehouse {
  id: string
  name: string
  code: string
  isActive: boolean
  locations: Array<{ id: string; name: string; code: string; isActive: boolean; warehouseId: string }>
}

export interface MockProductVariant {
  id: string
  templateId: string
  sku: string
  name: string
  barcode?: string
  salePrice: number
  costPrice: number
  physicalStock: number
  reservedStock: number
  availableStock: number
  isActive: boolean
}

export interface MockProductTemplate {
  id: string
  name: string
  defaultCode: string
  description?: string
  productType: 'storable' | 'consumable' | 'service'
  uomCode: string
  listPrice: number
  standardCost: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: MockCategory
  variants: MockProductVariant[]
}

export interface MockPartner {
  id: string
  type: 'INDIVIDUAL' | 'COMPANY'
  name: string
  commercialName?: string
  legalName?: string
  identification: string
  email?: string
  phone?: string
  address?: string
  isCustomer: boolean
  isSupplier: boolean
  isActive: boolean
  status: 'ACTIVE' | 'INACTIVE'
  bankAccounts?: any[]
}

export interface MockSalesQuote {
  id: string
  number: number
  code?: string
  partnerId: string
  partnerName?: string
  state: 'DRAFT' | 'APPROVED' | 'CANCELLED' | 'INVOICED'
  subtotalUsd: number
  totalUsd: number
  totalVes: number
  bcvRate: number
  items: any[]
  createdAt: string
}

export interface MockPurchaseQuote {
  id: string
  number: number
  code?: string
  supplierId: string
  supplierName?: string
  state: 'DRAFT' | 'REGISTERED' | 'APPROVED' | 'CANCELLED'
  subtotalUsd: number
  totalUsd: number
  totalVes: number
  bcvRate: number
  items: any[]
  createdAt: string
}

export interface MockAccount {
  id: string
  code: string
  name: string
  type: string
  subtype?: string
  currency: string
  balanceUsd: number
  balanceVes: number
  isActive: boolean
}

// Initial Seeds
const DEFAULT_UOMS: MockUoM[] = [
  { code: 'UNI', name: 'Unidad', active: true, isBase: true },
  { code: 'KG', name: 'Kilogramo', active: true, isBase: true },
  { code: 'LT', name: 'Litro', active: true, isBase: true },
  { code: 'MTR', name: 'Metro', active: true, isBase: true },
  { code: 'CAJ', name: 'Caja', active: true, isBase: false }
]

const DEFAULT_CATEGORIES: MockCategory[] = [
  { id: 'cat-01', name: 'General', code: 'GEN', completeName: 'General', isActive: true },
  { id: 'cat-02', name: 'Materia Prima', code: 'MP', completeName: 'Materia Prima', isActive: true },
  { id: 'cat-03', name: 'Producto Terminado', code: 'PT', completeName: 'Producto Terminado', isActive: true }
]

const DEFAULT_WAREHOUSES: MockWarehouse[] = [
  {
    id: 'wh-main',
    name: 'Almacén Central',
    code: 'WH-CENTRAL',
    isActive: true,
    locations: [
      { id: 'loc-general', name: 'Stock General', code: 'GEN', isActive: true, warehouseId: 'wh-main' },
      { id: 'loc-dispatch', name: 'Despacho', code: 'DSP', isActive: true, warehouseId: 'wh-main' }
    ]
  }
]

const DEFAULT_USER: MockUser = {
  id: 'usr-admin-test',
  email: 'admin@forge.test',
  nombre: 'Admin Tester',
  telefono: '+58 412 1234567',
  rol: 'ADMIN',
  tenantId: 'ten-e2e-test',
  tenantName: 'Empresa Test E2E C.A.'
}

const DEFAULT_PARTNERS: MockPartner[] = [
  {
    id: 'part-01',
    type: 'COMPANY',
    name: 'Distribuidora Mayorista Test C.A.',
    commercialName: 'Mayorista Test',
    identification: 'J-12345678-0',
    email: 'contacto@mayoristatest.com',
    phone: '+58 212 9999999',
    isCustomer: false,
    isSupplier: true,
    isActive: true,
    status: 'ACTIVE'
  },
  {
    id: 'part-02',
    type: 'COMPANY',
    name: 'Comercializadora Alimentos C.A.',
    commercialName: 'Alimentos Test',
    identification: 'J-98765432-1',
    email: 'ventas@alimentostest.com',
    phone: '+58 212 8888888',
    isCustomer: true,
    isSupplier: false,
    isActive: true,
    status: 'ACTIVE'
  }
]

const DEFAULT_PRODUCTS: MockProductTemplate[] = [
  {
    id: 'prod-001',
    name: 'Café Molido Premium 500g',
    defaultCode: 'CAF-500',
    description: 'Café gourmet tueste medio',
    productType: 'storable',
    uomCode: 'UNI',
    listPrice: 5.5,
    standardCost: 3.2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORIES[2],
    variants: [
      {
        id: 'var-001-1',
        templateId: 'prod-001',
        sku: 'CAF-500',
        name: 'Café Molido Premium 500g - Estándar',
        salePrice: 5.5,
        costPrice: 3.2,
        physicalStock: 100,
        reservedStock: 10,
        availableStock: 90,
        isActive: true
      }
    ]
  }
]

class TestStore {
  public currentUser: MockUser = { ...DEFAULT_USER }
  public tenantSettings: Record<string, string> = {
    bcv_rate: '54.50',
    fiscal_mode: 'true',
    currency_base: 'USD'
  }
  public unitsOfMeasure: MockUoM[] = JSON.parse(JSON.stringify(DEFAULT_UOMS))
  public categories: MockCategory[] = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
  public warehouses: MockWarehouse[] = JSON.parse(JSON.stringify(DEFAULT_WAREHOUSES))
  public products: MockProductTemplate[] = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS))
  public partners: MockPartner[] = JSON.parse(JSON.stringify(DEFAULT_PARTNERS))
  public companyBankAccounts: any[] = []
  public salesQuotes: MockSalesQuote[] = []
  public purchaseQuotes: MockPurchaseQuote[] = []
  public purchaseOrders: any[] = []
  public warehouseOperations: any[] = []
  public accounts: MockAccount[] = [
    { id: 'acc-1', code: '1.1.01', name: 'Caja y Bancos', type: 'ASSET_CURRENT', currency: 'USD', balanceUsd: 5000, balanceVes: 272500, isActive: true },
    { id: 'acc-2', code: '1.1.02', name: 'Cuentas por Cobrar', type: 'ASSET_CURRENT', currency: 'USD', balanceUsd: 1200, balanceVes: 65400, isActive: true },
    { id: 'acc-3', code: '2.1.01', name: 'Cuentas por Pagar', type: 'LIABILITY_CURRENT', currency: 'USD', balanceUsd: 800, balanceVes: 43600, isActive: true },
    { id: 'acc-4', code: '4.1.01', name: 'Ingresos por Ventas', type: 'REVENUE', currency: 'USD', balanceUsd: 15000, balanceVes: 817500, isActive: true },
    { id: 'acc-5', code: '5.1.01', name: 'Costo de Ventas', type: 'EXPENSE', currency: 'USD', balanceUsd: 8500, balanceVes: 463250, isActive: true }
  ]
  public journalEntries: any[] = []
  public posShifts: any[] = []

  public reset(): void {
    this.currentUser = { ...DEFAULT_USER }
    this.tenantSettings = {
      bcv_rate: '54.50',
      fiscal_mode: 'true',
      currency_base: 'USD'
    }
    this.unitsOfMeasure = JSON.parse(JSON.stringify(DEFAULT_UOMS))
    this.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    this.warehouses = JSON.parse(JSON.stringify(DEFAULT_WAREHOUSES))
    this.products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS))
    this.partners = JSON.parse(JSON.stringify(DEFAULT_PARTNERS))
    this.companyBankAccounts = []
    this.salesQuotes = []
    this.purchaseQuotes = []
    this.purchaseOrders = []
    this.warehouseOperations = []
    this.journalEntries = []
    this.posShifts = []
  }
}

export const testStore = new TestStore()
export const resetTestStore = (): void => testStore.reset()
