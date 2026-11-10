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
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

import { accountingService } from '@/services/accountingService'
import type { Account, CurrencyViewMode } from '@/types/accountingTypes'
import { ReportHeaderToolbar } from './components/ReportHeaderToolbar'

export const TrialBalanceView: React.FC = () => {
  const [currencyMode, setCurrencyMode] = useState<CurrencyViewMode>('DUAL')
  const [targetMoves, setTargetMoves] = useState<'POSTED' | 'ALL'>('POSTED')
  const [hideZeroBalances, setHideZeroBalances] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [cutoffDate, setCutoffDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [tasaBcv] = useState<number>(54.00)

  const [accounts, setAccounts] = useState<Account[]>([])
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
      const accList = await accountingService.getAccountsWithTargetMoves(targetMoves, tasaBcv)

      setAccounts(accList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tasaBcv, targetMoves])

  // Process rows with standard debit/credit classification
  const processedAccounts = useMemo(() => {
    return accounts.map(acc => {
      const isDebitNormal = acc.tipo.startsWith('ASSET') || acc.tipo.startsWith('EXPENSE') || acc.tipo === 'COST_OF_GOODS'

      const saldoUsd = acc.saldoUsd || 0

      // En un balance de comprobación de sumas y saldos estándar
      const saldoDeudorUsd = isDebitNormal ? (saldoUsd >= 0 ? saldoUsd : 0) : (saldoUsd < 0 ? Math.abs(saldoUsd) : 0)
      const saldoAcreedorUsd = !isDebitNormal ? (saldoUsd >= 0 ? saldoUsd : 0) : (saldoUsd < 0 ? Math.abs(saldoUsd) : 0)

      const saldoDeudorVes = Number((saldoDeudorUsd * tasaBcv).toFixed(2))
      const saldoAcreedorVes = Number((saldoAcreedorUsd * tasaBcv).toFixed(2))

      return {
        ...acc,
        isDebitNormal,
        saldoDeudorUsd,
        saldoAcreedorUsd,
        saldoDeudorVes,
        saldoAcreedorVes
      }
    })
  }, [accounts, tasaBcv])

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return processedAccounts.filter(acc => {
      if (hideZeroBalances && acc.saldoUsd === 0 && acc.saldoVes === 0) {
        return false
      }

      if (selectedGroup !== 'ALL') {
        if (!acc.codigo.startsWith(selectedGroup)) {
          return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()

        
return acc.codigo.toLowerCase().includes(q) || acc.nombre.toLowerCase().includes(q)
      }

      return true
    })
  }, [processedAccounts, hideZeroBalances, selectedGroup, searchQuery])

  // Sums for verification
  const totalDeudorUsd = Number(filteredAccounts.reduce((acc, a) => acc + a.saldoDeudorUsd, 0).toFixed(2))
  const totalAcreedorUsd = Number(filteredAccounts.reduce((acc, a) => acc + a.saldoAcreedorUsd, 0).toFixed(2))
  const totalDeudorVes = Number(filteredAccounts.reduce((acc, a) => acc + a.saldoDeudorVes, 0).toFixed(2))
  const totalAcreedorVes = Number(filteredAccounts.reduce((acc, a) => acc + a.saldoAcreedorVes, 0).toFixed(2))

  const isBalanced = Math.abs(totalDeudorUsd - totalAcreedorUsd) <= 0.05

  const handleExport = (type: 'EXCEL' | 'PDF') => {
    if (type === 'PDF') {
      window.print()
    } else {
      setToastMessage('Generando exportación de Balance de Comprobación en Excel...')
      const csvRows = ['Código,Nombre de la Cuenta,Tipo,Saldo Deudor USD,Saldo Acreedor USD,Saldo Deudor VES,Saldo Acreedor VES']

      filteredAccounts.forEach(a => {
        csvRows.push(
          `"${a.codigo}","${a.nombre}","${a.tipo}",${a.saldoDeudorUsd},${a.saldoAcreedorUsd},${a.saldoDeudorVes},${a.saldoAcreedorVes}`
        )
      })
      csvRows.push(`,TOTALES DE COMPROBACIÓN,,${totalDeudorUsd},${totalAcreedorUsd},${totalDeudorVes},${totalAcreedorVes}`)

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = `Balance_de_Comprobacion_${cutoffDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const GROUPS = [
    { label: 'Todos los Rubros', value: 'ALL' },
    { label: '1. Activos', value: '1.' },
    { label: '2. Pasivos', value: '2.' },
    { label: '3. Patrimonio', value: '3.' },
    { label: '4. Ingresos', value: '4.' },
    { label: '5. Costos', value: '5.' },
    { label: '6. Gastos', value: '6.' }
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%' }}>
      {/* Barra de Encabezado y Navegación de Reportes */}
      <ReportHeaderToolbar
        title='Balance de Comprobación'
        subtitle='Validación de la partida doble y verificación de igualdad entre débitos y créditos del período'
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
      />

      {/* Controles de Filtrado: Grupos, Búsqueda y Ocultar Cero */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          p: 2.5,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E6E4F0'
        }}
      >
        {/* Grupos Contables */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {GROUPS.map(g => (
            <Button
              key={g.value}
              size='small'
              onClick={() => setSelectedGroup(g.value)}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                fontWeight: selectedGroup === g.value ? 700 : 500,
                fontSize: '0.8125rem',
                px: 2,
                py: 0.5,
                backgroundColor: selectedGroup === g.value ? '#6C5CE7' : '#F1F5F9',
                color: selectedGroup === g.value ? '#FFFFFF' : '#475569',
                '&:hover': {
                  backgroundColor: selectedGroup === g.value ? '#5b4bc4' : '#E2E8F0'
                }
              }}
            >
              {g.label}
            </Button>
          ))}
        </Box>

        {/* Buscador y Switch de Saldo Cero */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            placeholder='Buscar cuenta o código...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
            sx={{ width: 240 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={hideZeroBalances}
                onChange={e => setHideZeroBalances(e.target.checked)}
                color='primary'
                size='small'
              />
            }
            label={
              <Typography variant='caption' sx={{ fontWeight: 600, color: '#475569' }}>
                Ocultar saldo cero
              </Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>
      </Box>

      {/* Tabla del Balance de Comprobación */}
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
            <Skeleton variant='rectangular' height={140} sx={{ borderRadius: '8px' }} />
            <Skeleton variant='rectangular' height={100} sx={{ borderRadius: '8px' }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size='small'>
              <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Nombre de la Cuenta</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo de Cuenta</TableCell>
                  <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Mayor</TableCell>

                  {/* Columnas USD */}
                  {currencyMode !== 'VES' && (
                    <>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 160 }}>
                        Saldo Deudor ($)
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 160 }}>
                        Saldo Acreedor ($)
                      </TableCell>
                    </>
                  )}

                  {/* Columnas VES */}
                  {currencyMode !== 'USD' && (
                    <>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 180 }}>
                        Saldo Deudor (Bs.)
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 180 }}>
                        Saldo Acreedor (Bs.)
                      </TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAccounts.map((acc, idx) => (
                  <TableRow key={acc.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#6C5CE7', py: 1 }}>
                      {acc.codigo}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {acc.nombre}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B', fontSize: '0.82rem' }}>
                      {acc.tipoCuentaNombre || acc.tipo}
                    </TableCell>
                    <TableCell align='center'>
                      <Tooltip title={`Ver movimientos de ${acc.nombre} en Libro Mayor`} arrow>
                        <IconButton
                          component={Link}
                          href={`/accounting/reports/general-ledger?account=${acc.codigo}`}
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
                    </TableCell>

                    {/* Columnas USD */}
                    {currencyMode !== 'VES' && (
                      <>
                        <TableCell align='right' sx={{ color: acc.saldoDeudorUsd > 0 ? '#1E293B' : '#CBD5E1', fontWeight: acc.saldoDeudorUsd > 0 ? 600 : 400 }}>
                          {acc.saldoDeudorUsd > 0 ? `$${acc.saldoDeudorUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell align='right' sx={{ color: acc.saldoAcreedorUsd > 0 ? '#1E293B' : '#CBD5E1', fontWeight: acc.saldoAcreedorUsd > 0 ? 600 : 400 }}>
                          {acc.saldoAcreedorUsd > 0 ? `$${acc.saldoAcreedorUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                      </>
                    )}

                    {/* Columnas VES */}
                    {currencyMode !== 'USD' && (
                      <>
                        <TableCell align='right' sx={{ color: acc.saldoDeudorVes > 0 ? '#10B981' : '#CBD5E1', fontWeight: acc.saldoDeudorVes > 0 ? 600 : 400 }}>
                          {acc.saldoDeudorVes > 0 ? `${acc.saldoDeudorVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.` : '—'}
                        </TableCell>
                        <TableCell align='right' sx={{ color: acc.saldoAcreedorVes > 0 ? '#10B981' : '#CBD5E1', fontWeight: acc.saldoAcreedorVes > 0 ? 600 : 400 }}>
                          {acc.saldoAcreedorVes > 0 ? `${acc.saldoAcreedorVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.` : '—'}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}

                {/* Fila de Totales de Comprobación */}
                <TableRow sx={{ backgroundColor: 'rgba(108, 92, 231, 0.06)', borderTop: '2px solid #CBD5E1' }}>
                  <TableCell colSpan={4} sx={{ fontWeight: 800, color: '#1E293B', py: 1.8 }}>
                    SUMAS TOTALES DE COMPROBACIÓN
                  </TableCell>

                  {/* Totales USD */}
                  {currencyMode !== 'VES' && (
                    <>
                      <TableCell align='right' sx={{ fontWeight: 900, color: '#1E293B', fontSize: '0.95rem' }}>
                        ${totalDeudorUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 900, color: '#1E293B', fontSize: '0.95rem' }}>
                        ${totalAcreedorUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </>
                  )}

                  {/* Totales VES */}
                  {currencyMode !== 'USD' && (
                    <>
                      <TableCell align='right' sx={{ fontWeight: 900, color: '#10B981', fontSize: '0.95rem' }}>
                        {totalDeudorVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 900, color: '#10B981', fontSize: '0.95rem' }}>
                        {totalAcreedorVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </TableCell>
                    </>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Banner de Verificación de Sumas Iguales */}
      <Box
        sx={{
          p: 3,
          px: 4,
          borderRadius: '18px',
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
            label={isBalanced ? '✓ Sumas Iguales Cuadradas (Partida Doble Verificada)' : '⚠ Descuadre en Sumas de Comprobación'}
            size='medium'
            sx={{
              fontWeight: 800,
              backgroundColor: isBalanced ? '#10B981' : '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px',
              px: 1
            }}
          />
          <Typography variant='body2' sx={{ color: '#334155', fontWeight: 600 }}>
            {currencyMode === 'VES'
              ? `Total Deudor: ${totalDeudorVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs. = Total Acreedor: ${totalAcreedorVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
              : `Total Deudor: $${totalDeudorUsd.toLocaleString()} = Total Acreedor: $${totalAcreedorUsd.toLocaleString()}`}
          </Typography>
        </Box>

        <Typography variant='caption' sx={{ color: '#64748B' }}>
          Cumplimiento VEN-NIF & Conciliación Automática de Balances
        </Typography>
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
