import React, { Suspense } from 'react'

import { CreditNotesListView } from '@/views/accounting/credit-notes/CreditNotesListView'

export const metadata = {
  title: 'Notas de Crédito - Foundly ERP'
}

export default function AccountingCreditNotesPage() {
  return (
    <Suspense fallback={<div>Cargando notas de crédito...</div>}>
      <CreditNotesListView />
    </Suspense>
  )
}
