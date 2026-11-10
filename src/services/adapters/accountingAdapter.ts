// Adaptador bidireccional entre el esquema GraphQL de Contabilidad (BE-ACC-01 / Fase 1) y la UI de forge-front

import type {
  Account,
  Journal,
  JournalEntry,
  JournalItem,
  AccountType,
  SpecificAccountType,
  JournalType,
  EntryStatus,
  EntrySource,
  CurrencyCode
} from '@/types/accountingTypes'

export const formatDecimalString = (val?: number | string | null, defaultValue = '0.0000'): string => {
  if (val === undefined || val === null || val === '') return defaultValue

  const num = typeof val === 'number' ? val : parseFloat(val)

  if (isNaN(num) || num < 0) return defaultValue

  return num.toFixed(4)
}

export const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8

    return v.toString(16)
  })
}

/**
 * Validador pre-flight de Partida Doble bimonetaria (débitos = créditos dentro de 0.01 tolerancia).
 */
export const validateDoubleEntry = (
  lines: Array<{
    debitUsd?: number | string
    creditUsd?: number | string
    debitVes?: number | string
    creditVes?: number | string
    debeUsd?: number | string
    haberUsd?: number | string
    debeVes?: number | string
    haberVes?: number | string
  }>
): { balanced: boolean; diffUsd: number; diffVes: number; message?: string } => {
  let totalDebitUsd = 0
  let totalCreditUsd = 0
  let totalDebitVes = 0
  let totalCreditVes = 0

  for (const line of lines) {
    const dUsd = line.debeUsd !== undefined ? line.debeUsd : line.debitUsd
    const cUsd = line.haberUsd !== undefined ? line.haberUsd : line.creditUsd
    const dVes = line.debeVes !== undefined ? line.debeVes : line.debitVes
    const cVes = line.haberVes !== undefined ? line.haberVes : line.creditVes

    totalDebitUsd += typeof dUsd === 'number' ? dUsd : parseFloat(String(dUsd || 0)) || 0
    totalCreditUsd += typeof cUsd === 'number' ? cUsd : parseFloat(String(cUsd || 0)) || 0
    totalDebitVes += typeof dVes === 'number' ? dVes : parseFloat(String(dVes || 0)) || 0
    totalCreditVes += typeof cVes === 'number' ? cVes : parseFloat(String(cVes || 0)) || 0
  }

  const diffUsd = Math.abs(totalDebitUsd - totalCreditUsd)
  const diffVes = Math.abs(totalDebitVes - totalCreditVes)

  const isBalancedUsd = diffUsd <= 0.01
  const isBalancedVes = diffVes <= 0.01

  if (!isBalancedUsd || !isBalancedVes) {
    return {
      balanced: false,
      diffUsd: Number(diffUsd.toFixed(2)),
      diffVes: Number(diffVes.toFixed(2)),
      message: `El asiento está descuadrado: diferencia de $${diffUsd.toFixed(2)} USD y Bs. ${diffVes.toFixed(2)} VES.`
    }
  }

  return { balanced: true, diffUsd: 0, diffVes: 0 }
}

