import type {
  BcvRate,
  CreatePurchaseQuotePayload,
  PurchaseOrderConversionResponse,
  PurchaseProductLookup,
  PurchaseQuote,
  PurchaseQuoteLine,
  PurchasesFeatureFlags,
  PurchasesFilterState,
  PurchaseTotalsCalculation,
  SupplierLookup
} from '@/types/purchasesTypes'
import { fetchActiveBcvRate } from '@/services/bcvService'
import { venezuelanRifRegex } from '@/views/purchases/quotes/schemas/purchaseFormSchema'
import { createWarehouseOperationOrder } from '@/services/inventory/operationOrdersService'
import { executeGraphQL } from '@/libs/graphqlClient'
import {
  GET_PURCHASE_QUOTES_QUERY,
  GET_PURCHASE_QUOTE_QUERY,
  CREATE_PURCHASE_QUOTE_MUTATION,
  REGISTER_PURCHASE_QUOTE_MUTATION,
  APPROVE_PURCHASE_QUOTE_MUTATION,
  CONVERT_PURCHASE_QUOTE_TO_ORDER_MUTATION,
  CANCEL_PURCHASE_QUOTE_MUTATION,
  RECALCULATE_PURCHASE_QUOTE_BCV_MUTATION,
  CREATE_PURCHASE_RECEPTION_MUTATION
} from '@/graphql/purchases.gql'
import { GET_PARTNERS_QUERY } from '@/graphql/contacts.gql'
import { getInventoryTemplates, fetchStockLocations, resolveDefaultStockLocations } from '@/services/inventoryService'
import {
  serializeCreatePurchaseQuoteInput,
  serializeReceptionInput,
  mapGqlPurchaseQuoteToFrontend,
  generateIdempotencyKey,
  type GqlPurchaseQuote
} from '@/services/adapters/purchasesAdapter'

const EMPTY_BCV_RATE: BcvRate = {
  id: '',
  tasa: 0,
  fecha_valor: '',
  fuente: 'BCV_OFICIAL',
  sincronizado_at: ''
}

const DEFAULT_PURCHASES_FLAGS: PurchasesFeatureFlags = {
  IVA_COMPRAS: true,
  IGTF: true,
  SENIAT_FORMAT: true,
  STOCK_TRANSIT_MODE: 'ENABLED'
}

class PurchasesService {
  private quotes: PurchaseQuote[] = []
  private suppliers: SupplierLookup[] = []
  private products: PurchaseProductLookup[] = []
  private bcvRate: BcvRate = { ...EMPTY_BCV_RATE }
  private featureFlags: PurchasesFeatureFlags = { ...DEFAULT_PURCHASES_FLAGS }
  private quoteCounter = 1
  private orderCounter = 1

  private hydrateFromStorage(): void {
    // Sin persistencia local: los datos viven en el backend.
  }

  private persistToStorage(): void {
    // Sin persistencia local: los datos viven en el backend.
  }

  public getFeatureFlags(): PurchasesFeatureFlags {
    return { ...this.featureFlags }
  }

  public setFeatureFlags(flags: Partial<PurchasesFeatureFlags>): PurchasesFeatureFlags {
    this.featureFlags = { ...this.featureFlags, ...flags }

    return { ...this.featureFlags }
  }

  public async getActiveBcvRate(): Promise<BcvRate> {
    const result = await fetchActiveBcvRate()

    if (result.ok) {
      this.bcvRate = {
        id: result.data.rateId,
        tasa: result.data.rate,
        fecha_valor: result.data.valueDate,
        fuente: 'BCV_OFICIAL',
        sincronizado_at: result.data.capturedAt
      }

      return { ...this.bcvRate }
    }

    return {
      id: '',
      tasa: 0,
      fecha_valor: '',
      fuente: 'BCV_OFICIAL',
      sincronizado_at: ''
    }
  }

  public async updateActiveBcvRate(_nuevaTasa: number): Promise<BcvRate> {
    void _nuevaTasa

    throw new Error('La tasa BCV es administrada por el backend y no se modifica desde compras.')
  }

  // Adaptador Desacoplado: GET /api/suppliers?search= (o /api/terceros?rol=PROVEEDOR)
  public async searchSuppliers(query: string): Promise<SupplierLookup[]> {
    const q = query.toLowerCase().trim()
    const activeSuppliers = this.suppliers.filter(s => s.rol_proveedor_activo)

    if (!q) return activeSuppliers

    return activeSuppliers.filter(
      s =>
        s.razon_social.toLowerCase().includes(q) ||
        (s.nombre_comercial && s.nombre_comercial.toLowerCase().includes(q)) ||
        s.identificacion.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    )
  }

  public async getSuppliers(): Promise<SupplierLookup[]> {
    try {
      const res = await executeGraphQL<{ partners: any[] }>(
        GET_PARTNERS_QUERY,
        {
          where: { isSupplier: { equals: true }, deletedAt: { equals: null } },
          take: 100
        },
        { timeoutMs: 5000 }
      )

      if (res?.partners && Array.isArray(res.partners) && res.partners.length > 0) {
        return res.partners.map(p => ({
          id: p.id,
          identificacion: `${p.docType}-${p.docNumber}${p.checkDigit ? `-${p.checkDigit}` : ''}`,
          razon_social: p.legalName,
          nombre_comercial: p.tradeName || undefined,
          rol_proveedor_activo: Boolean(p.isSupplier),
          email: p.email || '',
          telefono: p.phone || '',
          direccion_fiscal: p.fiscalAddress || 'Venezuela',
          condicion_pago_default: 'CONTADO',
          dias_credito_default: 0,
          moneda_negociacion_default: 'USD'
        }))
      }
    } catch {
      // Fallback a proveedores en caché local
    }

    return [...this.suppliers]
  }

