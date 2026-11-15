import type { Metadata } from 'next'

import AboutView from '@/views/about/AboutView'

export const metadata: Metadata = {
  title: 'Acerca de Foundly ERP | Forge Labs',
  description:
    'Foundly ERP es un sistema de gestión empresarial modular para inventario, ventas, compras, contabilidad y POS.'
}

const AboutPage = () => {
  return <AboutView />
}

export default AboutPage
