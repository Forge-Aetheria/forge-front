// Servicio de Costos en Destino (Landed Costs)
// Permite prorratear fletes, seguros, aranceles y gastos de importación sobre recepciones de almacén.
// Cumple con la normativa VEN-NIF (NIC 2) y genera asientos contables automáticos.

import type {
  LandedCostRecord,
  LandedCostCostLine,
  LandedCostReceiptRef,
  LandedCostValuationAdjustment,
  StockMovement,
  WarehouseOperationOrder
} from '@/types/inventoryTypes'
import {
  loadStoredLandedCosts,
  saveStoredLandedCosts,
  loadStoredOperationOrders,
  loadStoredTemplates,
  saveStoredTemplates,
  loadStoredMovements,
  saveStoredMovements,
  getActiveBcvRate
} from './inventoryStorage'
import { recalculateTemplateStandardCost } from './costingService'
import { accountingService } from '@/services/accountingService'

export const getLandedCosts = async (): Promise<LandedCostRecord[]> => {
  const list = loadStoredLandedCosts()
  return Promise.resolve(list)
}

export const getLandedCostById = async (id: string): Promise<LandedCostRecord | null> => {
  const list = loadStoredLandedCosts()
  const record = list.find(r => r.id === id || r.codigo === id) || null
  return Promise.resolve(record)
}

