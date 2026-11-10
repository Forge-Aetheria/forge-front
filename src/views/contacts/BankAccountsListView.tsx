'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Link from 'next/link'

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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'

import CustomChip from '@core/components/mui/Chip'

import type { BankAccount, BankCurrency } from '@/types/bankAccountTypes'
import { bankAccountsService } from '@/services/bankAccountsService'

export const BankAccountsListView: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'COMPANY' | 'CLIENTE' | 'PROVEEDOR'>('ALL')
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | BankCurrency>('ALL')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await bankAccountsService.getBankAccounts()

      setAccounts(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch =
        acc.banco.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.numero_cuenta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.titular.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.identificacion_titular.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.contacto_nombre && acc.contacto_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.telefono_pago_movil && acc.telefono_pago_movil.includes(searchTerm))

      const matchOwner =
        ownerFilter === 'ALL' ||
        (ownerFilter === 'COMPANY' && acc.is_empresa) ||
        (ownerFilter === 'CLIENTE' && !acc.is_empresa && (acc.contacto_tipo === 'CLIENTE' || acc.contacto_tipo === 'AMBOS')) ||
        (ownerFilter === 'PROVEEDOR' && !acc.is_empresa && (acc.contacto_tipo === 'PROVEEDOR' || acc.contacto_tipo === 'AMBOS'))

      const matchCurrency = currencyFilter === 'ALL' || acc.moneda === currencyFilter

      return matchSearch && matchOwner && matchCurrency
    })
  }, [accounts, searchTerm, ownerFilter, currencyFilter])

  const paginatedAccounts = useMemo(() => {
    return filteredAccounts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredAccounts, page, rowsPerPage])

  const handleDelete = async (id: string, banco: string) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta bancaria de ${banco}?`)) return

    try {
      await bankAccountsService.deleteBankAccount(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
      setToastMessage('Cuenta bancaria eliminada con éxito.')
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la cuenta')
    }
  }

  const handleSetDefault = async (acc: BankAccount) => {
    try {
      await bankAccountsService.setDefaultBankAccount(acc.id, acc.contacto_id, acc.is_empresa)
      await loadData()
      setToastMessage('Cuenta establecida como principal predeterminada.')
    } catch (err: any) {
      alert(err.message || 'Error al actualizar cuenta')
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setToastMessage(`${label} copiado al portapapeles.`)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              backgroundColor: 'rgba(108, 92, 231, 0.12)',
              color: '#6C5CE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}
          >
            <i className='tabler-building-bank' />
          </Box>
          <Typography variant='h4' sx={{ fontWeight: 700, color: '#1E293B' }}>
            Cuentas Bancarias
          </Typography>
        </Box>

        <Button
          component={Link}
          href='/contacts/bank-accounts/create'
          variant='contained'
          startIcon={<i className='tabler-plus' />}
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

      {/* Main Table Card */}
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
            placeholder='Buscar por banco, cuenta, titular, RIF o contacto...'
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
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value as any)}
            sx={{ width: 220 }}
          >
            <MenuItem value='ALL'>Todos los titulares</MenuItem>
            <MenuItem value='COMPANY'>Cuentas de la Empresa</MenuItem>
            <MenuItem value='CLIENTE'>Cuentas de Clientes</MenuItem>
            <MenuItem value='PROVEEDOR'>Cuentas de Proveedores</MenuItem>
          </TextField>

          <TextField
            select
            size='small'
            value={currencyFilter}
            onChange={e => setCurrencyFilter(e.target.value as any)}
            sx={{ width: 170 }}
          >
            <MenuItem value='ALL'>Todas las monedas</MenuItem>
            <MenuItem value='VES'>Bolívares (VES)</MenuItem>
            <MenuItem value='USD'>Dólares (USD)</MenuItem>
            <MenuItem value='EUR'>Euros (EUR)</MenuItem>
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
              Cuentas Bancarias Registradas
            </Typography>
            <CustomChip
              label={`${filteredAccounts.length} ${filteredAccounts.length === 1 ? 'cuenta' : 'cuentas'}`}
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
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Entidad Bancaria</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>N° de Cuenta / Identificador</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Moneda / Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Titular & RIF/Cédula</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Asignado A</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Pago Móvil</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={7}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    <i className='tabler-building-bank text-4xl mb-2 text-[#CBD5E1]' />
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, color: '#64748B' }}>
                      No se encontraron cuentas bancarias
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                      Puedes agregar cuentas bancarias de la empresa o vincularlas a tus clientes y proveedores.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAccounts.map(acc => (
                  <TableRow key={acc.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '10px',
                            backgroundColor: acc.is_empresa ? 'rgba(108, 92, 231, 0.12)' : 'rgba(241, 245, 249, 1)',
                            color: acc.is_empresa ? '#6C5CE7' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}
                        >
                          <i className='tabler-building-bank' />
                        </Box>
                        <Box>
                          <Typography
                            variant='body2'
                            component={Link}
                            href={`/contacts/bank-accounts/${acc.id}`}
                            sx={{
                              fontWeight: 700,
                              color: '#1E293B',
                              textDecoration: 'none',
                              '&:hover': { color: '#6C5CE7', textDecoration: 'underline' }
                            }}
                          >
                            {acc.banco}
                          </Typography>
                          {acc.is_predeterminada && (
                            <Box sx={{ mt: 0.5 }}>
                              <CustomChip
                                label='Predeterminada'
                                size='small'
                                variant='tonal'
                                color='success'
                              />
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: '#1E293B',
                            letterSpacing: '0.5px'
                          }}
                        >
                          {acc.numero_cuenta}
                        </Typography>
                        <Tooltip title='Copiar número'>
                          <IconButton
                            size='small'
                            onClick={() => handleCopy(acc.numero_cuenta, 'N° de cuenta')}
                            sx={{ color: '#94A3B8', '&:hover': { color: '#6C5CE7' } }}
                          >
                            <i className='tabler-copy text-sm' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CustomChip
                          label={acc.moneda}
                          size='small'
                          variant='tonal'
                          color={
                            acc.moneda === 'USD'
                              ? 'primary'
                              : acc.moneda === 'EUR'
                              ? 'info'
                              : 'success'
                          }
                        />
                        <Typography variant='caption' sx={{ color: '#64748B', textTransform: 'capitalize' }}>
                          {acc.tipo_cuenta.toLowerCase()}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {acc.titular}
                      </Typography>
                      <Typography variant='caption' sx={{ color: '#64748B' }}>
                        {acc.identificacion_titular}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {acc.is_empresa ? (
                        <CustomChip
                          label='Empresa'
                          size='small'
                          variant='tonal'
                          color='primary'
                        />
                      ) : (
                        <Box>
                          <Typography variant='body2' sx={{ fontWeight: 600, color: '#334155' }}>
                            {acc.contacto_nombre || 'Sin contacto'}
                          </Typography>
                          <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                            {acc.contacto_tipo || 'Tercero'}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      {acc.is_pago_movil && acc.telefono_pago_movil ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CustomChip
                            label='Activo'
                            size='small'
                            variant='tonal'
                            color='success'
                            sx={{ mr: 0.5 }}
                          />
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', color: '#1E293B', fontSize: '0.8rem' }}>
                            {acc.telefono_pago_movil}
                          </Typography>
                          <Tooltip title='Copiar teléfono'>
                            <IconButton
                              size='small'
                              onClick={() => handleCopy(acc.telefono_pago_movil!, 'Teléfono Pago Móvil')}
                              sx={{ color: '#94A3B8' }}
                            >
                              <i className='tabler-copy text-xs' />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                          No configurado
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {!acc.is_predeterminada && (
                          <Tooltip title='Establecer como cuenta principal'>
                            <IconButton size='small' onClick={() => handleSetDefault(acc)} sx={{ color: '#F59E0B' }}>
                              <i className='tabler-star text-base' />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title='Editar'>
                          <IconButton
                            size='small'
                            component={Link}
                            href={`/contacts/bank-accounts/${acc.id}`}
                            sx={{ color: '#6C5CE7' }}
                          >
                            <i className='tabler-edit text-base' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Eliminar'>
                          <IconButton size='small' onClick={() => handleDelete(acc.id, acc.banco)} sx={{ color: '#EF4444' }}>
                            <i className='tabler-trash text-base' />
                          </IconButton>
                        </Tooltip>
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
          count={filteredAccounts.length}
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

      {/* Toast */}
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
