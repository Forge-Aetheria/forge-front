import React from 'react'

import { PurchaseEditWrapper } from '@/views/purchases/quotes/PurchaseEditWrapper'

export const metadata = {
  title: 'Editar Solicitud de Compra | Foundly ERP',
  description: 'Modificar borrador o cotización de proveedor'
}

export default async function EditPurchaseQuotePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  
return <PurchaseEditWrapper id={id} />
}
