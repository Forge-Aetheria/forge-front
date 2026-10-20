'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
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
import { styled } from '@mui/material/styles';
import MuiTimeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import type { TimelineProps } from '@mui/lab/Timeline';

// Timeline estilizada según estándar de plantilla
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  margin: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    minHeight: 56,
    '&:before': {
      display: 'none'
    },
    '& .MuiTimelineContent-root': {
      paddingLeft: 12,
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 16
    },
    '&:last-child .MuiTimelineConnector-root': {
      display: 'none'
    }
  }
});

import { BcvRate, Quote, SalesFeatureFlags } from '@/types/salesQuotesTypes';
import { salesQuotesService } from '@/services/salesQuotesService';
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
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

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
      const [currentQuote, quotesList, bcv] = await Promise.all([
        salesQuotesService.getQuoteById(id),
        salesQuotesService.getQuotes(),
        salesQuotesService.getActiveBcvRate()
      ]);

      if (currentQuote) {
        setQuote(currentQuote);
      }
      setAllQuotes(quotesList);
      setActiveBcvRate(bcv);
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
          <Button
            component={Link}
            href="/sales/quotes"
            variant="text"
            sx={{
              minWidth: 'auto',
              p: 1,
              borderRadius: '9999px',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E4F0',
              '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9' }
            }}
            title="Volver al listado"
          >
            <i className="tabler-arrow-left text-lg" />
          </Button>

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

      <Grid container spacing={4}>
        {/* Columna Lateral (4 cols): Cliente y Trazabilidad Permanente */}
        <Grid size={{ xs: 12, lg: 4 }} order={{ xs: 2, lg: 2 }} className="flex flex-col gap-4">
          {/* Card Cliente */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider">
                  Cliente / Destinatario
                </span>
                <Chip
                  label={quote.cliente.identificacion}
                  size="small"
                  sx={{
                    borderRadius: '9999px',
                    fontWeight: 600,
                    backgroundColor: '#F0EEF9',
                    color: '#6C5CE7'
                  }}
                />
              </div>

              <Typography variant="h6" className="font-bold text-[#1E1B2E]">
                {quote.cliente.nombre_razon_social}
              </Typography>
              {quote.cliente.nombre_comercial && (
                <span className="text-xs text-[#6B7280]">
                  Nombre Comercial: {quote.cliente.nombre_comercial}
                </span>
              )}

              <Grid container spacing={2} className="pt-2 text-xs text-[#6B7280]">
                <Grid size={{ xs: 12 }} className="flex items-center gap-2">
                  <i className="tabler-phone text-sm text-[#9CA3AF]" />
                  <span>{quote.cliente.telefono || 'Sin teléfono registrado'}</span>
                </Grid>
                <Grid size={{ xs: 12 }} className="flex items-center gap-2">
                  <i className="tabler-mail text-sm text-[#9CA3AF]" />
                  <span>{quote.cliente.email || 'Sin correo registrado'}</span>
                </Grid>
                <Grid size={{ xs: 12 }} className="flex items-start gap-2">
                  <i className="tabler-map-pin text-sm text-[#9CA3AF] mt-0.5" />
                  <span>{quote.cliente.direccion}</span>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Card Historial de Auditoría ("Quién hizo qué") */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            <div className="p-4 bg-[#FAFAFC] border-b border-[#E6E4F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="tabler-history text-lg text-[#6C5CE7]" />
                <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                  Historial de Auditoría
                </Typography>
              </div>
              <span className="text-[11px] font-semibold text-[#6C5CE7] bg-[#F0EEF9] px-2 py-0.5 rounded-full border border-[#DCD8EC]">
                v{quote.version}
              </span>
            </div>

            <CardContent className="p-5">
              <Timeline>
                {/* Evento 1: Creación / Emisión */}
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot color="primary" sx={{ my: 0.5, p: 0.75 }}>
                      <i className="tabler-file-invoice text-xs" />
                    </TimelineDot>
                    {(quote.updated_at !== quote.created_at || quote.estado === 'APPROVED' || Boolean(quote.orden_venta_id) || quote.estado === 'CANCELED') && (
                      <TimelineConnector sx={{ backgroundColor: '#6C5CE7' }} />
                    )}
                  </TimelineSeparator>
                  <TimelineContent>
                    <div className="flex items-baseline justify-between gap-1 mb-0.5">
                      <span className="font-bold text-xs text-[#1E1B2E]">Cotización Emitida</span>
                      <span className="text-[10px] text-[#9CA3AF]">{quote.fecha_emision}</span>
                    </div>
                    <span className="text-[11px] text-[#6B7280] block">
                      Por: <strong className="text-[#1E1B2E]">{quote.creado_por || 'Asesor Comercial'}</strong>
                    </span>
                    <span className="text-[11px] text-[#6C5CE7] font-mono mt-0.5 block">
                      Tasa BCV: Bs. {quote.tasa_bcv.tasa.toFixed(2)}
                    </span>
                  </TimelineContent>
                </TimelineItem>

                {/* Evento 2: Recálculo de Tasa BCV (si aplica) */}
                {quote.updated_at !== quote.created_at && (
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color="info" sx={{ my: 0.5, p: 0.75 }}>
                        <i className="tabler-refresh text-xs" />
                      </TimelineDot>
                      {(quote.estado === 'APPROVED' || Boolean(quote.orden_venta_id) || quote.estado === 'CANCELED') && (
                        <TimelineConnector sx={{ backgroundColor: '#0284C7' }} />
                      )}
                    </TimelineSeparator>
                    <TimelineContent>
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#1E1B2E]">Tasa Actualizada</span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {new Date(quote.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6B7280] block">
                        Por: <strong className="text-[#1E1B2E]">Operador Comercial</strong>
                      </span>
                      <span className="text-[11px] text-[#0284C7] font-mono mt-0.5 block">
                        Nueva Tasa: Bs. {quote.tasa_bcv.tasa.toFixed(2)}
                      </span>
                    </TimelineContent>
                  </TimelineItem>
                )}

                {/* Evento 3: Aprobación Comercial (si aplica) */}
                {quote.estado === 'APPROVED' && (
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color="success" sx={{ my: 0.5, p: 0.75 }}>
                        <i className="tabler-circle-check text-xs" />
                      </TimelineDot>
                      {Boolean(quote.orden_venta_id) && (
                        <TimelineConnector sx={{ backgroundColor: '#10B981' }} />
                      )}
                    </TimelineSeparator>
                    <TimelineContent>
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#10B981]">Aprobada</span>
                        <span className="text-[10px] text-[#9CA3AF]">Comercial</span>
                      </div>
                      <span className="text-[11px] text-[#6B7280] block">
                        Por: <strong className="text-[#1E1B2E]">Gerencia de Ventas</strong>
                      </span>
                      <span className="text-[11px] text-[#10B981] mt-0.5 block">
                        Condiciones y precios ratificados
                      </span>
                    </TimelineContent>
                  </TimelineItem>
                )}

                {/* Evento 4: Orden de Venta Generada (si aplica) */}
                {Boolean(quote.orden_venta_id) && (
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot sx={{ my: 0.5, p: 0.75, bgcolor: '#6C5CE7', color: '#FFFFFF' }}>
                        <i className="tabler-truck-delivery text-xs" />
                      </TimelineDot>
                    </TimelineSeparator>
                    <TimelineContent>
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#6C5CE7]">Orden Generada</span>
                        <span className="text-[10px] font-mono font-bold text-[#6C5CE7]">
                          {quote.correlativo_orden}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6B7280] block">
                        Por: <strong className="text-[#1E1B2E]">Sistema de Despacho</strong>
                      </span>
                      <span className="text-[11px] text-[#6B7280] mt-0.5 block">
                        Stock reservado para facturación
                      </span>
                    </TimelineContent>
                  </TimelineItem>
                )}

                {/* Evento 5: Anulación (si aplica) */}
                {quote.estado === 'CANCELED' && (
                  <TimelineItem>
                    <TimelineSeparator>
                      <TimelineDot color="error" sx={{ my: 0.5, p: 0.75 }}>
                        <i className="tabler-ban text-xs" />
                      </TimelineDot>
                    </TimelineSeparator>
                    <TimelineContent>
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#EF4444]">Cotización Anulada</span>
                      </div>
                      <span className="text-[11px] text-[#6B7280] block">
                        Motivo: <strong className="text-[#EF4444]">{quote.motivo_anulacion || 'Sin motivo'}</strong>
                      </span>
                    </TimelineContent>
                  </TimelineItem>
                )}
              </Timeline>

              {/* Metadatos adicionales de vigencia */}
              <div className="mt-4 pt-3 border-t border-[#F4F3F8] flex flex-col gap-2 text-xs text-[#6B7280]">
                <div className="flex items-center justify-between">
                  <span>Vigencia:</span>
                  <strong className={isExpired ? 'text-[#EF4444]' : 'text-[#1E1B2E]'}>
                    {quote.fecha_vencimiento} ({quote.vigencia_dias} días)
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estado:</span>
                  <QuoteStatusChip status={quote.estado} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Columna Principal (8 cols): Ítems, Totales y Términos */}
        <Grid size={{ xs: 12, lg: 8 }} order={{ xs: 1, lg: 1 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            {/* Cabecera de Pestañas (Desplazador de Secciones) */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                borderBottom: '1px solid #E6E4F0',
                backgroundColor: '#FAFAFC',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#6B7280',
                  minHeight: 48,
                  '&.Mui-selected': {
                    color: '#6C5CE7'
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#6C5CE7',
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab
                icon={<i className="tabler-list-details text-base mr-1.5" />}
                iconPosition="start"
                label={`Líneas de Ítems (${quote.items.length})`}
              />
              <Tab
                icon={<i className="tabler-file-text text-base mr-1.5" />}
                iconPosition="start"
                label="Condiciones Comerciales"
              />
            </Tabs>

            <CardContent className="p-5">
              {/* Pestaña 0: Líneas de Ítems */}
              {activeTab === 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Typography variant="subtitle1" className="font-bold text-[#1E1B2E]">
                      Artículos Presupuestados
                    </Typography>
                    <span className="text-xs text-[#6B7280]">
                      Moneda Base: <strong className="text-[#6C5CE7]">{quote.moneda_base}</strong>
                    </span>
                  </div>

                  <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '14px' }}>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, py: 1 }}>Producto / Servicio</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 1 }}>Tipo</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, py: 1 }}>Cant.</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Precio ($)</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, py: 1 }}>Desc.</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, py: 1 }}>IVA</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Total ($)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, py: 1 }}>Total (Bs.)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quote.items.map((it, idx) => (
                          <TableRow key={it.id || idx} hover sx={{ height: 50 }}>
                            <TableCell sx={{ py: 1 }}>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm text-[#1E1B2E]">
                                  {it.producto_nombre}
                                </span>
                                <span className="text-xs text-[#6B7280]">
                                  SKU: {it.producto_sku}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Chip
                                size="small"
                                label={it.is_physical_stock ? 'Físico' : 'Servicio / Pedido'}
                                sx={{
                                  borderRadius: '9999px',
                                  fontSize: '0.68rem',
                                  height: 20,
                                  backgroundColor: it.is_physical_stock ? '#E8F5E9' : '#F0EEF9',
                                  color: it.is_physical_stock ? '#2E7D32' : '#6C5CE7'
                                }}
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, py: 1 }}>
                              {it.cantidad}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>
                              ${it.precio_unitario.toFixed(2)}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                              {it.descuento_porcentaje > 0 ? (
                                <span className="text-xs text-[#EF4444] font-medium">
                                  -{it.descuento_porcentaje}%
                                </span>
                              ) : (
                                <span className="text-xs text-[#9CA3AF]">—</span>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1 }}>
                              <Chip
                                size="small"
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
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#1E1B2E', py: 1 }}>
                              ${it.total_linea.toFixed(2)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: '#10B981', fontSize: '0.78rem', py: 1 }}>
                              Bs. {(it.total_linea * quote.tasa_bcv.tasa).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )}

              {/* Pestaña 1: Términos y Condiciones */}
              {activeTab === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#F8F7FC] p-4 rounded-xl border border-[#E6E4F0]">
                    <span className="font-bold text-sm text-[#1E1B2E] block mb-1">
                      Observaciones Comerciales
                    </span>
                    <p className="text-sm text-[#6B7280]">
                      {quote.observaciones || 'No se registraron observaciones comerciales específicas.'}
                    </p>
                  </div>

                  <div className="bg-[#F8F7FC] p-4 rounded-xl border border-[#E6E4F0]">
                    <span className="font-bold text-sm text-[#1E1B2E] block mb-1">
                      Términos y Condiciones de la Oferta
                    </span>
                    <p className="text-sm text-[#6B7280]">
                      {quote.terminos_condiciones || 'Términos estándar del ERP Foundly aplicables para ventas y cotizaciones.'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totales Bimonetarios en Columna Principal */}
          <div className="mt-4">
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
          </div>
        </Grid>
      </Grid>

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