export const calculateValuationAdjustments = (
  recepciones: LandedCostReceiptRef[],
  costos: LandedCostCostLine[]
): LandedCostValuationAdjustment[] => {
  if (!recepciones.length || !costos.length) return []

  const allOrders = loadStoredOperationOrders()
  const templates = loadStoredTemplates()

  // Buscar todas las líneas de las recepciones seleccionadas
  interface ReceiptLineWithDetails {
    orderCodigo: string
    productoId: string
    productoNombre: string
    varianteId: string
    varianteSku: string
    cantidad: number
    costoUnitario: number
    valorLinea: number
    pesoTotal: number
    volumenTotal: number
  }

  const receiptLines: ReceiptLineWithDetails[] = []

  recepciones.forEach(ref => {
    const order = allOrders.find(o => o.id === ref.orden_id || o.codigo === ref.orden_codigo)
    if (!order) return

    order.lineas.forEach(line => {
      const qty = line.cantidad_procesada > 0 ? line.cantidad_procesada : line.cantidad_demanda
      if (qty <= 0) return

      const tpl = templates.find(t => t.id === line.producto_id)
      const variant = tpl?.variants.find(v => v.id === line.variante_id)

      // Solo productos almacenables reciben costeo en destino
      if (tpl && tpl.productType !== 'storable') return

      const unitCost = line.costo_unitario_usd || variant?.costPrice || tpl?.standardCost || 0
      const weight = (tpl?.weight || 1) * qty
      const volume = (tpl?.volume || 1) * qty

      receiptLines.push({
        orderCodigo: order.codigo,
        productoId: line.producto_id,
        productoNombre: line.producto_nombre,
        varianteId: line.variante_id,
        varianteSku: line.variante_sku,
        cantidad: qty,
        costoUnitario: unitCost,
        valorLinea: qty * unitCost,
        pesoTotal: weight,
        volumenTotal: volume
      })
    })
  })

  if (!receiptLines.length) return []

  // Calcular totales para los métodos de prorrateo
  const totalCount = receiptLines.length
  const totalQuantity = receiptLines.reduce((acc, l) => acc + l.cantidad, 0)
  const totalValue = receiptLines.reduce((acc, l) => acc + l.valorLinea, 0)
  const totalWeight = receiptLines.reduce((acc, l) => acc + l.pesoTotal, 0)
  const totalVolume = receiptLines.reduce((acc, l) => acc + l.volumenTotal, 0)

  // Mapa para acumular costo adicional por variante: key = varianteId
  const allocatedMap = new Map<
    string,
    {
      productoId: string
      productoNombre: string
      varianteId: string
      varianteSku: string
      cantidadRecibida: number
      costoOriginalUsd: number
      costoAdicionalUsd: number
      lineaCostoIds: string[]
    }
  >()

  receiptLines.forEach(rl => {
    const tpl = templates.find(t => t.id === rl.productoId)
    const variant = tpl?.variants.find(v => v.id === rl.varianteId)
    const currentCost = variant?.costPrice || rl.costoUnitario

    if (!allocatedMap.has(rl.varianteId)) {
      allocatedMap.set(rl.varianteId, {
        productoId: rl.productoId,
        productoNombre: rl.productoNombre,
        varianteId: rl.varianteId,
        varianteSku: rl.varianteSku,
        cantidadRecibida: rl.cantidad,
        costoOriginalUsd: currentCost,
        costoAdicionalUsd: 0,
        lineaCostoIds: []
      })
    } else {
      const existing = allocatedMap.get(rl.varianteId)!
      existing.cantidadRecibida += rl.cantidad
    }
  })

  // Distribuir cada costo según su método
  costos.forEach(costLine => {
    const monto = costLine.monto_usd || 0
    if (monto <= 0) return

    receiptLines.forEach(rl => {
      let portion = 0

      switch (costLine.metodo_reparto) {
        case 'EQUAL':
          portion = totalCount > 0 ? monto / totalCount : 0
          break
        case 'BY_QUANTITY':
          portion = totalQuantity > 0 ? (rl.cantidad / totalQuantity) * monto : 0
          break
        case 'BY_COST':
          portion = totalValue > 0 ? (rl.valorLinea / totalValue) * monto : 0
          break
        case 'BY_WEIGHT':
          portion = totalWeight > 0 ? (rl.pesoTotal / totalWeight) * monto : (rl.cantidad / totalQuantity) * monto
          break
        case 'BY_VOLUME':
          portion = totalVolume > 0 ? (rl.volumenTotal / totalVolume) * monto : (rl.cantidad / totalQuantity) * monto
          break
        default:
          portion = totalQuantity > 0 ? (rl.cantidad / totalQuantity) * monto : 0
      }

      const item = allocatedMap.get(rl.varianteId)
      if (item) {
        item.costoAdicionalUsd += portion
        if (!item.lineaCostoIds.includes(costLine.id)) {
          item.lineaCostoIds.push(costLine.id)
        }
      }
    })
  })

  // Construir ajustes de valoración finales
  const adjustments: LandedCostValuationAdjustment[] = []

  allocatedMap.forEach(item => {
    const tpl = templates.find(t => t.id === item.productoId)
    const variant = tpl?.variants.find(v => v.id === item.varianteId)
    const stockActual = variant?.physicalStock || 0
    const additionalUnitCost =
      item.cantidadRecibida > 0 ? item.costoAdicionalUsd / item.cantidadRecibida : 0

    // Según NIC 2, el nuevo costo unitario de adquisición es costo original + costo adicional unitario
    const nuevoCosto = Number((item.costoOriginalUsd + additionalUnitCost).toFixed(4))

    adjustments.push({
      id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      linea_costo_id: item.lineaCostoIds[0] || '',
      producto_id: item.productoId,
      producto_nombre: item.productoNombre,
      variante_id: item.varianteId,
      variante_sku: item.varianteSku,
      cantidad_recibida: item.cantidadRecibida,
      stock_actual: stockActual,
      costo_original_usd: Number(item.costoOriginalUsd.toFixed(4)),
      costo_adicional_usd: Number(item.costoAdicionalUsd.toFixed(2)),
      costo_adicional_unitario_usd: Number(additionalUnitCost.toFixed(4)),
      nuevo_costo_usd: nuevoCosto
    })
  })

  return adjustments
}

export const createLandedCost = async (
  input: Partial<LandedCostRecord>
): Promise<LandedCostRecord> => {
  const list = loadStoredLandedCosts()
  const year = new Date().getFullYear()
  const count = list.length + 1
  const correlativo = String(count).padStart(4, '0')
  const codigo = `CD/${year}/${correlativo}`
  const now = new Date().toISOString()

  const recepciones = input.recepciones || []
  const costos = input.costos || []
  const totalMontoUsd = costos.reduce((acc, c) => acc + (Number(c.monto_usd) || 0), 0)
  const ajustes = calculateValuationAdjustments(recepciones, costos)

  const newRecord: LandedCostRecord = {
    id: `lc-${Date.now()}`,
    codigo,
    fecha: input.fecha || now,
    estado: 'DRAFT',
    referencia: input.referencia || '',
    notas: input.notas || '',
    recepciones,
    costos,
    ajustes_valoracion: ajustes,
    total_monto_usd: Number(totalMontoUsd.toFixed(2)),
    createdAt: now
  }

  list.unshift(newRecord)
  saveStoredLandedCosts(list)

  return Promise.resolve(newRecord)
}

