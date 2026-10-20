import React, { Suspense } from 'react'
import { PaymentsListView } from '@/views/accounting/payments/PaymentsListView'

export const metadata = {
  title: 'Tesorería y Pagos - Foundly ERP'
}

export default function AccountingPaymentsPage() {
  return (
    <Suspense fallback={<div>Cargando pagos...</div>}>
      <PaymentsListView />
    </Suspense>
  )
}