export interface GqlAccount {
  id: string
  code: string
  name: string
  type: string
  normalSide: string
  currencyScope?: string | null
  requiresReconciliation?: boolean | null
  isActive?: boolean | null
  parentId?: string | null
  balanceUsd?: string | number | null
  balanceVes?: string | number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface GqlJournal {
  id: string
  code: string
  name: string
  type: string
  defaultAccountId?: string | null
  currency?: string | null
  color?: string | null
  isActive?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface GqlJournalEntryLine {
  id: string
  accountId: string
  debitUsd?: string | number | null
  creditUsd?: string | number | null
  debitVes?: string | number | null
  creditVes?: string | number | null
  label?: string | null
  account?: {
    id: string
    code: string
    name: string
  } | null
}

export interface GqlJournalEntry {
  id: string
  number: number
  journalId: string
  postingDate: string
  description: string
  state: string
  source?: string | null
  sourceReference?: string | null
  exchangeRate?: string | number | null
  lines?: GqlJournalEntryLine[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export const mapGqlAccountTypeToFrontend = (
  type: string
): { tipo: AccountType; subtipo: SpecificAccountType; tipoCuentaNombre: string } => {
  switch (type) {
    case 'ASSET':
      return { tipo: 'ASSET_CURRENT', subtipo: 'ACTIVO_CORRIENTE', tipoCuentaNombre: 'Activo' }
    case 'LIABILITY':
      return { tipo: 'LIABILITY_CURRENT', subtipo: 'PASIVO_CORRIENTE', tipoCuentaNombre: 'Pasivo' }
    case 'EQUITY':
      return { tipo: 'EQUITY', subtipo: 'PATRIMONIO', tipoCuentaNombre: 'Patrimonio' }
    case 'REVENUE':
      return { tipo: 'INCOME', subtipo: 'INGRESO_VENTAS', tipoCuentaNombre: 'Ingresos' }
    case 'EXPENSE':
      return { tipo: 'EXPENSE_OPERATING', subtipo: 'GASTO_OPERATIVO', tipoCuentaNombre: 'Gastos' }
    default:
      return { tipo: 'ASSET_CURRENT', subtipo: 'ACTIVO_CORRIENTE', tipoCuentaNombre: 'Activo' }
  }
}

export const mapFrontendTypeToGqlAccountType = (
  tipo: AccountType
): 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' => {
  if (tipo === 'ASSET_CURRENT' || tipo === 'ASSET_NON_CURRENT') return 'ASSET'
  if (tipo === 'LIABILITY_CURRENT' || tipo === 'LIABILITY_NON_CURRENT') return 'LIABILITY'
  if (tipo === 'EQUITY') return 'EQUITY'
  if (tipo === 'INCOME' || tipo === 'INCOME_FINANCIAL') return 'REVENUE'

  return 'EXPENSE'
}

export const mapGqlAccountToFrontend = (gql: GqlAccount): Account => {
  const { tipo, subtipo, tipoCuentaNombre } = mapGqlAccountTypeToFrontend(gql.type)

  let moneda: CurrencyCode | 'AMBAS' = 'AMBAS'

  if (gql.currencyScope === 'USD_ONLY') moneda = 'USD'
  else if (gql.currencyScope === 'VES_ONLY') moneda = 'VES'

  const saldoUsd = typeof gql.balanceUsd === 'string' ? parseFloat(gql.balanceUsd) : Number(gql.balanceUsd || 0)
  const saldoVes = typeof gql.balanceVes === 'string' ? parseFloat(gql.balanceVes) : Number(gql.balanceVes || 0)

  return {
    id: gql.id,
    codigo: gql.code,
    nombre: gql.name,
    tipo,
    subtipo,
    tipoCuentaNombre,
    moneda,
    permiteConciliacion: Boolean(gql.requiresReconciliation),
    saldoUsd: Number(saldoUsd.toFixed(2)),
    saldoVes: Number(saldoVes.toFixed(2)),
    activo: gql.isActive !== false
  }
}

export const mapGqlJournalToFrontend = (gql: GqlJournal): Journal => {
  let tipo: JournalType = 'VARIOS'

  if (gql.type === 'SALE') tipo = 'VENTAS'
  else if (gql.type === 'PURCHASE') tipo = 'COMPRAS'
  else if (gql.type === 'CASH') tipo = 'CAJA'
  else if (gql.type === 'BANK') tipo = 'BANCO'

  return {
    id: gql.id,
    codigo: gql.code,
    nombre: gql.name,
    tipo,
    cuentaPorDefectoId: gql.defaultAccountId || '',
    moneda: (gql.currency as CurrencyCode | 'AMBAS') || 'AMBAS',
    saldoActualUsd: 0,
    saldoActualVes: 0,
    colorIdentificador: gql.color || '#6C5CE7'
  }
}

export const mapGqlEntryToFrontend = (
  gql: GqlJournalEntry,
  journalNameLookup: Record<string, string> = {}
): JournalEntry => {
  let estado: EntryStatus = 'DRAFT'

  if (gql.state === 'POSTED') estado = 'POSTED'
  else if (gql.state === 'CANCELLED' || gql.state === 'CANCELED') estado = 'CANCELED'

  let origen: EntrySource = 'MANUAL'

  if (gql.source === 'SALE') origen = 'FACTURA'
  else if (gql.source === 'PURCHASE') origen = 'FACTURA'
  else if (gql.source === 'PAYMENT') origen = 'PAGO'

  let totalDebeUsd = 0
  let totalHaberUsd = 0
  let totalDebeVes = 0
  let totalHaberVes = 0

  const lineas: JournalItem[] = (gql.lines || []).map((l, idx) => {
    const dUsd = typeof l.debitUsd === 'string' ? parseFloat(l.debitUsd) : Number(l.debitUsd || 0)
    const cUsd = typeof l.creditUsd === 'string' ? parseFloat(l.creditUsd) : Number(l.creditUsd || 0)
    const dVes = typeof l.debitVes === 'string' ? parseFloat(l.debitVes) : Number(l.debitVes || 0)
    const cVes = typeof l.creditVes === 'string' ? parseFloat(l.creditVes) : Number(l.creditVes || 0)

    totalDebeUsd += dUsd
    totalHaberUsd += cUsd
    totalDebeVes += dVes
    totalHaberVes += cVes

    return {
      id: l.id || `line-${idx + 1}`,
      cuentaId: l.accountId,
      cuentaCodigo: l.account?.code || '0.0.00.00',
      cuentaNombre: l.account?.name || 'Cuenta',
      etiqueta: l.label || gql.description,
      debeUsd: Number(dUsd.toFixed(2)),
      haberUsd: Number(cUsd.toFixed(2)),
      debeVes: Number(dVes.toFixed(2)),
      haberVes: Number(cVes.toFixed(2))
    }
  })

  const rate = typeof gql.exchangeRate === 'string' ? parseFloat(gql.exchangeRate) : Number(gql.exchangeRate || 1)
  const diarioNombre = journalNameLookup[gql.journalId] || 'Diario Contable'

  return {
    id: gql.id,
    numeroAsiento: `AS-${String(gql.number).padStart(5, '0')}`,
    fecha: gql.postingDate ? gql.postingDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    diarioId: gql.journalId,
    diarioNombre,
    origen,
    documentoReferencia: gql.sourceReference || undefined,
    estado,
    tasaBcv: Number(rate.toFixed(4)),
    totalDebeUsd: Number(totalDebeUsd.toFixed(2)),
    totalHaberUsd: Number(totalHaberUsd.toFixed(2)),
    totalDebeVes: Number(totalDebeVes.toFixed(2)),
    totalHaberVes: Number(totalHaberVes.toFixed(2)),
    lineas,
    notas: gql.description,
    creadoPor: 'Contador / Sistema',
    creadoEn: gql.createdAt || new Date().toISOString()
  }
}
