'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import Popover from '@mui/material/Popover'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import type { ProductTemplate, StockAdjustmentRecord, AdjustmentReason } from '@/types/inventoryTypes'
import {
  getInventoryTemplates,
  getStockAdjustments,
  applyStockAdjustment,
  getActiveBcvRate
} from '@/services/inventoryService'

const reasonLabels: Record<
  AdjustmentReason,
  { label: string; color: 'primary' | 'error' | 'warning' | 'info' | 'secondary' }
> = {
  CONTEO_FISICO: { label: 'Toma Física / Conteo Cíclico', color: 'primary' },
  ROTURA_MERMA: { label: 'Rotura, Daño o Merma Operativa', color: 'error' },
  CADUCIDAD: { label: 'Vencimiento / Caducidad de Lote', color: 'warning' },
  CONSUMO_INTERNO: { label: 'Consumo Interno de la Empresa', color: 'info' },
  CORRECCION_SISTEMA: { label: 'Corrección de Saldo en Sistema', color: 'secondary' }
}

interface SearchableVariantOption {
  key: string
  producto_id: string
  producto_nombre: string
  variante_id: string
  variante_sku: string
  variante_label: string
  uom_code: string
  stock_sistema: number
  costo_unitario_usd: number
}

interface DraftAdjustmentRow {
  tempId: string
  selectedOption: SearchableVariantOption | null
  motivo: AdjustmentReason
  stock_contado: number | ''
  observaciones: string
  saving?: boolean
}

