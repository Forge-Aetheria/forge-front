'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { BcvRate, PurchaseQuote, PurchasesFeatureFlags } from '@/types/purchasesTypes'
import { purchasesService } from '@/services/purchasesService'
import { PurchaseStatusChip } from './components/PurchaseStatusChip'
import { BcvRateBadge } from './components/BcvRateBadge'
import { PurchaseTotalsCard } from './components/PurchaseTotalsCard'
import { CancelPurchaseModal } from './components/CancelPurchaseModal'

interface Props {
  id: string
}

export const PurchaseDetailView: React.FC<Props> = ({ id }) => {
  const router = useRouter()

  const [quote, setQuote] = useState<PurchaseQuote | null>(null)
  const [allQuotes, setAllQuotes] = useState<PurchaseQuote[]>([])
  const [activeBcvRate, setActiveBcvRate] = useState<BcvRate | null>(null)
  const [flags] = useState<PurchasesFeatureFlags>(purchasesService.getFeatureFlags())
  const [loading, setLoading] = useState(true)

  // Estados de Operación Asíncrona (Prevención de Doble Envío - EARS-UB-05)
  const [isApproving, setIsApproving] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  // Toast Feedback
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'warning' | 'error' | 'info'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [currentQuote, quotesList, bcv] = await Promise.all([
        purchasesService.getPurchaseQuoteById(id),
        purchasesService.getPurchaseQuotes(),
        purchasesService.getActiveBcvRate()
      ])

      if (currentQuote) {
        setQuote(currentQuote)
      }
      setAllQuotes(quotesList)
      setActiveBcvRate(bcv)
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al cargar el detalle de la solicitud de compra.',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Navegación Secuencial [ ◄ ] X / N [ ► ] (EARS-EV-12)
  const safeIndex = allQuotes.findIndex(q => q.id.toLowerCase() === id.toLowerCase())
  const currentIndex = safeIndex >= 0 ? safeIndex : 0
  const prevQuote = currentIndex > 0 ? allQuotes[currentIndex - 1] : null
  const nextQuote = currentIndex < allQuotes.length - 1 ? allQuotes[currentIndex + 1] : null
  const totalQuotes = allQuotes.length > 0 ? allQuotes.length : 1

  // Evaluación de Vigencia y Tasa BCV (HU3 - EARS-EX-03)
  const readiness = useMemo(() => {
    if (!quote) return null
    return purchasesService.evaluateApprovalReadiness(quote)
  }, [quote, activeBcvRate])

  const totalsCalculation = useMemo(() => {
    if (!quote) return null
    return purchasesService.calculateTotals(
      quote.items,
      quote.tasa_bcv.tasa,
      flags,
      quote.aplica_iva_compras,
      Boolean(quote.aplica_igtf),
      quote.proveedor.retencion_iva_porcentaje ?? 75
    )
  }, [quote, flags])

  // HU3: Recalcular con nueva tasa BCV (EARS-EV-09)
  const handleRecalculateBcv = async () => {
    if (!quote) return
    try {
      setIsRecalculating(true)
      const updated = await purchasesService.recalculatePurchaseQuoteBcv(quote.id)
      setQuote(updated)
      setToast({
        open: true,
        message: `Costos actualizados a la tasa BCV oficial (${updated.tasa_bcv.tasa.toFixed(2)} Bs/USD) y vigencia renovada. Ya puede aprobar la compra.`,
        severity: 'info'
      })
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al recalcular con nueva tasa BCV.',
        severity: 'error'
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  // HU3: Aprobar Presupuesto de Compra (EARS-EV-08)
  const handleApprovePurchase = async () => {
    if (!quote) return
    try {
      setIsApproving(true)
      const updated = await purchasesService.approvePurchaseQuote(quote.id)
      setQuote(updated)
      setToast({
        open: true,
        message: 'Presupuesto de compra aprobado exitosamente. Costos pactados congelados.',
        severity: 'success'
      })
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al aprobar la solicitud de compra.',
        severity: 'error'
      })
    } finally {
      setIsApproving(false)
    }
  }

  // HU4: Anular Solicitud/Orden de Compra (EARS-EV-10)
  const handleConfirmCancel = async (motivo: string) => {
    if (!quote) return
    const updated = await purchasesService.cancelPurchaseQuote(quote.id, motivo)
    setQuote(updated)
    setToast({
      open: true,
      message: `Documento ${updated.correlativo_orden_compra || updated.correlativo} anulado con registro de auditoría.`,
      severity: 'warning'
    })
  }

  // HU5: Convertir a Orden de Compra en Firme (EARS-EV-11 / EARS-ST-06)
  const handleConvertToPurchaseOrder = async () => {
    if (!quote) return
    try {
      setIsConverting(true)
      const res = await purchasesService.convertQuoteToPurchaseOrder(quote.id)
      const reloaded = await purchasesService.getPurchaseQuoteById(quote.id)
      if (reloaded) setQuote(reloaded)
      setToast({
        open: true,
        message: res.message,
        severity: 'success'
      })
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al generar la Orden de Compra.',
        severity: 'error'
      })
    } finally {
      setIsConverting(false)
    }
  }

  // Simular cambio de tasa BCV del día para probar HU3 en vivo si se desea
  const handleSimulateBcvVariation = async () => {
    if (!activeBcvRate) return
    const nextRate = Number((activeBcvRate.tasa + 0.75).toFixed(2))
    const updatedBcv = await purchasesService.updateActiveBcvRate(nextRate)
    setActiveBcvRate(updatedBcv)
    setToast({
      open: true,
      message: `Tasa oficial del día actualizada a ${updatedBcv.tasa.toFixed(2)} Bs/USD (Simulación CRON 7:00 AM).`,
      severity: 'info'
    })
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[450px] gap-3'>
        <CircularProgress sx={{ color: '#6C5CE7' }} size={42} />
        <span className='text-sm text-[#6B7280]'>Cargando ficha de compra...</span>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className='bg-[#FFFFFF] p-10 rounded-2xl border border-[#E6E4F0] text-center max-w-md mx-auto mt-12 shadow-sm'>
        <span className='inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEE2E2] text-[#EF4444] mb-3'>
          <i className='tabler-shopping-bag-x text-3xl' />
        </span>
        <Typography variant='h5' className='font-bold text-[#1E1B2E] mb-2'>
          Documento de compra no encontrado
        </Typography>
        <Typography variant='body2' className='text-[#6B7280] mb-5'>
          El registro solicitado no existe en el módulo de abastecimiento.
        </Typography>
        <Button
          component={Link}
          href='/purchases/quotes'
          variant='contained'
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Volver al Listado de Compras
        </Button>
      </div>
    )
  }

  const displayCorrelativo = quote.correlativo_orden_compra || quote.correlativo
  const physicalLinesCount = quote.items.filter(it => it.is_physical_stock).length
  const totalPhysicalUnits = quote.items
    .filter(it => it.is_physical_stock)
    .reduce((acc, it) => acc + it.cantidad, 0)

  return (
    <div className='flex flex-col gap-5 w-full pb-12 p-1'>
      {/* Barra Superior con Navegador Secuencial y Acciones Contextuales (HU3, HU4, HU5) */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        {/* Izquierda: Volver + Correlativo + Estado + Tasa BCV */}
        <div className='flex items-center gap-3 flex-wrap'>
          <Button
            component={Link}
            href='/purchases/quotes'
            variant='text'
            sx={{
              minWidth: 'auto',
              p: 1,
              borderRadius: '9999px',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E4F0',
              '&:hover': { backgroundColor: '#F4F3F8', color: '#6C5CE7' }
            }}
          >
            <i className='tabler-arrow-left text-lg' />
          </Button>

          <div>
            <div className='flex flex-wrap items-center gap-2.5'>
              <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
                {displayCorrelativo}
              </Typography>
              <PurchaseStatusChip status={quote.estado} size='medium' />
              {activeBcvRate && (
                <BcvRateBadge
                  rate={activeBcvRate}
                  onRefresh={handleSimulateBcvVariation}
                />
              )}
            </div>
            <Typography variant='body2' className='text-[#6B7280] mt-0.5'>
              {quote.correlativo_orden_compra
                ? `Orden de Compra en Firme generada desde la solicitud ${quote.correlativo}`
                : `Solicitud de Cotización / Presupuesto de Proveedor · Ref: ${
                    quote.referencia_proveedor || 'Sin referencia'
                  }`}
            </Typography>
          </div>
        </div>

        {/* Derecha: Navegador Secuencial [ ◄ ] X / N [ ► ] + Botones de Transición */}
        <div className='flex items-center gap-2 flex-wrap'>
          {/* Navegador Secuencial */}
          <div className='inline-flex items-center gap-1 bg-[#FFFFFF] border border-[#E6E4F0] rounded-full px-2 py-0.5'>
            <Tooltip title='Documento anterior' arrow>
              <span>
                <IconButton
                  size='small'
                  disabled={!prevQuote}
                  onClick={() => prevQuote && router.push(`/purchases/quotes/${prevQuote.id}`)}
                  sx={{ color: '#6B7280' }}
                >
                  <i className='tabler-chevron-left text-sm' />
                </IconButton>
              </span>
            </Tooltip>
            <span className='text-xs font-semibold text-[#1E1B2E] px-1.5'>
              {currentIndex + 1} / {totalQuotes}
            </span>
            <Tooltip title='Documento siguiente' arrow>
              <span>
                <IconButton
                  size='small'
                  disabled={!nextQuote}
                  onClick={() => nextQuote && router.push(`/purchases/quotes/${nextQuote.id}`)}
                  sx={{ color: '#6B7280' }}
                >
                  <i className='tabler-chevron-right text-sm' />
                </IconButton>
              </span>
            </Tooltip>
          </div>

          {/* Editar si está en DRAFT o RFQ_SENT */}
          {(quote.estado === 'DRAFT' || quote.estado === 'RFQ_SENT') && (
            <Button
              component={Link}
              href={`/purchases/quotes/${quote.id}/edit`}
              variant='outlined'
              sx={{
                borderRadius: '9999px',
                borderColor: '#DCD8EC',
                color: '#1E1B2E',
                textTransform: 'none',
                fontWeight: 600
              }}
              startIcon={<i className='tabler-edit text-base' />}
            >
              Editar Costos
            </Button>
          )}

          {/* HU3: Botón Recalcular con nueva tasa BCV cuando hay desfase de tasa o vigencia */}
          {(quote.estado === 'DRAFT' || quote.estado === 'RFQ_SENT') &&
            readiness &&
            !readiness.canApproveDirectly && (
              <Button
                variant='contained'
                disabled={isRecalculating}
                onClick={handleRecalculateBcv}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#D97706' }
                }}
                startIcon={
                  isRecalculating ? (
                    <CircularProgress size={16} color='inherit' />
                  ) : (
                    <i className='tabler-refresh text-base' />
                  )
                }
              >
                {isRecalculating ? 'Recalculando...' : 'Recalcular con nueva tasa BCV'}
              </Button>
            )}

          {/* HU3: Botón Aprobar Compra */}
          {(quote.estado === 'DRAFT' || quote.estado === 'RFQ_SENT') && (
            <Button
              variant='contained'
              disabled={isApproving || Boolean(readiness && !readiness.canApproveDirectly)}
              onClick={handleApprovePurchase}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                '&:hover': { backgroundColor: '#059669' }
              }}
              startIcon={
                isApproving ? (
                  <CircularProgress size={16} color='inherit' />
                ) : (
                  <i className='tabler-circle-check text-base' />
                )
              }
            >
              {isApproving ? 'Aprobando...' : 'Aprobar Compra'}
            </Button>
          )}

          {/* HU5: Botón Generar Orden de Compra (Estrictamente habilitado WHILE estado === 'APPROVED') */}
          <Tooltip
            title={
              quote.estado === 'APPROVED'
                ? 'Emitir Orden de Compra en firme (OC-2026-XXXX) y notificar stock en tránsito'
                : 'Solo habilitado cuando el presupuesto se encuentra en estado APROBADO'
            }
            arrow
          >
            <span>
              <Button
                variant='contained'
                disabled={quote.estado !== 'APPROVED' || isConverting}
                onClick={handleConvertToPurchaseOrder}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#6C5CE7',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                  boxShadow:
                    quote.estado === 'APPROVED' ? '0 4px 14px rgba(108, 92, 231, 0.35)' : 'none',
                  '&:hover': { backgroundColor: '#5B4CDB' }
                }}
                startIcon={
                  isConverting ? (
                    <CircularProgress size={16} color='inherit' />
                  ) : (
                    <i className='tabler-shopping-bag-check text-base' />
                  )
                }
              >
                {isConverting ? 'Generando OC...' : 'Generar Orden de Compra'}
              </Button>
            </span>
          </Tooltip>

          {/* HU4: Botón Anular */}
          {quote.estado !== 'CANCELED' && (
            <Button
              variant='outlined'
              onClick={() => setCancelModalOpen(true)}
              sx={{
                borderRadius: '9999px',
                borderColor: '#FCA5A5',
                color: '#EF4444',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#EF4444',
                  backgroundColor: '#FEF2F2'
                }
              }}
              startIcon={<i className='tabler-ban text-base' />}
            >
              Anular
            </Button>
          )}
        </div>
      </div>

      {/* HU3 Banner de Advertencia si la Tasa BCV o la Vigencia de Cotización cambió (EARS-EX-03) */}
      {(quote.estado === 'DRAFT' || quote.estado === 'RFQ_SENT') &&
        readiness &&
        !readiness.canApproveDirectly && (
          <div className='bg-[#FFFBEB] p-4 rounded-2xl border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-start gap-3'>
              <span className='w-9 h-9 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5'>
                <i className='tabler-alert-triangle text-lg' />
              </span>
              <div>
                <Typography variant='subtitle2' className='font-bold text-[#92400E]'>
                  La tasa BCV o vigencia ha cambiado, actualice los costos del presupuesto
                </Typography>
                <Typography variant='caption' className='text-[#B45309] block mt-0.5'>
                  {readiness.isRateChanged &&
                    `Tasa del documento: ${readiness.quoteRate.toFixed(2)} Bs/USD vs Tasa BCV hoy: ${readiness.activeRate.toFixed(2)} Bs/USD. `}
                  {readiness.isValidityExpired &&
                    `La vigencia de precios del proveedor venció el ${quote.fecha_vencimiento_cotizacion}. `}
                  Haga clic en &quot;Recalcular con nueva tasa BCV&quot; para actualizar los equivalentes en VES y desbloquear la aprobación.
                </Typography>
              </div>
            </div>

            <Button
              variant='contained'
              size='small'
              disabled={isRecalculating}
              onClick={handleRecalculateBcv}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: 'none'
              }}
              startIcon={<i className='tabler-refresh text-sm' />}
            >
              Recalcular con nueva tasa BCV
            </Button>
          </div>
        )}

      {/* HU5 Banner de Confirmación de Orden de Compra en Firme y Mercancía en Tránsito */}
      {quote.estado === 'PURCHASE_ORDER' && (
        <div className='bg-[#F0EEF9] p-4 rounded-2xl border border-[#DCD8EC] flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <span className='w-10 h-10 rounded-full bg-[#6C5CE7] text-white flex items-center justify-center shrink-0'>
              <i className='tabler-truck-delivery text-xl' />
            </span>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <Typography variant='subtitle1' className='font-bold text-[#1E1B2E]'>
                  Orden de Compra en Firme: {quote.correlativo_orden_compra}
                </Typography>
                <Chip
                  size='small'
                  label='Habilitada para Factura de Proveedor (CxP)'
                  sx={{
                    borderRadius: '9999px',
                    backgroundColor: '#E8F5E9',
                    color: '#10B981',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
                {physicalLinesCount > 0 ? (
                  <Chip
                    size='small'
                    label={`Stock en Tránsito Notificado (+${totalPhysicalUnits} un.)`}
                    sx={{
                      borderRadius: '9999px',
                      backgroundColor: '#FFFFFF',
                      color: '#6C5CE7',
                      border: '1px solid #DCD8EC',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  />
                ) : (
                  <Chip
                    size='small'
                    label='Servicios / Gastos (Sin Recepción Física de Almacén)'
                    sx={{
                      borderRadius: '9999px',
                      backgroundColor: '#E0F2FE',
                      color: '#0284C7',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  />
                )}
              </div>
              <Typography variant='caption' className='text-[#6B7280] block mt-1'>
                Emitida a partir del presupuesto aprobado <strong>{quote.correlativo}</strong>.{' '}
                {physicalLinesCount > 0
                  ? 'Las cantidades de ítems físicos han sido sumadas a stock_en_transito (incoming_stock) listas para futura Recepción de Mercancía.'
                  : 'Orden compuesta por servicios o ítems no inventariables; pasa directamente a disponibilidad para Cuentas por Pagar.'}
              </Typography>
            </div>
          </div>
        </div>
      )}

      {/* HU4 Banner de Auditoría cuando está Anulada */}
      {quote.estado === 'CANCELED' && (
        <div className='bg-[#FEF2F2] p-4 rounded-2xl border border-[#FCA5A5] flex items-start gap-3'>
          <span className='w-9 h-9 rounded-full bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0'>
            <i className='tabler-ban text-lg' />
          </span>
          <div>
            <Typography variant='subtitle2' className='font-bold text-[#991B1B]'>
              Documento Anulado (Soft Delete Auditable)
            </Typography>
            <Typography variant='body2' className='text-[#B91C1C] mt-0.5'>
              <strong>Motivo registrado:</strong> {quote.motivo_anulacion || 'Sin motivo especificado'}
            </Typography>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <Grid container spacing={4}>
        {/* Columna Izquierda: Ficha del Proveedor + Tabla de Líneas */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <div className='flex flex-col gap-4'>
            {/* Ficha del Proveedor y Condiciones Pactadas */}
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E6E4F0',
                boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
              }}
            >
              <CardContent className='p-5 flex flex-col gap-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <span className='text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider'>
                      Proveedor Adjudicado
                    </span>
                    <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                      {quote.proveedor.razon_social}
                    </Typography>
                    {quote.proveedor.nombre_comercial && (
                      <span className='text-xs text-[#6B7280]'>
                        Nombre Comercial: {quote.proveedor.nombre_comercial}
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-2'>
                    <Chip
                      label={`RIF: ${quote.proveedor.identificacion}`}
                      sx={{
                        borderRadius: '9999px',
                        fontWeight: 700,
                        backgroundColor: '#F0EEF9',
                        color: '#6C5CE7',
                        border: '1px solid #DCD8EC'
                      }}
                    />
                  </div>
                </div>

                <Grid container spacing={2} className='bg-[#F8F7FC] p-3.5 rounded-2xl border border-[#E6E4F0]'>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <span className='text-[11px] text-[#9CA3AF] block'>Ref. Cotización Prov.</span>
                    <span className='text-xs font-bold text-[#1E1B2E]'>
                      {quote.referencia_proveedor || 'N/A'}
                    </span>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <span className='text-[11px] text-[#9CA3AF] block'>Condición de Pago</span>
                    <span className='text-xs font-bold text-[#10B981]'>
                      {quote.condicion_pago === 'CREDITO'
                        ? `Crédito ${quote.dias_credito} días`
                        : 'Contado'}
                    </span>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <span className='text-[11px] text-[#9CA3AF] block'>Vigencia Costos</span>
                    <span className='text-xs font-bold text-[#1E1B2E]'>
                      {quote.fecha_vencimiento_cotizacion}
                    </span>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <span className='text-[11px] text-[#9CA3AF] block'>Entrega Estimada</span>
                    <span className='text-xs font-bold text-[#6C5CE7]'>
                      {quote.fecha_estimada_entrega}
                    </span>
                  </Grid>
                </Grid>

                <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]'>
                  <span className='flex items-center gap-1.5'>
                    <i className='tabler-map-pin text-xs text-[#6C5CE7]' />
                    {quote.proveedor.direccion_fiscal}
                  </span>
                  <span className='flex items-center gap-3'>
                    <span className='flex items-center gap-1'>
                      <i className='tabler-phone text-xs text-[#6B7280]' />
                      {quote.proveedor.telefono}
                    </span>
                    <span className='flex items-center gap-1'>
                      <i className='tabler-mail text-xs text-[#6B7280]' />
                      {quote.proveedor.email}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Líneas de Compra */}
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
                  <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                    Detalle de Líneas de Compra ({quote.items.length})
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Tasa aplicada al documento: <strong>{quote.tasa_bcv.tasa.toFixed(2)} Bs/USD</strong>
                  </span>
                </div>

                <TableContainer
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid #E6E4F0'
                  }}
                >
                  <Table size='small'>
                    <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                      <TableRow>
                        <TableCell sx={{ width: 32, textAlign: 'center', fontWeight: 600 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Producto / Servicio</TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600 }}>
                          Cant.
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 600 }}>
                          Costo Unit. (USD)
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600 }}>
                          Desc.
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600 }}>
                          IVA
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 600 }}>
                          Subtotal Neto (USD / VES)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quote.items.map((line, index) => {
                        const netVes = line.subtotal_neto * quote.tasa_bcv.tasa
                        return (
                          <TableRow key={line.id || index}>
                            <TableCell sx={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.78rem' }}>
                              {index + 1}
                            </TableCell>
                            <TableCell sx={{ py: 1.2 }}>
                              <div className='flex flex-col gap-0.5'>
                                <span className='font-semibold text-sm text-[#1E1B2E]'>
                                  {line.producto_nombre}
                                </span>
                                <span className='text-xs text-[#6B7280]'>SKU: {line.producto_sku}</span>
                              </div>
                            </TableCell>
                            <TableCell align='center' sx={{ fontWeight: 600, color: '#1E1B2E' }}>
                              {line.cantidad} {line.uom_code}
                            </TableCell>
                            <TableCell align='right' sx={{ color: '#1E1B2E' }}>
                              ${line.costo_unitario.toFixed(2)}
                            </TableCell>
                            <TableCell align='center' sx={{ color: '#10B981', fontWeight: 600 }}>
                              {line.descuento_proveedor_porcentaje > 0
                                ? `-${line.descuento_proveedor_porcentaje}%`
                                : '0%'}
                            </TableCell>
                            <TableCell align='center'>
                              <span className='inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-bold bg-[#F0EEF9] text-[#6C5CE7] border border-[#DCD8EC] whitespace-nowrap leading-none'>
                                {!quote.aplica_iva_compras ||
                                line.alicuota_iva === 'EXEMPT' ||
                                line.alicuota_iva === '0'
                                  ? '0%'
                                  : `${line.alicuota_iva}%`}
                              </span>
                            </TableCell>
                            <TableCell align='right'>
                              <div className='flex flex-col items-end'>
                                <span className='font-bold text-sm text-[#1E1B2E]'>
                                  ${line.subtotal_neto.toFixed(2)}
                                </span>
                                <span className='text-[11px] text-[#10B981]'>
                                  Bs. {netVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Observaciones y Términos */}
            {(quote.observaciones || quote.terminos_negociacion) && (
              <Card
                sx={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E6E4F0'
                }}
              >
                <CardContent className='p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs'>
                  <div>
                    <span className='font-bold text-[#1E1B2E] block mb-1'>Observaciones Internas</span>
                    <p className='text-[#6B7280]'>{quote.observaciones || 'Sin observaciones.'}</p>
                  </div>
                  <div>
                    <span className='font-bold text-[#1E1B2E] block mb-1'>Condiciones de Entrega Pactadas</span>
                    <p className='text-[#6B7280]'>{quote.terminos_negociacion || 'Condiciones estándar.'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </Grid>

        {/* Columna Derecha: Resumen Bimonetario y Crédito Fiscal */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {totalsCalculation && (
            <PurchaseTotalsCard
              totals={totalsCalculation}
              tasaBcv={quote.tasa_bcv.tasa}
              flags={flags}
              supplier={quote.proveedor}
              aplicaIvaCompras={quote.aplica_iva_compras}
              aplicaIgtf={Boolean(quote.aplica_igtf)}
              disabled
            />
          )}
        </Grid>
      </Grid>

      {/* Modal de Anulación (HU4) */}
      <CancelPurchaseModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        correlativo={displayCorrelativo}
      />

      {/* Snackbar Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
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