  // Adaptador Desacoplado: GET /api/products
  public async getPurchaseProducts(): Promise<PurchaseProductLookup[]> {
    try {
      const templates = await getInventoryTemplates()

      if (templates && templates.length > 0) {
        const mapped: PurchaseProductLookup[] = []

        templates.forEach(t => {
          t.variants.forEach(v => {
            mapped.push({
              id: v.id,
              sku: v.sku,
              nombre: `${t.name}${
                v.combinationValues && v.combinationValues.length > 0
                  ? ` (${v.combinationValues.map(c => c.valueName).join(', ')})`
                  : ''
              }`,
              descripcion: t.notes || undefined,
              uom_code: t.uomCode || 'un',
              naturaleza: t.productType === 'service' ? 'SERVICE_EXPENSE' : 'PHYSICAL_STOCK',
              is_physical_stock: t.productType !== 'service',
              manages_stock: t.productType !== 'service',
              costo_unitario_ult_compra_usd: v.costPrice || t.standardCost || 0,
              stock_fisico_actual: v.physicalStock || 0,
              stock_en_transito_actual: v.reservedStock || 0,
              alicuota_iva: (t.vatRate as any) || '16'
            })
          })
        })

        if (mapped.length > 0) return mapped
      }
    } catch {
      // Fallback
    }

    return [...this.products]
  }

  // Motor de Cálculo Bimonetario y Crédito Fiscal (Regla R4)
  public calculateTotals(
    items: {
      cantidad: number
      costo_unitario: number
      descuento_proveedor_porcentaje: number
      alicuota_iva?: '16' | '8' | '0' | 'EXEMPT'
    }[],
    tasaBcv: number,
    flags: PurchasesFeatureFlags = this.getFeatureFlags(),
    aplicaIvaCompras: boolean = true,
    aplicaIgtf: boolean = false,
    retencionIvaPorcentajeProveedor: number = 75
  ): PurchaseTotalsCalculation {
    let subtotal_usd = 0
    let descuento_usd = 0
    let base_imponible_usd = 0
    let monto_exento_usd = 0
    let credito_fiscal_iva_usd = 0

    const ivaEnabled = flags.IVA_COMPRAS && aplicaIvaCompras

    for (const item of items) {
      const qty = Number(item.cantidad) || 0
      const cost = Number(item.costo_unitario) || 0
      const discPct = Number(item.descuento_proveedor_porcentaje) || 0

      const rawLine = qty * cost
      const discountLine = rawLine * (discPct / 100)
      const netLine = rawLine - discountLine

      subtotal_usd += rawLine
      descuento_usd += discountLine

      if (ivaEnabled) {
        const alicuota = item.alicuota_iva || '16'

        if (alicuota === 'EXEMPT' || alicuota === '0') {
          monto_exento_usd += netLine
        } else {
          const rateNum = alicuota === '8' ? 8 : 16

          base_imponible_usd += netLine
          credito_fiscal_iva_usd += netLine * (rateNum / 100)
        }
      } else {
        monto_exento_usd += netLine
      }
    }

    const neto_imponible_usd = subtotal_usd - descuento_usd
    const igtf_usd = flags.IGTF && aplicaIgtf ? (neto_imponible_usd + credito_fiscal_iva_usd) * 0.03 : 0
    const total_usd = neto_imponible_usd + credito_fiscal_iva_usd + igtf_usd

    const subtotal_ves = subtotal_usd * tasaBcv
    const descuento_ves = descuento_usd * tasaBcv
    const base_imponible_ves = base_imponible_usd * tasaBcv
    const monto_exento_ves = monto_exento_usd * tasaBcv
    const neto_imponible_ves = neto_imponible_usd * tasaBcv
    const credito_fiscal_iva_ves = credito_fiscal_iva_usd * tasaBcv
    const igtf_ves = igtf_usd * tasaBcv
    const total_ves = total_usd * tasaBcv

    const retencion_iva_estimada_ves =
      ivaEnabled && flags.SENIAT_FORMAT
        ? credito_fiscal_iva_ves * ((retencionIvaPorcentajeProveedor || 0) / 100)
        : 0

    return {
      subtotal_usd: Number(subtotal_usd.toFixed(2)),
      descuento_usd: Number(descuento_usd.toFixed(2)),
      base_imponible_usd: Number(base_imponible_usd.toFixed(2)),
      monto_exento_usd: Number(monto_exento_usd.toFixed(2)),
      neto_imponible_usd: Number(neto_imponible_usd.toFixed(2)),
      credito_fiscal_iva_usd: Number(credito_fiscal_iva_usd.toFixed(2)),
      igtf_usd: Number(igtf_usd.toFixed(2)),
      total_usd: Number(total_usd.toFixed(2)),

      subtotal_ves: Number(subtotal_ves.toFixed(2)),
      descuento_ves: Number(descuento_ves.toFixed(2)),
      base_imponible_ves: Number(base_imponible_ves.toFixed(2)),
      monto_exento_ves: Number(monto_exento_ves.toFixed(2)),
      neto_imponible_ves: Number(neto_imponible_ves.toFixed(2)),
      credito_fiscal_iva_ves: Number(credito_fiscal_iva_ves.toFixed(2)),
      igtf_ves: Number(igtf_ves.toFixed(2)),
      total_ves: Number(total_ves.toFixed(2)),
      retencion_iva_estimada_ves: Number(retencion_iva_estimada_ves.toFixed(2))
    }
  }

