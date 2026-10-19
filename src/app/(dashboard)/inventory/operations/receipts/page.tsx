import type { Metadata } from 'next'
import WarehouseOperationsListView from '@/views/inventory/WarehouseOperationsListView'

export const metadata: Metadata = {
  title: 'Recepciones de Mercancía | Inventario | Forge ERP',
  description: 'Gestión y validación de órdenes de recepción de compras e ingresos de almacén'
}

export default function InventoryReceiptsPage() {
  return <WarehouseOperationsListView operationType='RECEIPT' />
}
