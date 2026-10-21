import type {
  StockMovement,
  WarehouseOperationOrder,
  WarehouseOperationType,
  WarehouseOperationStatus,
  WarehouseOperationLine
} from '@/types/inventoryTypes'
import {
  loadStoredOperationOrders,
  saveStoredOperationOrders,
  loadStoredTemplates,
  saveStoredTemplates,
  loadStoredMovements,
  saveStoredMovements
} from './inventoryStorage'
import {
  calculateWeightedAverageCost,
  recalculateTemplateStandardCost,
  getSystemNegativeStockPolicy
} from './costingService'
import { salesQuotesService } from '@/services/salesQuotesService'
import { purchasesService } from '@/services/purchasesService'

export const getWarehouseOperationOrderById = async (
  id: string
): Promise<WarehouseOperationOrder | null> => {
  const orders = loadStoredOperationOrders()
  const order = orders.find(o => o.id === id || o.codigo === id) || null
  return Promise.resolve(order)
}

export const getWarehouseOperationOrders = async (
  tipo?: WarehouseOperationType
): Promise<WarehouseOperationOrder[]> => {
  const orders = loadStoredOperationOrders()

  if (tipo) {
    return Promise.resolve(orders.filter(o => o.tipo === tipo))
  }

  return Promise.resolve(orders)
}

export const createWarehouseOperationOrder = async (input: {
  tipo: WarehouseOperationType
  tercero_nombre: string
  documento_origen?: string
  almacen_origen_id?: string
  almacen_origen_nombre: string
  ubicacion_origen_nombre?: string
  almacen_destino_id?: string
  almacen_destino_nombre: string
  ubicacion_destino_nombre?: string
  fecha_programada: string
  responsable?: string
  notas?: string
  estado?: WarehouseOperationStatus
  lineas: Omit<WarehouseOperationLine, 'id'>[]
}): Promise<WarehouseOperationOrder> => {
  const orders = loadStoredOperationOrders()

  if (!input.lineas || input.lineas.length === 0) {
    throw new Error('Debes incluir al menos un artículo en la operación.')
  }

  const prefix =
    input.tipo === 'RECEIPT'
      ? 'IN'
      : input.tipo === 'DELIVERY'
      ? 'OUT'
      : 'INT'

  const sameTypeCount = orders.filter(o => o.tipo === input.tipo).length + 95
  const nextNumber = sameTypeCount.toString().padStart(4, '0')
  const codigo = `${prefix}/2026/${nextNumber}`

  const lineasConId: WarehouseOperationLine[] = input.lineas.map((l, idx) => ({
    ...l,
    id: `lin-${Date.now()}-${idx + 1}`,
    cantidad_procesada: l.cantidad_procesada ?? l.cantidad_demanda
  }))

  const totalArticulos = lineasConId.reduce((acc, l) => acc + l.cantidad_demanda, 0)

  const newOrder: WarehouseOperationOrder = {
    id: `ord-${Date.now()}`,
    codigo,
    tipo: input.tipo,
    estado: input.estado || 'READY',
    tercero_nombre: input.tercero_nombre.trim() || 'Operación de Almacén',
    documento_origen: input.documento_origen?.trim() || undefined,
    almacen_origen_id: input.almacen_origen_id,
    almacen_origen_nombre: input.almacen_origen_nombre,
    ubicacion_origen_nombre: input.ubicacion_origen_nombre,
    almacen_destino_id: input.almacen_destino_id,
    almacen_destino_nombre: input.almacen_destino_nombre,
    ubicacion_destino_nombre: input.ubicacion_destino_nombre,
    fecha_programada: input.fecha_programada || new Date().toISOString().slice(0, 10),
    total_articulos: totalArticulos,
    responsable: input.responsable?.trim() || 'Elena Rivas',
    notas: input.notas?.trim() || undefined,
    lineas: lineasConId,
    createdAt: new Date().toISOString()
  }

  const updated = [newOrder, ...orders]

  saveStoredOperationOrders(updated)

  return Promise.resolve(newOrder)
}

