import type { Metadata } from 'next'
import { LandedCostsListView } from '@/views/inventory/LandedCostsListView'

export const metadata: Metadata = {
  title: 'Costos en Destino | Inventario | Foundly ERP',
  description: 'Gestión y prorrateo de costos adicionales de fletes, aranceles y seguros sobre compras'
}

export default function LandedCostsPage() {
  return <LandedCostsListView />
}
