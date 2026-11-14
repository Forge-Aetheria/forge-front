// Servicio de Costeo y Valorización de Inventario (AVCO / Costo Promedio Ponderado por Variante)
// Cumple con la normativa VEN-NIF (NIC 2) y el Código Orgánico Tributario / SENIAT

import type { ProductVariant, NegativeStockPolicy } from '@/types/inventoryTypes'
import { settingsService } from '@/services/settingsService'

/**
 * Calcula el nuevo Costo Promedio Ponderado Móvil (AVCO).
 *
 * Fórmula:
 * C_nuevo = ( (Stock_actual * Costo_actual) + (Cant_recibida * Costo_compra) ) / (Stock_actual + Cant_recibida)
 *
 * Si el stock actual es <= 0 (debido al modo flexible de stock negativo):
 * El costo de la compra pasa a ser el nuevo costo promedio directo.
 */
export const calculateWeightedAverageCost = (
  currentStock: number,
  currentAvgCost: number,
  incomingQty: number,
  incomingUnitCost: number
): number => {
  if (incomingQty <= 0) {
    return currentAvgCost
  }

  // Si no había stock o estaba en negativo por política flexible
  if (currentStock <= 0) {
    return Number(incomingUnitCost.toFixed(4))
  }

  const currentValue = currentStock * currentAvgCost
  const incomingValue = incomingQty * incomingUnitCost
  const totalStock = currentStock + incomingQty

  if (totalStock <= 0) {
    return Number(incomingUnitCost.toFixed(4))
  }

  const newAverage = (currentValue + incomingValue) / totalStock

  return Number(newAverage.toFixed(4))
}

/**
 * Recalcula el costo estándar del template ponderando el costo de sus variantes por sus existencias.
 */
export const recalculateTemplateStandardCost = (variants: ProductVariant[]): number => {
  if (!variants || variants.length === 0) return 0

  let totalValue = 0
  let totalStock = 0

  variants.forEach(v => {
    const stock = Math.max(0, v.physicalStock)
    const cost = v.costPrice || 0

    totalValue += stock * cost
    totalStock += stock
  })

  if (totalStock > 0) {
    return Number((totalValue / totalStock).toFixed(2))
  }

  // Si no hay stock físico, calcula el promedio simple de los costos configurados
  const sumCosts = variants.reduce((acc, v) => acc + (v.costPrice || 0), 0)

  return Number((sumCosts / variants.length).toFixed(2))
}

/**
 * Obtiene la política de stock negativo configurada en los ajustes del sistema.
 */
export const getSystemNegativeStockPolicy = async (): Promise<NegativeStockPolicy> => {
  try {
    const rules = await settingsService.getFiscalRules()

    return rules.negativeStockPolicy || 'FLEXIBLE'
  } catch {
    return 'FLEXIBLE'
  }
}