export const updateLandedCost = async (
  id: string,
  partial: Partial<LandedCostRecord>
): Promise<LandedCostRecord> => {
  const list = loadStoredLandedCosts()
  const idx = list.findIndex(r => r.id === id)

  if (idx === -1) {
    throw new Error('Registro de costo en destino no encontrado.')
  }

  const existing = list[idx]

  if (existing.estado === 'APPLIED') {
    throw new Error('Un costo en destino ya validado y aplicado no puede ser modificado.')
  }

  const recepciones = partial.recepciones !== undefined ? partial.recepciones : existing.recepciones
  const costos = partial.costos !== undefined ? partial.costos : existing.costos
  const totalMontoUsd = costos.reduce((acc, c) => acc + (Number(c.monto_usd) || 0), 0)
  const ajustes = calculateValuationAdjustments(recepciones, costos)

  const updated: LandedCostRecord = {
    ...existing,
    ...partial,
    recepciones,
    costos,
    ajustes_valoracion: ajustes,
    total_monto_usd: Number(totalMontoUsd.toFixed(2))
  }

  list[idx] = updated
  saveStoredLandedCosts(list)

  return Promise.resolve(updated)
}

export const deleteLandedCost = async (id: string): Promise<void> => {
  const list = loadStoredLandedCosts()
  const target = list.find(r => r.id === id)

  if (!target) {
    throw new Error('Registro no encontrado.')
  }

  if (target.estado === 'APPLIED') {
    throw new Error('No se puede eliminar un costo en destino ya validado y contabilizado.')
  }

  const filtered = list.filter(r => r.id !== id)
  saveStoredLandedCosts(filtered)

  return Promise.resolve()
}