  // Verificar si una Solicitud tiene vigencia expirada o cambio de tasa BCV (HU3 - EARS-EX-03)
  public evaluateApprovalReadiness(quote: PurchaseQuote): {
    canApproveDirectly: boolean
    isRateChanged: boolean
    isValidityExpired: boolean
    activeRate: number
    quoteRate: number
    warningMessage?: string
  } {
    const today = new Date().toISOString().split('T')[0]
    const isValidityExpired = quote.fecha_vencimiento_cotizacion < today
    const isRateChanged = Math.abs(quote.tasa_bcv.tasa - this.bcvRate.tasa) > 0.001

    if (isValidityExpired || isRateChanged) {
      return {
        canApproveDirectly: false,
        isRateChanged,
        isValidityExpired,
        activeRate: this.bcvRate.tasa,
        quoteRate: quote.tasa_bcv.tasa,
        warningMessage: 'La tasa BCV o vigencia ha cambiado, actualice los costos del presupuesto'
      }
    }

    return {
      canApproveDirectly: true,
      isRateChanged: false,
      isValidityExpired: false,
      activeRate: this.bcvRate.tasa,
      quoteRate: quote.tasa_bcv.tasa
    }
  }

  // HU2: Consultar y Listar Compras (GET /api/purchases/quotes)
  public async getPurchaseQuotes(filters?: PurchasesFilterState): Promise<PurchaseQuote[]> {
    this.hydrateFromStorage()

    try {
      const res = await executeGraphQL<{ purchaseQuotes: GqlPurchaseQuote[] }>(
        GET_PURCHASE_QUOTES_QUERY,
        { take: 100 },
        { timeoutMs: 5000 }
      )

      if (res?.purchaseQuotes && Array.isArray(res.purchaseQuotes)) {
        const mapped = res.purchaseQuotes.map(q => mapGqlPurchaseQuoteToFrontend(q, this.bcvRate.tasa))

        this.quotes = mapped
      }
    } catch (err) {
      console.warn('[purchasesService] Error al consultar purchaseQuotes en backend:', err)
    }

    let result = [...this.quotes]

    if (filters) {
      if (filters.estado && filters.estado !== 'ALL') {
        result = result.filter(q => q.estado === filters.estado)
      }

      if (filters.proveedor_id && filters.proveedor_id !== 'ALL') {
        result = result.filter(q => q.proveedor.id === filters.proveedor_id)
      }

      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim()

        result = result.filter(
          item =>
            item.correlativo.toLowerCase().includes(q) ||
            (item.correlativo_orden_compra && item.correlativo_orden_compra.toLowerCase().includes(q)) ||
            (item.referencia_proveedor && item.referencia_proveedor.toLowerCase().includes(q)) ||
            item.proveedor.razon_social.toLowerCase().includes(q) ||
            item.proveedor.identificacion.toLowerCase().includes(q) ||
            (item.proveedor.nombre_comercial && item.proveedor.nombre_comercial.toLowerCase().includes(q))
        )
      }

      if (filters.fecha_desde) {
        result = result.filter(item => item.fecha_registro >= filters.fecha_desde!)
      }

      if (filters.fecha_hasta) {
        result = result.filter(item => item.fecha_registro <= filters.fecha_hasta!)
      }
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // HU2: Obtener Detalle por ID (GET /api/purchases/quotes/{id})
  public async getPurchaseQuoteById(id: string): Promise<PurchaseQuote | null> {
    this.hydrateFromStorage()

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      try {
        const res = await executeGraphQL<{ purchaseQuote: GqlPurchaseQuote }>(
          GET_PURCHASE_QUOTE_QUERY,
          { id },
          { timeoutMs: 5000 }
        )

        if (res?.purchaseQuote) {
          const mapped = mapGqlPurchaseQuoteToFrontend(res.purchaseQuote, this.bcvRate.tasa)
          const idx = this.quotes.findIndex(q => q.id === id)

          if (idx !== -1) {
            this.quotes[idx] = mapped
          } else {
            this.quotes.unshift(mapped)
          }

          return mapped
        }
      } catch (err) {
        console.warn('[purchasesService] Error al consultar purchaseQuote por ID:', err)
      }
    }

    const found = this.quotes.find(q => q.id === id)

    return found ? { ...found } : null
  }

  // HU1: Crear Solicitud de Cotización / Presupuesto de Compra (POST /api/purchases/quotes)
  public async createPurchaseQuote(payload: CreatePurchaseQuotePayload): Promise<PurchaseQuote> {
    const isSupplierUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      payload.proveedor_id
    )

    if (isSupplierUuid) {
      if (!payload.items || payload.items.length === 0) {
        throw new Error('Debe incluir al menos un ítem en la solicitud de compra.')
      }

      for (let i = 0; i < payload.items.length; i++) {
        const it = payload.items[i]

        const isVarUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          it.producto_id
        )

        if (!isVarUuid) {
          throw new Error(
            `El producto en la línea ${i + 1} no es una variante sincronizada con el backend (requiere UUID). Seleccione un producto del catálogo.`
          )
        }
      }

