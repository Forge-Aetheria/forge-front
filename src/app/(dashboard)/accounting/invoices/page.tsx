import React, { Suspense } from 'react'
import { InvoicesListView } from '@/views/accounting/invoices/InvoicesListView'

export const metadata = {
  title: 'Facturas Contables - Foundly ERP'
}

export default function AccountingInvoicesPage() {
  return (
    <Suspense fallback={<div>Cargando facturas...</div>}>
      <InvoicesListView />
    </Suspense>
  )
}
