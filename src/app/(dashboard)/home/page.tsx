import type { Metadata } from 'next'
import HomeDashboardView from '@/views/home/HomeDashboardView'

export const metadata: Metadata = {
  title: 'Panel General | Foundly ERP',
  description: 'Monitoreo de finanzas, dólar BCV, ventas, compras e inventario'
}

export default function Page() {
  return <HomeDashboardView />
}
