'use client';

import React, { useState, useEffect, useCallback } from 'react';

import Link from 'next/link';

import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import CustomChip from '@core/components/mui/Chip';
import type { BcvRate, Quote, QuotesFilterState, QuoteVisibleColumns } from '@/types/salesQuotesTypes';
import { salesQuotesService } from '@/services/salesQuotesService';
import { QuotesListFilters } from './components/QuotesListFilters';
import { QuotesTable } from './components/QuotesTable';
import { QuotesMobileList } from './components/QuotesMobileList';
import { QuotesTableSkeleton } from './components/QuotesTableSkeleton';
import { QuoteQuickViewDrawer } from './components/QuoteQuickViewDrawer';
import { CancelQuoteModal } from './components/CancelQuoteModal';

export const QuotesListView: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width:768px)');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [, setBcvRate] = useState<BcvRate | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<QuotesFilterState>({
    search: '',
    estado: 'ALL'
  });

  // Selección múltiple y control de columnas
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<QuoteVisibleColumns>({
    cliente: true,
    emision: true,
    vencimiento: true,
    montoUsd: true,
    montoVes: true,
    estado: true
  });

  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLElement | null>(null);
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [batchCancelConfirmOpen, setBatchCancelConfirmOpen] = useState(false);

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

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(quotes.map(q => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBatchCopy = () => {
    const selectedQuotes = quotes.filter(q => selectedIds.includes(q.id));
    const codes = selectedQuotes.map(q => q.correlativo).join(', ');

    navigator.clipboard.writeText(codes);
    setBatchMenuAnchorEl(null);
    setToast({
      open: true,
      message: `${selectedQuotes.length} correlativos copiados al portapapeles.`,
      severity: 'info'
    });
  };

  const handleConfirmBatchCancel = async () => {
    setBatchCancelConfirmOpen(false);
    const count = selectedIds.length;

    for (const id of selectedIds) {
      await salesQuotesService.cancelQuote(id, 'Anulación masiva desde listado de ventas');
    }

    setToast({
      open: true,
      message: `${count} cotizaciones anuladas exitosamente.`,
      severity: 'warning'
    });
    setSelectedIds([]);
    loadData();
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
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Controles de Selección Múltiple en Cabecera */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <CustomChip
                size="small"
                variant="tonal"
                color="primary"
                label={`${selectedIds.length} seleccionados`}
                onDelete={() => setSelectedIds([])}
              />

              <Button
                variant="outlined"
                onClick={e => setBatchMenuAnchorEl(e.currentTarget)}
                startIcon={<i className="tabler-settings text-base" />}
                endIcon={<i className="tabler-chevron-down text-xs" />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  px: 2.5,
                  py: 1,
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
            Nuevo
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
        <div className="flex flex-col gap-3">
          {/* Barra de Conteo y Control de Columnas */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-1">
            <div className="flex items-center gap-2.5">
              <Typography variant="h6" className="font-semibold text-[#1E1B2E] text-base">
                Listado de Cotizaciones
              </Typography>
              <CustomChip
                size="small"
                variant="tonal"
                color="primary"
                label={`${quotes.length} ${quotes.length === 1 ? 'registro' : 'registros'}`}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<i className="tabler-layout-columns text-base" />}
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

          <QuotesTable
            quotes={quotes}
            onSelectQuote={handleSelectQuote}
            onCancelQuote={handleOpenCancelModal}
            onCopyCorrelativo={handleCopyCorrelativo}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            visibleColumns={visibleColumns}
          />
        </div>
      ) : (
        <QuotesMobileList
          quotes={quotes}
          onSelectQuote={handleSelectQuote}
          onCancelQuote={handleOpenCancelModal}
          onCopyCorrelativo={handleCopyCorrelativo}
        />
      )}

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
        <Typography variant="caption" className="font-bold text-[#6B7280] px-3 py-1 block uppercase text-[10px]">
          Columnas Visibles
        </Typography>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, cliente: !prev.cliente }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.cliente)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Cliente / Razón Social</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, emision: !prev.emision }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.emision)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Fecha Emisión</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, vencimiento: !prev.vencimiento }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.vencimiento)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Vencimiento</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, montoUsd: !prev.montoUsd }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.montoUsd)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Monto (USD)</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, montoVes: !prev.montoVes }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.montoVes)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Monto (VES)</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, estado: !prev.estado }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.estado)}
            size="small"
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant="body2" className="text-sm">Estado</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setVisibleColumns({
              cliente: true,
              emision: true,
              vencimiento: true,
              montoUsd: true,
              montoVes: true,
              estado: true
            });
            setColumnAnchorEl(null);
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className="tabler-rotate text-sm mr-2" /> Restablecer Columnas
        </MenuItem>
      </Menu>

      {/* Menú de Acciones en Lote (Acciones / Engranaje) */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={() => setBatchMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 0.75,
              minWidth: 210,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <MenuItem
          onClick={handleBatchCopy}
          sx={{
            color: '#1E1B2E',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F8F7FC' }
          }}
        >
          <i className="tabler-copy text-base text-[#6C5CE7]" />
          <span className="font-semibold text-sm">Copiar correlativos ({selectedIds.length})</span>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null);
            setBatchCancelConfirmOpen(true);
          }}
          sx={{
            color: '#EF4444',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#FEF2F2' }
          }}
        >
          <i className="tabler-ban text-base text-[#EF4444]" />
          <span className="font-semibold text-sm">Anular cotizaciones ({selectedIds.length})</span>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setBatchMenuAnchorEl(null);
            setSelectedIds([]);
          }}
          sx={{
            color: '#6B7280',
            borderRadius: '10px',
            py: 1,
            gap: 1.5,
            '&:hover': { backgroundColor: '#F9FAFB' }
          }}
        >
          <i className="tabler-x text-base text-[#6B7280]" />
          <span className="text-sm">Deseleccionar</span>
        </MenuItem>
      </Menu>

      {/* Diálogo de Confirmación para Anulación en Lote */}
      <Dialog
        open={batchCancelConfirmOpen}
        onClose={() => setBatchCancelConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle className="flex items-center gap-2 text-error font-bold pb-2">
          <i className="tabler-alert-triangle text-2xl text-red-500" />
          <span>Anular {selectedIds.length} cotizaciones</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-[#4B5563]">
            ¿Estás seguro de que deseas anular las{' '}
            <strong className="text-[#1E1B2E]">
              {selectedIds.length} cotizaciones seleccionadas
            </strong>? Esta acción cambiará su estado a Anulada sin eliminar el registro histórico.
          </Typography>
        </DialogContent>
        <DialogActions className="pt-2 pb-3 px-4">
          <Button
            variant="outlined"
            onClick={() => setBatchCancelConfirmOpen(false)}
            sx={{ borderRadius: '9999px', color: '#6B7280' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<i className="tabler-ban" />}
            onClick={handleConfirmBatchCancel}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              px: 3,
              fontWeight: 600,
              '&:hover': { backgroundColor: '#DC2626' }
            }}
          >
            Sí, Anular Cotizaciones
          </Button>
        </DialogActions>
      </Dialog>

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
