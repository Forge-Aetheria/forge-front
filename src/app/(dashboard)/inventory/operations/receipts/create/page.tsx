import type { Metadata } from 'next'
import OperationOrderDetailView from '@/views/inventory/OperationOrderDetailView'

export const metadata: Metadata = {
  title: 'Nueva Recepción de Almacén | Inventario | Foundly ERP',
  description: 'Ingreso físico de mercancía de compras y proveedores'
}

export default function CreateReceiptPage() {
  return <OperationOrderDetailView id='create' defaultType='RECEIPT' />
}