export const validateLandedCost = async (id: string): Promise<LandedCostRecord> => {
  const list = loadStoredLandedCosts()
  const idx = list.findIndex(r => r.id === id)

  if (idx === -1) {
    throw new Error('Registro de costo en destino no encontrado.')
  }

  const record = list[idx]

  if (record.estado === 'APPLIED') {
    throw new Error('Este costo en destino ya fue validado y aplicado previamente.')
  }

  if (!record.recepciones.length) {
    throw new Error('Debe vincular al menos una recepción de almacén realizada.')
  }

  if (!record.costos.length || record.total_monto_usd <= 0) {
    throw new Error('Debe registrar al menos una línea de costo con monto mayor a cero.')
  }

  // Recalcular ajustes de valoración en el momento de validar
  const adjustments = calculateValuationAdjustments(record.recepciones, record.costos)

  if (!adjustments.length) {
    throw new Error('No se encontraron artículos almacenables en las recepciones seleccionadas para prorratear.')
  }

  const templates = loadStoredTemplates()
  const movements = loadStoredMovements()
  const now = new Date().toISOString()
  const tasaBcv = getActiveBcvRate()

  let totalAllocatedToInventory = 0
  let totalAllocatedToCogs = 0

  // 1. Aplicar nuevo costo promedio a las variantes y generar movimientos en Kárdex
  adjustments.forEach(adj => {
    const tIdx = templates.findIndex(t => t.id === adj.producto_id)
    if (tIdx === -1) return

    const tpl = templates[tIdx]
    const vIdx = tpl.variants.findIndex(v => v.id === adj.variante_id)
    if (vIdx === -1) return

    const variant = tpl.variants[vIdx]

    // Actualizar costo de la variante con el nuevo costo ponderado
    tpl.variants[vIdx] = {
      ...variant,
      costPrice: adj.nuevo_costo_usd
    }

    // Recalcular costo estándar del producto padre
    tpl.standardCost = recalculateTemplateStandardCost(tpl.variants)
    tpl.updatedAt = now
    templates[tIdx] = tpl

    // Prorrateo contable: existencia actual vs unidades ya vendidas
    const stockActual = Math.max(0, variant.physicalStock)
    const ratioExistencia =
      adj.cantidad_recibida > 0 ? Math.min(1, stockActual / adj.cantidad_recibida) : 1
    const montoInventario = Number((adj.costo_adicional_usd * ratioExistencia).toFixed(2))
    const montoCostoVentas = Number((adj.costo_adicional_usd - montoInventario).toFixed(2))

    totalAllocatedToInventory += montoInventario
    totalAllocatedToCogs += montoCostoVentas

    // Movimiento Kárdex de tipo LANDED_COST (cantidad 0, incremento de valor)
    const mov: StockMovement = {
      id: `mov-lc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fecha: now,
      producto_id: tpl.id,
      producto_nombre: tpl.name,
      variante_id: variant.id,
      variante_sku: variant.sku,
      uom_code: 'un',
      tipo_movimiento: 'LANDED_COST',
      documento_referencia: record.codigo,
      cantidad_entrada: 0,
      cantidad_salida: 0,
      costo_unitario_usd: adj.costo_adicional_unitario_usd,
      costo_promedio_usd: adj.nuevo_costo_usd,
      valor_movimiento_usd: adj.costo_adicional_usd,
      saldo_valorizado_usd: Number((variant.physicalStock * adj.nuevo_costo_usd).toFixed(2)),
      saldo_resultante: variant.physicalStock,
      motivo: `Costo en Destino ${record.codigo}: ${record.costos.map(c => c.producto_nombre).join(', ')}${record.referencia ? ` (${record.referencia})` : ''}`,
      almacen: 'Costos Adicionales de Importación / Destino',
      usuario_responsable: 'Elena Rivas'
    }

    movements.unshift(mov)
  })

  saveStoredTemplates(templates)
  saveStoredMovements(movements)

  // 2. Generar Asiento Contable Automático
  // Debe: 1.1.03.01 Inventario (porción en stock) + 5.1.01.01 Costo de Ventas (porción vendida)
  // Haber: 2.1.01.01 Cuentas por Pagar Proveedores
  let entryId = ''
  let entryNum = ''

  try {
    const totalDebe = Number((totalAllocatedToInventory + totalAllocatedToCogs).toFixed(2))
    const totalHaber = record.total_monto_usd

    // Ajustar cualquier centavo de redondeo
    const roundDiff = Number((totalHaber - totalDebe).toFixed(2))
    const adjustedInv = Number((totalAllocatedToInventory + roundDiff).toFixed(2))

    const journalLines = []

    if (adjustedInv > 0) {
      journalLines.push({
        cuentaId: 'acc-110301',
        cuentaCodigo: '1.1.03.01',
        cuentaNombre: 'Inventario de Mercancía para la Venta',
        etiqueta: 'Capitalización costo en destino',
        debeUsd: adjustedInv,
        haberUsd: 0,
        debeVes: Number((adjustedInv * tasaBcv).toFixed(2)),
        haberVes: 0,
        descripcion: `Capitalización costo en destino ${record.codigo}`
      })
    }

    if (totalAllocatedToCogs > 0) {
      journalLines.push({
        cuentaId: 'acc-510101',
        cuentaCodigo: '5.1.01.01',
        cuentaNombre: 'Costo de Ventas de Mercancía',
        etiqueta: 'Costo de Ventas (Unidades Despachadas)',
        debeUsd: totalAllocatedToCogs,
        haberUsd: 0,
        debeVes: Number((totalAllocatedToCogs * tasaBcv).toFixed(2)),
        haberVes: 0,
        descripcion: `Imputación unidades vendidas ${record.codigo}`
      })
    }

    // Haber a Proveedores (CxP)
    journalLines.push({
      cuentaId: 'acc-210101',
      cuentaCodigo: '2.1.01.01',
      cuentaNombre: 'Cuentas por Pagar Proveedores Nacionales (CxP)',
      etiqueta: 'Pasivo CxP Costos en Destino',
      debeUsd: 0,
      haberUsd: totalHaber,
      debeVes: 0,
      haberVes: Number((totalHaber * tasaBcv).toFixed(2)),
      descripcion: `Pasivo por costos en destino ${record.codigo}`
    })

    const entry = await accountingService.createJournalEntry({
      diarioId: 'jou-purchases',
      fecha: record.fecha.split('T')[0],
      origen: 'MANUAL',
      documentoReferencia: record.codigo,
      estado: 'POSTED',
      tasaBcv,
      lineas: journalLines,
      notas: `Liquidación de Costos en Destino ${record.codigo} para recepciones ${record.recepciones.map(r => r.orden_codigo).join(', ')}`,
      creadoPor: 'Elena Rivas'
    })

    entryId = entry.id
    entryNum = entry.numeroAsiento
  } catch (err) {
    console.warn('No se pudo generar el asiento contable automático para el costo en destino:', err)
  }

  // 3. Actualizar registro a APPLIED
  const updatedRecord: LandedCostRecord = {
    ...record,
    estado: 'APPLIED',
    ajustes_valoracion: adjustments,
    asiento_contable_id: entryId,
    asiento_contable_numero: entryNum,
    appliedAt: now
  }

  list[idx] = updatedRecord
  saveStoredLandedCosts(list)

  return Promise.resolve(updatedRecord)
}
