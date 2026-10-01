import type { Metadata } from 'next'
import InventoryDetailView from '@/views/inventory/InventoryDetailView'

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Ficha de Artículo | Forge ERP',
  description: 'Detalle de especificaciones, variantes y kardex'
}

const InventoryItemPage = async ({ params }: Props) => {
  const { id } = await params

  return <InventoryDetailView id={id} />
}

export default InventoryItemPage
