import React from 'react'

import { PurchaseMasterDetailForm } from '@/views/purchases/quotes/PurchaseMasterDetailForm'

export const metadata = {
  title: 'Nueva Solicitud de Cotización / Compra | Foundly ERP',
  description: 'Registrar solicitud de cotización de proveedor o presupuesto de compra bimonetario'
}

export default function CreatePurchaseQuotePage() {
  return <PurchaseMasterDetailForm mode='create' />
}
