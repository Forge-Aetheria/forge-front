import type { Metadata } from 'next'

import OperationOrderDetailView from '@/views/inventory/OperationOrderDetailView'

export const metadata: Metadata = {
  title: 'Nueva Transferencia Interna | Inventario | Foundly ERP',
  description: 'Traslado interno de stock entre almacenes y ubicaciones'
}

export default function CreateTransferPage() {
  return <OperationOrderDetailView id='create' defaultType='INTERNAL_TRANSFER' />
}
