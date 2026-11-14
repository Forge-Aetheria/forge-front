import type { Metadata } from 'next'

import OperationOrderDetailView from '@/views/inventory/OperationOrderDetailView'

export const metadata: Metadata = {
  title: 'Detalle de Entrega | Inventario | Foundly ERP',
  description: 'Detalle y validación de orden de entrega'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DeliveryDetailPage({ params }: PageProps) {
  const { id } = await params

  return <OperationOrderDetailView id={id} defaultType='DELIVERY' />
}
