'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { BcvRate, Quote, SalesFeatureFlags } from '@/types/salesQuotesTypes';
import { salesQuotesService } from '@/services/salesQuotesService';
import { getInventoryTemplates } from '@/services/inventoryService';
import { settingsService } from '@/services/settingsService';
import type { ProductTemplate } from '@/types/inventoryTypes';
import type { CommercialPoliciesSettings } from '@/types/settingsTypes';
import { calculateBillableSalesLines, resolveEffectiveInvoicingPolicy } from '@/utils/policyEngine';
import { QuoteStatusChip } from './components/QuoteStatusChip';
import { BcvRateBadge } from './components/BcvRateBadge';
import { QuoteTotalsCard } from './components/QuoteTotalsCard';
import { CancelQuoteModal } from './components/CancelQuoteModal';

interface Props {
  id: string;
}

export const QuoteDetailView: React.FC<Props> = ({ id }) => {
  const router = useRouter();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [activeBcvRate, setActiveBcvRate] = useState<BcvRate | null>(null);
  const [flags, setFlags] = useState<SalesFeatureFlags>(salesQuotesService.getFeatureFlags());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Estados de Operación Asíncrona (Prevención de Doble Envío)
  const [isApproving, setIsApproving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isGeneratingDelivery, setIsGeneratingDelivery] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Interconexión y Motor de Políticas (SPEC-009)
  const [products, setProducts] = useState<ProductTemplate[]>([]);
  const [commercialPolicies, setCommercialPolicies] = useState<CommercialPoliciesSettings | null>(null);
  const [policyWarningModal, setPolicyWarningModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    details?: string[];
  }>({ open: false, title: '', message: '' });

  // Feedback Toast
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentQuote, quotesList, bcv, productTemplates, policies] = await Promise.all([
        salesQuotesService.getQuoteById(id),
        salesQuotesService.getQuotes(),
        salesQuotesService.getActiveBcvRate(),
        getInventoryTemplates(),
        settingsService.getCommercialPolicies()
      ]);

      if (currentQuote) {
        setQuote(currentQuote);
      }
      setAllQuotes(quotesList);
      setActiveBcvRate(bcv);
      setProducts(productTemplates);
      setCommercialPolicies(policies);
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al cargar el detalle de la cotización.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoiceClick = () => {
    if (!quote) return;
    const billableLines = calculateBillableSalesLines(quote, products, commercialPolicies);
    const totalBillable = billableLines.reduce((acc, l) => acc + l.billableQty, 0);

    if (totalBillable <= 0) {
      const blockedLines = billableLines.filter(l => l.reason);
      setPolicyWarningModal({
        open: true,
        title: 'Facturación Bloqueada por Política de Entrega',
        message:
          'No existen cantidades entregadas pendientes de facturar para esta cotización. Según la política del producto, debe despachar en almacén antes de emitir la factura.',
        details: blockedLines.map(
          b =>
            `• ${b.line.producto_nombre}: Pedidas: ${b.orderedQty}, Entregadas: ${b.deliveredQty}, Facturadas: ${b.alreadyBilledQty}. Motivo: ${b.reason}`
        )
      });
      return;
    }

    // Redirigir a Facturación con contexto de cotización
    router.push(`/accounting/invoices?type=CUSTOMER&create_from_quote=${quote.id}`);
  };

  const handleGenerateDeliveryClick = async () => {
    if (!quote) return;
    try {
      setIsGeneratingDelivery(true);
      const res = await salesQuotesService.createDeliveryForQuote(quote.id);
      const reloaded = await salesQuotesService.getQuoteById(quote.id);
      if (reloaded) setQuote(reloaded);
      setToast({
        open: true,
        severity: 'success',
        message: res.message
      });
    } catch (err: any) {
      setToast({
        open: true,
        severity: 'error',
        message: err?.message || 'Error al generar la orden de despacho en almacén.'
      });
    } finally {
      setIsGeneratingDelivery(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Navegación Secuencial (Desplazador entre Cotizaciones)
  const safeIndex = allQuotes.findIndex(q => q.id.toLowerCase() === id.toLowerCase());
  const currentIndex = safeIndex >= 0 ? safeIndex : 0;
  const prevQuote = currentIndex > 0 ? allQuotes[currentIndex - 1] : null;
  const nextQuote = currentIndex < allQuotes.length - 1 ? allQuotes[currentIndex + 1] : null;
  const totalQuotes = allQuotes.length > 0 ? allQuotes.length : 1;

  const today = new Date().toISOString().split('T')[0];
  const isExpired = Boolean(
    quote &&
      ((quote.fecha_vencimiento < today && quote.estado === 'ISSUED') ||
        quote.estado === 'EXPIRED')
  );

  const isRateChanged = Boolean(
    quote &&
      activeBcvRate &&
      Math.abs(quote.tasa_bcv.tasa - activeBcvRate.tasa) > 0.001
  );

  // HU3: Aprobar Presupuesto
  const handleApprove = async () => {
    if (!quote) return;
    try {
      setIsApproving(true);
      const updated = await salesQuotesService.approveQuote(quote.id);
      setQuote(updated);
      setToast({
        open: true,
        message: `Presupuesto ${updated.correlativo} aprobado exitosamente. Condiciones comerciales congeladas.`,
        severity: 'success'
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al aprobar la cotización.',
        severity: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // HU3: Recalcular con Nueva Tasa BCV
  const handleRecalculateRate = async () => {
    if (!quote) return;
    try {
      setIsRecalculating(true);
      const updated = await salesQuotesService.recalculateQuoteBcvRate(quote.id);
      setQuote(updated);
      setToast({
        open: true,
        message: `Presupuesto recalculado con la tasa oficial activa (${updated.tasa_bcv.tasa} VES/USD).`,
        severity: 'info'
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al recalcular presupuesto.',
        severity: 'error'
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // HU4: Confirmar Anulación
  const handleConfirmCancel = async (motivo: string) => {
    if (!quote) return;
    const updated = await salesQuotesService.cancelQuote(quote.id, motivo);
    setQuote(updated);
    setToast({
      open: true,
      message: `Cotización ${updated.correlativo} anulada exitosamente.`,
      severity: 'warning'
    });
  };

  // HU5: Convertir a Orden de Venta
  const handleConvertToOrder = async () => {
    if (!quote) return;
    try {
      setIsConverting(true);
      const res = await salesQuotesService.convertQuoteToSalesOrder(quote.id);
      const reloaded = await salesQuotesService.getQuoteById(quote.id);
      if (reloaded) setQuote(reloaded);
      setToast({
        open: true,
        message: res.message,
        severity: 'success'
      });
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al convertir en orden de venta.',
        severity: 'error'
      });
    } finally {
      setIsConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <CircularProgress sx={{ color: '#6C5CE7' }} size={42} />
        <span className="text-sm text-[#6B7280]">Cargando ficha de cotización...</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="bg-[#FFFFFF] p-10 rounded-2xl border border-[#E6E4F0] text-center max-w-md mx-auto mt-12 shadow-sm">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEE2E2] text-[#EF4444] mb-3">
          <i className="tabler-file-off text-3xl" />
        </span>
        <Typography variant="h5" className="font-bold text-[#1E1B2E] mb-2">
          Cotización no encontrada
        </Typography>
        <Typography variant="body2" className="text-[#6B7280] mb-5">
          El registro solicitado no existe o ha sido eliminado del sistema.
        </Typography>
        <Button
          component={Link}
          href="/sales/quotes"
          variant="contained"
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Volver al Listado
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Top Navigation Bar con Desplazador Secuencial y Botones Estándar */}
      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Izquierda: Volver + Correlativo + Estado + Tasa */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Tooltip title="Volver al listado">
            <Button
              component={Link}
              href="/sales/quotes"
              variant="text"
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
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className="tabler-arrow-left text-lg" />
            </Button>
          </Tooltip>

          <div className="min-w-0 flex-1 flex items-center gap-2.5 flex-wrap">
            <Typography variant="h4" className="font-bold text-[#1E1B2E] truncate">
              {quote.correlativo}
            </Typography>
            <QuoteStatusChip status={quote.estado} size="small" />
            <BcvRateBadge rate={quote.tasa_bcv} compact />
            {quote.orden_venta_id && (
              <Chip
                label={`Orden: ${quote.correlativo_orden || quote.orden_venta_id}`}
                size="small"
                icon={<i className="tabler-check text-xs text-[#10B981]" />}
                sx={{
                  borderRadius: '9999px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              />
            )}
            {quote.almacen_operacion_codigo && (
              <Tooltip title="Ver Orden de Despacho en Almacén" arrow>
                <Link href="/inventory/operations/deliveries">
                  <Chip
                    label={`Despacho: ${quote.almacen_operacion_codigo}`}
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
              <Tooltip title="Ver Factura de Cliente en Contabilidad" arrow>
                <Link href="/accounting/invoices">
                  <Chip
                    label={`Factura: ${quote.factura_numero}`}
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
            <Chip
              label={quote.aplica_iva ? 'Con IVA (16%)' : 'Exenta de IVA'}
              size="small"
              icon={
                <i
                  className={
                    quote.aplica_iva
                      ? 'tabler-receipt-tax text-xs text-[#6C5CE7]'
                      : 'tabler-receipt-off text-xs text-[#6B7280]'
                  }
                />
              }
              sx={{
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.72rem',
                backgroundColor: quote.aplica_iva ? '#F0EEF9' : '#F4F3F8',
                color: quote.aplica_iva ? '#6C5CE7' : '#6B7280',
                border: '1px solid #DCD8EC'
              }}
            />
          </div>
        </div>

        {/* Derecha: Desplazador Secuencial [ ◄ ] X / N [ ► ] + Acciones Principales */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Desplazador Secuencial idéntico al de Contactos */}
          <div className="flex items-center gap-1 bg-[#F4F3F8] px-2 py-0.5 rounded-lg border border-[#E6E4F0] shrink-0">
            <Tooltip title={prevQuote ? `Anterior: ${prevQuote.correlativo}` : 'Primera cotización'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!prevQuote}
                  onClick={() => prevQuote && router.push(`/sales/quotes/${prevQuote.id}`)}
                  sx={{ color: '#6C5CE7', '&:disabled': { color: '#DCD8EC' }, p: 0.5 }}
                >
                  <i className="tabler-chevron-left text-base" />
                </IconButton>
              </span>
            </Tooltip>

            <Typography variant="caption" className="font-semibold text-[#1E1B2E] select-none px-1 font-mono">
              {currentIndex + 1} / {totalQuotes}
            </Typography>

            <Tooltip title={nextQuote ? `Siguiente: ${nextQuote.correlativo}` : 'Última cotización'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!nextQuote}
                  onClick={() => nextQuote && router.push(`/sales/quotes/${nextQuote.id}`)}
                  sx={{ color: '#6C5CE7', '&:disabled': { color: '#DCD8EC' }, p: 0.5 }}
                >
                  <i className="tabler-chevron-right text-base" />
                </IconButton>
              </span>
            </Tooltip>
          </div>

          {/* Acciones de Cabecera */}
          {quote.estado === 'DRAFT' && (
            <Button
              component={Link}
              href={`/sales/quotes/${quote.id}/edit`}
              variant="outlined"
              size="small"
              sx={{
                borderRadius: '9999px',
                borderColor: '#38BDF8',
                color: '#0284C7',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
              startIcon={<i className="tabler-edit text-base" />}
            >
              Editar Borrador
            </Button>
          )}

          {(quote.estado === 'ISSUED' || quote.estado === 'EXPIRED') && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleRecalculateRate}
              disabled={isRecalculating}
              sx={{
                borderRadius: '9999px',
                borderColor: '#DCD8EC',
                color: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                '&:hover': { backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
              startIcon={
                isRecalculating ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <i className="tabler-refresh text-base" />
                )
              }
            >
              {isRecalculating ? 'Recalculando...' : 'Recalcular'}
            </Button>
          )}

          {quote.estado === 'ISSUED' && (
            <Button
              variant="contained"
              size="small"
              onClick={handleApprove}
              disabled={isApproving || isExpired}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                boxShadow: 'none',
                '&:hover': { backgroundColor: '#059669', boxShadow: 'none' }
              }}
              startIcon={
                isApproving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <i className="tabler-circle-check text-base" />
                )
              }
            >
              {isApproving ? 'Aprobando...' : 'Aprobar'}
            </Button>
          )}

          {quote.estado === 'APPROVED' && !quote.orden_venta_id && (
            <Button
              variant="contained"
              size="small"
              onClick={handleConvertToOrder}
              disabled={isConverting}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
              startIcon={
                isConverting ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <i className="tabler-truck-delivery text-base" />
                )
              }
            >
              {isConverting ? 'Generando...' : 'Generar Orden'}
            </Button>
          )}

          {/* Interconexión Almacén / Despacho (SPEC-009) */}
          {(quote.estado === 'APPROVED' || quote.orden_venta_id) &&
            quote.items.some(it => it.is_physical_stock) && (
              <Button
                variant="contained"
                size="small"
                onClick={handleGenerateDeliveryClick}
                disabled={isGeneratingDelivery}
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
                  isGeneratingDelivery ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <i className="tabler-truck-delivery text-base" />
                  )
                }
              >
                {isGeneratingDelivery
                  ? 'Generando Despacho...'
                  : quote.almacen_operacion_codigo
                  ? 'Generar Entrega Adicional'
                  : 'Generar Despacho'}
              </Button>
            )}

          {/* Interconexión Facturación de Cliente (SPEC-009) */}
          {(quote.estado === 'APPROVED' || quote.orden_venta_id) && (
            <Button
              variant="contained"
              size="small"
              onClick={handleCreateInvoiceClick}
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
              startIcon={<i className="tabler-receipt text-base" />}
            >
              Crear Factura
            </Button>
          )}

          {quote.estado !== 'CANCELED' && (
            <Tooltip title="Anular Cotización" arrow>
              <IconButton
                size="small"
                onClick={() => setCancelModalOpen(true)}
                sx={{
                  color: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.16)' }
                }}
              >
                <i className="tabler-ban text-base" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Imprimir documento" arrow>
            <IconButton
              size="small"
              onClick={() => window.print()}
              sx={{ color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
            >
              <i className="tabler-printer text-base" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Banner de Advertencia: Expiración o Tasa Desfasada (HU3 EARS-EX-04) */}
      {(isExpired || (isRateChanged && quote.estado === 'ISSUED')) && (
        <Alert
          severity="warning"
          variant="filled"
          sx={{
            borderRadius: '16px',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
            backgroundColor: '#F59E0B',
            color: '#FFFFFF',
            fontWeight: 500
          }}
          action={
            <Button
              variant="contained"
              size="small"
              onClick={handleRecalculateRate}
              disabled={isRecalculating}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#FFFFFF',
                color: '#B45309',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { backgroundColor: '#FEF3C7', boxShadow: 'none' }
              }}
              startIcon={
                isRecalculating ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <i className="tabler-refresh text-xs" />
                )
              }
            >
              {isRecalculating ? 'Recalculando...' : 'Recalcular con nueva tasa BCV'}
            </Button>
          }
        >
          {isExpired
            ? 'La cotización ha expirado. Para permitir la aprobación comercial, debe recalcular el presupuesto con la tasa BCV oficial actual.'
            : 'La tasa oficial del BCV ha cambiado desde la emisión. Se recomienda recalcular los montos antes de aprobar.'}
        </Alert>
      )}

      {/* Banner de Cotización Anulada */}
      {quote.estado === 'CANCELED' && (
        <Alert
          severity="error"
          variant="filled"
          sx={{
            borderRadius: '16px',
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontWeight: 500
          }}
        >
          <strong>Cotización Anulada:</strong>{' '}
          {quote.motivo_anulacion || 'Sin motivo especificado.'}
        </Alert>
      )}

      {/* Banner de Orden de Venta Generada (HU5) */}
      {quote.orden_venta_id && (
        <Alert
          severity="success"
          variant="filled"
          sx={{
            borderRadius: '16px',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontWeight: 500
          }}
        >
          <strong>¡Orden de Venta Generada!</strong> Esta cotización fue convertida exitosamente en{' '}
          <strong>{quote.correlativo_orden}</strong>. El inventario físico ha sido comprometido para facturación y despacho.
        </Alert>
      )}

      {/* Tarjeta Principal de la Cotización / Venta (Vista Completa estilo Factura) */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          p: { xs: 3, md: 5 }
        }}
      >
        {/* Cabecera Maestro Limpia y Espaciosa (Full Width) */}
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
          {/* Fila 1: Cliente / Destinatario y Datos de Contacto */}
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
                  Cliente / Destinatario
                </Typography>
                <Chip
                  label={quote.cliente.identificacion}
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
                {quote.cliente.nombre_razon_social}
              </Typography>
              {quote.cliente.nombre_comercial && (
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  Nombre Comercial: {quote.cliente.nombre_comercial}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', fontSize: '0.82rem' }}>
                <i className='tabler-phone text-sm text-[#94A3B8]' />
                <span>{quote.cliente.telefono || 'Sin teléfono registrado'}</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', fontSize: '0.82rem' }}>
                <i className='tabler-mail text-sm text-[#94A3B8]' />
                <span>{quote.cliente.email || 'Sin correo registrado'}</span>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'start', gap: 1, color: '#64748B', fontSize: '0.82rem' }}>
              <i className='tabler-map-pin text-sm text-[#94A3B8] mt-0.5 shrink-0' />
              <span>{quote.cliente.direccion || 'Sin dirección fiscal registrada'}</span>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          {/* Fila 2: Fechas, Vigencia, Tasa BCV, Régimen Fiscal y Moneda Base */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2.5
            }}
          >
            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Fecha de Emisión
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B', mt: 0.25 }}>
                {quote.fecha_emision}
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Fecha de Vencimiento
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 700,
                  color: isExpired ? '#EF4444' : '#1E293B',
                  mt: 0.25
                }}
              >
                {quote.fecha_vencimiento} ({quote.vigencia_dias}d)
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Tasa BCV Oficial
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#6C5CE7', mt: 0.25 }}>
                {quote.tasa_bcv.tasa.toFixed(2)} Bs/USD
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Régimen Fiscal
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: quote.aplica_iva ? '#6C5CE7' : '#64748B', mt: 0.25 }}>
                {quote.aplica_iva ? 'Con IVA (16%)' : 'Exento de IVA'}
              </Typography>
            </Box>

            <Box>
              <Typography variant='caption' sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>
                Moneda Base
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B', mt: 0.25 }}>
                {quote.moneda_base}
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
              label={`Líneas de Ítems (${quote.items.length})`}
            />
            <Tab
              icon={<i className='tabler-file-text text-base mr-1.5' />}
              iconPosition='start'
              label='Condiciones Comerciales'
            />
            <Tab
              icon={<i className='tabler-history text-base mr-1.5' />}
              iconPosition='start'
              label='Trazabilidad y Auditoría'
            />
          </Tabs>
        </Box>

        {/* Contenido Pestaña 0: Líneas de Ítems (100% de Ancho) */}
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
                    <TableCell sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Política Fact.</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Pedida</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Entregada</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Facturada</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Precio ($)</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Desc.</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>IVA</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Total ($)</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, color: '#64748B', py: 1.5 }}>Total (Bs.)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quote.items.map((it, idx) => {
                    const prod = products.find(p => p.id === it.producto_id);
                    const effPolicy = resolveEffectiveInvoicingPolicy(prod, commercialPolicies);

                    return (
                      <TableRow key={it.id || idx} hover sx={{ height: 50 }}>
                        <TableCell sx={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <div className='flex flex-col'>
                            <span className='font-semibold text-sm text-[#1E1B2E]'>
                              {it.producto_nombre}
                            </span>
                            <span className='text-xs text-[#6B7280]'>
                              SKU: {it.producto_sku}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Tooltip
                            title={
                              effPolicy === 'DELIVERED'
                                ? 'Facturación sobre cantidades entregadas por almacén'
                                : 'Facturación directa sobre cantidades pedidas'
                            }
                            arrow
                          >
                            <Chip
                              size='small'
                              label={effPolicy === 'DELIVERED' ? 'Sobre Entrega' : 'Sobre Pedido'}
                              sx={{
                                borderRadius: '9999px',
                                fontSize: '0.68rem',
                                height: 20,
                                backgroundColor: effPolicy === 'DELIVERED' ? '#E0F2FE' : '#F0EEF9',
                                color: effPolicy === 'DELIVERED' ? '#0284C7' : '#6C5CE7',
                                fontWeight: 600
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600, py: 1.2 }}>
                          {it.cantidad}
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600, py: 1.2, color: (it.cantidad_entregada || 0) > 0 ? '#10B981' : '#9CA3AF' }}>
                          {it.cantidad_entregada ?? 0}
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 600, py: 1.2, color: (it.cantidad_facturada || 0) > 0 ? '#6C5CE7' : '#9CA3AF' }}>
                          {it.cantidad_facturada ?? 0}
                        </TableCell>
                        <TableCell align='right' sx={{ py: 1.2 }}>
                          ${it.precio_unitario.toFixed(2)}
                        </TableCell>
                        <TableCell align='center' sx={{ py: 1.2 }}>
                          {it.descuento_porcentaje > 0 ? (
                            <span className='text-xs text-[#EF4444] font-medium'>
                              -{it.descuento_porcentaje}%
                            </span>
                          ) : (
                            <span className='text-xs text-[#9CA3AF]'>—</span>
                          )}
                        </TableCell>
                        <TableCell align='center' sx={{ py: 1.2 }}>
                          <Chip
                            size='small'
                            label={!quote.aplica_iva || it.alicuota_iva === 'EXEMPT' || it.alicuota_iva === '0' ? '0%' : '16%'}
                            sx={{
                              borderRadius: '9999px',
                              fontSize: '0.68rem',
                              height: 20,
                              backgroundColor: !quote.aplica_iva || it.alicuota_iva === 'EXEMPT' || it.alicuota_iva === '0' ? '#F4F3F8' : '#F0EEF9',
                              color: !quote.aplica_iva || it.alicuota_iva === 'EXEMPT' || it.alicuota_iva === '0' ? '#6B7280' : '#6C5CE7',
                              border: '1px solid #DCD8EC'
                            }}
                          />
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 700, color: '#1E1B2E', py: 1.2 }}>
                          ${it.total_linea.toFixed(2)}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 600, color: '#10B981', fontSize: '0.78rem', py: 1.2 }}>
                          Bs. {(it.total_linea * quote.tasa_bcv.tasa).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
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
                    Observaciones Comerciales
                  </Typography>
                  <Typography variant='body2' sx={{ color: '#64748B', mb: 3 }}>
                    {quote.observaciones || 'No se registraron observaciones comerciales específicas.'}
                  </Typography>
                  <Divider sx={{ my: 2, borderColor: '#E2E8F0' }} />
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                    Términos y Condiciones de la Oferta
                  </Typography>
                  <Typography variant='body2' sx={{ color: '#64748B' }}>
                    {quote.terminos_condiciones || 'Términos estándar del ERP Foundly aplicables para ventas y cotizaciones.'}
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <QuoteTotalsCard
                  totals={{
                    subtotal_usd: quote.subtotal_usd,
                    descuento_usd: quote.descuento_total_usd,
                    base_imponible_usd: quote.base_imponible_usd ?? (quote.aplica_iva ? quote.subtotal_usd - quote.descuento_total_usd : 0),
                    monto_exento_usd: quote.monto_exento_usd ?? (quote.aplica_iva ? 0 : quote.subtotal_usd - quote.descuento_total_usd),
                    neto_imponible_usd: quote.subtotal_usd - quote.descuento_total_usd,
                    iva_usd: quote.iva_total_usd,
                    igtf_usd: quote.igtf_total_usd || 0,
                    total_usd: quote.total_usd,

                    subtotal_ves: quote.subtotal_ves,
                    descuento_ves: quote.descuento_total_ves,
                    base_imponible_ves: quote.base_imponible_ves ?? ((quote.subtotal_usd - quote.descuento_total_usd) * quote.tasa_bcv.tasa),
                    monto_exento_ves: quote.monto_exento_ves ?? 0,
                    neto_imponible_ves: quote.subtotal_ves - quote.descuento_total_ves,
                    iva_ves: quote.iva_total_ves,
                    igtf_ves: quote.igtf_total_ves || 0,
                    total_ves: quote.total_ves
                  }}
                  tasaBcv={quote.tasa_bcv.tasa}
                  flags={flags}
                  aplicaIva={quote.aplica_iva}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Contenido Pestaña 1: Condiciones Comerciales */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ backgroundColor: '#F8FAFC', p: 4, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                Observaciones Comerciales
              </Typography>
              <Typography variant='body2' sx={{ color: '#64748B' }}>
                {quote.observaciones || 'No se registraron observaciones comerciales específicas.'}
              </Typography>
            </Box>
            <Box sx={{ backgroundColor: '#F8FAFC', p: 4, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E', mb: 1 }}>
                Términos y Condiciones de la Oferta
              </Typography>
              <Typography variant='body2' sx={{ color: '#64748B' }}>
                {quote.terminos_condiciones || 'Términos estándar del ERP Foundly aplicables para ventas y cotizaciones.'}
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
                <span>Versión del Registro:</span>
                <strong style={{ color: '#1E1B2E' }}>v{quote.version}</strong>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9' }}>
                <span>Fecha de Registro (Creado):</span>
                <strong style={{ color: '#1E1B2E' }}>{new Date(quote.created_at).toLocaleString()}</strong>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9' }}>
                <span>Última Modificación:</span>
                <strong style={{ color: '#1E1B2E' }}>{new Date(quote.updated_at).toLocaleString()}</strong>
              </Box>
              {quote.orden_venta_id && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9', color: '#10B981', fontWeight: 600 }}>
                  <span>Orden de Venta Generada:</span>
                  <span>{quote.correlativo_orden || quote.orden_venta_id}</span>
                </Box>
              )}
              {quote.almacen_operacion_codigo && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9', color: '#0284C7', fontWeight: 600 }}>
                  <span>Orden de Despacho (Almacén):</span>
                  <span>{quote.almacen_operacion_codigo}</span>
                </Box>
              )}
              {quote.factura_numero && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F1F5F9', color: '#10B981', fontWeight: 600 }}>
                  <span>Factura de Venta Emitida:</span>
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

      {/* Modal Informativo de Bloqueo por Política de Facturación (SPEC-009) */}
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
          <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <i className="tabler-alert-triangle text-xl" />
          </div>
          <span className="font-bold text-[#1E1B2E] text-base">
            {policyWarningModal.title}
          </span>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" className="text-[#4B5563] mb-3">
            {policyWarningModal.message}
          </Typography>
          {policyWarningModal.details && policyWarningModal.details.length > 0 && (
            <div className="bg-[#FAFAFC] p-3 rounded-xl border border-[#E6E4F0] flex flex-col gap-1.5 text-xs text-[#374151]">
              <span className="font-bold text-[#1E1B2E]">Estado de las líneas:</span>
              {policyWarningModal.details.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
          <Button
            variant="contained"
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

      {/* Modal de Anulación */}
      <CancelQuoteModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        correlativo={quote.correlativo}
      />

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{
            borderRadius: '16px',
            fontWeight: 500,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};
