// Servicio desacoplado de Contabilidad Bimonetaria y Tesorería con persistencia localStorage (SPEC-008)

import type {
  Account,
  Journal,
  JournalEntry,
  JournalItem,
  EntryStatus,
  AccountingInvoice,
  InvoiceAccountingType,
  InvoiceStatus,
  InvoicePaymentAssociation,
  AppliedCreditNote,
  PaymentMethod,
  Payment,
  SupplierBatchItem,
  DirectExpenseForm,
  FinancialReportRow,
  ContactAccountingConfig,
  AccountingSummaryKpis,
  CurrencyCode
} from '@/types/accountingTypes'
import { salesQuotesService } from '@/services/salesQuotesService'
import { purchasesService } from '@/services/purchasesService'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  GET_ACCOUNTS_QUERY,
  CREATE_ACCOUNT_MUTATION,
  UPDATE_ACCOUNT_MUTATION,
  DEACTIVATE_ACCOUNT_MUTATION,
  SEED_DEFAULT_CHART_MUTATION,
  GET_JOURNALS_QUERY,
  CREATE_JOURNAL_MUTATION,
  GET_JOURNAL_ENTRIES_QUERY,
  CREATE_JOURNAL_ENTRY_MUTATION,
  POST_JOURNAL_ENTRY_MUTATION,
  CANCEL_JOURNAL_ENTRY_MUTATION,
  REVERSE_JOURNAL_ENTRY_MUTATION,
  GET_INVOICES_QUERY,
  GET_INVOICE_QUERY,
  CREATE_CUSTOMER_INVOICE_MUTATION,
  POST_CUSTOMER_INVOICE_MUTATION,
  CREATE_SUPPLIER_INVOICE_MUTATION,
  POST_SUPPLIER_INVOICE_MUTATION,
  CANCEL_CUSTOMER_INVOICE_MUTATION,
  CANCEL_SUPPLIER_INVOICE_MUTATION,
  GET_PAYMENTS_QUERY,
  REGISTER_PAYMENT_MUTATION,
  GET_BALANCE_SHEET_QUERY,
  GET_PROFIT_AND_LOSS_QUERY,
  GET_TRIAL_BALANCE_QUERY,
  GET_GENERAL_LEDGER_QUERY
} from '@/graphql/accounting.gql'
import {
  formatDecimalString,
  generateIdempotencyKey,
  validateDoubleEntry,
  mapGqlAccountToFrontend,
  mapFrontendTypeToGqlAccountType,
  mapGqlJournalToFrontend,
  mapGqlEntryToFrontend,
  mapGqlInvoiceToFrontend,
  mapGqlPaymentToFrontend,
  type GqlAccount,
  type GqlJournal,
  type GqlJournalEntry,
  type GqlAccountingInvoice,
  type GqlPayment,
  type GqlBalanceSheet,
  type GqlProfitAndLoss,
  type GqlTrialBalance,
  type GqlGeneralLedger
} from '@/services/adapters/accountingAdapter'

const mapPaymentMethodToBackend = (
  method: string
): 'CASH' | 'TRANSFER' | 'MOBILE_PAYMENT' | 'ZELLE' | 'CHECK' | 'OTHER' => {
  if (method === 'EFECTIVO') return 'CASH'
  if (method === 'PAGO_MOVIL') return 'MOBILE_PAYMENT'
  if (method === 'ZELLE') return 'ZELLE'
  if (method === 'TRANSFERENCIA') return 'TRANSFER'

  return 'OTHER'
}

const STORAGE_KEYS = {
  ACCOUNTS: 'foundly_accounting_accounts',
  JOURNALS: 'foundly_accounting_journals',
  ENTRIES: 'foundly_accounting_entries',
  INVOICES: 'foundly_accounting_invoices',
  PAYMENTS: 'foundly_accounting_payments',
  CONTACT_MAPPINGS: 'foundly_accounting_contact_mappings'
}

// ---------------------------------------------------------------------------
// 5. HELPER STORAGE FUNCTIONS
// ---------------------------------------------------------------------------
const getStored = <T>(key: string): T => {
  void key

  return [] as T
}

const setStored = <T>(key: string, val: T): void => {
  // La contabilidad ya no persiste datos de negocio en localStorage.
  void key
  void val
}

