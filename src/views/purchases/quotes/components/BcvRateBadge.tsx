'use client'

import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import { BcvRate } from '@/types/purchasesTypes'

interface Props {
  rate: BcvRate
  onRefresh?: () => void
  compact?: boolean
}

export const BcvRateBadge: React.FC<Props> = ({ rate, onRefresh, compact = false }) => {
  return (
    <Tooltip
      title={
        <div className='text-xs p-1'>
          <p className='font-semibold text-white'>Tasa Oficial Banco Central de Venezuela</p>
          <p className='text-gray-300'>Fecha valor: {rate.fecha_valor}</p>
          <p className='text-gray-300'>
            Sincronizado CRON:{' '}
            {new Date(rate.sincronizado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      }
      arrow
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-[#DCD8EC] bg-[#F4F3F8] text-[#1E1B2E] transition-all duration-150 hover:border-[#6C5CE7] hover:shadow-sm ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
        }`}
      >
        <span className='flex items-center justify-center w-5 h-5 rounded-full bg-[#E0DBF7] text-[#6C5CE7]'>
          <i className='tabler-building-bank text-xs' />
        </span>
        <div className='flex items-baseline gap-1.5'>
          <span className='font-semibold text-[#6C5CE7]'>
            {rate.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className='text-xs text-[#6B7280]'>VES/USD</span>
        </div>
        {onRefresh && (
          <button
            type='button'
            onClick={e => {
              e.stopPropagation()
              onRefresh()
            }}
            className='flex items-center justify-center text-[#6B7280] hover:text-[#6C5CE7] transition-colors ml-0.5'
            title='Sincronizar tasa BCV'
          >
            <i className='tabler-refresh text-xs' />
          </button>
        )}
      </div>
    </Tooltip>
  )
}
