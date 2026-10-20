'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import type { ProductTemplate, StockMovement, StockMovementType } from '@/types/inventoryTypes'
import { getInventoryTemplates, getStockMovements, getActiveBcvRate } from '@/services/inventoryService'
import StockAdjustmentModal from './components/StockAdjustmentModal'

const movementTypeMeta: Record<
  StockMovementType,
  { label: string; color: 'success' | 'primary' | 'warning' | 'error' | 'info' | 'secondary'; icon: string }
> = {
  INITIAL_INVENTORY: {
    label: 'Saldo Inicial',
    color: 'info',
    icon: 'tabler-Flag'
  },
  PURCHASE_RECEIPT: {
    label: 'Recepción Compra',
    color: 'success',
    icon: 'tabler-truck-delivery'
  },
  SALE_DELIVERY: {
    label: 'Despacho Venta',
    color: 'primary',
    icon: 'tabler-package-export'
  },
  ADJUSTMENT_IN: {
    label: 'Ajuste Positivo (+)',
    color: 'warning',
    icon: 'tabler-trending-up'
  },
  ADJUSTMENT_OUT: {
    label: 'Ajuste / Merma (-)',
    color: 'error',
    icon: 'tabler-trending-down'
  },
  INTERNAL_TRANSFER: {
    label: 'Transferencia',
    color: 'secondary',
    icon: 'tabler-arrows-left-right'
  }
}

