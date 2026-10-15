'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { BcvRate, Quote, QuotesFilterState } from '@/types/salesQuotesTypes';
import { salesQuotesService } from '@/services/salesQuotesService';
import { QuotesListFilters } from './components/QuotesListFilters';
import { QuotesTable } from './components/QuotesTable';
import { QuotesMobileList } from './components/QuotesMobileList';
import { QuotesTableSkeleton } from './components/QuotesTableSkeleton';
import { QuoteQuickViewDrawer } from './components/QuoteQuickViewDrawer';
import { CancelQuoteModal } from './components/CancelQuoteModal';
import { BcvRateBadge } from './components/BcvRateBadge';

export const QuotesListView: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width:768px)');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bcvRate, setBcvRate] = useState<BcvRate | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<QuotesFilterState>({
    search: '',
    estado: 'ALL'
  });

  // Drawer de Vista Rápida
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modal de Anulación
  const [quoteToCancel, setQuoteToCancel] = useState<Quote | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Toast Feedback
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesData, rateData] = await Promise.all([
        salesQuotesService.getQuotes(filters),
        salesQuotesService.getActiveBcvRate()
      ]);
      setQuotes(quotesData);
      setBcvRate(rateData);
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Error al cargar las cotizaciones.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setDrawerOpen(true);
  };

  const handleOpenCancelModal = (quote: Quote) => {
    setQuoteToCancel(quote);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (motivo: string) => {
    if (!quoteToCancel) return;
    await salesQuotesService.cancelQuote(quoteToCancel.id, motivo);
    setToast({
      open: true,
      message: `Cotización ${quoteToCancel.correlativo} anulada exitosamente.`,
      severity: 'warning'
    });
    setCancelModalOpen(false);
    setQuoteToCancel(null);
    loadData();
  };

  const handleCopyCorrelativo = (correlativo: string) => {
    navigator.clipboard.writeText(correlativo);
    setToast({
      open: true,
      message: `Correlativo "${correlativo}" copiado al portapapeles.`,
      severity: 'info'
    });
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      estado: 'ALL',
      fecha_desde: undefined,
      fecha_hasta: undefined
    });
  };

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* Header Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Typography variant="h4" className="font-bold text-[#1E1B2E]">
              Ventas y Cotizaciones
            </Typography>
            {bcvRate && <BcvRateBadge rate={bcvRate} onRefresh={loadData} />}
          </div>
          <Typography variant="body2" className="text-[#6B7280] mt-1">
            Gestión comercial integral, presupuestos bimonetarios y emisión de órdenes de venta
          </Typography>
        </div>

        <div className="flex items-center gap-2">
          <Button
            component={Link}
            href="/sales/quotes/create"
            variant="contained"
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.2,
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
              '&:hover': {
                backgroundColor: '#5B4CDB',
                boxShadow: '0 6px 18px rgba(108, 92, 231, 0.45)'
              }
            }}
            startIcon={<i className="tabler-plus text-base" />}
          >
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <QuotesListFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Contenido Principal: Tabla o Tarjetas Móviles */}
      {loading ? (
        <QuotesTableSkeleton />
      ) : isDesktop ? (
        <QuotesTable
          quotes={quotes}
          onSelectQuote={handleSelectQuote}
          onCancelQuote={handleOpenCancelModal}
          onCopyCorrelativo={handleCopyCorrelativo}
        />
      ) : (
        <QuotesMobileList
          quotes={quotes}
          onSelectQuote={handleSelectQuote}
          onCancelQuote={handleOpenCancelModal}
          onCopyCorrelativo={handleCopyCorrelativo}
        />
      )}

      {/* Drawer Lateral de Vista Rápida */}
      <QuoteQuickViewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        quote={selectedQuote}
      />

      {/* Modal de Anulación */}
      {quoteToCancel && (
        <CancelQuoteModal
          open={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false);
            setQuoteToCancel(null);
          }}
          onConfirm={handleConfirmCancel}
          correlativo={quoteToCancel.correlativo}
        />
      )}

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
