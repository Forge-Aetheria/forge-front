import { Suspense } from 'react'
import { GeneralLedgerView } from '@/views/accounting/reports/GeneralLedgerView'

export const metadata = {
  title: 'Libro Mayor - Foundly ERP'
}

export default function GeneralLedgerPage() {
  return (
    <Suspense fallback={<div>Cargando Libro Mayor...</div>}>
      <GeneralLedgerView />
    </Suspense>
  )
}
