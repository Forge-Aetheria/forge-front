import type { Metadata } from 'next'
import { LandedCostDetailView } from '@/views/inventory/LandedCostDetailView'

export const metadata: Metadata = {
  title: 'Detalle de Costo en Destino | Inventario | Foundly ERP',
  description: 'Desglose y prorrateo de costos en destino sobre recepciones de inventario'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LandedCostDetailPage({ params }: PageProps) {
  const { id } = await params

  return <LandedCostDetailView id={id} />
}
