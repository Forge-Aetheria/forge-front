'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
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
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Link from 'next/link'

import { accountingService } from '@/services/accountingService'
import type { JournalEntry, Account, CurrencyViewMode } from '@/types/accountingTypes'
import { ReportHeaderToolbar } from './components/ReportHeaderToolbar'

interface AccountLedgerGroup {
  account: Account
  saldoInicialUsd: number
  saldoInicialVes: number
  items: {
    asientoId: string
    numeroAsiento: string
    fecha: string
    diarioNombre: string
    documentoReferencia?: string
    contactoNombre?: string
    etiqueta: string
    estado: string
    debeUsd: number
    haberUsd: number
    debeVes: number
    haberVes: number
    saldoAcumuladoUsd: number
    saldoAcumuladoVes: number
  }[]
  totalDebeUsd: number
  totalHaberUsd: number
  totalDebeVes: number
  totalHaberVes: number
  saldoFinalUsd: number
  saldoFinalVes: number
}

export const GeneralLedgerView: React.FC = () => {
  const searchParams = useSearchParams()
  const initialAccountParam = searchParams.get('account') || ''

  const [currencyMode, setCurrencyMode] = useState<CurrencyViewMode>('DUAL')
  const [targetMoves, setTargetMoves] = useState<'POSTED' | 'ALL'>('POSTED')
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>(initialAccountParam)
  const [startDate, setStartDate] = useState<string>('2026-01-01')
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [tasaBcv] = useState<number>(54.00)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
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

  // Sync param if changed in URL
  useEffect(() => {
    if (initialAccountParam) {
      setSelectedAccountCode(initialAccountParam)
    }
  }, [initialAccountParam])

  const loadData = async () => {
    try {
      setLoading(true)
      const [accList, entryList] = await Promise.all([
        accountingService.getAccountsWithTargetMoves(targetMoves, tasaBcv),
        accountingService.getJournalEntries(targetMoves)
      ])
      setAccounts(accList)
      setEntries(entryList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tasaBcv, targetMoves])

  // Process entries and group by account (Odoo General Ledger format)
  const ledgerGroups = useMemo((): AccountLedgerGroup[] => {
    if (!accounts.length) return []

    // Filter accounts if one is selected
    const targetAccounts = selectedAccountCode
      ? accounts.filter(a => a.codigo === selectedAccountCode || a.id === selectedAccountCode)
      : accounts

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha))

    const groups: AccountLedgerGroup[] = []

    targetAccounts.forEach(acc => {
      // Find all movement lines for this account within date range
      const linesForAccount: {
        asientoId: string
        numeroAsiento: string
        fecha: string
        diarioNombre: string
        documentoReferencia?: string
        contactoNombre?: string
        etiqueta: string
        estado: string
        debeUsd: number
        haberUsd: number
        debeVes: number
        haberVes: number
      }[] = []

      sortedEntries.forEach(entry => {
        if (entry.fecha >= startDate && entry.fecha <= endDate) {
          entry.lineas.forEach(line => {
            if (line.cuentaId === acc.id || line.cuentaCodigo === acc.codigo) {
              linesForAccount.push({
                asientoId: entry.id,
                numeroAsiento: entry.numeroAsiento,
                fecha: entry.fecha,
                diarioNombre: entry.diarioNombre,
                documentoReferencia: entry.documentoReferencia,
                contactoNombre: line.contactoNombre,
                etiqueta: line.etiqueta,
                estado: entry.estado,
                debeUsd: line.debeUsd || 0,
                haberUsd: line.haberUsd || 0,
                debeVes: line.debeVes || 0,
                haberVes: line.haberVes || 0
              })
            }
          })
        }
      })

      // If search query is provided, filter lines
      const filteredLines = searchQuery.trim()
        ? linesForAccount.filter(
            l =>
              l.numeroAsiento.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (l.documentoReferencia && l.documentoReferencia.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (l.contactoNombre && l.contactoNombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
              l.etiqueta.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : linesForAccount

      // Skip accounts with no movements if not filtering specifically by this account
      if (!selectedAccountCode && filteredLines.length === 0 && acc.saldoUsd === 0) {
        return
      }

      // Calculate initial balance (saldo antes del rango o estimación base)
      const isDebitNormal = acc.tipo.startsWith('ASSET') || acc.tipo.startsWith('EXPENSE') || acc.tipo === 'COST_OF_GOODS'
      const saldoInicialUsd = 0 // En Odoo el saldo inicial antes del período
      const saldoInicialVes = 0

      let runningUsd = saldoInicialUsd
      let runningVes = saldoInicialVes

      const calculatedItems = filteredLines.map(line => {
        const netUsd = isDebitNormal ? line.debeUsd - line.haberUsd : line.haberUsd - line.debeUsd
        const netVes = isDebitNormal ? line.debeVes - line.haberVes : line.haberVes - line.debeVes

        runningUsd += netUsd
        runningVes += netVes

        return {
          ...line,
          saldoAcumuladoUsd: Number(runningUsd.toFixed(2)),
          saldoAcumuladoVes: Number(runningVes.toFixed(2))
        }
      })

      const totalDebeUsd = Number(calculatedItems.reduce((acc, it) => acc + it.debeUsd, 0).toFixed(2))
      const totalHaberUsd = Number(calculatedItems.reduce((acc, it) => acc + it.haberUsd, 0).toFixed(2))
      const totalDebeVes = Number(calculatedItems.reduce((acc, it) => acc + it.debeVes, 0).toFixed(2))
      const totalHaberVes = Number(calculatedItems.reduce((acc, it) => acc + it.haberVes, 0).toFixed(2))

      // If movements exist, final balance is running; otherwise it's the account's total balance
      const saldoFinalUsd = calculatedItems.length > 0 ? Number(runningUsd.toFixed(2)) : acc.saldoUsd
      const saldoFinalVes = calculatedItems.length > 0 ? Number(runningVes.toFixed(2)) : acc.saldoVes

      groups.push({
        account: acc,
        saldoInicialUsd,
        saldoInicialVes,
        items: calculatedItems,
        totalDebeUsd,
        totalHaberUsd,
        totalDebeVes,
        totalHaberVes,
        saldoFinalUsd,
        saldoFinalVes
      })
    })

    return groups
  }, [accounts, entries, selectedAccountCode, startDate, endDate, searchQuery, tasaBcv])

  // Summary Totals
  const grandTotalDebeUsd = ledgerGroups.reduce((acc, g) => acc + g.totalDebeUsd, 0)
  const grandTotalHaberUsd = ledgerGroups.reduce((acc, g) => acc + g.totalHaberUsd, 0)
  const grandTotalDebeVes = ledgerGroups.reduce((acc, g) => acc + g.totalDebeVes, 0)
  const grandTotalHaberVes = ledgerGroups.reduce((acc, g) => acc + g.totalHaberVes, 0)

  const handleExport = (type: 'EXCEL' | 'PDF') => {
    if (type === 'PDF') {
      window.print()
    } else {
      setToastMessage('Generando exportación de Libro Mayor en formato CSV/Excel...')
      const csvRows = ['Cuenta Código,Cuenta Nombre,Fecha,N° Asiento,Diario,Referencia,Tercero,Glosa,Debe USD,Haber USD,Saldo USD,Debe VES,Haber VES,Saldo VES']
      ledgerGroups.forEach(g => {
        g.items.forEach(it => {
          csvRows.push(
            `"${g.account.codigo}","${g.account.nombre}","${it.fecha}","${it.numeroAsiento}","${it.diarioNombre}","${it.documentoReferencia || ''}","${it.contactoNombre || ''}","${it.etiqueta.replace(/"/g, '""')}",${it.debeUsd},${it.haberUsd},${it.saldoAcumuladoUsd},${it.debeVes},${it.haberVes},${it.saldoAcumuladoVes}`
          )
        })
      })
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Libro_Mayor_${startDate}_al_${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%' }}>
      {/* Barra de Encabezado y Navegación de Reportes */}
      <ReportHeaderToolbar
        title='Libro Mayor'
        subtitle='Cronología analítica de movimientos, cargos, abonos y saldos acumulados por cuenta contable'
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
              sx={{ width: 145 }}
            />
            <TextField
              size='small'
              type='date'
              label='Hasta'
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 145 }}
            />
          </Box>
        }
      />

      {/* Barra de Filtros Específicos del Libro Mayor (Cuenta y Búsqueda) */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1 }}>
          {/* Selector de Cuenta Contable */}
          <TextField
            select
            size='small'
            label='Filtrar por Cuenta'
            value={selectedAccountCode}
            onChange={e => setSelectedAccountCode(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            <MenuItem value=''>
              <em>Todas las Cuentas con Movimiento</em>
            </MenuItem>
            {accounts.map(acc => (
              <MenuItem key={acc.id} value={acc.codigo}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6C5CE7', marginRight: 8 }}>
                  {acc.codigo}
                </span>
                <span>{acc.nombre}</span>
              </MenuItem>
            ))}
          </TextField>

          {/* Búsqueda por Asiento, Tercero o Referencia */}
          <TextField
            size='small'
            placeholder='Buscar por N° asiento, tercero, factura...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
            sx={{ width: { xs: '100%', sm: 320 } }}
          />

          {selectedAccountCode && (
            <Button
              size='small'
              variant='text'
              onClick={() => setSelectedAccountCode('')}
              startIcon={<i className='tabler-x' style={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none', color: '#EF4444', fontWeight: 600 }}
            >
              Quitar filtro de cuenta
            </Button>
          )}
        </Box>

        <Typography variant='body2' sx={{ color: '#64748B', fontWeight: 600 }}>
          Mostrando <strong>{ledgerGroups.length}</strong> {ledgerGroups.length === 1 ? 'cuenta' : 'cuentas'}
        </Typography>
      </Box>

      {/* Contenido: Listado de Cuentas del Libro Mayor (Odoo Style) */}
      {loading ? (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant='rectangular' height={60} sx={{ borderRadius: '12px' }} />
          <Skeleton variant='rectangular' height={180} sx={{ borderRadius: '12px' }} />
          <Skeleton variant='rectangular' height={180} sx={{ borderRadius: '12px' }} />
        </Box>
      ) : ledgerGroups.length === 0 ? (
        <Card sx={{ p: 8, textAlign: 'center', borderRadius: '20px', border: '1px solid #E6E4F0' }}>
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(108, 92, 231, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <i className='tabler-books' style={{ fontSize: 28, color: '#6C5CE7' }} />
          </Box>
          <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>
            No se encontraron movimientos
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B', maxWidth: 450, mx: 'auto' }}>
            No hay registros contables para la cuenta o el rango de fechas seleccionado. Prueba ampliando las fechas o seleccionando otra cuenta.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {ledgerGroups.map(group => {
            return (
              <Card
                key={group.account.id}
                sx={{
                  border: '1px solid #E6E4F0',
                  borderRadius: '18px',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}
              >
                {/* Cabecera de la Cuenta */}
                <Box
                  sx={{
                    p: 2.5,
                    px: 3,
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography
                      variant='body1'
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: '#6C5CE7',
                        fontSize: '1rem',
                        backgroundColor: 'rgba(108, 92, 231, 0.08)',
                        px: 1.5,
                        py: 0.3,
                        borderRadius: '6px'
                      }}
                    >
                      {group.account.codigo}
                    </Typography>
                    <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#1E293B' }}>
                      {group.account.nombre}
                    </Typography>
                    <Chip
                      label={group.account.tipo}
                      size='small'
                      sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: '#EDE9FE', color: '#6D28D9', borderRadius: '9999px' }}
                    />
                  </Box>

                  {/* Saldo Final de la Cuenta */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Saldo Final:
                    </Typography>
                    <Typography variant='subtitle1' sx={{ fontWeight: 800, color: '#1E293B' }}>
                      {currencyMode === 'VES'
                        ? `${(group.saldoFinalUsd * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`
                        : `$${group.saldoFinalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Typography>
                    {currencyMode === 'DUAL' && (
                      <Chip
                        label={`${(group.saldoFinalUsd * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`}
                        size='small'
                        sx={{ fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '9999px' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Tabla de Movimientos del Período */}
                <TableContainer>
                  <Table size='small'>
                    <TableHead sx={{ backgroundColor: '#FFFFFF' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 1.2 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>N° Asiento</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>Diario</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>Referencia</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>Tercero</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#64748B' }}>Glosa / Concepto</TableCell>
                        {currencyMode !== 'VES' && (
                          <>
                            <TableCell align='right' sx={{ fontWeight: 700, color: '#64748B', width: 130 }}>Debe ($)</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 700, color: '#64748B', width: 130 }}>Haber ($)</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 700, color: '#64748B', width: 150 }}>Saldo Acum. ($)</TableCell>
                          </>
                        )}
                        {currencyMode !== 'USD' && (
                          <>
                            <TableCell align='right' sx={{ fontWeight: 700, color: '#64748B', width: 140 }}>Debe (Bs.)</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 700, color: '#64748B', width: 140 }}>Haber (Bs.)</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 700, color: '#64748B', width: 160 }}>Saldo Acum. (Bs.)</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align='center' sx={{ py: 3, color: '#94A3B8' }}>
                            Sin movimientos en el rango de fechas seleccionado (Saldo acumulado registrado: ${group.saldoFinalUsd.toFixed(2)})
                          </TableCell>
                        </TableRow>
                      ) : (
                        group.items.map((it, idx) => (
                          <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ color: '#64748B', py: 1 }}>{it.fecha}</TableCell>
                            <TableCell>
                              <Typography
                                component={Link}
                                href='/accounting/journal-entries'
                                variant='body2'
                                sx={{
                                  fontWeight: 700,
                                  color: '#6C5CE7',
                                  textDecoration: 'none',
                                  fontFamily: 'monospace',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                              >
                                {it.numeroAsiento}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#475569', fontSize: '0.82rem' }}>{it.diarioNombre}</TableCell>
                            <TableCell sx={{ color: '#64748B', fontSize: '0.82rem' }}>
                              {it.documentoReferencia || '—'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>
                              {it.contactoNombre || '—'}
                            </TableCell>
                            <TableCell sx={{ color: '#334155', maxWidth: 260 }}>
                              {it.etiqueta}
                            </TableCell>

                            {/* Columnas USD */}
                            {currencyMode !== 'VES' && (
                              <>
                                <TableCell align='right' sx={{ color: it.debeUsd > 0 ? '#1E293B' : '#CBD5E1', fontWeight: it.debeUsd > 0 ? 600 : 400 }}>
                                  {it.debeUsd > 0 ? `$${it.debeUsd.toFixed(2)}` : '—'}
                                </TableCell>
                                <TableCell align='right' sx={{ color: it.haberUsd > 0 ? '#1E293B' : '#CBD5E1', fontWeight: it.haberUsd > 0 ? 600 : 400 }}>
                                  {it.haberUsd > 0 ? `$${it.haberUsd.toFixed(2)}` : '—'}
                                </TableCell>
                                <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                                  ${it.saldoAcumuladoUsd.toFixed(2)}
                                </TableCell>
                              </>
                            )}

                            {/* Columnas VES */}
                            {currencyMode !== 'USD' && (
                              <>
                                <TableCell align='right' sx={{ color: it.debeVes > 0 ? '#1E293B' : '#CBD5E1', fontWeight: it.debeVes > 0 ? 600 : 400 }}>
                                  {it.debeVes > 0 ? `${it.debeVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` : '—'}
                                </TableCell>
                                <TableCell align='right' sx={{ color: it.haberVes > 0 ? '#1E293B' : '#CBD5E1', fontWeight: it.haberVes > 0 ? 600 : 400 }}>
                                  {it.haberVes > 0 ? `${it.haberVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` : '—'}
                                </TableCell>
                                <TableCell align='right' sx={{ fontWeight: 700, color: '#10B981' }}>
                                  {it.saldoAcumuladoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}

                      {/* Fila de Totales de la Cuenta */}
                      {group.items.length > 0 && (
                        <TableRow sx={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                          <TableCell colSpan={6} sx={{ fontWeight: 800, color: '#475569', py: 1.2 }}>
                            TOTAL MOVIMIENTOS ({group.account.nombre})
                          </TableCell>
                          {currencyMode !== 'VES' && (
                            <>
                              <TableCell align='right' sx={{ fontWeight: 800, color: '#1E293B' }}>
                                ${group.totalDebeUsd.toFixed(2)}
                              </TableCell>
                              <TableCell align='right' sx={{ fontWeight: 800, color: '#1E293B' }}>
                                ${group.totalHaberUsd.toFixed(2)}
                              </TableCell>
                              <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                                ${group.saldoFinalUsd.toFixed(2)}
                              </TableCell>
                            </>
                          )}
                          {currencyMode !== 'USD' && (
                            <>
                              <TableCell align='right' sx={{ fontWeight: 800, color: '#1E293B' }}>
                                {group.totalDebeVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                              </TableCell>
                              <TableCell align='right' sx={{ fontWeight: 800, color: '#1E293B' }}>
                                {group.totalHaberVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                              </TableCell>
                              <TableCell align='right' sx={{ fontWeight: 800, color: '#10B981' }}>
                                {group.saldoFinalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )
          })}
        </Box>
      )}

      {/* Resumen Global del Libro Mayor al Pie */}
      <Box
        sx={{
          p: 3,
          px: 4,
          borderRadius: '18px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label='✓ Libro Mayor Verificado'
            size='small'
            sx={{ fontWeight: 800, backgroundColor: '#10B981', color: '#FFFFFF', borderRadius: '9999px' }}
          />
          <Typography variant='body2' sx={{ color: '#334155', fontWeight: 600 }}>
            {currencyMode === 'VES'
              ? `Total Débitos: ${grandTotalDebeVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs. | Total Créditos: ${grandTotalHaberVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
              : `Total Débitos: $${grandTotalDebeUsd.toFixed(2)} | Total Créditos: $${grandTotalHaberUsd.toFixed(2)}`}
          </Typography>
        </Box>

        <Typography variant='caption' sx={{ color: '#64748B' }}>
          Formatos de Auditoría y Comprobantes VEN-NIF
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
