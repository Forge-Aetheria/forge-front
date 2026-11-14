import React, { Suspense } from 'react'

import { ChartOfAccountsView } from '@/views/accounting/chart-of-accounts/ChartOfAccountsView'

export const metadata = {
  title: 'Plan de Cuentas (PUC) - Foundly ERP'
}

export default function ChartOfAccountsPage() {
  return (
    <Suspense fallback={<div>Cargando Plan de Cuentas...</div>}>
      <ChartOfAccountsView />
    </Suspense>
  )
}

