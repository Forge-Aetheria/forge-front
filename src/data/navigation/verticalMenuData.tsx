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
          },
          {
            label: 'Costos en Destino',
            href: '/inventory/operations/landed-costs',
            icon: 'tabler-calculator'
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
    icon: 'tabler-address-book',
    children: [
      {
        label: 'Directorio',
        href: '/contacts',
        icon: 'tabler-users'
      },
      {
        label: 'Cuentas Bancarias',
        href: '/contacts/bank-accounts',
        icon: 'tabler-building-bank'
      }
    ]
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
    label: 'Contabilidad',
    icon: 'tabler-calculator',
    children: [
      {
        label: 'Tablero General',
        href: '/accounting/dashboard',
        icon: 'tabler-layout-dashboard'
      },
      {
        label: 'Clientes',
        icon: 'tabler-users',
        children: [
          {
            label: 'Facturas de Clientes',
            href: '/accounting/invoices?type=CUSTOMER',
            icon: 'tabler-file-invoice'
          },
          {
            label: 'Notas de Crédito',
            href: '/accounting/credit-notes?type=CUSTOMER',
            icon: 'tabler-receipt-refund'
          },
          {
            label: 'Cobros / Pagos Recibidos',
            href: '/accounting/payments?type=CUSTOMER',
            icon: 'tabler-cash'
          }
        ]
      },
      {
        label: 'Proveedores',
        icon: 'tabler-truck-delivery',
        children: [
          {
            label: 'Facturas de Proveedores',
            href: '/accounting/invoices?type=SUPPLIER',
            icon: 'tabler-receipt'
          },
          {
            label: 'Notas de Crédito',
            href: '/accounting/credit-notes?type=SUPPLIER',
            icon: 'tabler-receipt-refund'
          },
          {
            label: 'Pagos a Proveedores',
            href: '/accounting/payments?type=SUPPLIER',
            icon: 'tabler-credit-card'
          },
          {
            label: 'Lotes de Pago',
            href: '/accounting/payments/batches',
            icon: 'tabler-layers-linked'
          }
        ]
      },
      {
        label: 'Asientos Contables',
        href: '/accounting/journal-entries',
        icon: 'tabler-book-2'
      },
      {
        label: 'Reportes Financieros',
        icon: 'tabler-chart-pie',
        children: [
          {
            label: 'Balance General',
            href: '/accounting/reports/balance-sheet',
            icon: 'tabler-scale'
          },
          {
            label: 'Estado de Resultados',
            href: '/accounting/reports/profit-and-loss',
            icon: 'tabler-report-money'
          },
          {
            label: 'Libro Mayor',
            href: '/accounting/reports/general-ledger',
            icon: 'tabler-books'
          },
          {
            label: 'Balance de Comprobación',
            href: '/accounting/reports/trial-balance',
            icon: 'tabler-list-check'
          }
        ]
      },
      {
        label: 'Configuración',
        icon: 'tabler-settings',
        children: [
          {
            label: 'Plan de Cuentas (PUC)',
            href: '/accounting/chart-of-accounts',
            icon: 'tabler-list-tree'
          },
          {
            label: 'Diarios Contables',
            href: '/accounting/journals',
            icon: 'tabler-notebook'
          }
        ]
      }
    ]
  },
  {
    label: 'Ajustes',
    href: '/settings',
    icon: 'tabler-settings'
  },
  {
    label: 'About',
    href: '/about',
    icon: 'tabler-info-circle'
  }
]

export default verticalMenuData
