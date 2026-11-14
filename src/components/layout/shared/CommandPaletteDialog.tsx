'use client'

import { useEffect, useState, useMemo } from 'react'

import { useRouter, usePathname } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'

interface CommandItem {
  id: string
  title: string
  subtitle: string
  href: string
  category: 'Módulo' | 'Acción Rápida' | 'Inventario' | 'Ventas y Compras' | 'POS'
  icon: string
  shortcut?: string
}

const COMMAND_ITEMS: CommandItem[] = [
  // Módulos
  { id: 'home', title: 'Panel Principal (Home)', subtitle: 'Métricas, resumen y dólar BCV', href: '/home', category: 'Módulo', icon: 'tabler-smart-home', shortcut: 'G H' },
  { id: 'contacts', title: 'Directorio de Contactos', subtitle: 'Clientes, proveedores y empresas', href: '/contacts', category: 'Módulo', icon: 'tabler-address-book', shortcut: 'G C' },
  { id: 'sales-quotes', title: 'Ventas y Cotizaciones', subtitle: 'Presupuestos y órdenes de venta', href: '/sales/quotes', category: 'Módulo', icon: 'tabler-file-invoice', shortcut: 'G V' },
  { id: 'purchases-quotes', title: 'Compras y Abastecimiento', subtitle: 'Solicitudes y órdenes de compra', href: '/purchases/quotes', category: 'Módulo', icon: 'tabler-shopping-bag', shortcut: 'G P' },
  { id: 'inventory-products', title: 'Catálogo de Productos', subtitle: 'Artículos, variantes y stock disponible', href: '/inventory/products', category: 'Módulo', icon: 'tabler-box', shortcut: 'G A' },
  { id: 'inventory-ops', title: 'Operaciones de Almacén', subtitle: 'Recepciones, entregas y transferencias', href: '/inventory/operations/receipts', category: 'Módulo', icon: 'tabler-forklift', shortcut: 'G O' },
  { id: 'inventory-kardex', title: 'Kárdex de Movimientos', subtitle: 'Trazabilidad y libro mayor de stock', href: '/inventory/kardex', category: 'Módulo', icon: 'tabler-arrows-exchange', shortcut: 'G K' },
  { id: 'inventory-warehouses', title: 'Almacenes Físicos', subtitle: 'Gestión de almacenes y sucursales', href: '/inventory/settings/warehouses', category: 'Inventario', icon: 'tabler-building-warehouse' },
  { id: 'inventory-locations', title: 'Ubicaciones de Almacén', subtitle: 'Pasillos, estanterías y zonas', href: '/inventory/settings/locations', category: 'Inventario', icon: 'tabler-map-pin' },
  { id: 'pos-terminal', title: 'Terminal POS', subtitle: 'Caja rápida, facturación y cobro', href: '/pos/terminal', category: 'POS', icon: 'tabler-device-tablet', shortcut: 'G T' },
  { id: 'pos-shifts', title: 'Turnos y Arqueo POS', subtitle: 'Aperturas, cierres y balance de caja', href: '/pos/shifts', category: 'POS', icon: 'tabler-clock-dollar' },

  // Acciones Rápidas
  { id: 'new-quote', title: 'Crear Nueva Cotización de Venta', subtitle: 'Presupuesto bimonetario para cliente', href: '/sales/quotes/create', category: 'Acción Rápida', icon: 'tabler-plus', shortcut: '+ V' },
  { id: 'new-purchase', title: 'Crear Solicitud de Compra', subtitle: 'Cotización con proveedor y precios', href: '/purchases/quotes/create', category: 'Acción Rápida', icon: 'tabler-plus', shortcut: '+ C' },
  { id: 'new-contact', title: 'Registrar Nuevo Contacto', subtitle: 'Ficha de cliente o proveedor', href: '/contacts/create', category: 'Acción Rápida', icon: 'tabler-user-plus', shortcut: '+ T' },
  { id: 'new-receipt', title: 'Nueva Recepción de Almacén', subtitle: 'Ingreso físico de mercancía', href: '/inventory/operations/receipts', category: 'Acción Rápida', icon: 'tabler-package-import' },
  { id: 'new-delivery', title: 'Nueva Orden de Entrega', subtitle: 'Despacho de salida a cliente', href: '/inventory/operations/deliveries', category: 'Acción Rápida', icon: 'tabler-package-export' },
  { id: 'stock-adjustment', title: 'Ajuste de Stock Físico', subtitle: 'Conteo y corrección de inventario', href: '/inventory/adjustments', category: 'Acción Rápida', icon: 'tabler-adjustments-horizontal' }
]

