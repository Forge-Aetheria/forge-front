'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Menu from '@mui/material/Menu'
import Divider from '@mui/material/Divider'
import CustomChip from '@core/components/mui/Chip'
import TablePagination from '@mui/material/TablePagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { accountingService } from '@/services/accountingService'
import type { Payment, Journal, AccountingInvoice, Account } from '@/types/accountingTypes'
import { SinglePaymentDrawer } from './SinglePaymentDrawer'
import { PaymentFormView } from './PaymentFormView'

export const PaymentsListView: React.FC = () => {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') as 'CUSTOMER' | 'SUPPLIER' | null

  const [payments, setPayments] = useState<Payment[]>([])
  const [journals, setJournals] = useState<Journal[]>([])
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>(initialType || 'ALL')
  const [journalFilter, setJournalFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // View State (List vs Full Form View)
  const [currentView, setCurrentView] = useState<'list' | 'form'>(
    searchParams.get('action') === 'new' ? 'form' : 'list'
  )
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  // Modals & Drawers
  const [singlePaymentOpen, setSinglePaymentOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Control de Columnas Visibles
  const DEFAULT_VISIBLE_COLUMNS = {
    numeroPago: true,
    fecha: true,
    contacto: true,
    diario: true,
    metodoRef: true,
    monto: true,
    igtf: true,
    estado: true
  }
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS)
  const [columnAnchorEl, setColumnAnchorEl] = useState<null | HTMLElement>(null)

  // Selección Múltiple y Acciones en Lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<null | HTMLElement>(null)

  const tasaBcv = 54.00

  useEffect(() => {
    const qType = searchParams.get('type') as 'CUSTOMER' | 'SUPPLIER' | null

    if (qType) {
      setTypeFilter(qType)
    }
  }, [searchParams])

  const loadData = async () => {
    try {
      setLoading(true)
      const [jList, invList, accList] = await Promise.all([
        accountingService.getJournals(),
        accountingService.getInvoices(),
        accountingService.getAccounts()
      ])

      setJournals(jList)
      setInvoices(invList)
      setAccounts(accList)

      // Fetch stored payments
      const stored = localStorage.getItem('foundly_accounting_payments')
      const pList: Payment[] = stored ? JSON.parse(stored) : []

      // If empty, generate initial payment seeds for demonstration
      if (pList.length === 0) {
        const seedPayments: Payment[] = [
          {
            id: 'pag-seed-1',
            numeroPago: 'PAG-2026-0041',
            tipo: 'CUSTOMER',
            fecha: '2026-10-18',
            contactoId: 'ct-01',
            contactoNombre: 'Inversiones Caroní C.A.',
            diarioId: 'jou-bank-ves',
            diarioNombre: 'Banesco Banco Universal (VES)',
            metodoPago: 'TRANSFERENCIA',
            moneda: 'VES',
            monto: 31320.00,
            tasaBcvPago: 54.00,
            facturasConciliadas: [{ facturaId: 'inv-seed-1', numeroFactura: 'FAC-2026-0001', tasaBcvOriginal: 54.00, montoAplicadoUsd: 580.00, montoAplicadoVes: 31320.00, diferencialCambiarioVes: 0 }],
            aplicaIgtf: false,
            montoIgtfUsd: 0,
            montoIgtfVes: 0,
            referenciaBancaria: 'REF-889021',
            asientoContableId: 'as-seed-p1',
            estado: 'CONFIRMADO',
            creadoEn: '2026-10-18 10:15'
          },
          {
            id: 'pag-seed-2',
            numeroPago: 'PAG-2026-0042',
            tipo: 'SUPPLIER',
            fecha: '2026-10-19',
            contactoId: 'ct-prov-01',
            contactoNombre: 'Distribuidora Eléctrica del Sur C.A.',
            diarioId: 'jou-bank-usd',
            diarioNombre: 'Banesco Cuenta Custodia (USD)',
            metodoPago: 'TRANSFERENCIA',
            moneda: 'USD',
            monto: 1200.00,
            tasaBcvPago: 54.00,
            facturasConciliadas: [],
            aplicaIgtf: true,
            montoIgtfUsd: 36.00,
            montoIgtfVes: 1944.00,
            referenciaBancaria: 'CUST-009182',
            asientoContableId: 'as-seed-p2',
            estado: 'CONFIRMADO',
            creadoEn: '2026-10-19 11:30'
          }
        ]

        localStorage.setItem('foundly_accounting_payments', JSON.stringify(seedPayments))
        setPayments(seedPayments)
      } else {
        setPayments(pList)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch =
        p.numeroPago.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contactoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.referenciaBancaria && p.referenciaBancaria.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchJournal = journalFilter === 'ALL' || p.diarioId === journalFilter

      const matchType =
        typeFilter === 'ALL' ||
        p.tipo === typeFilter ||
        (!p.tipo && (typeFilter === 'CUSTOMER' ? !p.contactoId.includes('prov') : p.contactoId.includes('prov')))

      return matchSearch && matchJournal && matchType
    })
  }, [payments, searchTerm, journalFilter, typeFilter])

  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredPayments, page, rowsPerPage])

  const handlePaymentSuccess = (msg: string) => {
    setToastMessage(msg)
    loadData()
  }

  if (currentView === 'form') {
    return (
      <PaymentFormView
        payment={selectedPayment}
        initialType={typeFilter === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER'}
        journals={journals}
        invoices={invoices}
        accounts={accounts}
        defaultTasaBcv={tasaBcv}
        onBack={() => {
          setCurrentView('list')
          setSelectedPayment(null)
        }}
        onSuccess={(msg, savedPayment) => {
          handlePaymentSuccess(msg)
          if (savedPayment) {
            setSelectedPayment(savedPayment)
            setCurrentView('form')
          }
        }}
      />
    )
  }

  const isAllSelected = paginatedPayments.length > 0 && paginatedPayments.every(p => selectedIds.includes(p.id))
  const isIndeterminate = paginatedPayments.some(p => selectedIds.includes(p.id)) && !isAllSelected

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(paginatedPayments.map(p => p.id))
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)))
    } else {
      const pageIds = paginatedPayments.map(p => p.id)
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleCopySelected = () => {
    const selectedList = payments.filter(p => selectedIds.includes(p.id))
    const text = selectedList.map(p => `${p.numeroPago} - ${p.contactoNombre} - ${p.moneda} ${p.monto}`).join('\n')
    navigator.clipboard.writeText(text)
    setToastMessage(`${selectedIds.length} pagos copiados al portapapeles.`)
    setBatchMenuAnchorEl(null)
  }

  const totalVisibleCols = 1 + Object.values(visibleColumns).filter(Boolean).length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            {typeFilter === 'CUSTOMER'
              ? 'Cobros y Pagos de Clientes'
              : typeFilter === 'SUPPLIER'
                ? 'Pagos a Proveedores y Egresos'
                : 'Tesorería y Movimientos de Pago'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CustomChip
                size='small'
                variant='tonal'
                color='primary'
                label={`${selectedIds.length} seleccionados`}
                onDelete={() => setSelectedIds([])}
              />
              <Button
                variant='outlined'
                size='small'
                onClick={e => setBatchMenuAnchorEl(e.currentTarget)}
                startIcon={<i className='tabler-settings text-base' />}
                endIcon={<i className='tabler-chevron-down text-xs' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  px: 2.5,
                  py: 0.8,
                  backgroundColor: '#FFFFFF',
                  '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                }}
              >
                Acciones
              </Button>
            </Box>
          )}

          {typeFilter !== 'CUSTOMER' && (
            <Button
              component={Link}
              href='/accounting/payments/batches'
              variant='outlined'
              startIcon={<i className='tabler-layers-linked' />}
              sx={{
                borderRadius: '9999px',
                borderColor: '#6C5CE7',
                color: '#6C5CE7',
                fontWeight: 600,
                textTransform: 'none',
                px: 3
              }}
            >
              Lotes de Proveedores
            </Button>
          )}

          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => { setSelectedPayment(null); setCurrentView('form'); }}
            sx={{
              borderRadius: '9999px',
              backgroundColor: typeFilter === 'CUSTOMER' ? '#10B981' : '#6C5CE7',
              fontWeight: 700,
              textTransform: 'none',
              px: 4,
              '&:hover': { backgroundColor: typeFilter === 'CUSTOMER' ? '#059669' : '#5b4bc4' }
            }}
          >
            Nuevo
          </Button>
        </Box>
      </Box>

      {/* Main Card */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            placeholder='Buscar por N° pago, contacto o referencia...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ flex: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />

          <TextField
            select
            size='small'
            value={journalFilter}
            onChange={e => setJournalFilter(e.target.value)}
            sx={{ width: 260 }}
          >
            <MenuItem value='ALL'>Todos los diarios</MenuItem>
            {journals.map(j => (
              <MenuItem key={j.id} value={j.id}>
                {j.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Table Toolbar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 2,
            backgroundColor: '#FAF9FF',
            border: '1px solid #E6E4F0',
            borderBottom: 'none',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Movimientos de Pago Registrados
            </Typography>
            <CustomChip
              label={`${filteredPayments.length} ${filteredPayments.length === 1 ? 'pago' : 'pagos'}`}
              variant='tonal'
              color='primary'
              size='small'
            />
          </Box>

          <Button
            size='small'
            variant='outlined'
            startIcon={<i className='tabler-layout-columns text-base' />}
            onClick={e => setColumnAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: '9999px',
              borderColor: '#E6E4F0',
              color: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 2,
              py: 0.6,
              backgroundColor: '#FFFFFF',
              '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F3F0FF' }
            }}
          >
            Columnas
          </Button>
        </Box>

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
              <TableRow>
                <TableCell padding='checkbox' sx={{ width: 44 }}>
                  <Checkbox
                    size='small'
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    sx={{
                      color: '#6C5CE7',
                      '&.Mui-checked': { color: '#6C5CE7' },
                      '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' }
                    }}
                  />
                </TableCell>
                {visibleColumns.numeroPago && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Pago</TableCell>}
                {visibleColumns.fecha && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>}
                {visibleColumns.contacto && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contacto</TableCell>}
                {visibleColumns.diario && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Diario de Banco / Caja</TableCell>}
                {visibleColumns.metodoRef && <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Método & Ref.</TableCell>}
                {visibleColumns.monto && <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Monto Pagado</TableCell>}
                {visibleColumns.igtf && <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>IGTF (3%)</TableCell>}
                {visibleColumns.estado && <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Estado</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={totalVisibleCols}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalVisibleCols} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se han registrado pagos aún.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map(p => {
                  const isSelected = selectedIds.includes(p.id)

                  return (
                    <TableRow
                      key={p.id}
                      hover
                      selected={isSelected}
                      onClick={() => {
                        setSelectedPayment(p)
                        setCurrentView('form')
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': { backgroundColor: 'rgba(108, 92, 231, 0.08) !important' },
                        '&:last-child td, &:last-child th': { border: 0 }
                      }}
                    >
                      <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                        <Checkbox
                          size='small'
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.id)}
                          sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                        />
                      </TableCell>

                      {visibleColumns.numeroPago && (
                        <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                          {p.numeroPago}
                        </TableCell>
                      )}

                      {visibleColumns.fecha && (
                        <TableCell sx={{ color: '#64748B' }}>
                          {p.fecha}
                        </TableCell>
                      )}

                      {visibleColumns.contacto && (
                        <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                          {p.contactoNombre}
                        </TableCell>
                      )}

                      {visibleColumns.diario && (
                        <TableCell sx={{ color: '#64748B' }}>
                          {p.diarioNombre}
                        </TableCell>
                      )}

                      {visibleColumns.metodoRef && (
                        <TableCell>
                          <Typography variant='body2' sx={{ fontWeight: 500, color: '#1E293B' }}>
                            {p.metodoPago}
                          </Typography>
                          {p.referenciaBancaria && (
                            <Typography variant='caption' sx={{ color: '#64748B', fontFamily: 'monospace', display: 'block' }}>
                              Ref: {p.referenciaBancaria}
                            </Typography>
                          )}
                          {p.cuentaBancariaInfo && (
                            <Typography variant='caption' sx={{ color: '#6C5CE7', fontWeight: 600, display: 'block' }}>
                              <i className='tabler-building-bank text-xs mr-1' />
                              {p.cuentaBancariaInfo}
                            </Typography>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.monto && (
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontWeight: 700, color: p.moneda === 'USD' ? '#6C5CE7' : '#10B981' }}>
                            {p.moneda === 'USD'
                              ? `$${p.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `${p.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`}
                          </Typography>
                          <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                            Tasa: {p.tasaBcvPago.toFixed(2)} Bs.
                          </Typography>
                        </TableCell>
                      )}

                      {visibleColumns.igtf && (
                        <TableCell align='center'>
                          {p.aplicaIgtf ? (
                            <CustomChip
                              label={`+${p.montoIgtfUsd.toFixed(2)} $`}
                              size='small'
                              variant='tonal'
                              color='error'
                            />
                          ) : (
                            <Typography variant='caption' sx={{ color: '#94A3B8' }}>—</Typography>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.estado && (
                        <TableCell align='center'>
                          <CustomChip
                            label='Confirmado'
                            size='small'
                            variant='tonal'
                            color='success'
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component='div'
          count={filteredPayments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          labelRowsPerPage='Filas por página:'
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      {/* Menú de Personalización de Columnas */}
      <Menu
        anchorEl={columnAnchorEl}
        open={Boolean(columnAnchorEl)}
        onClose={() => setColumnAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <Typography variant='caption' sx={{ fontWeight: 700, color: '#6B7280', px: 3, py: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>
          COLUMNAS VISIBLES
        </Typography>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, numeroPago: !prev.numeroPago }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.numeroPago)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>N° Pago</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, fecha: !prev.fecha }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.fecha)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Fecha</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, contacto: !prev.contacto }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.contacto)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Contacto</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, diario: !prev.diario }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.diario)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Diario de Banco / Caja</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, metodoRef: !prev.metodoRef }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.metodoRef)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Método & Ref.</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, monto: !prev.monto }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.monto)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Monto Pagado</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, igtf: !prev.igtf }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.igtf)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>IGTF (3%)</Typography>
        </MenuItem>
        <MenuItem dense onClick={() => setVisibleColumns(prev => ({ ...prev, estado: !prev.estado }))} sx={{ borderRadius: '8px' }}>
          <Checkbox checked={Boolean(visibleColumns.estado)} size='small' sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' }, p: 0.5, mr: 1 }} />
          <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>Estado</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
            setColumnAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', color: '#6C5CE7', fontWeight: 600, fontSize: '0.8rem' }}
        >
          <i className='tabler-rotate text-sm mr-2' /> Restablecer Columnas
        </MenuItem>
      </Menu>

      {/* Menú de Acciones en Lote */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={() => setBatchMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1,
              minWidth: 220,
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
              border: '1px solid #E6E4F0'
            }
          }
        }}
      >
        <MenuItem dense onClick={handleCopySelected} sx={{ borderRadius: '8px', py: 1 }}>
          <i className='tabler-copy text-base mr-2 text-[#6C5CE7]' />
          <Typography variant='body2' sx={{ fontWeight: 600 }}>Copiar Pagos</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          dense
          onClick={() => {
            setSelectedIds([])
            setBatchMenuAnchorEl(null)
          }}
          sx={{ borderRadius: '8px', py: 1, color: '#64748B' }}
        >
          <i className='tabler-x text-base mr-2' />
          <Typography variant='body2'>Deseleccionar</Typography>
        </MenuItem>
      </Menu>

      {/* Drawer de Pago Individual */}
      <SinglePaymentDrawer
        open={singlePaymentOpen}
        onClose={() => setSinglePaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
        journals={journals}
        invoices={invoices}
        tasaBcv={tasaBcv}
      />

      {/* Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' sx={{ borderRadius: '12px' }} onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
