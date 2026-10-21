'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
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

      // If empty, generate 2 initial payment seeds for demonstration
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
            facturasConciliadas: [
              {
                facturaId: 'inv-seed-1',
                numeroFactura: 'INV-2026-0089',
                tasaBcvOriginal: 52.00,
                montoAplicadoUsd: 580.00,
                montoAplicadoVes: 31320.00,
                diferencialCambiarioVes: 1160.00
              }
            ],
            aplicaIgtf: false,
            montoIgtfUsd: 0,
            montoIgtfVes: 0,
            referenciaBancaria: 'REF-88992123',
            asientoContableId: 'as-seed-p1',
            estado: 'CONFIRMADO',
            creadoEn: '2026-10-18 10:00'
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
        onSuccess={msg => {
          handlePaymentSuccess(msg)
          setCurrentView('list')
          setSelectedPayment(null)
        }}
      />
    )
  }

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

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
        </Box>

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Pago</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contacto</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Diario de Banco / Caja</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Método & Ref.</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Monto Pagado</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>IGTF (3%)</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={8}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se han registrado pagos aún.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map(p => (
                  <TableRow
                    key={p.id}
                    hover
                    onClick={() => {
                      setSelectedPayment(p)
                      setCurrentView('form')
                    }}
                    sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {p.numeroPago}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B' }}>
                      {p.fecha}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                      {p.contactoNombre}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B' }}>
                      {p.diarioNombre}
                    </TableCell>
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
                    <TableCell align='center'>
                      <CustomChip
                        label='Confirmado'
                        size='small'
                        variant='tonal'
                        color='success'
                      />
                    </TableCell>
                  </TableRow>
                ))
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
