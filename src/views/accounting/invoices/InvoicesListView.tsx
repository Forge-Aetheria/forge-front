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
import Checkbox from '@mui/material/Checkbox'
import Menu from '@mui/material/Menu'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import { useSearchParams, useRouter } from 'next/navigation'

import { accountingService, isInvoiceLandedCostEligible } from '@/services/accountingService'
import { settingsService } from '@/services/settingsService'
import type { Account, AccountingInvoice, InvoiceAccountingType, InvoiceStatus } from '@/types/accountingTypes'
import { InvoiceFormView } from './InvoiceFormView'
import { CreditNoteFormView } from '../credit-notes/CreditNoteFormView'
import { CancelInvoiceModal } from './components/CancelInvoiceModal'
import { CreateCreditNoteModal } from './components/CreateCreditNoteModal'

export const InvoicesListView: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') as InvoiceAccountingType | null
  const createFromQuote = searchParams.get('create_from_quote')
  const createFromPurchase = searchParams.get('create_from_purchase')

  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [costosEnDestinoActivos, setCostosEnDestinoActivos] = useState(true)
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | InvoiceAccountingType>(initialType || 'SUPPLIER')
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Modals for Actions from list
  const [cancelTargetInvoice, setCancelTargetInvoice] = useState<AccountingInvoice | null>(null)
  const [creditNoteTargetInvoice, setCreditNoteTargetInvoice] = useState<AccountingInvoice | null>(null)

  useEffect(() => {
    const qType = searchParams.get('type') as InvoiceAccountingType | null

    if (qType) {
      setTypeFilter(qType)
    } else if (initialType) {
      setTypeFilter(initialType)
    }
  }, [searchParams])

  // Full view state (Vista Completa)
  const [isFormActive, setIsFormActive] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<AccountingInvoice | null>(null)

  useEffect(() => {
    if (createFromQuote || createFromPurchase) {
      setSelectedInvoice(null)
      setIsFormActive(true)
    }
  }, [createFromQuote, createFromPurchase])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [actionsAnchor, setActionsAnchor] = useState<null | HTMLElement>(null)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [invList, accList, fiscalRules] = await Promise.all([
        accountingService.getInvoices(),
        accountingService.getAccounts(),
        settingsService.getFiscalRules().catch(() => null)
      ])

      setInvoices(invList)
      setAccounts(accList)
      if (fiscalRules && 'costosEnDestinoActivos' in fiscalRules) {
        setCostosEnDestinoActivos(fiscalRules.costosEnDestinoActivos !== false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Las notas de crédito tienen su propio apartado exclusivo (/accounting/credit-notes)
      if (inv.tipoDocumento === 'NOTA_CREDITO') return false;
      const matchSearch =
        inv.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.contactoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.contactoRif.toLowerCase().includes(searchTerm.toLowerCase())

      const matchType = typeFilter === 'ALL' || inv.tipo === typeFilter
      const matchStatus = statusFilter === 'ALL' || inv.estado === statusFilter
      const matchDocType = docTypeFilter === 'ALL' || (inv.tipoDocumento || 'FACTURA') === docTypeFilter

      return matchSearch && matchType && matchStatus && matchDocType
    })
  }, [invoices, searchTerm, typeFilter, statusFilter, docTypeFilter])

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredInvoices, page, rowsPerPage])

  const handleCancelSuccess = (canceled: AccountingInvoice) => {
    setInvoices(prev => prev.map(i => (i.id === canceled.id ? canceled : i)))
    setToastMessage(`Factura ${canceled.numeroFactura} anulada con éxito.`)
  }

  const handleCreditNoteSuccess = (nc: AccountingInvoice, updatedInvoice: AccountingInvoice) => {
    setInvoices(prev => [nc, ...prev.map(i => (i.id === updatedInvoice.id ? updatedInvoice : i))])
    setToastMessage(`Nota de Crédito ${nc.numeroFactura} emitida y aplicada a la factura con éxito.`)
  }

  const handleOpenCreate = () => {
    setSelectedInvoice(null)
    setIsFormActive(true)
  }

  const handleOpenDetail = (inv: AccountingInvoice) => {
    setSelectedInvoice(inv)
    setIsFormActive(true)
  }

  const handleInvoiceSaved = (saved: AccountingInvoice) => {
    setInvoices(prev => {
      const index = prev.findIndex(i => i.id === saved.id)

      if (index >= 0) {
        const copy = [...prev]

        copy[index] = saved

        return copy
      }

      return [saved, ...prev]
    })
    setToastMessage(`Factura ${saved.numeroFactura} guardada con éxito.`)
    setIsFormActive(false)
  }

  const handleInvoiceUpdated = (updated: AccountingInvoice) => {
    setInvoices(prev => {
      const index = prev.findIndex(i => i.id === updated.id)
      if (index >= 0) {
        const copy = [...prev]
        copy[index] = updated
        return copy
      }
      return [updated, ...prev]
    })
    setSelectedInvoice(updated)
  }

  if (isFormActive) {
    if (selectedInvoice?.tipoDocumento === 'NOTA_CREDITO') {
      return (
        <CreditNoteFormView
          onBack={() => {
            setIsFormActive(false)
            setSelectedInvoice(null)
          }}
          onSaved={handleInvoiceSaved}
          creditNote={selectedInvoice}
          initialType={selectedInvoice.tipo}
        />
      )
    }

    return (
      <InvoiceFormView
        onBack={() => setIsFormActive(false)}
        onSaved={handleInvoiceSaved}
        onInvoiceUpdated={handleInvoiceUpdated}
        invoice={selectedInvoice}
        initialType={
          createFromQuote
            ? 'CUSTOMER'
            : createFromPurchase
            ? 'SUPPLIER'
            : typeFilter === 'CUSTOMER'
            ? 'CUSTOMER'
            : 'SUPPLIER'
        }
        createFromQuoteId={createFromQuote || undefined}
        createFromPurchaseId={createFromPurchase || undefined}
        accounts={accounts}
      />
    )
  }

  const getStatusChip = (status: InvoiceStatus, inv?: AccountingInvoice) => {
    const totalNc = (inv?.notasCreditoAplicadas || []).reduce((acc, nc) => acc + (nc.montoUsd || 0), 0)
    const isNcReversed = inv && totalNc >= (inv.totalUsd - 0.01) && totalNc > 0

    if (status === 'REVERSED' || isNcReversed) {
      return (
        <CustomChip
          label='Revertida'
          size='small'
          variant='tonal'
          color='primary'
        />
      )
    }

    if (inv && inv.pagosAsociados && inv.pagosAsociados.length > 0 && inv.saldoPendienteUsd > 0.01) {
      return (
        <CustomChip
          label='Abonada Parcial'
          size='small'
          variant='tonal'
          color='warning'
        />
      )
    }

    switch (status) {
      case 'PAID':
        return <CustomChip label='Pagada' size='small' variant='tonal' color='success' />
      case 'POSTED':
        return <CustomChip label='Publicada' size='small' variant='tonal' color='primary' />
      case 'DRAFT':
        return <CustomChip label='Borrador' size='small' variant='tonal' color='secondary' />
      case 'CANCELED':
        return <CustomChip label='Anulada' size='small' variant='tonal' color='error' />
      default:
        return <CustomChip label='Revertida' size='small' variant='tonal' color='primary' />
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            {typeFilter === 'CUSTOMER'
              ? 'Facturas de Clientes (CxC)'
              : typeFilter === 'SUPPLIER'
                ? 'Facturas de Proveedores (CxP)'
                : 'Facturas Contables'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CustomChip
                label={`${selectedIds.length} seleccionados`}
                size='small'
                variant='tonal'
                color='primary'
                onDelete={() => setSelectedIds([])}
              />
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-settings' />}
                endIcon={<i className='tabler-chevron-down' />}
                onClick={e => setActionsAnchor(e.currentTarget)}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#1E1B2E',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Acciones
              </Button>
              <Menu
                anchorEl={actionsAnchor}
                open={Boolean(actionsAnchor)}
                onClose={() => setActionsAnchor(null)}
                PaperProps={{ sx: { borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } }}
              >
                <MenuItem
                  onClick={() => {
                    const selInvoices = invoices.filter(i => selectedIds.includes(i.id))
                    const numbers = selInvoices.map(i => i.numeroFactura).join(', ')
                    navigator.clipboard.writeText(numbers)
                    setToastMessage('Números de facturas copiados al portapapeles')
                    setActionsAnchor(null)
                  }}
                  className='text-xs font-medium'
                >
                  <i className='tabler-copy mr-2 text-base text-[#6C5CE7]' /> Copiar Números
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setSelectedIds([])
                    setActionsAnchor(null)
                  }}
                  className='text-xs font-medium text-[#6B7280]'
                >
                  <i className='tabler-x mr-2 text-base' /> Deseleccionar
                </MenuItem>
              </Menu>
            </Box>
          )}

          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={handleOpenCreate}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              fontWeight: 700,
              textTransform: 'none',
              px: 4,
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Nuevo
          </Button>
        </Box>
      </Box>

      {/* Tarjeta principal con tabla */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            placeholder='Buscar por número, contacto o RIF...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />

          

          <TextField
            select
            size='small'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            sx={{ width: 160 }}
          >
            <MenuItem value='ALL'>Todos los estados</MenuItem>
            <MenuItem value='DRAFT'>Borrador</MenuItem>
            <MenuItem value='POSTED'>Publicada</MenuItem>
            <MenuItem value='PAID'>Pagada</MenuItem>
            <MenuItem value='REVERSED'>Revertida</MenuItem>
            <MenuItem value='CANCELED'>Anulada</MenuItem>
          </TextField>

          <TextField
            select
            size='small'
            value={docTypeFilter}
            onChange={e => setDocTypeFilter(e.target.value)}
            sx={{ width: 170 }}
          >
            <MenuItem value='ALL'>Todos los docs</MenuItem>
            <MenuItem value='FACTURA'>Facturas</MenuItem>
            <MenuItem value='NOTA_ENTREGA'>Notas de Entrega</MenuItem>
            <MenuItem value='RECIBO'>Recibos</MenuItem>
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
              Facturas Registradas
            </Typography>
            <CustomChip
              label={`${filteredInvoices.length} ${filteredInvoices.length === 1 ? 'factura' : 'facturas'}`}
              variant='tonal'
              color='primary'
              size='small'
            />
          </Box>
        </Box>

        {/* Tabla */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
              <TableRow>
                <TableCell padding='checkbox' sx={{ width: 44, p: 0.5 }}>
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredInvoices.length}
                    checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(filteredInvoices.map(i => i.id))
                      } else {
                        setSelectedIds([])
                      }
                    }}
                    sx={{
                      color: '#6C5CE7',
                      '&.Mui-checked': { color: '#6C5CE7' },
                      '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Factura</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contacto / RIF</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Total (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Total (VES)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Saldo Pendiente</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Estado</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={10}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se encontraron facturas con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map(inv => (
                  <TableRow
                    key={inv.id}
                    hover
                    selected={selectedIds.includes(inv.id)}
                    sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                    onClick={() => handleOpenDetail(inv)}
                  >
                    <TableCell padding='checkbox' sx={{ width: 44, p: 0.5 }} onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(inv.id)}
                        onChange={() => {
                          setSelectedIds(prev =>
                            prev.includes(inv.id) ? prev.filter(x => x !== inv.id) : [...prev, inv.id]
                          )
                        }}
                        sx={{
                          color: '#6C5CE7',
                          '&.Mui-checked': { color: '#6C5CE7' }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                        <CustomChip
                          label={inv.tipo === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
                          size='small'
                          variant='tonal'
                          color={inv.tipo === 'CUSTOMER' ? 'success' : 'error'}
                        />
                        <CustomChip
                          label={
                            inv.tipoDocumento === 'NOTA_ENTREGA'
                              ? 'Nota Entrega'
                              : inv.tipoDocumento === 'RECIBO'
                              ? 'Recibo'
                              : inv.tipoDocumento === 'NOTA_CREDITO'
                              ? 'Nota Crédito'
                              : inv.tipoDocumento === 'NOTA_DEBITO'
                              ? 'Nota Débito'
                              : 'Factura'
                          }
                          size='small'
                          variant='tonal'
                          color={inv.tipoDocumento === 'NOTA_CREDITO' ? 'primary' : 'secondary'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 700,
                              color: inv.estado === 'CANCELED' ? '#94A3B8' : '#1E293B',
                              textDecoration: inv.estado === 'CANCELED' ? 'line-through' : 'none'
                            }}
                          >
                            {inv.numeroFactura}
                          </Typography>
                          {inv.tipoDocumento === 'NOTA_CREDITO' && inv.facturaAfectadaNumero && (
                            <Typography variant='caption' sx={{ color: '#6C5CE7', fontWeight: 600, display: 'block' }}>
                              Ref: {inv.facturaAfectadaNumero}
                            </Typography>
                          )}
                          {inv.motivoAnulacion && (
                            <Typography variant='caption' sx={{ color: '#EF4444', display: 'block' }}>
                              Anulada
                            </Typography>
                          )}
                        </Box>
                        {inv.notasCreditoAplicadas && inv.notasCreditoAplicadas.length > 0 && (
                          <Tooltip title={`${inv.notasCreditoAplicadas.length} Nota(s) de Crédito aplicada(s)`}>
                            <CustomChip
                              label={`${inv.notasCreditoAplicadas.length} NC`}
                              size='small'
                              variant='tonal'
                              color='primary'
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {inv.contactoNombre}
                      </Typography>
                      <Typography variant='caption' sx={{ color: '#64748B' }}>
                        {inv.contactoRif}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#64748B' }}>
                      {inv.fechaEmision}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                      ${inv.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align='right' sx={{ color: '#64748B' }}>
                      {inv.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: inv.saldoPendienteUsd > 0 ? '#EF4444' : '#10B981' }}>
                      ${inv.saldoPendienteUsd.toFixed(2)}
                    </TableCell>
                    <TableCell align='center'>
                      {getStatusChip(inv.estado, inv)}
                    </TableCell>
                    <TableCell align='center' onClick={e => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title='Ver Detalle'>
                          <IconButton size='small' onClick={() => handleOpenDetail(inv)} sx={{ color: '#6C5CE7' }}>
                            <i className='tabler-eye text-base' />
                          </IconButton>
                        </Tooltip>

                        {/* Acción rápida Crear Costo en Destino si es Factura de Proveedor con ítems de costo en destino */}
                        {isInvoiceLandedCostEligible(inv, costosEnDestinoActivos) && (
                          <Tooltip title='Crear Costo en Destino'>
                            <IconButton
                              size='small'
                              onClick={() => router.push(`/inventory/operations/landed-costs/create?invoiceId=${inv.id}`)}
                              sx={{ color: '#10B981', '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.08)' } }}
                            >
                              <i className='tabler-calculator text-base' />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Acción rápida Emitir Nota de Crédito */}
                        {inv.estado !== 'DRAFT' && inv.estado !== 'CANCELED' && inv.tipoDocumento !== 'NOTA_CREDITO' && (
                          <Tooltip title='Emitir Nota de Crédito'>
                            <IconButton
                              size='small'
                              onClick={() => setCreditNoteTargetInvoice(inv)}
                              sx={{ color: '#6C5CE7', '&:hover': { backgroundColor: 'rgba(108, 92, 231, 0.08)' } }}
                            >
                              <i className='tabler-receipt-refund text-base' />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Acción rápida Anular Factura */}
                        {inv.estado !== 'CANCELED' && inv.tipoDocumento !== 'NOTA_CREDITO' && (
                          <Tooltip title='Anular Factura'>
                            <IconButton
                              size='small'
                              onClick={() => setCancelTargetInvoice(inv)}
                              sx={{ color: '#EF4444', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.08)' } }}
                            >
                              <i className='tabler-ban text-base' />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
          count={filteredInvoices.length}
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

      {/* Modal Anular Factura desde el listado */}
      {cancelTargetInvoice && (
        <CancelInvoiceModal
          open={Boolean(cancelTargetInvoice)}
          onClose={() => setCancelTargetInvoice(null)}
          invoice={cancelTargetInvoice}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Modal Emitir Nota de Crédito desde el listado */}
      {creditNoteTargetInvoice && (
        <CreateCreditNoteModal
          open={Boolean(creditNoteTargetInvoice)}
          onClose={() => setCreditNoteTargetInvoice(null)}
          invoice={creditNoteTargetInvoice}
          onSuccess={handleCreditNoteSuccess}
        />
      )}

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
