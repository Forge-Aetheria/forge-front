'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'

import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@core/components/mui/Avatar'
import { getActiveBcvRate } from '@/services/inventoryService'

interface MetricConfig {
  id: string
  title: string
  value: string
  subtitle: string
  icon: string
  color: 'primary' | 'success' | 'warning' | 'info' | 'error'
  href: string
}

const ALL_METRICS: MetricConfig[] = [
  {
    id: 'inv_valuation',
    title: 'Valor Total en Almacén',
    value: '$84,350.00',
    subtitle: '154 artículos en 4 almacenes',
    icon: 'tabler-packages',
    color: 'primary',
    href: '/inventory/products'
  },
  {
    id: 'sales_pipeline',
    title: 'Cotizaciones de Venta Activas',
    value: '$28,400.00',
    subtitle: '14 presupuestos pendientes',
    icon: 'tabler-file-invoice',
    color: 'info',
    href: '/sales/quotes'
  },
  {
    id: 'purchases_pending',
    title: 'Órdenes de Compra por Recibir',
    value: '6 órdenes',
    subtitle: '3 despachos en tránsito',
    icon: 'tabler-shopping-bag',
    color: 'warning',
    href: '/purchases/quotes'
  },
  {
    id: 'pos_today',
    title: 'Ventas del Día en POS',
    value: '$1,280.00',
    subtitle: '42 transacciones en turno',
    icon: 'tabler-device-tablet',
    color: 'success',
    href: '/pos/shifts'
  },
  {
    id: 'low_stock',
    title: 'Artículos Críticos / Bajo Mínimo',
    value: '3 artículos',
    subtitle: 'Requieren reposición urgente',
    icon: 'tabler-alert-triangle',
    color: 'error',
    href: '/inventory/adjustments'
  },
  {
    id: 'contacts_count',
    title: 'Directorio de Terceros',
    value: '128 contactos',
    subtitle: '84 clientes · 44 proveedores',
    icon: 'tabler-address-book',
    color: 'primary',
    href: '/contacts'
  },
  {
    id: 'deliveries_ready',
    title: 'Despachos Listos para Entrega',
    value: '5 entregas',
    subtitle: 'Verificadas en almacén',
    icon: 'tabler-package-export',
    color: 'info',
    href: '/inventory/operations/deliveries'
  },
  {
    id: 'margin_avg',
    title: 'Margen Comercial Estimado',
    value: '32.4%',
    subtitle: 'Promedio general del catálogo',
    icon: 'tabler-chart-pie',
    color: 'success',
    href: '/sales/quotes'
  }
]

const STORAGE_KEY = 'foundly_home_visible_metrics'

