import { executeGraphQL } from '@/libs/graphqlClient'
import { fetchActiveBcvRate } from '@/services/bcvService'
import {
  CLOSE_POS_SHIFT_MUTATION,
  GET_ACTIVE_POS_SHIFT_QUERY,
  GET_POS_TERMINALS_QUERY,
  GET_TENANT_SETTING_QUERY,
  OPEN_POS_SHIFT_MUTATION,
  SET_TENANT_SETTING_MUTATION
} from '@/graphql/pos.gql'
import type {
  POSCartItem,
  POSPaymentRecord,
  POSTransactionSummary,
  ParkedOrder,
  POSShift
} from '@/types/posTypes'

const FISCAL_MODE_KEY = 'pos.fiscalMode'

interface BackendPosShift {
  id: string
  terminalId: string
  terminal?: { id: string; name: string; code: string } | null
  openedBy: string
  openedAt: string
  closedBy?: string | null
  closedAt?: string | null
  exchangeRate: string
  initialBalanceUsd: string
  initialBalanceVes: string
  cashSalesUsd: string
  cashSalesVes: string
  electronicSalesUsd: string
  electronicSalesVes: string
  countedCashUsd: string
  countedCashVes: string
  differenceUsd: string
  differenceVes: string
  status: string
}

let parkedOrders: ParkedOrder[] = []

const mapShift = (shift: BackendPosShift): POSShift => ({
  id: shift.id,
  terminalId: shift.terminalId,
  cashierName: shift.openedBy,
  terminalName: shift.terminal?.name ?? shift.terminalId,
  status: shift.status === 'OPEN' ? 'OPEN' : 'CLOSED',
  openingDate: shift.openedAt,
  closingDate: shift.closedAt ?? undefined,
  exchangeRateBCV: Number(shift.exchangeRate),
  initialCashUSD: Number(shift.initialBalanceUsd),
  initialCashVES: Number(shift.initialBalanceVes),
  totalSalesUSD: Number(shift.cashSalesUsd) + Number(shift.electronicSalesUsd),
  totalSalesVES: Number(shift.cashSalesVes) + Number(shift.electronicSalesVes),
  totalCashUSD: Number(shift.cashSalesUsd),
  totalCashVES: Number(shift.cashSalesVes),
  declaredCashUSD: Number(shift.countedCashUsd),
  declaredCashVES: Number(shift.countedCashVes),
  differenceUSD: Number(shift.differenceUsd),
  differenceVES: Number(shift.differenceVes),
  cashOutsUSD: 0,
  cashOutsVES: 0
})

export const getPosBCVRate = async (): Promise<number> => {
  const result = await fetchActiveBcvRate()

  if (!result.ok) {
    throw new Error(result.error.message)
  }

  return result.data.rate
}

export const getPosFiscalMode = async (): Promise<boolean> => {
  try {
    const response = await executeGraphQL<{ tenantSetting: string }>(
      GET_TENANT_SETTING_QUERY,
      { key: FISCAL_MODE_KEY },
      { timeoutMs: 5000 }
    )

    if (response.tenantSetting === '') return true

    return response.tenantSetting === 'true'
  } catch {
    return true
  }
}

export const setPosFiscalMode = async (fiscal: boolean): Promise<void> => {
  await executeGraphQL(
    SET_TENANT_SETTING_MUTATION,
    { input: { key: FISCAL_MODE_KEY, value: fiscal ? 'true' : 'false' } },
    { timeoutMs: 5000 }
  )
}

export const getPosTerminals = async (): Promise<Array<{ id: string; name: string; code: string }>> => {
  const response = await executeGraphQL<{
    posTerminals: Array<{ id: string; name: string; code: string; status: string }>
  }>(GET_POS_TERMINALS_QUERY, undefined, { timeoutMs: 5000 })

  return response.posTerminals.filter(t => t.status === 'ACTIVE')
}

export const getActivePosShift = async (terminalId: string): Promise<POSShift | null> => {
  const response = await executeGraphQL<{ activePosShift: BackendPosShift | null }>(
    GET_ACTIVE_POS_SHIFT_QUERY,
    { terminalId },
    { timeoutMs: 5000 }
  )

  return response.activePosShift ? mapShift(response.activePosShift) : null
}

export const getActivePosShiftForFirstTerminal = async (): Promise<POSShift | null> => {
  const terminals = await getPosTerminals()

  if (terminals.length === 0) return null

  return getActivePosShift(terminals[0].id)
}

export const openPosShift = async (
  terminalId: string,
  exchangeRate: number,
  initialBalanceUsd = 0,
  initialBalanceVes = 0
): Promise<POSShift> => {
  const response = await executeGraphQL<{ openPosShift: BackendPosShift }>(
    OPEN_POS_SHIFT_MUTATION,
    {
      input: {
        terminalId,
        exchangeRate: exchangeRate.toFixed(4),
        initialBalanceUsd: initialBalanceUsd.toFixed(4),
        initialBalanceVes: initialBalanceVes.toFixed(4)
      }
    },
    { timeoutMs: 10000 }
  )

  return mapShift(response.openPosShift)
}

export const closePosShift = async (
  shiftId: string,
  countedCashUsd: number,
  countedCashVes: number
): Promise<POSShift> => {
  const response = await executeGraphQL<{ closePosShift: BackendPosShift }>(
    CLOSE_POS_SHIFT_MUTATION,
    {
      input: {
        shiftId,
        countedCashUsd: countedCashUsd.toFixed(4),
        countedCashVes: countedCashVes.toFixed(4),
        idempotencyKey: crypto.randomUUID()
      }
    },
    { timeoutMs: 10000 }
  )

  return mapShift(response.closePosShift)
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

  return { subtotalUSD, subtotalVES, taxUSD, taxVES, totalUSD, totalVES }
}

export const calculateTransaction = (
  baseTotalUSD: number,
  payments: POSPaymentRecord[],
  rate: number,
  fiscalMode: boolean
): POSTransactionSummary => {
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

export const getParkedOrders = (): ParkedOrder[] => [...parkedOrders]

export const saveParkedOrder = (order: ParkedOrder): ParkedOrder[] => {
  parkedOrders = [order, ...parkedOrders]

  return getParkedOrders()
}

export const removeParkedOrder = (orderId: string): ParkedOrder[] => {
  parkedOrders = parkedOrders.filter(o => o.id !== orderId)

  return getParkedOrders()
}