const InventoryAdjustmentsView = () => {
  const [adjustments, setAdjustments] = useState<StockAdjustmentRecord[]>([])
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Inline editable draft rows
  const [draftRows, setDraftRows] = useState<DraftAdjustmentRow[]>([])
  const [applyingAll, setApplyingAll] = useState(false)

  // Optional note popover for draft row
  const [noteAnchorEl, setNoteAnchorEl] = useState<HTMLElement | null>(null)
  const [activeNoteTempId, setActiveNoteTempId] = useState<string | null>(null)

  // Selected historical adjustment for full detail drawer
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustmentRecord | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [reasonFilter, setReasonFilter] = useState<string>('ALL')
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const bcvRate = getActiveBcvRate()

  const loadData = useCallback(async () => {
    const [adjData, prodData] = await Promise.all([getStockAdjustments(), getInventoryTemplates()])

    setAdjustments(adjData)
    setTemplates(prodData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Flatten all physical product variants so the user can search by SKU or Product Name in 1 step
  const variantOptions = useMemo<SearchableVariantOption[]>(() => {
    const list: SearchableVariantOption[] = []

    templates
      .filter(t => t.productType !== 'service')
      .forEach(t => {
        t.variants.forEach(v => {
          const combText =
            v.combinationValues.length > 0
              ? ` (${v.combinationValues.map(c => c.valueName).join(' / ')})`
              : ''

          list.push({
            key: `${t.id}__${v.id}`,
            producto_id: t.id,
            producto_nombre: t.name,
            variante_id: v.id,
            variante_sku: v.sku,
            variante_label: `[${v.sku}] ${t.name}${combText}`,
            uom_code: t.uomCode,
            stock_sistema: v.physicalStock,
            costo_unitario_usd: v.costPrice || t.standardCost
          })
        })
      })

    return list
  }, [templates])

  // Add a blank inline row at the top of the table
  const handleAddDraftRow = () => {
    const newRow: DraftAdjustmentRow = {
      tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selectedOption: null,
      motivo: 'CONTEO_FISICO',
      stock_contado: '',
      observaciones: ''
    }

    setDraftRows(prev => [newRow, ...prev])
  }

  const handleUpdateDraftRow = (tempId: string, changes: Partial<DraftAdjustmentRow>) => {
    setDraftRows(prev =>
      prev.map(row => (row.tempId === tempId ? { ...row, ...changes } : row))
    )
  }

  const handleRemoveDraftRow = (tempId: string) => {
    setDraftRows(prev => prev.filter(row => row.tempId !== tempId))
  }

  // Apply a single inline row
  const handleApplySingleRow = async (row: DraftAdjustmentRow) => {
    if (!row.selectedOption) {
      setToast({
        open: true,
        message: 'Seleccione un producto/SKU en la línea antes de aplicar',
        severity: 'error'
      })

      return
    }

    const counted = row.stock_contado === '' ? row.selectedOption.stock_sistema : Number(row.stock_contado)

    if (counted < 0) {
      setToast({ open: true, message: 'La cantidad contada no puede ser negativa', severity: 'error' })

      return
    }

    try {
      handleUpdateDraftRow(row.tempId, { saving: true })

      const record = await applyStockAdjustment({
        producto_id: row.selectedOption.producto_id,
        variante_id: row.selectedOption.variante_id,
        stock_contado: counted,
        motivo: row.motivo,
        observaciones: row.observaciones.trim() || undefined
      })

      setDraftRows(prev => prev.filter(r => r.tempId !== row.tempId))
      await loadData()

      setToast({
        open: true,
        message: `Ajuste ${record.correlativo} aplicado (${record.variante_sku}: ${record.stock_contado} ${record.uom_code})`,
        severity: 'success'
      })
    } catch (err: unknown) {
      handleUpdateDraftRow(row.tempId, { saving: false })
      const msg = err instanceof Error ? err.message : 'Error al aplicar el ajuste'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  // Apply all valid draft rows in batch
  const handleApplyAllDrafts = async () => {
    const validRows = draftRows.filter(r => r.selectedOption !== null)

    if (validRows.length === 0) {
      setToast({
        open: true,
        message: 'Seleccione al menos un producto en las líneas en blanco para guardar',
        severity: 'error'
      })

      return
    }

    setApplyingAll(true)

    try {
      let appliedCount = 0

      for (const row of validRows) {
        if (!row.selectedOption) continue
        const counted = row.stock_contado === '' ? row.selectedOption.stock_sistema : Number(row.stock_contado)

        await applyStockAdjustment({
          producto_id: row.selectedOption.producto_id,
          variante_id: row.selectedOption.variante_id,
          stock_contado: Math.max(0, counted),
          motivo: row.motivo,
          observaciones: row.observaciones.trim() || undefined
        })
        appliedCount += 1
      }

      setDraftRows(prev => prev.filter(r => r.selectedOption === null))
      await loadData()

      setToast({
        open: true,
        message: `${appliedCount} ${appliedCount === 1 ? 'ajuste aplicado' : 'ajustes aplicados'} al Kárdex exitosamente.`,
        severity: 'success'
      })
    } catch {
      setToast({ open: true, message: 'Ocurrió un error al procesar los ajustes en lote', severity: 'error' })
    } finally {
      setApplyingAll(false)
    }
  }

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(a => {
      if (reasonFilter !== 'ALL' && a.motivo !== reasonFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchCorrelativo = a.correlativo.toLowerCase().includes(q)
        const matchProd = a.producto_nombre.toLowerCase().includes(q)
        const matchSku = a.variante_sku.toLowerCase().includes(q)
        const matchNotes = (a.observaciones || '').toLowerCase().includes(q)

        if (!matchCorrelativo && !matchProd && !matchSku && !matchNotes) return false
      }

      return true
    })
  }, [adjustments, reasonFilter, searchQuery])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-VE', {
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

  const activeNoteRow = useMemo(
    () => draftRows.find(r => r.tempId === activeNoteTempId) || null,
    [draftRows, activeNoteTempId]
  )

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Typography variant='h4' className='font-bold text-[#1E1B4B]'>
              Auditoría y Ajustes de Stock Físico
            </Typography>
            <Chip
              size='small'
              label={`${filteredAdjustments.length} actas`}
              color='primary'
              variant='tonal'
              className='rounded-full font-bold'
            />
          </div>
          <Typography variant='body2' className='text-textSecondary'>
            Ajustes de existencias y conteos físicos
          </Typography>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          {draftRows.length > 0 && (
            <>
              <Button
                variant='tonal'
                color='error'
                className='font-semibold'
                onClick={() => setDraftRows([])}
              >
                Descartar ({draftRows.length})
              </Button>
              <Button
                variant='contained'
                color='success'
                disabled={applyingAll}
                className='font-semibold shadow-sm'
                startIcon={<i className='tabler-checks' />}
                onClick={handleApplyAllDrafts}
              >
                {applyingAll ? 'Aplicando...' : `Aplicar Todo (${draftRows.length})`}
              </Button>
            </>
          )}

          <Button
            variant='contained'
            color='primary'
            className='font-semibold shadow-sm'
            startIcon={<i className='tabler-plus' />}
            onClick={handleAddDraftRow}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Filters & Clean Table (No Horizontal Scrollbar Needed) */}
      <Card className='border border-[#E6E4F0] shadow-xs rounded-2xl overflow-hidden'>
        <CardContent className='p-5 border-b border-[#E6E4F0] bg-[#FAFAFE]'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-4 items-center'>
            <div className='md:col-span-7'>
              <TextField
                fullWidth
                size='small'
                placeholder='Buscar en el historial por correlativo (AJU-2026-...), artículo, SKU u observaciones...'
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

            <div className='md:col-span-5'>
              <TextField
                select
                fullWidth
                size='small'
                label='Filtrar por Motivo de Ajuste'
                value={reasonFilter}
                onChange={e => setReasonFilter(e.target.value)}
              >
                <MenuItem value='ALL'>Todos los Motivos</MenuItem>
                <MenuItem value='CONTEO_FISICO'>Toma Física / Conteo Cíclico</MenuItem>
                <MenuItem value='ROTURA_MERMA'>Rotura, Daño o Merma Operativa</MenuItem>
                <MenuItem value='CADUCIDAD'>Vencimiento / Caducidad de Lote</MenuItem>
                <MenuItem value='CONSUMO_INTERNO'>Consumo Interno de la Empresa</MenuItem>
                <MenuItem value='CORRECCION_SISTEMA'>Corrección de Saldo en Sistema</MenuItem>
              </TextField>
            </div>
          </div>
        </CardContent>

        {/* Toolbar Strip unificado con estándar Foundly */}
        <div className='flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-[#E6E4F0] bg-[#FAF9FF]'>
          <div className='flex items-center gap-2.5'>
            <Typography variant='h6' className='font-semibold text-[#1E1B2E] text-sm'>
              Actas de Ajuste Aplicadas
            </Typography>
            <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
              {filteredAdjustments.length} {filteredAdjustments.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className='p-8 text-center text-textSecondary'>Cargando actas de ajuste...</div>
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
                    Correlativo / Fecha
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Artículo / SKU
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold py-2.5'>
                    Motivo de Auditoría
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center py-2.5'>
                    Stock Sistema
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center py-2.5'>
                    Conteo Real
                  </TableCell>
                  <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-center py-2.5'>
                    Diferencia
                  </TableCell>
                  {draftRows.length > 0 && (
                    <TableCell className='text-[11px] uppercase tracking-wider text-[#6B7280] font-bold text-right py-2.5'>
                      Acciones
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* INLINE EDITABLE DRAFT ROWS AT THE TOP */}
                {draftRows.map(row => {
                  const opt = row.selectedOption
                  const stockSistema = opt ? opt.stock_sistema : 0
                  const countedNum =
                    row.stock_contado === '' ? stockSistema : Math.max(0, Number(row.stock_contado))
                  const diff = opt ? countedNum - stockSistema : 0

                  return (
                    <TableRow
                      key={row.tempId}
                      className='bg-[#F4F3FF]/70 border-b-2 border-[#6C5CE7]/30 transition-colors'
                    >
                      <TableCell
                        className='text-center font-mono text-xs'
                        style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                      >
                        <span className='inline-block w-2 h-2 rounded-full bg-[#6C5CE7]' title='Línea en edición' />
                      </TableCell>

                      <TableCell className='whitespace-nowrap'>
                        <Chip
                          size='small'
                          label='NUEVO AJUSTE'
                          color='primary'
                          variant='tonal'
                          className='rounded-full font-bold text-[10px] h-5'
                        />
                        <Typography variant='caption' className='text-textSecondary block font-mono mt-0.5'>
                          En edición
                        </Typography>
                      </TableCell>

                      {/* Product & SKU Autocomplete */}
                      <TableCell style={{ minWidth: 260 }}>
                        <Autocomplete
                          size='small'
                          options={variantOptions}
                          getOptionLabel={option => option.variante_label}
                          value={row.selectedOption}
                          onChange={(_, newValue) => {
                            handleUpdateDraftRow(row.tempId, {
                              selectedOption: newValue,
                              stock_contado: newValue ? newValue.stock_sistema : ''
                            })
                          }}
                          renderInput={params => (
                            <TextField
                              {...params}
                              placeholder='Buscar producto o SKU...'
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '10px',
                                  fontSize: '0.8rem'
                                }
                              }}
                            />
                          )}
                        />
                      </TableCell>

                      {/* Reason Select */}
                      <TableCell style={{ minWidth: 195 }}>
                        <TextField
                          select
                          fullWidth
                          size='small'
                          value={row.motivo}
                          onChange={e =>
                            handleUpdateDraftRow(row.tempId, { motivo: e.target.value as AdjustmentReason })
                          }
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#FFFFFF',
                              borderRadius: '10px',
                              fontSize: '0.78rem'
                            }
                          }}
                        >
                          <MenuItem value='CONTEO_FISICO'>Toma Física / Conteo</MenuItem>
                          <MenuItem value='ROTURA_MERMA'>Rotura / Merma</MenuItem>
                          <MenuItem value='CADUCIDAD'>Vencimiento / Caducidad</MenuItem>
                          <MenuItem value='CONSUMO_INTERNO'>Consumo Interno</MenuItem>
                          <MenuItem value='CORRECCION_SISTEMA'>Corrección Sistema</MenuItem>
                        </TextField>
                      </TableCell>

                      {/* Current System Stock */}
                      <TableCell className='text-center font-mono text-xs font-semibold text-[#1E1B4B] whitespace-nowrap'>
                        {opt ? `${opt.stock_sistema} ${opt.uom_code}` : '—'}
                      </TableCell>

                      {/* New Counted Stock Input */}
                      <TableCell className='text-center' style={{ width: 135 }}>
                        <TextField
                          size='small'
                          type='number'
                          disabled={!opt}
                          placeholder={opt ? String(opt.stock_sistema) : '0'}
                          value={row.stock_contado}
                          onChange={e => {
                            const val = e.target.value

                            handleUpdateDraftRow(row.tempId, {
                              stock_contado: val === '' ? '' : Math.max(0, parseFloat(val) || 0)
                            })
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && opt) {
                              e.preventDefault()
                              handleApplySingleRow(row)
                            }
                          }}
                          slotProps={{
                            input: {
                              endAdornment: opt ? (
                                <InputAdornment position='end'>
                                  <span className='text-[11px] font-mono text-textSecondary'>{opt.uom_code}</span>
                                </InputAdornment>
                              ) : undefined
                            }
                          }}
                          sx={{
                            width: 120,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#FFFFFF',
                              borderRadius: '10px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem'
                            }
                          }}
                        />
                      </TableCell>

                      {/* Live Difference Badge */}
                      <TableCell className='text-center whitespace-nowrap'>
                        {opt ? (
                          <Chip
                            size='small'
                            label={`${diff >= 0 ? '+' : ''}${diff} ${opt.uom_code}`}
                            color={diff > 0 ? 'success' : diff < 0 ? 'error' : 'secondary'}
                            variant='tonal'
                            className='rounded-full font-mono font-bold text-xs'
                          />
                        ) : (
                          <span className='text-xs text-textSecondary'>—</span>
                        )}
                      </TableCell>

                      {/* Compact Note + Save / Remove Actions */}
                      <TableCell className='text-right whitespace-nowrap'>
                        <div className='flex items-center justify-end gap-1'>
                          <Tooltip title={row.observaciones ? `Nota: ${row.observaciones}` : 'Agregar nota opcional'}>
                            <IconButton
                              size='small'
                              color={row.observaciones ? 'primary' : 'default'}
                              onClick={e => {
                                setNoteAnchorEl(e.currentTarget)
                                setActiveNoteTempId(row.tempId)
                              }}
                            >
                              <i className='tabler-note text-base' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Aplicar ajuste (Enter)'>
                            <span>
                              <IconButton
                                size='small'
                                color='primary'
                                disabled={!opt || row.saving}
                                onClick={() => handleApplySingleRow(row)}
                                sx={{
                                  backgroundColor: '#6C5CE7',
                                  color: '#FFFFFF',
                                  '&:hover': { backgroundColor: '#5A4AD1' },
                                  '&.Mui-disabled': { backgroundColor: '#E6E4F0' }
                                }}
                              >
                                <i className='tabler-check text-base' />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title='Quitar línea'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleRemoveDraftRow(row.tempId)}
                            >
                              <i className='tabler-trash text-base' />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* HISTORICAL APPLIED ADJUSTMENTS */}
                {filteredAdjustments.length === 0 && draftRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={draftRows.length > 0 ? 8 : 7} className='text-center py-10 text-textSecondary'>
                      No existen ajustes registrados. Presione <strong>&quot;Nuevo&quot;</strong> arriba para iniciar un conteo rápido.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdjustments.map((adj, index) => {
                    const reasonMeta = reasonLabels[adj.motivo] || {
                      label: adj.motivo,
                      color: 'secondary'
                    }

                    return (
                      <TableRow
                        key={adj.id}
                        hover
                        onClick={() => setSelectedAdjustment(adj)}
                        className='border-b border-[#E6E4F0] last:border-none cursor-pointer transition-colors hover:bg-[#FAF9FF]'
                      >
                        <TableCell
                          className='text-center text-xs font-mono text-textSecondary'
                          style={{ width: 28, maxWidth: 28, padding: '6px 4px' }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <Typography variant='body2' className='font-mono font-bold text-primary'>
                            {adj.correlativo}
                          </Typography>
                          <Typography variant='caption' className='text-textSecondary font-mono'>
                            {formatDate(adj.fecha)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' className='font-semibold text-[#1E1B4B]'>
                            {adj.producto_nombre}
                          </Typography>
                          <Typography variant='caption' className='font-mono text-textSecondary'>
                            SKU: <strong>{adj.variante_sku}</strong>
                          </Typography>
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <Chip
                            size='small'
                            label={reasonMeta.label}
                            color={reasonMeta.color}
                            variant='tonal'
                            className='rounded-full text-[11px] font-semibold'
                          />
                        </TableCell>
                        <TableCell className='text-center font-mono text-xs text-textSecondary'>
                          {adj.stock_sistema} {adj.uom_code}
                        </TableCell>
                        <TableCell className='text-center font-mono text-xs font-bold text-[#1E1B4B]'>
                          {adj.stock_contado} {adj.uom_code}
                        </TableCell>
                        <TableCell className='text-center whitespace-nowrap'>
                          <Chip
                            size='small'
                            label={`${adj.diferencia >= 0 ? '+' : ''}${adj.diferencia} ${adj.uom_code}`}
                            color={adj.diferencia > 0 ? 'success' : adj.diferencia < 0 ? 'error' : 'secondary'}
                            variant='tonal'
                            className='rounded-full font-mono font-bold text-xs'
                          />
                        </TableCell>
                        {draftRows.length > 0 && <TableCell />}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Popover for adding an optional note on a draft row */}
      <Popover
        open={Boolean(noteAnchorEl && activeNoteRow)}
        anchorEl={noteAnchorEl}
        onClose={() => {
          setNoteAnchorEl(null)
          setActiveNoteTempId(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 300, p: 2, borderRadius: '16px', border: '1px solid #E6E4F0' }
          }
        }}
      >
        {activeNoteRow && (
          <div className='flex flex-col gap-2.5'>
            <Typography variant='subtitle2' className='font-bold text-[#1E1B4B]'>
              Observación del Ajuste
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              size='small'
              placeholder='Ej. Empaque deteriorado en estante B...'
              value={activeNoteRow.observaciones}
              onChange={e => handleUpdateDraftRow(activeNoteRow.tempId, { observaciones: e.target.value })}
            />
            <div className='flex justify-end'>
              <Button
                size='small'
                variant='contained'
                className='rounded-full text-xs font-semibold'
                onClick={() => {
                  setNoteAnchorEl(null)
                  setActiveNoteTempId(null)
                }}
              >
                Listo
              </Button>
            </div>
          </div>
        )}
      </Popover>

      {/* Quick View Detail Drawer when clicking any adjustment row */}
      <Drawer
        open={Boolean(selectedAdjustment)}
        anchor='right'
        onClose={() => setSelectedAdjustment(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 460 },
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #E6E4F0'
          }
        }}
      >
        {selectedAdjustment && (
          <div className='flex flex-col h-full'>
            {/* Drawer Header */}
            <div className='p-5 border-b border-[#E6E4F0] flex items-center justify-between bg-[#FAFAFE]'>
              <div>
                <div className='flex items-center gap-2'>
                  <Typography variant='h6' className='font-bold font-mono text-primary'>
                    {selectedAdjustment.correlativo}
                  </Typography>
                  <Chip
                    size='small'
                    label='APLICADO'
                    color='success'
                    variant='tonal'
                    className='rounded-full font-bold text-[10px] h-5'
                  />
                </div>
                <Typography variant='caption' className='text-textSecondary font-mono'>
                  Registrado el {formatDate(selectedAdjustment.fecha)}
                </Typography>
              </div>
              <IconButton size='small' onClick={() => setSelectedAdjustment(null)}>
                <i className='tabler-x text-lg' />
              </IconButton>
            </div>

            {/* Drawer Content */}
            <div className='p-5 flex-1 overflow-y-auto flex flex-col gap-5'>
              {/* Product Card */}
              <div className='p-4 rounded-2xl border border-[#E6E4F0] bg-[#FAFAFE] flex items-start justify-between gap-3'>
                <div>
                  <Typography variant='caption' className='text-textSecondary uppercase font-semibold'>
                    Artículo Ajustado
                  </Typography>
                  <Typography variant='subtitle1' className='font-bold text-[#1E1B4B] mt-0.5'>
                    {selectedAdjustment.producto_nombre}
                  </Typography>
                  <Typography variant='caption' className='font-mono text-textSecondary block mt-0.5'>
                    SKU: <strong>{selectedAdjustment.variante_sku}</strong>
                  </Typography>
                </div>
                <Button
                  component={Link}
                  href={`/inventory/products/${selectedAdjustment.producto_id}`}
                  size='small'
                  variant='tonal'
                  color='primary'
                  className='rounded-full text-xs font-semibold shrink-0'
                  endIcon={<i className='tabler-arrow-up-right text-sm' />}
                >
                  Ver Producto
                </Button>
              </div>

              {/* Quantities Comparison */}
              <div>
                <Typography variant='caption' className='text-textSecondary uppercase font-semibold block mb-2'>
                  Variación de Existencias Físicas
                </Typography>
                <div className='grid grid-cols-3 gap-3'>
                  <div className='p-3 rounded-xl border border-[#E6E4F0] text-center'>
                    <Typography variant='caption' className='text-textSecondary block'>
                      Stock Sistema
                    </Typography>
                    <Typography variant='subtitle1' className='font-mono font-bold text-[#1E1B4B] mt-0.5'>
                      {selectedAdjustment.stock_sistema} {selectedAdjustment.uom_code}
                    </Typography>
                  </div>

                  <div className='p-3 rounded-xl border border-[#E6E4F0] text-center bg-[#F8F7FA]'>
                    <Typography variant='caption' className='text-textSecondary block'>
                      Conteo Real
                    </Typography>
                    <Typography variant='subtitle1' className='font-mono font-bold text-primary mt-0.5'>
                      {selectedAdjustment.stock_contado} {selectedAdjustment.uom_code}
                    </Typography>
                  </div>

                  <div className='p-3 rounded-xl border border-[#E6E4F0] text-center'>
                    <Typography variant='caption' className='text-textSecondary block'>
                      Diferencia
                    </Typography>
                    <Chip
                      size='small'
                      label={`${selectedAdjustment.diferencia >= 0 ? '+' : ''}${selectedAdjustment.diferencia} ${selectedAdjustment.uom_code}`}
                      color={
                        selectedAdjustment.diferencia > 0
                          ? 'success'
                          : selectedAdjustment.diferencia < 0
                            ? 'error'
                            : 'secondary'
                      }
                      variant='tonal'
                      className='rounded-full font-mono font-bold text-xs mt-1'
                    />
                  </div>
                </div>
              </div>

              {/* Financial Impact */}
              <div className='p-4 rounded-2xl border border-[#E6E4F0] bg-[#FFFFFF]'>
                <Typography variant='caption' className='text-textSecondary uppercase font-semibold block mb-2'>
                  Impacto Financiero del Ajuste
                </Typography>
                <div className='flex items-center justify-between py-1.5 border-b border-[#E6E4F0]'>
                  <span className='text-xs text-textSecondary'>Costo Unitario Registrado:</span>
                  <span className='font-mono text-xs font-semibold text-[#1E1B4B]'>
                    ${selectedAdjustment.costo_unitario_usd.toFixed(2)} USD
                  </span>
                </div>
                <div className='flex items-center justify-between py-2 border-b border-[#E6E4F0]'>
                  <span className='text-xs text-textSecondary'>Impacto Total ($ USD):</span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      selectedAdjustment.impacto_usd >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {selectedAdjustment.impacto_usd >= 0 ? '+' : ''}${selectedAdjustment.impacto_usd.toFixed(2)} USD
                  </span>
                </div>
                <div className='flex items-center justify-between pt-2'>
                  <span className='text-xs text-textSecondary'>Equivalente Local (BCV Bs. {bcvRate.toFixed(2)}):</span>
                  <span className='font-mono text-xs font-semibold text-textSecondary'>
                    Bs.{' '}
                    {(selectedAdjustment.impacto_usd * bcvRate).toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>

              <Divider className='border-[#E6E4F0]' />

              {/* Audit Reason, Responsible & Observations */}
              <div className='flex flex-col gap-3'>
                <div className='flex items-center justify-between'>
                  <Typography variant='caption' className='text-textSecondary uppercase font-semibold'>
                    Motivo de Auditoría
                  </Typography>
                  <Chip
                    size='small'
                    label={reasonLabels[selectedAdjustment.motivo]?.label || selectedAdjustment.motivo}
                    color={reasonLabels[selectedAdjustment.motivo]?.color || 'secondary'}
                    variant='tonal'
                    className='rounded-full text-xs font-semibold'
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <Typography variant='caption' className='text-textSecondary uppercase font-semibold'>
                    Usuario Responsable
                  </Typography>
                  <Typography variant='body2' className='font-semibold text-[#1E1B4B]'>
                    {selectedAdjustment.usuario_responsable}
                  </Typography>
                </div>

                <div className='mt-1'>
                  <Typography variant='caption' className='text-textSecondary uppercase font-semibold block mb-1.5'>
                    Observaciones / Notas del Acta
                  </Typography>
                  <div className='p-3.5 rounded-xl bg-[#F8F7FA] border border-[#E6E4F0] text-sm text-[#1E1B4B]'>
                    {selectedAdjustment.observaciones || 'Sin observaciones registradas en este movimiento.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className='p-4 border-t border-[#E6E4F0] bg-[#FAFAFE] flex justify-end'>
              <Button
                variant='tonal'
                color='secondary'
                className='rounded-full font-semibold'
                onClick={() => setSelectedAdjustment(null)}
              >
                Cerrar Detalle
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant='filled' className='rounded-xl'>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default InventoryAdjustmentsView
