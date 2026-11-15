import type {
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
import { createWarehouseOperationOrder } from '@/services/inventory/operationOrdersService';
import { contactsService } from '@/services/contactsService';
import { executeGraphQL } from '@/libs/graphqlClient';
import { fetchActiveBcvRate } from '@/services/bcvService';
import {
  GET_SALES_QUOTES_QUERY,
  GET_SALES_QUOTE_QUERY,
  CREATE_SALES_QUOTE_MUTATION,
  APPROVE_SALES_QUOTE_MUTATION,
  CANCEL_SALES_QUOTE_MUTATION,
  GET_VARIANTS_QUERY
} from '@/graphql/sales.gql';
import { CREATE_STOCK_MOVE_MUTATION } from '@/graphql/inventory.gql';
import { serializeCreateStockMoveInput } from '@/services/adapters/inventoryAdapter';
import { fetchStockLocations, resolveDefaultStockLocations } from '@/services/inventoryService';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  
return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;

    
return v.toString(16);
  });
}

interface BackendSalesQuote {
  id: string;
  number: number;
  status: string;
  customerId: string;
  customer?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    docType: string;
    docNumber: string;
    checkDigit?: string | null;
    email: string;
    phone: string;
    fiscalAddress: string;
  } | null;
  locationId?: string | null;
  orderDiscount?: string | null;
  discountTotal?: string | null;
  subtotal: string;
  total: string;
  notes?: string | null;
  validUntil?: string | null;
  approvedOrderId?: string | null;
  approvedOrder?: {
    id: string;
    number: number;
    status: string;
  } | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: Array<{
    id: string;
    lineNumber: number;
    variantId: string;
    variant?: {
      id: string;
      sku: string;
      template?: {
        id: string;
        name: string;
        uomCode: string;
      } | null;
    } | null;
    quantity: string;
    unitPrice: string;
    itemDiscount?: string | null;
    lineTotal: string;
    description?: string | null;
  }>;
}

const EMPTY_SALES_BCV: BcvRate = {
  id: '',
  tasa: 0,
  fecha_valor: '',
  fuente: 'BCV_OFICIAL',
  sincronizado_at: ''
};

const DEFAULT_SALES_FLAGS: SalesFeatureFlags = {
  TAXES_ENABLED: true,
  IVA_RATE: 16,
  IGTF_ENABLED: true,
  SENIAT_FORMAT_VALIDATION: true,
  STOCK_VALIDATION_MODE: 'FLEXIBLE'
};

class SalesQuotesService {
  private quotes: Quote[] = [];
  private clients: ClientLookup[] = [];
  private products: ProductLookup[] = [];
  private bcvRate: BcvRate = { ...EMPTY_SALES_BCV };
  private featureFlags: SalesFeatureFlags = { ...DEFAULT_SALES_FLAGS };
  private quoteCounter = 1;
  private orderCounter = 1;

  private hydrateFromStorage(): void {
    // Sin persistencia local: los datos viven en el backend.
  }

  private persistToStorage(): void {
    // Sin persistencia local: los datos viven en el backend.
  }

  public getFeatureFlags(): SalesFeatureFlags {
    return { ...this.featureFlags };
  }

  public setFeatureFlags(flags: Partial<SalesFeatureFlags>): void {
    this.featureFlags = { ...this.featureFlags, ...flags };
  }

  // Tasa BCV Oficial (con respaldo en la tasa configurada)
  public async getActiveBcvRate(): Promise<BcvRate> {
    const result = await fetchActiveBcvRate();

    if (result.ok) {
      this.bcvRate = {
        id: result.data.rateId,
        tasa: result.data.rate,
        fecha_valor: result.data.valueDate,
        fuente: 'BCV_OFICIAL',
        sincronizado_at: result.data.capturedAt
      };

      return { ...this.bcvRate };
    }

    return {
      id: '',
      tasa: 0,
      fecha_valor: '',
      fuente: 'BCV_OFICIAL',
      sincronizado_at: ''
    };
  }

