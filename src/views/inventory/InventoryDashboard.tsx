'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

import type {
  ProductTemplate,
  WarehouseOperationsDashboard,
  StockMovement
} from '@/types/inventoryTypes'
import {
  getInventoryTemplates,
  getWarehouseOperationsDashboard,
  getStockMovements,
  getFiscalConfig
} from '@/services/inventoryService'
import InventoryStatsCards from './InventoryStatsCards'
import ProductFormDrawer from './components/ProductFormDrawer'
import StockAdjustmentModal from './components/StockAdjustmentModal'

const InventoryDashboard = () => {
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [ops, setOps] = useState<WarehouseOperationsDashboard | null>(null)
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([])
  const [opFilter, setOpFilter] = useState<'ALL' | 'DELIVERY' | 'RECEIPT' | 'INTERNAL_TRANSFER'>('ALL')
  const [fiscalEnabled, setFiscalEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  // Modals / Drawers
  const [productDrawerOpen, setProductDrawerOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [preselectedProduct, setPreselectedProduct] = useState<ProductTemplate | null>(null)

  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info'
  }>({ open: false, message: '', severity: 'success' })

  const loadDashboardData = async () => {
    setLoading(true)
    const [tpls, dashOps, movs] = await Promise.all([
      getInventoryTemplates(),
      getWarehouseOperationsDashboard(),
      getStockMovements()
    ])
    const fiscal = getFiscalConfig()

    setTemplates(tpls)
    setOps(dashOps)
    setRecentMovements(movs.slice(0, 5))
    setFiscalEnabled(fiscal.enabled)
    setLoading(false)
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Critical stock items
  const criticalItems = templates.filter(t => {
    if (t.productType === 'service') return false
    const avail = t.variants.reduce((acc, v) => acc + v.availableStock, 0)

    return avail === 0 || (t.minStock && avail <= t.minStock)
  })

  const filteredOperations =
    ops?.operaciones_recientes.filter(o => (opFilter === 'ALL' ? true : o.tipo === opFilter)) || []

  if (loading || !ops) {
    return (
      <div className='flex flex-col gap-6'>
        <Skeleton variant='rounded' height={64} />
        <Grid container spacing={4}>
          {[1, 2, 3, 4].map(i => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton variant='rounded' height={135} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={340} />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Top Header & Quick Actions */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Inventario & Almacén
          </Typography>
          <Typography variant='body2' className='text-[#6B7280] mt-0.5'>
            Flujo operativo, transferencias y control de almacén
          </Typography>
        </div>

        {/* Action Pills */}
        <div className='flex items-center gap-2 flex-wrap'>
          <Button
            component={Link}
            href='/inventory/products'
            variant='outlined'
            size='small'
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#DCD8EC',
              color: '#1E1B2E',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { backgroundColor: '#F4F3F8' }
            }}
            startIcon={<i className='tabler-box text-sm text-[#6C5CE7]' />}
          >
            Catálogo ({ops.total_articulos_catalogo})
          </Button>

          <Button
            component={Link}
            href='/inventory/settings/locations'
            variant='outlined'
            size='small'
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#DCD8EC',
              color: '#1E1B2E',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { backgroundColor: '#F4F3F8' }
            }}
            startIcon={<i className='tabler-map-pin text-sm text-[#6C5CE7]' />}
          >
            Ubicaciones
          </Button>

          <Button
            component={Link}
            href='/inventory/settings/warehouses'
            variant='outlined'
            size='small'
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#DCD8EC',
              color: '#1E1B2E',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { backgroundColor: '#F4F3F8' }
            }}
            startIcon={<i className='tabler-building-warehouse text-sm text-[#6C5CE7]' />}
          >
            Almacenes
          </Button>

          <Button
            component={Link}
            href='/inventory/kardex'
            variant='outlined'
            size='small'
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#DCD8EC',
              color: '#1E1B2E',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { backgroundColor: '#F4F3F8' }
            }}
            startIcon={<i className='tabler-arrows-exchange text-sm text-[#6C5CE7]' />}
          >
            Kárdex
          </Button>

          <Button
            variant='outlined'
            size='small'
            onClick={() => {
              setPreselectedProduct(null)
              setAdjustModalOpen(true)
            }}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              borderColor: '#6C5CE7',
              color: '#6C5CE7',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { backgroundColor: '#F0EEF9' }
            }}
            startIcon={<i className='tabler-adjustments-horizontal text-sm' />}
          >
            Ajuste Rápido
          </Button>

          <Button
            variant='contained'
            size='small'
            onClick={() => setProductDrawerOpen(true)}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 2.5,
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.3)',
              '&:hover': { backgroundColor: '#5B4CDB' }
            }}
            startIcon={<i className='tabler-plus text-sm' />}
          >
            Nuevo
          </Button>
        </div>
      </div>

      {/* 4 KPI Operational Cards */}
      <InventoryStatsCards ops={ops} />

      {/* Main Two-Column Operational Workspace */}
      <Grid container spacing={5}>
        {/* Left Column: Entregas y Recepciones Programadas */}
        <Grid size={{ xs: 12, lg: 7 }} className='flex flex-col gap-5'>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className='p-5 flex flex-col gap-4'>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <div>
                  <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                    <i className='tabler-forklift text-[#6C5CE7]' /> Flujo de Operaciones de Almacén
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Recepciones de proveedores, despachos de ventas y transferencias internas activas
                  </span>
                </div>

                {/* Filter Pills */}
                <div className='flex items-center gap-1 bg-[#F4F3F8] p-1 rounded-full flex-wrap'>
                  {[
                    { key: 'ALL', label: 'Todas' },
                    { key: 'RECEIPT', label: 'Recepciones (IN)' },
                    { key: 'DELIVERY', label: 'Entregas (OUT)' },
                    { key: 'INTERNAL_TRANSFER', label: 'Transferencias (INT)' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type='button'
                      onClick={() => setOpFilter(tab.key as any)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        opFilter === tab.key
                          ? 'bg-[#6C5CE7] text-white shadow-xs'
                          : 'text-[#6B7280] hover:text-[#1E1B2E]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <Divider sx={{ borderColor: '#E6E4F0' }} />

              <div className='flex flex-col gap-2.5'>
                {filteredOperations.map(op => {
                  const isDelivery = op.tipo === 'DELIVERY'
                  const isTransfer = op.tipo === 'INTERNAL_TRANSFER'
                  const targetHref =
                    op.tipo === 'RECEIPT'
                      ? '/inventory/operations/receipts'
                      : op.tipo === 'DELIVERY'
                      ? '/inventory/operations/deliveries'
                      : '/inventory/operations/transfers'

                  return (
                    <Link
                      key={op.id}
                      href={targetHref}
                      className='p-3.5 rounded-2xl border border-[#E6E4F0] hover:border-[#6C5CE7]/60 bg-[#FAFAFC] flex items-center justify-between gap-3 flex-wrap transition-all'
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isDelivery
                              ? 'bg-[#E0F2FE] text-[#0284C7]'
                              : isTransfer
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#F0EEF9] text-[#6C5CE7]'
                          }`}
                        >
                          <i
                            className={
                              isDelivery
                                ? 'tabler-package-export text-lg'
                                : isTransfer
                                ? 'tabler-arrows-left-right text-lg'
                                : 'tabler-package-import text-lg'
                            }
                          />
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono font-bold text-xs text-[#6C5CE7]'>
                              {op.codigo}
                            </span>
                            <Chip
                              size='small'
                              label={
                                isDelivery
                                  ? 'Despacho Venta'
                                  : isTransfer
                                  ? 'Transferencia Interna'
                                  : 'Recepción Compra'
                              }
                              sx={{
                                borderRadius: '9999px',
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: isDelivery
                                  ? '#E0F2FE'
                                  : isTransfer
                                  ? '#FEF3C7'
                                  : '#F0EEF9',
                                color: isDelivery
                                  ? '#0284C7'
                                  : isTransfer
                                  ? '#D97706'
                                  : '#6C5CE7'
                              }}
                            />
                          </div>
                          <span className='font-semibold text-sm text-[#1E1B2E] block mt-0.5'>
                            {op.tercero_nombre}
                          </span>
                          <span className='text-xs text-[#6B7280]'>
                            {op.almacen_origen_nombre && op.almacen_destino_nombre
                              ? `${op.almacen_origen_nombre} → ${op.almacen_destino_nombre} · `
                              : ''}
                            Fecha: {op.fecha_programada} ·{' '}
                            <strong>{op.total_articulos} unidades</strong>
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Chip
                          size='small'
                          label={
                            op.estado === 'READY'
                              ? 'Listo p/ Procesar'
                              : op.estado === 'LATE'
                              ? 'Retrasado'
                              : 'En Espera'
                          }
                          sx={{
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 22,
                            backgroundColor:
                              op.estado === 'READY'
                                ? '#E8F5E9'
                                : op.estado === 'LATE'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                            color:
                              op.estado === 'READY'
                                ? '#10B981'
                                : op.estado === 'LATE'
                                ? '#EF4444'
                                : '#D97706'
                          }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Últimos Movimientos en el Kárdex */}
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
                  <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                    <i className='tabler-history text-[#6C5CE7]' /> Movimientos Recientes (Kárdex)
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Últimas entradas, salidas y ajustes asentados en almacén
                  </span>
                </div>
                <Button
                  component={Link}
                  href='/inventory/kardex'
                  size='small'
                  sx={{
                    borderRadius: '9999px',
                    textTransform: 'none',
                    color: '#6C5CE7',
                    fontWeight: 600
                  }}
                  endIcon={<i className='tabler-arrow-right text-sm' />}
                >
                  Ver Kárdex Completo
                </Button>
              </div>

              <Divider sx={{ borderColor: '#E6E4F0' }} />

              <div className='flex flex-col divide-y divide-[#F4F3F8]'>
                {recentMovements.map(mov => {
                  const isEntry = mov.cantidad_entrada > 0

                  return (
                    <div
                      key={mov.id}
                      className='py-2.5 flex items-center justify-between gap-2 text-xs'
                    >
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold ${
                            isEntry
                              ? 'bg-[#E8F5E9] text-[#10B981]'
                              : 'bg-[#FEE2E2] text-[#EF4444]'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                        </span>
                        <div className='min-w-0'>
                          <span className='font-bold text-[#1E1B2E] block truncate'>
                            {mov.producto_nombre}{' '}
                            <small className='font-mono text-[#6C5CE7]'>({mov.variante_sku})</small>
                          </span>
                          <span className='text-[#6B7280] text-[11px]'>
                            Ref: <strong>{mov.documento_referencia}</strong> ·{' '}
                            {new Date(mov.fecha).toLocaleDateString('es-VE')}
                          </span>
                        </div>
                      </div>

                      <div className='text-right shrink-0'>
                        <span
                          className={`font-bold text-sm block ${
                            isEntry ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isEntry
                            ? `+${mov.cantidad_entrada}`
                            : `-${mov.cantidad_salida}`}{' '}
                          {mov.uom_code}
                        </span>
                        <span className='text-[10px] text-[#9CA3AF]'>
                          Saldo: {mov.saldo_resultante} {mov.uom_code}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Alertas de Stock Crítico y Accesos Directos */}
        <Grid size={{ xs: 12, lg: 5 }} className='flex flex-col gap-5'>
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
                <div>
                  <Typography variant='h6' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                    <i className='tabler-bell-ringing text-[#F59E0B]' /> Alertas de Stock y Reposición
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Artículos por debajo del stock mínimo o agotados
                  </span>
                </div>
                <Chip
                  size='small'
                  label={`${criticalItems.length} críticos`}
                  sx={{
                    borderRadius: '9999px',
                    backgroundColor: '#FEF3C7',
                    color: '#D97706',
                    fontWeight: 700,
                    fontSize: '0.7rem'
                  }}
                />
              </div>

              <Divider sx={{ borderColor: '#E6E4F0' }} />

              {criticalItems.length === 0 ? (
                <div className='p-6 text-center text-[#10B981]'>
                  <i className='tabler-circle-check text-3xl mb-1 inline-block' />
                  <p className='text-xs font-semibold'>
                    Todos los productos almacenables superan el stock mínimo.
                  </p>
                </div>
              ) : (
                <div className='flex flex-col gap-2.5'>
                  {criticalItems.map(item => {
                    const avail = item.variants.reduce((acc, v) => acc + v.availableStock, 0)
                    const isZero = avail === 0

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 ${
                          isZero
                            ? 'bg-[#FFF5F5] border-[#FCA5A5]'
                            : 'bg-[#FFFBEB] border-[#FDE68A]'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono text-xs font-bold text-[#1E1B2E]'>
                              {item.defaultCode}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isZero
                                  ? 'bg-[#FEE2E2] text-[#EF4444]'
                                  : 'bg-[#FEF3C7] text-[#D97706]'
                              }`}
                            >
                              {isZero ? 'Agotado (0)' : `Stock Bajo (${avail} ${item.uomCode})`}
                            </span>
                          </div>
                          <Link
                            href={`/inventory/products/${item.id}`}
                            className='font-bold text-sm text-[#1E1B2E] hover:text-[#6C5CE7] truncate block mt-0.5'
                          >
                            {item.name}
                          </Link>
                          <span className='text-[11px] text-[#6B7280]'>
                            Mínimo requerido: <strong>{item.minStock || 5} {item.uomCode}</strong>
                          </span>
                        </div>

                        <Button
                          size='small'
                          variant='contained'
                          onClick={() => {
                            setPreselectedProduct(item)
                            setAdjustModalOpen(true)
                          }}
                          sx={{
                            borderRadius: '9999px',
                            textTransform: 'none',
                            backgroundColor: '#6C5CE7',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            px: 2,
                            shrink: 0,
                            '&:hover': { backgroundColor: '#5B4CDB' }
                          }}
                        >
                          Ajustar / Reponer
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modals & Drawers */}
      <ProductFormDrawer
        open={productDrawerOpen}
        onClose={() => setProductDrawerOpen(false)}
        fiscalEnabled={fiscalEnabled}
        onSuccess={saved => {
          loadDashboardData()
          setToast({
            open: true,
            message: `Producto "${saved.name}" creado exitosamente`,
            severity: 'success'
          })
        }}
      />

      <StockAdjustmentModal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        templates={templates}
        preselectedProductId={preselectedProduct?.id}
        onSuccess={adj => {
          loadDashboardData()
          setToast({
            open: true,
            message: `Ajuste ${adj.correlativo} aplicado (${adj.variante_sku}: ${adj.stock_contado} ${adj.uom_code})`,
            severity: 'success'
          })
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          sx={{ borderRadius: '14px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default InventoryDashboard
