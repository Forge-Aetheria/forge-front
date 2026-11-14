import type { Metadata } from 'next'

import WarehouseOperationsListView from '@/views/inventory/WarehouseOperationsListView'

export const metadata: Metadata = {
  title: 'Transferencias Internas | Inventario | Foundly ERP',
  description: 'Traslados de mercancía entre almacenes y reubicaciones internas con trazabilidad en Kárdex'
}

export default function InventoryTransfersPage() {
  return <WarehouseOperationsListView operationType='INTERNAL_TRANSFER' />
}
