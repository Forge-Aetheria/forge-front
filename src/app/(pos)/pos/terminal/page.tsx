import type { Metadata } from 'next'

import POSTerminalView from '@/views/pos/terminal/POSTerminalView'

export const metadata: Metadata = {
  title: 'Terminal de Venta POS | Forge ERP',
  description: 'Punto de Venta Táctil Bimoneda (USD / Bs.) de Alta Velocidad'
}

const POSTerminalPage = () => {
  return <POSTerminalView />
}

export default POSTerminalPage
