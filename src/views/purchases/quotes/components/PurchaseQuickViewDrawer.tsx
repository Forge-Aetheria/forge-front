'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import { PurchaseQuote } from '@/types/purchasesTypes'
import { PurchaseStatusChip } from './PurchaseStatusChip'
import { BcvRateBadge } from './BcvRateBadge'

interface Props {
  open: boolean
  onClose: () => void
  quote: PurchaseQuote | null
}

export const PurchaseQuickViewDrawer: React.FC<Props> = ({ open, onClose, quote }) => {
  const router = useRouter()

  if (!quote) return null

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0',
          boxShadow: '-4px 0 24px rgba(108, 92, 231, 0.08)',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {/* Header */}
      <div className='p-4 border-b border-[#E6E4F0] flex items-center justify-between bg-[#FAFAFC]'>
        <div className='flex items-center gap-2.5'>
          <span className='flex items-center justify-center w-8 h-8 rounded-full bg-[#F0EEF9] text-[#6C5CE7]'>
            <i className='tabler-shopping-bag text-base' />
          </span>
          <div>
            <div className='flex items-center gap-2'>
              <span className='font-bold text-base text-[#1E1B2E]'>
                {quote.correlativo_orden_compra || quote.correlativo}
              </span>
              <PurchaseStatusChip status={quote.estado} size='small' />
            </div>
            <span className='text-xs text-[#6B7280]'>
              {quote.correlativo_orden_compra
                ? `Origen: ${quote.correlativo} · Orden de Compra en Firme`
                : 'Vista Rápida de Solicitud / Cotización de Compra'}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          <Tooltip title='Abrir ficha completa' arrow>
            <IconButton
              size='small'
              onClick={() => {
                onClose()
                router.push(`/purchases/quotes/${quote.id}`)
              }}
              sx={{ color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
            >
              <i className='tabler-maximize text-base' />
            </IconButton>
          </Tooltip>

          <IconButton size='small' onClick={onClose} sx={{ color: '#6B7280' }}>
            <i className='tabler-x text-base' />
          </IconButton>
        </div>
      </div>

      {/* Body */}
      <div className='flex-1 overflow-y-auto p-5 flex flex-col gap-4'>
        {/* Tasa BCV */}
        <div className='flex items-center justify-between bg-[#F4F3F8] p-3 rounded-2xl border border-[#DCD8EC]'>
          <span className='text-xs font-semibold text-[#1E1B2E]'>Tasa BCV Registrada</span>
          <BcvRateBadge rate={quote.tasa_bcv} compact />
        </div>

        {/* Datos del Proveedor */}
        <div className='bg-[#FFFFFF] p-4 rounded-2xl border border-[#E6E4F0] shadow-sm flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider'>
              Proveedor Adjudicado
            </span>
            <Chip
              label={quote.proveedor.identificacion}
              size='small'
              sx={{
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.7rem',
                backgroundColor: '#F0EEF9',
                color: '#6C5CE7'
              }}
            />
          </div>
          <Typography variant='subtitle1' className='font-bold text-[#1E1B2E]'>
            {quote.proveedor.razon_social}
          </Typography>
          <div className='flex flex-wrap items-center gap-2 text-xs text-[#6B7280]'>
            <span className='px-2 py-0.5 rounded-full bg-[#F4F3F8] text-[#1E1B2E] font-medium'>
              Condición: {quote.condicion_pago === 'CREDITO' ? `Crédito ${quote.dias_credito} días` : 'Contado'}
            </span>
            {quote.referencia_proveedor && (
              <span className='px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] font-semibold'>
                Ref. Prov: {quote.referencia_proveedor}
              </span>
            )}
          </div>
          <div className='flex flex-col gap-1 text-xs text-[#6B7280] pt-1'>
            <div className='flex items-center gap-1.5'>
              <i className='tabler-phone text-xs text-[#9CA3AF]' />
              <span>{quote.proveedor.telefono}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <i className='tabler-mail text-xs text-[#9CA3AF]' />
              <span>{quote.proveedor.email}</span>
            </div>
          </div>
        </div>

        {/* Fechas clave */}
        <div className='grid grid-cols-3 gap-2 text-xs bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E6E4F0]'>
          <div>
            <span className='text-[#9CA3AF] block mb-0.5'>Registro</span>
            <span className='font-semibold text-[#1E1B2E]'>{quote.fecha_registro}</span>
          </div>
          <div>
            <span className='text-[#9CA3AF] block mb-0.5'>Vigencia Costos</span>
            <span className='font-semibold text-[#1E1B2E]'>{quote.fecha_vencimiento_cotizacion}</span>
          </div>
          <div>
            <span className='text-[#9CA3AF] block mb-0.5'>Entrega Est.</span>
            <span className='font-semibold text-[#6C5CE7]'>{quote.fecha_estimada_entrega}</span>
          </div>
        </div>

        {/* Líneas de Compra */}
        <div className='flex flex-col gap-2'>
          <span className='text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider'>
            Líneas de Abastecimiento ({quote.items.length})
          </span>
          <div className='flex flex-col gap-2'>
            {quote.items.map((it, idx) => (
              <div
                key={it.id || idx}
                className='bg-[#FAFAFC] p-3 rounded-xl border border-[#E6E4F0] flex flex-col gap-1.5 text-xs'
              >
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-semibold text-[#1E1B2E]'>{it.producto_nombre}</span>
                  <span className='font-bold text-[#1E1B2E]'>${it.subtotal_neto.toFixed(2)}</span>
                </div>
                <div className='flex items-center justify-between text-[#6B7280]'>
                  <span>SKU: {it.producto_sku}</span>
                  <span>
                    {it.cantidad} {it.uom_code} x ${it.costo_unitario.toFixed(2)}
                    {it.descuento_proveedor_porcentaje > 0 ? ` (-${it.descuento_proveedor_porcentaje}%)` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen Bimonetario */}
        <div className='bg-[#FFFFFF] p-4 rounded-2xl border border-[#E6E4F0] shadow-sm flex flex-col gap-2'>
          <div className='flex justify-between text-xs text-[#6B7280]'>
            <span>Subtotal Bruto</span>
            <span>${quote.subtotal_usd.toFixed(2)} USD</span>
          </div>
          {quote.descuento_total_usd > 0 && (
            <div className='flex justify-between text-xs text-[#10B981]'>
              <span>Descuento Proveedor</span>
              <span>-${quote.descuento_total_usd.toFixed(2)} USD</span>
            </div>
          )}
          <div className='flex justify-between text-xs text-[#6B7280]'>
            <span>Crédito Fiscal (IVA Compras)</span>
            <span>
              {quote.aplica_iva_compras ? `$${quote.credito_fiscal_iva_usd.toFixed(2)} USD` : 'Modo Costo Neto'}
            </span>
          </div>
          <Divider sx={{ borderColor: '#F4F3F8' }} />
          <div className='flex justify-between items-baseline pt-1'>
            <span className='font-bold text-sm text-[#1E1B2E]'>Total Compra</span>
            <div className='text-right'>
              <div className='text-base font-bold text-[#6C5CE7]'>
                ${quote.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <div className='text-xs font-semibold text-[#10B981]'>
                Bs. {quote.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES
              </div>
            </div>
          </div>
        </div>

        {quote.estado === 'CANCELED' && quote.motivo_anulacion && (
          <div className='bg-[#FEE2E2] p-3 rounded-xl border border-[#FCA5A5] text-xs text-[#B91C1C]'>
            <strong>Motivo de anulación:</strong> {quote.motivo_anulacion}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='p-4 border-t border-[#E6E4F0] bg-[#FAFAFC] flex items-center justify-between gap-3'>
        <Button
          variant='outlined'
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            borderColor: '#DCD8EC',
            color: '#6B7280',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Cerrar
        </Button>
        <Button
          component={Link}
          href={`/purchases/quotes/${quote.id}`}
          variant='contained'
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#5B4CDB',
              boxShadow: 'none'
            }
          }}
          startIcon={<i className='tabler-external-link text-base' />}
        >
          Ver Ficha y Acciones
        </Button>
      </div>
    </Drawer>
  )
}
