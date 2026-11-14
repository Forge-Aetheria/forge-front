// Motor de Resolución y Jerarquía de Políticas Comerciales y de Control (SPEC-009)
// Regla R6: Product Policy Override > System Default

import type {
  ProductTemplate,
  SalesInvoicingPolicy,
  PurchaseControlPolicy,
  DeliveryPolicy,
  ProductInvoicingPolicyOption,
  ProductPurchaseControlOption,
  ProductDeliveryPolicyOption
} from '@/types/inventoryTypes'
import type { CommercialPoliciesSettings } from '@/types/settingsTypes'
import type { Quote, QuoteLine } from '@/types/salesQuotesTypes'
import type { PurchaseQuote, PurchaseQuoteLine } from '@/types/purchasesTypes'

export const DEFAULT_COMMERCIAL_POLICIES: CommercialPoliciesSettings = {
  salesInvoicingPolicyDefault: 'ORDERED',
  purchaseControlPolicyDefault: 'ORDERED',
  deliveryPolicyDefault: 'PARTIAL'
}

/**
 * Resuelve la política de facturación efectiva para un producto según la jerarquía R6:
 * 1. Si el producto especifica 'ORDERED' o 'DELIVERED', se aplica la del producto (Override).
 * 2. Si el producto tiene 'DEFAULT' o no está definida, se aplica la general del sistema.
 */
export function resolveEffectiveInvoicingPolicy(
  product?: { invoicingPolicy?: ProductInvoicingPolicyOption; productType?: string } | null,
  settings?: Partial<CommercialPoliciesSettings> | null
): SalesInvoicingPolicy {
  if (product?.invoicingPolicy && product.invoicingPolicy !== 'DEFAULT') {
    return product.invoicingPolicy
  }

  
return settings?.salesInvoicingPolicyDefault || DEFAULT_COMMERCIAL_POLICIES.salesInvoicingPolicyDefault
}

/**
 * Resuelve la política de control de compra efectiva para un producto según la jerarquía R6:
 * 1. Si el producto especifica 'ORDERED' o 'RECEIVED', se aplica la del producto (Override).
 * 2. Si el producto tiene 'DEFAULT' o no está definida, se aplica la general del sistema.
 */
export function resolveEffectivePurchaseControlPolicy(
  product?: { purchaseControlPolicy?: ProductPurchaseControlOption; productType?: string } | null,
  settings?: Partial<CommercialPoliciesSettings> | null
): PurchaseControlPolicy {
  if (product?.purchaseControlPolicy && product.purchaseControlPolicy !== 'DEFAULT') {
    return product.purchaseControlPolicy
  }

  
return settings?.purchaseControlPolicyDefault || DEFAULT_COMMERCIAL_POLICIES.purchaseControlPolicyDefault
}

/**
 * Resuelve la política de entrega efectiva para un producto según la jerarquía R6:
 * 1. Si el producto especifica 'ALL_AT_ONCE' o 'PARTIAL', se aplica la del producto (Override).
 * 2. Si el producto tiene 'DEFAULT' o no está definida, se aplica la general del sistema.
 */
export function resolveEffectiveDeliveryPolicy(
  product?: { deliveryPolicy?: ProductDeliveryPolicyOption; productType?: string } | null,
  settings?: Partial<CommercialPoliciesSettings> | null
): DeliveryPolicy {
  if (product?.deliveryPolicy && product.deliveryPolicy !== 'DEFAULT') {
    return product.deliveryPolicy
  }

  
return settings?.deliveryPolicyDefault || DEFAULT_COMMERCIAL_POLICIES.deliveryPolicyDefault
}

export interface BillableSalesLineResult {
  line: QuoteLine
  effectivePolicy: SalesInvoicingPolicy
  orderedQty: number
  deliveredQty: number
  alreadyBilledQty: number
  billableQty: number
  reason?: string
}

/**
 * Evalúa cada línea de una cotización/orden de venta y determina las cantidades exactas a facturar
 * según la política de facturación efectiva de cada ítem.
 */
export function calculateBillableSalesLines(
  quote: Quote,
  products: ProductTemplate[],
  settings?: Partial<CommercialPoliciesSettings> | null
): BillableSalesLineResult[] {
  return quote.items.map(line => {
    const product = products.find(p => p.id === line.producto_id)
    const effectivePolicy = resolveEffectiveInvoicingPolicy(product, settings)
    const orderedQty = line.cantidad || 0
    const deliveredQty = line.cantidad_entregada ?? 0
    const alreadyBilledQty = line.cantidad_facturada ?? 0

    let billableQty = 0
    let reason = ''

    if (effectivePolicy === 'ORDERED') {
      billableQty = Math.max(0, orderedQty - alreadyBilledQty)

      if (billableQty === 0 && orderedQty > 0) {
        reason = 'Toda la cantidad pedida ya ha sido facturada.'
      }
    } else {
      // DELIVERED: Solo lo efectivamente despachado por almacén
      billableQty = Math.max(0, deliveredQty - alreadyBilledQty)

      if (deliveredQty === 0) {
        reason = 'Pendiente por despachar en almacén antes de facturar.'
      } else if (billableQty === 0) {
        reason = 'Toda la cantidad despachada hasta ahora ya fue facturada.'
      }
    }

    return {
      line,
      effectivePolicy,
      orderedQty,
      deliveredQty,
      alreadyBilledQty,
      billableQty,
      reason: reason || undefined
    }
  })
}

export interface BillablePurchaseLineResult {
  line: PurchaseQuoteLine
  effectivePolicy: PurchaseControlPolicy
  orderedQty: number
  receivedQty: number
  alreadyBilledQty: number
  billableQty: number
  reason?: string
}

/**
 * Evalúa cada línea de una orden de compra y determina las cantidades exactas a registrar en CxP
 * según la política de control efectiva de cada producto.
 */
export function calculateBillablePurchaseLines(
  purchase: PurchaseQuote,
  products: ProductTemplate[],
  settings?: Partial<CommercialPoliciesSettings> | null
): BillablePurchaseLineResult[] {
  return purchase.items.map(line => {
    const product = products.find(p => p.id === line.producto_id)
    const effectivePolicy = resolveEffectivePurchaseControlPolicy(product, settings)
    const orderedQty = line.cantidad || 0
    const receivedQty = line.cantidad_recibida ?? 0
    const alreadyBilledQty = line.cantidad_facturada ?? 0

    let billableQty = 0
    let reason = ''

    if (effectivePolicy === 'ORDERED') {
      billableQty = Math.max(0, orderedQty - alreadyBilledQty)

      if (billableQty === 0 && orderedQty > 0) {
        reason = 'Toda la cantidad ordenada ya ha sido registrada en CxP.'
      }
    } else {
      // RECEIVED: Solo lo efectivamente recibido en almacén
      billableQty = Math.max(0, receivedQty - alreadyBilledQty)

      if (receivedQty === 0) {
        reason = 'Pendiente por recibir en almacén antes de registrar factura de proveedor.'
      } else if (billableQty === 0) {
        reason = 'Toda la cantidad recibida hasta ahora ya fue registrada en CxP.'
      }
    }

    return {
      line,
      effectivePolicy,
      orderedQty,
      receivedQty,
      alreadyBilledQty,
      billableQty,
      reason: reason || undefined
    }
  })
}
