import {
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
import {
  defaultPurchasesFeatureFlags,
  initialMockPurchaseBcvRate,
  initialMockPurchaseQuotes,
  mockPurchaseProductsLookup,
  mockSuppliersLookup
} from '@/data/purchases/mockPurchasesData'
import { venezuelanRifRegex } from '@/views/purchases/quotes/schemas/purchaseFormSchema'

const STORAGE_KEY_QUOTES = 'forge_purchases_quotes_v1'
const STORAGE_KEY_FLAGS = 'forge_purchases_feature_flags_v1'
const STORAGE_KEY_TRANSIT_LOG = 'forge_purchases_transit_notifications_v1'

class PurchasesService {
  private quotes: PurchaseQuote[] = [...initialMockPurchaseQuotes]
  private suppliers: SupplierLookup[] = [...mockSuppliersLookup]
  private products: PurchaseProductLookup[] = [...mockPurchaseProductsLookup]
  private bcvRate: BcvRate = { ...initialMockPurchaseBcvRate }
  private quoteCounter = 18
  private orderCounter = 9

  constructor() {
    this.hydrateFromStorage()
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUOTES)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.quotes = parsed
        }
      }
    } catch {
      // Fallback to initialMockPurchaseQuotes
    }
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotes))
    } catch {
      // Ignore storage quota errors
    }
  }

  // Feature Flags (Regla R4)
  public getFeatureFlags(): PurchasesFeatureFlags {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_FLAGS)
      if (saved) {
        try {
          return { ...defaultPurchasesFeatureFlags, ...JSON.parse(saved) }
        } catch {
          // Fallback to default
        }
      }
    }
    return defaultPurchasesFeatureFlags
  }

  public setFeatureFlags(flags: Partial<PurchasesFeatureFlags>): PurchasesFeatureFlags {
    const updated = { ...this.getFeatureFlags(), ...flags }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_FLAGS, JSON.stringify(updated))
    }
    return updated
  }

  // Tasa BCV Oficial (Sincronizada por CRON diario 7:00 AM)
  public async getActiveBcvRate(): Promise<BcvRate> {
    await new Promise(r => setTimeout(r, 100))
    return { ...this.bcvRate }
  }

  public async updateActiveBcvRate(nuevaTasa: number): Promise<BcvRate> {
    this.bcvRate = {
      ...this.bcvRate,
      tasa: Number(nuevaTasa.toFixed(2)),
      fecha_valor: new Date().toISOString().split('T')[0],
      sincronizado_at: new Date().toISOString()
    }
    return { ...this.bcvRate }
  }

  // Adaptador Desacoplado: GET /api/suppliers?search= (o /api/terceros?rol=PROVEEDOR)
  public async searchSuppliers(query: string): Promise<SupplierLookup[]> {
    await new Promise(r => setTimeout(r, 180))
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
    await new Promise(r => setTimeout(r, 100))
    return [...this.suppliers]
  }

  // Adaptador Desacoplado: GET /api/products
  public async getPurchaseProducts(): Promise<PurchaseProductLookup[]> {
    await new Promise(r => setTimeout(r, 140))
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
    await new Promise(r => setTimeout(r, 200))
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
    await new Promise(r => setTimeout(r, 150))
    const found = this.quotes.find(q => q.id === id)
    return found ? { ...found } : null
  }

  // HU1: Crear Solicitud de Cotización / Presupuesto de Compra (POST /api/purchases/quotes)
  public async createPurchaseQuote(payload: CreatePurchaseQuotePayload): Promise<PurchaseQuote> {
    await new Promise(r => setTimeout(r, 320))
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
    await new Promise(r => setTimeout(r, 300))
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
    await new Promise(r => setTimeout(r, 260))
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
    await new Promise(r => setTimeout(r, 280))
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
    await new Promise(r => setTimeout(r, 280))
    if (!motivo_anulacion || motivo_anulacion.trim().length < 5) {
      throw new Error('El motivo de anulación es obligatorio (mínimo 5 caracteres).')
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
    await new Promise(r => setTimeout(r, 380))
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

    // Emitir notificación desacoplada de mercancía en tránsito sin alterar vistas internas de Inventario
    if (typeof window !== 'undefined' && lineasFisicasEnTransito.length > 0) {
      try {
        const currentLogs = JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSIT_LOG) || '[]')
        currentLogs.unshift({
          correlativo_orden_compra: correlativoOC,
          quote_id: quote.id,
          proveedor: quote.proveedor.razon_social,
          lineas_fisicas_en_transito: lineasFisicasEnTransito,
          notificado_at: new Date().toISOString()
        })
        localStorage.setItem(STORAGE_KEY_TRANSIT_LOG, JSON.stringify(currentLogs))
      } catch {
        // Ignore storage error
      }
    }

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
}

export const purchasesService = new PurchasesService()
