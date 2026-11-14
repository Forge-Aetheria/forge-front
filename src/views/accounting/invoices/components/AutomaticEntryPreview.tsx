'use client'

import React from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'

import type { JournalItem } from '@/types/accountingTypes'

interface Props {
  items: JournalItem[]
  tasaBcv: number
}

export const AutomaticEntryPreview: React.FC<Props> = ({ items, tasaBcv }) => {
  const totalDebeUsd = items.reduce((acc, it) => acc + (it.debeUsd || 0), 0)
  const totalHaberUsd = items.reduce((acc, it) => acc + (it.haberUsd || 0), 0)
  const totalDebeVes = items.reduce((acc, it) => acc + (it.debeVes || 0), 0)
  const totalHaberVes = items.reduce((acc, it) => acc + (it.haberVes || 0), 0)

  const isBalancedUsd = Math.abs(totalDebeUsd - totalHaberUsd) <= 0.01
  const isBalancedVes = Math.abs(totalDebeVes - totalHaberVes) <= 0.01
  const isBalanced = isBalancedUsd && isBalancedVes

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant='subtitle1' sx={{ fontWeight: 600, color: '#1E293B' }}>
            Apuntes Contables de la Factura
          </Typography>
          <Typography variant='caption' sx={{ color: '#64748B' }}>
            Generado en tiempo real con tasa oficial BCV: <strong>{tasaBcv.toFixed(2)} Bs/USD</strong>
          </Typography>
        </Box>
        <Chip
          label={isBalanced ? '✓ Asiento Cuadrado' : '⚠ Descuadre Detectado'}
          size='small'
          sx={{
            fontWeight: 700,
            backgroundColor: isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isBalanced ? '#10B981' : '#EF4444',
            borderRadius: '9999px',
            border: `1px solid ${isBalanced ? '#10B981' : '#EF4444'}`
          }}
        />
      </Box>

      {!isBalanced && (
        <Alert severity='error' sx={{ borderRadius: '12px' }}>
          El asiento presenta descuadre: Diferencia en USD: ${Math.abs(totalDebeUsd - totalHaberUsd).toFixed(2)} | Diferencia en VES: {Math.abs(totalDebeVes - totalHaberVes).toFixed(2)} Bs.
        </Alert>
      )}

      <TableContainer
        sx={{
          border: '1px solid #E6E4F0',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF'
        }}
      >
        <Table size='small'>
          <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Cuenta Contable</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contacto</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Etiqueta / Concepto</TableCell>
              <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe (USD)</TableCell>
              <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber (USD)</TableCell>
              <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe (VES)</TableCell>
              <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber (VES)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align='center' sx={{ py: 4, color: '#94A3B8' }}>
                  Agrega líneas a la factura para visualizar los apuntes contables.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.id || index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {item.cuentaCodigo}
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#64748B' }}>
                      {item.cuentaNombre}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#334155' }}>
                    {item.contactoNombre || '—'}
                  </TableCell>
                  <TableCell sx={{ color: '#64748B' }}>
                    {item.etiqueta}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: item.debeUsd > 0 ? 600 : 400, color: item.debeUsd > 0 ? '#1E293B' : '#94A3B8' }}>
                    {item.debeUsd > 0 ? `$${item.debeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: item.haberUsd > 0 ? 600 : 400, color: item.haberUsd > 0 ? '#1E293B' : '#94A3B8' }}>
                    {item.haberUsd > 0 ? `$${item.haberUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: item.debeVes > 0 ? 600 : 400, color: item.debeVes > 0 ? '#1E293B' : '#94A3B8' }}>
                    {item.debeVes > 0 ? `${item.debeVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.` : '—'}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: item.haberVes > 0 ? 600 : 400, color: item.haberVes > 0 ? '#1E293B' : '#94A3B8' }}>
                    {item.haberVes > 0 ? `${item.haberVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}

            {/* Fila de Totales */}
            {items.length > 0 && (
              <TableRow sx={{ backgroundColor: isBalanced ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#1E293B' }}>
                  TOTALES BALANCEADOS
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: isBalanced ? '#10B981' : '#EF4444' }}>
                  ${totalDebeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: isBalanced ? '#10B981' : '#EF4444' }}>
                  ${totalHaberUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: isBalanced ? '#10B981' : '#EF4444' }}>
                  {totalDebeVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: isBalanced ? '#10B981' : '#EF4444' }}>
                  {totalHaberVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
