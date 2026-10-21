import type { Metadata } from 'next'
import { LandedCostDetailView } from '@/views/inventory/LandedCostDetailView'

export const metadata: Metadata = {
  title: 'Nuevo Costo en Destino | Inventario | Foundly ERP',
  description: 'Registro de liquidación y prorrateo de costos adicionales sobre recepciones de almacén'
}

export default function CreateLandedCostPage() {
  return <LandedCostDetailView id='create' />
}