      const idempotencyKey = generateIdempotencyKey()
      const input = serializeCreatePurchaseQuoteInput(payload, idempotencyKey)

      const res = await executeGraphQL<{ createPurchaseQuote: GqlPurchaseQuote }>(
        CREATE_PURCHASE_QUOTE_MUTATION,
        { input },
        { timeoutMs: 10000 }
      )

      if (res?.createPurchaseQuote) {
        let created = mapGqlPurchaseQuoteToFrontend(res.createPurchaseQuote, this.bcvRate.tasa)

        // Si se solicitó registrar de inmediato como RFQ, ejecutar mutación de registro
        if (payload.registrar_cotizacion_inmediatamente) {
          try {
            const regRes = await executeGraphQL<{ registerPurchaseQuote: GqlPurchaseQuote }>(
              REGISTER_PURCHASE_QUOTE_MUTATION,
              {
                input: {
                  quoteId: created.id,
                  idempotencyKey: generateIdempotencyKey()
                }
              },
              { timeoutMs: 8000 }
            )

            if (regRes?.registerPurchaseQuote) {
              created = mapGqlPurchaseQuoteToFrontend(regRes.registerPurchaseQuote, this.bcvRate.tasa)
            }
          } catch (err) {
            console.warn('[purchasesService] Error al registrar inmediatamente la RFQ:', err)
          }
        }

        this.quotes.unshift(created)
        this.persistToStorage()

        return created
      }

