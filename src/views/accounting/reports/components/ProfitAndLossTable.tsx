'use client'

import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'

import type { FinancialReportRow, CurrencyViewMode } from '@/types/accountingTypes'

interface Props {
  rows: FinancialReportRow[]
  currencyMode: CurrencyViewMode
}

export const ProfitAndLossTable: React.FC<Props> = ({ rows, currencyMode }) => {
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({})

  const toggleCollapse = (key: string) => {
    setCollapsedKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const netIncomeRow = rows.find(r => r.concepto.includes('RESULTADO NETO'))
  const isNetProfit = (netIncomeRow?.montoUsd || 0) >= 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Estructura de Resultados</TableCell>
              {currencyMode !== 'VES' && (
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 200 }}>
                  Monto (USD)
                </TableCell>
              )}
              {currencyMode !== 'USD' && (
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 220 }}>
                  Monto (VES)
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((rowLevel1, idx1) => {
              const isCollapsed = collapsedKeys[rowLevel1.concepto]
              const isNetRow = rowLevel1.concepto.includes('RESULTADO NETO')
              const isIncome = rowLevel1.concepto.includes('INGRESOS')

              if (isNetRow) {
                return (
                  <TableRow
                    key={rowLevel1.concepto || idx1}
                    sx={{
                      backgroundColor: isNetProfit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      borderTop: '2px solid #CBD5E1'
                    }}
                  >
                    <TableCell sx={{ py: 2.5, fontWeight: 900, color: '#1E293B', fontSize: '1rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <i className={isNetProfit ? 'tabler-trending-up' : 'tabler-trending-down'} style={{ color: isNetProfit ? '#10B981' : '#EF4444', fontSize: '24px' }} />
                        <span>{rowLevel1.concepto}</span>
                      </Box>
                    </TableCell>
                    {currencyMode !== 'VES' && (
                      <TableCell align='right' sx={{ fontWeight: 900, color: isNetProfit ? '#10B981' : '#EF4444', fontSize: '1.05rem' }}>
                        ${rowLevel1.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    )}
                    {currencyMode !== 'USD' && (
                      <TableCell align='right' sx={{ fontWeight: 900, color: isNetProfit ? '#10B981' : '#EF4444', fontSize: '1.05rem' }}>
                        {rowLevel1.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </TableCell>
                    )}
                  </TableRow>
                )
              }

              return (
                <React.Fragment key={rowLevel1.concepto || idx1}>
                  {/* Fila Nivel 1 (Ingresos / Costos / Gastos) */}
                  <TableRow
                    sx={{
                      backgroundColor: '#F8FAFC',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleCollapse(rowLevel1.concepto)}
                  >
                    <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size='small' sx={{ p: 0.5, color: '#64748B' }}>
                          <i className={isCollapsed ? 'tabler-chevron-right' : 'tabler-chevron-down'} />
                        </IconButton>
                        <span>{rowLevel1.concepto}</span>
                      </Box>
                    </TableCell>
                    {currencyMode !== 'VES' && (
                      <TableCell align='right' sx={{ fontWeight: 800, color: isIncome ? '#10B981' : '#1E293B' }}>
                        ${rowLevel1.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    )}
                    {currencyMode !== 'USD' && (
                      <TableCell align='right' sx={{ fontWeight: 800, color: isIncome ? '#10B981' : '#1E293B' }}>
                        {rowLevel1.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Subfilas de Cuentas */}
                  {!isCollapsed &&
                    rowLevel1.subfilas?.map((accRow, idx2) => (
                      <TableRow key={accRow.codigo || idx2} hover>
                        <TableCell sx={{ pl: 8 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant='caption' sx={{ fontFamily: 'monospace', color: '#6C5CE7', fontWeight: 600 }}>
                              {accRow.codigo}
                            </Typography>
                            <Typography variant='body2' sx={{ color: '#475569' }}>
                              {accRow.concepto}
                            </Typography>
                          </Box>
                        </TableCell>
                        {currencyMode !== 'VES' && (
                          <TableCell align='right' sx={{ color: '#334155', fontWeight: 500 }}>
                            ${accRow.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        )}
                        {currencyMode !== 'USD' && (
                          <TableCell align='right' sx={{ color: '#64748B' }}>
                            {accRow.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Indicador de Desempeño */}
      <Box
        sx={{
          p: 3,
          px: 4,
          borderRadius: '16px',
          backgroundColor: isNetProfit ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
          border: `1px solid ${isNetProfit ? '#10B981' : '#EF4444'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={isNetProfit ? '✓ Margen Operativo Positivo' : '⚠ Margen Negativo (Pérdida)'}
            size='small'
            sx={{
              fontWeight: 800,
              backgroundColor: isNetProfit ? '#10B981' : '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px'
            }}
          />
          <Typography variant='body2' sx={{ color: '#334155', fontWeight: 600 }}>
            Utilidad Neta: ${netIncomeRow?.montoUsd.toLocaleString()} USD ({netIncomeRow?.montoVes.toLocaleString()} VES)
          </Typography>
        </Box>
        <Typography variant='caption' sx={{ color: '#64748B' }}>
          Calculado con base en ingresos facturados menos costos y gastos operacionales
        </Typography>
      </Box>
    </Box>
  )
}
