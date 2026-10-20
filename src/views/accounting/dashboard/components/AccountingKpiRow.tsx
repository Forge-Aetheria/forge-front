'use client'

import React from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import type { AccountingSummaryKpis } from '@/types/accountingTypes'

interface Props {
  kpis: AccountingSummaryKpis
  tasaBcv: number
}

export const AccountingKpiRow: React.FC<Props> = ({ kpis, tasaBcv }) => {
  const cards = [
    {
      title: 'Liquidez Total en Bancos',
      amountUsd: kpis.totalLiquidezUsd,
      amountVes: kpis.totalLiquidezVes,
      icon: 'tabler-building-bank',
      color: '#6C5CE7',
      bg: '#F0EEF9',
      subtitle: 'Disponibilidad inmediata en cuentas y caja'
    },
    {
      title: 'Total por Cobrar (CxC)',
      amountUsd: kpis.totalPorCobrarUsd,
      amountVes: kpis.totalPorCobrarVes,
      icon: 'tabler-arrow-down-left',
      color: '#10B981',
      bg: '#E8F5E9',
      subtitle: 'Facturas activas de clientes pendientes'
    },
    {
      title: 'Total por Pagar (CxP)',
      amountUsd: kpis.totalPorPagarUsd,
      amountVes: kpis.totalPorPagarVes,
      icon: 'tabler-arrow-up-right',
      color: '#EF4444',
      bg: '#FEE2E2',
      subtitle: 'Compromisos con proveedores a vencer'
    },
    {
      title: 'Resultado Neto del Mes',
      amountUsd: kpis.resultadoNetoMesUsd,
      amountVes: kpis.resultadoNetoMesVes,
      icon: 'tabler-chart-pie',
      color: '#0284C7',
      bg: '#E0F2FE',
      subtitle: 'Utilidad operacional estimada (P&L)'
    }
  ]

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {cards.map((c, idx) => (
        <Card
          key={idx}
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 24px 0 rgba(108, 92, 231, 0.08)'
            }
          }}
        >
          <CardContent className='p-5 flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <Typography variant='caption' className='font-bold uppercase tracking-wider text-xs text-[#6B7280]'>
                {c.title}
              </Typography>
              <div
                className='w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg'
                style={{ backgroundColor: c.bg, color: c.color }}
              >
                <i className={c.icon} />
              </div>
            </div>

            <div>
              <Typography variant='h5' className='font-bold text-[#1E1B2E] leading-tight'>
                ${c.amountUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant='caption' className='text-xs font-semibold text-[#6B7280] flex items-center gap-1 mt-0.5'>
                <span>{c.amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                <span className='text-[10px] text-[#9CA3AF]'>(Tasa: {tasaBcv.toFixed(2)})</span>
              </Typography>
            </div>

            <Typography variant='caption' className='text-[11px] text-[#9CA3AF] truncate'>
              {c.subtitle}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
