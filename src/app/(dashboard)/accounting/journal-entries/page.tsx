import React, { Suspense } from 'react'

import { JournalEntriesListView } from '@/views/accounting/journal-entries/JournalEntriesListView'

export const metadata = {
  title: 'Libro Diario y Asientos - Foundly ERP'
}

export default function JournalEntriesPage() {
  return (
    <Suspense fallback={<div>Cargando Libro Diario...</div>}>
      <JournalEntriesListView />
    </Suspense>
  )
}

