'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TablePagination from '@mui/material/TablePagination'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type {
  ProductTemplate,
  Warehouse,
  WarehouseOperationOrder,
  WarehouseOperationType
} from '@/types/inventoryTypes'
import {
  getInventoryTemplates,
  getWarehouses,
  getWarehouseOperationOrders,
  createWarehouseOperationOrder,
  validateWarehouseOperationOrder,
  cancelWarehouseOperationOrder,
  getActiveBcvRate
} from '@/services/inventoryService'
import {
  OPERATION_CONFIG,
  STATUS_META,
  type FlattenedVariantOption,
  type NewOrderLineDraft
} from './components/operations/operationConstants'

interface WarehouseOperationsListViewProps {
  operationType: WarehouseOperationType
}

const WarehouseOperationsListView: React.FC<WarehouseOperationsListViewProps> = ({
  operationType
}) => {
  const router = useRouter()
  const cfg = OPERATION_CONFIG[operationType]
  const bcvRate = getActiveBcvRate()

  const currentBaseRoute = useMemo(() => {
    switch (operationType) {
      case 'RECEIPT':
        return '/inventory/operations/receipts'
      case 'DELIVERY':
        return '/inventory/operations/deliveries'
      case 'INTERNAL_TRANSFER':
        return '/inventory/operations/transfers'
      default:
        return '/inventory/operations/receipts'
    }
  }, [operationType])

  const [orders, setOrders] = useState<WarehouseOperationOrder[]>([])
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'READY' | 'WAITING' | 'COMPLETED' | 'CANCELLED'
  >('ALL')

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Selección múltiple y control de columnas
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<{
    partner: boolean
    flujo: boolean
    fecha: boolean
    articulos: boolean
    estado: boolean
  }>({
    partner: true,
    flujo: true,
    fecha: true,
    articulos: true,
    estado: true
  })
  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLElement | null>(null)
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [batchCancelConfirmOpen, setBatchCancelConfirmOpen] = useState(false)

  // Detail & Validation Drawer
  const [selectedOrder, setSelectedOrder] = useState<WarehouseOperationOrder | null>(null)
  const [editedQtys, setEditedQtys] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState(false)

  // Creation Drawer
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPartner, setNewPartner] = useState('')
  const [newDocOrigin, setNewDocOrigin] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newResponsable, setNewResponsable] = useState('Elena Rivas')
  const [newNotes, setNewNotes] = useState('')
  const [originWhId, setOriginWhId] = useState('')
  const [originLocCode, setOriginLocCode] = useState('')
  const [destWhId, setDestWhId] = useState('')
  const [destLocCode, setDestLocCode] = useState('')
  const [newLines, setNewLines] = useState<NewOrderLineDraft[]>([])

  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({ open: false, message: '', severity: 'success' })

  const loadData = async () => {
    setLoading(true)
    const [ords, tpls, whs] = await Promise.all([
      getWarehouseOperationOrders(operationType),
      getInventoryTemplates(),
      getWarehouses()
    ])

    setOrders(ords)
    setTemplates(tpls)
    setWarehouses(whs)

    if (whs.length > 0) {
      const defWh = whs.find(w => w.isDefault) || whs[0]
      const secondWh = whs[1] || defWh

      setOriginWhId(defWh.id)
      setOriginLocCode(
        defWh.locations[0] ? `${defWh.locations[0].code} · ${defWh.locations[0].name}` : ''
      )
      setDestWhId(operationType === 'INTERNAL_TRANSFER' ? secondWh.id : defWh.id)
      const targetWh = operationType === 'INTERNAL_TRANSFER' ? secondWh : defWh

      setDestLocCode(
        targetWh.locations[0]
          ? `${targetWh.locations[0].code} · ${targetWh.locations[0].name}`
          : ''
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationType])

  // Flatten variants for Autocomplete
  const variantOptions = useMemo<FlattenedVariantOption[]>(() => {
    const list: FlattenedVariantOption[] = []

    templates.forEach(t => {
      if (t.productType === 'service') return
      t.variants.forEach(v => {
        const comb =
          v.combinationValues.length > 0
            ? v.combinationValues.map(c => `${c.attributeName}: ${c.valueName}`).join(' / ')
            : 'Estándar'

        list.push({
          key: `${t.id}__${v.id}`,
          templateId: t.id,
          productName: t.name,
          variantId: v.id,
          sku: v.sku,
          combinationLabel: comb,
          uomCode: t.uomCode,
          physicalStock: v.physicalStock,
          availableStock: v.availableStock,
          unitCost: v.costPrice || t.standardCost
        })
      })
    })

    return list
  }, [templates])

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter === 'READY' && o.estado !== 'READY') return false
      if (
        statusFilter === 'WAITING' &&
        o.estado !== 'WAITING' &&
        o.estado !== 'PENDING' &&
        o.estado !== 'LATE'
      ) {
        return false
      }
      if (statusFilter === 'COMPLETED' && o.estado !== 'COMPLETED') return false
      if (statusFilter === 'CANCELLED' && o.estado !== 'CANCELLED') return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = o.codigo.toLowerCase().includes(q)
        const matchPartner = o.tercero_nombre.toLowerCase().includes(q)
        const matchDoc = (o.documento_origen || '').toLowerCase().includes(q)
        const matchWh =
          o.almacen_origen_nombre.toLowerCase().includes(q) ||
          o.almacen_destino_nombre.toLowerCase().includes(q)
        const matchLine = o.lineas.some(
          l =>
            l.producto_nombre.toLowerCase().includes(q) ||
            l.variante_sku.toLowerCase().includes(q)
        )

        return matchCode || matchPartner || matchDoc || matchWh || matchLine
      }

      return true
    })
  }, [orders, statusFilter, search])

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredOrders, page, rowsPerPage])

  const isAllSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o.id))
  const isSomeSelected = filteredOrders.some(o => selectedIds.includes(o.id)) && !isAllSelected

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredOrders.map(o => o.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBatchCopyCodes = () => {
    const selected = orders.filter(o => selectedIds.includes(o.id))
    const codes = selected.map(o => o.codigo).join(', ')
    navigator.clipboard.writeText(codes)
    setBatchMenuAnchorEl(null)
    setToast({
      open: true,
      message: `${selected.length} códigos copiados al portapapeles.`,
      severity: 'info'
    })
  }

  const handleBatchValidate = async () => {
    setBatchMenuAnchorEl(null)
    const readyOrders = orders.filter(o => selectedIds.includes(o.id) && o.estado === 'READY')
    if (readyOrders.length === 0) {
      setToast({
        open: true,
        message: 'Ninguna de las órdenes seleccionadas está en estado "Lista" para validar.',
        severity: 'info'
      })
      return
    }
    for (const ord of readyOrders) {
      await validateWarehouseOperationOrder(ord.id)
    }
    setToast({
      open: true,
      message: `${readyOrders.length} operaciones validadas exitosamente.`,
      severity: 'success'
    })
    setSelectedIds([])
    await loadData()
  }

  const handleConfirmBatchCancel = async () => {
    setBatchCancelConfirmOpen(false)
    const count = selectedIds.length
    for (const id of selectedIds) {
      await cancelWarehouseOperationOrder(id)
    }
    setToast({
      open: true,
      message: `${count} operaciones canceladas.`,
      severity: 'info'
    })
    setSelectedIds([])
    await loadData()
  }

  const colSpanCount = [
    true, // checkbox
    true, // #
    true, // Referencia / Origen
    visibleColumns.partner,
    visibleColumns.flujo,
    visibleColumns.fecha,
    visibleColumns.articulos,
    visibleColumns.estado
  ].filter(Boolean).length

  const openOrderDetail = (order: WarehouseOperationOrder) => {
    setSelectedOrder(order)
    const map: Record<string, string> = {}

    order.lineas.forEach(l => {
      map[l.id] = String(l.cantidad_procesada > 0 ? l.cantidad_procesada : l.cantidad_demanda)
    })
    setEditedQtys(map)
  }

  const handleValidateOrder = async (
    orderToValidate: WarehouseOperationOrder,
    customQtys?: Record<string, number>
  ) => {
    setValidating(true)

    try {
      const updated = await validateWarehouseOperationOrder(orderToValidate.id, customQtys)

      await loadData()
      setSelectedOrder(updated)
      setToast({
        open: true,
        message: `Operación ${updated.codigo} validada exitosamente. Stock y Kárdex actualizados.`,
        severity: 'success'
      })
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al validar la operación.',
        severity: 'error'
      })
    } finally {
      setValidating(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const updated = await cancelWarehouseOperationOrder(orderId)

      await loadData()
      setSelectedOrder(updated)
      setToast({
        open: true,
        message: `Operación ${updated.codigo} cancelada.`,
        severity: 'info'
      })
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'No se pudo cancelar la operación.',
        severity: 'error'
      })
    }
  }

  const handleOpenCreateDrawer = () => {
    setNewPartner(
      operationType === 'INTERNAL_TRANSFER' ? 'Traslado Interno entre Ubicaciones' : ''
    )
    setNewDocOrigin('')
    setNewDate(new Date().toISOString().slice(0, 10))
    setNewNotes('')
    setNewLines([
      {
        tempId: `draft-line-${Date.now()}`,
        variantOption: variantOptions[0] || null,
        cantidad: '1'
      }
    ])
    setCreateOpen(true)
  }

  const handleAddDraftLine = () => {
    setNewLines(prev => [
      ...prev,
      {
        tempId: `draft-line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        variantOption: null,
        cantidad: '1'
      }
    ])
  }

  const handleRemoveDraftLine = (tempId: string) => {
    setNewLines(prev => prev.filter(l => l.tempId !== tempId))
  }

  const handleCreateOrder = async (validateImmediately: boolean) => {
    const validLines = newLines.filter(
      l => l.variantOption && Number(l.cantidad) > 0
    )

    if (validLines.length === 0) {
      setToast({
        open: true,
        message: 'Agrega al menos un artículo con cantidad mayor a 0.',
        severity: 'error'
      })

      return
    }

    if (!newPartner.trim()) {
      setToast({
        open: true,
        message: `Completa el campo "${cfg.partnerLabel}".`,
        severity: 'error'
      })

      return
    }

    const originWh = warehouses.find(w => w.id === originWhId)
    const destWh = warehouses.find(w => w.id === destWhId)

    setCreating(true)

    try {
      const created = await createWarehouseOperationOrder({
        tipo: operationType,
        tercero_nombre: newPartner.trim(),
        documento_origen: newDocOrigin.trim() || undefined,
        almacen_origen_id: operationType === 'RECEIPT' ? undefined : originWh?.id,
        almacen_origen_nombre:
          operationType === 'RECEIPT'
            ? 'Proveedor Externo'
            : originWh?.name || 'Almacén Central',
        ubicacion_origen_nombre:
          operationType === 'RECEIPT' ? undefined : originLocCode || undefined,
        almacen_destino_id: operationType === 'DELIVERY' ? undefined : destWh?.id,
        almacen_destino_nombre:
          operationType === 'DELIVERY'
            ? 'Despacho a Cliente'
            : destWh?.name || 'Almacén Central',
        ubicacion_destino_nombre:
          operationType === 'DELIVERY' ? undefined : destLocCode || undefined,
        fecha_programada: newDate,
        responsable: newResponsable,
        notas: newNotes.trim() || undefined,
        estado: 'READY',
        lineas: validLines.map(l => {
          const opt = l.variantOption!
          const qty = Number(l.cantidad)

          return {
            producto_id: opt.templateId,
            producto_nombre: opt.productName,
            variante_id: opt.variantId,
            variante_sku: opt.sku,
            uom_code: opt.uomCode,
            cantidad_demanda: qty,
            cantidad_procesada: qty,
            costo_unitario_usd: opt.unitCost
          }
        })
      })

      if (validateImmediately) {
        await validateWarehouseOperationOrder(created.id)
        setToast({
          open: true,
          message: `Operación ${created.codigo} creada y validada. Stock y Kárdex actualizados.`,
          severity: 'success'
        })
      } else {
        setToast({
          open: true,
          message: `Operación ${created.codigo} registrada como Lista para Procesar.`,
          severity: 'success'
        })
      }

      setCreateOpen(false)
      await loadData()
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al crear la operación.',
        severity: 'error'
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <div
              className='w-10 h-10 rounded-full flex items-center justify-center shrink-0'
              style={{ backgroundColor: cfg.accentBg, color: cfg.accentColor }}
            >
              <i className={`${cfg.icon} text-xl`} />
            </div>
            <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
              {cfg.title}
            </Typography>
          </div>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          {/* Controles de Selección Múltiple en Cabecera */}
          {selectedIds.length > 0 && (
            <div className='flex items-center gap-2'>
              <CustomChip
                size='small'
                variant='tonal'
                color='primary'
                label={`${selectedIds.length} seleccionados`}
                onDelete={() => setSelectedIds([])}
              />

              <Button
                variant='outlined'
                onClick={e => setBatchMenuAnchorEl(e.currentTarget)}
                startIcon={<i className='tabler-settings text-base' />}
                endIcon={<i className='tabler-chevron-down text-xs' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  px: 2.5,
                  py: 0.8,
                  backgroundColor: '#FFFFFF',
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                }}
              >
                Acciones
              </Button>
            </div>
          )}

          <Button
            component={Link}
            href={`${currentBaseRoute}/create`}
            variant='contained'
            color='primary'
            startIcon={<i className='tabler-plus text-base' />}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
        }}
      >
        <CardContent className='p-4 flex items-center justify-between flex-wrap gap-3'>
          <CustomTextField
            size='small'
            placeholder={`Buscar por referencia, ${
              operationType === 'RECEIPT'
                ? 'proveedor'
                : operationType === 'DELIVERY'
                ? 'cliente'
                : 'motivo'
            }, documento origen o producto...`}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(0)
            }}
            sx={{
              minWidth: { xs: '100%', sm: 340 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '9999px',
                backgroundColor: '#FAFAFC'
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search text-[#6B7280] text-base' />
                  </InputAdornment>
                )
              }
            }}
          />

          <div className='flex items-center gap-1.5 bg-[#F4F3F8] p-1 rounded-full flex-wrap'>
            {[
              { key: 'ALL', label: `Todas (${orders.length})` },
              {
                key: 'READY',
                label: `Listas (${orders.filter(o => o.estado === 'READY').length})`
              },
              {
                key: 'WAITING',
                label: `En espera (${
                  orders.filter(
                    o => o.estado === 'WAITING' || o.estado === 'PENDING' || o.estado === 'LATE'
                  ).length
                })`
              },
              {
                key: 'COMPLETED',
                label: `Realizadas (${orders.filter(o => o.estado === 'COMPLETED').length})`
              }
            ].map(tab => (
              <button
                key={tab.key}
                type='button'
                onClick={() => {
                  setStatusFilter(tab.key as any)
                  setPage(0)
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#6C5CE7] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1E1B2E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Orders Table */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
          overflow: 'hidden'
        }}
      >
        {/* Barra de Herramientas de Tabla: Conteo y Columnas */}
        <div className='flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-[#E6E4F0] bg-[#FAF9FF]'>
          <div className='flex items-center gap-2.5'>
            <Typography variant='h6' className='font-semibold text-[#1E1B2E] text-sm'>
              {cfg.title}
            </Typography>
            <CustomChip
              size='small'
              variant='tonal'
              color='primary'
              label={`${filteredOrders.length} ${filteredOrders.length === 1 ? 'registro' : 'registros'}`}
            />
          </div>

          <div className='flex items-center gap-2 flex-wrap'>
            <Button
              size='small'
              variant='outlined'
              startIcon={<i className='tabler-layout-columns text-base' />}
              onClick={e => setColumnAnchorEl(e.currentTarget)}
              sx={{
                borderColor: '#E6E4F0',
                color: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                px: 2,
                py: 0.6,
                backgroundColor: '#FFFFFF',
                '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F3F0FF' }
              }}
            >
              Columnas
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='p-5 flex flex-col gap-3'>
            <Skeleton variant='rounded' height={48} />
            <Skeleton variant='rounded' height={48} />
            <Skeleton variant='rounded' height={48} />
          </div>
        ) : (
          <div className='w-full overflow-x-auto'>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                <TableRow sx={{ borderBottom: '1px solid #E6E4F0' }}>
                  <TableCell padding='checkbox' sx={{ width: 44, minWidth: 44, pl: 2, pr: 0 }}>
                    <Checkbox
                      size='small'
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={e => handleToggleSelectAll(e.target.checked)}
                      sx={{
                        color: '#DCD8EC',
                        '&.Mui-checked': { color: '#6C5CE7' },
                        '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' },
                        p: 0.5
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      width: 42,
                      minWidth: 42,
                      py: 1.5,
                      px: 1,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#6B7280',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em'
                    }}
                  >
                    #
                  </TableCell>
                  <TableCell
                    sx={{
                      width: '16%',
                      py: 1.5,
                      fontWeight: 700,
                      color: '#6B7280',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em'
                    }}
                  >
                    REFERENCIA / ORIGEN
                  </TableCell>
                  {visibleColumns.partner && (
                    <TableCell
                      sx={{
                        width: '24%',
                        py: 1.5,
                        fontWeight: 700,
                        color: '#6B7280',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {cfg.partnerLabel.toUpperCase()}
                    </TableCell>
                  )}
                  {visibleColumns.flujo && (
                    <TableCell
                      sx={{
                        width: '25%',
                        py: 1.5,
                        fontWeight: 700,
                        color: '#6B7280',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      FLUJO DE ALMACÉN
                    </TableCell>
                  )}
                  {visibleColumns.fecha && (
                    <TableCell
                      align='center'
                      sx={{
                        width: '11%',
                        py: 1.5,
                        fontWeight: 700,
                        color: '#6B7280',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      FECHA PROG.
                    </TableCell>
                  )}
                  {visibleColumns.articulos && (
                    <TableCell
                      align='right'
                      sx={{
                        width: '10%',
                        py: 1.5,
                        fontWeight: 700,
                        color: '#6B7280',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      ARTÍCULOS
                    </TableCell>
                  )}
                  {visibleColumns.estado && (
                    <TableCell
                      align='center'
                      sx={{
                        width: '14%',
                        py: 1.5,
                        fontWeight: 700,
                        color: '#6B7280',
                        fontSize: '0.75rem',
                        letterSpacing: '0.05em'
                      }}
                    >
                      ESTADO
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpanCount} sx={{ py: 6, textAlign: 'center', color: '#6B7280' }}>
                      <i className={`${cfg.icon} text-3xl text-[#6C5CE7] mb-2 inline-block`} />
                      <Typography variant='body1' className='font-semibold text-[#1E1B2E]'>
                        No se encontraron operaciones en esta vista
                      </Typography>
                      <Typography variant='caption' className='text-xs mt-1 block text-[#6B7280]'>
                        Haz clic en <strong>&ldquo;+ {cfg.newBtnLabel}&rdquo;</strong> arriba a la derecha para registrar una nueva orden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order, idx) => {
                    const st = STATUS_META[order.estado] || STATUS_META.READY
                    const isSelected = selectedIds.includes(order.id)
                    const absoluteIndex = page * rowsPerPage + idx + 1

                    return (
                      <TableRow
                        hover
                        key={order.id}
                        onClick={() => router.push(`${currentBaseRoute}/${order.id}`)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(108, 92, 231, 0.08)' : undefined,
                          '&:hover': {
                            backgroundColor: isSelected ? 'rgba(108, 92, 231, 0.12)' : '#F9F8FF'
                          }
                        }}
                      >
                        <TableCell padding='checkbox' sx={{ pl: 2, pr: 0 }} onClick={e => e.stopPropagation()}>
                          <Checkbox
                            size='small'
                            checked={isSelected}
                            onChange={() => handleToggleSelect(order.id)}
                            sx={{
                              color: '#DCD8EC',
                              '&.Mui-checked': { color: '#6C5CE7' },
                              p: 0.5
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.75rem', color: '#9CA3AF' }}>
                          {absoluteIndex}
                        </TableCell>

                        <TableCell sx={{ py: 1.5 }}>
                          <span className='font-mono text-xs font-bold text-[#6C5CE7] hover:underline block truncate'>
                            {order.codigo}
                          </span>
                          {order.documento_origen ? (
                            <span className='text-xs font-mono text-[#6B7280] block truncate'>
                              Doc: {order.documento_origen}
                            </span>
                          ) : (
                            <span className='text-xs text-[#9CA3AF] block'>Directo</span>
                          )}
                        </TableCell>

                        {visibleColumns.partner && (
                          <TableCell sx={{ py: 1.5 }}>
                            <span className='font-semibold text-[#1E1B2E] text-xs block truncate'>
                              {order.tercero_nombre}
                            </span>
                            <span className='text-xs text-[#6B7280] block truncate'>
                              {order.lineas
                                .slice(0, 2)
                                .map(l => l.producto_nombre)
                                .join(', ')}
                              {order.lineas.length > 2 ? ` (+${order.lineas.length - 2})` : ''}
                            </span>
                          </TableCell>
                        )}

                        {visibleColumns.flujo && (
                          <TableCell sx={{ py: 1.5 }}>
                            <div className='flex items-center gap-1.5 text-xs text-[#1E1B2E] truncate'>
                              <span className='font-medium truncate'>
                                {order.almacen_origen_nombre}
                              </span>
                              <i className='tabler-arrow-right text-xs text-[#6C5CE7] shrink-0' />
                              <span className='font-bold text-[#6C5CE7] truncate'>
                                {order.almacen_destino_nombre}
                              </span>
                            </div>
                            {(order.ubicacion_destino_nombre || order.ubicacion_origen_nombre) && (
                              <span className='text-xs font-mono text-[#6B7280] block truncate mt-0.5'>
                                {operationType === 'DELIVERY'
                                  ? order.ubicacion_origen_nombre
                                  : order.ubicacion_destino_nombre}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {visibleColumns.fecha && (
                          <TableCell align='center' sx={{ py: 1.5, fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>
                            {order.fecha_programada}
                          </TableCell>
                        )}

                        {visibleColumns.articulos && (
                          <TableCell align='right' sx={{ py: 1.5 }}>
                            <span className='font-bold text-xs text-[#1E1B2E] block'>
                              {order.total_articulos} unid.
                            </span>
                            <span className='text-xs text-[#6B7280] block'>
                              {order.lineas.length}{' '}
                              {order.lineas.length === 1 ? 'línea' : 'líneas'}
                            </span>
                          </TableCell>
                        )}

                        {visibleColumns.estado && (
                          <TableCell align='center' sx={{ py: 1.5 }}>
                            <CustomChip
                              size='small'
                              variant='tonal'
                              color={st.color}
                              label={st.label}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginación Estandarizada MUI */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component='div'
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage='Filas por página:'
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      {/* Menú de Personalización de Columnas */}
      <Menu
        anchorEl={columnAnchorEl}
        open={Boolean(columnAnchorEl)}
        onClose={() => setColumnAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <Typography variant='caption' className='font-bold text-[#6B7280] px-3 py-1 block uppercase text-[10px]'>
          Columnas Visibles
        </Typography>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, partner: !prev.partner }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.partner)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>{cfg.partnerLabel}</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, flujo: !prev.flujo }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.flujo)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Flujo de Almacén</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, fecha: !prev.fecha }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.fecha)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Fecha Programada</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, articulos: !prev.articulos }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.articulos)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Artículos</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, estado: !prev.estado }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.estado)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Estado</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setVisibleColumns({
              partner: true,
              flujo: true,
              fecha: true,
              articulos: true,
              estado: true
            })
            setColumnAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className='tabler-rotate text-sm mr-2' /> Restablecer Columnas
        </MenuItem>
      </Menu>

      {/* Menú de Acciones en Lote */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={() => setBatchMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 0.75,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <MenuItem
          onClick={handleBatchCopyCodes}
          sx={{
            color: '#1E1B2E',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F8F7FC' }
          }}
        >
          <i className='tabler-copy text-base text-[#6C5CE7]' />
          <span className='font-semibold text-sm'>Copiar códigos ({selectedIds.length})</span>
        </MenuItem>
        <MenuItem
          onClick={handleBatchValidate}
          sx={{
            color: '#10B981',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#ECFDF5' }
          }}
        >
          <i className='tabler-check text-base text-[#10B981]' />
          <span className='font-semibold text-sm'>Validar listas ({selectedIds.length})</span>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null)
            setBatchCancelConfirmOpen(true)
          }}
          sx={{
            color: '#EF4444',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#FEF2F2' }
          }}
        >
          <i className='tabler-ban text-base text-[#EF4444]' />
          <span className='font-semibold text-sm'>Cancelar operaciones ({selectedIds.length})</span>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null)
            setSelectedIds([])
          }}
          sx={{
            color: '#6B7280',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F9FAFB' }
          }}
        >
          <i className='tabler-x text-base text-[#6B7280]' />
          <span className='text-sm'>Deseleccionar</span>
        </MenuItem>
      </Menu>

      {/* Diálogo de Confirmación para Cancelación en Lote */}
      <Dialog
        open={batchCancelConfirmOpen}
        onClose={() => setBatchCancelConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle className='flex items-center gap-2 text-error font-bold pb-2'>
          <i className='tabler-alert-triangle text-2xl text-red-500' />
          <span>Cancelar {selectedIds.length} operaciones</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' className='text-[#4B5563]'>
            ¿Estás seguro de que deseas cancelar las{' '}
            <strong className='text-[#1E1B2E]'>
              {selectedIds.length} operaciones seleccionadas
            </strong>? Esta acción cambiará su estado a Cancelada.
          </Typography>
        </DialogContent>
        <DialogActions className='pt-2 pb-3 px-4'>
          <Button
            variant='outlined'
            onClick={() => setBatchCancelConfirmOpen(false)}
            sx={{ borderRadius: '9999px', color: '#6B7280' }}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            startIcon={<i className='tabler-ban' />}
            onClick={handleConfirmBatchCancel}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              px: 3,
              fontWeight: 600,
              '&:hover': { backgroundColor: '#DC2626' }
            }}
          >
            Sí, Cancelar {selectedIds.length} Operaciones
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          sx={{ borderRadius: '14px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default WarehouseOperationsListView
