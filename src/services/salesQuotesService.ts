import {
  BcvRate,
  ClientLookup,
  CreateQuotePayload,
  ProductLookup,
  Quote,
  QuoteLine,
  QuotesFilterState,
  QuoteTotalsCalculation,
  SalesFeatureFlags,
  SalesOrderConversionResponse
} from '@/types/salesQuotesTypes';
import {
  defaultSalesFeatureFlags,
  initialMockBcvRate,
  initialMockQuotes,
  mockClientsLookup,
  mockProductsLookup
} from '@/data/sales/quotes/mockQuotesData';

class SalesQuotesService {
  private quotes: Quote[] = [...initialMockQuotes];
  private clients: ClientLookup[] = [...mockClientsLookup];
  private products: ProductLookup[] = [...mockProductsLookup];
  private bcvRate: BcvRate = { ...initialMockBcvRate };
  private quoteCounter = 43;
  private orderCounter = 16;

  // Feature Flags
  public getFeatureFlags(): SalesFeatureFlags {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forge_sales_feature_flags');
      if (saved) {
        try {
          return { ...defaultSalesFeatureFlags, ...JSON.parse(saved) };
        } catch {
          // Fallback a default
        }
      }
    }
    return defaultSalesFeatureFlags;
  }

  public setFeatureFlags(flags: Partial<SalesFeatureFlags>): void {
    if (typeof window !== 'undefined') {
      const current = this.getFeatureFlags();
      const updated = { ...current, ...flags };
      localStorage.setItem('forge_sales_feature_flags', JSON.stringify(updated));
    }
  }

  // Tasa BCV Oficial
  public async getActiveBcvRate(): Promise<BcvRate> {
    await new Promise(r => setTimeout(r, 120));
    return { ...this.bcvRate };
  }

  public async updateBcvRate(nuevaTasa: number): Promise<BcvRate> {
    this.bcvRate = {
      ...this.bcvRate,
      tasa: nuevaTasa,
      sincronizado_at: new Date().toISOString()
    };
    return { ...this.bcvRate };
  }

  // Búsqueda de Clientes Desacoplada
  public async searchClients(query: string): Promise<ClientLookup[]> {
    await new Promise(r => setTimeout(r, 200));
    const q = query.toLowerCase().trim();
    if (!q) return this.clients.slice(0, 5);

    return this.clients.filter(
      c =>
        c.nombre_razon_social.toLowerCase().includes(q) ||
        (c.nombre_comercial && c.nombre_comercial.toLowerCase().includes(q)) ||
        c.identificacion.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }

  // Catálogo de Productos Desacoplado
  public async getProducts(): Promise<ProductLookup[]> {
    await new Promise(r => setTimeout(r, 150));
    return [...this.products];
  }

  // Cálculo de Totales Bimonetarios Reactivo
  public calculateTotals(
    items: { cantidad: number; precio_unitario: number; descuento_porcentaje: number; alicuota_iva?: string }[],
    tasaBcv: number,
    flags: SalesFeatureFlags = this.getFeatureFlags(),
    aplicaIva: boolean = true
  ): QuoteTotalsCalculation {
    let subtotal_usd = 0;
    let descuento_usd = 0;
    let base_imponible_usd = 0;
    let monto_exento_usd = 0;
    let iva_usd = 0;

    for (const item of items) {
      const rawPrice = item.cantidad * item.precio_unitario;
      const discount = rawPrice * ((item.descuento_porcentaje || 0) / 100);
      const netLine = rawPrice - discount;

      subtotal_usd += rawPrice;
      descuento_usd += discount;

      if (flags.TAXES_ENABLED && aplicaIva) {
        const isExempt = item.alicuota_iva === 'EXEMPT' || item.alicuota_iva === '0';
        if (isExempt) {
          monto_exento_usd += netLine;
        } else {
          base_imponible_usd += netLine;
          iva_usd += netLine * (flags.IVA_RATE / 100);
        }
      } else {
        monto_exento_usd += netLine;
      }
    }

    const neto_imponible_usd = subtotal_usd - descuento_usd;
    const igtf_usd = flags.TAXES_ENABLED && flags.IGTF_ENABLED && aplicaIva ? neto_imponible_usd * 0.03 : 0;
    const total_usd = neto_imponible_usd + iva_usd + igtf_usd;

    // Conversión a VES
    const subtotal_ves = subtotal_usd * tasaBcv;
    const descuento_ves = descuento_usd * tasaBcv;
    const base_imponible_ves = base_imponible_usd * tasaBcv;
    const monto_exento_ves = monto_exento_usd * tasaBcv;
    const neto_imponible_ves = neto_imponible_usd * tasaBcv;
    const iva_ves = iva_usd * tasaBcv;
    const igtf_ves = igtf_usd * tasaBcv;
    const total_ves = total_usd * tasaBcv;

    return {
      subtotal_usd: Number(subtotal_usd.toFixed(2)),
      descuento_usd: Number(descuento_usd.toFixed(2)),
      base_imponible_usd: Number(base_imponible_usd.toFixed(2)),
      monto_exento_usd: Number(monto_exento_usd.toFixed(2)),
      neto_imponible_usd: Number(neto_imponible_usd.toFixed(2)),
      iva_usd: Number(iva_usd.toFixed(2)),
      igtf_usd: Number(igtf_usd.toFixed(2)),
      total_usd: Number(total_usd.toFixed(2)),

      subtotal_ves: Number(subtotal_ves.toFixed(2)),
      descuento_ves: Number(descuento_ves.toFixed(2)),
      base_imponible_ves: Number(base_imponible_ves.toFixed(2)),
      monto_exento_ves: Number(monto_exento_ves.toFixed(2)),
      neto_imponible_ves: Number(neto_imponible_ves.toFixed(2)),
      iva_ves: Number(iva_ves.toFixed(2)),
      igtf_ves: Number(igtf_ves.toFixed(2)),
      total_ves: Number(total_ves.toFixed(2))
    };
  }

  // Listar Cotizaciones con Filtros (HU2)
  public async getQuotes(filters?: QuotesFilterState): Promise<Quote[]> {
    await new Promise(r => setTimeout(r, 220));
    let result = [...this.quotes];

    if (filters) {
      if (filters.estado && filters.estado !== 'ALL') {
        result = result.filter(q => q.estado === filters.estado);
      }
      if (filters.cliente_id && filters.cliente_id !== 'ALL') {
        result = result.filter(q => q.cliente.id === filters.cliente_id);
      }
      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(
          item =>
            item.correlativo.toLowerCase().includes(q) ||
            item.cliente.nombre_razon_social.toLowerCase().includes(q) ||
            item.cliente.identificacion.toLowerCase().includes(q) ||
            (item.cliente.nombre_comercial && item.cliente.nombre_comercial.toLowerCase().includes(q))
        );
      }
      if (filters.fecha_desde) {
        result = result.filter(item => item.fecha_emision >= filters.fecha_desde!);
      }
      if (filters.fecha_hasta) {
        result = result.filter(item => item.fecha_emision <= filters.fecha_hasta!);
      }
    }

    // Ordenar descendente por fecha de creación
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Obtener por ID
  public async getQuoteById(id: string): Promise<Quote | null> {
    await new Promise(r => setTimeout(r, 180));
    const found = this.quotes.find(q => q.id === id);
    return found ? { ...found } : null;
  }

  // Crear Cotización (HU1)
  public async createQuote(payload: CreateQuotePayload): Promise<Quote> {
    await new Promise(r => setTimeout(r, 350));
    const client = this.clients.find(c => c.id === payload.cliente_id);
    if (!client) {
      throw new Error('El cliente seleccionado no existe o no es válido.');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Debe agregar al menos una línea de producto o servicio.');
    }

    const flags = this.getFeatureFlags();
    const tasa = this.bcvRate.tasa;
    const aplicaIva = payload.aplica_iva ?? true;

    // Procesar líneas
    const lines: QuoteLine[] = payload.items.map((it, idx) => {
      const prod = this.products.find(p => p.id === it.producto_id);
      const isPhysical = prod ? prod.is_physical_stock : true;
      const sku = prod ? prod.sku : `ITEM-${idx + 1}`;
      const name = prod ? prod.nombre : `Producto ${idx + 1}`;
      const unitPrice = it.precio_unitario;
      const discount = (unitPrice * it.cantidad * (it.descuento_porcentaje || 0)) / 100;
      const subtotalNeto = unitPrice * it.cantidad - discount;
      const vatRate = it.alicuota_iva || prod?.alicuota_iva || '16';
      const isExempt = !aplicaIva || vatRate === 'EXEMPT' || vatRate === '0';
      const vatPercent = flags.TAXES_ENABLED && !isExempt ? flags.IVA_RATE : 0;
      const vatAmount = subtotalNeto * (vatPercent / 100);

      return {
        id: `line-${Date.now()}-${idx}`,
        producto_id: it.producto_id,
        producto_sku: sku,
        producto_nombre: name,
        is_physical_stock: isPhysical,
        cantidad: it.cantidad,
        precio_unitario: unitPrice,
        descuento_porcentaje: it.descuento_porcentaje || 0,
        monto_descuento: Number(discount.toFixed(2)),
        subtotal_neto: Number(subtotalNeto.toFixed(2)),
        alicuota_iva: isExempt ? 'EXEMPT' : vatRate,
        monto_iva: Number(vatAmount.toFixed(2)),
        total_linea: Number((subtotalNeto + vatAmount).toFixed(2)),
        stock_disponible_al_momento: prod ? prod.stock_disponible : 999
      };
    });

    const totals = this.calculateTotals(lines, tasa, flags, aplicaIva);
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + payload.vigencia_dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const isIssued = Boolean(payload.emitir_inmediatamente);
    const correlativo = isIssued
      ? `COT-2026-${String(this.quoteCounter++).padStart(4, '0')}`
      : 'BORRADOR';

    const newQuote: Quote = {
      id: `quote-${Date.now()}`,
      correlativo,
      cliente: client,
      estado: isIssued ? 'ISSUED' : 'DRAFT',
      moneda_base: payload.moneda_base,
      tasa_bcv: { ...this.bcvRate },
      vigencia_dias: payload.vigencia_dias,
      aplica_iva: aplicaIva,
      fecha_emision: today,
      fecha_vencimiento: dueDate,
      items: lines,

      subtotal_usd: totals.subtotal_usd,
      descuento_total_usd: totals.descuento_usd,
      base_imponible_usd: totals.base_imponible_usd,
      monto_exento_usd: totals.monto_exento_usd,
      iva_total_usd: totals.iva_usd,
      igtf_total_usd: totals.igtf_usd,
      total_usd: totals.total_usd,

      subtotal_ves: totals.subtotal_ves,
      descuento_total_ves: totals.descuento_ves,
      base_imponible_ves: totals.base_imponible_ves,
      monto_exento_ves: totals.monto_exento_ves,
      iva_total_ves: totals.iva_ves,
      igtf_total_ves: totals.igtf_ves,
      total_ves: totals.total_ves,

      observaciones: payload.observaciones,
      terminos_condiciones: payload.terminos_condiciones,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.quotes.unshift(newQuote);
    return { ...newQuote };
  }

  // Actualizar Cotización (Borrador)
  public async updateQuote(id: string, payload: Partial<CreateQuotePayload>): Promise<Quote> {
    await new Promise(r => setTimeout(r, 300));
    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Cotización no encontrada.');

    const current = this.quotes[idx];
    if (current.estado !== 'DRAFT') {
      throw new Error('Solo se pueden editar cotizaciones en estado Borrador.');
    }

    let client = current.cliente;
    if (payload.cliente_id && payload.cliente_id !== client.id) {
      const foundClient = this.clients.find(c => c.id === payload.cliente_id);
      if (foundClient) client = foundClient;
    }

    const flags = this.getFeatureFlags();
    const tasa = current.tasa_bcv.tasa;
    const aplicaIva = payload.aplica_iva !== undefined ? payload.aplica_iva : current.aplica_iva;

    let lines = current.items;
    if (payload.items && payload.items.length > 0) {
      lines = payload.items.map((it, i) => {
        const prod = this.products.find(p => p.id === it.producto_id);
        const isPhysical = prod ? prod.is_physical_stock : true;
        const sku = prod ? prod.sku : `ITEM-${i + 1}`;
        const name = prod ? prod.nombre : `Producto ${i + 1}`;
        const unitPrice = it.precio_unitario;
        const discount = (unitPrice * it.cantidad * (it.descuento_porcentaje || 0)) / 100;
        const subtotalNeto = unitPrice * it.cantidad - discount;
        const vatRate = it.alicuota_iva || prod?.alicuota_iva || '16';
        const isExempt = !aplicaIva || vatRate === 'EXEMPT' || vatRate === '0';
        const vatPercent = flags.TAXES_ENABLED && !isExempt ? flags.IVA_RATE : 0;
        const vatAmount = subtotalNeto * (vatPercent / 100);

        return {
          id: `line-${Date.now()}-${i}`,
          producto_id: it.producto_id,
          producto_sku: sku,
          producto_nombre: name,
          is_physical_stock: isPhysical,
          cantidad: it.cantidad,
          precio_unitario: unitPrice,
          descuento_porcentaje: it.descuento_porcentaje || 0,
          monto_descuento: Number(discount.toFixed(2)),
          subtotal_neto: Number(subtotalNeto.toFixed(2)),
          alicuota_iva: isExempt ? 'EXEMPT' : vatRate,
          monto_iva: Number(vatAmount.toFixed(2)),
          total_linea: Number((subtotalNeto + vatAmount).toFixed(2)),
          stock_disponible_al_momento: prod ? prod.stock_disponible : 999
        };
      });
    }

    const totals = this.calculateTotals(lines, tasa, flags, aplicaIva);
    const isIssued = Boolean(payload.emitir_inmediatamente);
    const correlativo = isIssued && current.correlativo === 'BORRADOR'
      ? `COT-2026-${String(this.quoteCounter++).padStart(4, '0')}`
      : current.correlativo;

    const updated: Quote = {
      ...current,
      correlativo,
      cliente: client,
      estado: isIssued ? 'ISSUED' : 'DRAFT',
      moneda_base: payload.moneda_base || current.moneda_base,
      vigencia_dias: payload.vigencia_dias || current.vigencia_dias,
      aplica_iva: aplicaIva,
      items: lines,

      subtotal_usd: totals.subtotal_usd,
      descuento_total_usd: totals.descuento_usd,
      base_imponible_usd: totals.base_imponible_usd,
      monto_exento_usd: totals.monto_exento_usd,
      iva_total_usd: totals.iva_usd,
      igtf_total_usd: totals.igtf_usd,
      total_usd: totals.total_usd,

      subtotal_ves: totals.subtotal_ves,
      descuento_total_ves: totals.descuento_ves,
      base_imponible_ves: totals.base_imponible_ves,
      monto_exento_ves: totals.monto_exento_ves,
      iva_total_ves: totals.iva_ves,
      igtf_total_ves: totals.igtf_ves,
      total_ves: totals.total_ves,

      observaciones: payload.observaciones !== undefined ? payload.observaciones : current.observaciones,
      terminos_condiciones: payload.terminos_condiciones !== undefined ? payload.terminos_condiciones : current.terminos_condiciones,
      version: current.version + 1,
      updated_at: new Date().toISOString()
    };

    this.quotes[idx] = updated;
    return { ...updated };
  }

  // Aprobar Cotización (HU3)
  public async approveQuote(id: string): Promise<Quote> {
    await new Promise(r => setTimeout(r, 250));
    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Cotización no encontrada.');

    const q = this.quotes[idx];
    const today = new Date().toISOString().split('T')[0];

    // Validar vigencia
    if (q.fecha_vencimiento < today) {
      throw new Error('La cotización ha expirado. Debe recalcular con la tasa BCV actual antes de aprobar.');
    }

    // Validar tasa BCV
    if (Math.abs(q.tasa_bcv.tasa - this.bcvRate.tasa) > 0.001) {
      throw new Error('La tasa oficial BCV ha cambiado desde la emisión. Debe recalcular el presupuesto antes de aprobar.');
    }

    const updated: Quote = {
      ...q,
      estado: 'APPROVED',
      updated_at: new Date().toISOString()
    };

    this.quotes[idx] = updated;
    return { ...updated };
  }

  // Recalcular con Nueva Tasa BCV (HU3)
  public async recalculateQuoteBcvRate(id: string): Promise<Quote> {
    await new Promise(r => setTimeout(r, 300));
    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Cotización no encontrada.');

    const q = this.quotes[idx];
    const flags = this.getFeatureFlags();
    const newRate = { ...this.bcvRate };
    const today = new Date().toISOString().split('T')[0];
    const newDueDate = new Date(Date.now() + q.vigencia_dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const totals = this.calculateTotals(q.items, newRate.tasa, flags);

    const updated: Quote = {
      ...q,
      tasa_bcv: newRate,
      estado: q.estado === 'EXPIRED' ? 'ISSUED' : q.estado,
      fecha_emision: today,
      fecha_vencimiento: newDueDate,

      subtotal_usd: totals.subtotal_usd,
      descuento_total_usd: totals.descuento_usd,
      iva_total_usd: totals.iva_usd,
      igtf_total_usd: totals.igtf_usd,
      total_usd: totals.total_usd,

      subtotal_ves: totals.subtotal_ves,
      descuento_total_ves: totals.descuento_ves,
      iva_total_ves: totals.iva_ves,
      igtf_total_ves: totals.igtf_ves,
      total_ves: totals.total_ves,

      version: q.version + 1,
      updated_at: new Date().toISOString()
    };

    this.quotes[idx] = updated;
    return { ...updated };
  }

  // Anular Cotización con Motivo Obligatorio (HU4)
  public async cancelQuote(id: string, motivo: string): Promise<Quote> {
    await new Promise(r => setTimeout(r, 250));
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Debe proporcionar un motivo de anulación de al menos 5 caracteres.');
    }

    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Cotización no encontrada.');

    const q = this.quotes[idx];
    const updated: Quote = {
      ...q,
      estado: 'CANCELED',
      motivo_anulacion: motivo.trim(),
      updated_at: new Date().toISOString()
    };

    this.quotes[idx] = updated;
    return { ...updated };
  }

  // Convertir a Orden de Venta y Comprometer Inventario (HU5)
  public async convertQuoteToSalesOrder(id: string): Promise<SalesOrderConversionResponse> {
    await new Promise(r => setTimeout(r, 450));
    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Cotización no encontrada.');

    const q = this.quotes[idx];
    if (q.estado !== 'APPROVED') {
      throw new Error('Solo se pueden convertir a Orden de Venta presupuestos en estado APROBADO.');
    }

    const flags = this.getFeatureFlags();

    // Validar disponibilidad de stock físico en tiempo real
    for (const item of q.items) {
      if (item.is_physical_stock) {
        const prod = this.products.find(p => p.id === item.producto_id);
        if (prod && flags.STOCK_VALIDATION_MODE === 'STRICT') {
          if (item.cantidad > prod.stock_disponible) {
            throw new Error(
              `Stock insuficiente para "${prod.nombre}". Cantidad solicitada: ${item.cantidad}, disponible en almacén: ${prod.stock_disponible}.`
            );
          }
        }
      }
    }

    // Comprometer inventario (reserva de stock físico)
    for (const item of q.items) {
      if (item.is_physical_stock) {
        const prodIdx = this.products.findIndex(p => p.id === item.producto_id);
        if (prodIdx !== -1) {
          const prod = this.products[prodIdx];
          const newComprometido = prod.stock_comprometido + item.cantidad;
          this.products[prodIdx] = {
            ...prod,
            stock_comprometido: newComprometido,
            stock_disponible: Math.max(0, prod.stock_fisico - newComprometido)
          };
        }
      }
    }

    const orderId = `ord-${Date.now()}`;
    const correlativoOrden = `ORD-2026-${String(this.orderCounter++).padStart(4, '0')}`;

    // Vincular orden en la cotización
    this.quotes[idx] = {
      ...q,
      orden_venta_id: orderId,
      correlativo_orden: correlativoOrden,
      updated_at: new Date().toISOString()
    };

    return {
      success: true,
      orden_id: orderId,
      correlativo_orden: correlativoOrden,
      quote_id: q.id,
      estado: 'GENERATED',
      stock_comprometido_actualizado: true,
      message: `Orden de Venta ${correlativoOrden} generada exitosamente con reserva de inventario.`,
      created_at: new Date().toISOString()
    };
  }
}

export const salesQuotesService = new SalesQuotesService();