  public async updateBcvRate(_nuevaTasa: number): Promise<BcvRate> {
    void _nuevaTasa

    throw new Error('La tasa BCV es administrada por el backend y no se modifica desde ventas.');
  }

  // Búsqueda de Clientes Conectada al Directorio de Terceros (Partners)
  public async searchClients(query: string): Promise<ClientLookup[]> {
    try {
      const terceros = await contactsService.getTerceros({
        tipo: 'ALL',
        clasificacion: 'CLIENTE',
        search: query
      });

      if (terceros && terceros.length > 0) {
        const mapped: ClientLookup[] = terceros.map(t => ({
          id: t.id,
          identificacion: t.identificacion,
          nombre_razon_social: t.nombre_razon_social,
          nombre_comercial: t.nombre_comercial,
          email: t.email_principal,
          telefono: t.telefono_principal,
          direccion: t.direccion,
          ciudad: t.ciudad,
          estado: t.estado
        }));

        // Mantener sincronizado el caché local
        const existingIds = new Set(this.clients.map(c => c.id));

        for (const m of mapped) {
          if (!existingIds.has(m.id)) {
            this.clients.push(m);
          }
        }

        return mapped;
      }
    } catch (err) {
      console.warn('[salesQuotesService] Fallback a clientes en memoria:', err);
    }

    const q = query.toLowerCase().trim();

    if (!q) return this.clients.slice(0, 10);

    return this.clients.filter(
      c =>
        c.nombre_razon_social.toLowerCase().includes(q) ||
        (c.nombre_comercial && c.nombre_comercial.toLowerCase().includes(q)) ||
        c.identificacion.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }

  // Catálogo de Productos Conectado a Variantes de Inventario
  public async getProducts(): Promise<ProductLookup[]> {
    try {
      const res = await executeGraphQL<{
        variants: Array<{
          id: string;
          sku: string;
          barcode?: string | null;
          priceExtra: string;
          standardCost: string;
          isActive: boolean;
          template: {
            id: string;
            name: string;
            uomCode: string;
            productType: string;
            basePrice: string;
            vatAliquot: string;
          };
          quants?: Array<{
            id: string;
            quantity: string;
            reservedQuantity: string;
          }> | null;
        }>;
      }>(GET_VARIANTS_QUERY, { take: 100 }, { timeoutMs: 5000 });

      if (res?.variants && Array.isArray(res.variants) && res.variants.length > 0) {
        const prods: ProductLookup[] = res.variants.map(v => {
          const isPhysical = v.template.productType === 'STORABLE';
          let stockFisico = 0;
          let stockComprometido = 0;

          if (v.quants && v.quants.length > 0) {
            for (const q of v.quants) {
              stockFisico += Number(q.quantity || 0);
              stockComprometido += Number(q.reservedQuantity || 0);
            }
          }

          const basePrice = Number(v.template.basePrice || 0);
          const priceExtra = Number(v.priceExtra || 0);
          const vatRate = v.template.vatAliquot === 'EXEMPT' ? 'EXEMPT' : '16';

          return {
            id: v.id,
            sku: v.sku,
            nombre: v.template.name,
            descripcion: v.template.name,
            tipo: isPhysical ? 'PHYSICAL' : 'SERVICE',
            is_physical_stock: isPhysical,
            manages_stock: isPhysical,
            stock_fisico: stockFisico,
            stock_comprometido: stockComprometido,
            stock_disponible: Math.max(0, stockFisico - stockComprometido),
            precio_unitario_base: basePrice + priceExtra,
            alicuota_iva: vatRate as '16' | '8' | '0' | 'EXEMPT'
          };
        });

        this.products = prods;
        
return [...this.products];
      }
    } catch (err) {
      console.warn('[salesQuotesService] Backend variants query no disponible, usando fallback:', err);
    }

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

  // Mapear cotización del backend al modelo unificado de frontend
  private mapBackendQuoteToFrontend(q: BackendSalesQuote): Quote {
    const tasa = this.bcvRate.tasa;

    const docFormatted = q.customer
      ? q.customer.checkDigit
        ? `${q.customer.docType}-${q.customer.docNumber}-${q.customer.checkDigit}`
        : `${q.customer.docType}-${q.customer.docNumber}`
      : 'J-00000000-0';

    const client: ClientLookup = q.customer
      ? {
          id: q.customer.id,
          identificacion: docFormatted,
          nombre_razon_social: q.customer.legalName,
          nombre_comercial: q.customer.tradeName || q.customer.legalName,
          email: q.customer.email,
          telefono: q.customer.phone,
          direccion: q.customer.fiscalAddress
        }
      : this.clients.find(c => c.id === q.customerId) || {
          id: q.customerId,
          identificacion: 'N/A',
          nombre_razon_social: 'Cliente del Sistema',
          email: '',
          telefono: '',
          direccion: ''
        };

    const lines: QuoteLine[] = (q.lines || []).map((l, idx) => {
      const unitPrice = Number(l.unitPrice);
      const quantity = Number(l.quantity);
      const discount = Number(l.itemDiscount || 0);
      const lineTotal = Number(l.lineTotal);
      const sku = l.variant?.sku || `ITEM-${idx + 1}`;
      const name = l.description || l.variant?.template?.name || `Producto ${idx + 1}`;

      return {
        id: l.id,
        producto_id: l.variantId,
        producto_sku: sku,
        producto_nombre: name,
        is_physical_stock: true,
        cantidad: quantity,
        precio_unitario: unitPrice,
        descuento_porcentaje: unitPrice * quantity > 0 ? (discount / (unitPrice * quantity)) * 100 : 0,
        monto_descuento: discount,
        subtotal_neto: lineTotal,
        alicuota_iva: '16',
        monto_iva: Number((lineTotal * 0.16).toFixed(2)),
        total_linea: Number((lineTotal * 1.16).toFixed(2)),
        stock_disponible_al_momento: 999
      };
    });

    const totalUsd = Number(q.total);
    const subtotalUsd = Number(q.subtotal);
    const discountUsd = Number(q.discountTotal || 0);

    const statusNormalized: Quote['estado'] =
      q.status === 'CANCELLED' ? 'CANCELED' : (q.status as Quote['estado']) || 'DRAFT';

    const correlativo =
      q.status === 'DRAFT' && !q.number ? 'BORRADOR' : `COT-2026-${String(q.number || 1).padStart(4, '0')}`;

    return {
      id: q.id,
      correlativo,
      cliente: client,
      estado: statusNormalized,
      moneda_base: 'USD',
      tasa_bcv: { ...this.bcvRate },
      vigencia_dias: 15,
      aplica_iva: true,
      fecha_emision: q.createdAt.split('T')[0],
      fecha_vencimiento: q.validUntil ? q.validUntil.split('T')[0] : q.createdAt.split('T')[0],
      items: lines,

      subtotal_usd: subtotalUsd,
      descuento_total_usd: discountUsd,
      base_imponible_usd: subtotalUsd - discountUsd,
      monto_exento_usd: 0,
      iva_total_usd: Number((totalUsd - (subtotalUsd - discountUsd)).toFixed(2)),
      igtf_total_usd: 0,
      total_usd: totalUsd,

      subtotal_ves: Number((subtotalUsd * tasa).toFixed(2)),
      descuento_total_ves: Number((discountUsd * tasa).toFixed(2)),
      base_imponible_ves: Number(((subtotalUsd - discountUsd) * tasa).toFixed(2)),
      monto_exento_ves: 0,
      iva_total_ves: Number(((totalUsd - (subtotalUsd - discountUsd)) * tasa).toFixed(2)),
      igtf_total_ves: 0,
      total_ves: Number((totalUsd * tasa).toFixed(2)),

      observaciones: q.notes || '',
      terminos_condiciones:
        'Precios en USD calculados a tasa oficial BCV. Vigencia sujeta a disponibilidad de existencias.',
      orden_venta_id: q.approvedOrderId || undefined,
      correlativo_orden: q.approvedOrder ? `ORD-2026-${String(q.approvedOrder.number).padStart(4, '0')}` : undefined,
      version: 1,
      created_at: q.createdAt,
      updated_at: q.updatedAt
    };
  }

  // Listar Cotizaciones con Filtros (HU2)
  public async getQuotes(filters?: QuotesFilterState): Promise<Quote[]> {
    try {
      const res = await executeGraphQL<{ salesQuotes: BackendSalesQuote[] }>(
        GET_SALES_QUOTES_QUERY,
        {
          orderBy: [{ createdAt: 'desc' }],
          take: 100
        },
        { timeoutMs: 5000 }
      );

      if (res?.salesQuotes && Array.isArray(res.salesQuotes)) {
        const mappedQuotes: Quote[] = res.salesQuotes.map(q => this.mapBackendQuoteToFrontend(q));

        this.quotes = mappedQuotes
      }
    } catch (err) {
      console.warn('[salesQuotesService] Backend salesQuotes no disponible, usando caché local:', err);
    }

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
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

    if (isUuid) {
      try {
        const res = await executeGraphQL<{ salesQuote: BackendSalesQuote }>(
          GET_SALES_QUOTE_QUERY,
          { id },
          { timeoutMs: 4000 }
        );

        if (res?.salesQuote) {
          const mapped = this.mapBackendQuoteToFrontend(res.salesQuote);
          const idx = this.quotes.findIndex(q => q.id === id);

          if (idx !== -1) {
            this.quotes[idx] = mapped;
          } else {
            this.quotes.unshift(mapped);
          }

          this.persistToStorage();
          
return mapped;
        }
      } catch (err) {
        console.warn('[salesQuotesService] Backend salesQuote no disponible, usando memoria:', err);
      }
    }

    const found = this.quotes.find(q => q.id === id);

    
return found ? { ...found } : null;
  }

  // Crear Cotización (HU1)
  public async createQuote(payload: CreateQuotePayload): Promise<Quote> {
    const client = this.clients.find(c => c.id === payload.cliente_id);

    if (!client) {
      throw new Error('El cliente seleccionado no existe o no es válido.');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Debe agregar al menos una línea de producto o servicio.');
    }

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(payload.cliente_id);

    // Si es un cliente real del backend, enviamos la mutación directa (sin fallback silencioso ante errores)
    if (isUuid) {
      for (let i = 0; i < payload.items.length; i++) {
        const it = payload.items[i];
        const isVarUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(it.producto_id);

        if (!isVarUuid) {
          throw new Error(
            `El producto en la línea ${i + 1} ("${it.producto_id}") no es una variante sincronizada con el backend (requiere UUID). Seleccione un producto del catálogo.`
          );
        }
      }

      const dueDate = new Date(Date.now() + payload.vigencia_dias * 24 * 60 * 60 * 1000).toISOString();

      const gqlLines = payload.items.map(it => {
        const rawLine = it.precio_unitario * it.cantidad;
        const disc = (rawLine * (it.descuento_porcentaje || 0)) / 100;

        
return {
          variantId: it.producto_id,
          quantity: String(it.cantidad),
          unitPrice: String(it.precio_unitario),
          itemDiscount: disc > 0 ? String(disc) : undefined
        };
      });

      const res = await executeGraphQL<{ createSalesQuote: BackendSalesQuote }>(
        CREATE_SALES_QUOTE_MUTATION,
        {
          input: {
            customerId: payload.cliente_id,
            validUntil: dueDate,
            notes: payload.observaciones || undefined,
            lines: gqlLines
          }
        },
        { timeoutMs: 10000 }
      );

      if (res?.createSalesQuote) {
        const finalQuote = this.mapBackendQuoteToFrontend(res.createSalesQuote);

        finalQuote.cliente = client;
        this.quotes.unshift(finalQuote);
        this.persistToStorage();
        
return finalQuote;
      }

      throw new Error('El backend no retornó los datos de la cotización creada.');
    }

    // Si es un cliente simulado local (mock)
    const flags = this.getFeatureFlags();
    const tasa = this.bcvRate.tasa;
    const aplicaIva = payload.aplica_iva ?? true;

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
    this.persistToStorage();
    
return { ...newQuote };
  }

  // Actualizar Cotización (Borrador)
  public async updateQuote(id: string, payload: Partial<CreateQuotePayload>): Promise<Quote> {
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

    const correlativo =
      isIssued && current.correlativo === 'BORRADOR'
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
      terminos_condiciones:
        payload.terminos_condiciones !== undefined ? payload.terminos_condiciones : current.terminos_condiciones,
      version: current.version + 1,
      updated_at: new Date().toISOString()
    };

    this.quotes[idx] = updated;
    this.persistToStorage();
    
return { ...updated };
  }

  // Aprobar Cotización (HU3)
  public async approveQuote(id: string): Promise<Quote> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

    if (isUuid) {
      const idempotencyKey = generateUUID();

      const res = await executeGraphQL<{ approveSalesQuote: { id: string; number: number; status: string } }>(
        APPROVE_SALES_QUOTE_MUTATION,
        { input: { quoteId: id, idempotencyKey } },
        { timeoutMs: 10000 }
      );

      if (res?.approveSalesQuote) {
        const ord = res.approveSalesQuote;
        const idx = this.quotes.findIndex(q => q.id === id);

        if (idx !== -1) {
          this.quotes[idx] = {
            ...this.quotes[idx],
            estado: 'APPROVED',
            orden_venta_id: ord.id,
            correlativo_orden: `ORD-2026-${String(ord.number).padStart(4, '0')}`,
            updated_at: new Date().toISOString()
          };
          this.persistToStorage();
          
return { ...this.quotes[idx] };
        }
      }

      throw new Error('No se pudo confirmar la aprobación de la cotización en el servidor.');
    }

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
    this.persistToStorage();
    
return { ...updated };
  }

