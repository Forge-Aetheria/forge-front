'use client'

import React, { useState, useEffect, useMemo } from 'react'

import { useSearchParams, useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

import TablePagination from '@mui/material/TablePagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

import CustomChip from '@core/components/mui/Chip'

import { accountingService } from '@/services/accountingService'
import type { AccountingInvoice, InvoiceAccountingType } from '@/types/accountingTypes'
import { CreditNoteFormView } from './CreditNoteFormView'

export const CreditNotesListView: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlType = searchParams.get('type') as InvoiceAccountingType | null

  const [typeFilter, setTypeFilter] = useState<'ALL' | InvoiceAccountingType>(urlType || 'ALL')
  const [originFilter, setOriginFilter] = useState<'ALL' | 'LINKED' | 'DIRECT'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const [creditNotes, setCreditNotes] = useState<AccountingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Full-page form view state
  const [isFormActive, setIsFormActive] = useState(false)
  const [selectedNc, setSelectedNc] = useState<AccountingInvoice | null>(null)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (urlType) {
      setTypeFilter(urlType)
    }
  }, [urlType])

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await accountingService.getCreditNotes()

      setCreditNotes(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered list
  const filteredList = useMemo(() => {
    return creditNotes.filter(nc => {
      const matchSearch =
        nc.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nc.contactoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nc.contactoRif.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (nc.motivoNotaCredito || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (nc.facturaAfectadaNumero || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchType = typeFilter === 'ALL' || nc.tipo === typeFilter

      const isDirect = !nc.facturaAfectadaId && !nc.facturaAfectadaNumero

      const matchOrigin =
        originFilter === 'ALL' ||
        (originFilter === 'DIRECT' && isDirect) ||
        (originFilter === 'LINKED' && !isDirect)

      return matchSearch && matchType && matchOrigin
    })
  }, [creditNotes, searchTerm, typeFilter, originFilter])

  const paginatedList = useMemo(() => {
    return filteredList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredList, page, rowsPerPage])

  const handleOpenCreate = () => {
    setSelectedNc(null)
    setIsFormActive(true)
  }

  const handleOpenDetail = (nc: AccountingInvoice) => {
    setSelectedNc(nc)
    setIsFormActive(true)
  }

  const handleCreditNoteSaved = (savedNc: AccountingInvoice) => {
    setCreditNotes(prev => {
      const index = prev.findIndex(item => item.id === savedNc.id)

      if (index >= 0) {
        const updated = [...prev]

        updated[index] = savedNc
        
return updated
      }

      
return [savedNc, ...prev]
    })
    setToastMessage(`Nota de Crédito ${savedNc.numeroFactura} guardada con éxito.`)
    setIsFormActive(false)
    setSelectedNc(null)
  }

  if (isFormActive) {
    return (
      <CreditNoteFormView
        onBack={() => {
          setIsFormActive(false)
          setSelectedNc(null)
        }}
        onSaved={handleCreditNoteSaved}
        creditNote={selectedNc}
        initialType={typeFilter === 'ALL' ? 'CUSTOMER' : typeFilter}
      />
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera Principal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title='Volver'>
            <IconButton
              onClick={() => router.push(typeFilter === 'CUSTOMER' ? '/accounting/invoices?type=CUSTOMER' : '/accounting/invoices?type=SUPPLIER')}
              sx={{
                width: 38,
                height: 38,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className='tabler-arrow-left text-lg' />
            </IconButton>
          </Tooltip>

          <Box>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
              {typeFilter === 'CUSTOMER'
                ? 'Notas de Crédito de Clientes (CxC)'
                : typeFilter === 'SUPPLIER'
                ? 'Notas de Crédito de Proveedores (CxP)'
                : 'Notas de Crédito Contables'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={handleOpenCreate}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 4,
              boxShadow: '0 4px 12px rgba(108, 92, 231, 0.25)',
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Nuevo
          </Button>
        </Box>
      </Box>

      {/* Tarjeta Principal con Filtros y Tabla (Sin cuadros de métricas) */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: 4
        }}
      >
        {/* Barra de Filtros */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            size='small'
            placeholder='Buscar por número, contacto, RIF o factura afectada...'
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
            value={originFilter}
            onChange={e => setOriginFilter(e.target.value as any)}
            sx={{ width: 220 }}
          >
            <MenuItem value='ALL'>Todos los orígenes</MenuItem>
            <MenuItem value='LINKED'>Vinculadas a Factura</MenuItem>
            <MenuItem value='DIRECT'>Directas (Sin Factura)</MenuItem>
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
              Notas de Crédito Registradas
            </Typography>
            <CustomChip
              label={`${filteredList.length} ${filteredList.length === 1 ? 'nota' : 'notas'}`}
              variant='tonal'
              color='primary'
              size='small'
            />
          </Box>
        </Box>

        {/* Tabla de Notas de Crédito */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
              <TableRow>
                <TableCell padding='checkbox' sx={{ width: 44, p: 0.5 }}>
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredList.length}
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(filteredList.map(i => i.id))
                      } else {
                        setSelectedIds([])
                      }
                    }}
                    sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° Nota de Crédito</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contacto / RIF</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Factura Afectada</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Motivo Comercial</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#6C5CE7' }}>Total (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Total (VES)</TableCell>
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
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    <i className='tabler-receipt-refund text-4xl mb-2 text-[#CBD5E1]' />
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, color: '#64748B' }}>
                      No se encontraron notas de crédito
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                      Puedes emitir una nota de crédito vinculada a una factura o como ajuste comercial directo.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedList.map(nc => (
                  <TableRow
                    key={nc.id}
                    hover
                    selected={selectedIds.includes(nc.id)}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleOpenDetail(nc)}
                  >
                    <TableCell padding='checkbox' sx={{ width: 44, p: 0.5 }} onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(nc.id)}
                        onChange={() => {
                          setSelectedIds(prev =>
                            prev.includes(nc.id) ? prev.filter(x => x !== nc.id) : [...prev, nc.id]
                          )
                        }}
                        sx={{ color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
                      />
                    </TableCell>
                    <TableCell>
                      <CustomChip
                        label={nc.tipo === 'CUSTOMER' ? 'Cliente' : 'Proveedor'}
                        size='small'
                        variant='tonal'
                        color={nc.tipo === 'CUSTOMER' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#6C5CE7' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <i className='tabler-receipt-refund text-base' />
                        <span>{nc.numeroFactura}</span>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {nc.contactoNombre}
                      </Typography>
                      <Typography variant='caption' sx={{ color: '#64748B' }}>
                        {nc.contactoRif}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {nc.facturaAfectadaNumero ? (
                        <CustomChip
                          label={`Factura ${nc.facturaAfectadaNumero}`}
                          size='small'
                          variant='tonal'
                          color='primary'
                        />
                      ) : (
                        <CustomChip
                          label='Directa / Sin Factura'
                          size='small'
                          variant='tonal'
                          color='warning'
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B' }}>
                      {nc.fechaEmision}
                    </TableCell>
                    <TableCell sx={{ color: '#1E293B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nc.motivoNotaCredito || 'Ajuste general'}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 800, color: '#6C5CE7' }}>
                      ${nc.totalUsd.toFixed(2)}
                    </TableCell>
                    <TableCell align='right' sx={{ color: '#64748B' }}>
                      {nc.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
                    </TableCell>
                    <TableCell align='center' onClick={e => e.stopPropagation()}>
                      <Tooltip title='Ver Vista Completa'>
                        <IconButton size='small' onClick={() => handleOpenDetail(nc)} sx={{ color: '#6C5CE7' }}>
                          <i className='tabler-eye' />
                        </IconButton>
                      </Tooltip>
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
          count={filteredList.length}
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

      {/* Snackbar Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity='success' onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px', fontWeight: 600 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