export const CommandPaletteDialog = () => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  // Detectar módulo actual para contextualizar la búsqueda
  const currentContext = useMemo(() => {
    if (pathname.startsWith('/inventory')) return 'Inventario'
    if (pathname.startsWith('/contacts')) return 'Contactos'
    if (pathname.startsWith('/sales')) return 'Ventas'
    if (pathname.startsWith('/purchases')) return 'Compras'
    if (pathname.startsWith('/pos')) return 'POS'
    
return null
  }, [pathname])

  // Listener para atajos globales: Cmd+K / Ctrl+K (estándar libre de colisión) y Cmd+Espacio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')
      const isCmdSpace = (e.metaKey || e.ctrlKey) && (e.code === 'Space' || e.key === ' ')

      if (isCmdK || isCmdSpace) {
        e.preventDefault()
        setOpen(prev => !prev)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const filteredItems = useMemo(() => {
    let items = COMMAND_ITEMS

    if (query.trim()) {
      const q = query.toLowerCase()

      items = items.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
    } else if (currentContext) {
      // Priorizar elementos contextuales del módulo activo
      items = [
        ...items.filter(item => {
          if (currentContext === 'Inventario') return item.category === 'Inventario' || item.id.startsWith('inventory') || item.id.includes('receipt') || item.id.includes('delivery') || item.id.includes('stock')
          if (currentContext === 'Contactos') return item.id.includes('contact')
          if (currentContext === 'Ventas') return item.id.includes('quote') || item.id.includes('sale')
          if (currentContext === 'Compras') return item.id.includes('purchase')
          if (currentContext === 'POS') return item.category === 'POS'
          
return false
        }),
        ...items.filter(item => {
          if (currentContext === 'Inventario') return !(item.category === 'Inventario' || item.id.startsWith('inventory') || item.id.includes('receipt') || item.id.includes('delivery') || item.id.includes('stock'))
          if (currentContext === 'Contactos') return !item.id.includes('contact')
          if (currentContext === 'Ventas') return !(item.id.includes('quote') || item.id.includes('sale'))
          if (currentContext === 'Compras') return !item.id.includes('purchase')
          if (currentContext === 'POS') return item.category !== 'POS'
          
return true
        })
      ]
    }

    return items
  }, [query, currentContext])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <>
      {/* Botón trigger en el Navbar con estándar ⌘K */}
      <Button
        variant="text"
        size="small"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-[#F4F3F8] hover:bg-[#EAE8F4] text-[#1E1B2E] transition-all flex items-center gap-2 border border-[#E6E4F0]"
        sx={{ textTransform: 'none', borderRadius: '8px' }}
      >
        <i className="tabler-search text-[#6C5CE7] text-sm" />
        <span className="text-xs text-[#6B7280] hidden sm:inline">Buscar...</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#6C5CE7] border border-[#DCD8EC] hidden md:inline font-semibold">
          ⌘K
        </span>
      </Button>

      {/* Modal Command Palette */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }
          }
        }}
      >
        <div className="p-4 border-b border-[#E6E4F0] bg-[#FAFAFC] flex items-center gap-3">
          <i className="tabler-search text-xl text-[#6C5CE7]" />
          {currentContext && (
            <Chip
              label={currentContext}
              size="small"
              className="text-[11px] font-semibold bg-[#F3F0FF] text-[#6C5CE7] border border-[#DCD8EC]"
            />
          )}
          <TextField
            autoFocus
            fullWidth
            variant="standard"
            placeholder={
              currentContext
                ? `Buscar en ${currentContext} o navegar a otro módulo...`
                : "Escribe un módulo o acción (ej. 'cotización', 'pos', 'kardex')..."
            }
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            InputProps={{
              disableUnderline: true,
              style: { fontSize: '0.92rem', fontWeight: 500 }
            }}
          />
          <span className="text-[11px] font-mono text-[#6B7280] px-2 py-0.5 rounded bg-[#EAE8F4]">ESC</span>
        </div>

        <DialogContent sx={{ p: 1.5, maxHeight: 420 }}>
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[#6B7280] text-xs">
              No se encontraron resultados para &quot;{query}&quot;.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item.href)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'bg-[#F3F0FF] text-[#6C5CE7]' : 'hover:bg-[#F8F7FC] text-[#1E1B2E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#6C5CE7] text-white' : 'bg-[#F0EEF9] text-[#6C5CE7]'
                        }`}
                      >
                        <i className={`${item.icon} text-base`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{item.title}</span>
                          <span className="text-[10px] text-[#6B7280] px-1.5 py-0.2 rounded bg-[#EFEFF5]">
                            {item.category}
                          </span>
                        </div>
                        <Typography variant="caption" className="text-[#6B7280] block text-[11px]">
                          {item.subtitle}
                        </Typography>
                      </div>
                    </div>

                    {item.shortcut && (
                      <span className="text-[10px] font-mono text-[#6B7280] px-1.5 py-0.5 rounded bg-white border border-[#E6E4F0]">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CommandPaletteDialog
