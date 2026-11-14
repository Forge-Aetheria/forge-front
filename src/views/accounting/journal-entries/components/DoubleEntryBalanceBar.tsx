'use client'

import React from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

interface Props {
  totalDebeUsd: number
  totalHaberUsd: number
  totalDebeVes: number
  totalHaberVes: number
}

export const DoubleEntryBalanceBar: React.FC<Props> = ({
  totalDebeUsd,
  totalHaberUsd,
  totalDebeVes,
  totalHaberVes
}) => {
  const diffUsd = Math.abs(totalDebeUsd - totalHaberUsd)
  const diffVes = Math.abs(totalDebeVes - totalHaberVes)

  const isBalanced = diffUsd <= 0.01 && diffVes <= 0.01

  return (
    <Box
      sx={{
        p: 3,
        px: 4,
        borderRadius: '16px',
        backgroundColor: isBalanced ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
        border: `1px solid ${isBalanced ? '#10B981' : '#EF4444'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={isBalanced ? '✓ Partida Doble Cuadrada' : '⚠ Asiento Descuadrado'}
          size='small'
          sx={{
            fontWeight: 800,
            backgroundColor: isBalanced ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            borderRadius: '9999px'
          }}
        />
        {!isBalanced && (
          <Typography variant='caption' sx={{ color: '#EF4444', fontWeight: 600 }}>
            Descuadre: ${diffUsd.toFixed(2)} USD | {diffVes.toFixed(2)} VES
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant='caption' sx={{ color: '#64748B', display: 'block' }}>Total Debe:</Typography>
          <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
            ${totalDebeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography variant='caption' sx={{ color: '#64748B' }}>
            {totalDebeVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant='caption' sx={{ color: '#64748B', display: 'block' }}>Total Haber:</Typography>
          <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
            ${totalHaberUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography variant='caption' sx={{ color: '#64748B' }}>
            {totalHaberVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
