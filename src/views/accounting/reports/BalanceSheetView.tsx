'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { accountingService } from '@/services/accountingService'
import type { FinancialReportRow, CurrencyViewMode } from '@/types/accountingTypes'
import { ReportHeaderToolbar } from './components/ReportHeaderToolbar'

export const BalanceSheetView: React.FC = () => {
  const [currencyMode, setCurrencyMode] = useState<CurrencyViewMode>('DUAL')
  const [targetMoves, setTargetMoves] = useState<'POSTED' | 'ALL'>('POSTED')
  const [cutoffDate, setCutoffDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [tasaBcv] = useState<number>(54.00)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({})
  const [rows, setRows] = useState<FinancialReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Initialize currency mode from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('forge_accounting_currency_mode') as CurrencyViewMode | null

      if (savedMode && ['VES', 'USD', 'DUAL'].includes(savedMode)) {
        setCurrencyMode(savedMode)
      }
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await accountingService.getBalanceSheet(tasaBcv, targetMoves)

      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tasaBcv, targetMoves])

  const toggleCollapse = (key: string) => {
    setCollapsedKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleExpandAll = () => {
    setCollapsedKeys({})
  }

  const handleCollapseAll = () => {
    const keys: Record<string, boolean> = {}

    rows.forEach(r => {
      keys[r.concepto] = true
      r.subfilas?.forEach(s => {
        keys[`${r.concepto}-${s.concepto}`] = true
      })
    })
    setCollapsedKeys(keys)
  }

  const handleExport = (type: 'EXCEL' | 'PDF') => {
    if (type === 'PDF') {
      window.print()
    } else {
      setToastMessage('Generando exportación en Excel con balances bimonetarios...')

      // CSV Download simulation
      const csvRows = ['Código,Concepto,Monto USD,Monto VES']

      rows.forEach(r => {
        csvRows.push(`,"${r.concepto}",${r.montoUsd},${r.montoVes}`)
        r.subfilas?.forEach(s => {
          csvRows.push(`,"  ${s.concepto}",${s.montoUsd},${s.montoVes}`)
          s.subfilas?.forEach(sub => {
            csvRows.push(`"${sub.codigo || ''}","    ${sub.concepto}",${sub.montoUsd},${sub.montoVes}`)
          })
        })
      })
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = `Balance_General_${cutoffDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()

    return rows
      .map(r => {
        const matchesLevel1 = r.concepto.toLowerCase().includes(q)

        const subfilas = (r.subfilas || [])
          .map(s => {
            const matchesLevel2 = s.concepto.toLowerCase().includes(q)

            const subSubfilas = (s.subfilas || []).filter(
              sub =>
                sub.concepto.toLowerCase().includes(q) ||
                (sub.codigo && sub.codigo.toLowerCase().includes(q))
            )

            if (matchesLevel2 || subSubfilas.length > 0) {
              return { ...s, subfilas: subSubfilas.length > 0 ? subSubfilas : s.subfilas }
            }

            
return null
          })
          .filter(Boolean) as FinancialReportRow[]

        if (matchesLevel1 || subfilas.length > 0) {
          return { ...r, subfilas }
        }

        
return null
      })
      .filter(Boolean) as FinancialReportRow[]
  }, [rows, searchQuery])

  // Totals & Equation Verification
  const totalActivo = rows.find(r => r.concepto.includes('ACTIVOS'))?.montoUsd || 0
  const totalPasivo = rows.find(r => r.concepto.includes('PASIVOS'))?.montoUsd || 0
  const totalPatrimonio = rows.find(r => r.concepto.includes('PATRIMONIO'))?.montoUsd || 0

  const pasivoMasPatrimonio = Number((totalPasivo + totalPatrimonio).toFixed(2))
  const descuadreUsd = Math.abs(totalActivo - pasivoMasPatrimonio)
  const isEquationBalanced = descuadreUsd <= 0.05

  // Liquidity Ratio (Activo Corriente / Pasivo Corriente)
  const activoCorrienteUsd = rows.find(r => r.concepto.includes('ACTIVOS'))?.subfilas?.find(s => s.concepto.includes('Corriente'))?.montoUsd || 0
  const pasivoCorrienteUsd = rows.find(r => r.concepto.includes('PASIVOS'))?.subfilas?.find(s => s.concepto.includes('Corriente'))?.montoUsd || 1
  const ratioLiquidez = pasivoCorrienteUsd > 0 ? (activoCorrienteUsd / pasivoCorrienteUsd).toFixed(2) : 'N/A'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%' }}>
      {/* Barra de Encabezado y Navegación de Reportes */}
      <ReportHeaderToolbar
        title='Balance General'
        subtitle='Estructura patrimonial clasificada de Activos, Pasivos y Patrimonio según VEN-NIF'
        currencyMode={currencyMode}
        onCurrencyModeChange={setCurrencyMode}
        targetMoves={targetMoves}
        onTargetMovesChange={setTargetMoves}
        tasaBcv={tasaBcv}
        onExportExcel={() => handleExport('EXCEL')}
        onPrintPdf={() => handleExport('PDF')}
        dateFilterSlot={
          <TextField
            size='small'
            type='date'
            label='Fecha de Corte'
            value={cutoffDate}
            onChange={e => setCutoffDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
        }
        extraActionsSlot={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Expandir todos los grupos contables' arrow>
              <Button
                size='small'
                variant='outlined'
                onClick={handleExpandAll}
                startIcon={<i className='tabler-arrows-maximize' style={{ fontSize: 15 }} />}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  borderColor: '#CBD5E1',
                  color: '#475569',
                  '&:hover': { borderColor: '#94A3B8' }
                }}
              >
                Expandir
              </Button>
            </Tooltip>
            <Tooltip title='Colapsar todos los grupos' arrow>
              <Button
                size='small'
                variant='outlined'
                onClick={handleCollapseAll}
                startIcon={<i className='tabler-arrows-minimize' style={{ fontSize: 15 }} />}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  borderColor: '#CBD5E1',
                  color: '#475569',
                  '&:hover': { borderColor: '#94A3B8' }
                }}
              >
                Colapsar
              </Button>
            </Tooltip>
          </Box>
        }
      />

      {/* KPI Cards Superiores de Resumen Patrimonial */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        <Card
          sx={{
            p: 3,
            borderRadius: '18px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Activos
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(108, 92, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-building' style={{ color: '#6C5CE7', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {currencyMode === 'VES'
              ? `${(totalActivo * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${totalActivo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          {currencyMode === 'DUAL' && (
            <Typography variant='caption' sx={{ color: '#10B981', fontWeight: 600 }}>
              Equivalente: {(totalActivo * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </Typography>
          )}
        </Card>

        <Card
          sx={{
            p: 3,
            borderRadius: '18px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Pasivos
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-receipt' style={{ color: '#EF4444', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {currencyMode === 'VES'
              ? `${(totalPasivo * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${totalPasivo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          {currencyMode === 'DUAL' && (
            <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
              Equivalente: {(totalPasivo * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </Typography>
          )}
        </Card>

        <Card
          sx={{
            p: 3,
            borderRadius: '18px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Patrimonio Neto
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-certificate' style={{ color: '#10B981', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {currencyMode === 'VES'
              ? `${(totalPatrimonio * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${totalPatrimonio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          {currencyMode === 'DUAL' && (
            <Typography variant='caption' sx={{ color: '#10B981', fontWeight: 600 }}>
              Equivalente: {(totalPatrimonio * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </Typography>
          )}
        </Card>

        <Card
          sx={{
            p: 3,
            borderRadius: '18px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Razón de Liquidez
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-droplet' style={{ color: '#3B82F6', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {ratioLiquidez} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748B' }}>veces</span>
          </Typography>
          <Typography variant='caption' sx={{ color: '#10B981', fontWeight: 600 }}>
            {Number(ratioLiquidez) >= 1.5 ? 'Solvencia Óptima' : 'Vigilancia de Caja'}
          </Typography>
        </Card>
      </Box>

      {/* Buscador Rápido de Cuentas */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <TextField
          size='small'
          placeholder='Filtrar por código o nombre de cuenta...'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
          }}
          sx={{ width: { xs: '100%', sm: 350 }, backgroundColor: '#FFFFFF', borderRadius: '12px' }}
        />
      </Box>

      {/* Tabla Jerárquica del Balance General */}
      <Card
        sx={{
          border: '1px solid #E6E4F0',
          borderRadius: '20px',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
        }}
      >
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant='rectangular' height={40} sx={{ borderRadius: '8px' }} />
            <Skeleton variant='rectangular' height={120} sx={{ borderRadius: '8px' }} />
            <Skeleton variant='rectangular' height={120} sx={{ borderRadius: '8px' }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>
                    Código y Estructura Patrimonial
                  </TableCell>
                  <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 140 }}>
                    Libro Mayor
                  </TableCell>
                  {currencyMode !== 'VES' && (
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 220 }}>
                      Monto (USD)
                    </TableCell>
                  )}
                  {currencyMode !== 'USD' && (
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 240 }}>
                      Monto (VES)
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((rowLevel1, idx1) => {
                  const isCollapsed1 = collapsedKeys[rowLevel1.concepto]

                  return (
                    <React.Fragment key={rowLevel1.concepto || idx1}>
                      {/* Nivel 1: Grupo Mayor (Activo, Pasivo, Patrimonio) */}
                      <TableRow
                        sx={{
                          backgroundColor: '#F1F5F9',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#E2E8F0' }
                        }}
                        onClick={() => toggleCollapse(rowLevel1.concepto)}
                      >
                        <TableCell sx={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem', py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <IconButton size='small' sx={{ p: 0.5, color: '#64748B' }}>
                              <i className={isCollapsed1 ? 'tabler-chevron-right' : 'tabler-chevron-down'} />
                            </IconButton>
                            <span>{rowLevel1.concepto}</span>
                          </Box>
                        </TableCell>
                        <TableCell align='center'>—</TableCell>
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

                      {/* Nivel 2: Subgrupos (Activo Corriente, No Corriente, Pasivo Corriente, etc.) */}
                      {!isCollapsed1 &&
                        rowLevel1.subfilas?.map((rowLevel2, idx2) => {
                          const key2 = `${rowLevel1.concepto}-${rowLevel2.concepto}`
                          const isCollapsed2 = collapsedKeys[key2]

                          return (
                            <React.Fragment key={key2 || idx2}>
                              <TableRow
                                sx={{
                                  backgroundColor: '#FAFAFA',
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: '#F1F5F9' }
                                }}
                                onClick={() => toggleCollapse(key2)}
                              >
                                <TableCell sx={{ pl: 6, fontWeight: 700, color: '#334155', py: 1.2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton size='small' sx={{ p: 0.5, color: '#94A3B8' }}>
                                      <i className={isCollapsed2 ? 'tabler-chevron-right' : 'tabler-chevron-down'} />
                                    </IconButton>
                                    <span>{rowLevel2.concepto}</span>
                                  </Box>
                                </TableCell>
                                <TableCell align='center'>—</TableCell>
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

                              {/* Nivel 3: Cuentas Detalle (con enlace a Libro Mayor) */}
                              {!isCollapsed2 &&
                                rowLevel2.subfilas?.map((rowLevel3, idx3) => (
                                  <TableRow key={rowLevel3.codigo || idx3} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ pl: 11, py: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant='caption' sx={{ fontFamily: 'monospace', color: '#6C5CE7', fontWeight: 700, fontSize: '0.82rem' }}>
                                          {rowLevel3.codigo}
                                        </Typography>
                                        <Typography variant='body2' sx={{ color: '#475569', fontWeight: 500 }}>
                                          {rowLevel3.concepto}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align='center' sx={{ py: 1 }}>
                                      {rowLevel3.codigo && (
                                        <Tooltip title={`Ver movimientos en Libro Mayor (${rowLevel3.codigo})`} arrow>
                                          <IconButton
                                            component={Link}
                                            href={`/accounting/reports/general-ledger?account=${rowLevel3.codigo}`}
                                            size='small'
                                            sx={{
                                              color: '#6C5CE7',
                                              p: 0.5,
                                              '&:hover': { backgroundColor: 'rgba(108, 92, 231, 0.08)' }
                                            }}
                                          >
                                            <i className='tabler-books' style={{ fontSize: 17 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
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
        )}
      </Card>

      {/* Banner de Verificación de la Ecuación Fundamental del Balance (VEN-NIF) */}
      <Box
        sx={{
          p: 3,
          px: 4,
          borderRadius: '18px',
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
            label={isEquationBalanced ? '✓ Balance General Cuadrado (Descuadre: $0.00)' : `⚠ Descuadre en Balance: $${descuadreUsd.toFixed(2)}`}
            size='medium'
            sx={{
              fontWeight: 800,
              backgroundColor: isEquationBalanced ? '#10B981' : '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px',
              px: 1
            }}
          />
          <Typography variant='body2' sx={{ color: '#334155', fontWeight: 700 }}>
            Ecuación Patrimonial: Activo (${totalActivo.toLocaleString()}) = Pasivo (${totalPasivo.toLocaleString()}) + Patrimonio (${totalPatrimonio.toLocaleString()})
          </Typography>
        </Box>

        <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 500 }}>
          Normativa Contable Venezolana (VEN-NIF PYME) & Estándar Bimonetario BCV
        </Typography>
      </Box>

      {/* Toast de Notificaciones */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='info' sx={{ borderRadius: '12px' }} onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