export const HomeDashboardView = () => {
  const [bcvRate, setBcvRate] = useState<number>(36.5)
  const [parallelRate] = useState<number>(41.2)
  const [converterUsd, setConverterUsd] = useState<string>('100')
  const [visibleMetricIds, setVisibleMetricIds] = useState<string[]>([
    'inv_valuation',
    'sales_pipeline',
    'purchases_pending',
    'pos_today'
  ])
  const [customizerOpen, setCustomizerOpen] = useState(false)

  useEffect(() => {
    try {
      const active = getActiveBcvRate()
      if (active && active > 0) setBcvRate(active)
    } catch {
      // Usar base
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleMetricIds(parsed)
        }
      }
    } catch {
      // Usar defaults
    }
  }, [])

  const handleToggleMetric = (id: string) => {
    setVisibleMetricIds(prev => {
      const exists = prev.includes(id)
      if (exists && prev.length === 1) return prev // Mantener al menos una

      const updated = exists ? prev.filter(m => m !== id) : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const numUsd = parseFloat(converterUsd) || 0
  const convertedBcv = numUsd * bcvRate
  const convertedParallel = numUsd * parallelRate
  const spreadPercent = ((parallelRate - bcvRate) / bcvRate) * 100

  const activeMetrics = ALL_METRICS.filter(m => visibleMetricIds.includes(m.id))

  return (
    <div className='flex flex-col gap-5'>
      {/* Top Banner */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
          Panel General
        </Typography>

        <Button
          variant='outlined'
          size='small'
          onClick={() => setCustomizerOpen(true)}
          startIcon={<i className='tabler-adjustments-alt text-base' />}
          className='text-xs font-semibold border-[#DCD8EC] text-[#1E1B2E] bg-white hover:bg-[#F4F3F8]'
          sx={{ textTransform: 'none' }}
        >
          Personalizar ({visibleMetricIds.length})
        </Button>
      </div>

      {/* Hero: Monitor de Tasas Cambiarias y Conversor Rápido */}
      <Card className='border border-[#E6E4F0] rounded-2xl shadow-xs overflow-hidden bg-white'>
        <CardContent className='p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5'>
          {/* Tasas Oficial y Paralelo */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-5'>
            {/* Tasa BCV Oficial */}
            <div className='flex items-center gap-3 p-3.5 rounded-2xl bg-[#F3F0FF] border border-[#E9D5FF] min-w-[210px]'>
              <CustomAvatar color='primary' skin='light' variant='rounded' size={44}>
                <i className='tabler-building-bank text-2xl text-[#6C5CE7]' />
              </CustomAvatar>
              <div>
                <Typography variant='caption' className='text-[#6C5CE7] font-bold uppercase tracking-wider block text-xs'>
                  Tasa Oficial BCV
                </Typography>
                <div className='flex items-baseline gap-1'>
                  <Typography variant='h5' className='font-bold font-mono text-[#1E1B2E]'>
                    {bcvRate.toFixed(2)}
                  </Typography>
                  <span className='text-xs text-[#6B7280] font-semibold'>Bs/USD</span>
                </div>
                <Typography variant='caption' className='text-[#6B7280] text-xs block'>
                  Banco Central de Venezuela
                </Typography>
              </div>
            </div>

            {/* Tasa Paralelo de Referencia */}
            <div className='flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAFC] border border-[#E6E4F0] min-w-[210px]'>
              <CustomAvatar color='warning' skin='light' variant='rounded' size={44}>
                <i className='tabler-arrows-diff text-2xl text-[#D97706]' />
              </CustomAvatar>
              <div>
                <div className='flex items-center justify-between gap-2'>
                  <Typography variant='caption' className='text-[#6B7280] font-bold uppercase tracking-wider block text-xs'>
                    Mercado Referencial
                  </Typography>
                  <span className='text-xs font-bold text-amber-600 px-1.5 py-0.5 rounded bg-amber-50'>
                    +{spreadPercent.toFixed(1)}%
                  </span>
                </div>
                <div className='flex items-baseline gap-1'>
                  <Typography variant='h5' className='font-bold font-mono text-[#1E1B2E]'>
                    {parallelRate.toFixed(2)}
                  </Typography>
                  <span className='text-xs text-[#6B7280] font-semibold'>Bs/USD</span>
                </div>
                <Typography variant='caption' className='text-[#6B7280] text-xs block'>
                  Brecha cambiaria: ${(parallelRate - bcvRate).toFixed(2)} Bs.
                </Typography>
              </div>
            </div>
          </div>

          {/* Calculadora / Convertidor Inmediato */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-3 bg-[#F8F7FC] p-3 rounded-2xl border border-[#E6E4F0] flex-1 lg:max-w-md'>
            <div className='flex-1'>
              <CustomTextField
                size='small'
                label='Monto a convertir'
                value={converterUsd}
                onChange={e => setConverterUsd(e.target.value.replace(/[^0-9.]/g, ''))}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                    className: 'font-mono text-sm'
                  }
                }}
                fullWidth
              />
            </div>
            <div className='flex flex-col justify-center text-right pl-2 sm:border-l border-[#DCD8EC] min-w-[130px]'>
              <Typography variant='caption' className='text-[#6B7280] text-xs font-bold uppercase'>
                Total Oficial (BCV)
              </Typography>
              <Typography variant='body2' className='font-bold font-mono text-[#6C5CE7]'>
                Bs. {convertedBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant='caption' className='text-xs text-[#6B7280] font-mono'>
                ≈ Ref: Bs. {convertedParallel.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cuadrícula de Métricas Personalizables */}
      <Grid container spacing={3}>
        {activeMetrics.map(metric => (
          <Grid key={metric.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              component={Link}
              href={metric.href}
              className='border border-[#E6E4F0] rounded-2xl shadow-xs hover:border-[#6C5CE7] transition-all duration-200 block bg-white h-full'
            >
              <CardContent className='p-4 flex flex-col justify-between h-full gap-3'>
                <div className='flex items-center justify-between'>
                  <CustomAvatar color={metric.color} skin='light' variant='rounded' size={42}>
                    <i className={`${metric.icon} text-2xl`} />
                  </CustomAvatar>
                  <i className='tabler-chevron-right text-[#9CA3AF] text-base' />
                </div>
                <div>
                  <Typography variant='caption' className='text-[#6B7280] font-medium block text-xs'>
                    {metric.title}
                  </Typography>
                  <Typography variant='h5' className='font-bold font-mono text-[#1E1B2E] mt-0.5'>
                    {metric.value}
                  </Typography>
                  <Typography variant='caption' className='text-[#6B7280] text-[11px] block mt-1'>
                    {metric.subtitle}
                  </Typography>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Modal de Personalización de Métricas */}
      <Dialog
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        maxWidth='xs'
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '20px', p: 1 } }
        }}
      >
        <DialogTitle className='font-bold text-[#1E1B2E] text-base'>
          Personalizar Tablero de Métricas
        </DialogTitle>
        <DialogContent dividers className='flex flex-col gap-1 py-3'>
          <Typography variant='caption' className='text-[#6B7280] mb-2 block'>
            Selecciona cuáles tarjetas operativas deseas fijar en tu pantalla de inicio:
          </Typography>
          {ALL_METRICS.map(m => {
            const isChecked = visibleMetricIds.includes(m.id)

            return (
              <FormControlLabel
                key={m.id}
                control={
                  <Checkbox
                    checked={isChecked}
                    onChange={() => handleToggleMetric(m.id)}
                    sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                  />
                }
                label={
                  <div className='flex items-center gap-2'>
                    <i className={`${m.icon} text-sm text-[#6C5CE7]`} />
                    <span className='text-xs font-medium text-[#1E1B2E]'>{m.title}</span>
                  </div>
                }
              />
            )
          })}
        </DialogContent>
        <DialogActions className='p-3 flex justify-end gap-2'>
          <Button
            onClick={() => setCustomizerOpen(false)}
            variant='outlined'
            className='rounded-full text-xs font-semibold border-[#DCD8EC] text-[#6B7280]'
            sx={{ textTransform: 'none' }}
          >
            Cerrar
          </Button>
          <Button
            onClick={() => setCustomizerOpen(false)}
            variant='contained'
            className='rounded-full bg-[#6C5CE7] hover:bg-[#5A4BD1] text-xs font-semibold text-white px-4'
            sx={{ textTransform: 'none' }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default HomeDashboardView
