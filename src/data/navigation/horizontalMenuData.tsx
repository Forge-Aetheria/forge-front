// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: 'Home',
    href: '/home',
    icon: 'tabler-smart-home'
  },
  {
    label: 'Inventario',
    href: '/inventory',
    icon: 'tabler-packages'
  },
  {
    label: 'Contactos',
    href: '/contacts',
    icon: 'tabler-address-book'
  },
  {
    label: 'Ventas',
    href: '/sales/quotes',
    icon: 'tabler-file-invoice'
  },
  {
    label: 'Terminal POS',
    href: '/pos/terminal',
    icon: 'tabler-device-tablet'
  },
  {
    label: 'Turnos POS',
    href: '/pos/shifts',
    icon: 'tabler-clock-dollar'
  },
  {
    label: 'About',
    href: '/about',
    icon: 'tabler-info-circle'
  }
]

export default horizontalMenuData
