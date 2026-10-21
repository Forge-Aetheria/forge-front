'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import { BcvRate, PurchaseQuote, PurchasesFeatureFlags } from '@/types/purchasesTypes'
import { purchasesService } from '@/services/purchasesService'
import { getInventoryTemplates } from '@/services/inventoryService'
import { settingsService } from '@/services/settingsService'
import type { ProductTemplate } from '@/types/inventoryTypes'
import type { CommercialPoliciesSettings } from '@/types/settingsTypes'
import { calculateBillablePurchaseLines, resolveEffectivePurchaseControlPolicy } from '@/utils/policyEngine'
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
  const [activeTab, setActiveTab] = useState(0)

  // Estados de Operación Asíncrona (Prevención de Doble Envío - EARS-UB-05)
  const [isApproving, setIsApproving] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isGeneratingReception, setIsGeneratingReception] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  // Interconexión y Motor de Políticas (SPEC-009)
  const [products, setProducts] = useState<ProductTemplate[]>([])
  const [commercialPolicies, setCommercialPolicies] = useState<CommercialPoliciesSettings | null>(null)
  const [policyWarningModal, setPolicyWarningModal] = useState<{
    open: boolean
    title: string
    message: string
    details?: string[]
  }>({ open: false, title: '', message: '' })

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
      const [currentQuote, quotesList, bcv, productTemplates, policies] = await Promise.all([
        purchasesService.getPurchaseQuoteById(id),
        purchasesService.getPurchaseQuotes(),
        purchasesService.getActiveBcvRate(),
        getInventoryTemplates(),
        settingsService.getCommercialPolicies()
      ])

      if (currentQuote) {
        setQuote(currentQuote)
      }
      setAllQuotes(quotesList)
      setActiveBcvRate(bcv)
      setProducts(productTemplates)
      setCommercialPolicies(policies)
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

  const handleCreateSupplierInvoiceClick = () => {
    if (!quote) return
    const billableLines = calculateBillablePurchaseLines(quote, products, commercialPolicies)
    const totalBillable = billableLines.reduce((acc, l) => acc + l.billableQty, 0)

    if (totalBillable <= 0) {
      const blockedLines = billableLines.filter(l => l.reason)
      setPolicyWarningModal({
        open: true,
        title: 'Factura Bloqueada por Política de Recepción',
        message:
          'No existen cantidades recibidas pendientes de facturar para esta orden de compra. Según la política de control de compra del producto, debe registrar la recepción en almacén previamente.',
        details: blockedLines.map(
          b =>
            `• ${b.line.producto_nombre}: Ordenadas: ${b.orderedQty}, Recibidas: ${b.receivedQty}, Facturadas: ${b.alreadyBilledQty}. Motivo: ${b.reason}`
        )
      })
      return
    }

    // Redirigir a Facturas de Proveedor con contexto de orden de compra
    router.push(`/accounting/invoices?type=SUPPLIER&create_from_purchase=${quote.id}`)
  }

  const handleGenerateReceptionClick = async () => {
    if (!quote) return
    try {
      setIsGeneratingReception(true)
      const res = await purchasesService.createReceptionForPurchase(quote.id)
      const reloaded = await purchasesService.getPurchaseQuoteById(quote.id)
      if (reloaded) setQuote(reloaded)
      setToast({
        open: true,
        severity: 'success',
        message: res.message
      })
    } catch (err: any) {
      setToast({
        open: true,
        severity: 'error',
        message: err?.message || 'Error al generar la orden de recepción en almacén.'
      })
    } finally {
      setIsGeneratingReception(false)
    }
  }

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
          <Tooltip title='Volver al listado'>
            <Button
              component={Link}
              href='/purchases/quotes'
              variant='text'
              sx={{
                minWidth: 'auto',
                width: 38,
                height: 38,
                p: 0,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { backgroundColor: '#F4F3F8', color: '#6C5CE7' }
              }}
            >
              <i className='tabler-arrow-left text-lg' />
            </Button>
          </Tooltip>

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
              {quote.almacen_operacion_codigo && (
                <Tooltip title="Ver Orden de Recepción en Almacén" arrow>
                  <Link href="/inventory/operations/receipts">
                    <Chip
                      label={`Recepción: ${quote.almacen_operacion_codigo}`}
                      size="small"
                      clickable
                      icon={<i className="tabler-truck-delivery text-xs text-[#0284C7]" />}
                      sx={{
                        borderRadius: '9999px',
                        fontWeight: 600,
                        backgroundColor: '#E0F2FE',
                        color: '#0284C7',
                        border: '1px solid #BAE6FD',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#BAE6FD' }
                      }}
                    />
                  </Link>
                </Tooltip>
              )}
              {quote.factura_numero && (
                <Tooltip title="Ver Factura de Proveedor en Contabilidad" arrow>
                  <Link href="/accounting/invoices?type=SUPPLIER">
                    <Chip
                      label={`Factura CxP: ${quote.factura_numero}`}
                      size="small"
                      clickable
                      icon={<i className="tabler-receipt text-xs text-[#10B981]" />}
                      sx={{
                        borderRadius: '9999px',
                        fontWeight: 600,
                        backgroundColor: '#E8F5E9',
                        color: '#10B981',
                        border: '1px solid #A7F3D0',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#A7F3D0' }
                      }}
                    />
                  </Link>
                </Tooltip>
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

          {/* Interconexión Recepción de Mercancía en Almacén (SPEC-009) */}
          {quote.estado === 'PURCHASE_ORDER' && physicalLinesCount > 0 && (
            <Button
              variant='contained'
              size='small'
              onClick={handleGenerateReceptionClick}
              disabled={isGeneratingReception}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                '&:hover': { backgroundColor: '#0369A1' }
              }}
              startIcon={
                isGeneratingReception ? (
                  <CircularProgress size={14} color='inherit' />
                ) : (
                  <i className='tabler-truck-delivery text-base' />
                )
              }
            >
              {isGeneratingReception
                ? 'Generando Recepción...'
                : quote.almacen_operacion_codigo
                ? 'Generar Recepción Adicional'
                : 'Recibir Productos'}
            </Button>
          )}

          {/* Interconexión Factura de Proveedor en CxP (SPEC-009) */}
          {quote.estado === 'PURCHASE_ORDER' && (
            <Button
              variant='contained'
              size='small'
              onClick={handleCreateSupplierInvoiceClick}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                '&:hover': { backgroundColor: '#059669' }
              }}
              startIcon={<i className='tabler-receipt text-base' />}
            >
              Crear Factura de Proveedor
            </Button>
          )}

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

      {/* Tarjeta Principal de la Orden de Compra (Vista Completa estilo Factura) */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          p: { xs: 3, md: 5 }
        }}
      >
        {/* Cabecera Maestro Limpia y Espaciosa (Full Width estilo Factura) */}
        <Box
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          {/* Fila 1: Proveedor Adjudicado y Datos de Contacto */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.8fr 1.1fr 1.1fr' },
              gap: 3,
              alignItems: 'start'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant='caption' sx={{ fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Proveedor Adjudicado
                </Typography>
                <Chip
                  label={`RIF: ${quote.proveedor.identificacion}`}
                  size='small'
                  sx={{
                    borderRadius: '9999px',
                    fontWeight: 700,
                    backgroundColor: '#F0EEF9',
                    color: '#6C5CE7',
                    height: 22
                  }}
                />
              </Box>
              <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', mt: 0.5 }}>
                {quote.proveedor.razon_social}
              </Typography>
              {quote.proveedor.nombre_comercial && (
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  Nombre Comercial: {quote.proveedor.nombre_comercial}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', fontSize: '0.82rem' }}>
                <i className='tabler-phone text-sm text-[#94A3B8]' />
                <span>{quote.proveedor.telefono || 'Sin teléfono registrado'}</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', fontSize: '0.82rem' }}>
                <i className='tabler-mail text-sm text-[#94A3B8]' />
                <span>{quote.proveedor.email || 'Sin correo registrado'}</span>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'start', gap: 1, color: '#64748B', fontSize: '0.82rem' }}>
              <i className='tabler-map-pin text-sm text-[#94A3B8] mt-0.5 shrink-0' />
              <span>{quote.proveedor.direccion_fiscal || 'Sin dirección fiscal registrada'}</span>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          {/* Fila 2: Condiciones Pactadas, Vigencia y Métricas */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2.5
            }}
          >
            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Ref. Cotización Prov.
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B', mt: 0.25 }}>
                {quote.referencia_proveedor || 'N/A'}
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Condición de Pago
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#10B981', mt: 0.25 }}>
                {quote.condicion_pago === 'CREDITO' ? `Crédito ${quote.dias_credito} días` : 'Contado'}
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Vigencia Costos
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B', mt: 0.25 }}>
                {quote.fecha_vencimiento_cotizacion}
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Entrega Estimada
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#6C5CE7', mt: 0.25 }}>
                {quote.fecha_estimada_entrega}
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Tasa BCV Oficial
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B', mt: 0.25 }}>
                {quote.tasa_bcv.tasa.toFixed(2)} Bs/USD
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Pestañas (Tabs) Estilo Odoo / Factura a Ancho Completo */}
        <Box sx={{ borderBottom: '1px solid #E6E4F0', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: '#64748B',
                minHeight: 44,
                px: 3,
                '&.Mui-selected': { color: '#6C5CE7', fontWeight: 700 }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab
              icon={<i className='tabler-list-details text-base mr-1.5' />}
              iconPosition='start'
              label={`Líneas de Compra (${quote.items.length})`}
            />
            <Tab
              icon={<i className='tabler-file-text text-base mr-1.5' />}
              iconPosition='start'
              label='Condiciones Pactadas'
            />
            <Tab
              icon={<i className='tabler-history text-base mr-1.5' />}
              iconPosition='start'
              label='Trazabilidad y Auditoría'
            />
          </Tabs>
        </Box>

        {/* Contenido Pestaña 0: Líneas de Compra (100% de Ancho) */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TableContainer
              sx={{
                border: '1px solid #E6E4F0',
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            >
              <Table size='small'>
                <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ width: 36, textAlign: 'center', fontWeight: 600, color: '#64748B' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Producto / Servicio</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Control Fact.</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Ordenada</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Recibida</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Facturada</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Costo Unit. (USD)</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Desc.</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>IVA</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Subtotal Neto (USD / VES)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quote.items.map((line, index) => {
                    const netVes = line.subtotal_neto * quote.tasa_bcv.tasa
                    const prod = products.find(p => p.id === line.producto_id)
                    const effPolicy = resolveEffectivePurchaseControlPolicy(prod, commercialPolicies)

                    return (
                      <TableRow key={line.id || index} hover sx={{ height: 50 }}>
                        <TableCell sx={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
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
                        <TableCell sx={{ py: 1.2 }}>
                          <Tooltip
                            title={
                              effPolicy === 'RECEIVED'
                                ? 'Control de factura sobre cantidades recibidas en almacén'
                                : 'Control de factura sobre cantidades ordenadas en compra'
                            }
                            arrow
                          >
                            <Chip
                              size='small'
                              label={effPolicy === 'RECEIVED' ? 'Sobre Recepción' : 'Sobre Pedido'}
                              sx={{
                                borderRadius: '9999px',
                                fontSize: '0.68rem',
                                height: 20,
                                backgroundColor: effPolicy === 'RECEIVED' ? '#E0F2FE' : '#F0EEF9',
                                color: effPolicy === 'RECEIVED' ? '#0284C7' : '#6C5CE7',
                                fontWeight: 600
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.2 }}>
                          {line.cantidad} {line.uom_code}
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600, py: 1.2, color: (line.cantidad_recibida || 0) > 0 ? '#10B981' : '#9CA3AF' }}>
                          {line.cantidad_recibida ?? 0}
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600, py: 1.2, color: (line.cantidad_facturada || 0) > 0 ? '#6C5CE7' : '#9CA3AF' }}>
                          {line.cantidad_facturada ?? 0}
                        </TableCell>
                        <TableCell align='right' sx={{ color: '#1E1B2E', py: 1.2 }}>
                          ${line.costo_unitario.toFixed(2)}
                        </TableCell>
                        <TableCell align='center' sx={{ color: '#10B981', fontWeight: 600, py: 1.2 }}>
                          {line.descuento_proveedor_porcentaje > 0
                            ? `-${line.descuento_proveedor_porcentaje}%`
                            : '0%'}
                        </TableCell>
                        <TableCell align='center' sx={{ py: 1.2 }}>
                          <span className='inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-bold bg-[#F0EEF9] text-[#6C5CE7] border border-[#DCD8EC] whitespace-nowrap leading-none'>
                            {!quote.aplica_iva_compras ||
                            line.alicuota_iva === 'EXEMPT' ||
                            line.alicuota_iva === '0'
                              ? '0%'
                              : `${line.alicuota_iva}%`}
                          </span>
                        </TableCell>
                        <TableCell align='right' sx={{ py: 1.2 }}>
                          <div className='flex flex-col items-end'>
                            <span className='font-bold text-sm text-[#1E1B2E]'>
                              ${line.subtotal_neto.toFixed(2)}
                            </span>
                            <span className='text-[11px] text-[#10B981] font-semibold'>
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

            {/* Bloque Inferior: 2 Columnas (Observaciones a la izquierda + Totales a la derecha) */}
            <Grid container spacing={4} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 7 }} className='flex flex-col gap-4'>
                <Card
                  sx={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: 'none',
                    p: 4
                  }}
                >
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                    Observaciones Internas
                  </Typography>
                  <Typography variant='body2' sx={{ color: '#64748B', mb: 3 }}>
                    {quote.observaciones || 'Sin observaciones registradas.'}
                  </Typography>
                  <Divider sx={{ my: 2, borderColor: '#E2E8F0' }} />
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                    Condiciones de Entrega Pactadas
                  </Typography>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>
                    {quote.terminos_negociacion || 'Condiciones estándar de compra aplicables.'}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
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
          </Box>
        )}

        {/* Contenido Pestaña 1: Condiciones Pactadas */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ backgroundColor: '#F8FAFC', p: 4, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                Observaciones Internas
              </Typography>
              <Typography variant='body2' sx={{ color: '#64748B' }}>
                {quote.observaciones || 'Sin observaciones registradas.'}
              </Typography>
            </Box>
            <Box sx={{ backgroundColor: '#F8FAFC', p: 4, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                Condiciones de Entrega Pactadas
              </Typography>
              <Typography variant='body2' sx={{ color: '#64748B' }}>
                {quote.terminos_negociacion || 'Condiciones estándar de compra aplicables.'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Contenido Pestaña 2: Trazabilidad y Auditoría */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
              sx={{
                backgroundColor: '#FFFFFF',
                p: 4,
                borderRadius: '16px',
                border: '1px solid #E6E4F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                fontSize: '0.875rem',
                color: '#64748B'
              }}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                Registro y Auditoría del Documento
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9' }}>
                <span>Fecha de Registro (Creado):</span>
                <strong style={{ color: '#1E1B2E' }}>{new Date(quote.created_at).toLocaleString()}</strong>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9' }}>
                <span>Última Modificación:</span>
                <strong style={{ color: '#1E1B2E' }}>{new Date(quote.updated_at).toLocaleString()}</strong>
              </Box>
              {quote.correlativo_orden_compra && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9', color: '#10B981', fontWeight: 600 }}>
                  <span>Orden de Compra Asociada:</span>
                  <span>{quote.correlativo_orden_compra}</span>
                </Box>
              )}
              {quote.almacen_operacion_codigo && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9', color: '#0284C7', fontWeight: 600 }}>
                  <span>Recepción de Almacén:</span>
                  <span>{quote.almacen_operacion_codigo}</span>
                </Box>
              )}
              {quote.factura_numero && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9', color: '#10B981', fontWeight: 600 }}>
                  <span>Factura de Proveedor:</span>
                  <span>{quote.factura_numero}</span>
                </Box>
              )}
              {quote.motivo_anulacion && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, color: '#EF4444', fontWeight: 600 }}>
                  <span>Motivo de Anulación:</span>
                  <span>{quote.motivo_anulacion}</span>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Card>

      {/* Modal Informativo de Bloqueo por Política de Recepción (SPEC-009) */}
      <Dialog
        open={policyWarningModal.open}
        onClose={() => setPolicyWarningModal(prev => ({ ...prev, open: false }))}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1.5,
            maxWidth: '520px',
            border: '1px solid #E6E4F0'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <div className='w-9 h-9 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0'>
            <i className='tabler-alert-triangle text-xl' />
          </div>
          <span className='font-bold text-[#1E1B2E] text-base'>
            {policyWarningModal.title}
          </span>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant='body2' className='text-[#4B5563] mb-3'>
            {policyWarningModal.message}
          </Typography>
          {policyWarningModal.details && policyWarningModal.details.length > 0 && (
            <div className='bg-[#FAFAFC] p-3 rounded-xl border border-[#E6E4F0] flex flex-col gap-1.5 text-xs text-[#374151]'>
              <span className='font-bold text-[#1E1B2E]'>Estado de las líneas:</span>
              {policyWarningModal.details.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
          <Button
            variant='contained'
            onClick={() => setPolicyWarningModal(prev => ({ ...prev, open: false }))}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

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
