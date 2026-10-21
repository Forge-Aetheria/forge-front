'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import Link from 'next/link'

import { accountingService } from '@/services/accountingService'
import type { FinancialReportRow, CurrencyViewMode } from '@/types/accountingTypes'
import { ReportHeaderToolbar } from './components/ReportHeaderToolbar'

export const ProfitAndLossView: React.FC = () => {
  const [currencyMode, setCurrencyMode] = useState<CurrencyViewMode>('DUAL')
  const [targetMoves, setTargetMoves] = useState<'POSTED' | 'ALL'>('POSTED')
  const [startDate, setStartDate] = useState<string>('2026-01-01')
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
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
      const data = await accountingService.getProfitAndLoss(tasaBcv, targetMoves)
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
    })
    setCollapsedKeys(keys)
  }

  const handleExport = (type: 'EXCEL' | 'PDF') => {
    if (type === 'PDF') {
      window.print()
    } else {
      setToastMessage('Generando exportación de Estado de Resultados...')
      const csvRows = ['Código,Concepto,Monto USD,Monto VES']
      rows.forEach(r => {
        csvRows.push(`,"${r.concepto}",${r.montoUsd},${r.montoVes}`)
        r.subfilas?.forEach(s => {
          csvRows.push(`"${s.codigo || ''}","  ${s.concepto}",${s.montoUsd},${s.montoVes}`)
        })
      })
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Estado_de_Resultados_${startDate}_al_${endDate}.csv`
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
        const subfilas = (r.subfilas || []).filter(
          sub =>
            sub.concepto.toLowerCase().includes(q) ||
            (sub.codigo && sub.codigo.toLowerCase().includes(q))
        )
        if (matchesLevel1 || subfilas.length > 0) {
          return { ...r, subfilas: subfilas.length > 0 ? subfilas : r.subfilas }
        }
        return null
      })
      .filter(Boolean) as FinancialReportRow[]
  }, [rows, searchQuery])

  // KPIs
  const totalIngresos = rows.find(r => r.concepto.includes('INGRESOS'))?.montoUsd || 0
  const totalCostos = rows.find(r => r.concepto.includes('COSTO DE VENTAS'))?.montoUsd || 0
  const margenBruto = rows.find(r => r.concepto.includes('MARGEN BRUTO'))?.montoUsd || (totalIngresos - totalCostos)
  const utilidadNetaRow = rows.find(r => r.concepto.includes('RESULTADO NETO'))
  const utilidadNeta = utilidadNetaRow?.montoUsd || 0
  const isNetProfit = utilidadNeta >= 0

  const margenBrutoPct = totalIngresos > 0 ? ((margenBruto / totalIngresos) * 100).toFixed(1) : '0.0'
  const margenNetoPct = totalIngresos > 0 ? ((utilidadNeta / totalIngresos) * 100).toFixed(1) : '0.0'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%' }}>
      {/* Barra de Encabezado y Navegación de Reportes */}
      <ReportHeaderToolbar
        title='Estado de Resultados'
        subtitle='Rendimiento operativo, margen comercial y efecto de flotación cambiaria oficial según VEN-NIF'
        currencyMode={currencyMode}
        onCurrencyModeChange={setCurrencyMode}
        targetMoves={targetMoves}
        onTargetMovesChange={setTargetMoves}
        tasaBcv={tasaBcv}
        onExportExcel={() => handleExport('EXCEL')}
        onPrintPdf={() => handleExport('PDF')}
        dateFilterSlot={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size='small'
              type='date'
              label='Desde'
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <TextField
              size='small'
              type='date'
              label='Hasta'
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
          </Box>
        }
        extraActionsSlot={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Expandir todos los grupos' arrow>
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
            <Tooltip title='Colapsar grupos' arrow>
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

      {/* KPI Cards de Rentabilidad */}
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
              Ingresos de Ventas
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(108, 92, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-file-invoice' style={{ color: '#6C5CE7', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {currencyMode === 'VES'
              ? `${(totalIngresos * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          {currencyMode === 'DUAL' && (
            <Typography variant='caption' sx={{ color: '#10B981', fontWeight: 600 }}>
              Equivalente: {(totalIngresos * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
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
              Costo de Ventas (COGS)
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-shopping-cart-discount' style={{ color: '#EF4444', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {currencyMode === 'VES'
              ? `${(totalCostos * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${totalCostos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
            {totalIngresos > 0 ? `${((totalCostos / totalIngresos) * 100).toFixed(1)}% de las ventas` : '0%'}
          </Typography>
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
              Margen Bruto
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className='tabler-chart-pie' style={{ color: '#10B981', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            {currencyMode === 'VES'
              ? `${(margenBruto * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${margenBruto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          <Typography variant='caption' sx={{ color: '#10B981', fontWeight: 700 }}>
            Margen: {margenBrutoPct}%
          </Typography>
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
              Utilidad Neta Final
            </Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: isNetProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={isNetProfit ? 'tabler-trending-up' : 'tabler-trending-down'} style={{ color: isNetProfit ? '#10B981' : '#EF4444', fontSize: 18 }} />
            </Box>
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: isNetProfit ? '#10B981' : '#EF4444' }}>
            {currencyMode === 'VES'
              ? `${(utilidadNeta * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
              : `$${utilidadNeta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
          <Typography variant='caption' sx={{ color: isNetProfit ? '#10B981' : '#EF4444', fontWeight: 700 }}>
            Margen Neto: {margenNetoPct}%
          </Typography>
        </Card>
      </Box>

      {/* Buscador Rápido de Cuentas */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <TextField
          size='small'
          placeholder='Filtrar por rubro o cuenta de resultado...'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
          }}
          sx={{ width: { xs: '100%', sm: 350 }, backgroundColor: '#FFFFFF', borderRadius: '12px' }}
        />
      </Box>

      {/* Tabla Escalonada de Estado de Resultados */}
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
            <Skeleton variant='rectangular' height={80} sx={{ borderRadius: '8px' }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>
                    Estructura Escalonada de Resultados (VEN-NIF)
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
                  const isCollapsed = collapsedKeys[rowLevel1.concepto]
                  const isNetRow = rowLevel1.concepto.includes('RESULTADO NETO')
                  const isMargenBruto = rowLevel1.concepto.includes('MARGEN BRUTO')
                  const isEbitda = rowLevel1.concepto.includes('EBITDA')

                  // Filas de Subtotales y Totales Calculados
                  if (isNetRow) {
                    return (
                      <TableRow
                        key={rowLevel1.concepto || idx1}
                        sx={{
                          backgroundColor: isNetProfit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          borderTop: '2px solid #CBD5E1',
                          borderBottom: '2px solid #CBD5E1'
                        }}
                      >
                        <TableCell sx={{ py: 2.2, fontWeight: 900, color: '#1E293B', fontSize: '1rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <i
                              className={isNetProfit ? 'tabler-trending-up' : 'tabler-trending-down'}
                              style={{ color: isNetProfit ? '#10B981' : '#EF4444', fontSize: '24px' }}
                            />
                            <span>{rowLevel1.concepto}</span>
                          </Box>
                        </TableCell>
                        <TableCell align='center'>—</TableCell>
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

                  if (isMargenBruto || isEbitda) {
                    return (
                      <TableRow
                        key={rowLevel1.concepto || idx1}
                        sx={{
                          backgroundColor: '#F8FAFC',
                          borderTop: '1px solid #E2E8F0',
                          borderBottom: '1px solid #E2E8F0'
                        }}
                      >
                        <TableCell sx={{ py: 1.8, fontWeight: 800, color: '#1E293B', fontSize: '0.92rem', pl: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <i className='tabler-calculator' style={{ color: '#6C5CE7' }} />
                            <span>= {rowLevel1.concepto}</span>
                          </Box>
                        </TableCell>
                        <TableCell align='center'>—</TableCell>
                        {currencyMode !== 'VES' && (
                          <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7', fontSize: '0.95rem' }}>
                            ${rowLevel1.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        )}
                        {currencyMode !== 'USD' && (
                          <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7', fontSize: '0.95rem' }}>
                            {rowLevel1.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  }

                  return (
                    <React.Fragment key={rowLevel1.concepto || idx1}>
                      {/* Rubro Mayor Colapsable */}
                      <TableRow
                        sx={{
                          backgroundColor: '#F1F5F9',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#E2E8F0' }
                        }}
                        onClick={() => toggleCollapse(rowLevel1.concepto)}
                      >
                        <TableCell sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.92rem', py: 1.4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <IconButton size='small' sx={{ p: 0.5, color: '#64748B' }}>
                              <i className={isCollapsed ? 'tabler-chevron-right' : 'tabler-chevron-down'} />
                            </IconButton>
                            <span>{rowLevel1.concepto}</span>
                          </Box>
                        </TableCell>
                        <TableCell align='center'>—</TableCell>
                        {currencyMode !== 'VES' && (
                          <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                            ${rowLevel1.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        )}
                        {currencyMode !== 'USD' && (
                          <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {rowLevel1.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Cuentas de Detalle */}
                      {!isCollapsed &&
                        rowLevel1.subfilas?.map((rowLevel2, idx2) => (
                          <TableRow key={rowLevel2.codigo || idx2} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ pl: 7, py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {rowLevel2.codigo && (
                                  <Typography variant='caption' sx={{ fontFamily: 'monospace', color: '#6C5CE7', fontWeight: 700 }}>
                                    {rowLevel2.codigo}
                                  </Typography>
                                )}
                                <Typography variant='body2' sx={{ color: '#475569', fontWeight: 500 }}>
                                  {rowLevel2.concepto}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align='center' sx={{ py: 1 }}>
                              {rowLevel2.codigo && (
                                <Tooltip title={`Ver movimientos en Libro Mayor (${rowLevel2.codigo})`} arrow>
                                  <IconButton
                                    component={Link}
                                    href={`/accounting/reports/general-ledger?account=${rowLevel2.codigo}`}
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
                              <TableCell align='right' sx={{ color: rowLevel2.montoUsd < 0 ? '#EF4444' : '#1E293B', fontWeight: 500 }}>
                                {rowLevel2.montoUsd < 0 ? `-$${Math.abs(rowLevel2.montoUsd).toFixed(2)}` : `$${rowLevel2.montoUsd.toFixed(2)}`}
                              </TableCell>
                            )}
                            {currencyMode !== 'USD' && (
                              <TableCell align='right' sx={{ color: '#64748B' }}>
                                {rowLevel2.montoVes < 0
                                  ? `-${Math.abs(rowLevel2.montoVes).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
                                  : `${rowLevel2.montoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`}
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
        )}
      </Card>

      {/* Nota Explicativa VEN-NIF */}
      <Box
        sx={{
          p: 2.5,
          px: 3,
          borderRadius: '16px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography variant='caption' sx={{ color: '#64748B' }}>
          * El resultado integral incluye las fluctuaciones de diferencial cambiario originadas por facturas y pagos valorados a la tasa oficial del Banco Central de Venezuela (BCV), de conformidad con el Boletín de Aplicación VEN-NIF N° 12.
        </Typography>
        <Chip
          label='Metodología Odoo + VEN-NIF'
          size='small'
          sx={{ fontWeight: 700, backgroundColor: '#E2E8F0', color: '#475569', borderRadius: '9999px' }}
        />
      </Box>

      {/* Toast */}
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
