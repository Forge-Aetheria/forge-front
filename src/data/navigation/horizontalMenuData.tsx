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
    icon: 'tabler-packages',
    children: [
      {
        label: 'Panel Operativo',
        href: '/inventory',
        icon: 'tabler-layout-dashboard',
        exactMatch: true
      },
      {
        label: 'Operaciones',
        icon: 'tabler-forklift',
        children: [
          {
            label: 'Recepciones',
            href: '/inventory/operations/receipts',
            icon: 'tabler-package-import'
          },
          {
            label: 'Órdenes de Entrega',
            href: '/inventory/operations/deliveries',
            icon: 'tabler-package-export'
          },
          {
            label: 'Transferencias Internas',
            href: '/inventory/operations/transfers',
            icon: 'tabler-arrows-left-right'
          },
          {
            label: 'Ajustes de Stock',
            href: '/inventory/adjustments',
            icon: 'tabler-adjustments-horizontal'
          }
        ]
      },
      {
        label: 'Catálogo de Productos',
        href: '/inventory/products',
        icon: 'tabler-box'
      },
      {
        label: 'Kárdex y Movimientos',
        href: '/inventory/kardex',
        icon: 'tabler-arrows-exchange'
      },
      {
        label: 'Configuración',
        icon: 'tabler-settings',
        children: [
          {
            label: 'Categorías de Productos',
            href: '/inventory/settings/categories',
            icon: 'tabler-category'
          },
          {
            label: 'Almacenes',
            href: '/inventory/settings/warehouses',
            icon: 'tabler-building-warehouse'
          },
          {
            label: 'Ubicaciones',
            href: '/inventory/settings/locations',
            icon: 'tabler-map-pin'
          }
        ]
      }
    ]
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
    label: 'Compras',
    href: '/purchases/quotes',
    icon: 'tabler-shopping-bag'
  },
  {
    label: 'POS',
    icon: 'tabler-cash-register',
    children: [
      {
        label: 'Terminal POS',
        href: '/pos/terminal',
        icon: 'tabler-device-tablet'
      },
      {
        label: 'Turnos POS',
        href: '/pos/shifts',
        icon: 'tabler-clock-dollar'
      }
    ]
  },
  {
    label: 'About',
    href: '/about',
    icon: 'tabler-info-circle'
  }
]

export default horizontalMenuData
