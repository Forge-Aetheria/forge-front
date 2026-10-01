import type { POSCustomer, POSPaymentMethodConfig, POSShift } from '@/types/posTypes'

export const defaultBCVRate = 36.5

export const defaultCustomer: POSCustomer = {
  id: 'cust-final',
  name: 'Consumidor Final',
  identification: 'V-00000000',
  email: 'consumidor@final.com'
}

export const mockCustomers: POSCustomer[] = [
  defaultCustomer,
  {
    id: 'cust-001',
    name: 'Constructora del Centro C.A.',
    identification: 'J-30981234-5',
    email: 'compras@constructoradelcentro.com',
    phone: '+58 414 1234567',
    address: 'Av. Bolívar, Torre Financiera, Piso 4, Caracas'
  },
  {
    id: 'cust-002',
    name: 'Carlos Mendoza',
    identification: 'V-15890234',
    email: 'carlos.mendoza@gmail.com',
    phone: '+58 424 9876543'
  },
  {
    id: 'cust-003',
    name: 'Suministros Industriales H&M',
    identification: 'J-40112233-9',
    email: 'contacto@suministroshm.com',
    phone: '+58 212 9998877'
  }
]

export const posPaymentMethods: POSPaymentMethodConfig[] = [
  {
    type: 'cash_usd',
    name: 'Efectivo USD (Divisas)',
    icon: 'tabler-currency-dollar',
    currency: 'USD',
    causesIGTF: true // Ley de Grandes Transacciones Financieras (3%)
  },
  {
    type: 'cash_ves',
    name: 'Efectivo Bolívares (Bs.)',
    icon: 'tabler-cash',
    currency: 'VES',
    causesIGTF: false
  },
  {
    type: 'pos_debit',
    name: 'Punto de Venta Débito',
    icon: 'tabler-credit-card',
    currency: 'VES',
    causesIGTF: false
  },
  {
    type: 'pos_credit',
    name: 'Punto de Venta Crédito',
    icon: 'tabler-credit-card',
    currency: 'VES',
    causesIGTF: false
  },
  {
    type: 'pago_movil',
    name: 'Pago Móvil (C2P / P2P)',
    icon: 'tabler-device-mobile',
    currency: 'VES',
    causesIGTF: false
  },
  {
    type: 'zelle',
    name: 'Zelle / Divisas Digitales',
    icon: 'tabler-brand-cashapp',
    currency: 'USD',
    causesIGTF: true
  },
  {
    type: 'store_credit',
    name: 'Vale de Crédito en Tienda',
    icon: 'tabler-ticket',
    currency: 'USD',
    causesIGTF: false
  }
]

export const mockCurrentShift: POSShift = {
  id: 'shift-001',
  cashierName: 'Francisco Maneiro',
  terminalName: 'Caja Principal #01',
  status: 'OPEN',
  openingDate: new Date().toISOString(),
  exchangeRateBCV: defaultBCVRate,
  initialCashUSD: 50.0,
  initialCashVES: 1500.0,
  totalSalesUSD: 245.8,
  totalSalesVES: 8971.7,
  totalCashUSD: 120.0,
  totalCashVES: 2400.0,
  cashOutsUSD: 0,
  cashOutsVES: 0
}
