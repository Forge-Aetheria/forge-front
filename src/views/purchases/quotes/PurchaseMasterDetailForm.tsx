'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import CustomTextField from '@core/components/mui/TextField'

import {
  BcvRate,
  CurrencyCode,
  PaymentConditionType,
  PurchaseProductLookup,
  PurchaseQuote,
  PurchasesFeatureFlags,
  SupplierLookup
} from '@/types/purchasesTypes'
import { purchasesService } from '@/services/purchasesService'
import {
  createPurchaseQuoteFormSchema,
  venezuelanRifRegex
} from './schemas/purchaseFormSchema'
import { SupplierAutocomplete } from './components/SupplierAutocomplete'
import { BcvRateBadge } from './components/BcvRateBadge'
import { PurchaseTotalsCard } from './components/PurchaseTotalsCard'
import { FormPurchaseItemLine, PurchaseItemRow } from './components/PurchaseItemRow'

interface Props {
  initialQuote?: PurchaseQuote
  mode?: 'create' | 'edit'
}

export const PurchaseMasterDetailForm: React.FC<Props> = ({ initialQuote, mode = 'create' }) => {
  const router = useRouter()

  const defaultValidityDate = useMemo(
    () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    []
  )
  const defaultDeliveryDate = useMemo(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    []
  )

  // Configuración y Tasa BCV
  const [bcvRate, setBcvRate] = useState<BcvRate | null>(null)
  const [flags] = useState<PurchasesFeatureFlags>(purchasesService.getFeatureFlags())
  const [products, setProducts] = useState<PurchaseProductLookup[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Estados de Cabecera Maestro (HU1)
  const [supplier, setSupplier] = useState<SupplierLookup | null>(initialQuote?.proveedor || null)
  const [referenciaProveedor, setReferenciaProveedor] = useState<string>(
    initialQuote?.referencia_proveedor || ''
  )
  const [condicionPago, setCondicionPago] = useState<PaymentConditionType>(
    initialQuote?.condicion_pago || 'CREDITO'
  )
  const [diasCredito, setDiasCredito] = useState<number>(initialQuote?.dias_credito ?? 30)
  const [monedaBase, setMonedaBase] = useState<CurrencyCode>(initialQuote?.moneda_base || 'USD')
  const [fechaVencimientoCotizacion, setFechaVencimientoCotizacion] = useState<string>(
    initialQuote?.fecha_vencimiento_cotizacion || defaultValidityDate
  )
  const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState<string>(
    initialQuote?.fecha_estimada_entrega || defaultDeliveryDate
  )
  const [aplicaIvaCompras, setAplicaIvaCompras] = useState<boolean>(
    initialQuote ? initialQuote.aplica_iva_compras : true
  )
  const [aplicaIgtf, setAplicaIgtf] = useState<boolean>(Boolean(initialQuote?.aplica_igtf))
  const [observaciones, setObservaciones] = useState<string>(initialQuote?.observaciones || '')
  const [terminosNegociacion, setTerminosNegociacion] = useState<string>(
    initialQuote?.terminos_negociacion ||
      'Entrega en almacén central acompañada de nota de entrega y factura fiscal SENIAT.'
  )

  // Líneas de Compra (Detalle)
  const [items, setItems] = useState<FormPurchaseItemLine[]>(() => {
    if (initialQuote?.items && initialQuote.items.length > 0) {
      return initialQuote.items.map(it => ({
        id: it.id,
        producto_id: it.producto_id,
        producto_sku: it.producto_sku,
        producto_nombre: it.producto_nombre,
        uom_code: it.uom_code,
        is_physical_stock: it.is_physical_stock,
        cantidad: it.cantidad,
        costo_unitario: it.costo_unitario,
        descuento_proveedor_porcentaje: it.descuento_proveedor_porcentaje,
        alicuota_iva: it.alicuota_iva || '16'
      }))
    }
    return []
  })

  // Errores inline y Estado de Envío
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<'draft' | 'register' | null>(null)
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'warning' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Carga inicial
  useEffect(() => {
    const init = async () => {
      try {
        const [rate, prods] = await Promise.all([
          purchasesService.getActiveBcvRate(),
          purchasesService.getPurchaseProducts()
        ])
        setBcvRate(rate)
        setProducts(prods)

        if (mode === 'create' && items.length === 0 && prods.length > 0) {
          const first = prods[0]
          setItems([
            {
              id: `pline-${Date.now()}`,
              producto_id: first.id,
              producto_sku: first.sku,
              producto_nombre: first.nombre,
              uom_code: first.uom_code,
              is_physical_stock: first.is_physical_stock,
              cantidad: 1,
              costo_unitario: first.costo_unitario_ult_compra_usd,
              descuento_proveedor_porcentaje: 0,
              alicuota_iva: first.alicuota_iva || '16'
            }
          ])
        }
      } catch (err: any) {
        setToast({
          open: true,
          message: err?.message || 'Error al cargar catálogo de compras.',
          severity: 'error'
        })
      } finally {
        setLoadingInitial(false)
      }
    }
    init()
  }, [mode])

  // Herencia automática de reglas comerciales del proveedor al seleccionarlo (EARS-EV-02)
  const handleSelectSupplier = (selected: SupplierLookup | null) => {
    setSupplier(selected)
    setInlineError(null)
    if (selected) {
      setCondicionPago(selected.condicion_pago_default)
      setDiasCredito(
        selected.condicion_pago_default === 'CONTADO' ? 0 : selected.dias_credito_default
      )
      setMonedaBase(selected.moneda_negociacion_default || 'USD')
    }
  }

  // Recálculo reactivo de Totales Bimonetarios (EARS-EV-04)
  const totals = useMemo(() => {
    const tasa = bcvRate?.tasa || 36.5
    return purchasesService.calculateTotals(
      items,
      tasa,
      flags,
      aplicaIvaCompras,
      aplicaIgtf,
      supplier?.retencion_iva_porcentaje ?? 75
    )
  }, [items, bcvRate, flags, aplicaIvaCompras, aplicaIgtf, supplier])

  // Manejadores de Líneas
  const handleAddItem = () => {
    if (products.length === 0) return
    const prod = products[0]
    setInlineError(null)
    setItems(prev => [
      ...prev,
      {
        id: `pline-${Date.now()}-${prev.length}`,
        producto_id: prod.id,
        producto_sku: prod.sku,
        producto_nombre: prod.nombre,
        uom_code: prod.uom_code,
        is_physical_stock: prod.is_physical_stock,
        cantidad: 1,
        costo_unitario: prod.costo_unitario_ult_compra_usd,
        descuento_proveedor_porcentaje: 0,
        alicuota_iva: prod.alicuota_iva || '16'
      }
    ])
  }

  const handleUpdateItem = (index: number, updated: FormPurchaseItemLine) => {
    setInlineError(null)
    setItems(prev => {
      const copy = [...prev]
      copy[index] = updated
      return copy
    })
  }

  const handleRemoveItem = (index: number) => {
    setInlineError(null)
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Validación y Envío (HU1 - EARS-EV-05 / EARS-EV-06 / EARS-EX-01 / EARS-EX-02)
  const handleSubmit = async (registrarInmediatamente: boolean) => {
    setInlineError(null)

    if (!supplier) {
      const msg = 'Debe seleccionar un proveedor antes de guardar o registrar la cotización.'
      setInlineError(msg)
      setToast({ open: true, message: msg, severity: 'warning' })
      return
    }

    if (flags.SENIAT_FORMAT) {
      if (!venezuelanRifRegex.test(supplier.identificacion) || !supplier.rol_proveedor_activo) {
        const msg = 'El proveedor seleccionado no posee un RIF válido o no está activo para compras.'
        setInlineError(msg)
        setToast({ open: true, message: msg, severity: 'error' })
        return
      }
    }

    if (items.length === 0) {
      const msg = 'El arreglo de ítems no puede estar vacío. Agregue al menos una línea de compra.'
      setInlineError(msg)
      setToast({ open: true, message: msg, severity: 'error' })
      return
    }

    const invalidLine = items.find(
      it => !it.producto_id || Number(it.cantidad) <= 0 || Number(it.costo_unitario) <= 0
    )
    if (invalidLine) {
      const msg = `Error de validación inline: La línea "${
        invalidLine.producto_nombre || 'Sin producto'
      }" tiene cantidad o costo unitario menor o igual a cero (<= 0).`
      setInlineError(msg)
      setToast({ open: true, message: msg, severity: 'error' })
      return
    }

    const validation = createPurchaseQuoteFormSchema.safeParse({
      proveedor_id: supplier.id,
      identificacion_proveedor: supplier.identificacion,
      referencia_proveedor: referenciaProveedor,
      condicion_pago: condicionPago,
      dias_credito: condicionPago === 'CONTADO' ? 0 : diasCredito,
      moneda_base: monedaBase,
      fecha_vencimiento_cotizacion: fechaVencimientoCotizacion,
      fecha_estimada_entrega: fechaEstimadaEntrega,
      aplica_iva_compras: aplicaIvaCompras,
      aplica_igtf: aplicaIgtf,
      observaciones,
      terminos_negociacion: terminosNegociacion,
      items
    })

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Verifique los campos obligatorios del formulario.'
      setInlineError(firstIssue)
      setToast({ open: true, message: firstIssue, severity: 'error' })
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitAction(registrarInmediatamente ? 'register' : 'draft')

      const payload = {
        proveedor_id: supplier.id,
        referencia_proveedor: referenciaProveedor,
        condicion_pago: condicionPago,
        dias_credito: condicionPago === 'CONTADO' ? 0 : diasCredito,
        moneda_base: monedaBase,
        fecha_vencimiento_cotizacion: fechaVencimientoCotizacion,
        fecha_estimada_entrega: fechaEstimadaEntrega,
        aplica_iva_compras: aplicaIvaCompras,
        aplica_igtf: aplicaIgtf,
        observaciones,
        terminos_negociacion: terminosNegociacion,
        registrar_cotizacion_inmediatamente: registrarInmediatamente,
        items: items.map(it => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          costo_unitario: it.costo_unitario,
          descuento_proveedor_porcentaje: it.descuento_proveedor_porcentaje,
          alicuota_iva: it.alicuota_iva
        }))
      }

      let saved: PurchaseQuote
      if (mode === 'edit' && initialQuote) {
        saved = await purchasesService.updatePurchaseQuote(initialQuote.id, payload)
      } else {
        saved = await purchasesService.createPurchaseQuote(payload)
      }

      setToast({
        open: true,
        message: registrarInmediatamente
          ? `Cotización de proveedor ${saved.correlativo} registrada exitosamente.`
          : 'Solicitud de compra guardada en borrador.',
        severity: 'success'
      })

      setTimeout(() => {
        router.push(`/purchases/quotes/${saved.id}`)
      }, 650)
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar la solicitud de compra.'
      setInlineError(msg)
      setToast({ open: true, message: msg, severity: 'error' })
      setIsSubmitting(false)
      setSubmitAction(null)
    }
  }

  if (loadingInitial) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] gap-3'>
        <CircularProgress sx={{ color: '#6C5CE7' }} size={40} />
        <span className='text-sm text-[#6B7280]'>Inicializando formulario de abastecimiento...</span>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-5 p-1'>
      {/* Header de Navegación y Acciones */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Button
            component={Link}
            href='/purchases/quotes'
            variant='outlined'
            sx={{
              borderRadius: '9999px',
              borderColor: '#DCD8EC',
              color: '#1E1B2E',
              minWidth: '40px',
              width: '40px',
              height: '40px',
              p: 0
            }}
          >
            <i className='tabler-arrow-left text-lg' />
          </Button>
          <div>
            <div className='flex flex-wrap items-center gap-2.5'>
              <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
                {mode === 'edit'
                  ? `Editar Solicitud ${initialQuote?.correlativo}`
                  : 'Nueva Solicitud / Cotización de Compra'}
              </Typography>
              {bcvRate && <BcvRateBadge rate={bcvRate} />}
            </div>
            <Typography variant='body2' className='text-[#6B7280] mt-0.5'>
              Registre los costos ofertados por el proveedor, verifique condiciones de crédito y calcule el equivalente BCV
            </Typography>
          </div>
        </div>

        {/* Botones de Acción con Prevención de Doble Envío (EARS-UB-05) */}
        <div className='flex flex-wrap items-center gap-2.5'>
          <Button
            variant='outlined'
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            sx={{
              borderRadius: '9999px',
              borderColor: '#6C5CE7',
              color: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1
            }}
            startIcon={
              isSubmitting && submitAction === 'draft' ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-device-floppy text-base' />
              )
            }
          >
            {isSubmitting && submitAction === 'draft' ? 'Guardando...' : 'Guardar Borrador'}
          </Button>

          <Button
            variant='contained'
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1,
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
              '&:hover': {
                backgroundColor: '#5B4CDB'
              }
            }}
            startIcon={
              isSubmitting && submitAction === 'register' ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-file-check text-base' />
              )
            }
          >
            {isSubmitting && submitAction === 'register'
              ? 'Registrando...'
              : 'Registrar Cotización (SC-2026)'}
          </Button>
        </div>
      </div>

      {/* Banner de Error Inline si existe */}
      {inlineError && (
        <Alert
          severity='error'
          onClose={() => setInlineError(null)}
          sx={{
            borderRadius: '16px',
            border: '1px solid #FCA5A5',
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            fontWeight: 500
          }}
        >
          {inlineError}
        </Alert>
      )}

      {/* Cuerpo Maestro-Detalle */}
      <Grid container spacing={4}>
        {/* Columna Izquierda: Cabecera + Líneas de Compra */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <div className='flex flex-col gap-4'>
            {/* Cabecera del Proveedor y Condiciones Comerciales */}
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <CardContent className='p-5 flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                    <i className='tabler-building-store text-[#6C5CE7]' />
                    Datos del Proveedor y Condiciones de Negociación
                  </Typography>
                  {supplier && (
                    <span className='text-xs px-3 py-1 rounded-full bg-[#E8F5E9] text-[#10B981] font-semibold'>
                      Proveedor Activo · {supplier.identificacion}
                    </span>
                  )}
                </div>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <SupplierAutocomplete
                      value={supplier}
                      onChange={handleSelectSupplier}
                      disabled={isSubmitting}
                      error={!supplier && Boolean(inlineError)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <CustomTextField
                      fullWidth
                      label='N° Ref. / Proforma del Proveedor'
                      placeholder='Ej: PROF-2026-881'
                      value={referenciaProveedor}
                      onChange={e => setReferenciaProveedor(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField
                      select
                      fullWidth
                      label='Condición de Pago (Heredada)'
                      value={condicionPago}
                      onChange={e => {
                        const next = e.target.value as PaymentConditionType
                        setCondicionPago(next)
                        if (next === 'CONTADO') setDiasCredito(0)
                        else if (diasCredito === 0) setDiasCredito(supplier?.dias_credito_default || 15)
                      }}
                      disabled={isSubmitting}
                    >
                      <MenuItem value='CONTADO'>Contado (Pago Inmediato)</MenuItem>
                      <MenuItem value='CREDITO'>Crédito Comercial</MenuItem>
                    </CustomTextField>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <CustomTextField
                      type='number'
                      fullWidth
                      label='Días de Crédito'
                      value={condicionPago === 'CONTADO' ? 0 : diasCredito}
                      onChange={e => setDiasCredito(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      disabled={isSubmitting || condicionPago === 'CONTADO'}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 4 }}>
                    <CustomTextField
                      select
                      fullWidth
                      label='Moneda Base de Negociación'
                      value={monedaBase}
                      onChange={e => setMonedaBase(e.target.value as CurrencyCode)}
                      disabled={isSubmitting}
                    >
                      <MenuItem value='USD'>USD ($) — Dólar Base</MenuItem>
                      <MenuItem value='VES'>VES (Bs.) — Bolívar</MenuItem>
                    </CustomTextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      type='date'
                      fullWidth
                      label='Fecha Vigencia de Cotización del Proveedor *'
                      value={fechaVencimientoCotizacion}
                      onChange={e => setFechaVencimientoCotizacion(e.target.value)}
                      disabled={isSubmitting}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      type='date'
                      fullWidth
                      label='Fecha Estimada de Entrega en Almacén *'
                      value={fechaEstimadaEntrega}
                      onChange={e => setFechaEstimadaEntrega(e.target.value)}
                      disabled={isSubmitting}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

                {/* Resumen de datos del proveedor */}
                {supplier && (
                  <div className='bg-[#F8F7FC] p-3 rounded-xl border border-[#E6E4F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]'>
                    <div className='flex items-center gap-1.5'>
                      <i className='tabler-map-pin text-xs text-[#6C5CE7]' />
                      <span>{supplier.direccion_fiscal}</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      {supplier.telefono && (
                        <div className='flex items-center gap-1'>
                          <i className='tabler-phone text-xs text-[#6B7280]' />
                          <span>{supplier.telefono}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className='flex items-center gap-1'>
                          <i className='tabler-mail text-xs text-[#6B7280]' />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabla Repeater de Líneas de Compra */}
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <CardContent className='p-5 flex flex-col gap-3'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                      Líneas de Productos, Insumos o Servicios ({items.length})
                    </Typography>
                    <Typography variant='caption' className='text-[#6B7280]'>
                      Los ítems físicos generarán expectativa de recepción en almacén (stock en tránsito) al emitir la OC
                    </Typography>
                  </div>

                  <Button
                    variant='outlined'
                    size='small'
                    disabled={isSubmitting}
                    onClick={handleAddItem}
                    sx={{
                      borderRadius: '9999px',
                      borderColor: '#6C5CE7',
                      color: '#6C5CE7',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                    startIcon={<i className='tabler-plus text-sm' />}
                  >
                    Agregar Ítem
                  </Button>
                </div>

                <TableContainer
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #E6E4F0',
                    overflowX: 'auto'
                  }}
                >
                  <Table size='small' sx={{ minWidth: 720 }}>
                    <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                      <TableRow>
                        <TableCell sx={{ width: 28, px: 0.5, textAlign: 'center', fontWeight: 600 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Producto / Servicio</TableCell>
                        <TableCell sx={{ width: 95, fontWeight: 600 }}>Cant.</TableCell>
                        <TableCell sx={{ width: 115, fontWeight: 600 }}>Costo Unit. ($)</TableCell>
                        <TableCell sx={{ width: 85, fontWeight: 600 }}>% Desc.</TableCell>
                        <TableCell align='center' sx={{ width: 58, fontWeight: 600 }}>
                          IVA
                        </TableCell>
                        <TableCell align='right' sx={{ width: 125, fontWeight: 600 }}>
                          Subtotal Neto
                        </TableCell>
                        <TableCell align='center' sx={{ width: 44 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align='center' sx={{ py: 5 }}>
                            <div className='flex flex-col items-center gap-2 text-[#6B7280]'>
                              <i className='tabler-shopping-cart-plus text-2xl text-[#6C5CE7]' />
                              <span className='text-sm font-medium'>
                                No hay ítems en la solicitud. Haga clic en &quot;Agregar Ítem&quot;.
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((line, index) => (
                          <PurchaseItemRow
                            key={line.id}
                            index={index}
                            line={line}
                            products={products}
                            tasaBcv={bcvRate?.tasa || 36.5}
                            aplicaIvaCompras={aplicaIvaCompras}
                            onUpdate={updated => handleUpdateItem(index, updated)}
                            onRemove={() => handleRemoveItem(index)}
                            disabled={isSubmitting}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Observaciones y Términos de Negociación */}
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <CardContent className='p-5'>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      multiline
                      rows={3}
                      fullWidth
                      label='Observaciones Internas de Abastecimiento'
                      placeholder='Notas sobre justificación de compra, centro de costo o urgencia...'
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <CustomTextField
                      multiline
                      rows={3}
                      fullWidth
                      label='Condiciones de Entrega y Recepción'
                      placeholder='Términos acordados con el proveedor para despacho y garantía...'
                      value={terminosNegociacion}
                      onChange={e => setTerminosNegociacion(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </div>
        </Grid>

        {/* Columna Derecha: Pie de Totales Bimonetarios y Crédito Fiscal */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <div className='sticky top-20 flex flex-col gap-4'>
            <PurchaseTotalsCard
              totals={totals}
              tasaBcv={bcvRate?.tasa || 36.5}
              flags={flags}
              supplier={supplier}
              aplicaIvaCompras={aplicaIvaCompras}
              onToggleAplicaIvaCompras={setAplicaIvaCompras}
              aplicaIgtf={aplicaIgtf}
              onToggleAplicaIgtf={setAplicaIgtf}
              disabled={isSubmitting}
            />
          </div>
        </Grid>
      </Grid>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: '16px', fontWeight: 500 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}
