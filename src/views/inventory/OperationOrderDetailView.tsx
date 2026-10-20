'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import CustomTextField from '@core/components/mui/TextField'
import CustomAutocomplete from '@core/components/mui/Autocomplete'
import {
  getWarehouseOperationOrderById,
  createWarehouseOperationOrder,
  validateWarehouseOperationOrder,
  cancelWarehouseOperationOrder,
  getWarehouses,
  getInventoryTemplates
} from '@/services/inventoryService'
import type {
  WarehouseOperationOrder,
  WarehouseOperationType,
  WarehouseOperationLine,
  Warehouse
} from '@/types/inventoryTypes'

interface Props {
  id: string
  defaultType?: WarehouseOperationType
}

interface VariantOption {
  templateId: string
  variantId: string
  templateName: string
  sku: string
  label: string
  uom: string
  costPrice: number
}

interface DraftLine {
  tempId: string
  variantOption: VariantOption | null
  cantidad: string
}

export const OperationOrderDetailView = ({ id, defaultType = 'RECEIPT' }: Props) => {
  const router = useRouter()
  const isCreate = id === 'create'

  // Loading & order states
  const [loading, setLoading] = useState(!isCreate)
  const [order, setOrder] = useState<WarehouseOperationOrder | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Form states for creation / editing
  const [tipo, setTipo] = useState<WarehouseOperationType>(defaultType)
  const [terceroNombre, setTerceroNombre] = useState('')
  const [documentoOrigen, setDocumentoOrigen] = useState('')
  const [fechaProgramada, setFechaProgramada] = useState(new Date().toISOString().slice(0, 10))
  const [responsable, setResponsable] = useState('Elena Rivas')
  const [notas, setNotas] = useState('')
  const [originWhId, setOriginWhId] = useState('')
  const [destWhId, setDestWhId] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])

  // Modal confirmación para validación / cancelación
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [validateModalOpen, setValidateModalOpen] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Ruta base según el tipo de operación
  const currentType = isCreate ? tipo : order?.tipo || defaultType
  const baseRoute = useMemo(() => {
    switch (currentType) {
      case 'RECEIPT':
        return '/inventory/operations/receipts'
      case 'DELIVERY':
        return '/inventory/operations/deliveries'
      case 'INTERNAL_TRANSFER':
        return '/inventory/operations/transfers'
      default:
        return '/inventory/operations/receipts'
    }
  }, [currentType])

  const typeLabel = useMemo(() => {
    switch (currentType) {
      case 'RECEIPT':
        return 'Recepción'
      case 'DELIVERY':
        return 'Orden de Entrega'
      case 'INTERNAL_TRANSFER':
        return 'Transferencia Interna'
      default:
        return 'Operación de Almacén'
    }
  }, [currentType])

  // Cargar catálogo de almacenes y productos
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [whs, templates] = await Promise.all([getWarehouses(), getInventoryTemplates()])
        setWarehouses(whs)

        if (whs.length > 0) {
          setOriginWhId(whs[0].id)
          setDestWhId(whs.length > 1 ? whs[1].id : whs[0].id)
        }

        const vOpts: VariantOption[] = []
        templates.forEach(t => {
          t.variants.forEach(v => {
            const attrLabel = v.combinationValues.map(a => a.valueName).join('/') || 'Estándar'
            vOpts.push({
              templateId: t.id,
              variantId: v.id,
              templateName: t.name,
              sku: v.sku,
              label: `${t.name} - ${v.sku} (${attrLabel})`,
              uom: t.uomCode || 'UNIDADES',
              costPrice: v.costPrice || t.standardCost || 0
            })
          })
        })
        setVariantOptions(vOpts)

        if (isCreate && vOpts.length > 0) {
          setLines([
            {
              tempId: `draft-line-${Date.now()}`,
              variantOption: vOpts[0],
              cantidad: '1'
            }
          ])
        }
      } catch (e) {
        console.error('Error al cargar catálogos de almacén:', e)
      }
    }

    fetchCatalog()
  }, [isCreate])

  // Cargar orden si es vista detalle
  const loadOrder = useCallback(async () => {
    if (isCreate) return

    setLoading(true)
    try {
      const data = await getWarehouseOperationOrderById(id)
      if (data) {
        setOrder(data)
        setTipo(data.tipo)
        setTerceroNombre(data.tercero_nombre)
        setDocumentoOrigen(data.documento_origen || '')
        setFechaProgramada(data.fecha_programada || new Date().toISOString().slice(0, 10))
        setResponsable(data.responsable || '')
        setNotas(data.notas || '')
      }
    } catch (e) {
      console.error('Error al cargar orden de operación:', e)
    } finally {
      setLoading(false)
    }
  }, [id, isCreate])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        tempId: `draft-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        variantOption: variantOptions[0] || null,
        cantidad: '1'
      }
    ])
  }

  const handleRemoveLine = (tempId: string) => {
    setLines(prev => prev.filter(l => l.tempId !== tempId))
  }

  const handleSaveOrder = async () => {
    if (!terceroNombre.trim()) {
      setToast({
        open: true,
        message: 'Por favor ingresa el nombre del contacto o tercero.',
        severity: 'error'
      })
      return
    }

    const validLines = lines.filter(l => l.variantOption && Number(l.cantidad) > 0)
    if (validLines.length === 0) {
      setToast({
        open: true,
        message: 'Debes incluir al menos un artículo con cantidad mayor a 0.',
        severity: 'error'
      })
      return
    }

    const originWh = warehouses.find(w => w.id === originWhId)
    const destWh = warehouses.find(w => w.id === destWhId)

    setSubmitting(true)
    try {
      const created = await createWarehouseOperationOrder({
        tipo,
        tercero_nombre: terceroNombre.trim(),
        documento_origen: documentoOrigen.trim() || undefined,
        almacen_origen_id: tipo === 'RECEIPT' ? undefined : originWh?.id,
        almacen_origen_nombre: tipo === 'RECEIPT' ? 'Proveedor / Externo' : originWh?.name || 'Almacén Principal',
        almacen_destino_id: tipo === 'DELIVERY' ? undefined : destWh?.id,
        almacen_destino_nombre: tipo === 'DELIVERY' ? 'Cliente / Despacho Externo' : destWh?.name || 'Almacén Principal',
        fecha_programada: fechaProgramada,
        responsable,
        notas: notas.trim() || undefined,
        lineas: validLines.map(l => ({
          producto_id: l.variantOption!.templateId,
          producto_nombre: l.variantOption!.templateName,
          variante_id: l.variantOption!.variantId,
          variante_sku: l.variantOption!.sku,
          cantidad_demanda: Number(l.cantidad),
          cantidad_procesada: Number(l.cantidad),
          uom_code: l.variantOption!.uom,
          costo_unitario_usd: l.variantOption!.costPrice
        }))
      })

      setToast({
        open: true,
        message: `Operación ${created.codigo} registrada exitosamente.`,
        severity: 'success'
      })

      setTimeout(() => {
        router.push(baseRoute)
      }, 1000)
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al guardar la operación de almacén.',
        severity: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidateOrder = async () => {
    if (!order) return
    setSubmitting(true)
    try {
      await validateWarehouseOperationOrder(order.id)
      setToast({
        open: true,
        message: 'Operación validada y stock actualizado correctamente.',
        severity: 'success'
      })
      setValidateModalOpen(false)
      loadOrder()
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'No se pudo validar la operación.',
        severity: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    setSubmitting(true)
    try {
      await cancelWarehouseOperationOrder(order.id)
      setToast({
        open: true,
        message: 'Operación cancelada correctamente.',
        severity: 'success'
      })
      setCancelModalOpen(false)
      loadOrder()
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'No se pudo cancelar la operación.',
        severity: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <i className='tabler-loader-2 text-3xl text-primary animate-spin' />
      </div>
    )
  }

  if (!isCreate && !order) {
    return (
      <Card className='p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto rounded-2xl border border-[#E6E4F0]'>
        <i className='tabler-package-off text-5xl text-[#EF4444] mb-3' />
        <Typography variant='h5' className='font-bold text-[#1E1B2E] mb-2'>
          Operación no encontrada
        </Typography>
        <Typography className='text-[#6B7280] mb-5'>
          La orden de operación con identificador &quot;{id}&quot; no existe en el sistema.
        </Typography>
        <Button
          component={Link}
          href={baseRoute}
          variant='contained'
          color='primary'
          startIcon={<i className='tabler-arrow-left' />}
        >
          Volver a Operaciones
        </Button>
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-6 w-full pb-12'>
      {/* Cabecera Estructura Oficial contacts/create */}
      <div className='flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap'>
        {/* Izquierda: Botón Volver + Título + Badges de Tipo y Estado */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <Button
            component={Link}
            href={baseRoute}
            variant='tonal'
            size='small'
            startIcon={<i className='tabler-arrow-left' />}
            className='shrink-0'
          >
            Volver
          </Button>

          <div className='min-w-0 flex-1 flex items-center gap-2.5 flex-wrap'>
            <Typography variant='h4' className='font-bold text-textPrimary truncate'>
              {isCreate ? `Nueva ${typeLabel}` : order?.codigo}
            </Typography>

            <Chip
              label={typeLabel}
              size='small'
              className='font-semibold bg-[#F3F0FF] text-[#6C5CE7] border border-[#DCD8EC]'
            />

            {!isCreate && order && (
              <Chip
                label={
                  order.estado === 'COMPLETED'
                    ? 'REALIZADO'
                    : order.estado === 'READY'
                    ? 'LISTO'
                    : order.estado === 'CANCELLED'
                    ? 'CANCELADO'
                    : 'BORRADOR'
                }
                size='small'
                className={`font-semibold ${
                  order.estado === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : order.estado === 'READY'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : order.estado === 'CANCELLED'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              />
            )}
          </div>
        </div>

        {/* Derecha: Acciones Primarias */}
        <div className='flex items-center gap-2.5 shrink-0'>
          {isCreate ? (
            <>
              <Button component={Link} href={baseRoute} variant='outlined' color='secondary'>
                Cancelar
              </Button>
              <Button
                variant='contained'
                color='primary'
                onClick={handleSaveOrder}
                disabled={submitting}
                startIcon={<i className='tabler-check' />}
              >
                {submitting ? 'Guardando...' : 'Guardar Operación'}
              </Button>
            </>
          ) : (
            order && (
              <>
                {order.estado !== 'COMPLETED' && order.estado !== 'CANCELLED' && (
                  <>
                    <Button
                      variant='outlined'
                      color='error'
                      onClick={() => setCancelModalOpen(true)}
                      startIcon={<i className='tabler-x' />}
                    >
                      Cancelar Orden
                    </Button>
                    <Button
                      variant='contained'
                      color='primary'
                      onClick={() => setValidateModalOpen(true)}
                      startIcon={<i className='tabler-check' />}
                    >
                      Validar y Procesar
                    </Button>
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Tarjeta 1: Información General de la Operación */}
      <Card className='border border-[#E6E4F0] rounded-2xl shadow-xs bg-white'>
        <CardContent className='p-6'>
          <Typography variant='h6' className='font-bold text-[#1E1B2E] mb-4 flex items-center gap-2'>
            <i className='tabler-file-info text-[#6C5CE7]' /> Información General
          </Typography>

          <Grid container spacing={4}>
            {isCreate && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <CustomTextField
                  select
                  fullWidth
                  label='Tipo de Operación'
                  value={tipo}
                  onChange={e => setTipo(e.target.value as WarehouseOperationType)}
                >
                  <MenuItem value='RECEIPT'>Recepción (Ingreso de Proveedor)</MenuItem>
                  <MenuItem value='DELIVERY'>Entrega (Despacho a Cliente)</MenuItem>
                  <MenuItem value='INTERNAL_TRANSFER'>Transferencia Interna</MenuItem>
                </CustomTextField>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6, md: isCreate ? 4 : 6 }}>
              <CustomTextField
                fullWidth
                label={currentType === 'RECEIPT' ? 'Proveedor / Tercero' : 'Cliente / Tercero'}
                placeholder='Nombre o razón social'
                value={terceroNombre}
                onChange={e => setTerceroNombre(e.target.value)}
                disabled={!isCreate && order?.estado !== 'DRAFT'}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: isCreate ? 4 : 6 }}>
              <CustomTextField
                fullWidth
                label='Documento de Origen / Referencia'
                placeholder='Ej. O/C-0023 o FACT-1092'
                value={documentoOrigen}
                onChange={e => setDocumentoOrigen(e.target.value)}
                disabled={!isCreate && order?.estado !== 'DRAFT'}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CustomTextField
                fullWidth
                type='date'
                label='Fecha Programada'
                value={fechaProgramada}
                onChange={e => setFechaProgramada(e.target.value)}
                disabled={!isCreate && order?.estado !== 'DRAFT'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {currentType !== 'RECEIPT' && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <CustomTextField
                  select
                  fullWidth
                  label='Almacén de Origen'
                  value={originWhId}
                  onChange={e => setOriginWhId(e.target.value)}
                  disabled={!isCreate && order?.estado !== 'DRAFT'}
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            )}

            {currentType !== 'DELIVERY' && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <CustomTextField
                  select
                  fullWidth
                  label='Almacén de Destino'
                  value={destWhId}
                  onChange={e => setDestWhId(e.target.value)}
                  disabled={!isCreate && order?.estado !== 'DRAFT'}
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CustomTextField
                fullWidth
                label='Responsable Operativo'
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                disabled={!isCreate && order?.estado !== 'DRAFT'}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tarjeta 2: Líneas de Artículos de la Operación */}
      <Card className='border border-[#E6E4F0] rounded-2xl shadow-xs bg-white'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4 flex-wrap gap-2'>
            <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
              <i className='tabler-box text-[#6C5CE7]' /> Artículos y Cantidades
            </Typography>

            {isCreate && (
              <Button
                variant='tonal'
                size='small'
                startIcon={<i className='tabler-plus' />}
                onClick={handleAddLine}
              >
                Agregar Artículo
              </Button>
            )}
          </div>

          <div className='overflow-x-auto rounded-xl border border-[#E6E4F0]'>
            <table className='w-full text-left border-collapse text-sm'>
              <thead className='bg-[#FAF9FF] border-b border-[#E6E4F0] text-xs font-semibold text-[#6B7280] uppercase'>
                <tr>
                  <th className='py-3 px-4'>Producto / Variante</th>
                  <th className='py-3 px-4'>SKU</th>
                  <th className='py-3 px-4 text-center'>Demanda Inicial</th>
                  <th className='py-3 px-4 text-center'>UoM</th>
                  {isCreate && <th className='py-3 px-4 text-center w-12'>Acción</th>}
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E6E4F0]'>
                {isCreate ? (
                  lines.map(line => (
                    <tr key={line.tempId} className='hover:bg-[#FAF9FF]'>
                      <td className='py-3 px-4 min-w-[260px]'>
                        <CustomAutocomplete
                          options={variantOptions}
                          getOptionLabel={opt => opt.label}
                          value={line.variantOption}
                          onChange={(_, val) => {
                            setLines(prev =>
                              prev.map(l => (l.tempId === line.tempId ? { ...l, variantOption: val } : l))
                            )
                          }}
                          renderInput={params => <CustomTextField {...params} placeholder='Seleccionar artículo...' size='small' />}
                        />
                      </td>
                      <td className='py-3 px-4 font-mono text-xs text-[#6B7280]'>
                        {line.variantOption?.sku || '—'}
                      </td>
                      <td className='py-3 px-4 text-center w-36'>
                        <CustomTextField
                          type='number'
                          size='small'
                          value={line.cantidad}
                          onChange={e => {
                            const val = e.target.value
                            setLines(prev =>
                              prev.map(l => (l.tempId === line.tempId ? { ...l, cantidad: val } : l))
                            )
                          }}
                          inputProps={{ min: '1', style: { textAlign: 'center' } }}
                        />
                      </td>
                      <td className='py-3 px-4 text-center text-xs font-semibold text-[#6B7280]'>
                        {line.variantOption?.uom || 'UNIDADES'}
                      </td>
                      <td className='py-3 px-4 text-center'>
                        <IconButton
                          size='small'
                          color='error'
                          disabled={lines.length === 1}
                          onClick={() => handleRemoveLine(line.tempId)}
                        >
                          <i className='tabler-trash text-base' />
                        </IconButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  order?.lineas.map(line => (
                    <tr key={line.id} className='hover:bg-[#FAF9FF]'>
                      <td className='py-3.5 px-4 font-medium text-[#1E1B2E]'>
                        {line.producto_nombre}
                      </td>
                      <td className='py-3.5 px-4 font-mono text-xs text-[#6B7280]'>{line.variante_sku}</td>
                      <td className='py-3.5 px-4 text-center font-bold text-[#1E1B2E]'>
                        {line.cantidad_demanda}
                      </td>
                      <td className='py-3.5 px-4 text-center text-xs text-[#6B7280] font-semibold'>
                        {line.uom_code || 'UNIDADES'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tarjeta 3: Notas y Términos */}
      <Card className='border border-[#E6E4F0] rounded-2xl shadow-xs bg-white'>
        <CardContent className='p-6'>
          <Typography variant='h6' className='font-bold text-[#1E1B2E] mb-3 flex items-center gap-2'>
            <i className='tabler-note text-[#6C5CE7]' /> Notas y Observaciones
          </Typography>
          <CustomTextField
            fullWidth
            multiline
            rows={3}
            placeholder='Notas de recepción, condición del empaque o instrucciones de despacho...'
            value={notas}
            onChange={e => setNotas(e.target.value)}
            disabled={!isCreate && order?.estado !== 'DRAFT'}
          />
        </CardContent>
      </Card>

      {/* Modal Confirmar Cancelación */}
      <Dialog open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle className='font-bold text-[#1E1B2E]'>¿Cancelar esta operación?</DialogTitle>
        <DialogContent>
          <Typography className='text-sm text-[#6B7280]'>
            La orden quedará en estado CANCELADO y no podrá revertirse ni procesar movimientos de stock.
          </Typography>
        </DialogContent>
        <DialogActions className='p-4 pt-0'>
          <Button onClick={() => setCancelModalOpen(false)} variant='outlined' color='secondary'>
            Volver
          </Button>
          <Button onClick={handleCancelOrder} variant='contained' color='error' disabled={submitting}>
            {submitting ? 'Cancelando...' : 'Sí, Cancelar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Confirmar Validación */}
      <Dialog open={validateModalOpen} onClose={() => setValidateModalOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle className='font-bold text-[#1E1B2E]'>¿Validar y asentar en Kárdex?</DialogTitle>
        <DialogContent>
          <Typography className='text-sm text-[#6B7280]'>
            Al validar, los artículos se moverán físicamente en los almacenes correspondientes y se generarán los asientos en el Kárdex de inventario.
          </Typography>
        </DialogContent>
        <DialogActions className='p-4 pt-0'>
          <Button onClick={() => setValidateModalOpen(false)} variant='outlined' color='secondary'>
            Revisar
          </Button>
          <Button onClick={handleValidateOrder} variant='contained' color='primary' disabled={submitting}>
            {submitting ? 'Procesando...' : 'Confirmar y Validar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant='filled' sx={{ borderRadius: '12px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default OperationOrderDetailView
