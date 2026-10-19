import type { Metadata } from 'next'

import InventoryDetailView from '@/views/inventory/InventoryDetailView'

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Ficha de Artículo | Forge ERP',
  description: 'Detalle de especificaciones, variantes, calculadora de margen y kárdex'
}

const InventoryProductDetailPage = async ({ params }: Props) => {
  const { id } = await params

  return <InventoryDetailView id={id} />
}

export default InventoryProductDetailPage