export const validateWarehouseOperationOrder = async (
  orderId: string,
  processedQuantities?: Record<string, number>
): Promise<WarehouseOperationOrder> => {
  const orders = loadStoredOperationOrders()
  const idx = orders.findIndex(o => o.id === orderId)

  if (idx === -1) {
    throw new Error('Orden de operación no encontrada.')
  }

  const order = orders[idx]

  if (order.estado === 'COMPLETED') {
    throw new Error('Esta operación ya fue procesada y validada.')
  }

  const templates = loadStoredTemplates()
  const movements = loadStoredMovements()
  const now = new Date().toISOString()

  // Update lines with custom processed quantities if provided
  const updatedLines = order.lineas.map(line => {
    const qty =
      processedQuantities && processedQuantities[line.id] !== undefined
        ? Math.max(0, Number(processedQuantities[line.id]))
        : line.cantidad_procesada > 0
        ? line.cantidad_procesada
        : line.cantidad_demanda

    return {
      ...line,
      cantidad_procesada: qty
    }
  })

  // Get active system negative stock policy
  const negativeStockPolicy = await getSystemNegativeStockPolicy()

  // First check stock availability if DELIVERY of storable items and policy is BLOCK
  if (order.tipo === 'DELIVERY') {
    for (const line of updatedLines) {
      if (line.cantidad_procesada <= 0) continue
      const tpl = templates.find(t => t.id === line.producto_id)
      const variant = tpl?.variants.find(v => v.id === line.variante_id)

      if (tpl && tpl.productType === 'storable' && variant) {
        if (negativeStockPolicy === 'BLOCK' && variant.physicalStock < line.cantidad_procesada) {
          throw new Error(
            `Stock físico insuficiente para ${line.producto_nombre} (${line.variante_sku}). Disponible en almacén: ${variant.physicalStock} ${line.uom_code}. Política activa: Bloqueo Estricto de Stock Negativo.`
          )
        }
      }
    }
  }

  // Apply stock changes & generate Kardex movements
  updatedLines.forEach(line => {
    if (line.cantidad_procesada <= 0) return

    const tIdx = templates.findIndex(t => t.id === line.producto_id)

    if (tIdx === -1) return

    const tpl = templates[tIdx]
    const vIdx = tpl.variants.findIndex(v => v.id === line.variante_id)

    if (vIdx === -1) return

    const variant = tpl.variants[vIdx]
    let newPhysical = variant.physicalStock
    let newReserved = variant.reservedStock
    let newAvgCost = variant.costPrice || tpl.standardCost || 0
    const lineUnitCost = line.costo_unitario_usd || variant.costPrice || tpl.standardCost || 0

    if (order.tipo === 'RECEIPT') {
      // Recalcular Costo Promedio Ponderado Móvil (AVCO) de la variante
      newAvgCost = calculateWeightedAverageCost(
        variant.physicalStock,
        variant.costPrice || 0,
        line.cantidad_procesada,
        lineUnitCost
      )
      newPhysical = variant.physicalStock + line.cantidad_procesada
    } else if (order.tipo === 'DELIVERY') {
      if (negativeStockPolicy === 'BLOCK') {
        newPhysical = Math.max(0, variant.physicalStock - line.cantidad_procesada)
      } else {
        // En modo flexible, el stock físico puede ser negativo
        newPhysical = variant.physicalStock - line.cantidad_procesada
      }
      newReserved = Math.max(0, variant.reservedStock - line.cantidad_procesada)
      // En despachos el costo promedio de las existencias restantes no cambia
    }

    const newAvailable = newPhysical - newReserved

    // Actualizar variante con nuevo stock y nuevo costo promedio
    tpl.variants[vIdx] = {
      ...variant,
      costPrice: newAvgCost,
      physicalStock: newPhysical,
      reservedStock: newReserved,
      availableStock: newAvailable
    }

    // Recalcular costo estándar del producto padre ponderado por existencias
    tpl.standardCost = recalculateTemplateStandardCost(tpl.variants)
    tpl.updatedAt = now
    templates[tIdx] = tpl

    const warehouseDisplay =
      order.tipo === 'RECEIPT'
        ? `${order.almacen_destino_nombre}${order.ubicacion_destino_nombre ? ` (${order.ubicacion_destino_nombre.split('·')[0].trim()})` : ''}`
        : order.tipo === 'DELIVERY'
        ? `${order.almacen_origen_nombre}${order.ubicacion_origen_nombre ? ` (${order.ubicacion_origen_nombre.split('·')[0].trim()})` : ''}`
        : `${order.almacen_origen_nombre} → ${order.almacen_destino_nombre}`

    const qtyEntrada =
      order.tipo === 'RECEIPT' || order.tipo === 'INTERNAL_TRANSFER'
        ? line.cantidad_procesada
        : 0
    const qtySalida =
      order.tipo === 'DELIVERY' || order.tipo === 'INTERNAL_TRANSFER'
        ? line.cantidad_procesada
        : 0
    const unitCost = order.tipo === 'RECEIPT' ? lineUnitCost : (variant.costPrice || lineUnitCost)
    const movQty = qtyEntrada > 0 ? qtyEntrada : qtySalida
    const movVal = Number((movQty * unitCost).toFixed(2))
    const saldoVal = Number((newPhysical * newAvgCost).toFixed(2))

    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fecha: now,
      producto_id: tpl.id,
      producto_nombre: tpl.name,
      variante_id: variant.id,
      variante_sku: variant.sku,
      uom_code: line.uom_code,
      tipo_movimiento:
        order.tipo === 'RECEIPT'
          ? 'PURCHASE_RECEIPT'
          : order.tipo === 'DELIVERY'
          ? 'SALE_DELIVERY'
          : 'INTERNAL_TRANSFER',
      documento_referencia: order.codigo,
      cantidad_entrada: qtyEntrada,
      cantidad_salida: qtySalida,
      costo_unitario_usd: unitCost,
      costo_promedio_usd: newAvgCost,
      valor_movimiento_usd: movVal,
      saldo_valorizado_usd: saldoVal,
      saldo_resultante: newPhysical,
      motivo:
        order.tipo === 'RECEIPT'
          ? `Recepción de ${order.tercero_nombre}${order.documento_origen ? ` (${order.documento_origen})` : ''}`
          : order.tipo === 'DELIVERY'
          ? `Despacho a ${order.tercero_nombre}${order.documento_origen ? ` (${order.documento_origen})` : ''}`
          : `Traslado: ${order.almacen_origen_nombre}${order.ubicacion_origen_nombre ? ` [${order.ubicacion_origen_nombre.split('·')[0].trim()}]` : ''} → ${order.almacen_destino_nombre}${order.ubicacion_destino_nombre ? ` [${order.ubicacion_destino_nombre.split('·')[0].trim()}]` : ''}`,
      almacen: warehouseDisplay,
      usuario_responsable: order.responsable || 'Elena Rivas'
    }

    movements.unshift(mov)
  })

  saveStoredTemplates(templates)
  saveStoredMovements(movements)

  const updatedOrder: WarehouseOperationOrder = {
    ...order,
    estado: 'COMPLETED',
    fecha_efectiva: now,
    lineas: updatedLines,
    total_articulos: updatedLines.reduce((acc, l) => acc + l.cantidad_procesada, 0)
  }

  orders[idx] = updatedOrder
  saveStoredOperationOrders(orders)

  // Interconexión Almacén ➔ Ventas y Compras (SPEC-009)
  if (updatedOrder.documento_origen) {
    const lineQtys = updatedLines.map(l => ({
      producto_id: l.producto_id,
      cantidad: l.cantidad_procesada
    }))

    if (updatedOrder.tipo === 'DELIVERY') {
      try {
        salesQuotesService.recordDeliveryOperation(
          updatedOrder.documento_origen,
          updatedOrder.codigo,
          lineQtys
        )
      } catch (err) {
        console.warn('Error sincronizando entrega con ventas:', err)
      }
    } else if (updatedOrder.tipo === 'RECEIPT') {
      try {
        purchasesService.recordReceptionOperation(
          updatedOrder.documento_origen,
          updatedOrder.codigo,
          lineQtys
        )
      } catch (err) {
        console.warn('Error sincronizando recepción con compras:', err)
      }
    }
  }

  return Promise.resolve(updatedOrder)
}

export const cancelWarehouseOperationOrder = async (
  orderId: string
): Promise<WarehouseOperationOrder> => {
  const orders = loadStoredOperationOrders()
  const idx = orders.findIndex(o => o.id === orderId)

  if (idx === -1) {
    throw new Error('Orden no encontrada.')
  }

  if (orders[idx].estado === 'COMPLETED') {
    throw new Error('No se puede cancelar una operación ya realizada.')
  }

  orders[idx] = {
    ...orders[idx],
    estado: 'CANCELLED'
  }
  saveStoredOperationOrders(orders)

  return Promise.resolve(orders[idx])
}
