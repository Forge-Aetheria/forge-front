import type { Metadata } from 'next'

import OperationOrderDetailView from '@/views/inventory/OperationOrderDetailView'

export const metadata: Metadata = {
  title: 'Detalle de Recepción | Inventario | Foundly ERP',
  description: 'Detalle, verificación y validación de recepción de almacén'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReceiptDetailPage({ params }: PageProps) {
  const { id } = await params

  return <OperationOrderDetailView id={id} defaultType='RECEIPT' />
}
