'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'

import type { Journal } from '@/types/accountingTypes'

interface Props {
  journals: Journal[]
  tasaBcv: number
  onQuickAction: (actionType: 'NEW_INVOICE_CUSTOMER' | 'NEW_INVOICE_SUPPLIER' | 'NEW_PAYMENT' | 'NEW_EXPENSE' | 'NEW_ENTRY', journalId: string) => void
}

export const JournalCardGrid: React.FC<Props> = ({ journals, onQuickAction }) => {
  const router = useRouter()

  const getJournalConfig = (j: Journal) => {
    switch (j.tipo) {
      case 'VENTAS':
        return {
          badge: 'Facturación Clientes',
          badgeBg: '#F0EEF9',
          badgeColor: '#6C5CE7',
          primaryBtnText: 'Nuevo',
          primaryBtnAction: () => onQuickAction('NEW_INVOICE_CUSTOMER', j.id),
          secondaryBtnText: 'Ver Facturas',
          secondaryBtnAction: () => router.push('/accounting/invoices?type=CUSTOMER')
        }
      case 'COMPRAS':
        return {
          badge: 'Facturas Proveedores',
          badgeBg: '#FEE2E2',
          badgeColor: '#EF4444',
          primaryBtnText: 'Nuevo',
          primaryBtnAction: () => onQuickAction('NEW_INVOICE_SUPPLIER', j.id),
          secondaryBtnText: 'Ver Facturas',
          secondaryBtnAction: () => router.push('/accounting/invoices?type=SUPPLIER')
        }
      case 'BANCO':
      case 'BANCO_VES':

      case 'BANCO_USD': {
        const isUsd = j.moneda === 'USD' || j.tipo === 'BANCO_USD'
        const isVes = j.moneda === 'VES' || j.tipo === 'BANCO_VES'

        
return {
          badge: isUsd ? 'Cuenta Divisas (USD)' : isVes ? 'Banco Nacional (VES)' : 'Banco Multimoneda',
          badgeBg: '#E0F2FE',
          badgeColor: '#0284C7',
          primaryBtnText: 'Cobro / Pago',
          primaryBtnAction: () => onQuickAction('NEW_PAYMENT', j.id),
          secondaryBtnText: 'Lotes de Pago',
          secondaryBtnAction: () => router.push('/accounting/payments/batches')
        }
      }

      case 'CAJA':
        return {
          badge: 'Efectivo y Caja Chica',
          badgeBg: '#FEF3C7',
          badgeColor: '#D97706',
          primaryBtnText: 'Cobro / Pago',
          primaryBtnAction: () => onQuickAction('NEW_PAYMENT', j.id),
          secondaryBtnText: 'Ver Movimientos',
          secondaryBtnAction: () => router.push('/accounting/payments')
        }
      default:
        return {
          badge: 'Operaciones Varias',
          badgeBg: '#EDE9FE',
          badgeColor: '#8B5CF6',
          primaryBtnText: 'Ver Libro Diario',
          primaryBtnAction: () => router.push('/accounting/journal-entries'),
          secondaryBtnText: 'Ajuste Contable',
          secondaryBtnAction: () => onQuickAction('NEW_ENTRY', j.id)
        }
    }
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
      {journals.map(j => {
        const cfg = getJournalConfig(j)

        return (
          <Card
            key={j.id}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 10px 28px 0 rgba(108, 92, 231, 0.09)'
              }
            }}
          >
            <CardContent className='p-6 flex flex-col flex-1 gap-4 justify-between'>
              {/* Cabecera de Tarjeta */}
              <div className='flex items-start justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <div
                    className='w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs'
                    style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeColor }}
                  >
                    <i className={j.icono || 'tabler-book'} />
                  </div>
                  <div>
                    <Typography variant='h6' className='font-bold text-[#1E1B2E] text-base leading-snug'>
                      {j.nombre}
                    </Typography>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      <span className='font-mono text-[11px] font-bold text-[#6B7280] bg-[#F4F3F8] px-2 py-0.5 rounded-full'>
                        {j.codigo}
                      </span>
                    </div>
                  </div>
                </div>

                <Chip
                  size='small'
                  label={cfg.badge}
                  sx={{
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    backgroundColor: cfg.badgeBg,
                    color: cfg.badgeColor,
                    border: '1px solid #E6E4F0'
                  }}
                />
              </div>

              {/* Saldo Central */}
              <div className='p-4 rounded-2xl bg-[#FAFAFC] border border-[#E6E4F0] flex flex-col gap-1'>
                <span className='text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider'>
                  Saldo en Libros:
                </span>
                <div className='flex items-baseline justify-between flex-wrap gap-2'>
                  <Typography variant='h5' className='font-bold text-[#1E1B2E] font-mono'>
                    ${j.saldoActualUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant='body2' className='text-xs font-semibold text-[#6B7280] font-mono'>
                    {j.saldoActualVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </Typography>
                </div>
              </div>

              {/* Botones Píldora de Acción Rápida */}
              <div className='flex items-center gap-2 pt-1'>
                <Button
                  fullWidth
                  variant='contained'
                  size='small'
                  onClick={cfg.primaryBtnAction}
                  sx={{
                    borderRadius: '9999px',
                    backgroundColor: cfg.badgeColor,
                    color: '#FFFFFF',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    py: 0.8,
                    boxShadow: `0 3px 10px ${cfg.badgeColor}33`,
                    '&:hover': { opacity: 0.9 }
                  }}
                >
                  {cfg.primaryBtnText}
                </Button>

                <Button
                  fullWidth
                  variant='outlined'
                  size='small'
                  onClick={cfg.secondaryBtnAction}
                  sx={{
                    borderRadius: '9999px',
                    borderColor: '#E6E4F0',
                    color: '#1E1B2E',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    py: 0.8,
                    '&:hover': {
                      borderColor: '#6C5CE7',
                      color: '#6C5CE7',
                      backgroundColor: 'rgba(108, 92, 231, 0.04)'
                    }
                  }}
                >
                  {cfg.secondaryBtnText}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