// ---------------------------------------------------------------------------
// 6. SERVICIO PRINCIPAL DE CONTABILIDAD Y TESORERÍA
// ---------------------------------------------------------------------------
export const accountingService = {
  // Cuentas Contables (PUC con backend GraphQL BE-ACC-01)
  getAccounts: async (): Promise<Account[]> => {
    try {
      const res = await executeGraphQL<{ accounts: GqlAccount[] }>(
        GET_ACCOUNTS_QUERY,
        { take: 200 },
        { timeoutMs: 5000 }
      )

      if (res?.accounts && Array.isArray(res.accounts)) {
        return res.accounts.map(mapGqlAccountToFrontend).sort((a, b) => a.codigo.localeCompare(b.codigo))
      }

      throw new Error('Respuesta inválida del backend al consultar cuentas contables.')
    } catch (err) {
      console.error('[accountingService] Error al consultar accounts de backend:', err)
      throw err
    }
  },

  createAccount: async (input: Omit<Account, 'id' | 'saldoUsd' | 'saldoVes'>): Promise<Account> => {
    const gqlType = mapFrontendTypeToGqlAccountType(input.tipo)

    const normalSide =
      input.tipo === 'INCOME' ||
      input.tipo === 'LIABILITY_CURRENT' ||
      input.tipo === 'LIABILITY_NON_CURRENT' ||
      input.tipo === 'EQUITY'
        ? 'CREDIT'
        : 'DEBIT'

    let currencyScope = 'ANY'

    if (input.moneda === 'USD') currencyScope = 'USD_ONLY'
    else if (input.moneda === 'VES') currencyScope = 'VES_ONLY'

    try {
      const res = await executeGraphQL<{ createAccount: GqlAccount }>(
        CREATE_ACCOUNT_MUTATION,
        {
          input: {
            code: input.codigo.trim(),
            name: input.nombre.trim(),
            type: gqlType,
            normalSide,
            currencyScope,
            requiresReconciliation: Boolean(input.permiteConciliacion)
          }
        },
        { timeoutMs: 8000 }
      )

      if (res?.createAccount) {
        const created = mapGqlAccountToFrontend(res.createAccount)
        const accounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)
        const updated = [...accounts, created].sort((a, b) => a.codigo.localeCompare(b.codigo))

        setStored(STORAGE_KEYS.ACCOUNTS, updated)

        return created
      }
    } catch (err: unknown) {
      console.error('[accountingService] Fallback a local para createAccount:', err)
      throw err
    }

    const accounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)

    const newAcc: Account = {
      ...input,
      id: `acc-${Date.now()}`,
      saldoUsd: 0,
      saldoVes: 0
    }

    const updated = [...accounts, newAcc].sort((a, b) => a.codigo.localeCompare(b.codigo))

    setStored(STORAGE_KEYS.ACCOUNTS, updated)

    return newAcc
  },

  updateAccount: async (id: string, input: Partial<Account>): Promise<Account> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        let currencyScope: string | undefined

        if (input.moneda === 'USD') currencyScope = 'USD_ONLY'
        else if (input.moneda === 'VES') currencyScope = 'VES_ONLY'
        else if (input.moneda === 'AMBAS') currencyScope = 'ANY'

        const res = await executeGraphQL<{ updateAccount: GqlAccount }>(
          UPDATE_ACCOUNT_MUTATION,
          {
            input: {
              id,
              name: input.nombre?.trim() || undefined,
              currencyScope,
              requiresReconciliation: input.permiteConciliacion !== undefined ? input.permiteConciliacion : undefined
            }
          },
          { timeoutMs: 8000 }
        )

        if (res?.updateAccount) {
          const updated = mapGqlAccountToFrontend(res.updateAccount)
          const accounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)
          const next = accounts.map(a => (a.id === id ? { ...a, ...updated } : a))

          setStored(STORAGE_KEYS.ACCOUNTS, next)

          return updated
        }
      } catch (err: unknown) {
        console.error('[accountingService] Fallback local para updateAccount:', err)
      throw err
      }
    }

    const accounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)
    const updated = accounts.map(a => (a.id === id ? { ...a, ...input } : a))

    setStored(STORAGE_KEYS.ACCOUNTS, updated)

    return updated.find(a => a.id === id)!
  },

  deactivateAccount: async (id: string): Promise<void> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        await executeGraphQL(DEACTIVATE_ACCOUNT_MUTATION, { accountId: id }, { timeoutMs: 8000 })
      } catch (err) {
        console.error('[accountingService] Error al desactivar cuenta en backend:', err)
      throw err
      }
    }

    const accounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)
    const next = accounts.map(a => (a.id === id ? { ...a, activo: false } : a))

    setStored(STORAGE_KEYS.ACCOUNTS, next)
  },

  seedDefaultChartOfAccounts: async (): Promise<Account[]> => {
    try {
      const res = await executeGraphQL<{
        seedDefaultChartOfAccounts: { accountsCreated: number; journalsCreated: number; alreadySeeded: boolean }
      }>(SEED_DEFAULT_CHART_MUTATION, undefined, { timeoutMs: 12000 })

      if (res?.seedDefaultChartOfAccounts) {
        return accountingService.getAccounts()
      }
    } catch (err) {
      console.error('[accountingService] Error al semillar cuentas de backend:', err)
      throw err
    }

    throw new Error('No fue posible sembrar el plan de cuentas en el backend.')
  },

  // Diarios Contables (con backend GraphQL BE-ACC-01)
  getJournals: async (): Promise<Journal[]> => {
    try {
      const res = await executeGraphQL<{ journals: GqlJournal[] }>(
        GET_JOURNALS_QUERY,
        { take: 50 },
        { timeoutMs: 5000 }
      )

      if (res?.journals && Array.isArray(res.journals)) {
        return res.journals.map(mapGqlJournalToFrontend)
      }

      throw new Error('Respuesta inválida del backend al consultar diarios contables.')
    } catch (err) {
      console.error('[accountingService] Error al consultar diarios de backend:', err)
      throw err
    }
  },

  getJournalById: async (id: string): Promise<Journal | null> => {
    const journals = await accountingService.getJournals()

    return journals.find(j => j.id === id) || null
  },

  createJournal: async (input: {
    nombre: string
    codigo: string
    tipo: Journal['tipo']
    moneda?: CurrencyCode | 'AMBAS'
    cuentaPorDefectoId: string
    cuentaPorDefectoNombre?: string
    saldoInicialUsd?: number
    saldoInicialVes?: number
    colorIdentificador?: string
    icono?: string
  }): Promise<Journal> => {
    let gqlType = 'GENERAL'

    if (input.tipo === 'VENTAS') gqlType = 'SALE'
    else if (input.tipo === 'COMPRAS') gqlType = 'PURCHASE'
    else if (input.tipo === 'CAJA') gqlType = 'CASH'
    else if (input.tipo === 'BANCO' || input.tipo === 'BANCO_VES' || input.tipo === 'BANCO_USD') gqlType = 'BANK'

    try {
      const res = await executeGraphQL<{ createJournal: GqlJournal }>(
        CREATE_JOURNAL_MUTATION,
        {
          input: {
            code: input.codigo.trim().toUpperCase(),
            name: input.nombre.trim(),
            type: gqlType,
            currency: input.moneda === 'USD' ? 'USD' : input.moneda === 'VES' ? 'VES' : undefined,
            color: input.colorIdentificador || '#6C5CE7'
          }
        },
        { timeoutMs: 8000 }
      )

      if (res?.createJournal) {
        const created = mapGqlJournalToFrontend(res.createJournal)
        const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
        const updated = [...journals, created]

        setStored(STORAGE_KEYS.JOURNALS, updated)

        return created
      }
    } catch (err) {
      console.error('[accountingService] Fallback local para createJournal:', err)
      throw err
    }

    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)

    const newJournal: Journal = {
      id: `jou-${Date.now()}`,
      nombre: input.nombre.trim(),
      codigo: input.codigo.trim().toUpperCase(),
      tipo: input.tipo,
      moneda: input.moneda || 'AMBAS',
      cuentaPorDefectoId: input.cuentaPorDefectoId,
      cuentaPorDefectoNombre: input.cuentaPorDefectoNombre,
      saldoActualUsd: Number(input.saldoInicialUsd) || 0,
      saldoActualVes: Number(input.saldoInicialVes) || 0,
      colorIdentificador: input.colorIdentificador || '#6C5CE7',
      icono:
        input.icono ||
        (input.tipo.startsWith('BANCO') || input.tipo === 'BANCO'
          ? 'tabler-building-bank'
          : input.tipo === 'CAJA'
            ? 'tabler-cash'
            : input.tipo === 'VENTAS'
              ? 'tabler-file-invoice'
              : input.tipo === 'COMPRAS'
                ? 'tabler-receipt'
                : 'tabler-adjustments-alt')
    }

    const updated = [...journals, newJournal]

    setStored(STORAGE_KEYS.JOURNALS, updated)

    return newJournal
  },

  updateJournal: async (id: string, partial: Partial<Journal>): Promise<Journal> => {
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const updated = journals.map(j => (j.id === id ? { ...j, ...partial } : j))

    setStored(STORAGE_KEYS.JOURNALS, updated)
    const found = updated.find(j => j.id === id)

    if (!found) throw new Error('Diario contable no encontrado')
    
return found
  },

  deleteJournal: async (id: string): Promise<void> => {
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const updated = journals.filter(j => j.id !== id)

    setStored(STORAGE_KEYS.JOURNALS, updated)
  },

  // Facturas Contables (con backend GraphQL BE-ACC-01 Fases 2 & 3)
  getInvoices: async (): Promise<AccountingInvoice[]> => {
    try {
      const res = await executeGraphQL<{ accountingInvoices: GqlAccountingInvoice[] }>(
        GET_INVOICES_QUERY,
        { take: 100 },
        { timeoutMs: 5000 }
      )

      if (res?.accountingInvoices && Array.isArray(res.accountingInvoices)) {
        return res.accountingInvoices.map(mapGqlInvoiceToFrontend)
      }

      throw new Error('Respuesta inválida del backend al consultar facturas contables.')
    } catch (err) {
      console.error('[accountingService] Error al consultar accountingInvoices de backend:', err)
      throw err
    }
  },

  getInvoiceById: async (id: string): Promise<AccountingInvoice | null> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        const res = await executeGraphQL<{ accountingInvoice: GqlAccountingInvoice }>(
          GET_INVOICE_QUERY,
          { id },
          { timeoutMs: 5000 }
        )

        if (res?.accountingInvoice) {
          const mapped = mapGqlInvoiceToFrontend(res.accountingInvoice)
          const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
          const idx = invoices.findIndex(i => i.id === id)

          if (idx !== -1) invoices[idx] = mapped
          else invoices.unshift(mapped)

          setStored(STORAGE_KEYS.INVOICES, invoices)

          return mapped
        }
      } catch (err) {
        console.error('[accountingService] Error al consultar accountingInvoice por id:', err)
      throw err
      }
    }

    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)

    return invoices.find(i => i.id === id) || null
  },

  createInvoice: async (invoice: AccountingInvoice): Promise<AccountingInvoice> => {
    const isPartnerUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      invoice.contactoId
    )

    if (isPartnerUuid) {
      try {
        const idempotencyKey = generateIdempotencyKey()
        const rateStr = formatDecimalString(invoice.tasaBcv, '1.0000')

        const gqlLines = invoice.lineas.map(l => ({
          description: l.productoOConcepto.trim(),
          quantity: formatDecimalString(l.cantidad),
          unitPrice: formatDecimalString(l.precioUnitarioUsd),
          vatRate: 'GENERAL_16',
          accountId: l.cuentaContableId && l.cuentaContableId.length > 20 ? l.cuentaContableId : undefined
        }))

        if (invoice.tipo === 'CUSTOMER') {
          const res = await executeGraphQL<{ createCustomerInvoice: { id: string } }>(
            CREATE_CUSTOMER_INVOICE_MUTATION,
            {
              input: {
                customerId: invoice.contactoId,
                issueDate: new Date(invoice.fechaEmision).toISOString(),
                dueDate: new Date(invoice.fechaVencimiento).toISOString(),
                exchangeRate: rateStr,
                idempotencyKey,
                lines: gqlLines
              }
            },
            { timeoutMs: 10000 }
          )

          if (res?.createCustomerInvoice?.id) {
            const invoiceId = res.createCustomerInvoice.id

            if (invoice.estado === 'POSTED') {
              await executeGraphQL(POST_CUSTOMER_INVOICE_MUTATION, { invoiceId }, { timeoutMs: 10000 })
            }

            const fresh = await accountingService.getInvoices()
            const created = fresh.find(i => i.id === invoiceId)

            if (created) return created
          }
        } else {
          const res = await executeGraphQL<{ createSupplierInvoice: { id: string } }>(
            CREATE_SUPPLIER_INVOICE_MUTATION,
            {
              input: {
                supplierId: invoice.contactoId,
                issueDate: new Date(invoice.fechaEmision).toISOString(),
                dueDate: new Date(invoice.fechaVencimiento).toISOString(),
                exchangeRate: rateStr,
                idempotencyKey,
                lines: gqlLines
              }
            },
            { timeoutMs: 10000 }
          )

          if (res?.createSupplierInvoice?.id) {
            const invoiceId = res.createSupplierInvoice.id

            if (invoice.estado === 'POSTED') {
              await executeGraphQL(POST_SUPPLIER_INVOICE_MUTATION, { invoiceId }, { timeoutMs: 10000 })
            }

            const fresh = await accountingService.getInvoices()
            const created = fresh.find(i => i.id === invoiceId)

            if (created) return created
          }
        }
      } catch (err: unknown) {
        console.error('[accountingService] Fallback local para createInvoice:', err)
      throw err
      }
    }

    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const updated = [invoice, ...invoices]

    setStored(STORAGE_KEYS.INVOICES, updated)

    // Sincronización con Ventas o Compras si proviene de un documento origen (SPEC-009)
    if (invoice.documentoOrigen || invoice.origenQuoteId || invoice.origenPurchaseId) {
      const billedLines = invoice.lineas.map(l => ({
        producto_id: l.id,
        cantidad: l.cantidad
      }))

      if (invoice.tipo === 'CUSTOMER') {
        const ref = invoice.origenQuoteId || invoice.documentoOrigen

        if (ref) {
          salesQuotesService.recordInvoiceLink(ref, invoice.id, invoice.numeroFactura, billedLines)
        }
      } else if (invoice.tipo === 'SUPPLIER') {
        const ref = invoice.origenPurchaseId || invoice.documentoOrigen

        if (ref) {
          purchasesService.recordSupplierInvoiceLink(ref, invoice.id, invoice.numeroFactura, billedLines)
        }
      }
    }

    return invoice
  },

  updateInvoice: async (id: string, partial: Partial<AccountingInvoice>): Promise<AccountingInvoice> => {
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const updated = invoices.map(i => (i.id === id ? { ...i, ...partial } : i))

    setStored(STORAGE_KEYS.INVOICES, updated)
    const found = updated.find(i => i.id === id)

    if (!found) throw new Error('Factura no encontrada')

    return found
  },

  resetInvoiceToDraft: async (id: string): Promise<AccountingInvoice> => {
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const invoice = invoices.find(i => i.id === id)

    if (!invoice) throw new Error('Factura no encontrada')

    if (invoice.pagosAsociados && invoice.pagosAsociados.length > 0) {
      throw new Error(
        'No puedes restablecer a borrador una factura que posee pagos o cobros conciliados. Cancela primero los pagos asociados.'
      )
    }

    // Si tiene asiento contable asociado, marcarlo como anulado
    if (invoice.asientoAsociadoId) {
      const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)

      const updatedEntries = entries.map(e =>
        e.id === invoice.asientoAsociadoId ? { ...e, estado: 'CANCELED' as const } : e
      )

      setStored(STORAGE_KEYS.ENTRIES, updatedEntries)
    }

    const updatedInvoice: AccountingInvoice = {
      ...invoice,
      estado: 'DRAFT'
    }

    const updatedInvoices = invoices.map(i => (i.id === id ? updatedInvoice : i))

    setStored(STORAGE_KEYS.INVOICES, updatedInvoices)

    return updatedInvoice
  },

  cancelInvoice: async (id: string, motivo: string, anuladaPor: string = 'Administrador'): Promise<AccountingInvoice> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
      const invoice = invoices.find(i => i.id === id)

      try {
        const mutation = invoice?.tipo === 'SUPPLIER' ? CANCEL_SUPPLIER_INVOICE_MUTATION : CANCEL_CUSTOMER_INVOICE_MUTATION

        await executeGraphQL(mutation, { input: { invoiceId: id, reason: motivo } }, { timeoutMs: 10000 })

        const fresh = await accountingService.getInvoices()
        const updated = fresh.find(i => i.id === id)

        if (updated) return updated
      } catch (err: unknown) {
        console.error('[accountingService] Fallback local para cancelInvoice:', err)
      throw err
      }
    }

    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const invoice = invoices.find(i => i.id === id)

    if (!invoice) throw new Error('Factura no encontrada')

    if (invoice.estado === 'CANCELED') {
      throw new Error('La factura ya se encuentra anulada.')
    }

    if (invoice.pagosAsociados && invoice.pagosAsociados.length > 0) {
      throw new Error(
        'No puedes anular directamente una factura con pagos o cobros conciliados. Cancela primero los pagos asociados o emite una Nota de Crédito.'
      )
    }

    // Si tiene asiento contable asociado, marcarlo como anulado
    if (invoice.asientoAsociadoId) {
      const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)

      const updatedEntries = entries.map(e =>
        e.id === invoice.asientoAsociadoId ? { ...e, estado: 'CANCELED' as const } : e
      )

      setStored(STORAGE_KEYS.ENTRIES, updatedEntries)
    }

    const updatedInvoice: AccountingInvoice = {
      ...invoice,
      estado: 'CANCELED',
      saldoPendienteUsd: 0,
      saldoPendienteVes: 0,
      motivoAnulacion: motivo,
      anuladaEn: new Date().toLocaleString('es-VE'),
      anuladaPor
    }

    const updatedInvoices = invoices.map(i => (i.id === id ? updatedInvoice : i))

    setStored(STORAGE_KEYS.INVOICES, updatedInvoices)

    return updatedInvoice
  },

  createCreditNoteForInvoice: async (input: {
    facturaId: string
    motivo: string
    tipoNota?: 'TOTAL' | 'PARCIAL'
    lineas?: AccountingInvoice['lineas']
    montoPersonalizadoUsd?: number
    fecha?: string
  }): Promise<{ creditNote: AccountingInvoice; updatedInvoice: AccountingInvoice; entry: JournalEntry }> => {
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const invoice = invoices.find(i => i.id === input.facturaId)

    if (!invoice) throw new Error('Factura de origen no encontrada')
    if (invoice.estado === 'CANCELED') throw new Error('No se puede emitir una Nota de Crédito a una factura anulada')

    const fechaNc = input.fecha || new Date().toISOString().split('T')[0]
    const correlativo = String(invoices.filter(i => i.tipoDocumento === 'NOTA_CREDITO').length + 1).padStart(4, '0')
    const numeroNc = `NC-2026-${correlativo}`

    let ncLines = input.lineas || []
    let totalNetoUsd = 0
    let totalIvaUsd = 0
    let totalUsd = 0

    if (ncLines.length > 0) {
      totalNetoUsd = Number(ncLines.reduce((acc, l) => acc + l.subtotalUsd, 0).toFixed(2))
      totalIvaUsd = Number(ncLines.reduce((acc, l) => acc + l.ivaUsd, 0).toFixed(2))
      totalUsd = Number((totalNetoUsd + totalIvaUsd).toFixed(2))
    } else if (input.montoPersonalizadoUsd && input.montoPersonalizadoUsd > 0) {
      const ivaRate = invoice.lineas[0]?.tasaImpuestoPct ?? 16
      const baseNeto = ivaRate > 0 ? Number((input.montoPersonalizadoUsd / (1 + ivaRate / 100)).toFixed(2)) : input.montoPersonalizadoUsd
      const ivaAmount = Number((input.montoPersonalizadoUsd - baseNeto).toFixed(2))

      totalNetoUsd = baseNeto
      totalIvaUsd = ivaAmount
      totalUsd = Number(input.montoPersonalizadoUsd.toFixed(2))

      const ctaDefault = invoice.tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101'

      ncLines = [
        {
          id: `line-nc-${Date.now()}-0`,
          productoOConcepto: `Ajuste / Nota de Crédito (${input.motivo})`,
          cuentaContableId: invoice.lineas[0]?.cuentaContableId || ctaDefault,
          cuentaContableNombre:
            invoice.lineas[0]?.cuentaContableNombre ||
            (invoice.tipo === 'CUSTOMER' ? 'Ingresos por Venta de Mercancías' : 'Costo de Ventas'),
          cantidad: 1,
          precioUnitarioUsd: baseNeto,
          tasaImpuestoPct: ivaRate,
          subtotalUsd: baseNeto,
          ivaUsd: ivaAmount,
          totalUsd: totalUsd
        }
      ]
    } else {
      // TOTAL: Copiar todas las líneas de la factura
      ncLines = invoice.lineas.map((l, idx) => ({
        ...l,
        id: `line-nc-${Date.now()}-${idx}`
      }))
      totalNetoUsd = invoice.totalNetoUsd
      totalIvaUsd = invoice.totalIvaUsd
      totalUsd = invoice.totalUsd
    }

    const totalVes = Number((totalUsd * invoice.tasaBcv).toFixed(2))

    // Asiento contable inverso de la Nota de Crédito
    const entryLines: Omit<JournalItem, 'id'>[] = []

    if (invoice.tipo === 'CUSTOMER') {
      // Cliente: Debita Devoluciones/Ingresos y Débito Fiscal IVA, Acredita CxC
      ncLines.forEach(l => {
        const subtotalVes = Number((l.subtotalUsd * invoice.tasaBcv).toFixed(2))

        entryLines.push({
          cuentaId: l.cuentaContableId || 'acc-410101',
          cuentaCodigo: '4.1.01.01',
          cuentaNombre: l.cuentaContableNombre || 'Devoluciones / Ingresos por Venta',
          contactoId: invoice.contactoId,
          contactoNombre: invoice.contactoNombre,
          etiqueta: `Nota de Crédito ${numeroNc} - ${l.productoOConcepto}`,
          debeUsd: l.subtotalUsd,
          haberUsd: 0,
          debeVes: subtotalVes,
          haberVes: 0
        })
      })

      if (totalIvaUsd > 0) {
        entryLines.push({
          cuentaId: 'acc-210201',
          cuentaCodigo: '2.1.02.01',
          cuentaNombre: 'Débito Fiscal IVA (Reversión Ventas)',
          contactoId: invoice.contactoId,
          contactoNombre: invoice.contactoNombre,
          etiqueta: `IVA NC ${numeroNc} ref. Factura ${invoice.numeroFactura}`,
          debeUsd: totalIvaUsd,
          haberUsd: 0,
          debeVes: Number((totalIvaUsd * invoice.tasaBcv).toFixed(2)),
          haberVes: 0
        })
      }

      entryLines.push({
        cuentaId: invoice.contactoCuentaContableId || 'acc-110201',
        cuentaCodigo: '1.1.02.01',
        cuentaNombre: invoice.contactoCuentaContableNombre || 'Cuentas por Cobrar Clientes (CxC)',
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Aplicación NC ${numeroNc} a Factura ${invoice.numeroFactura}`,
        debeUsd: 0,
        haberUsd: totalUsd,
        debeVes: 0,
        haberVes: totalVes
      })
    } else {
      // Proveedor: Debita CxP, Acredita Costos/Gastos y Crédito Fiscal IVA
      entryLines.push({
        cuentaId: invoice.contactoCuentaContableId || 'acc-210101',
        cuentaCodigo: '2.1.01.01',
        cuentaNombre: invoice.contactoCuentaContableNombre || 'Cuentas por Pagar Proveedores (CxP)',
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Aplicación NC ${numeroNc} a Factura ${invoice.numeroFactura}`,
        debeUsd: totalUsd,
        haberUsd: 0,
        debeVes: totalVes,
        haberVes: 0
      })

      ncLines.forEach(l => {
        const subtotalVes = Number((l.subtotalUsd * invoice.tasaBcv).toFixed(2))

        entryLines.push({
          cuentaId: l.cuentaContableId || 'acc-510101',
          cuentaCodigo: '5.1.01.01',
          cuentaNombre: l.cuentaContableNombre || 'Devoluciones / Reducción Costo de Compra',
          contactoId: invoice.contactoId,
          contactoNombre: invoice.contactoNombre,
          etiqueta: `Nota de Crédito ${numeroNc} - ${l.productoOConcepto}`,
          debeUsd: 0,
          haberUsd: l.subtotalUsd,
          debeVes: 0,
          haberVes: subtotalVes
        })
      })

      if (totalIvaUsd > 0) {
        entryLines.push({
          cuentaId: 'acc-110401',
          cuentaCodigo: '1.1.04.01',
          cuentaNombre: 'Crédito Fiscal IVA (Reversión Compras)',
          contactoId: invoice.contactoId,
          contactoNombre: invoice.contactoNombre,
          etiqueta: `Reversión IVA NC ${numeroNc} ref. Factura ${invoice.numeroFactura}`,
          debeUsd: 0,
          haberUsd: totalIvaUsd,
          debeVes: 0,
          haberVes: Number((totalIvaUsd * invoice.tasaBcv).toFixed(2))
        })
      }
    }

    // Crear el asiento contable
    const entry = await accountingService.createJournalEntry({
      diarioId: invoice.diarioId || (invoice.tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases'),
      fecha: fechaNc,
      origen: 'FACTURA',
      documentoReferencia: `${numeroNc} (${invoice.numeroFactura})`,
      tasaBcv: invoice.tasaBcv,
      creadoPor: 'Módulo de Contabilidad (Nota de Crédito)',
      notas: `Nota de Crédito por ${input.motivo} aplicada a factura ${invoice.numeroFactura}`,
      lineas: entryLines
    })

    // Crear el objeto AccountingInvoice de la Nota de Crédito
    const creditNote: AccountingInvoice = {
      id: `nc-${Date.now()}`,
      numeroFactura: numeroNc,
      tipo: invoice.tipo,
      tipoDocumento: 'NOTA_CREDITO',
      moneda: invoice.moneda || 'USD',
      diarioId: invoice.diarioId,
      contactoId: invoice.contactoId,
      contactoNombre: invoice.contactoNombre,
      contactoRif: invoice.contactoRif,
      contactoCuentaContableId: invoice.contactoCuentaContableId,
      contactoCuentaContableNombre: invoice.contactoCuentaContableNombre,
      fechaEmision: fechaNc,
      fechaVencimiento: fechaNc,
      tasaBcv: invoice.tasaBcv,
      estado: 'POSTED',
      lineas: ncLines,
      totalNetoUsd,
      totalIvaUsd,
      totalUsd,
      totalVes,
      saldoPendienteUsd: 0,
      saldoPendienteVes: 0,
      asientoAsociadoId: entry.id,
      facturaAfectadaId: invoice.id,
      facturaAfectadaNumero: invoice.numeroFactura,
      motivoNotaCredito: input.motivo,
      documentoOrigen: invoice.numeroFactura,
      terminosCondiciones: `Nota de Crédito aplicada a la factura ${invoice.numeroFactura}. Motivo: ${input.motivo}`
    }

    // Actualizar la factura original
    const nuevoSaldoPendienteUsd = Math.max(0, Number((invoice.saldoPendienteUsd - totalUsd).toFixed(2)))
    const nuevoSaldoPendienteVes = Math.max(0, Number((nuevoSaldoPendienteUsd * invoice.tasaBcv).toFixed(2)))

    // Si la nota de crédito cubre el total de la factura o amortiza completamente la deuda sin pagos activos, pasa a REVERSED
    const totalNcAcumuladoUsd = Number(
      ((invoice.notasCreditoAplicadas || []).reduce((acc, nc) => acc + nc.montoUsd, 0) + totalUsd).toFixed(2)
    )

    const esReversionCompleta =
      totalNcAcumuladoUsd >= Number((invoice.totalUsd - 0.01).toFixed(2)) ||
      input.tipoNota === 'TOTAL' ||
      (nuevoSaldoPendienteUsd <= 0.01 && (!invoice.pagosAsociados || invoice.pagosAsociados.length === 0))

    const nuevoEstado: InvoiceStatus = esReversionCompleta
      ? 'REVERSED'
      : nuevoSaldoPendienteUsd <= 0.01
      ? 'PAID'
      : invoice.estado

    const appliedNcRecord: AppliedCreditNote = {
      id: `app-nc-${Date.now()}`,
      notaCreditoId: creditNote.id,
      numeroNotaCredito: creditNote.numeroFactura,
      fecha: fechaNc,
      motivo: input.motivo,
      montoUsd: totalUsd,
      montoVes: totalVes,
      creadoEn: new Date().toLocaleString('es-VE')
    }

    const updatedInvoice: AccountingInvoice = {
      ...invoice,
      saldoPendienteUsd: nuevoSaldoPendienteUsd,
      saldoPendienteVes: nuevoSaldoPendienteVes,
      estado: nuevoEstado,
      notasCreditoAplicadas: [...(invoice.notasCreditoAplicadas || []), appliedNcRecord]
    }

    const updatedInvoices = [
      creditNote,
      ...invoices.map(i => (i.id === invoice.id ? updatedInvoice : i))
    ]

    setStored(STORAGE_KEYS.INVOICES, updatedInvoices)

    return { creditNote, updatedInvoice, entry }
  },

  getCreditNotes: async (tipo?: InvoiceAccountingType): Promise<AccountingInvoice[]> => {
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    let creditNotes = invoices.filter(i => i.tipoDocumento === 'NOTA_CREDITO')

    if (tipo) {
      creditNotes = creditNotes.filter(i => i.tipo === tipo)
    }

    return creditNotes
  },

  createStandaloneCreditNote: async (input: {
    tipo: InvoiceAccountingType
    contactoId: string
    contactoNombre: string
    contactoRif: string
    contactoCuentaContableId?: string
    contactoCuentaContableNombre?: string
    facturaId?: string
    motivo: string
    lineas?: AccountingInvoice['lineas']
    montoUsd?: number
    tasaBcv?: number
    fecha?: string
    moneda?: CurrencyCode
    notas?: string
  }): Promise<{ creditNote: AccountingInvoice; updatedInvoice?: AccountingInvoice; entry: JournalEntry }> => {
    // Si viene asociada a una factura existente, usar createCreditNoteForInvoice
    if (input.facturaId && input.facturaId !== 'NONE' && input.facturaId.trim() !== '') {
      return accountingService.createCreditNoteForInvoice({
        facturaId: input.facturaId,
        motivo: input.motivo,
        lineas: input.lineas,
        montoPersonalizadoUsd: input.montoUsd,
        fecha: input.fecha
      })
    }

    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const tasaBcv = input.tasaBcv || 54.00
    const fechaNc = input.fecha || new Date().toISOString().split('T')[0]
    const correlativo = String(invoices.filter(i => i.tipoDocumento === 'NOTA_CREDITO').length + 1).padStart(4, '0')
    const numeroNc = `NC-2026-${correlativo}`

    let ncLines = input.lineas || []
    let totalNetoUsd = 0
    let totalIvaUsd = 0
    let totalUsd = 0

    if (ncLines.length > 0) {
      totalNetoUsd = Number(ncLines.reduce((acc, l) => acc + l.subtotalUsd, 0).toFixed(2))
      totalIvaUsd = Number(ncLines.reduce((acc, l) => acc + l.ivaUsd, 0).toFixed(2))
      totalUsd = Number((totalNetoUsd + totalIvaUsd).toFixed(2))
    } else if (input.montoUsd && input.montoUsd > 0) {
      const ivaRate = 16
      const baseNeto = Number((input.montoUsd / (1 + ivaRate / 100)).toFixed(2))
      const ivaAmount = Number((input.montoUsd - baseNeto).toFixed(2))

      totalNetoUsd = baseNeto
      totalIvaUsd = ivaAmount
      totalUsd = Number(input.montoUsd.toFixed(2))

      const ctaDefault = input.tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101'

      ncLines = [
        {
          id: `line-nc-${Date.now()}-0`,
          productoOConcepto: `Ajuste / Nota de Crédito Directa (${input.motivo})`,
          cuentaContableId: ctaDefault,
          cuentaContableNombre:
            input.tipo === 'CUSTOMER' ? 'Ingresos por Venta de Mercancías' : 'Costo de Ventas',
          cantidad: 1,
          precioUnitarioUsd: baseNeto,
          tasaImpuestoPct: ivaRate,
          subtotalUsd: baseNeto,
          ivaUsd: ivaAmount,
          totalUsd: totalUsd
        }
      ]
    } else {
      throw new Error('Debe especificar al menos una línea o un monto mayor a cero para la nota de crédito.')
    }

    const totalVes = Number((totalUsd * tasaBcv).toFixed(2))
    const contactoCuentaId = input.contactoCuentaContableId || (input.tipo === 'CUSTOMER' ? 'acc-110201' : 'acc-210101')

    // Asiento contable inverso de la Nota de Crédito
    const entryLines: Omit<JournalItem, 'id'>[] = []

    if (input.tipo === 'CUSTOMER') {
      ncLines.forEach(l => {
        const subtotalVes = Number((l.subtotalUsd * tasaBcv).toFixed(2))

        entryLines.push({
          cuentaId: l.cuentaContableId || 'acc-410101',
          cuentaCodigo: '4.1.01.01',
          cuentaNombre: l.cuentaContableNombre || 'Devoluciones / Ingresos por Venta',
          contactoId: input.contactoId,
          contactoNombre: input.contactoNombre,
          etiqueta: `Nota de Crédito Directa ${numeroNc} - ${l.productoOConcepto}`,
          debeUsd: l.subtotalUsd,
          haberUsd: 0,
          debeVes: subtotalVes,
          haberVes: 0
        })
      })

      if (totalIvaUsd > 0) {
        entryLines.push({
          cuentaId: 'acc-210201',
          cuentaCodigo: '2.1.02.01',
          cuentaNombre: 'Débito Fiscal IVA (Reversión Ventas)',
          contactoId: input.contactoId,
          contactoNombre: input.contactoNombre,
          etiqueta: `IVA NC Directa ${numeroNc}`,
          debeUsd: totalIvaUsd,
          haberUsd: 0,
          debeVes: Number((totalIvaUsd * tasaBcv).toFixed(2)),
          haberVes: 0
        })
      }

      entryLines.push({
        cuentaId: contactoCuentaId,
        cuentaCodigo: '1.1.02.01',
        cuentaNombre: input.contactoCuentaContableNombre || 'Cuentas por Cobrar Clientes (CxC)',
        contactoId: input.contactoId,
        contactoNombre: input.contactoNombre,
        etiqueta: `Nota de Crédito Directa ${numeroNc} (${input.motivo})`,
        debeUsd: 0,
        haberUsd: totalUsd,
        debeVes: 0,
        haberVes: totalVes
      })
    } else {
      entryLines.push({
        cuentaId: contactoCuentaId,
        cuentaCodigo: '2.1.01.01',
        cuentaNombre: input.contactoCuentaContableNombre || 'Cuentas por Pagar Proveedores (CxP)',
        contactoId: input.contactoId,
        contactoNombre: input.contactoNombre,
        etiqueta: `Nota de Crédito Directa ${numeroNc} (${input.motivo})`,
        debeUsd: totalUsd,
        haberUsd: 0,
        debeVes: totalVes,
        haberVes: 0
      })

      ncLines.forEach(l => {
        const subtotalVes = Number((l.subtotalUsd * tasaBcv).toFixed(2))

        entryLines.push({
          cuentaId: l.cuentaContableId || 'acc-510101',
          cuentaCodigo: '5.1.01.01',
          cuentaNombre: l.cuentaContableNombre || 'Devoluciones / Reducción Costo de Compra',
          contactoId: input.contactoId,
          contactoNombre: input.contactoNombre,
          etiqueta: `Nota de Crédito Directa ${numeroNc} - ${l.productoOConcepto}`,
          debeUsd: 0,
          haberUsd: l.subtotalUsd,
          debeVes: 0,
          haberVes: subtotalVes
        })
      })

      if (totalIvaUsd > 0) {
        entryLines.push({
          cuentaId: 'acc-110401',
          cuentaCodigo: '1.1.04.01',
          cuentaNombre: 'Crédito Fiscal IVA (Reversión Compras)',
          contactoId: input.contactoId,
          contactoNombre: input.contactoNombre,
          etiqueta: `Reversión IVA NC Directa ${numeroNc}`,
          debeUsd: 0,
          haberUsd: totalIvaUsd,
          debeVes: 0,
          haberVes: Number((totalIvaUsd * tasaBcv).toFixed(2))
        })
      }
    }

    const entry = await accountingService.createJournalEntry({
      diarioId: input.tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases',
      fecha: fechaNc,
      origen: 'FACTURA',
      documentoReferencia: `${numeroNc} (Directa)`,
      tasaBcv,
      creadoPor: 'Módulo de Contabilidad (Nota de Crédito Directa)',
      notas: `Nota de Crédito Directa por ${input.motivo}`,
      lineas: entryLines
    })

    const creditNote: AccountingInvoice = {
      id: `nc-${Date.now()}`,
      numeroFactura: numeroNc,
      tipo: input.tipo,
      tipoDocumento: 'NOTA_CREDITO',
      moneda: input.moneda || 'USD',
      diarioId: input.tipo === 'CUSTOMER' ? 'jou-sales' : 'jou-purchases',
      contactoId: input.contactoId,
      contactoNombre: input.contactoNombre,
      contactoRif: input.contactoRif,
      contactoCuentaContableId: contactoCuentaId,
      contactoCuentaContableNombre: input.contactoCuentaContableNombre,
      fechaEmision: fechaNc,
      fechaVencimiento: fechaNc,
      tasaBcv,
      estado: 'POSTED',
      lineas: ncLines,
      totalNetoUsd,
      totalIvaUsd,
      totalUsd,
      totalVes,
      saldoPendienteUsd: 0,
      saldoPendienteVes: 0,
      asientoAsociadoId: entry.id,
      motivoNotaCredito: input.motivo,
      notas: input.notas,
      terminosCondiciones: `Nota de Crédito directa. Motivo: ${input.motivo}`
    }

    setStored(STORAGE_KEYS.INVOICES, [creditNote, ...invoices])

    return { creditNote, entry }
  },

  // Pagos y Tesorería (con backend GraphQL BE-ACC-01)
  getPayments: async (): Promise<Payment[]> => {
    try {
      const res = await executeGraphQL<{ payments: GqlPayment[] }>(
        GET_PAYMENTS_QUERY,
        { take: 100 },
        { timeoutMs: 5000 }
      )

      if (res?.payments && Array.isArray(res.payments)) {
        const journals = await accountingService.getJournals()
        const journalMap = Object.fromEntries(journals.map(j => [j.id, j.nombre]))

        return res.payments.map(p => mapGqlPaymentToFrontend(p, journalMap))
      }

      throw new Error('Respuesta inválida del backend al consultar pagos.')
    } catch (err) {
      console.error('[accountingService] Error al consultar payments de backend:', err)
      throw err
    }
  },

  // Registrar Pago Directo desde la Factura (Estilo Odoo)
  registerInvoicePayment: async (input: {
    invoiceId: string
    diarioId: string
    metodoPago: PaymentMethod
    moneda: CurrencyCode
    monto: number
    tasaBcvPago: number
    referenciaBancaria?: string
    cuentaBancariaId?: string
    cuentaBancariaInfo?: string
    fecha?: string
  }): Promise<{ invoice: AccountingInvoice; payment: Payment; entry: JournalEntry }> => {
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const invoice = invoices.find(i => i.id === input.invoiceId)

    if (!invoice) throw new Error('Factura no encontrada')

    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const journal = journals.find(j => j.id === input.diarioId)
    const fechaPago = input.fecha || new Date().toISOString().split('T')[0]

    let montoUsd = 0
    let montoVes = 0

    if (input.moneda === 'USD') {
      montoUsd = input.monto
      montoVes = Number((input.monto * input.tasaBcvPago).toFixed(2))
    } else {
      montoVes = input.monto
      montoUsd = Number((input.monto / input.tasaBcvPago).toFixed(2))
    }

    // Diferencial cambiario en VES si la tasa del pago difiere de la tasa de la factura
    const costoEmisionVes = Number((montoUsd * invoice.tasaBcv).toFixed(2))
    const costoPagoVes = montoVes
    let diferencialCambiarioVes = 0

    if (invoice.tipo === 'CUSTOMER') {
      diferencialCambiarioVes = Number((costoPagoVes - costoEmisionVes).toFixed(2))
    } else {
      diferencialCambiarioVes = Number((costoEmisionVes - costoPagoVes).toFixed(2))
    }

    const isInvoiceUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      invoice.id
    )

    if (isInvoiceUuid) {
      try {
        const idempotencyKey = generateIdempotencyKey()
        const rateStr = formatDecimalString(input.tasaBcvPago, '1.0000')

        await executeGraphQL(
          REGISTER_PAYMENT_MUTATION,
          {
            input: {
              journalId: input.diarioId,
              contactId: invoice.contactoId,
              invoiceType: invoice.tipo,
              method: mapPaymentMethodToBackend(input.metodoPago),
              amount: formatDecimalString(input.monto),
              currency: input.moneda === 'USD' ? 'USD' : 'VES',
              exchangeRate: rateStr,
              reference: input.referenciaBancaria?.trim() || undefined,
              idempotencyKey,
              allocations: [
                {
                  invoiceId: invoice.id,
                  appliedAmount: formatDecimalString(montoUsd),
                  appliedCurrency: 'USD'
                }
              ]
            }
          },
          { timeoutMs: 10000 }
        )
      } catch (err) {
        console.error('[accountingService] Error al registrar pago en backend:', err)
      throw err
      }
    }

    const paymentId = `pag-${Date.now()}`
    const numeroPago = `PAG-2026-${Math.floor(1000 + Math.random() * 9000)}`

    const newPayment: Payment = {
      id: paymentId,
      numeroPago,
      tipo: invoice.tipo,
      fecha: fechaPago,
      contactoId: invoice.contactoId,
      contactoNombre: invoice.contactoNombre,
      diarioId: input.diarioId,
      diarioNombre: journal?.nombre || 'Banco/Caja',
      metodoPago: input.metodoPago,
      moneda: input.moneda,
      monto: input.monto,
      tasaBcvPago: input.tasaBcvPago,
      facturasConciliadas: [
        {
          facturaId: invoice.id,
          numeroFactura: invoice.numeroFactura,
          tasaBcvOriginal: invoice.tasaBcv,
          montoAplicadoUsd: montoUsd,
          montoAplicadoVes: montoVes,
          diferencialCambiarioVes
        }
      ],
      aplicaIgtf: false,
      montoIgtfUsd: 0,
      montoIgtfVes: 0,
      referenciaBancaria: input.referenciaBancaria,
      cuentaBancariaId: input.cuentaBancariaId,
      cuentaBancariaInfo: input.cuentaBancariaInfo,
      estado: 'CONFIRMADO',
      creadoEn: new Date().toLocaleString('es-VE')
    }

    // Cuentas contables para el asiento
    const bankAccount = {
      id: journal?.cuentaPorDefectoId || 'acc-110102',
      codigo: journal?.codigo?.includes('USD') ? '1.1.01.04' : '1.1.01.02',
      nombre: journal?.nombre || 'Banco'
    }

    const cxcCxpAccount = {
      id: invoice.contactoCuentaContableId || (invoice.tipo === 'CUSTOMER' ? 'acc-110201' : 'acc-210101'),
      codigo: invoice.tipo === 'CUSTOMER' ? '1.1.02.01' : '2.1.01.01',
      nombre: invoice.tipo === 'CUSTOMER' ? 'Cuentas por Cobrar Clientes' : 'Cuentas por Pagar Proveedores'
    }

    const entryLines: Omit<JournalItem, 'id'>[] = []

    if (invoice.tipo === 'CUSTOMER') {
      entryLines.push({
        cuentaId: bankAccount.id,
        cuentaCodigo: bankAccount.codigo,
        cuentaNombre: bankAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Cobro Factura ${invoice.numeroFactura} (${numeroPago})`,
        debeUsd: montoUsd,
        haberUsd: 0,
        debeVes: montoVes,
        haberVes: 0
      })
      entryLines.push({
        cuentaId: cxcCxpAccount.id,
        cuentaCodigo: cxcCxpAccount.codigo,
        cuentaNombre: cxcCxpAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Abono a Factura ${invoice.numeroFactura}`,
        debeUsd: 0,
        haberUsd: montoUsd,
        debeVes: 0,
        haberVes: montoVes
      })
    } else {
      entryLines.push({
        cuentaId: cxcCxpAccount.id,
        cuentaCodigo: cxcCxpAccount.codigo,
        cuentaNombre: cxcCxpAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Cancelación Factura ${invoice.numeroFactura} (${numeroPago})`,
        debeUsd: montoUsd,
        haberUsd: 0,
        debeVes: montoVes,
        haberVes: 0
      })
      entryLines.push({
        cuentaId: bankAccount.id,
        cuentaCodigo: bankAccount.codigo,
        cuentaNombre: bankAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Desembolso Pago Factura ${invoice.numeroFactura}`,
        debeUsd: 0,
        haberUsd: montoUsd,
        debeVes: 0,
        haberVes: montoVes
      })
    }

    const entry = await accountingService.createJournalEntry({
      diarioId: input.diarioId,
      fecha: fechaPago,
      origen: 'PAGO',
      documentoReferencia: `${numeroPago} (${invoice.numeroFactura})`,
      tasaBcv: input.tasaBcvPago,
      creadoPor: 'Módulo de Contabilidad (Pago de Factura)',
      lineas: entryLines
    })

    newPayment.asientoContableId = entry.id

    const nuevoSaldoPendienteUsd = Math.max(0, Number((invoice.saldoPendienteUsd - montoUsd).toFixed(2)))
    const nuevoSaldoPendienteVes = Math.max(0, Number((nuevoSaldoPendienteUsd * input.tasaBcvPago).toFixed(2)))
    const nuevoEstado = nuevoSaldoPendienteUsd <= 0.01 ? 'PAID' : 'POSTED'

    const paymentAssoc: InvoicePaymentAssociation = {
      id: `assoc-${Date.now()}`,
      pagoId: newPayment.id,
      numeroPago: newPayment.numeroPago,
      fecha: fechaPago,
      diarioId: input.diarioId,
      diarioNombre: journal?.nombre || 'Banco',
      metodoPago: input.metodoPago,
      moneda: input.moneda,
      monto: input.monto,
      montoUsd,
      montoVes,
      referenciaBancaria: input.referenciaBancaria,
      creadoEn: newPayment.creadoEn
    }

    const updatedInvoice: AccountingInvoice = {
      ...invoice,
      saldoPendienteUsd: nuevoSaldoPendienteUsd,
      saldoPendienteVes: nuevoSaldoPendienteVes,
      estado: nuevoEstado,
      pagosAsociados: [...(invoice.pagosAsociados || []), paymentAssoc]
    }

    const updatedInvoices = invoices.map(i => (i.id === invoice.id ? updatedInvoice : i))

    setStored(STORAGE_KEYS.INVOICES, updatedInvoices)

    return { invoice: updatedInvoice, payment: newPayment, entry }
  },

  // Asientos Contables (Diario General con backend GraphQL BE-ACC-01)
  getJournalEntries: async (targetMoves: 'POSTED' | 'ALL' = 'ALL'): Promise<JournalEntry[]> => {
    try {
      const res = await executeGraphQL<{ journalEntries: GqlJournalEntry[] }>(
        GET_JOURNAL_ENTRIES_QUERY,
        {
          take: 100,
          where: targetMoves === 'POSTED' ? { status: { equals: 'POSTED' } } : undefined
        },
        { timeoutMs: 5000 }
      )

      if (res?.journalEntries && Array.isArray(res.journalEntries)) {
        const journals = await accountingService.getJournals()
        const journalMap = Object.fromEntries(journals.map(j => [j.id, j.nombre]))
        const mapped = res.journalEntries.map(e => mapGqlEntryToFrontend(e, journalMap))

        return targetMoves === 'POSTED'
          ? mapped.filter(e => e.estado === 'POSTED')
          : mapped.filter(e => e.estado !== 'CANCELED')
      }

      throw new Error('Respuesta inválida del backend al consultar asientos contables.')
    } catch (err) {
      console.error('[accountingService] Error al consultar journalEntries de backend:', err)
      throw err
    }
  },

  createJournalEntry: async (input: {
    diarioId: string
    fecha: string
    origen: JournalEntry['origen']
    documentoReferencia?: string
    estado?: EntryStatus
    tasaBcv: number
    lineas: Omit<JournalItem, 'id'>[]
    notas?: string
    creadoPor: string
  }): Promise<JournalEntry> => {
    // 1. Pre-flight de Partida Doble
    const validation = validateDoubleEntry(input.lineas)

    if (!validation.balanced) {
      throw new Error(validation.message || 'El asiento no cumple con la partida doble.')
    }

    const isJournalUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      input.diarioId
    )

    if (isJournalUuid) {
      try {
        const idempotencyKey = generateIdempotencyKey()
        const rateStr = formatDecimalString(input.tasaBcv, '1.0000')

        const gqlLines = input.lineas.map(l => ({
          accountId: l.cuentaId,
          debitUsd: l.debeUsd ? formatDecimalString(l.debeUsd) : undefined,
          creditUsd: l.haberUsd ? formatDecimalString(l.haberUsd) : undefined,
          debitVes: l.debeVes ? formatDecimalString(l.debeVes) : undefined,
          creditVes: l.haberVes ? formatDecimalString(l.haberVes) : undefined,
          exchangeRate: rateStr,
          contactId: l.contactoId && l.contactoId.length > 20 ? l.contactoId : undefined,
          label: l.etiqueta?.trim() || undefined
        }))

        const res = await executeGraphQL<{ createJournalEntry: { id: string; entryNumber: number; status: string } }>(
          CREATE_JOURNAL_ENTRY_MUTATION,
          {
            input: {
              journalId: input.diarioId,
              postingDate: new Date(input.fecha).toISOString(),
              description: input.notas?.trim() || 'Asiento contable',
              sourceReference: input.documentoReferencia?.trim() || undefined,
              exchangeRate: rateStr,
              idempotencyKey,
              lines: gqlLines
            }
          },
          { timeoutMs: 10000 }
        )

        if (res?.createJournalEntry?.id) {
          const entryId = res.createJournalEntry.id

          if (input.estado === 'POSTED') {
            await executeGraphQL(
              POST_JOURNAL_ENTRY_MUTATION,
              { entryId, idempotencyKey: generateIdempotencyKey() },
              { timeoutMs: 10000 }
            )
          }

          const freshEntries = await accountingService.getJournalEntries('ALL')
          const created = freshEntries.find(e => e.id === entryId)

          if (created) return created
        }
      } catch (err: unknown) {
        console.error('[accountingService] Fallback local para createJournalEntry:', err)
      throw err
      }
    }

    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const journal = journals.find(j => j.id === input.diarioId)

    const totalDebeUsd = input.lineas.reduce((acc, l) => acc + (l.debeUsd || 0), 0)
    const totalHaberUsd = input.lineas.reduce((acc, l) => acc + (l.haberUsd || 0), 0)
    const totalDebeVes = input.lineas.reduce((acc, l) => acc + (l.debeVes || 0), 0)
    const totalHaberVes = input.lineas.reduce((acc, l) => acc + (l.haberVes || 0), 0)

    const correlativo = String(entries.length + 1).padStart(5, '0')

    const newEntry: JournalEntry = {
      id: `as-${Date.now()}`,
      numeroAsiento: `AS-2026-${correlativo}`,
      fecha: input.fecha,
      diarioId: input.diarioId,
      diarioNombre: journal?.nombre || 'Diario General',
      origen: input.origen,
      documentoReferencia: input.documentoReferencia,
      estado: input.estado || 'POSTED',
      tasaBcv: input.tasaBcv,
      totalDebeUsd,
      totalHaberUsd,
      totalDebeVes,
      totalHaberVes,
      creadoPor: input.creadoPor,
      creadoEn: new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }),
      notas: input.notas,
      lineas: input.lineas.map((l, idx) => ({ ...l, id: `as-l-${Date.now()}-${idx}` }))
    }

    const updated = [newEntry, ...entries]

    setStored(STORAGE_KEYS.ENTRIES, updated)

    return newEntry
  },

  postJournalEntry: async (id: string): Promise<JournalEntry> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        await executeGraphQL(
          POST_JOURNAL_ENTRY_MUTATION,
          { entryId: id, idempotencyKey: generateIdempotencyKey() },
          { timeoutMs: 10000 }
        )

        const list = await accountingService.getJournalEntries('ALL')
        const found = list.find(e => e.id === id)

        if (found) return found
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al asentar el asiento contable en el servidor.'

        throw new Error(msg)
      }
    }

    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const updated = entries.map(e => (e.id === id ? { ...e, estado: 'POSTED' as EntryStatus } : e))

    setStored(STORAGE_KEYS.ENTRIES, updated)

    return updated.find(e => e.id === id)!
  },

  cancelJournalEntry: async (id: string, reason = 'Anulado por usuario'): Promise<JournalEntry> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        await executeGraphQL(
          CANCEL_JOURNAL_ENTRY_MUTATION,
          {
            input: {
              entryId: id,
              reason,
              idempotencyKey: generateIdempotencyKey()
            }
          },
          { timeoutMs: 10000 }
        )

        const list = await accountingService.getJournalEntries('ALL')
        const found = list.find(e => e.id === id)

        if (found) return found
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al anular el asiento contable en el servidor.'

        throw new Error(msg)
      }
    }

    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const updated = entries.map(e => (e.id === id ? { ...e, estado: 'CANCELED' as EntryStatus } : e))

    setStored(STORAGE_KEYS.ENTRIES, updated)

    return updated.find(e => e.id === id)!
  },

  reverseJournalEntry: async (id: string, reason = 'Reversión contable'): Promise<JournalEntry> => {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        await executeGraphQL(
          REVERSE_JOURNAL_ENTRY_MUTATION,
          {
            input: {
              entryId: id,
              idempotencyKey: generateIdempotencyKey(),
              exchangeRate: formatDecimalString(1, '1.0000'),
              reason
            }
          },
          { timeoutMs: 10000 }
        )

        const list = await accountingService.getJournalEntries('ALL')

        return list[0]
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al reversar el asiento contable en el servidor.'

        throw new Error(msg)
      }
    }

    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const target = entries.find(e => e.id === id)

    if (!target) throw new Error('Asiento no encontrado')

    return target
  },

  updateJournalEntry: async (
    id: string,
    input: {
      diarioId: string
      fecha: string
      documentoReferencia?: string
      estado: EntryStatus
      tasaBcv: number
      notas?: string
      lineas: Omit<JournalItem, 'id'>[]
    }
  ): Promise<JournalEntry> => {
    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const existing = entries.find(e => e.id === id)

    if (!existing) throw new Error('Asiento contable no encontrado')

    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const journal = journals.find(j => j.id === input.diarioId)

    const totalDebeUsd = Number(input.lineas.reduce((acc, l) => acc + (Number(l.debeUsd) || 0), 0).toFixed(2))
    const totalHaberUsd = Number(input.lineas.reduce((acc, l) => acc + (Number(l.haberUsd) || 0), 0).toFixed(2))
    const totalDebeVes = Number((totalDebeUsd * input.tasaBcv).toFixed(2))
    const totalHaberVes = Number((totalHaberUsd * input.tasaBcv).toFixed(2))

    if (input.estado === 'POSTED') {
      const isBalanced = Math.abs(totalDebeUsd - totalHaberUsd) <= 0.01 && totalDebeUsd > 0

      if (!isBalanced) {
        throw new Error(
          `El asiento no cumple con la partida doble: Descuadre USD: $${Math.abs(totalDebeUsd - totalHaberUsd).toFixed(2)}, Descuadre VES: ${Math.abs(totalDebeVes - totalHaberVes).toFixed(2)} Bs.`
        )
      }
    }

    const updatedEntry: JournalEntry = {
      ...existing,
      diarioId: input.diarioId,
      diarioNombre: journal?.nombre || existing.diarioNombre,
      fecha: input.fecha,
      documentoReferencia: input.documentoReferencia,
      estado: input.estado,
      tasaBcv: input.tasaBcv,
      totalDebeUsd,
      totalHaberUsd,
      totalDebeVes,
      totalHaberVes,
      notas: input.notas,
      lineas: input.lineas.map((l, idx) => ({ ...l, id: `as-l-${Date.now()}-${idx}` }))
    }

    const updated = entries.map(e => (e.id === id ? updatedEntry : e))

    setStored(STORAGE_KEYS.ENTRIES, updated)

    return updatedEntry
  },

  resetJournalEntryToDraft: async (id: string): Promise<JournalEntry> => {
    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const existing = entries.find(e => e.id === id)

    if (!existing) throw new Error('Asiento contable no encontrado')

    const updatedEntry: JournalEntry = {
      ...existing,
      estado: 'DRAFT'
    }

    const updated = entries.map(e => (e.id === id ? updatedEntry : e))

    setStored(STORAGE_KEYS.ENTRIES, updated)

    return updatedEntry
  },

  // Generador reactivo de asiento automático para Facturas
  generateInvoicePreviewEntry: (
    invoice: Pick<
      AccountingInvoice,
      | 'tipo'
      | 'contactoNombre'
      | 'contactoId'
      | 'contactoCuentaContableId'
      | 'tasaBcv'
      | 'lineas'
      | 'numeroFactura'
    >,
    accounts: Account[]
  ): JournalItem[] => {
    const cxcCxpAccount = accounts.find(a => a.id === invoice.contactoCuentaContableId) || {
      id: invoice.tipo === 'CUSTOMER' ? 'acc-110201' : 'acc-210101',
      codigo: invoice.tipo === 'CUSTOMER' ? '1.1.02.01' : '2.1.01.01',
      nombre: invoice.tipo === 'CUSTOMER' ? 'Cuentas por Cobrar Clientes' : 'Cuentas por Pagar Proveedores'
    }

    const items: JournalItem[] = []
    const totalUsd = invoice.lineas.reduce((acc, l) => acc + l.totalUsd, 0)
    const totalVes = Number((totalUsd * invoice.tasaBcv).toFixed(2))

    // Línea principal de Contacto (CxC / CxP)
    if (invoice.tipo === 'CUSTOMER') {
      items.push({
        id: 'prev-cxc',
        cuentaId: cxcCxpAccount.id,
        cuentaCodigo: cxcCxpAccount.codigo,
        cuentaNombre: cxcCxpAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Factura ${invoice.numeroFactura || 'Borrador'}`,
        debeUsd: totalUsd,
        haberUsd: 0,
        debeVes: totalVes,
        haberVes: 0
      })
    }

    // Líneas de productos / servicios
    invoice.lineas.forEach((l, idx) => {
      const lineAccount = accounts.find(a => a.id === l.cuentaContableId) || {
        id: invoice.tipo === 'CUSTOMER' ? 'acc-410101' : 'acc-510101',
        codigo: invoice.tipo === 'CUSTOMER' ? '4.1.01.01' : '5.1.01.01',
        nombre: invoice.tipo === 'CUSTOMER' ? 'Ingresos por Venta' : 'Costo de Ventas'
      }

      const subtotalVes = Number((l.subtotalUsd * invoice.tasaBcv).toFixed(2))

      items.push({
        id: `prev-lin-${idx}`,
        cuentaId: lineAccount.id,
        cuentaCodigo: lineAccount.codigo,
        cuentaNombre: lineAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: l.productoOConcepto,
        debeUsd: invoice.tipo === 'SUPPLIER' ? l.subtotalUsd : 0,
        haberUsd: invoice.tipo === 'CUSTOMER' ? l.subtotalUsd : 0,
        debeVes: invoice.tipo === 'SUPPLIER' ? subtotalVes : 0,
        haberVes: invoice.tipo === 'CUSTOMER' ? subtotalVes : 0
      })

      // Línea de IVA si aplica
      if (l.ivaUsd > 0) {
        const ivaAcc = invoice.tipo === 'CUSTOMER'
          ? { id: 'acc-210201', codigo: '2.1.02.01', nombre: 'Débito Fiscal IVA (16%)' }
          : { id: 'acc-110401', codigo: '1.1.04.01', nombre: 'Crédito Fiscal IVA (Compras)' }

        const ivaVes = Number((l.ivaUsd * invoice.tasaBcv).toFixed(2))

        items.push({
          id: `prev-iva-${idx}`,
          cuentaId: ivaAcc.id,
          cuentaCodigo: ivaAcc.codigo,
          cuentaNombre: ivaAcc.nombre,
          contactoId: invoice.contactoId,
          contactoNombre: invoice.contactoNombre,
          etiqueta: `IVA ${l.tasaImpuestoPct}% ${invoice.numeroFactura || ''}`,
          debeUsd: invoice.tipo === 'SUPPLIER' ? l.ivaUsd : 0,
          haberUsd: invoice.tipo === 'CUSTOMER' ? l.ivaUsd : 0,
          debeVes: invoice.tipo === 'SUPPLIER' ? ivaVes : 0,
          haberVes: invoice.tipo === 'CUSTOMER' ? ivaVes : 0
        })
      }
    })

    if (invoice.tipo === 'SUPPLIER') {
      items.push({
        id: 'prev-cxp',
        cuentaId: cxcCxpAccount.id,
        cuentaCodigo: cxcCxpAccount.codigo,
        cuentaNombre: cxcCxpAccount.nombre,
        contactoId: invoice.contactoId,
        contactoNombre: invoice.contactoNombre,
        etiqueta: `Factura Proveedor ${invoice.numeroFactura || 'Borrador'}`,
        debeUsd: 0,
        haberUsd: totalUsd,
        debeVes: 0,
        haberVes: totalVes
      })
    }

    return items
  },

  // Procesamiento de Pagos y Diferencial Cambiario
  createPayment: async (input: {
    contactoId: string
    contactoNombre: string
    diarioId: string
    metodoPago: Payment['metodoPago']
    moneda: CurrencyCode
    monto: number
    tasaBcvPago: number
    facturaId?: string
    aplicaIgtf?: boolean
    referenciaBancaria?: string
    cuentaBancariaId?: string
    cuentaBancariaInfo?: string
  }): Promise<{ payment: Payment; entry: JournalEntry }> => {
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const journal = journals.find(j => j.id === input.diarioId)
    const targetInvoice = input.facturaId ? invoices.find(i => i.id === input.facturaId) : undefined

    let difCambiarioVes = 0

    if (targetInvoice && input.moneda === 'VES') {
      // Diferencial Cambiario: (Tasa Pago - Tasa Emisión) * Monto USD equivalente
      const montoUsd = input.monto / input.tasaBcvPago
      const costoOriginalVes = montoUsd * targetInvoice.tasaBcv
      const costoActualVes = input.monto

      difCambiarioVes = Number((costoActualVes - costoOriginalVes).toFixed(2))
    }

    const montoIgtfUsd = input.aplicaIgtf && input.moneda === 'USD' ? Number((input.monto * 0.03).toFixed(2)) : 0
    const montoIgtfVes = input.aplicaIgtf && input.moneda === 'USD' ? Number((montoIgtfUsd * input.tasaBcvPago).toFixed(2)) : 0

    const paymentTipo: 'CUSTOMER' | 'SUPPLIER' = targetInvoice
      ? targetInvoice.tipo
      : (input.contactoId.includes('prov') ? 'SUPPLIER' : 'CUSTOMER')

    const newPayment: Payment = {
      id: `pag-${Date.now()}`,
      numeroPago: `PAG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      tipo: paymentTipo,
      fecha: new Date().toISOString().split('T')[0],
      contactoId: input.contactoId,
      contactoNombre: input.contactoNombre,
      diarioId: input.diarioId,
      diarioNombre: journal?.nombre || 'Banco',
      metodoPago: input.metodoPago,
      moneda: input.moneda,
      monto: input.monto,
      tasaBcvPago: input.tasaBcvPago,
      facturasConciliadas: targetInvoice
        ? [
            {
              facturaId: targetInvoice.id,
              numeroFactura: targetInvoice.numeroFactura,
              tasaBcvOriginal: targetInvoice.tasaBcv,
              montoAplicadoUsd: input.moneda === 'USD' ? input.monto : Number((input.monto / input.tasaBcvPago).toFixed(2)),
              montoAplicadoVes: input.moneda === 'VES' ? input.monto : Number((input.monto * input.tasaBcvPago).toFixed(2)),
              diferencialCambiarioVes: difCambiarioVes
            }
          ]
        : [],
      aplicaIgtf: Boolean(input.aplicaIgtf),
      montoIgtfUsd,
      montoIgtfVes,
      referenciaBancaria: input.referenciaBancaria,
      cuentaBancariaId: input.cuentaBancariaId,
      cuentaBancariaInfo: input.cuentaBancariaInfo,
      estado: 'CONFIRMADO',
      creadoEn: new Date().toLocaleString('es-VE')
    }

    // Generar Asiento Contable del Pago
    const entry = await accountingService.createJournalEntry({
      diarioId: input.diarioId,
      fecha: newPayment.fecha,
      origen: 'PAGO',
      documentoReferencia: newPayment.numeroPago,
      tasaBcv: input.tasaBcvPago,
      creadoPor: 'Sistema de Tesorería',
      lineas: [
        {
          cuentaId: journal?.cuentaPorDefectoId || 'acc-110102',
          cuentaCodigo: '1.1.01.02',
          cuentaNombre: journal?.nombre || 'Banco',
          etiqueta: `Cobro/Pago ${newPayment.numeroPago}`,
          debeUsd: input.moneda === 'USD' ? input.monto : Number((input.monto / input.tasaBcvPago).toFixed(2)),
          haberUsd: 0,
          debeVes: input.moneda === 'VES' ? input.monto : Number((input.monto * input.tasaBcvPago).toFixed(2)),
          haberVes: 0
        },
        {
          cuentaId: 'acc-110201',
          cuentaCodigo: '1.1.02.01',
          cuentaNombre: 'Cuentas por Cobrar / Pagar',
          etiqueta: `Conciliación ${targetInvoice?.numeroFactura || ''}`,
          debeUsd: 0,
          haberUsd: input.moneda === 'USD' ? input.monto : Number((input.monto / input.tasaBcvPago).toFixed(2)),
          debeVes: 0,
          haberVes: input.moneda === 'VES' ? input.monto : Number((input.monto * input.tasaBcvPago).toFixed(2))
        }
      ]
    })

    newPayment.asientoContableId = entry.id

    return { payment: newPayment, entry }
  },

  // Pagos a Proveedores por Lote
  getSupplierBatchItems: async (): Promise<SupplierBatchItem[]> => {
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const supplierInvoices = invoices.filter(i => i.tipo === 'SUPPLIER' && i.saldoPendienteUsd > 0)

    const bankSeeds = [
      { banco: 'Banesco Banco Universal', cuenta: '0134-0012-34-5678901234', tlf: '+58 414-9876543' },
      { banco: 'Banco Mercantil', cuenta: '0105-0890-12-3456789012', tlf: '+58 424-5551234' },
      { banco: 'BNC Banco Nacional de Crédito', cuenta: '0191-0456-78-9012345678', tlf: '+58 416-8889900' }
    ]

    return supplierInvoices.map((inv, idx) => {
      const bank = bankSeeds[idx % bankSeeds.length]

      return {
        facturaId: inv.id,
        numeroFactura: inv.numeroFactura,
        proveedorId: inv.contactoId,
        proveedorNombre: inv.contactoNombre,
        proveedorRif: inv.contactoRif,
        bancoDestino: bank.banco,
        cuentaBancaria20Digitos: bank.cuenta,
        telefonoPagoMovil: bank.tlf,
        montoPendienteUsd: inv.saldoPendienteUsd,
        montoPendienteVes: inv.saldoPendienteVes,
        montoAPagarUsd: inv.saldoPendienteUsd,
        montoAPagarVes: inv.saldoPendienteVes,
        seleccionada: false
      }
    })
  },

  processBatchPayment: async (
    items: SupplierBatchItem[],
    diarioBancoId: string,
    tasaBcv: number
  ): Promise<{ loteId: string; totalUsd: number; totalVes: number }> => {
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)
    const bankJournal = journals.find(j => j.id === diarioBancoId)

    const totalUsd = items.reduce((acc, it) => acc + it.montoAPagarUsd, 0)
    const totalVes = Number((totalUsd * tasaBcv).toFixed(2))

    const loteId = `LOTE-${Date.now().toString().slice(-6)}`

    // Actualizar estado de facturas
    const paidIds = new Set(items.map(it => it.facturaId))

    const updatedInvoices = invoices.map(inv => {
      if (paidIds.has(inv.id)) {
        return {
          ...inv,
          saldoPendienteUsd: 0,
          saldoPendienteVes: 0,
          estado: 'PAID' as const
        }
      }

      return inv
    })

    setStored(STORAGE_KEYS.INVOICES, updatedInvoices)

    // Crear Asiento Contable del Lote
    await accountingService.createJournalEntry({
      diarioId: diarioBancoId,
      fecha: new Date().toISOString().split('T')[0],
      origen: 'PAGO_LOTE',
      documentoReferencia: loteId,
      tasaBcv,
      creadoPor: 'Lote de Pagos a Proveedores',
      lineas: [
        {
          cuentaId: 'acc-210101',
          cuentaCodigo: '2.1.01.01',
          cuentaNombre: 'Cuentas por Pagar Proveedores Nacionales',
          etiqueta: `Cancelación masiva de ${items.length} facturas (Lote ${loteId})`,
          debeUsd: totalUsd,
          haberUsd: 0,
          debeVes: totalVes,
          haberVes: 0
        },
        {
          cuentaId: bankJournal?.cuentaPorDefectoId || 'acc-110102',
          cuentaCodigo: '1.1.01.02',
          cuentaNombre: bankJournal?.nombre || 'Banco Emisor',
          etiqueta: `Desembolso bancario Lote ${loteId}`,
          debeUsd: 0,
          haberUsd: totalUsd,
          debeVes: 0,
          haberVes: totalVes
        }
      ]
    })

    return { loteId, totalUsd, totalVes }
  },

  // Registro de Gasto Directo sin factura
  createDirectExpense: async (form: DirectExpenseForm): Promise<JournalEntry> => {
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const accounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)
    const bankJournal = journals.find(j => j.id === form.diarioSalidaId)

    const subtotalUsd = form.lineas.reduce((acc, l) => acc + (form.moneda === 'USD' ? l.monto : l.monto / form.tasaBcv), 0)
    const ivaUsd = form.lineas.filter(l => l.aplicaIva).reduce((acc, l) => acc + (form.moneda === 'USD' ? l.monto * 0.16 : (l.monto / form.tasaBcv) * 0.16), 0)
    const totalUsd = Number((subtotalUsd + ivaUsd).toFixed(2))
    const totalVes = Number((totalUsd * form.tasaBcv).toFixed(2))

    const entryLines: Omit<JournalItem, 'id'>[] = []

    // Líneas de gasto
    form.lineas.forEach(l => {
      const expAcc = accounts.find(a => a.id === l.cuentaGastoId) || {
        id: 'acc-610103',
        codigo: '6.1.01.03',
        nombre: 'Gastos Operativos Varios'
      }

      const mUsd = form.moneda === 'USD' ? l.monto : Number((l.monto / form.tasaBcv).toFixed(2))
      const mVes = Number((mUsd * form.tasaBcv).toFixed(2))

      entryLines.push({
        cuentaId: expAcc.id,
        cuentaCodigo: expAcc.codigo,
        cuentaNombre: expAcc.nombre,
        etiqueta: l.descripcion || form.conceptoGeneral,
        debeUsd: mUsd,
        haberUsd: 0,
        debeVes: mVes,
        haberVes: 0
      })
    })

    // Línea de Crédito Fiscal IVA si aplica
    if (ivaUsd > 0) {
      entryLines.push({
        cuentaId: 'acc-110401',
        cuentaCodigo: '1.1.04.01',
        cuentaNombre: 'Crédito Fiscal IVA (Compras)',
        etiqueta: 'IVA Gasto Directo',
        debeUsd: ivaUsd,
        haberUsd: 0,
        debeVes: Number((ivaUsd * form.tasaBcv).toFixed(2)),
        haberVes: 0
      })
    }

    // Salida del Banco / Caja
    entryLines.push({
      cuentaId: bankJournal?.cuentaPorDefectoId || 'acc-110101',
      cuentaCodigo: '1.1.01.01',
      cuentaNombre: bankJournal?.nombre || 'Caja/Banco',
      etiqueta: form.conceptoGeneral,
      debeUsd: 0,
      haberUsd: totalUsd,
      debeVes: 0,
      haberVes: totalVes
    })

    return accountingService.createJournalEntry({
      diarioId: form.diarioSalidaId,
      fecha: form.fecha,
      origen: 'GASTO_DIRECTO',
      documentoReferencia: form.beneficiario ? `Gasto: ${form.beneficiario}` : 'Gasto Directo',
      tasaBcv: form.tasaBcv,
      creadoPor: 'Registro de Gasto Directo',
      lineas: entryLines
    })
  },

  // Indicadores KPI del Dashboard
  getDashboardKpis: async (): Promise<AccountingSummaryKpis> => {
    const journals = getStored<Journal[]>(STORAGE_KEYS.JOURNALS)
    const invoices = getStored<AccountingInvoice[]>(STORAGE_KEYS.INVOICES)

    const bankJournals = journals.filter(j => j.tipo.startsWith('BANCO') || j.tipo === 'CAJA')
    const totalLiquidezUsd = bankJournals.reduce((acc, j) => acc + j.saldoActualUsd, 0)
    const totalLiquidezVes = bankJournals.reduce((acc, j) => acc + j.saldoActualVes, 0)

    const cxcInvoices = invoices.filter(i => i.tipo === 'CUSTOMER' && i.saldoPendienteUsd > 0)
    const totalPorCobrarUsd = cxcInvoices.reduce((acc, i) => acc + i.saldoPendienteUsd, 0)
    const totalPorCobrarVes = cxcInvoices.reduce((acc, i) => acc + i.saldoPendienteVes, 0)

    const cxpInvoices = invoices.filter(i => i.tipo === 'SUPPLIER' && i.saldoPendienteUsd > 0)
    const totalPorPagarUsd = cxpInvoices.reduce((acc, i) => acc + i.saldoPendienteUsd, 0)
    const totalPorPagarVes = cxpInvoices.reduce((acc, i) => acc + i.saldoPendienteVes, 0)

    // Resultado Neto estimado del mes (Ingresos - Gastos)
    const resultadoNetoMesUsd = 12450.00
    const resultadoNetoMesVes = 674790.00

    return {
      totalLiquidezUsd,
      totalLiquidezVes,
      totalPorCobrarUsd,
      totalPorCobrarVes,
      totalPorPagarUsd,
      totalPorPagarVes,
      resultadoNetoMesUsd,
      resultadoNetoMesVes
    }
  },

  // Helper para reportes: computa saldos de cuentas filtrando por movimientos confirmados (POSTED) o todos (ALL con borradores)
  getAccountsWithTargetMoves: (targetMoves: 'POSTED' | 'ALL' = 'POSTED', tasaBcv: number = 54.0): Account[] => {
    const baseAccounts = getStored<Account[]>(STORAGE_KEYS.ACCOUNTS)

    if (targetMoves === 'POSTED') {
      return baseAccounts
    }

    const entries = getStored<JournalEntry[]>(STORAGE_KEYS.ENTRIES)
    const draftEntries = entries.filter(e => e.estado === 'DRAFT')

    if (draftEntries.length === 0) {
      return baseAccounts
    }

    const deltas: Record<string, number> = {}

    draftEntries.forEach(entry => {
      entry.lineas.forEach(line => {
        const key = line.cuentaId || line.cuentaCodigo

        if (!deltas[key]) {
          deltas[key] = 0
        }

        const acc = baseAccounts.find(a => a.id === line.cuentaId || a.codigo === line.cuentaCodigo)

        const isDebitNormal = acc
          ? acc.tipo.startsWith('ASSET') || acc.tipo.startsWith('EXPENSE') || acc.tipo === 'COST_OF_GOODS'
          : true

        const net = isDebitNormal
          ? (line.debeUsd || 0) - (line.haberUsd || 0)
          : (line.haberUsd || 0) - (line.debeUsd || 0)

        deltas[key] += net
      })
    })

    return baseAccounts.map(acc => {
      const delta = deltas[acc.id] ?? deltas[acc.codigo] ?? 0

      if (delta === 0) return acc

      const newSaldoUsd = Number((acc.saldoUsd + delta).toFixed(2))
      const newSaldoVes = Number((newSaldoUsd * tasaBcv).toFixed(2))

      return {
        ...acc,
        saldoUsd: newSaldoUsd,
        saldoVes: newSaldoVes
      }
    })
  },

  // Reportes Financieros Bimonetarios en Vivo (GraphQL BE-ACC-01)
  fetchBalanceSheetLive: async (
    asOf: string = new Date().toISOString(),
    includeDrafts = false
  ): Promise<GqlBalanceSheet | null> => {
    try {
      const res = await executeGraphQL<{ balanceSheet: GqlBalanceSheet }>(
        GET_BALANCE_SHEET_QUERY,
        {
          asOf: new Date(asOf).toISOString(),
          includeDrafts
        },
        { timeoutMs: 8000 }
      )

      if (res?.balanceSheet) {
        return res.balanceSheet
      }
    } catch (err) {
      console.error('[accountingService] Error al consultar balanceSheet en vivo:', err)
      throw err
    }

    return null
  },

  fetchProfitAndLossLive: async (
    dateFrom: string,
    dateTo: string,
    includeDrafts = false
  ): Promise<GqlProfitAndLoss | null> => {
    try {
      const res = await executeGraphQL<{ profitAndLoss: GqlProfitAndLoss }>(
        GET_PROFIT_AND_LOSS_QUERY,
        {
          dateFrom: new Date(dateFrom).toISOString(),
          dateTo: new Date(dateTo).toISOString(),
          includeDrafts
        },
        { timeoutMs: 8000 }
      )

      if (res?.profitAndLoss) {
        return res.profitAndLoss
      }
    } catch (err) {
      console.error('[accountingService] Error al consultar profitAndLoss en vivo:', err)
      throw err
    }

    return null
  },

  fetchTrialBalanceLive: async (
    asOf: string = new Date().toISOString(),
    includeDrafts = false
  ): Promise<GqlTrialBalance | null> => {
    try {
      const res = await executeGraphQL<{ trialBalance: GqlTrialBalance }>(
        GET_TRIAL_BALANCE_QUERY,
        {
          asOf: new Date(asOf).toISOString(),
          includeDrafts
        },
        { timeoutMs: 8000 }
      )

      if (res?.trialBalance) {
        return res.trialBalance
      }
    } catch (err) {
      console.error('[accountingService] Error al consultar trialBalance en vivo:', err)
      throw err
    }

    return null
  },

  fetchGeneralLedgerLive: async (params: {
    dateFrom: string
    dateTo: string
    accountId?: string
    includeDrafts?: boolean
    page?: number
    pageSize?: number
  }): Promise<GqlGeneralLedger | null> => {
    try {
      const res = await executeGraphQL<{ generalLedger: GqlGeneralLedger }>(
        GET_GENERAL_LEDGER_QUERY,
        {
          dateFrom: new Date(params.dateFrom).toISOString(),
          dateTo: new Date(params.dateTo).toISOString(),
          accountId: params.accountId || undefined,
          includeDrafts: Boolean(params.includeDrafts),
          page: params.page || 1,
          pageSize: params.pageSize || 50
        },
        { timeoutMs: 8000 }
      )

      if (res?.generalLedger) {
        return res.generalLedger
      }
    } catch (err) {
      console.error('[accountingService] Error al consultar generalLedger en vivo:', err)
      throw err
    }

    return null
  },

  // Reportes Financieros Bimonetarios (VEN-NIF / Odoo Style)
  getBalanceSheet: async (tasaBcv: number, targetMoves: 'POSTED' | 'ALL' = 'POSTED'): Promise<FinancialReportRow[]> => {
    const accounts = accountingService.getAccountsWithTargetMoves(targetMoves, tasaBcv)

    const ingresosAccs = accounts.filter(a => a.tipo.startsWith('INCOME'))
    const costosAccs = accounts.filter(a => a.tipo === 'COST_OF_GOODS')
    const gastosAccs = accounts.filter(a => a.tipo.startsWith('EXPENSE'))

    const totalIngresosUsd = ingresosAccs.reduce((acc, a) => acc + a.saldoUsd, 0)
    const totalCostosUsd = costosAccs.reduce((acc, a) => acc + a.saldoUsd, 0)
    const totalGastosUsd = gastosAccs.reduce((acc, a) => acc + a.saldoUsd, 0)
    const utilidadNetaUsd = Number((totalIngresosUsd - totalCostosUsd - totalGastosUsd).toFixed(2))
    const utilidadNetaVes = Number((utilidadNetaUsd * tasaBcv).toFixed(2))

    const buildGroup = (tipoPrefix: string, titulo: string, nivel: number) => {
      const accs = accounts.filter(a => a.tipo.startsWith(tipoPrefix))
      const montoUsd = Number(accs.reduce((acc, a) => acc + a.saldoUsd, 0).toFixed(2))
      const montoVes = Number((montoUsd * tasaBcv).toFixed(2))

      return {
        concepto: titulo,
        nivel,
        esColapsable: true,
        montoUsd,
        montoVes,
        subfilas: accs.map(a => ({
          codigo: a.codigo,
          concepto: a.nombre,
          nivel: 3,
          esColapsable: false,
          montoUsd: a.saldoUsd,
          montoVes: Number((a.saldoUsd * tasaBcv).toFixed(2))
        }))
      }
    }

    const activoCorriente = buildGroup('ASSET_CURRENT', 'Activo Corriente (Circulante)', 2)
    const activoNoCorriente = buildGroup('ASSET_NON_CURRENT', 'Activo No Corriente (Fijo)', 2)
    const pasivoCorriente = buildGroup('LIABILITY_CURRENT', 'Pasivo Corriente (A Corto Plazo)', 2)
    const pasivoNoCorriente = buildGroup('LIABILITY_NON_CURRENT', 'Pasivo No Corriente (Largo Plazo)', 2)
    const patrimonioBase = buildGroup('EQUITY', 'Capital Social y Reservas', 2)

    const resultadoEjercicioRow: FinancialReportRow = {
      codigo: '3.4.01.01',
      concepto: 'Resultado del Ejercicio Actual (Utilidad / Pérdida del Período)',
      nivel: 3,
      esColapsable: false,
      montoUsd: utilidadNetaUsd,
      montoVes: utilidadNetaVes
    }

    const totalPatrimonioUsd = Number((patrimonioBase.montoUsd + utilidadNetaUsd).toFixed(2))
    const totalPatrimonioVes = Number((totalPatrimonioUsd * tasaBcv).toFixed(2))

    const patrimonio: FinancialReportRow = {
      concepto: 'Patrimonio de los Accionistas',
      nivel: 2,
      esColapsable: true,
      montoUsd: totalPatrimonioUsd,
      montoVes: totalPatrimonioVes,
      subfilas: [...(patrimonioBase.subfilas || []), resultadoEjercicioRow]
    }

    const totalActivoUsd = Number((activoCorriente.montoUsd + activoNoCorriente.montoUsd).toFixed(2))
    const totalPasivoUsd = Number((pasivoCorriente.montoUsd + pasivoNoCorriente.montoUsd).toFixed(2))

    const pasivoSubfilas = pasivoNoCorriente.subfilas && pasivoNoCorriente.subfilas.length > 0
      ? [pasivoCorriente, pasivoNoCorriente]
      : [pasivoCorriente]

    return [
      {
        concepto: '1. ACTIVOS TOTALES',
        nivel: 1,
        esColapsable: true,
        montoUsd: totalActivoUsd,
        montoVes: Number((totalActivoUsd * tasaBcv).toFixed(2)),
        subfilas: [activoCorriente, activoNoCorriente]
      },
      {
        concepto: '2. PASIVOS TOTALES',
        nivel: 1,
        esColapsable: true,
        montoUsd: totalPasivoUsd,
        montoVes: Number((totalPasivoUsd * tasaBcv).toFixed(2)),
        subfilas: pasivoSubfilas
      },
      {
        concepto: '3. PATRIMONIO NETO',
        nivel: 1,
        esColapsable: true,
        montoUsd: totalPatrimonioUsd,
        montoVes: totalPatrimonioVes,
        subfilas: [patrimonio]
      }
    ]
  },

  getProfitAndLoss: async (tasaBcv: number, targetMoves: 'POSTED' | 'ALL' = 'POSTED'): Promise<FinancialReportRow[]> => {
    const accounts = accountingService.getAccountsWithTargetMoves(targetMoves, tasaBcv)

    const ingresosOperacionalesAccs = accounts.filter(a => a.tipo === 'INCOME')
    const ingresosFinancierosAccs = accounts.filter(a => a.tipo === 'INCOME_FINANCIAL')
    const costosAccs = accounts.filter(a => a.tipo === 'COST_OF_GOODS')
    const gastosOperativosAccs = accounts.filter(a => a.tipo === 'EXPENSE_OPERATING')
    const gastosFinancierosAccs = accounts.filter(a => a.tipo === 'EXPENSE_FINANCIAL')

    const totalIngresosOperUsd = Number(ingresosOperacionalesAccs.reduce((acc, a) => acc + a.saldoUsd, 0).toFixed(2))
    const totalCostosUsd = Number(costosAccs.reduce((acc, a) => acc + a.saldoUsd, 0).toFixed(2))
    const margenBrutoUsd = Number((totalIngresosOperUsd - totalCostosUsd).toFixed(2))

    const totalGastosOperUsd = Number(gastosOperativosAccs.reduce((acc, a) => acc + a.saldoUsd, 0).toFixed(2))
    const utilidadOperativaUsd = Number((margenBrutoUsd - totalGastosOperUsd).toFixed(2))

    const totalIngresosFinancUsd = Number(ingresosFinancierosAccs.reduce((acc, a) => acc + a.saldoUsd, 0).toFixed(2))
    const totalGastosFinancUsd = Number(gastosFinancierosAccs.reduce((acc, a) => acc + a.saldoUsd, 0).toFixed(2))
    const resultadoFinancieroNetoUsd = Number((totalIngresosFinancUsd - totalGastosFinancUsd).toFixed(2))

    const utilidadNetaUsd = Number((utilidadOperativaUsd + resultadoFinancieroNetoUsd).toFixed(2))

    return [
      {
        concepto: '4.1 INGRESOS OPERACIONALES (VENTAS)',
        nivel: 1,
        esColapsable: true,
        montoUsd: totalIngresosOperUsd,
        montoVes: Number((totalIngresosOperUsd * tasaBcv).toFixed(2)),
        subfilas: ingresosOperacionalesAccs.map(a => ({
          codigo: a.codigo,
          concepto: a.nombre,
          nivel: 2,
          esColapsable: false,
          montoUsd: a.saldoUsd,
          montoVes: Number((a.saldoUsd * tasaBcv).toFixed(2))
        }))
      },
      {
        concepto: '5.1 COSTO DE VENTAS DE MERCANCÍA (COGS)',
        nivel: 1,
        esColapsable: true,
        montoUsd: totalCostosUsd,
        montoVes: Number((totalCostosUsd * tasaBcv).toFixed(2)),
        subfilas: costosAccs.map(a => ({
          codigo: a.codigo,
          concepto: a.nombre,
          nivel: 2,
          esColapsable: false,
          montoUsd: a.saldoUsd,
          montoVes: Number((a.saldoUsd * tasaBcv).toFixed(2))
        }))
      },
      {
        concepto: 'MARGEN BRUTO COMERCIAL',
        nivel: 1,
        esColapsable: false,
        montoUsd: margenBrutoUsd,
        montoVes: Number((margenBrutoUsd * tasaBcv).toFixed(2))
      },
      {
        concepto: '6.1 GASTOS OPERACIONALES Y ADMINISTRATIVOS',
        nivel: 1,
        esColapsable: true,
        montoUsd: totalGastosOperUsd,
        montoVes: Number((totalGastosOperUsd * tasaBcv).toFixed(2)),
        subfilas: gastosOperativosAccs.map(a => ({
          codigo: a.codigo,
          concepto: a.nombre,
          nivel: 2,
          esColapsable: false,
          montoUsd: a.saldoUsd,
          montoVes: Number((a.saldoUsd * tasaBcv).toFixed(2))
        }))
      },
      {
        concepto: 'UTILIDAD OPERATIVA (EBITDA)',
        nivel: 1,
        esColapsable: false,
        montoUsd: utilidadOperativaUsd,
        montoVes: Number((utilidadOperativaUsd * tasaBcv).toFixed(2))
      },
      {
        concepto: 'RESULTADO FINANCIERO Y DIFERENCIAL CAMBIARIO (VEN-NIF)',
        nivel: 1,
        esColapsable: true,
        montoUsd: resultadoFinancieroNetoUsd,
        montoVes: Number((resultadoFinancieroNetoUsd * tasaBcv).toFixed(2)),
        subfilas: [
          ...ingresosFinancierosAccs.map(a => ({
            codigo: a.codigo,
            concepto: `(+) ${a.nombre}`,
            nivel: 2,
            esColapsable: false,
            montoUsd: a.saldoUsd,
            montoVes: Number((a.saldoUsd * tasaBcv).toFixed(2))
          })),
          ...gastosFinancierosAccs.map(a => ({
            codigo: a.codigo,
            concepto: `(-) ${a.nombre}`,
            nivel: 2,
            esColapsable: false,
            montoUsd: -a.saldoUsd,
            montoVes: Number((-a.saldoUsd * tasaBcv).toFixed(2))
          }))
        ]
      },
      {
        concepto: 'RESULTADO NETO DEL EJERCICIO (UTILIDAD / PÉRDIDA NETA)',
        nivel: 1,
        esColapsable: false,
        montoUsd: utilidadNetaUsd,
        montoVes: Number((utilidadNetaUsd * tasaBcv).toFixed(2))
      }
    ]
  },

  // Mapeo Contable de Contactos
  getContactAccountingConfigs: async (): Promise<ContactAccountingConfig[]> => {
    return []
  },

  updateContactAccountingConfig: async (config: ContactAccountingConfig): Promise<ContactAccountingConfig> => {
    void config

    throw new Error(
      'La configuración contable de contactos no está expuesta por el backend; no se persiste localmente.'
    )
  }
}

/**
 * Determina si una factura de proveedor califica para generar Costos en Destino (Landed Costs).
 * Requiere que la función esté activa a nivel de ajustes del sistema, y que la factura
 * contenga al menos una línea marcada como costo en destino o con conceptos logísticos / aranceles.
 */
export const isInvoiceLandedCostEligible = (
  invoice?: AccountingInvoice | null,
  isFeatureEnabled: boolean = true
): boolean => {
  if (!invoice || !isFeatureEnabled) return false
  if (invoice.tipo !== 'SUPPLIER' || invoice.estado === 'CANCELED') return false
  if (!invoice.lineas || invoice.lineas.length === 0) return false

  return invoice.lineas.some(line => {
    if (line.isLandedCost) return true
    const concept = (line.productoOConcepto || '').toLowerCase()

    return (
      concept.includes('flete') ||
      concept.includes('arancel') ||
      concept.includes('aduana') ||
      concept.includes('desaduanamiento') ||
      concept.includes('nacionalización') ||
      concept.includes('nacionalizacion') ||
      concept.includes('landed cost') ||
      concept.includes('seguro de carga') ||
      concept.includes('transporte pesado') ||
      concept.includes('manejo de carga')
    )
  })
}
