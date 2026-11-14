import type { POSPaymentMethodConfig } from '@/types/posTypes'

export const posPaymentMethods: POSPaymentMethodConfig[] = [
  { type: 'cash_usd', name: 'Efectivo USD (Divisas)', icon: 'tabler-currency-dollar', currency: 'USD', causesIGTF: true },
  { type: 'cash_ves', name: 'Efectivo Bolívares (Bs.)', icon: 'tabler-cash', currency: 'VES', causesIGTF: false },
  { type: 'pos_debit', name: 'Punto de Venta Débito', icon: 'tabler-credit-card', currency: 'VES', causesIGTF: false },
  { type: 'pos_credit', name: 'Punto de Venta Crédito', icon: 'tabler-credit-card', currency: 'VES', causesIGTF: false },
  { type: 'pago_movil', name: 'Pago Móvil (C2P / P2P)', icon: 'tabler-device-mobile', currency: 'VES', causesIGTF: false },
  { type: 'zelle', name: 'Zelle / Divisas Digitales', icon: 'tabler-brand-cashapp', currency: 'USD', causesIGTF: true },
  { type: 'store_credit', name: 'Vale de Crédito en Tienda', icon: 'tabler-ticket', currency: 'USD', causesIGTF: false }
]