      throw new Error('El backend no retornó los datos de la cotización de compra creada.')
    }

    const flags = this.getFeatureFlags()

    const supplier = this.suppliers.find(s => s.id === payload.proveedor_id)

    if (!supplier) {
      throw new Error('El proveedor seleccionado no existe.')
    }

    if (flags.SENIAT_FORMAT) {
      if (!venezuelanRifRegex.test(supplier.identificacion) || !supplier.rol_proveedor_activo) {
        throw new Error('El proveedor seleccionado no posee un RIF válido o no está activo para compras.')
      }
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Debe incluir al menos un ítem en la solicitud de compra.')
    }

    for (const line of payload.items) {
      if (line.cantidad <= 0 || line.costo_unitario <= 0) {
        throw new Error('Toda línea de compra debe tener cantidad y costo unitario mayores a cero (> 0).')
      }
    }

    const aplicaIva = payload.aplica_iva_compras ?? true
    const aplicaIgtf = payload.aplica_igtf ?? false
    const tasa = this.bcvRate.tasa

    const lines: PurchaseQuoteLine[] = payload.items.map((it, idx) => {
      const prod = this.products.find(p => p.id === it.producto_id)
      const isPhysical = prod ? prod.is_physical_stock : true
      const sku = prod ? prod.sku : `INS-${idx + 1}`
      const name = prod ? prod.nombre : `Ítem ${idx + 1}`
      const uom = prod ? prod.uom_code : 'un'
      const raw = it.cantidad * it.costo_unitario
      const discount = (raw * (it.descuento_proveedor_porcentaje || 0)) / 100
      const subtotalNeto = raw - discount
      const alicuota = it.alicuota_iva || prod?.alicuota_iva || '16'
      const isExempt = !flags.IVA_COMPRAS || !aplicaIva || alicuota === 'EXEMPT' || alicuota === '0'
      const vatPct = isExempt ? 0 : alicuota === '8' ? 8 : 16
      const vatAmount = subtotalNeto * (vatPct / 100)

      return {
        id: `pline-${Date.now()}-${idx}`,
        producto_id: it.producto_id,
        producto_sku: sku,
        producto_nombre: name,
        uom_code: uom,
        is_physical_stock: isPhysical,
        cantidad: it.cantidad,
        costo_unitario: it.costo_unitario,
        descuento_proveedor_porcentaje: it.descuento_proveedor_porcentaje || 0,
        monto_descuento: Number(discount.toFixed(2)),
        subtotal_neto: Number(subtotalNeto.toFixed(2)),
        alicuota_iva: isExempt ? 'EXEMPT' : alicuota,
        monto_credito_fiscal_iva: Number(vatAmount.toFixed(2)),
        total_linea: Number((subtotalNeto + vatAmount).toFixed(2))
      }
    })

    const totals = this.calculateTotals(
      lines,
      tasa,
      flags,
      aplicaIva,
      aplicaIgtf,
      supplier.retencion_iva_porcentaje || 75
    )

    const isRegistered = Boolean(payload.registrar_cotizacion_inmediatamente)

    const correlativo = isRegistered
      ? `SC-2026-${String(this.quoteCounter++).padStart(4, '0')}`
      : 'BORRADOR'

    const today = new Date().toISOString().split('T')[0]

    const newQuote: PurchaseQuote = {
      id: `pur-${Date.now()}`,
      correlativo,
      referencia_proveedor: payload.referencia_proveedor?.trim() || undefined,
      proveedor: supplier,
      estado: isRegistered ? 'RFQ_SENT' : 'DRAFT',
      condicion_pago: payload.condicion_pago,
      dias_credito: payload.condicion_pago === 'CONTADO' ? 0 : payload.dias_credito,
      moneda_base: payload.moneda_base,
      tasa_bcv: { ...this.bcvRate },
      fecha_registro: today,
      fecha_vencimiento_cotizacion: payload.fecha_vencimiento_cotizacion,
      fecha_estimada_entrega: payload.fecha_estimada_entrega,
      aplica_iva_compras: aplicaIva,
      aplica_igtf: aplicaIgtf,
      items: lines,
      subtotal_usd: totals.subtotal_usd,
      descuento_total_usd: totals.descuento_usd,
      base_imponible_usd: totals.base_imponible_usd,
      monto_exento_usd: totals.monto_exento_usd,
      credito_fiscal_iva_usd: totals.credito_fiscal_iva_usd,
      igtf_usd: totals.igtf_usd,
      total_usd: totals.total_usd,
      subtotal_ves: totals.subtotal_ves,
      descuento_total_ves: totals.descuento_ves,
      base_imponible_ves: totals.base_imponible_ves,
      monto_exento_ves: totals.monto_exento_ves,
      credito_fiscal_iva_ves: totals.credito_fiscal_iva_ves,
      igtf_ves: totals.igtf_ves,
      total_ves: totals.total_ves,
      retencion_iva_estimada_ves: totals.retencion_iva_estimada_ves,
      observaciones: payload.observaciones,
      terminos_negociacion: payload.terminos_negociacion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    this.quotes.unshift(newQuote)
    this.persistToStorage()
    
return { ...newQuote }
  }

  // Actualizar Solicitud existente en DRAFT o RFQ_SENT
  public async updatePurchaseQuote(id: string, payload: CreatePurchaseQuotePayload): Promise<PurchaseQuote> {
    const idx = this.quotes.findIndex(q => q.id === id)

    if (idx === -1) {
      throw new Error('La solicitud de compra no existe.')
    }

    const existing = this.quotes[idx]

    if (existing.estado !== 'DRAFT' && existing.estado !== 'RFQ_SENT') {
      throw new Error('Solo se pueden modificar solicitudes en estado Borrador o Cotización Registrada.')
    }

    const supplier = this.suppliers.find(s => s.id === payload.proveedor_id) || existing.proveedor
    const flags = this.getFeatureFlags()
    const aplicaIva = payload.aplica_iva_compras ?? existing.aplica_iva_compras
    const aplicaIgtf = payload.aplica_igtf ?? Boolean(existing.aplica_igtf)
    const tasa = this.bcvRate.tasa

    const lines: PurchaseQuoteLine[] = payload.items.map((it, lineIdx) => {
      const prod = this.products.find(p => p.id === it.producto_id)
      const isPhysical = prod ? prod.is_physical_stock : true
      const sku = prod ? prod.sku : `INS-${lineIdx + 1}`
      const name = prod ? prod.nombre : `Ítem ${lineIdx + 1}`
      const uom = prod ? prod.uom_code : 'un'
      const raw = it.cantidad * it.costo_unitario
      const discount = (raw * (it.descuento_proveedor_porcentaje || 0)) / 100
      const subtotalNeto = raw - discount
      const alicuota = it.alicuota_iva || prod?.alicuota_iva || '16'
      const isExempt = !flags.IVA_COMPRAS || !aplicaIva || alicuota === 'EXEMPT' || alicuota === '0'
      const vatPct = isExempt ? 0 : alicuota === '8' ? 8 : 16
      const vatAmount = subtotalNeto * (vatPct / 100)

      return {
        id: `pline-${Date.now()}-${lineIdx}`,
        producto_id: it.producto_id,
        producto_sku: sku,
        producto_nombre: name,
        uom_code: uom,
        is_physical_stock: isPhysical,
        cantidad: it.cantidad,
        costo_unitario: it.costo_unitario,
        descuento_proveedor_porcentaje: it.descuento_proveedor_porcentaje || 0,
        monto_descuento: Number(discount.toFixed(2)),
        subtotal_neto: Number(subtotalNeto.toFixed(2)),
        alicuota_iva: isExempt ? 'EXEMPT' : alicuota,
        monto_credito_fiscal_iva: Number(vatAmount.toFixed(2)),
        total_linea: Number((subtotalNeto + vatAmount).toFixed(2))
      }
    })

    const totals = this.calculateTotals(
      lines,
      tasa,
      flags,
      aplicaIva,
      aplicaIgtf,
      supplier.retencion_iva_porcentaje || 75
    )

    const shouldRegister = Boolean(payload.registrar_cotizacion_inmediatamente)
    const nextEstado = shouldRegister ? 'RFQ_SENT' : existing.estado

    const nextCorrelativo =
      existing.correlativo === 'BORRADOR' && nextEstado === 'RFQ_SENT'
        ? `SC-2026-${String(this.quoteCounter++).padStart(4, '0')}`
        : existing.correlativo

    const updated: PurchaseQuote = {
      ...existing,
      correlativo: nextCorrelativo,
      referencia_proveedor: payload.referencia_proveedor?.trim() || undefined,
      proveedor: supplier,
      estado: nextEstado,
      condicion_pago: payload.condicion_pago,
      dias_credito: payload.condicion_pago === 'CONTADO' ? 0 : payload.dias_credito,
      moneda_base: payload.moneda_base,
      tasa_bcv: { ...this.bcvRate },
      fecha_vencimiento_cotizacion: payload.fecha_vencimiento_cotizacion,
      fecha_estimada_entrega: payload.fecha_estimada_entrega,
      aplica_iva_compras: aplicaIva,
      aplica_igtf: aplicaIgtf,
      items: lines,
      subtotal_usd: totals.subtotal_usd,
      descuento_total_usd: totals.descuento_usd,
      base_imponible_usd: totals.base_imponible_usd,
      monto_exento_usd: totals.monto_exento_usd,
      credito_fiscal_iva_usd: totals.credito_fiscal_iva_usd,
      igtf_usd: totals.igtf_usd,
      total_usd: totals.total_usd,
      subtotal_ves: totals.subtotal_ves,
      descuento_total_ves: totals.descuento_ves,
      base_imponible_ves: totals.base_imponible_ves,
      monto_exento_ves: totals.monto_exento_ves,
      credito_fiscal_iva_ves: totals.credito_fiscal_iva_ves,
      igtf_ves: totals.igtf_ves,
      total_ves: totals.total_ves,
      retencion_iva_estimada_ves: totals.retencion_iva_estimada_ves,
      observaciones: payload.observaciones,
      terminos_negociacion: payload.terminos_negociacion,
      updated_at: new Date().toISOString()
    }

    this.quotes[idx] = updated
    this.persistToStorage()
    
return { ...updated }
  }

  // HU3: Recalcular con nueva tasa BCV y renovar vigencia (EARS-EV-09)
  public async recalculatePurchaseQuoteBcv(id: string): Promise<PurchaseQuote> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      const res = await executeGraphQL<{ recalculatePurchaseQuoteBcv: GqlPurchaseQuote }>(
        RECALCULATE_PURCHASE_QUOTE_BCV_MUTATION,
        {
          input: {
            quoteId: id,
            idempotencyKey: generateIdempotencyKey()
          }
        },
        { timeoutMs: 10000 }
      )

      if (res?.recalculatePurchaseQuoteBcv) {
        const recalculated = mapGqlPurchaseQuoteToFrontend(res.recalculatePurchaseQuoteBcv, this.bcvRate.tasa)
        const idx = this.quotes.findIndex(q => q.id === id)

        if (idx !== -1) this.quotes[idx] = recalculated
        this.persistToStorage()

        return recalculated
      }
    }

    const idx = this.quotes.findIndex(q => q.id === id)

    if (idx === -1) {
      throw new Error('Solicitud de compra no encontrada.')
    }

    const quote = this.quotes[idx]
    const flags = this.getFeatureFlags()
    const activeBcv = { ...this.bcvRate }

    const totals = this.calculateTotals(
      quote.items,
      activeBcv.tasa,
      flags,
      quote.aplica_iva_compras,
      Boolean(quote.aplica_igtf),
      quote.proveedor.retencion_iva_porcentaje || 75
    )

    const today = new Date().toISOString().split('T')[0]
    const futureValidity = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const validUntil =
      quote.fecha_vencimiento_cotizacion < today ? futureValidity : quote.fecha_vencimiento_cotizacion

    const updated: PurchaseQuote = {
      ...quote,
      tasa_bcv: activeBcv,
      fecha_vencimiento_cotizacion: validUntil,
      subtotal_ves: totals.subtotal_ves,
      descuento_total_ves: totals.descuento_ves,
      base_imponible_ves: totals.base_imponible_ves,
      monto_exento_ves: totals.monto_exento_ves,
      credito_fiscal_iva_ves: totals.credito_fiscal_iva_ves,
      igtf_ves: totals.igtf_ves,
      total_ves: totals.total_ves,
      retencion_iva_estimada_ves: totals.retencion_iva_estimada_ves,
      updated_at: new Date().toISOString()
    }

    this.quotes[idx] = updated
    this.persistToStorage()

    return { ...updated }
  }

  // HU3: Aprobar Presupuesto de Compra (PUT /api/purchases/quotes/{id}/status)
  public async approvePurchaseQuote(id: string): Promise<PurchaseQuote> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      const idempotencyKey = generateIdempotencyKey()

      const res = await executeGraphQL<{ approvePurchaseQuote: GqlPurchaseQuote }>(
        APPROVE_PURCHASE_QUOTE_MUTATION,
        { input: { quoteId: id, idempotencyKey } },
        { timeoutMs: 10000 }
      )

      if (res?.approvePurchaseQuote) {
        const approved = mapGqlPurchaseQuoteToFrontend(res.approvePurchaseQuote, this.bcvRate.tasa)
        const idx = this.quotes.findIndex(q => q.id === id)

        if (idx !== -1) this.quotes[idx] = approved
        this.persistToStorage()

        return approved
      }

      throw new Error('No se pudo confirmar la aprobación de la cotización en el servidor.')
    }

    const idx = this.quotes.findIndex(q => q.id === id)

    if (idx === -1) {
      throw new Error('Solicitud de compra no encontrada.')
    }

    const quote = this.quotes[idx]
    const readiness = this.evaluateApprovalReadiness(quote)

    if (!readiness.canApproveDirectly) {
      throw new Error(
        readiness.warningMessage || 'La tasa BCV o vigencia ha cambiado, actualice los costos del presupuesto'
      )
    }

    const correlativo =
      quote.correlativo === 'BORRADOR'
        ? `SC-2026-${String(this.quoteCounter++).padStart(4, '0')}`
        : quote.correlativo

    const updated: PurchaseQuote = {
      ...quote,
      correlativo,
      estado: 'APPROVED',
      aprobado_por: 'Comprador / Gerencia de Abastecimiento',
      aprobado_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    this.quotes[idx] = updated
    this.persistToStorage()

    return { ...updated }
  }

  // HU4: Anular Solicitud/Orden de Compra (PUT /api/purchases/quotes/{id}/cancel - Soft Delete)
  public async cancelPurchaseQuote(id: string, motivo_anulacion: string): Promise<PurchaseQuote> {
    if (!motivo_anulacion || motivo_anulacion.trim().length < 5) {
      throw new Error('El motivo de anulación es obligatorio (mínimo 5 caracteres).')
    }

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    if (isUuid) {
      const idempotencyKey = generateIdempotencyKey()

      const res = await executeGraphQL<{ cancelPurchaseQuote: GqlPurchaseQuote }>(
        CANCEL_PURCHASE_QUOTE_MUTATION,
        { input: { quoteId: id, reason: motivo_anulacion.trim(), idempotencyKey } },
        { timeoutMs: 10000 }
      )

      if (res?.cancelPurchaseQuote) {
        const canceled = mapGqlPurchaseQuoteToFrontend(res.cancelPurchaseQuote, this.bcvRate.tasa)
        const idx = this.quotes.findIndex(q => q.id === id)

        if (idx !== -1) this.quotes[idx] = canceled
        this.persistToStorage()

        return canceled
      }

      throw new Error('No se pudo anular la cotización en el servidor.')
    }

    const idx = this.quotes.findIndex(q => q.id === id)

    if (idx === -1) {
      throw new Error('Registro de compra no encontrado.')
    }

    const quote = this.quotes[idx]

    const updated: PurchaseQuote = {
      ...quote,
      estado: 'CANCELED',
      motivo_anulacion: motivo_anulacion.trim(),
      updated_at: new Date().toISOString()
    }

    this.quotes[idx] = updated
    this.persistToStorage()

    return { ...updated }
  }

  // HU5: Convertir a Orden de Compra en Firme (POST /api/purchases/orders/from-quote/{quote_id})
  public async convertQuoteToPurchaseOrder(quoteId: string): Promise<PurchaseOrderConversionResponse> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(quoteId)

    if (isUuid) {
      const idempotencyKey = generateIdempotencyKey()

      const res = await executeGraphQL<{ convertQuoteToPurchaseOrder: { id: string; code: string; state: string } }>(
        CONVERT_PURCHASE_QUOTE_TO_ORDER_MUTATION,
        { input: { quoteId, idempotencyKey } },
        { timeoutMs: 10000 }
      )

      if (res?.convertQuoteToPurchaseOrder) {
        const order = res.convertQuoteToPurchaseOrder
        const idx = this.quotes.findIndex(q => q.id === quoteId)

        if (idx !== -1) {
          this.quotes[idx] = {
            ...this.quotes[idx],
            estado: 'PURCHASE_ORDER',
            correlativo_orden_compra: order.code,
            updated_at: new Date().toISOString()
          }
          this.persistToStorage()
        }

        return {
          success: true,
          purchase_order_id: order.id,
          correlativo_orden_compra: order.code,
          quote_id: quoteId,
          estado: 'PURCHASE_ORDER',
          lineas_fisicas_en_transito: [],
          habilitada_recepcion_almacen: true,
          habilitada_factura_cxp: true,
          message: `Orden de Compra ${order.code} confirmada exitosamente en el servidor.`,
          created_at: new Date().toISOString()
        }
      }

      throw new Error('El backend no retornó los datos de la orden de compra convertida.')
    }

    const idx = this.quotes.findIndex(q => q.id === quoteId)

    if (idx === -1) {
      throw new Error('La solicitud de compra no existe.')
    }

    const quote = this.quotes[idx]

    if (quote.estado !== 'APPROVED') {
      throw new Error('Solo se puede generar una Orden de Compra a partir de un presupuesto en estado APROBADO.')
    }

    const correlativoOC = `OC-2026-${String(this.orderCounter++).padStart(4, '0')}`
    const flags = this.getFeatureFlags()

    // Filtrar únicamente los ítems físicos (is_physical_stock === true) para incrementar stock_en_transito
    const lineasFisicasEnTransito =
      flags.STOCK_TRANSIT_MODE === 'ENABLED'
        ? quote.items
            .filter(line => line.is_physical_stock)
            .map(line => {
              const prod = this.products.find(p => p.id === line.producto_id)

              if (prod) {
                prod.stock_en_transito_actual += line.cantidad
              }

              
return {
                producto_id: line.producto_id,
                producto_sku: line.producto_sku,
                cantidad_en_transito_sumada: line.cantidad
              }
            })
        : []

    // La notificación de mercancía en tránsito ya no se persiste localmente.
    void lineasFisicasEnTransito

    const nowIso = new Date().toISOString()

    const updatedQuote: PurchaseQuote = {
      ...quote,
      estado: 'PURCHASE_ORDER',
      correlativo_orden_compra: correlativoOC,
      orden_compra_generada_at: nowIso,
      stock_transito_notificado: lineasFisicasEnTransito.length > 0,
      updated_at: nowIso
    }

    this.quotes[idx] = updatedQuote
    this.persistToStorage()

    const physicalCount = lineasFisicasEnTransito.length

    const msg =
      physicalCount > 0
        ? `Orden de Compra ${correlativoOC} emitida en firme. Se sumaron ${physicalCount} ítem(s) físicos a stock en tránsito y se habilitó para Recepción de Almacén y Factura CxP.`
        : `Orden de Compra ${correlativoOC} emitida en firme (Modalidad Servicios / Sin recepción física de almacén). Habilitada para Factura CxP.`

    return {
      success: true,
      purchase_order_id: `po-${Date.now()}`,
      correlativo_orden_compra: correlativoOC,
      quote_id: quote.id,
      estado: 'PURCHASE_ORDER',
      lineas_fisicas_en_transito: lineasFisicasEnTransito,
      habilitada_recepcion_almacen: physicalCount > 0,
      habilitada_factura_cxp: true,
      message: msg,
      created_at: nowIso
    }
  }

  // Crear Orden de Recepción vinculada en Almacén (SPEC-009)
  public async createReceptionForPurchase(purchaseId: string): Promise<{ success: boolean; codigo: string; operationId: string; message: string }> {
    const idx = this.quotes.findIndex(q => q.id === purchaseId)

    if (idx === -1) throw new Error('Orden de compra no encontrada.')

    const q = this.quotes[idx]

    if (q.estado !== 'PURCHASE_ORDER') {
      throw new Error('Solo se pueden generar recepciones para órdenes de compra confirmadas (OC-2026-XXXX).')
    }

    const physicalLines = q.items.filter(it => it.is_physical_stock)

    if (physicalLines.length === 0) {
      throw new Error('Esta orden de compra solo contiene servicios o gastos no inventariables; no requiere recepción física.')
    }

    const docOrigen = q.correlativo_orden_compra || q.correlativo

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(purchaseId)

    if (isUuid) {
      try {
        const locations = await fetchStockLocations()
        const defaultLoc = await resolveDefaultStockLocations()
        const warehouseId = locations.find(l => l.warehouseId)?.warehouseId || defaultLoc.internalLocationId

        const receptionInput = serializeReceptionInput({
          orderId: purchaseId,
          warehouseId,
          lines: physicalLines.map(l => ({
            variantId: l.producto_id,
            quantityReceived: l.cantidad
          }))
        })

        await executeGraphQL(
          CREATE_PURCHASE_RECEPTION_MUTATION,
          { input: receptionInput },
          { timeoutMs: 10000 }
        )
      } catch (err) {
        console.warn('[purchasesService] No se pudo crear recepción directa en backend:', err)
      }
    }

    const opLines = physicalLines.map(line => ({
      producto_id: line.producto_id,
      producto_nombre: line.producto_nombre,
      variante_id: `var-${line.producto_id}`,
      variante_sku: line.producto_sku,
      uom_code: line.uom_code || 'un',
      cantidad_demanda: line.cantidad,
      cantidad_procesada: line.cantidad,
      costo_unitario_usd: line.costo_unitario
    }))

    const opOrder = await createWarehouseOperationOrder({
      tipo: 'RECEIPT',
      tercero_nombre: q.proveedor.razon_social,
      documento_origen: docOrigen,
      almacen_origen_nombre: `Proveedor: ${q.proveedor.razon_social}`,
      almacen_destino_nombre: 'Almacén Central',
      fecha_programada: new Date().toISOString().slice(0, 10),
      notas: `Recepción generada desde orden de compra ${docOrigen}`,
      estado: 'READY',
      lineas: opLines
    })

    this.quotes[idx] = {
      ...q,
      almacen_operacion_id: opOrder.id,
      almacen_operacion_codigo: opOrder.codigo,
      updated_at: new Date().toISOString()
    }
    this.persistToStorage()

    return {
      success: true,
      codigo: opOrder.codigo,
      operationId: opOrder.id,
      message: `Orden de Recepción ${opOrder.codigo} generada exitosamente en Almacén.`
    }
  }

  // Registrar recepción efectiva ejecutada por almacén (actualiza cantidad_recibida)
  public recordReceptionOperation(originRef: string, operationCode: string, lines: { producto_id: string; cantidad: number }[]): void {
    this.hydrateFromStorage()
    const idx = this.quotes.findIndex(q => q.correlativo_orden_compra === originRef || q.correlativo === originRef || q.id === originRef)

    if (idx === -1) return

    const q = this.quotes[idx]

    const updatedItems = q.items.map(item => {
      const match = lines.find(l => l.producto_id === item.producto_id)

      if (match) {
        return {
          ...item,
          cantidad_recibida: (item.cantidad_recibida || 0) + match.cantidad
        }
      }

      
return item
    })

    this.quotes[idx] = {
      ...q,
      almacen_operacion_codigo: operationCode,
      items: updatedItems,
      updated_at: new Date().toISOString()
    }
    this.persistToStorage()
  }

  // Registrar factura de proveedor registrada en CxP (actualiza cantidad_facturada y enlace)
  public recordSupplierInvoiceLink(originRef: string, invoiceId: string, invoiceNumber: string, billedLines?: { producto_id: string; cantidad: number }[]): void {
    this.hydrateFromStorage()
    const idx = this.quotes.findIndex(q => q.correlativo_orden_compra === originRef || q.correlativo === originRef || q.id === originRef)

    if (idx === -1) return

    const q = this.quotes[idx]
    let updatedItems = q.items

    if (billedLines && billedLines.length > 0) {
      updatedItems = q.items.map(item => {
        const match = billedLines.find(l => l.producto_id === item.producto_id)

        if (match) {
          return {
            ...item,
            cantidad_facturada: (item.cantidad_facturada || 0) + match.cantidad
          }
        }

        
return item
      })
    }

    this.quotes[idx] = {
      ...q,
      factura_id: invoiceId,
      factura_numero: invoiceNumber,
      items: updatedItems,
      updated_at: new Date().toISOString()
    }
    this.persistToStorage()
  }
}

export const purchasesService = new PurchasesService()
