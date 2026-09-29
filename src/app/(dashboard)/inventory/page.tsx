import type { Metadata } from 'next'
import InventoryDashboard from '@/views/inventory/InventoryDashboard'

export const metadata: Metadata = {
  title: 'Inventario & Catálogo | Forge ERP',
  description: 'Gestión y control de inventario, variantes físicas, precios y kardex'
}

const InventoryPage = () => {
  return <InventoryDashboard />
}

export default InventoryPage
