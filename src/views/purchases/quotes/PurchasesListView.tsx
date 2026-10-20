'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import useMediaQuery from '@mui/material/useMediaQuery'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { BcvRate, PurchaseQuote, PurchasesFilterState, PurchaseVisibleColumns, SupplierLookup } from '@/types/purchasesTypes'
import { purchasesService } from '@/services/purchasesService'
import { PurchasesListFilters } from './components/PurchasesListFilters'
import { PurchasesTable } from './components/PurchasesTable'
import { PurchasesMobileList } from './components/PurchasesMobileList'
import { PurchasesTableSkeleton } from './components/PurchasesTableSkeleton'
import { PurchaseQuickViewDrawer } from './components/PurchaseQuickViewDrawer'
import { CancelPurchaseModal } from './components/CancelPurchaseModal'
import { BcvRateBadge } from './components/BcvRateBadge'

export const PurchasesListView: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width:768px)')

  const [quotes, setQuotes] = useState<PurchaseQuote[]>([])
  const [suppliers, setSuppliers] = useState<SupplierLookup[]>([])
  const [bcvRate, setBcvRate] = useState<BcvRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [filters, setFilters] = useState<PurchasesFilterState>({
    search: '',
    estado: 'ALL',
    proveedor_id: 'ALL'
  })

  // Selección múltiple y control de columnas
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<PurchaseVisibleColumns>({
    refProveedor: true,
    fechaVigencia: true,
    costoUsd: true,
    costoVes: true,
    estado: true
  })
  const [columnAnchorEl, setColumnAnchorEl] = useState<HTMLElement | null>(null)
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [batchCancelConfirmOpen, setBatchCancelConfirmOpen] = useState(false)

  // Drawer de Vista Rápida
  const [selectedQuote, setSelectedQuote] = useState<PurchaseQuote | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Modal de Anulación
  const [quoteToCancel, setQuoteToCancel] = useState<PurchaseQuote | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  // Toast Feedback
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [quotesData, suppliersData, rateData] = await Promise.all([
        purchasesService.getPurchaseQuotes(filters),
        purchasesService.getSuppliers(),
        purchasesService.getActiveBcvRate()
      ])
      setQuotes(quotesData)
      setSuppliers(suppliersData)
      setBcvRate(rateData)
    } catch (err: any) {
      const msg = err?.message || 'Error al consultar el ciclo de compras.'
      setLoadError(msg)
      setToast({
        open: true,
        message: msg,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // KPIs de Abastecimiento (Regla R3 - CardStatsHorizontalWithAvatar adaptada a Foundly Clean Light UI)
  const kpis = useMemo(() => {
    const activeDocs = quotes.filter(q => q.estado !== 'CANCELED')
    const rfqCount = quotes.filter(q => q.estado === 'RFQ_SENT').length
    const approvedCount = quotes.filter(q => q.estado === 'APPROVED').length
    const poCount = quotes.filter(q => q.estado === 'PURCHASE_ORDER').length
    const totalCommittedUsd = activeDocs.reduce((acc, q) => acc + q.total_usd, 0)
    const totalCommittedVes = activeDocs.reduce((acc, q) => acc + q.total_ves, 0)

    return {
      rfqCount,
      approvedCount,
      poCount,
      totalCommittedUsd,
      totalCommittedVes
    }
  }, [quotes])

  const handleSelectQuote = (quote: PurchaseQuote) => {
    setSelectedQuote(quote)
    setDrawerOpen(true)
  }

  const handleOpenCancelModal = (quote: PurchaseQuote) => {
    setQuoteToCancel(quote)
    setCancelModalOpen(true)
  }

  const handleConfirmCancel = async (motivo: string) => {
    if (!quoteToCancel) return
    await purchasesService.cancelPurchaseQuote(quoteToCancel.id, motivo)
    setToast({
      open: true,
      message: `Documento ${quoteToCancel.correlativo_orden_compra || quoteToCancel.correlativo} anulado exitosamente.`,
      severity: 'warning'
    })
    setCancelModalOpen(false)
    setQuoteToCancel(null)
    loadData()
  }

  const handleCopyCorrelativo = (correlativo: string) => {
    navigator.clipboard.writeText(correlativo)
    setToast({
      open: true,
      message: `Correlativo "${correlativo}" copiado al portapapeles.`,
      severity: 'info'
    })
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(quotes.map(q => q.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBatchCopy = () => {
    const selectedQuotes = quotes.filter(q => selectedIds.includes(q.id))
    const codes = selectedQuotes.map(q => q.correlativo_orden_compra || q.correlativo).join(', ')
    navigator.clipboard.writeText(codes)
    setBatchMenuAnchorEl(null)
    setToast({
      open: true,
      message: `${selectedQuotes.length} correlativos copiados al portapapeles.`,
      severity: 'info'
    })
  }

  const handleConfirmBatchCancel = async () => {
    setBatchCancelConfirmOpen(false)
    const count = selectedIds.length
    for (const id of selectedIds) {
      await purchasesService.cancelPurchaseQuote(id, 'Anulación masiva desde listado de compras')
    }
    setToast({
      open: true,
      message: `${count} compras anuladas exitosamente.`,
      severity: 'warning'
    })
    setSelectedIds([])
    loadData()
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      estado: 'ALL',
      proveedor_id: 'ALL',
      fecha_desde: undefined,
      fecha_hasta: undefined
    })
  }

  return (
    <div className='flex flex-col gap-5 p-1'>
      {/* Header Principal */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <div className='flex flex-wrap items-center gap-3'>
            <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
              Compras y Abastecimiento
            </Typography>
            {bcvRate && <BcvRateBadge rate={bcvRate} onRefresh={loadData} />}
          </div>
          <Typography variant='body2' className='text-[#6B7280] mt-1'>
            Solicitudes de cotización y órdenes de compra
          </Typography>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          {/* Controles de Selección Múltiple en Cabecera */}
          {selectedIds.length > 0 && (
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1.5 bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF] px-3 py-1.5 rounded-full text-xs font-semibold'>
                <span>{selectedIds.length} seleccionados</span>
                <Tooltip title='Deseleccionar'>
                  <IconButton
                    size='small'
                    onClick={() => setSelectedIds([])}
                    sx={{ p: 0.2, ml: 0.5, color: '#6C5CE7', '&:hover': { color: '#4B3AA6' } }}
                  >
                    <i className='tabler-x text-xs' />
                  </IconButton>
                </Tooltip>
              </div>

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
            href='/purchases/quotes/create'
            variant='contained'
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
            startIcon={<i className='tabler-plus text-base' />}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* Tarjetas de KPIs de Abastecimiento */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.04)'
            }}
          >
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <span className='text-xs font-medium text-[#6B7280]'>Cotizaciones por Evaluar</span>
                <Typography variant='h5' className='font-bold text-[#1E1B2E] mt-0.5'>
                  {kpis.rfqCount}
                </Typography>
                <span className='text-[11px] text-[#0284C7] font-medium'>Estado: RFQ_SENT</span>
              </div>
              <span className='w-11 h-11 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center'>
                <i className='tabler-file-search text-xl' />
              </span>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.04)'
            }}
          >
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <span className='text-xs font-medium text-[#6B7280]'>Listas para Orden de Compra</span>
                <Typography variant='h5' className='font-bold text-[#10B981] mt-0.5'>
                  {kpis.approvedCount}
                </Typography>
                <span className='text-[11px] text-[#10B981] font-medium'>Presupuestos Aprobados</span>
              </div>
              <span className='w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#10B981] flex items-center justify-center'>
                <i className='tabler-circle-check text-xl' />
              </span>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.04)'
            }}
          >
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <span className='text-xs font-medium text-[#6B7280]'>Órdenes de Compra en Firme</span>
                <Typography variant='h5' className='font-bold text-[#6C5CE7] mt-0.5'>
                  {kpis.poCount}
                </Typography>
                <span className='text-[11px] text-[#6C5CE7] font-medium'>Tránsito y CxP Habilitados</span>
              </div>
              <span className='w-11 h-11 rounded-2xl bg-[#F0EEF9] text-[#6C5CE7] flex items-center justify-center'>
                <i className='tabler-truck-delivery text-xl' />
              </span>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.04)'
            }}
          >
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <span className='text-xs font-medium text-[#6B7280]'>Compromiso Activo (USD/VES)</span>
                <Typography variant='h6' className='font-bold text-[#1E1B2E] mt-0.5'>
                  ${kpis.totalCommittedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
                <span className='text-[11px] text-[#10B981] font-semibold'>
                  Bs. {kpis.totalCommittedVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className='w-11 h-11 rounded-2xl bg-[#F4F3F8] text-[#1E1B2E] flex items-center justify-center'>
                <i className='tabler-Arrows-exchange text-xl' />
              </span>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros de Búsqueda */}
      <PurchasesListFilters
        filters={filters}
        suppliers={suppliers}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Fallback UI ante error o Tabla / Lista Móvil */}
      {loadError ? (
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #FCA5A5',
            p: 4,
            textAlign: 'center'
          }}
        >
          <div className='flex flex-col items-center gap-3'>
            <span className='w-12 h-12 rounded-full bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center'>
              <i className='tabler-alert-octagon text-2xl' />
            </span>
            <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
              No se pudo cargar el listado de compras
            </Typography>
            <Typography variant='body2' className='text-[#6B7280]'>
              {loadError}
            </Typography>
            <Button
              variant='contained'
              onClick={loadData}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600
              }}
              startIcon={<i className='tabler-refresh text-base' />}
            >
              Reintentar
            </Button>
          </div>
        </Card>
      ) : loading ? (
        <PurchasesTableSkeleton />
      ) : isDesktop ? (
        <div className='flex flex-col gap-3'>
          {/* Barra de Conteo y Control de Columnas */}
          <div className='flex items-center justify-between flex-wrap gap-3 px-1'>
            <div className='flex items-center gap-2.5'>
              <Typography variant='h6' className='font-semibold text-[#1E1B2E] text-base'>
                Listado de Compras
              </Typography>
              <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF]'>
                {quotes.length} {quotes.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className='flex items-center gap-2 flex-wrap'>
              <Button
                size='small'
                variant='outlined'
                startIcon={<i className='tabler-layout-columns text-base' />}
                onClick={e => setColumnAnchorEl(e.currentTarget)}
                sx={{
                  borderRadius: '8px',
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

          <PurchasesTable
            quotes={quotes}
            activeBcvRate={bcvRate?.tasa || 36.5}
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
        <PurchasesMobileList
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
        <Typography variant='caption' className='font-bold text-[#6B7280] px-3 py-1 block uppercase text-[10px]'>
          Columnas Visibles
        </Typography>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, refProveedor: !prev.refProveedor }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.refProveedor)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Ref. Proveedor</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, fechaVigencia: !prev.fechaVigencia }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.fechaVigencia)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Fecha / Vigencia</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, costoUsd: !prev.costoUsd }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.costoUsd)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Total (USD)</Typography>
        </MenuItem>
        <MenuItem
          dense
          onClick={() => setVisibleColumns(prev => ({ ...prev, costoVes: !prev.costoVes }))}
          sx={{ borderRadius: '8px' }}
        >
          <Checkbox
            checked={Boolean(visibleColumns.costoVes)}
            size='small'
            sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }}
          />
          <Typography variant='body2' className='text-sm'>Total (VES)</Typography>
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
              refProveedor: true,
              fechaVigencia: true,
              costoUsd: true,
              costoVes: true,
              estado: true
            })
            setColumnAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className='tabler-rotate text-sm mr-2' /> Restablecer Columnas
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
          <i className='tabler-copy text-base text-[#6C5CE7]' />
          <span className='font-semibold text-sm'>Copiar correlativos ({selectedIds.length})</span>
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
          <span className='font-semibold text-sm'>Anular compras ({selectedIds.length})</span>
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

      {/* Diálogo de Confirmación para Anulación en Lote */}
      <Dialog
        open={batchCancelConfirmOpen}
        onClose={() => setBatchCancelConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle className='flex items-center gap-2 text-error font-bold pb-2'>
          <i className='tabler-alert-triangle text-2xl text-red-500' />
          <span>Anular {selectedIds.length} compras</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' className='text-[#4B5563]'>
            ¿Estás seguro de que deseas anular las{' '}
            <strong className='text-[#1E1B2E]'>
              {selectedIds.length} compras seleccionadas
            </strong>? Esta acción cambiará su estado a Anulada sin eliminar el registro histórico.
          </Typography>
        </DialogContent>
        <DialogActions className='pt-2 pb-3 px-4'>
          <Button
            variant='outlined'
            onClick={() => setBatchCancelConfirmOpen(false)}
            sx={{ borderRadius: '9999px', color: '#6B7280' }}
          >
            Volver
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
            Anular Compras
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawer Lateral de Vista Rápida */}
      <PurchaseQuickViewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        quote={selectedQuote}
      />

      {/* Modal de Anulación (HU4) */}
      {quoteToCancel && (
        <CancelPurchaseModal
          open={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false)
            setQuoteToCancel(null)
          }}
          onConfirm={handleConfirmCancel}
          correlativo={quoteToCancel.correlativo_orden_compra || quoteToCancel.correlativo}
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
          variant='filled'
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
  )
}
