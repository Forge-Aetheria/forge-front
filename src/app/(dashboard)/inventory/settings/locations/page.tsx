import type { Metadata } from 'next'
import InventoryLocationsView from '@/views/inventory/InventoryLocationsView'

export const metadata: Metadata = {
  title: 'Ubicaciones de Almacén | Foundly ERP',
  description: 'Gestión de ubicaciones internas, pasillos y estanterías por almacén'
}

export default function LocationsPage() {
  return <InventoryLocationsView />
}