const InventoryKardexView = () => {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('ALL')
  const [selectedType, setSelectedType] = useState<string>('ALL')

  // Modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const bcvRate = getActiveBcvRate()

  const loadData = useCallback(async () => {
    const [movData, prodData] = await Promise.all([getStockMovements(), getInventoryTemplates()])

    setMovements(movData)
    setTemplates(prodData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (selectedProductId !== 'ALL' && m.producto_id !== selectedProductId) return false
      if (selectedType !== 'ALL' && m.tipo_movimiento !== selectedType) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = m.producto_nombre.toLowerCase().includes(q)
        const matchSku = m.variante_sku.toLowerCase().includes(q)
        const matchRef = m.documento_referencia.toLowerCase().includes(q)
        const matchReason = (m.motivo || '').toLowerCase().includes(q)

        if (!matchName && !matchSku && !matchRef && !matchReason) return false
      }

      return true
    })
  }, [movements, selectedProductId, selectedType, searchQuery])

  const summary = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    let totalValueMovedUsd = 0

    filteredMovements.forEach(m => {
      totalIn += m.cantidad_entrada
      totalOut += m.cantidad_salida
      totalValueMovedUsd += (m.cantidad_entrada + m.cantidad_salida) * m.costo_unitario_usd
    })

    return { totalIn, totalOut, totalValueMovedUsd }
  }, [filteredMovements])

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)

      return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return iso
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Typography variant='h4' className='font-bold text-[#1E1B4B]'>
              Kárdex y Libro Mayor de Movimientos
            </Typography>
            <Chip
              size='small'
              label={`${filteredMovements.length} registros`}
              color='primary'
              variant='tonal'
              className='rounded-full font-bold'
            />
          </div>
          <Typography variant='body2' className='text-textSecondary'>
            Trazabilidad y movimientos de stock
          </Typography>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <Button
            variant='contained'
            color='primary'
            startIcon={<i className='tabler-adjustments-horizontal' />}
            onClick={() => setAdjustModalOpen(true)}
          >
            Ajuste de Stock
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl'>
          <CardContent className='p-4 flex items-center justify-between'>
            <div>
              <Typography variant='caption' className='text-textSecondary font-semibold uppercase'>
                Unidades Ingresadas (+)
              </Typography>
              <Typography variant='h5' className='font-bold text-success mt-0.5'>
                +{summary.totalIn.toLocaleString('es-VE')} unds.
              </Typography>
            </div>
            <div className='w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center'>
              <i className='tabler-arrow-down-left text-xl' />
            </div>
          </CardContent>
        </Card>

        <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl'>
          <CardContent className='p-4 flex items-center justify-between'>
            <div>
              <Typography variant='caption' className='text-textSecondary font-semibold uppercase'>
                Unidades Egresadas (-)
              </Typography>
              <Typography variant='h5' className='font-bold text-error mt-0.5'>
                -{summary.totalOut.toLocaleString('es-VE')} unds.
              </Typography>
            </div>
            <div className='w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center'>
              <i className='tabler-arrow-up-right text-xl' />
            </div>
          </CardContent>
        </Card>

        <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl'>
          <CardContent className='p-4 flex items-center justify-between'>
            <div>
              <Typography variant='caption' className='text-textSecondary font-semibold uppercase'>
                Volumen Valorizado Movido
              </Typography>
              <Typography variant='h5' className='font-bold font-mono text-[#1E1B4B] mt-0.5'>
                ${summary.totalValueMovedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant='caption' className='text-textSecondary font-mono'>
                ≈ Bs. {(summary.totalValueMovedUsd * bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
              </Typography>
            </div>
            <div className='w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center'>
              <i className='tabler-Activity text-xl' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table Card */}
      <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
        <CardContent className='p-5 border-b border-[#E6E4F0] bg-[#FAFAFE]'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-4 items-center'>
            <div className='md:col-span-5'>
              <TextField
                fullWidth
                size='small'
                placeholder='Buscar por SKU, producto, documento o motivo...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='tabler-search text-textSecondary' />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </div>

            <div className='md:col-span-4'>
              <TextField
                select
                fullWidth
                size='small'
                label='Filtrar por Artículo'
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
              >
                <MenuItem value='ALL'>Todos los Artículos del Catálogo</MenuItem>
                {templates
                  .filter(t => t.productType !== 'service')
                  .map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      [{t.defaultCode}] {t.name}
                    </MenuItem>
                  ))}
              </TextField>
            </div>

            <div className='md:col-span-3'>
              <TextField
                select
                fullWidth
                size='small'
                label='Tipo de Movimiento'
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                <MenuItem value='ALL'>Todos los Movimientos</MenuItem>
                <MenuItem value='PURCHASE_RECEIPT'>Recepción de Compra (+)</MenuItem>
                <MenuItem value='SALE_DELIVERY'>Despacho de Venta (-)</MenuItem>
                <MenuItem value='ADJUSTMENT_IN'>Ajuste Positivo (+)</MenuItem>
                <MenuItem value='ADJUSTMENT_OUT'>Ajuste / Merma (-)</MenuItem>
                <MenuItem value='INITIAL_INVENTORY'>Saldo Inicial</MenuItem>
              </TextField>
            </div>
          </div>
        </CardContent>

        {/* Toolbar Strip unificado con estándar Foundly */}
        <div className='flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-[#E6E4F0] bg-[#FAF9FF]'>
          <div className='flex items-center gap-2.5'>
            <Typography variant='h6' className='font-semibold text-[#1E1B2E] text-sm'>
              Movimientos Registrados
            </Typography>
            <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
              {filteredMovements.length} {filteredMovements.length === 1 ? 'movimiento' : 'movimientos'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className='p-8 text-center text-textSecondary'>Cargando historial de Kárdex...</div>
        ) : (
          <div className='overflow-x-auto'>
            <Table size='small'>
              <TableHead className='bg-[#F4F3F8] border-b border-[#E6E4F0]'>
                <TableRow>
                  <TableCell
                    className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center'
                    style={{ width: 36, maxWidth: 36, padding: '10px 4px' }}
                  >
                    #
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Fecha / Hora
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Documento Ref.
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Artículo / Variante SKU
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Operación
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5'>
                    Entrada (+)
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5'>
                    Salida (-)
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5'>
                    Saldo Físico
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5'>
                    Costo Unit.
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Responsable / Motivo
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='text-center py-10 text-textSecondary'>
                      No se encontraron movimientos en el Kárdex para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((mov, index) => {
                    const meta = movementTypeMeta[mov.tipo_movimiento] || {
                      label: mov.tipo_movimiento,
                      color: 'secondary',
                      icon: 'tabler-circle'
                    }

                    return (
                      <TableRow key={mov.id} hover className='border-b border-[#E6E4F0] last:border-none hover:bg-[#FAF9FF] transition-colors'>
                        <TableCell
                          className='text-center text-xs font-mono text-textSecondary'
                          style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell className='text-xs whitespace-nowrap text-textSecondary font-mono'>
                          {formatDate(mov.fecha)}
                        </TableCell>
                        <TableCell className='text-xs whitespace-nowrap'>
                          <span className='font-mono font-bold text-[#1E1B4B] bg-[#F4F3FF] px-2 py-0.5 rounded'>
                            {mov.documento_referencia}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <Typography
                              component={Link}
                              href={`/inventory/products/${mov.producto_id}`}
                              variant='body2'
                              className='font-semibold text-[#1E1B4B] hover:text-primary transition-colors'
                            >
                              {mov.producto_nombre}
                            </Typography>
                            <Typography variant='caption' className='font-mono text-textSecondary'>
                              SKU: <strong>{mov.variante_sku}</strong> · {mov.almacen}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <Chip
                            size='small'
                            label={meta.label}
                            color={meta.color}
                            variant='tonal'
                            className='rounded-full text-[11px] font-semibold'
                          />
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs font-bold text-success whitespace-nowrap'>
                          {mov.cantidad_entrada > 0 ? `+${mov.cantidad_entrada} ${mov.uom_code}` : '—'}
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs font-bold text-error whitespace-nowrap'>
                          {mov.cantidad_salida > 0 ? `-${mov.cantidad_salida} ${mov.uom_code}` : '—'}
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs font-bold text-[#1E1B4B] whitespace-nowrap bg-[#FAFAFE]'>
                          {mov.saldo_resultante} {mov.uom_code}
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs text-textSecondary whitespace-nowrap'>
                          ${mov.costo_unitario_usd.toFixed(2)}
                        </TableCell>
                        <TableCell className='max-w-[230px]'>
                          <Typography variant='caption' className='font-semibold block text-[#1E1B4B] truncate'>
                            {mov.usuario_responsable}
                          </Typography>
                          <Typography variant='caption' className='text-textSecondary block truncate' title={mov.motivo}>
                            {mov.motivo}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <StockAdjustmentModal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        templates={templates}
        preselectedProductId={selectedProductId !== 'ALL' ? selectedProductId : undefined}
        onSuccess={record => {
          loadData()
          setToast({
            open: true,
            message: `Movimiento Kárdex ${record.correlativo} registrado (${record.diferencia >= 0 ? '+' : ''}${record.diferencia} ${record.uom_code}).`
          })
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' variant='filled' className='rounded-xl'>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default InventoryKardexView
