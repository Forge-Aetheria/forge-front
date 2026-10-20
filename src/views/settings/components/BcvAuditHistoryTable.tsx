'use client'

import React from 'react'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

import type { BcvRateAuditEntry } from '@/types/settingsTypes'

interface Props {
  entries: BcvRateAuditEntry[]
}

export const BcvAuditHistoryTable: React.FC<Props> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <div className='p-8 text-center text-[#6B7280] text-xs'>
        No hay registros históricos de tasa en la bitácora.
      </div>
    )
  }

  return (
    <div className='overflow-x-auto rounded-2xl border border-[#E6E4F0]'>
      <table className='w-full text-left text-xs'>
        <thead className='bg-[#F8F7FC] text-[#1E1B2E] font-bold border-b border-[#E6E4F0]'>
          <tr>
            <th className='py-3 px-4'>Fecha / Hora</th>
            <th className='py-3 px-4 text-right'>Tasa Oficial (VES)</th>
            <th className='py-3 px-4 text-center'>Origen</th>
            <th className='py-3 px-4'>Responsable</th>
            <th className='py-3 px-4'>Motivo / Justificación</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-[#E6E4F0] bg-[#FFFFFF]'>
          {entries.map(entry => {
            const isAuto = entry.origen === 'AUTOMATICO_7AM'

            return (
              <tr key={entry.id} className='hover:bg-[#FAFAFD] transition-colors'>
                <td className='py-3 px-4 font-mono font-medium text-[#1E1B2E]'>
                  {entry.fechaHora}
                </td>
                <td className='py-3 px-4 text-right font-mono font-bold text-[#6C5CE7] text-sm'>
                  {Number(entry.tasaVes).toFixed(2)} Bs.
                </td>
                <td className='py-3 px-4 text-center'>
                  <Chip
                    size='small'
                    label={isAuto ? 'Automático BCV' : 'Manual'}
                    sx={{
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      height: 22,
                      backgroundColor: isAuto ? '#E0F2FE' : '#FEF3C7',
                      color: isAuto ? '#0284C7' : '#D97706',
                      border: '1px solid',
                      borderColor: isAuto ? '#BAE6FD' : '#FDE68A'
                    }}
                  />
                </td>
                <td className='py-3 px-4 text-[#1E1B2E] font-medium'>
                  {entry.responsableNombre}
                </td>
                <td className='py-3 px-4 text-[#6B7280] italic'>
                  {entry.motivo || 'Sin observaciones'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