  // Recalcular con Nueva Tasa BCV (HU3)
  public async recalculateQuoteBcvRate(id: string): Promise<Quote> {
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
    this.persistToStorage();
    
return { ...updated };
  }

  // Anular Cotización con Motivo Obligatorio (HU4)
  public async cancelQuote(id: string, motivo: string): Promise<Quote> {
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Debe proporcionar un motivo de anulación de al menos 5 caracteres.');
    }

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

    if (isUuid) {
      const idempotencyKey = generateUUID();

      await executeGraphQL(
        CANCEL_SALES_QUOTE_MUTATION,
        {
          input: {
            quoteId: id,
            reason: motivo.trim(),
            idempotencyKey
          }
        },
        { timeoutMs: 10000 }
      );
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
    this.persistToStorage();
    
return { ...updated };
  }

  // Convertir a Orden de Venta y Comprometer Inventario (HU5)
  public async convertQuoteToSalesOrder(id: string): Promise<SalesOrderConversionResponse> {
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
    this.persistToStorage();

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

  // Crear Orden de Despacho / Entrega vinculada en Almacén (SPEC-009)
  public async createDeliveryForQuote(
    quoteId: string
  ): Promise<{ success: boolean; codigo: string; operationId: string; message: string }> {
    const idx = this.quotes.findIndex(q => q.id === quoteId);

    if (idx === -1) throw new Error('Cotización no encontrada.');

    const q = this.quotes[idx];

    if (q.estado !== 'APPROVED' && !q.orden_venta_id) {
      throw new Error('Solo se pueden generar entregas para cotizaciones aprobadas o con orden de venta.');
    }

    const storableLines = q.items.filter(it => it.is_physical_stock);

    if (storableLines.length === 0) {
      throw new Error('Esta cotización no contiene artículos físicos o inventariables para despachar.');
    }

    // Crear la orden de entrega en almacén
    const opLines = storableLines.map(line => ({
      producto_id: line.producto_id,
      producto_nombre: line.producto_nombre,
      variante_id: `var-${line.producto_id}`,
      variante_sku: line.producto_sku,
      uom_code: 'un',
      cantidad_demanda: line.cantidad,
      cantidad_procesada: line.cantidad,
      costo_unitario_usd: line.precio_unitario
    }));

    const docOrigen = q.correlativo_orden || q.correlativo;

    // Crear movimiento transaccional OUTGOING en backend si las variantes son UUIDs reales
    try {
      const stockLocations = await fetchStockLocations();
      const defaultLoc = await resolveDefaultStockLocations();
      const internalLoc = stockLocations.find(l => l.locationType === 'INTERNAL') || { id: defaultLoc.internalLocationId };
      const customerLoc = stockLocations.find(l => l.locationType === 'CUSTOMER') || internalLoc;

      for (const line of storableLines) {
        const isVarUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          line.producto_id
        );

        if (isVarUuid) {
          const moveInput = serializeCreateStockMoveInput({
            variantId: line.producto_id,
            locationSrcId: internalLoc.id,
            locationDstId: customerLoc.id,
            quantity: line.cantidad,
            moveType: 'OUTGOING',
            referenceDoc: docOrigen
          });

          await executeGraphQL(
            CREATE_STOCK_MOVE_MUTATION,
            { input: moveInput },
            { timeoutMs: 10000 }
          );
        }
      }
    } catch (err) {
      console.warn('[salesQuotesService] No se pudo crear stockMove en backend para despacho de venta:', err);
    }

    const opOrder = await createWarehouseOperationOrder({
      tipo: 'DELIVERY',
      tercero_nombre: q.cliente.nombre_razon_social,
      documento_origen: docOrigen,
      almacen_origen_nombre: 'Almacén Central',
      almacen_destino_nombre: `Cliente: ${q.cliente.nombre_razon_social}`,
      fecha_programada: new Date().toISOString().slice(0, 10),
      notas: `Despacho generado desde venta ${docOrigen}`,
      estado: 'READY',
      lineas: opLines
    });

    // Guardar vinculación en la cotización
    this.quotes[idx] = {
      ...q,
      almacen_operacion_id: opOrder.id,
      almacen_operacion_codigo: opOrder.codigo,
      updated_at: new Date().toISOString()
    };
    this.persistToStorage();

    return {
      success: true,
      codigo: opOrder.codigo,
      operationId: opOrder.id,
      message: `Orden de Despacho ${opOrder.codigo} generada exitosamente en Almacén.`
    };
  }

