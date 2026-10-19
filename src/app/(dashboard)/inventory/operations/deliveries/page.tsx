import type { Metadata } from 'next'
import WarehouseOperationsListView from '@/views/inventory/WarehouseOperationsListView'

export const metadata: Metadata = {
  title: 'Órdenes de Entrega (Despachos) | Inventario | Forge ERP',
  description: 'Gestión y validación de órdenes de entrega y despachos de ventas'
}

export default function InventoryDeliveriesPage() {
  return <WarehouseOperationsListView operationType='DELIVERY' />
}
