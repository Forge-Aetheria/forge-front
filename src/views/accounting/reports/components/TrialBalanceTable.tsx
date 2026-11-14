'use client'

import React from 'react'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import type { Account, CurrencyViewMode } from '@/types/accountingTypes'

interface Props {
  accounts: Account[]
  currencyMode: CurrencyViewMode
  tasaBcv: number
}

export const TrialBalanceTable: React.FC<Props> = ({ accounts, currencyMode, tasaBcv }) => {
  const activeAccounts = accounts.filter(a => a.saldoUsd > 0 || a.saldoVes > 0)

  const totalUsd = activeAccounts.reduce((acc, a) => acc + a.saldoUsd, 0)
  const totalVes = Number((totalUsd * tasaBcv).toFixed(2))

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
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Código</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Nombre de la Cuenta</TableCell>
            <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo de Cuenta</TableCell>
            {currencyMode !== 'VES' && (
              <>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Debe Acumulado ($)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Haber Acumulado ($)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Saldo Deudor/Acreedor ($)</TableCell>
              </>
            )}
            {currencyMode !== 'USD' && (
              <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>
                Saldo Equivalente (Bs.)
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {activeAccounts.map((acc, idx) => {
            const isAssetOrExpense = acc.tipo.startsWith('ASSET') || acc.tipo.startsWith('EXPENSE') || acc.tipo === 'COST_OF_GOODS'
            const debeUsd = isAssetOrExpense ? acc.saldoUsd : 0
            const haberUsd = !isAssetOrExpense ? acc.saldoUsd : 0

            return (
              <TableRow key={acc.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#6C5CE7' }}>
                  {acc.codigo}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>
                  {acc.nombre}
                </TableCell>
                <TableCell sx={{ color: '#64748B', fontSize: '0.82rem' }}>
                  {acc.tipo}
                </TableCell>

                {currencyMode !== 'VES' && (
                  <>
                    <TableCell align='right' sx={{ color: debeUsd > 0 ? '#1E293B' : '#94A3B8' }}>
                      {debeUsd > 0 ? `$${debeUsd.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell align='right' sx={{ color: haberUsd > 0 ? '#1E293B' : '#94A3B8' }}>
                      {haberUsd > 0 ? `$${haberUsd.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                      ${acc.saldoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </>
                )}

                {currencyMode !== 'USD' && (
                  <TableCell align='right' sx={{ fontWeight: 600, color: '#10B981' }}>
                    {(acc.saldoUsd * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                  </TableCell>
                )}
              </TableRow>
            )
          })}

          <TableRow sx={{ backgroundColor: 'rgba(108, 92, 231, 0.05)' }}>
            <TableCell colSpan={3} sx={{ fontWeight: 800, color: '#1E293B' }}>
              SUMAS TOTALES DE COMPROBACIÓN
            </TableCell>
            {currencyMode !== 'VES' && (
              <>
                <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                  ${(totalUsd / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                  ${(totalUsd / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                  ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </>
            )}
            {currencyMode !== 'USD' && (
              <TableCell align='right' sx={{ fontWeight: 800, color: '#10B981' }}>
                {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
              </TableCell>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}
