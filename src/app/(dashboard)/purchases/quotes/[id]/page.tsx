import React from 'react'
import { PurchaseDetailView } from '@/views/purchases/quotes/PurchaseDetailView'

export const metadata = {
  title: 'Detalle de Solicitud / Orden de Compra | Foundly ERP',
  description: 'Ficha de evaluación, aprobación de costos BCV y generación de Orden de Compra'
}

export default async function PurchaseQuoteDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PurchaseDetailView id={id} />
}
