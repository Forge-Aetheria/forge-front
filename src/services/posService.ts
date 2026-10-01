import { defaultBCVRate, mockCurrentShift } from '@/data/pos/mockPosData'
import type {
  POSCartItem,
  POSPaymentRecord,
  POSTransactionSummary,
  ParkedOrder,
  POSShift
} from '@/types/posTypes'

const BCV_STORAGE_KEY = 'forge_pos_bcv_rate'
const FISCAL_MODE_STORAGE_KEY = 'forge_pos_fiscal_mode'
const PARKED_ORDERS_STORAGE_KEY = 'forge_pos_parked_orders'
const SHIFT_STORAGE_KEY = 'forge_pos_active_shift'

export const getBCVRate = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(BCV_STORAGE_KEY)

    if (saved) return parseFloat(saved)
  }

  return defaultBCVRate
}

export const setBCVRate = (rate: number): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BCV_STORAGE_KEY, rate.toString())
  }
}

export const getFiscalMode = (): boolean => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(FISCAL_MODE_STORAGE_KEY)

    if (saved !== null) return saved === 'true'
  }

  return true // Default to Fiscal ON
}

export const setFiscalMode = (fiscal: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FISCAL_MODE_STORAGE_KEY, fiscal ? 'true' : 'false')
  }
}

export const calculateCartTotals = (
  items: POSCartItem[],
  fiscalMode: boolean,
  rate: number
) => {
  let subtotalUSD = 0
  let taxUSD = 0

  items.forEach(item => {
    const lineTotal = item.unitPriceUSD * item.quantity

    subtotalUSD += lineTotal

    if (fiscalMode && item.vatRate && item.vatRate !== 'EXEMPT') {
      const vatPercent = parseFloat(item.vatRate) / 100

      taxUSD += lineTotal * vatPercent
    }
  })

  const totalUSD = subtotalUSD + taxUSD
  const subtotalVES = subtotalUSD * rate
  const taxVES = taxUSD * rate
  const totalVES = totalUSD * rate

  return {
    subtotalUSD,
    subtotalVES,
    taxUSD,
    taxVES,
    totalUSD,
    totalVES
  }
}

export const calculateTransaction = (
  baseTotalUSD: number,
  payments: POSPaymentRecord[],
  rate: number,
  fiscalMode: boolean
): POSTransactionSummary => {
  // Calculate dynamic IGTF (3% only on USD/foreign payments, if in fiscal mode)
  let igtfUSD = 0

  if (fiscalMode) {
    payments.forEach(p => {
      if (p.causesIGTF) {
        igtfUSD += p.amountUSD * 0.03
      }
    })
  }

  const igtfVES = igtfUSD * rate
  const grandTotalUSD = baseTotalUSD + igtfUSD
  const grandTotalVES = grandTotalUSD * rate

  const totalPaidUSD = payments.reduce((acc, p) => acc + p.amountUSD, 0)
  const totalPaidVES = totalPaidUSD * rate

  const remainingUSD = Math.max(0, grandTotalUSD - totalPaidUSD)
  const remainingVES = remainingUSD * rate

  const changeUSD = Math.max(0, totalPaidUSD - grandTotalUSD)
  const changeVES = changeUSD * rate

  return {
    subtotalUSD: baseTotalUSD,
    subtotalVES: baseTotalUSD * rate,
    taxUSD: 0,
    taxVES: 0,
    igtfUSD,
    igtfVES,
    totalUSD: grandTotalUSD,
    totalVES: grandTotalVES,
    totalPaidUSD,
    totalPaidVES,
    remainingUSD,
    remainingVES,
    changeUSD,
    changeVES
  }
}

export const getParkedOrders = (): ParkedOrder[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(PARKED_ORDERS_STORAGE_KEY)

    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
  }

  return []
}

export const saveParkedOrder = (order: ParkedOrder): ParkedOrder[] => {
  const current = getParkedOrders()
  const updated = [order, ...current]

  if (typeof window !== 'undefined') {
    localStorage.setItem(PARKED_ORDERS_STORAGE_KEY, JSON.stringify(updated))
  }

  return updated
}

export const removeParkedOrder = (orderId: string): ParkedOrder[] => {
  const current = getParkedOrders()
  const updated = current.filter(o => o.id !== orderId)

  if (typeof window !== 'undefined') {
    localStorage.setItem(PARKED_ORDERS_STORAGE_KEY, JSON.stringify(updated))
  }

  return updated
}

export const getActiveShift = (): POSShift => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(SHIFT_STORAGE_KEY)

    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return mockCurrentShift
      }
    }
  }

  return mockCurrentShift
}

export const saveActiveShift = (shift: POSShift): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(shift))
  }
}
