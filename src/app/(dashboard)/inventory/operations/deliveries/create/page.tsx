import type { Metadata } from 'next'
import OperationOrderDetailView from '@/views/inventory/OperationOrderDetailView'

export const metadata: Metadata = {
  title: 'Nueva Orden de Entrega | Inventario | Foundly ERP',
  description: 'Despacho de mercancía y salida de almacén'
}

export default function CreateDeliveryPage() {
  return <OperationOrderDetailView id='create' defaultType='DELIVERY' />
}
