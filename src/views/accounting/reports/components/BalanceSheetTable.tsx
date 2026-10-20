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

export const BalanceSheetTable: React.FC<Props> = ({ rows, currencyMode }) => {
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({})

  const toggleCollapse = (key: string) => {
    setCollapsedKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const formatAmount = (usd: number, ves: number) => {
    if (currencyMode === 'USD') {
      return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    if (currencyMode === 'VES') {
      return `${ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
    }

    return null
  }

  // Check Balance Sheet Equation: Activos = Pasivos + Patrimonio
  const totalActivo = rows.find(r => r.concepto.includes('ACTIVOS'))
  const totalPasivo = rows.find(r => r.concepto.includes('PASIVOS'))
  const totalPatrimonio = rows.find(r => r.concepto.includes('PATRIMONIO'))

  const activoUsd = totalActivo?.montoUsd || 0
  const pasivoMasPatrimonioUsd = (totalPasivo?.montoUsd || 0) + (totalPatrimonio?.montoUsd || 0)
  const isEquationBalanced = Math.abs(activoUsd - pasivoMasPatrimonioUsd) <= 0.05

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
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Código y Cuenta Contable</TableCell>
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
              const isCollapsed1 = collapsedKeys[rowLevel1.concepto]

              return (
                <React.Fragment key={rowLevel1.concepto || idx1}>
                  {/* Nivel 1: Grupo Mayor (Activos, Pasivos, Patrimonio) */}
                  <TableRow
                    sx={{
                      backgroundColor: '#F1F5F9',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleCollapse(rowLevel1.concepto)}
                  >
                    <TableCell sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size='small' sx={{ p: 0.5, color: '#64748B' }}>
                          <i className={isCollapsed1 ? 'tabler-chevron-right' : 'tabler-chevron-down'} />
                        </IconButton>
                        <span>{rowLevel1.concepto}</span>
                      </Box>
                    </TableCell>
                    {currencyMode !== 'VES' && (
                      <TableCell align='right' sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>
                        ${rowLevel1.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    )}
                    {currencyMode !== 'USD' && (
                      <TableCell align='right' sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>
                        {rowLevel1.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Nivel 2: Subgrupos (ej. Activo Corriente, No Corriente) */}
                  {!isCollapsed1 &&
                    rowLevel1.subfilas?.map((rowLevel2, idx2) => {
                      const key2 = `${rowLevel1.concepto}-${rowLevel2.concepto}`
                      const isCollapsed2 = collapsedKeys[key2]

                      return (
                        <React.Fragment key={key2 || idx2}>
                          <TableRow
                            sx={{
                              backgroundColor: '#FAFAFA',
                              cursor: 'pointer'
                            }}
                            onClick={() => toggleCollapse(key2)}
                          >
                            <TableCell sx={{ pl: 6, fontWeight: 700, color: '#334155' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton size='small' sx={{ p: 0.5, color: '#94A3B8' }}>
                                  <i className={isCollapsed2 ? 'tabler-chevron-right' : 'tabler-chevron-down'} />
                                </IconButton>
                                <span>{rowLevel2.concepto}</span>
                              </Box>
                            </TableCell>
                            {currencyMode !== 'VES' && (
                              <TableCell align='right' sx={{ fontWeight: 700, color: '#334155' }}>
                                ${rowLevel2.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            )}
                            {currencyMode !== 'USD' && (
                              <TableCell align='right' sx={{ fontWeight: 700, color: '#334155' }}>
                                {rowLevel2.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                              </TableCell>
                            )}
                          </TableRow>

                          {/* Nivel 3: Cuentas Detalle (ej. 1.1.01.01 Caja General) */}
                          {!isCollapsed2 &&
                            rowLevel2.subfilas?.map((rowLevel3, idx3) => (
                              <TableRow key={rowLevel3.codigo || idx3} hover>
                                <TableCell sx={{ pl: 12 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant='caption' sx={{ fontFamily: 'monospace', color: '#6C5CE7', fontWeight: 600 }}>
                                      {rowLevel3.codigo}
                                    </Typography>
                                    <Typography variant='body2' sx={{ color: '#475569' }}>
                                      {rowLevel3.concepto}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                {currencyMode !== 'VES' && (
                                  <TableCell align='right' sx={{ color: '#1E293B', fontWeight: 500 }}>
                                    ${rowLevel3.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TableCell>
                                )}
                                {currencyMode !== 'USD' && (
                                  <TableCell align='right' sx={{ color: '#64748B' }}>
                                    {rowLevel3.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                        </React.Fragment>
                      )
                    })}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Verificación de Ecuación Fundamental */}
      <Box
        sx={{
          p: 3,
          px: 4,
          borderRadius: '16px',
          backgroundColor: isEquationBalanced ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
          border: `1px solid ${isEquationBalanced ? '#10B981' : '#EF4444'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={isEquationBalanced ? '✓ Ecuación Patrimonial Cuadrada' : '⚠ Descuadre en Balance'}
            size='small'
            sx={{
              fontWeight: 800,
              backgroundColor: isEquationBalanced ? '#10B981' : '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px'
            }}
          />
          <Typography variant='body2' sx={{ color: '#334155', fontWeight: 600 }}>
            Activo (${activoUsd.toLocaleString()}) = Pasivo + Patrimonio (${pasivoMasPatrimonioUsd.toLocaleString()})
          </Typography>
        </Box>

        <Typography variant='caption' sx={{ color: '#64748B' }}>
          Normativa Contable Venezolana (VEN-NIF) & Estándar Bimonetario
        </Typography>
      </Box>
    </Box>
  )
}