  // Registrar despacho efectivo ejecutado por almacén
  public recordDeliveryOperation(
    originRef: string,
    operationCode: string,
    lines: { producto_id: string; cantidad: number }[]
  ): void {
    this.hydrateFromStorage();

    const idx = this.quotes.findIndex(
      q => q.correlativo === originRef || q.correlativo_orden === originRef || q.id === originRef
    );

    if (idx === -1) return;

    const q = this.quotes[idx];

    const updatedItems = q.items.map(item => {
      const match = lines.find(l => l.producto_id === item.producto_id);

      if (match) {
        return {
          ...item,
          cantidad_entregada: (item.cantidad_entregada || 0) + match.cantidad
        };
      }

      
return item;
    });

    this.quotes[idx] = {
      ...q,
      almacen_operacion_codigo: operationCode,
      items: updatedItems,
      updated_at: new Date().toISOString()
    };
    this.persistToStorage();
  }

  // Registrar factura emitida en contabilidad
  public recordInvoiceLink(
    originRef: string,
    invoiceId: string,
    invoiceNumber: string,
    billedLines?: { producto_id: string; cantidad: number }[]
  ): void {
    this.hydrateFromStorage();

    const idx = this.quotes.findIndex(
      q => q.correlativo === originRef || q.correlativo_orden === originRef || q.id === originRef
    );

    if (idx === -1) return;

    const q = this.quotes[idx];
    let updatedItems = q.items;

    if (billedLines && billedLines.length > 0) {
      updatedItems = q.items.map(item => {
        const match = billedLines.find(l => l.producto_id === item.producto_id);

        if (match) {
          return {
            ...item,
            cantidad_facturada: (item.cantidad_facturada || 0) + match.cantidad
          };
        }

        
return item;
      });
    }

    this.quotes[idx] = {
      ...q,
      factura_id: invoiceId,
      factura_numero: invoiceNumber,
      items: updatedItems,
      updated_at: new Date().toISOString()
    };
    this.persistToStorage();
  }
}

export const salesQuotesService = new SalesQuotesService();
