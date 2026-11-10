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
  CurrencyCode,
  AccountingInvoice,
  InvoiceLine,
  Payment,
  PaymentReconciledInvoice,
  AppliedCreditNote,
  InvoiceStatus,
  InvoiceAccountingType,
  PaymentMethod
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

export interface GqlInvoiceLine {
  id: string
  description: string
  quantity: string | number
  unitPrice: string | number
  vatRate?: string | number | null
  lineTotal?: string | number | null
  accountId?: string | null
}

export interface GqlInvoicePaymentAssoc {
  id: string
  amountAllocated: string | number
  payment?: {
    id: string
    number: number
    paymentDate: string
    amount: string | number
    currency: string
  } | null
}

export interface GqlAccountingInvoice {
  id: string
  number: number
  type: 'CUSTOMER' | 'SUPPLIER' | string
  status: string
  partnerId: string
  partnerName?: string | null
  issueDate: string
  dueDate: string
  currency: string
  exchangeRate?: string | number | null
  subtotalAmount?: string | number | null
  vatAmount?: string | number | null
  igtfAmount?: string | number | null
  totalAmount: string | number
  pendingAmount?: string | number | null
  journalId?: string | null
  journalEntryId?: string | null
  partner?: {
    id: string
    legalName: string
    tradeName?: string | null
    docType: string
    docNumber: string
    checkDigit?: string | null
    fiscalAddress?: string | null
  } | null
  lines?: GqlInvoiceLine[] | null
  payments?: GqlInvoicePaymentAssoc[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export const mapGqlInvoiceStatusToFrontend = (status: string): InvoiceStatus => {
  if (status === 'POSTED') return 'POSTED'
  if (status === 'PAID') return 'PAID'
  if (status === 'CANCELLED' || status === 'CANCELED') return 'CANCELED'
  if (status === 'REVERSED') return 'REVERSED'

  return 'DRAFT'
}

export const mapGqlInvoiceToFrontend = (gql: GqlAccountingInvoice): AccountingInvoice => {
  const rate = typeof gql.exchangeRate === 'string' ? parseFloat(gql.exchangeRate) : Number(gql.exchangeRate || 1)
  const totalUsd = typeof gql.totalAmount === 'string' ? parseFloat(gql.totalAmount) : Number(gql.totalAmount || 0)
  const subtotalUsd = typeof gql.subtotalAmount === 'string' ? parseFloat(gql.subtotalAmount) : Number(gql.subtotalAmount || totalUsd)
  const vatUsd = typeof gql.vatAmount === 'string' ? parseFloat(gql.vatAmount) : Number(gql.vatAmount || 0)
  const pendingUsd = typeof gql.pendingAmount === 'string' ? parseFloat(gql.pendingAmount) : Number(gql.pendingAmount || 0)

  const partnerRif = gql.partner
    ? `${gql.partner.docType}-${gql.partner.docNumber}${gql.partner.checkDigit ? `-${gql.partner.checkDigit}` : ''}`
    : 'J-00000000-0'

  const lines: InvoiceLine[] = (gql.lines || []).map((l, idx) => {
    const qty = typeof l.quantity === 'string' ? parseFloat(l.quantity) : Number(l.quantity || 0)
    const price = typeof l.unitPrice === 'string' ? parseFloat(l.unitPrice) : Number(l.unitPrice || 0)
    const lineTotal = typeof l.lineTotal === 'string' ? parseFloat(l.lineTotal) : Number(l.lineTotal || qty * price)

    return {
      id: l.id || `inv-l-${idx + 1}`,
      productoOConcepto: l.description || `Línea ${idx + 1}`,
      cuentaContableId: l.accountId || 'acc-revenue',
      cuentaContableNombre: 'Cuenta Contable',
      cantidad: qty,
      precioUnitarioUsd: price,
      tasaImpuestoPct: 16,
      subtotalUsd: lineTotal,
      ivaUsd: Number((lineTotal * 0.16).toFixed(2)),
      totalUsd: Number((lineTotal * 1.16).toFixed(2))
    }
  })

  const pagosAsociados = (gql.payments || []).map((p, idx) => ({
    id: p.id || `assoc-${idx + 1}`,
    pagoId: p.payment?.id || `pag-${idx + 1}`,
    numeroPago: p.payment ? `PAG-${String(p.payment.number).padStart(4, '0')}` : 'PAG-0000',
    fecha: p.payment?.paymentDate ? p.payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    diarioId: 'jou-bank',
    diarioNombre: 'Banco',
    metodoPago: 'TRANSFERENCIA' as PaymentMethod,
    moneda: (p.payment?.currency as CurrencyCode) || 'USD',
    monto: typeof p.amountAllocated === 'string' ? parseFloat(p.amountAllocated) : Number(p.amountAllocated || 0),
    montoUsd: typeof p.amountAllocated === 'string' ? parseFloat(p.amountAllocated) : Number(p.amountAllocated || 0),
    montoVes: Number(((typeof p.amountAllocated === 'string' ? parseFloat(p.amountAllocated) : Number(p.amountAllocated || 0)) * rate).toFixed(2)),
    creadoEn: p.payment?.paymentDate || new Date().toISOString()
  }))

  const prefix = gql.type === 'CUSTOMER' ? 'FAC-CLI' : 'FAC-PROV'

  return {
    id: gql.id,
    numeroFactura: `${prefix}-2026-${String(gql.number).padStart(4, '0')}`,
    tipo: (gql.type as InvoiceAccountingType) || 'CUSTOMER',
    tipoDocumento: 'FACTURA',
    moneda: (gql.currency as CurrencyCode) || 'USD',
    contactoId: gql.partnerId,
    contactoNombre: gql.partner?.legalName || gql.partnerName || 'Tercero',
    contactoRif: partnerRif,
    contactoCuentaContableId: 'acc-cxc',
    contactoCuentaContableNombre: 'Cuentas por Cobrar / Pagar',
    fechaEmision: gql.issueDate ? gql.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    fechaVencimiento: gql.dueDate ? gql.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    tasaBcv: Number(rate.toFixed(4)),
    estado: mapGqlInvoiceStatusToFrontend(gql.status),
    diarioId: gql.journalId || 'jou-sales',
    lineas: lines,
    totalNetoUsd: Number(subtotalUsd.toFixed(2)),
    totalIvaUsd: Number(vatUsd.toFixed(2)),
    totalUsd: Number(totalUsd.toFixed(2)),
    totalVes: Number((totalUsd * rate).toFixed(2)),
    saldoPendienteUsd: Number(pendingUsd.toFixed(2)),
    saldoPendienteVes: Number((pendingUsd * rate).toFixed(2)),
    asientoAsociadoId: gql.journalEntryId || undefined,
    pagosAsociados
  }
}

export interface GqlPayment {
  id: string
  number: number
  paymentDate: string
  amount: string | number
  currency: string
  exchangeRate?: string | number | null
  reference?: string | null
  partnerId?: string | null
  journalId: string
  allocations?: Array<{
    id: string
    invoiceId: string
    amountAllocated: string | number
    invoice?: {
      id: string
      number: number
      type: string
    } | null
  }> | null
  createdAt?: string | null
}

export const mapGqlPaymentToFrontend = (
  gql: GqlPayment,
  journalMap: Record<string, string> = {}
): Payment => {
  const amount = typeof gql.amount === 'string' ? parseFloat(gql.amount) : Number(gql.amount || 0)
  const rate = typeof gql.exchangeRate === 'string' ? parseFloat(gql.exchangeRate) : Number(gql.exchangeRate || 1)

  const facturasConciliadas: PaymentReconciledInvoice[] = (gql.allocations || []).map(a => {
    const allocated = typeof a.amountAllocated === 'string' ? parseFloat(a.amountAllocated) : Number(a.amountAllocated || 0)

    return {
      facturaId: a.invoiceId,
      numeroFactura: a.invoice ? `FAC-${String(a.invoice.number).padStart(4, '0')}` : 'FAC-0000',
      montoAplicadoUsd: allocated,
      montoAplicadoVes: Number((allocated * rate).toFixed(2)),
      tasaBcvOriginal: rate,
      diferencialCambiarioVes: 0
    }
  })

  return {
    id: gql.id,
    numeroPago: `PAG-2026-${String(gql.number).padStart(4, '0')}`,
    fecha: gql.paymentDate ? gql.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    diarioId: gql.journalId,
    diarioNombre: journalMap[gql.journalId] || 'Banco',
    metodoPago: 'TRANSFERENCIA',
    moneda: (gql.currency as CurrencyCode) || 'USD',
    monto: Number(amount.toFixed(2)),
    tasaBcvPago: Number(rate.toFixed(4)),
    contactoId: gql.partnerId || 'ct-general',
    contactoNombre: 'Tercero',
    referenciaBancaria: gql.reference || undefined,
    estado: 'CONFIRMADO',
    facturasConciliadas,
    aplicaIgtf: false,
    montoIgtfUsd: 0,
    montoIgtfVes: 0,
    creadoEn: gql.createdAt || new Date().toISOString()
  }
}

export interface GqlCreditNote {
  id: string
  number: number
  status: string
  invoiceId: string
  amount: string | number
  currency: string
  issueDate: string
  reason?: string | null
  invoice?: {
    id: string
    number: number
  } | null
}

export const mapGqlCreditNoteToFrontend = (
  gql: GqlCreditNote,
  bcvRate: number
): AppliedCreditNote => {
  const amount = typeof gql.amount === 'string' ? parseFloat(gql.amount) : Number(gql.amount || 0)

  return {
    id: gql.id,
    notaCreditoId: gql.id,
    numeroNotaCredito: `NC-2026-${String(gql.number).padStart(4, '0')}`,
    fecha: gql.issueDate ? gql.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    montoUsd: Number(amount.toFixed(2)),
    montoVes: Number((amount * bcvRate).toFixed(2)),
    motivo: gql.reason || 'Nota de crédito',
    creadoEn: gql.issueDate || new Date().toISOString()
  }
}

export interface GqlDualMoney {
  usd?: { amount?: string | number } | null
  ves?: { amount?: string | number } | null
}

export const unpackDualMoney = (dm?: GqlDualMoney | null): { usd: number; ves: number } => {
  if (!dm) return { usd: 0, ves: 0 }
  const usd = typeof dm.usd?.amount === 'string' ? parseFloat(dm.usd.amount) : Number(dm.usd?.amount || 0)
  const ves = typeof dm.ves?.amount === 'string' ? parseFloat(dm.ves.amount) : Number(dm.ves?.amount || 0)

  return { usd: Number(usd.toFixed(2)), ves: Number(ves.toFixed(2)) }
}

export interface GqlBalanceSheetLine {
  accountId: string
  code: string
  name: string
  level: number
  amounts?: GqlDualMoney | null
}

export interface GqlBalanceSheetSection {
  type: string
  total?: GqlDualMoney | null
  lines?: GqlBalanceSheetLine[] | null
}

export interface GqlBalanceSheet {
  meta?: {
    generatedAt: string
    dateTo: string
    ratePolicy?: string
    closingRate?: string | number | null
    balanced?: boolean
  } | null
  sections?: GqlBalanceSheetSection[] | null
  equation?: {
    assets?: GqlDualMoney | null
    liabilities?: GqlDualMoney | null
    equity?: GqlDualMoney | null
    balanced?: boolean
    differenceUsd?: string | number | null
    differenceVes?: string | number | null
  } | null
}

export interface GqlProfitAndLossLine {
  id: string
  accountId: string
  code: string
  name: string
  section: string
  level: number
  amounts?: GqlDualMoney | null
}

export interface GqlProfitAndLossTotals {
  revenue?: GqlDualMoney | null
  costOfGoods?: GqlDualMoney | null
  grossProfit?: GqlDualMoney | null
  operatingExpenses?: GqlDualMoney | null
  operatingResult?: GqlDualMoney | null
  netResult?: GqlDualMoney | null
}

export interface GqlProfitAndLoss {
  meta?: {
    generatedAt: string
    dateFrom?: string | null
    dateTo: string
    ratePolicy?: string
  } | null
  lines?: GqlProfitAndLossLine[] | null
  totals?: GqlProfitAndLossTotals | null
}

export interface GqlTrialBalanceAccount {
  accountId: string
  code: string
  name: string
  initialDebit?: GqlDualMoney | null
  initialCredit?: GqlDualMoney | null
  periodDebit?: GqlDualMoney | null
  periodCredit?: GqlDualMoney | null
  closingDebit?: GqlDualMoney | null
  closingCredit?: GqlDualMoney | null
}

export interface GqlTrialBalance {
  meta?: {
    generatedAt: string
    dateTo: string
  } | null
  accounts?: GqlTrialBalanceAccount[] | null
  totals?: {
    periodDebit?: GqlDualMoney | null
    periodCredit?: GqlDualMoney | null
    closingDebit?: GqlDualMoney | null
    closingCredit?: GqlDualMoney | null
    balanced?: boolean
  } | null
}

export interface GqlGeneralLedgerItem {
  entryId: string
  entryNumber: number
  postingDate: string
  status: string
  journalCode: string
  accountCode: string
  accountName: string
  description: string
  contactName?: string | null
  debit?: GqlDualMoney | null
  credit?: GqlDualMoney | null
  runningBalance?: GqlDualMoney | null
}

export interface GqlGeneralLedger {
  meta?: {
    dateFrom?: string | null
    dateTo: string
  } | null
  items?: GqlGeneralLedgerItem[] | null
  totals?: {
    debit?: GqlDualMoney | null
    credit?: GqlDualMoney | null
  } | null
  pagination?: {
    totalCount: number
    page: number
    pageSize: number
    totalPages: number
  } | null
}


