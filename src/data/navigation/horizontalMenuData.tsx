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
