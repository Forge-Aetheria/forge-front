'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
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

import type { BankAccount, BankCurrency } from '@/types/bankAccountTypes'
import { bankAccountsService } from '@/services/bankAccountsService'
import { BankAccountModal } from './components/BankAccountModal'

export const BankAccountsListView: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'COMPANY' | 'CLIENTE' | 'PROVEEDOR'>('ALL')
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | BankCurrency>('ALL')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)

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

  const handleOpenCreate = () => {
    setEditingAccount(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc)
    setModalOpen(true)
  }

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

  const handleSaved = (saved: BankAccount) => {
    setAccounts(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = saved
        return copy
      }
      return [saved, ...prev]
    })
    setToastMessage(`Cuenta bancaria ${saved.banco} guardada con éxito.`)
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
          <Box>
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Cuentas Bancarias
            </Typography>
            <Typography variant='body2' sx={{ color: '#64748B' }}>
              Directorio de cuentas bancarias y pago móvil para cobros, pagos a proveedores y transferencias
            </Typography>
          </Box>
        </Box>

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

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #F1F5F9', borderRadius: '16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
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
                filteredAccounts.map(acc => (
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
                          <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {acc.banco}
                          </Typography>
                          {acc.is_predeterminada && (
                            <Chip
                              label='Predeterminada'
                              size='small'
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#10B981'
                              }}
                            />
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
                        <Chip
                          label={acc.moneda}
                          size='small'
                          sx={{
                            height: 22,
                            fontWeight: 800,
                            backgroundColor:
                              acc.moneda === 'USD'
                                ? 'rgba(108, 92, 231, 0.12)'
                                : acc.moneda === 'EUR'
                                ? 'rgba(59, 130, 246, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)',
                            color:
                              acc.moneda === 'USD'
                                ? '#6C5CE7'
                                : acc.moneda === 'EUR'
                                ? '#3B82F6'
                                : '#10B981'
                          }}
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
                        <Chip
                          label='Empresa'
                          size='small'
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            backgroundColor: 'rgba(108, 92, 231, 0.15)',
                            color: '#6C5CE7'
                          }}
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
                          <Chip
                            label='Activo'
                            size='small'
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#10B981',
                              mr: 0.5
                            }}
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
                          <IconButton size='small' onClick={() => handleOpenEdit(acc)} sx={{ color: '#6C5CE7' }}>
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
      </Card>

      {/* Modal */}
      <BankAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSaved}
        initialAccount={editingAccount}
      />

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
