// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
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

export default verticalMenuData
