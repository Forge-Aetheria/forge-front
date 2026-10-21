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
import Link from 'next/link'

import type { JournalEntry, CurrencyViewMode } from '@/types/accountingTypes'

interface Props {
  entries: JournalEntry[]
  currencyMode: CurrencyViewMode
}

export const GeneralLedgerTable: React.FC<Props> = ({ entries, currencyMode }) => {
  // Flatten entry lines
  const ledgerItems = entries.flatMap(entry =>
    entry.lineas.map(line => ({
      asientoId: entry.id,
      numeroAsiento: entry.numeroAsiento,
      estado: entry.estado,
      fecha: entry.fecha,
      cuentaCodigo: line.cuentaCodigo,
      cuentaNombre: line.cuentaNombre,
      etiqueta: line.etiqueta,
      contactoNombre: line.contactoNombre,
      debeUsd: line.debeUsd,
      haberUsd: line.haberUsd,
      debeVes: line.debeVes,
      haberVes: line.haberVes
    }))
  )

  const totalDebeUsd = ledgerItems.reduce((acc, it) => acc + it.debeUsd, 0)
  const totalHaberUsd = ledgerItems.reduce((acc, it) => acc + it.haberUsd, 0)
  const totalDebeVes = ledgerItems.reduce((acc, it) => acc + it.debeVes, 0)
  const totalHaberVes = ledgerItems.reduce((acc, it) => acc + it.haberVes, 0)

  return (
    <TableContainer
      sx={{
        border: '1px solid #E6E4F0',
        borderRadius: '16px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden'
      }}
    >
      <Table size='small'>
        <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Asiento</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Cuenta Contable</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Concepto / Glosa</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tercero</TableCell>
            {currencyMode !== 'VES' && (
              <>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe ($)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber ($)</TableCell>
              </>
            )}
            {currencyMode !== 'USD' && (
              <>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe (Bs.)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber (Bs.)</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {ledgerItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                No se registraron movimientos en el período.
              </TableCell>
            </TableRow>
          ) : (
            ledgerItems.map((item, idx) => (
              <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ color: '#64748B' }}>{item.fecha}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      component={Link}
                      href='/accounting/journal-entries'
                      variant='body2'
                      sx={{
                        fontWeight: 700,
                        color: '#6C5CE7',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {item.numeroAsiento}
                    </Typography>
                    {item.estado === 'DRAFT' && (
                      <Chip
                        label='Borrador'
                        size='small'
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#D97706',
                          fontWeight: 700
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant='caption' sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#1E293B', display: 'block' }}>
                    {item.cuentaCodigo}
                  </Typography>
                  <Typography variant='caption' sx={{ color: '#64748B' }}>
                    {item.cuentaNombre}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: '#334155' }}>{item.etiqueta}</TableCell>
                <TableCell sx={{ color: '#64748B' }}>{item.contactoNombre || '—'}</TableCell>

                {currencyMode !== 'VES' && (
                  <>
                    <TableCell align='right' sx={{ fontWeight: item.debeUsd > 0 ? 600 : 400, color: item.debeUsd > 0 ? '#1E293B' : '#94A3B8' }}>
                      {item.debeUsd > 0 ? `$${item.debeUsd.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: item.haberUsd > 0 ? 600 : 400, color: item.haberUsd > 0 ? '#1E293B' : '#94A3B8' }}>
                      {item.haberUsd > 0 ? `$${item.haberUsd.toFixed(2)}` : '—'}
                    </TableCell>
                  </>
                )}

                {currencyMode !== 'USD' && (
                  <>
                    <TableCell align='right' sx={{ fontWeight: item.debeVes > 0 ? 600 : 400, color: item.debeVes > 0 ? '#1E293B' : '#94A3B8' }}>
                      {item.debeVes > 0 ? `${item.debeVes.toLocaleString('es-VE')} Bs.` : '—'}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: item.haberVes > 0 ? 600 : 400, color: item.haberVes > 0 ? '#1E293B' : '#94A3B8' }}>
                      {item.haberVes > 0 ? `${item.haberVes.toLocaleString('es-VE')} Bs.` : '—'}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))
          )}

          {/* Totales */}
          {ledgerItems.length > 0 && (
            <TableRow sx={{ backgroundColor: 'rgba(108, 92, 231, 0.04)' }}>
              <TableCell colSpan={5} sx={{ fontWeight: 800, color: '#1E293B' }}>
                TOTALES DEL LIBRO MAYOR
              </TableCell>
              {currencyMode !== 'VES' && (
                <>
                  <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                    ${totalDebeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                    ${totalHaberUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </>
              )}
              {currencyMode !== 'USD' && (
                <>
                  <TableCell align='right' sx={{ fontWeight: 800, color: '#10B981' }}>
                    {totalDebeVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 800, color: '#10B981' }}>
                    {totalHaberVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </TableCell>
                </>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
