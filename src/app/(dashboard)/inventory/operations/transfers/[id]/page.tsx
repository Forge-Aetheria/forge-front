import type { Metadata } from 'next'

import OperationOrderDetailView from '@/views/inventory/OperationOrderDetailView'

export const metadata: Metadata = {
  title: 'Detalle de Transferencia Interna | Inventario | Foundly ERP',
  description: 'Detalle y validación de traslado entre almacenes'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransferDetailPage({ params }: PageProps) {
  const { id } = await params

  return <OperationOrderDetailView id={id} defaultType='INTERNAL_TRANSFER' />
}
