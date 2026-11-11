'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type {
  LandedCostRecord,
  LandedCostCostLine,
  LandedCostReceiptRef,
  LandedCostSplitMethod,
  ProductTemplate,
  WarehouseOperationOrder
} from '@/types/inventoryTypes'
import {
  getLandedCostById,
  createLandedCost,
  updateLandedCost,
  validateLandedCost,
  calculateValuationAdjustments,
  getWarehouseOperationOrders,
  getInventoryTemplates
} from '@/services/inventoryService'
import { accountingService } from '@/services/accountingService'
import type { AccountingInvoice } from '@/types/accountingTypes'

interface Props {
  id: string
}

const SPLIT_METHOD_LABELS: Record<LandedCostSplitMethod, string> = {
  BY_QUANTITY: 'Por Cantidad Recibida',
  BY_COST: 'Por Valor / Costo de Compra',
  BY_WEIGHT: 'Por Peso Total',
  BY_VOLUME: 'Por Volumen Total',
  EQUAL: 'En Partes Iguales'
}

export const LandedCostDetailView: React.FC<Props> = ({ id }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceIdParam = searchParams.get('invoiceId')
  const isCreate = id === 'create'

  const [loading, setLoading] = useState(!isCreate)
  const [submitting, setSubmitting] = useState(false)
  const [validating, setValidating] = useState(false)

  // Master Record State
  const [record, setRecord] = useState<LandedCostRecord | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [recepciones, setRecepciones] = useState<LandedCostReceiptRef[]>([])
  const [costos, setCostos] = useState<LandedCostCostLine[]>([])

  // Aux state for selection
  const [availableReceipts, setAvailableReceipts] = useState<WarehouseOperationOrder[]>([])
  const [landedCostServices, setLandedCostServices] = useState<ProductTemplate[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<AccountingInvoice[]>([])
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptSearch, setReceiptSearch] = useState('')
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [validateModalOpen, setValidateModalOpen] = useState(false)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([])

  // Active Tab
  const [activeTab, setActiveTab] = useState<'costos' | 'recepciones' | 'ajustes' | 'contabilidad'>('costos')

  // Toast
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const isApplied = record?.estado === 'APPLIED'

  // Load Initial Data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(!isCreate)

      const [allReceipts, allTemplates, allInvoices] = await Promise.all([
        getWarehouseOperationOrders('RECEIPT'),
        getInventoryTemplates(),
        accountingService.getInvoices()
      ])

      // Filtrar recepciones completadas
      setAvailableReceipts(allReceipts.filter(r => r.estado === 'COMPLETED'))

      // Filtrar facturas de compras / proveedores
      setSupplierInvoices(allInvoices.filter(i => i.tipo === 'SUPPLIER'))

      // Filtrar servicios de tipo Landed Cost (o servicios en general)
      const services = allTemplates.filter(t => t.productType === 'service')

      setLandedCostServices(services)

      if (!isCreate) {
        const found = await getLandedCostById(id)

        if (!found) {
          setToast({ open: true, message: 'Costo en destino no encontrado.', severity: 'error' })
          
return
        }

        setRecord(found)
        setFecha(found.fecha ? found.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10))
        setReferencia(found.referencia || '')
        setNotas(found.notas || '')
        setRecepciones(found.recepciones || [])
        setCostos(found.costos || [])
      } else {
        // Flujo A: Si viene derivado desde una Factura de Proveedor (?invoiceId=...)
        if (invoiceIdParam) {
          const inv = allInvoices.find(i => i.id === invoiceIdParam)

          if (inv) {
            setReferencia(`Factura Proveedor: ${inv.numeroFactura}`)
            setFecha(inv.fechaEmision)
            setNotas(`Costo en destino liquidado desde Factura de Proveedor ${inv.numeroFactura} (${inv.contactoNombre} - RIF: ${inv.contactoRif})`)

            if (inv.lineas && inv.lineas.length > 0) {
              const defaultService = services.find(s => s.isLandedCost) || services[0]

              const importedLines: LandedCostCostLine[] = inv.lineas.map(l => ({
                id: `cost-inv-${l.id}-${Date.now()}`,
                producto_id: defaultService?.id || '',
                producto_nombre: l.productoOConcepto,
                descripcion: `Factura ${inv.numeroFactura} - ${inv.contactoNombre}`,
                metodo_reparto: defaultService?.defaultSplitMethod || 'BY_QUANTITY',
                monto_usd: l.subtotalUsd
              }))

              setCostos(importedLines)
            }
          }
        } else {
          // Flujo B: En creación manual directa, pre-cargar una línea de costo sugerida si hay servicios
          const defaultService = services.find(s => s.isLandedCost) || services[0]

          if (defaultService) {
            setCostos([
              {
                id: `cost-draft-${Date.now()}`,
                producto_id: defaultService.id,
                producto_nombre: defaultService.name,
                descripcion: 'Flete y transporte de mercancía',
                metodo_reparto: defaultService.defaultSplitMethod || 'BY_QUANTITY',
                monto_usd: 100.0
              }
            ])
          }
        }
      }
    } catch {
      setToast({ open: true, message: 'Error al inicializar datos.', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, isCreate, invoiceIdParam])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Total monto calculado de las líneas de costo
  const totalMontoUsd = useMemo(() => {
    return costos.reduce((acc, c) => acc + (Number(c.monto_usd) || 0), 0)
  }, [costos])

  // Previsualización de Ajustes de Valoración calculados en tiempo real
  const previewAdjustments = useMemo(() => {
    if (isApplied && record?.ajustes_valoracion?.length) {
      return record.ajustes_valoracion
    }

    
return calculateValuationAdjustments(recepciones, costos)
  }, [recepciones, costos, isApplied, record])

  // Handlers para líneas de costo
  const handleAddCostLine = () => {
    const defaultService = landedCostServices.find(s => s.isLandedCost) || landedCostServices[0]

    setCostos(prev => [
      ...prev,
      {
        id: `cost-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        producto_id: defaultService?.id || '',
        producto_nombre: defaultService?.name || 'Servicio de Flete',
        descripcion: '',
        metodo_reparto: defaultService?.defaultSplitMethod || 'BY_QUANTITY',
        monto_usd: 0
      }
    ])
  }

  const handleUpdateCostLine = (lineId: string, partial: Partial<LandedCostCostLine>) => {
    setCostos(prev =>
      prev.map(line => {
        if (line.id !== lineId) return line
        
return { ...line, ...partial }
      })
    )
  }

  const handleRemoveCostLine = (lineId: string) => {
    setCostos(prev => prev.filter(line => line.id !== lineId))
  }

  // Filtrar recepciones disponibles en el modal según búsqueda
  const filteredAvailableReceipts = useMemo(() => {
    if (!receiptSearch.trim()) return availableReceipts
    const q = receiptSearch.toLowerCase().trim()

    return availableReceipts.filter(order => {
      const matchCode = order.codigo.toLowerCase().includes(q)
      const matchVendor = (order.tercero_nombre || '').toLowerCase().includes(q)
      const matchDoc = (order.documento_origen || '').toLowerCase().includes(q)

      const matchLines = order.lineas.some(
        l =>
          (l.producto_nombre || '').toLowerCase().includes(q) ||
          (l.variante_sku || '').toLowerCase().includes(q)
      )

      return matchCode || matchVendor || matchDoc || matchLines
    })
  }, [availableReceipts, receiptSearch])

  // Filtrar facturas de compras disponibles en el modal según búsqueda
  const filteredSupplierInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return supplierInvoices
    const q = invoiceSearch.toLowerCase().trim()

    return supplierInvoices.filter(
      inv =>
        inv.numeroFactura.toLowerCase().includes(q) ||
        inv.contactoNombre.toLowerCase().includes(q) ||
        inv.contactoRif.toLowerCase().includes(q)
    )
  }, [supplierInvoices, invoiceSearch])

  const handleOpenInvoiceModal = () => {
    setInvoiceSearch('')
    setInvoiceModalOpen(true)
  }

  const handleSelectInvoiceToImport = (inv: AccountingInvoice) => {
    if (!referencia.trim()) {
      setReferencia(`Factura Proveedor: ${inv.numeroFactura}`)
    }

    setNotas(prev =>
      prev
        ? `${prev}\nFactura ${inv.numeroFactura} (${inv.contactoNombre} - RIF: ${inv.contactoRif})`
        : `Costos derivados de Factura ${inv.numeroFactura} (${inv.contactoNombre})`
    )

    const defaultService = landedCostServices.find(s => s.isLandedCost) || landedCostServices[0]

    const newLines: LandedCostCostLine[] = inv.lineas.map(l => ({
      id: `cost-inv-${l.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      producto_id: defaultService?.id || '',
      producto_nombre: l.productoOConcepto,
      descripcion: `Factura ${inv.numeroFactura} (${inv.contactoNombre})`,
      metodo_reparto: defaultService?.defaultSplitMethod || 'BY_QUANTITY',
      monto_usd: l.subtotalUsd
    }))

    setCostos(prev => [...prev, ...newLines])
    setInvoiceModalOpen(false)
    setToast({
      open: true,
      message: `Se importaron ${newLines.length} líneas de la factura ${inv.numeroFactura}.`,
      severity: 'success'
    })
  }

  // Handlers para recepciones vinculadas
  const handleOpenReceiptModal = () => {
    setSelectedReceiptIds(recepciones.map(r => r.orden_id))
    setReceiptSearch('')
    setReceiptModalOpen(true)
  }

  const handleConfirmReceipts = () => {
    const newRefs: LandedCostReceiptRef[] = []

    selectedReceiptIds.forEach(orderId => {
      const order = availableReceipts.find(o => o.id === orderId)

      if (order) {
        newRefs.push({
          id: `ref-${order.id}`,
          orden_id: order.id,
          orden_codigo: order.codigo,
          fecha: order.fecha_programada,
          tercero_nombre: order.tercero_nombre
        })
      }
    })

    setRecepciones(newRefs)
    setReceiptModalOpen(false)
  }

  const handleRemoveReceipt = (receiptId: string) => {
    setRecepciones(prev => prev.filter(r => r.id !== receiptId && r.orden_id !== receiptId))
  }

  // Guardar Borrador
  const handleSaveDraft = async () => {
    if (costos.length === 0) {
      setToast({ open: true, message: 'Agrega al menos una línea de costo.', severity: 'error' })
      
return
    }

    setSubmitting(true)

    try {
      if (isCreate) {
        const created = await createLandedCost({
          fecha,
          referencia: referencia.trim(),
          notas: notas.trim(),
          recepciones,
          costos
        })

        setToast({ open: true, message: `Borrador ${created.codigo} guardado exitosamente.`, severity: 'success' })
        setTimeout(() => {
          router.push(`/inventory/operations/landed-costs/${created.id}`)
        }, 500)
      } else {
        const updated = await updateLandedCost(id, {
          fecha,
          referencia: referencia.trim(),
          notas: notas.trim(),
          recepciones,
          costos
        })

        setRecord(updated)
        setToast({ open: true, message: 'Cambios guardados exitosamente.', severity: 'success' })
      }
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al guardar.', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Validar y Aplicar (Prorrateo definitivo, recalculo de AVCO y asiento contable)
  const handleValidate = async () => {
    setValidating(true)

    try {
      // Si estamos en creación, primero guardamos
      let targetId = id

      if (isCreate) {
        const created = await createLandedCost({
          fecha,
          referencia: referencia.trim(),
          notas: notas.trim(),
          recepciones,
          costos
        })

        targetId = created.id
      } else {
        await updateLandedCost(id, {
          fecha,
          referencia: referencia.trim(),
          notas: notas.trim(),
          recepciones,
          costos
        })
      }

      const applied = await validateLandedCost(targetId)

      setRecord(applied)
      setValidateModalOpen(false)
      setToast({
        open: true,
        message: `¡Costo en destino ${applied.codigo} validado y aplicado! Costo promedio actualizado en Kárdex.`,
        severity: 'success'
      })

      if (isCreate) {
        router.push(`/inventory/operations/landed-costs/${applied.id}`)
      }
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'Error al validar el costo en destino.', severity: 'error' })
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className='p-8 text-center text-[#6B7280]'>
        <div className='flex flex-col items-center justify-center gap-2'>
          <i className='tabler-loader animate-spin text-3xl text-[#6C5CE7]' />
          <span>Cargando costo en destino...</span>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Top Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div className='flex items-center gap-3'>
          <Button
            component={Link}
            href='/inventory/operations/landed-costs'
            variant='outlined'
            sx={{
              borderRadius: '9999px',
              minWidth: 40,
              width: 40,
              height: 40,
              p: 0,
              borderColor: '#E6E4F0',
              color: '#1E1B2E',
              '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
            }}
          >
            <i className='tabler-arrow-left text-lg' />
          </Button>

          <div className='flex items-center gap-3 flex-wrap'>
            <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
              {isCreate ? 'Nuevo Costo en Destino' : record?.codigo}
            </Typography>

            <CustomChip
              size='small'
              label={isApplied ? 'Aplicado y Contabilizado' : 'Borrador'}
              color={isApplied ? 'success' : 'warning'}
              variant='tonal'
            />

            {record?.asiento_contable_numero && (
              <span className='font-mono text-xs bg-[#ECFDF5] text-[#059669] font-bold px-2.5 py-0.5 rounded-full'>
                {record.asiento_contable_numero}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2.5 flex-wrap'>
          {!isApplied && (
            <>
              <Button
                variant='outlined'
                onClick={handleSaveDraft}
                disabled={submitting}
                startIcon={<i className='tabler-device-floppy text-base' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 0.9,
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                }}
              >
                {submitting ? 'Guardando...' : 'Guardar Borrador'}
              </Button>

              <Button
                variant='contained'
                onClick={() => setValidateModalOpen(true)}
                disabled={validating || recepciones.length === 0 || totalMontoUsd <= 0}
                startIcon={<i className='tabler-check text-base' />}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#6C5CE7',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3.5,
                  py: 0.9,
                  boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                  '&:hover': { backgroundColor: '#5B4CDB' }
                }}
              >
                Validar y Aplicar
              </Button>
            </>
          )}

          {isApplied && (
            <div className='flex items-center gap-2 text-xs font-semibold text-[#059669] bg-[#ECFDF5] px-3.5 py-1.5 rounded-full border border-[#A7F3D0]'>
              <i className='tabler-circle-check text-base' />
              <span>Documento validado e inmutable según norma contable</span>
            </div>
          )}
        </div>
      </div>

      {/* Master Information Card */}
      <Card
        sx={{
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
        }}
      >
        <CardContent className='p-6 flex flex-col gap-5'>
          <Typography variant='subtitle1' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
            <i className='tabler-file-description text-[#6C5CE7] text-lg' /> Información General del Costo en Destino
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                fullWidth
                size='small'
                type='date'
                label='Fecha de Liquidación'
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                disabled={isApplied}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 5 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Referencia / N° Guía / B/L'
                placeholder='ej. BL-99201-MSC (Naviera)'
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                disabled={isApplied}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <div className='p-2.5 rounded-xl border border-[#E6E4F0] bg-[#FAFAFC] flex flex-col justify-center items-end'>
                <span className='text-[11px] text-[#6B7280] font-medium'>Total a Prorratear (USD)</span>
                <span className='text-xl font-bold font-mono text-[#6C5CE7]'>
                  ${totalMontoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Notas y Justificación de Gastos'
                placeholder='Detalles de aduana, agente aduanal, facturas de flete asociadas...'
                value={notas}
                onChange={e => setNotas(e.target.value)}
                disabled={isApplied}
                multiline
                rows={2}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Card
        sx={{
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
        }}
      >
        <div className='border-b border-[#E6E4F0] px-4'>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            textColor='primary'
            indicatorColor='primary'
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                minHeight: 48
              }
            }}
          >
            <Tab
              value='costos'
              label={`1. Costos Adicionales (${costos.length})`}
              icon={<i className='tabler-receipt text-base' />}
              iconPosition='start'
            />
            <Tab
              value='recepciones'
              label={`2. Recepciones Vinculadas (${recepciones.length})`}
              icon={<i className='tabler-truck-delivery text-base' />}
              iconPosition='start'
            />
            <Tab
              value='ajustes'
              label={`3. Ajustes de Valoración (${previewAdjustments.length})`}
              icon={<i className='tabler-calculator text-base' />}
              iconPosition='start'
            />
            <Tab
              value='contabilidad'
              label='4. Impacto Contable'
              icon={<i className='tabler-book text-base' />}
              iconPosition='start'
            />
          </Tabs>
        </div>

        <CardContent className='p-5'>
          {/* TAB 1: COSTOS ADICIONALES */}
          {activeTab === 'costos' && (
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <div>
                  <Typography variant='subtitle2' className='font-bold text-[#1E1B2E]'>
                    Líneas de Servicios Adicionales (Flete, Aduana, Seguros)
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Selecciona los servicios y define el método con el cual se distribuirá cada costo entre los productos recibidos.
                  </span>
                </div>

                {!isApplied && (
                  <div className='flex items-center gap-2.5 flex-wrap'>
                    <Button
                      variant='outlined'
                      onClick={handleOpenInvoiceModal}
                      startIcon={<i className='tabler-file-invoice text-base' />}
                      sx={{
                        borderRadius: '9999px',
                        borderColor: '#E6E4F0',
                        color: '#1E1B2E',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                      }}
                    >
                      Importar Factura de Proveedor
                    </Button>

                    <Button
                      variant='outlined'
                      onClick={handleAddCostLine}
                      startIcon={<i className='tabler-plus text-base' />}
                      sx={{
                        borderRadius: '9999px',
                        borderColor: '#E6E4F0',
                        color: '#6C5CE7',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                      }}
                    >
                      Agregar Línea Manual
                    </Button>
                  </div>
                )}
              </div>

              <div className='overflow-x-auto rounded-xl border border-[#E6E4F0]'>
                <Table size='small'>
                  <TableHead sx={{ backgroundColor: '#F8F7FC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        SERVICIO / CONCEPTO
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        DESCRIPCIÓN
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        MÉTODO DE REPARTO
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        MONTO (USD)
                      </TableCell>
                      {!isApplied && (
                        <TableCell align='center' sx={{ width: 60, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                          ACCIONES
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isApplied ? 4 : 5} className='text-center py-8 text-[#6B7280]'>
                          No hay líneas de costo registradas. Haz clic en &quot;Agregar Línea de Costo&quot;.
                        </TableCell>
                      </TableRow>
                    ) : (
                      costos.map(costLine => (
                        <TableRow key={costLine.id} hover>
                          <TableCell sx={{ minWidth: 220 }}>
                            {isApplied ? (
                              <span className='font-semibold text-xs text-[#1E1B2E]'>
                                {costLine.producto_nombre}
                              </span>
                            ) : (
                              <CustomTextField
                                select
                                fullWidth
                                size='small'
                                value={costLine.producto_id}
                                onChange={e => {
                                  const srv = landedCostServices.find(s => s.id === e.target.value)

                                  handleUpdateCostLine(costLine.id, {
                                    producto_id: e.target.value,
                                    producto_nombre: srv?.name || '',
                                    metodo_reparto: srv?.defaultSplitMethod || costLine.metodo_reparto
                                  })
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                              >
                                {landedCostServices.map(srv => (
                                  <MenuItem key={srv.id} value={srv.id}>
                                    {srv.name} {srv.isLandedCost ? '(Landed Cost)' : ''}
                                  </MenuItem>
                                ))}
                              </CustomTextField>
                            )}
                          </TableCell>

                          <TableCell sx={{ minWidth: 200 }}>
                            {isApplied ? (
                              <span className='text-xs text-[#6B7280]'>{costLine.descripcion || '—'}</span>
                            ) : (
                              <CustomTextField
                                fullWidth
                                size='small'
                                placeholder='ej. Contenedor 40ft Puerto Cabello'
                                value={costLine.descripcion || ''}
                                onChange={e => handleUpdateCostLine(costLine.id, { descripcion: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                              />
                            )}
                          </TableCell>

                          <TableCell sx={{ minWidth: 210 }}>
                            {isApplied ? (
                              <CustomChip
                                size='small'
                                label={SPLIT_METHOD_LABELS[costLine.metodo_reparto]}
                                color='primary'
                                variant='tonal'
                              />
                            ) : (
                              <CustomTextField
                                select
                                fullWidth
                                size='small'
                                value={costLine.metodo_reparto}
                                onChange={e =>
                                  handleUpdateCostLine(costLine.id, {
                                    metodo_reparto: e.target.value as LandedCostSplitMethod
                                  })
                                }
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                              >
                                <MenuItem value='BY_QUANTITY'>Por Cantidad Recibida</MenuItem>
                                <MenuItem value='BY_COST'>Por Valor / Costo de Compra</MenuItem>
                                <MenuItem value='BY_WEIGHT'>Por Peso Total</MenuItem>
                                <MenuItem value='BY_VOLUME'>Por Volumen Total</MenuItem>
                                <MenuItem value='EQUAL'>En Partes Iguales</MenuItem>
                              </CustomTextField>
                            )}
                          </TableCell>

                          <TableCell align='right' sx={{ minWidth: 140 }}>
                            {isApplied ? (
                              <span className='font-mono font-bold text-xs text-[#1E1B2E]'>
                                ${costLine.monto_usd.toFixed(2)}
                              </span>
                            ) : (
                              <CustomTextField
                                size='small'
                                type='number'
                                value={costLine.monto_usd}
                                onChange={e =>
                                  handleUpdateCostLine(costLine.id, {
                                    monto_usd: Math.max(0, Number(e.target.value))
                                  })
                                }
                                slotProps={{
                                  input: {
                                    startAdornment: <span className='text-xs text-[#6B7280] mr-1'>$</span>
                                  }
                                }}
                                sx={{ maxWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                              />
                            )}
                          </TableCell>

                          {!isApplied && (
                            <TableCell align='center'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleRemoveCostLine(costLine.id)}
                              >
                                <i className='tabler-trash text-base' />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 2: RECEPCIONES VINCULADAS */}
          {activeTab === 'recepciones' && (
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <div>
                  <Typography variant='subtitle2' className='font-bold text-[#1E1B2E]'>
                    Recepciones de Almacén Realizadas (IN/2026/XXXX)
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Los artículos recibidos en estas órdenes recibirán el incremento de costo proporcional.
                  </span>
                </div>

                {!isApplied && (
                  <Button
                    variant='outlined'
                    onClick={handleOpenReceiptModal}
                    startIcon={<i className='tabler-link text-base' />}
                    sx={{
                      borderRadius: '9999px',
                      borderColor: '#E6E4F0',
                      color: '#6C5CE7',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                    }}
                  >
                    Vincular Recepciones
                  </Button>
                )}
              </div>

              <div className='overflow-x-auto rounded-xl border border-[#E6E4F0]'>
                <Table size='small'>
                  <TableHead sx={{ backgroundColor: '#F8F7FC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        CÓDIGO RECEPCIÓN
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        FECHA DE INGRESO
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        PROVEEDOR / TERCERO
                      </TableCell>
                      {!isApplied && (
                        <TableCell align='center' sx={{ width: 60, fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                          ACCIONES
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recepciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isApplied ? 3 : 4} className='text-center py-8 text-[#6B7280]'>
                          No has vinculado ninguna recepción. Haz clic en &quot;Vincular Recepciones&quot;.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recepciones.map(r => (
                        <TableRow key={r.id || r.orden_id} hover>
                          <TableCell className='font-mono font-bold text-xs text-[#6C5CE7]'>
                            {r.orden_codigo}
                          </TableCell>
                          <TableCell className='text-xs text-[#6B7280] font-mono'>
                            {r.fecha ? r.fecha.slice(0, 10) : '—'}
                          </TableCell>
                          <TableCell className='text-xs font-medium text-[#1E1B2E]'>
                            {r.tercero_nombre}
                          </TableCell>
                          {!isApplied && (
                            <TableCell align='center'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleRemoveReceipt(r.id)}
                              >
                                <i className='tabler-trash text-base' />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 3: AJUSTES DE VALORACIÓN (NIC 2) */}
          {activeTab === 'ajustes' && (
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <div>
                  <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-1.5'>
                    <i className='tabler-calculator text-[#6C5CE7]' /> Desglose de Prorrateo por Variante (AVCO / NIC 2)
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Muestra cómo se distribuyen los costos adicionales y cuál será el nuevo costo promedio ponderado de cada variante.
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <CustomChip
                    size='small'
                    label={`${previewAdjustments.length} variantes afectadas`}
                    color='primary'
                    variant='tonal'
                  />
                </div>
              </div>

              <div className='overflow-x-auto rounded-xl border border-[#E6E4F0]'>
                <Table size='small'>
                  <TableHead sx={{ backgroundColor: '#F8F7FC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        ARTÍCULO / VARIANTE SKU
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        CANT. RECIBIDA
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        STOCK EN ALMACÉN
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        COSTO ORIG. ($)
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        COSTO ADIC. TOTAL ($)
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        COSTO ADIC. UNIT. ($)
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6C5CE7', fontSize: '0.75rem', backgroundColor: '#F4F3FF' }}>
                        NUEVO COSTO PROM. ($)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewAdjustments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className='text-center py-8 text-[#6B7280]'>
                          Vincula al menos una recepción y define una línea de costo para visualizar el prorrateo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewAdjustments.map(adj => (
                        <TableRow key={adj.id || adj.variante_id} hover>
                          <TableCell>
                            <span className='font-semibold text-xs text-[#1E1B2E] block'>
                              {adj.producto_nombre}
                            </span>
                            <span className='font-mono text-[11px] text-[#6B7280]'>
                              SKU: {adj.variante_sku}
                            </span>
                          </TableCell>
                          <TableCell align='right' className='font-mono text-xs font-semibold'>
                            {adj.cantidad_recibida} un
                          </TableCell>
                          <TableCell align='right' className='font-mono text-xs text-[#6B7280]'>
                            {adj.stock_actual} un
                          </TableCell>
                          <TableCell align='right' className='font-mono text-xs text-[#6B7280]'>
                            ${adj.costo_original_usd.toFixed(2)}
                          </TableCell>
                          <TableCell align='right' className='font-mono text-xs font-semibold text-[#1E1B2E]'>
                            ${adj.costo_adicional_usd.toFixed(2)}
                          </TableCell>
                          <TableCell align='right' className='font-mono text-xs text-[#6B7280]'>
                            +${adj.costo_adicional_unitario_usd.toFixed(2)}
                          </TableCell>
                          <TableCell align='right' className='font-mono font-bold text-xs text-[#6C5CE7] bg-[#F4F3FF]'>
                            ${adj.nuevo_costo_usd.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 4: CONTABILIDAD */}
          {activeTab === 'contabilidad' && (
            <div className='flex flex-col gap-4'>
              <div>
                <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-1.5'>
                  <i className='tabler-book text-[#6C5CE7]' /> Asiento Contable Automático (VEN-NIF)
                </Typography>
                <span className='text-xs text-[#6B7280]'>
                  La porción del costo adicional correspondiente a mercancía aún en stock capitaliza el Activo Inventario. Las unidades ya vendidas impactan directamente el Costo de Ventas.
                </span>
              </div>

              {isApplied && record?.asiento_contable_numero && (
                <div className='p-3.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <i className='tabler-circle-check text-xl text-[#059669]' />
                    <div>
                      <span className='font-bold text-xs text-[#065F46] block'>
                        Asiento Contable Generado: {record.asiento_contable_numero}
                      </span>
                      <span className='text-[11px] text-[#047857]'>
                        Registrado en el Diario de Compras / Costos en Destino
                      </span>
                    </div>
                  </div>
                  <Button
                    component={Link}
                    href='/accounting/entries'
                    size='small'
                    variant='outlined'
                    sx={{
                      borderRadius: '9999px',
                      borderColor: '#059669',
                      color: '#059669',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      px: 2.5
                    }}
                  >
                    Ver en Libro Diario
                  </Button>
                </div>
              )}

              {/* Preview de Partida Doble */}
              <div className='overflow-x-auto rounded-xl border border-[#E6E4F0]'>
                <Table size='small'>
                  <TableHead sx={{ backgroundColor: '#F8F7FC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        CUENTA PUC
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        DESCRIPCIÓN DE LA LÍNEA
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        DEBE (USD)
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                        HABER (USD)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow hover>
                      <TableCell>
                        <span className='font-mono font-bold text-xs text-[#1E1B2E]'>1.1.03.01</span>
                        <span className='text-xs text-[#6B7280] block'>Inventario de Mercancía para la Venta</span>
                      </TableCell>
                      <TableCell className='text-xs text-[#6B7280]'>
                        Capitalización de fletes y aranceles sobre existencias en almacén
                      </TableCell>
                      <TableCell align='right' className='font-mono font-bold text-xs text-[#10B981]'>
                        ${totalMontoUsd.toFixed(2)}
                      </TableCell>
                      <TableCell align='right' className='font-mono text-xs text-[#9CA3AF]'>
                        —
                      </TableCell>
                    </TableRow>

                    <TableRow hover>
                      <TableCell>
                        <span className='font-mono font-bold text-xs text-[#1E1B2E]'>2.1.01.01</span>
                        <span className='text-xs text-[#6B7280] block'>Cuentas por Pagar Proveedores Nacionales (CxP)</span>
                      </TableCell>
                      <TableCell className='text-xs text-[#6B7280]'>
                        Pasivo comercial por servicios de flete, seguros o aduana
                      </TableCell>
                      <TableCell align='right' className='font-mono text-xs text-[#9CA3AF]'>
                        —
                      </TableCell>
                      <TableCell align='right' className='font-mono font-bold text-xs text-[#EF4444]'>
                        ${totalMontoUsd.toFixed(2)}
                      </TableCell>
                    </TableRow>

                    <TableRow sx={{ backgroundColor: '#FAF9FF', fontWeight: 700 }}>
                      <TableCell colSpan={2} className='text-xs font-bold text-[#1E1B2E]'>
                        TOTALES DE PARTIDA DOBLE (SUMAS IGUALES)
                      </TableCell>
                      <TableCell align='right' className='font-mono font-bold text-xs text-[#1E1B2E]'>
                        ${totalMontoUsd.toFixed(2)}
                      </TableCell>
                      <TableCell align='right' className='font-mono font-bold text-xs text-[#1E1B2E]'>
                        ${totalMontoUsd.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para vincular recepciones */}
      <Dialog
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] flex items-center justify-between'>
          <span>Vincular Recepciones de Almacén Realizadas</span>
          <IconButton size='small' onClick={() => setReceiptModalOpen(false)}>
            <i className='tabler-x text-lg' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <span className='text-xs text-[#6B7280] block mb-3'>
            Selecciona las recepciones de compra completadas sobre las cuales deseas distribuir los costos adicionales.
          </span>

          <div className='mb-3'>
            <CustomTextField
              fullWidth
              size='small'
              placeholder='Buscar por código (ej. IN/2026/0084), proveedor o documento...'
              value={receiptSearch}
              onChange={e => setReceiptSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search text-[#6B7280]' />
                    </InputAdornment>
                  ),
                  endAdornment: receiptSearch ? (
                    <InputAdornment position='end'>
                      <IconButton size='small' onClick={() => setReceiptSearch('')}>
                        <i className='tabler-x text-sm' />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          <div className='overflow-x-auto rounded-xl border border-[#E6E4F0] max-h-[350px]'>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F8F7FC' }}>
                <TableRow>
                  <TableCell padding='checkbox'>
                    <Checkbox
                      checked={
                        filteredAvailableReceipts.length > 0 &&
                        filteredAvailableReceipts.every(r => selectedReceiptIds.includes(r.id))
                      }
                      indeterminate={
                        filteredAvailableReceipts.some(r => selectedReceiptIds.includes(r.id)) &&
                        !filteredAvailableReceipts.every(r => selectedReceiptIds.includes(r.id))
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          const toAdd = filteredAvailableReceipts.map(r => r.id)

                          setSelectedReceiptIds(prev => Array.from(new Set([...prev, ...toAdd])))
                        } else {
                          const toRemove = new Set(filteredAvailableReceipts.map(r => r.id))

                          setSelectedReceiptIds(prev => prev.filter(id => !toRemove.has(id)))
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    CÓDIGO
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    PROVEEDOR
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    FECHA
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    TOTAL ARTÍCULOS
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAvailableReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center py-8 text-[#6B7280]'>
                      {receiptSearch.trim()
                        ? `No se encontraron recepciones que coincidan con "${receiptSearch}".`
                        : 'No hay recepciones completadas disponibles en almacén.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAvailableReceipts.map(order => {
                    const isSelected = selectedReceiptIds.includes(order.id)

                    
return (
                      <TableRow
                        key={order.id}
                        hover
                        selected={isSelected}
                        onClick={() => {
                          setSelectedReceiptIds(prev =>
                            isSelected ? prev.filter(id => id !== order.id) : [...prev, order.id]
                          )
                        }}
                        className='cursor-pointer'
                      >
                        <TableCell padding='checkbox'>
                          <Checkbox checked={isSelected} />
                        </TableCell>
                        <TableCell className='font-mono font-bold text-xs text-[#6C5CE7]'>
                          {order.codigo}
                        </TableCell>
                        <TableCell className='text-xs font-medium text-[#1E1B2E]'>
                          {order.tercero_nombre}
                        </TableCell>
                        <TableCell className='text-xs text-[#6B7280] font-mono'>
                          {order.fecha_programada.slice(0, 10)}
                        </TableCell>
                        <TableCell align='right' className='font-mono font-semibold text-xs'>
                          {order.total_articulos} un
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
        <DialogActions className='p-3 gap-2'>
          <Button
            variant='outlined'
            onClick={() => setReceiptModalOpen(false)}
            sx={{ borderRadius: '9999px', textTransform: 'none', px: 3 }}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleConfirmReceipts}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3.5,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
          >
            Vincular {selectedReceiptIds.length} Recepciones
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para importar desde Factura de Proveedor */}
      <Dialog
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        maxWidth='md'
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <i className='tabler-file-invoice text-[#6C5CE7] text-xl' />
            <span>Importar Factura de Proveedor</span>
          </div>
          <IconButton size='small' onClick={() => setInvoiceModalOpen(false)}>
            <i className='tabler-x text-lg' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <span className='text-xs text-[#6B7280] block mb-3'>
            Selecciona la factura de compras/gastos (flete, aduana, naviera) para importar sus líneas y montos directamente como costos en destino.
          </span>

          <div className='mb-3'>
            <CustomTextField
              fullWidth
              size='small'
              placeholder='Buscar por número de factura (ej. FACT-...), proveedor o RIF...'
              value={invoiceSearch}
              onChange={e => setInvoiceSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search text-[#6B7280]' />
                    </InputAdornment>
                  ),
                  endAdornment: invoiceSearch ? (
                    <InputAdornment position='end'>
                      <IconButton size='small' onClick={() => setInvoiceSearch('')}>
                        <i className='tabler-x text-sm' />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          <div className='overflow-x-auto rounded-xl border border-[#E6E4F0] max-h-[350px]'>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F8F7FC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    N° FACTURA
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    PROVEEDOR / RIF
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    FECHA EMISIÓN
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    TOTAL (USD)
                  </TableCell>
                  <TableCell align='center' sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.75rem' }}>
                    ACCIÓN
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSupplierInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center py-8 text-[#6B7280]'>
                      {invoiceSearch.trim()
                        ? `No se encontraron facturas que coincidan con "${invoiceSearch}".`
                        : 'No hay facturas de proveedores registradas en contabilidad.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSupplierInvoices.map(inv => (
                    <TableRow key={inv.id} hover className='cursor-pointer' onClick={() => handleSelectInvoiceToImport(inv)}>
                      <TableCell className='font-mono font-bold text-xs text-[#6C5CE7]'>
                        {inv.numeroFactura}
                      </TableCell>
                      <TableCell className='text-xs'>
                        <span className='font-medium text-[#1E1B2E] block'>{inv.contactoNombre}</span>
                        <span className='text-[11px] text-[#6B7280] font-mono'>{inv.contactoRif}</span>
                      </TableCell>
                      <TableCell className='text-xs text-[#6B7280] font-mono'>
                        {inv.fechaEmision}
                      </TableCell>
                      <TableCell align='right' className='font-mono font-bold text-xs text-[#1E1B2E]'>
                        ${inv.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align='center' onClick={e => e.stopPropagation()}>
                        <Button
                          size='small'
                          variant='contained'
                          onClick={() => handleSelectInvoiceToImport(inv)}
                          sx={{
                            borderRadius: '9999px',
                            backgroundColor: '#6C5CE7',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 2,
                            '&:hover': { backgroundColor: '#5B4CDB' }
                          }}
                        >
                          Importar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
        <DialogActions className='p-3'>
          <Button
            variant='outlined'
            onClick={() => setInvoiceModalOpen(false)}
            sx={{ borderRadius: '9999px', textTransform: 'none', px: 3 }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmación de Validación */}
      <Dialog
        open={validateModalOpen}
        onClose={() => setValidateModalOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] flex items-center gap-2'>
          <i className='tabler-alert-circle text-xl text-[#6C5CE7]' />
          ¿Validar y Aplicar Costo en Destino?
        </DialogTitle>
        <DialogContent>
          <div className='flex flex-col gap-2 text-sm text-[#6B7280]'>
            <span>
              Esta acción es <strong>definitiva e inmutable</strong> según la normativa contable VEN-NIF (NIC 2):
            </span>
            <ul className='list-disc pl-5 text-xs text-[#4B5563] space-y-1 mt-1'>
              <li>
                Se recalculará el <strong>Costo Promedio Ponderado Móvil (AVCO)</strong> de cada variante recibida.
              </li>
              <li>
                Se generará un movimiento de Kárdex <code>LANDED_COST</code> por variante.
              </li>
              <li>
                Se creará el <strong>Asiento Contable</strong> afectando la cuenta de Inventario y Cuentas por Pagar Proveedores.
              </li>
            </ul>
          </div>
        </DialogContent>
        <DialogActions className='p-3 gap-2'>
          <Button
            variant='outlined'
            onClick={() => setValidateModalOpen(false)}
            disabled={validating}
            sx={{ borderRadius: '9999px', textTransform: 'none', px: 3 }}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleValidate}
            disabled={validating}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 3.5,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
          >
            {validating ? 'Validando...' : 'Confirmar y Aplicar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: '12px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}
