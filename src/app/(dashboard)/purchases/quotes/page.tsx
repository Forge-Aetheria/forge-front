import React from 'react'
import { PurchasesListView } from '@/views/purchases/quotes/PurchasesListView'

export const metadata = {
  title: 'Solicitudes y Órdenes de Compra | Foundly ERP',
  description: 'Gestión del ciclo de abastecimiento, cotizaciones de proveedor y órdenes de compra bimonetarias'
}

export default function PurchasesQuotesPage() {
  return <PurchasesListView />
}
