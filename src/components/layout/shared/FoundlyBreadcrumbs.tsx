'use client'

import { useMemo } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import Breadcrumbs from '@mui/material/Breadcrumbs'
import Typography from '@mui/material/Typography'

interface CrumbItem {
  label: string
  href?: string
}

const SEGMENT_LABELS: Record<string, string> = {
  home: 'Inicio',
  contacts: 'Contactos',
  create: 'Nuevo',
  edit: 'Editar',
  sales: 'Ventas',
  quotes: 'Cotizaciones',
  purchases: 'Compras',
  inventory: 'Inventario',
  products: 'Catálogo',
  operations: 'Operaciones',
  receipts: 'Recepciones',
  deliveries: 'Entregas',
  transfers: 'Transferencias',
  adjustments: 'Ajustes',
  kardex: 'Kárdex',
  settings: 'Configuración',
  warehouses: 'Almacenes',
  locations: 'Ubicaciones',
  categories: 'Categorías',
  pos: 'POS',
  terminal: 'Terminal de Caja',
  shifts: 'Turnos y Arqueo',
  about: 'Acerca de'
}

export const FoundlyBreadcrumbs = () => {
  const pathname = usePathname()

  const crumbs = useMemo<CrumbItem[]>(() => {
    if (!pathname || pathname === '/' || pathname === '/home') {
      return [{ label: 'Inicio', href: '/home' }]
    }

    const segments = pathname.split('/').filter(Boolean)
    const items: CrumbItem[] = [{ label: 'Inicio', href: '/home' }]

    let accumulatedPath = ''

    segments.forEach((seg, index) => {
      accumulatedPath += `/${seg}`
      const isLast = index === segments.length - 1

      // Format dynamic IDs (e.g. cot-001, prod-123, uuid)
      let label = SEGMENT_LABELS[seg.toLowerCase()]

      if (!label) {
        if (seg.startsWith('COT-') || seg.startsWith('cot-')) {
          label = `Cotización ${seg.toUpperCase()}`
        } else if (seg.startsWith('OC-') || seg.startsWith('COM-') || seg.startsWith('com-')) {
          label = `Orden ${seg.toUpperCase()}`
        } else if (seg.startsWith('WH/') || seg.startsWith('REC-') || seg.startsWith('ENT-')) {
          label = `Operación ${seg.toUpperCase()}`
        } else if (seg.length > 15) {
          label = 'Detalle'
        } else {
          label = seg.charAt(0).toUpperCase() + seg.slice(1)
        }
      }

      items.push({
        label,
        href: isLast ? undefined : accumulatedPath
      })
    })

    return items
  }, [pathname])

  if (crumbs.length <= 1) {
    return (
      <Typography variant="body2" className="font-semibold text-[#1E1B2E] text-xs">
        Foundly ERP
      </Typography>
    )
  }

  return (
    <Breadcrumbs
      separator={<span className="text-xs text-[#9CA3AF] font-bold">/</span>}
      aria-label="breadcrumb"
      sx={{
        '& .MuiBreadcrumbs-ol': {
          flexWrap: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }}
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1

        if (isLast || !c.href) {
          return (
            <Typography
              key={i}
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                color: '#6C5CE7',
                whiteSpace: 'nowrap'
              }}
            >
              {c.label}
            </Typography>
          )
        }

        return (
          <Link
            key={i}
            href={c.href}
            className="text-xs text-[#6B7280] hover:text-[#1E1B2E] transition-colors whitespace-nowrap font-medium"
          >
            {c.label}
          </Link>
        )
      })}
    </Breadcrumbs>
  )
}

export default FoundlyBreadcrumbs
