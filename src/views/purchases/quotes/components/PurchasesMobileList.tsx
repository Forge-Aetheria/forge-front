'use client'

import React from 'react'

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'

import type { PurchaseQuote } from '@/types/purchasesTypes'
import { PurchaseStatusChip } from './PurchaseStatusChip'

interface Props {
  quotes: PurchaseQuote[]
  onSelectQuote: (quote: PurchaseQuote) => void
  onCancelQuote: (quote: PurchaseQuote) => void
  onCopyCorrelativo: (correlativo: string) => void
}

export const PurchasesMobileList: React.FC<Props> = ({
  quotes,
  onSelectQuote,
  onCancelQuote,
  onCopyCorrelativo
}) => {
  if (quotes.length === 0) {
    return (
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          p: 4,
          textAlign: 'center'
        }}
      >
        <Typography variant='body1' className='font-semibold text-[#1E1B2E]'>
          No se encontraron compras
        </Typography>
        <Typography variant='body2' className='text-[#6B7280] mt-1'>
          Ajuste los filtros o cree una nueva solicitud de cotización.
        </Typography>
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {quotes.map(quote => {
        const displayCorrelativo = quote.correlativo_orden_compra || quote.correlativo

        
return (
          <Card
            key={quote.id}
            onClick={() => onSelectQuote(quote)}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 14px rgba(108, 92, 231, 0.04)',
              cursor: 'pointer'
            }}
          >
            <CardContent className='p-4 flex flex-col gap-2.5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5' onClick={e => e.stopPropagation()}>
                  <span className='font-bold text-sm text-[#6C5CE7]'>{displayCorrelativo}</span>
                  <IconButton
                    size='small'
                    onClick={() => onCopyCorrelativo(displayCorrelativo)}
                    sx={{ p: 0.4, color: '#9CA3AF' }}
                  >
                    <i className='tabler-copy text-xs' />
                  </IconButton>
                </div>
                <PurchaseStatusChip status={quote.estado} size='small' />
              </div>

              <div>
                <Typography variant='subtitle2' className='font-bold text-[#1E1B2E]'>
                  {quote.proveedor.razon_social}
                </Typography>
                <span className='text-xs text-[#6B7280]'>
                  {quote.proveedor.identificacion} · Ref: {quote.referencia_proveedor || 'S/R'}
                </span>
              </div>

              <Divider sx={{ borderColor: '#F4F3F8' }} />

              <div className='flex items-center justify-between'>
                <div>
                  <span className='text-[11px] text-[#9CA3AF] block'>Fecha: {quote.fecha_registro}</span>
                  <span className='text-[11px] text-[#6B7280]'>Vigencia: {quote.fecha_vencimiento_cotizacion}</span>
                </div>
                <div className='text-right'>
                  <div className='font-bold text-sm text-[#1E1B2E]'>
                    ${quote.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </div>
                  <div className='text-xs font-semibold text-[#10B981]'>
                    Bs. {quote.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-end gap-2 pt-1' onClick={e => e.stopPropagation()}>
                {quote.estado !== 'CANCELED' && (
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => onCancelQuote(quote)}
                    sx={{
                      borderRadius: '9999px',
                      borderColor: '#FCA5A5',
                      color: '#EF4444',
                      textTransform: 'none',
                      fontSize: '0.75rem'
                    }}
                  >
                    Anular
                  </Button>
                )}
                <Button
                  size='small'
                  component={Link}
                  href={`/purchases/quotes/${quote.id}`}
                  variant='contained'
                  sx={{
                    borderRadius: '9999px',
                    backgroundColor: '#6C5CE7',
                    color: '#FFFFFF',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    boxShadow: 'none'
                  }}
                >
                  Ver Detalle
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
