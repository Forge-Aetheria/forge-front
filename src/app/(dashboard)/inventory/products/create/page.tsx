import type { Metadata } from 'next'

import InventoryDetailView from '@/views/inventory/InventoryDetailView'

export const metadata: Metadata = {
  title: 'Nuevo Artículo o Servicio | Forge ERP',
  description: 'Registro maestro de artículos, especificaciones, variantes y políticas'
}

const InventoryProductCreatePage = () => {
  return <InventoryDetailView id='create' />
}

export default InventoryProductCreatePage
