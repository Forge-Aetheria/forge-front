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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

import { useSearchParams } from 'next/navigation'

import { accountingService } from '@/services/accountingService'
import type { Account, AccountType } from '@/types/accountingTypes'
import { AccountFormView } from './AccountFormView'

export const ChartOfAccountsView: React.FC = () => {
  const searchParams = useSearchParams()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryTab, setCategoryTab] = useState<number>(0) // 0: Todas, 1: Activo, 2: Pasivo, 3: Patrimonio, 4: Ingresos, 5: Costos, 6: Gastos

  // Full view state (Vista Completa para crear/editar cuenta)
  const [isFormActive, setIsFormActive] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const list = await accountingService.getAccounts()

      setAccounts(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  // Soporte para apertura por query param (?action=new o ?edit=id)
  useEffect(() => {
    const action = searchParams.get('action')
    const editId = searchParams.get('edit')

    if (action === 'new') {
      setSelectedAccount(null)
      setIsFormActive(true)
    } else if (editId && accounts.length > 0) {
      const found = accounts.find(a => a.id === editId || a.codigo === editId)

      if (found) {
        setSelectedAccount(found)
        setIsFormActive(true)
      }
    }
  }, [searchParams, accounts])

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch =
        acc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.nombre.toLowerCase().includes(searchTerm.toLowerCase())

      let matchCategory = true

      if (categoryTab === 1) matchCategory = acc.tipo.startsWith('ASSET')
      else if (categoryTab === 2) matchCategory = acc.tipo.startsWith('LIABILITY')
      else if (categoryTab === 3) matchCategory = acc.tipo === 'EQUITY'
      else if (categoryTab === 4) matchCategory = acc.tipo.startsWith('INCOME')
      else if (categoryTab === 5) matchCategory = acc.tipo === 'COST_OF_GOODS'
      else if (categoryTab === 6) matchCategory = acc.tipo.startsWith('EXPENSE')

      return matchSearch && matchCategory
    })
  }, [accounts, searchTerm, categoryTab])

  const handleOpenCreate = () => {
    setSelectedAccount(null)
    setIsFormActive(true)
  }

  const handleOpenEdit = (acc: Account) => {
    setSelectedAccount(acc)
    setIsFormActive(true)
  }

  const handleAccountSaved = (acc: Account, isNew: boolean) => {
    setToastMessage(`Cuenta ${acc.codigo} - ${acc.nombre} ${isNew ? 'creada' : 'actualizada'} exitosamente.`)
    loadAccounts()
    setIsFormActive(false)
    setSelectedAccount(null)
  }

  if (isFormActive) {
    return (
      <AccountFormView
        account={selectedAccount}
        onBack={() => {
          setIsFormActive(false)
          setSelectedAccount(null)
        }}
        onSaved={handleAccountSaved}
      />
    )
  }

  const getTypeChip = (tipo: AccountType, subtipo?: string, tipoCuentaNombre?: string) => {
    let specificLabel = tipoCuentaNombre

    if (!specificLabel) {
      switch (tipo) {
        case 'ASSET_CURRENT':
          specificLabel = 'Activo Corriente'
          break
        case 'ASSET_NON_CURRENT':
          specificLabel = 'Activo No Corriente'
          break
        case 'LIABILITY_CURRENT':
          specificLabel = 'Pasivo Corriente'
          break
        case 'LIABILITY_NON_CURRENT':
          specificLabel = 'Pasivo No Corriente'
          break
        case 'EQUITY':
          specificLabel = 'Capital y Reservas'
          break
        case 'INCOME':
          specificLabel = 'Ingresos Operacionales'
          break
        case 'INCOME_FINANCIAL':
          specificLabel = 'Ingresos Financieros'
          break
        case 'COST_OF_GOODS':
          specificLabel = 'Costo de Ventas'
          break
        case 'EXPENSE_OPERATING':
          specificLabel = 'Gastos Operativos'
          break
        case 'EXPENSE_FINANCIAL':
          specificLabel = 'Gastos Financieros'
          break
        default:
          specificLabel = tipo
      }
    }

    let categoryChip = <Chip label='1. Activo' size='small' sx={{ height: 18, fontSize: '0.68rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 700 }} />

    if (tipo.startsWith('LIABILITY')) {
      categoryChip = <Chip label='2. Pasivo' size='small' sx={{ height: 18, fontSize: '0.68rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 700 }} />
    } else if (tipo === 'EQUITY') {
      categoryChip = <Chip label='3. Patrimonio' size='small' sx={{ height: 18, fontSize: '0.68rem', backgroundColor: 'rgba(108, 92, 231, 0.1)', color: '#6C5CE7', fontWeight: 700 }} />
    } else if (tipo.startsWith('INCOME')) {
      categoryChip = <Chip label='4. Ingresos' size='small' sx={{ height: 18, fontSize: '0.68rem', backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0EA5E9', fontWeight: 700 }} />
    } else if (tipo === 'COST_OF_GOODS') {
      categoryChip = <Chip label='5. Costos' size='small' sx={{ height: 18, fontSize: '0.68rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 700 }} />
    } else if (tipo.startsWith('EXPENSE')) {
      categoryChip = <Chip label='6. Gastos' size='small' sx={{ height: 18, fontSize: '0.68rem', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#EC4899', fontWeight: 700 }} />
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, alignItems: 'flex-start' }}>
        {categoryChip}
        <Typography variant='caption' sx={{ fontWeight: 600, color: '#334155' }}>
          {specificLabel}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, color: '#1E293B' }}>
            Plan Único de Cuentas (PUC)
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B' }}>
            Catálogo jerárquico de cuentas contables y saldos
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
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
        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#E6E4F0', mb: 3 }}>
          <Tabs
            value={categoryTab}
            onChange={(_, val) => setCategoryTab(val)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem'
              },
              '& .Mui-selected': {
                color: '#6C5CE7 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#6C5CE7'
              }
            }}
          >
            <Tab label={`Todas (${accounts.length})`} />
            <Tab label='1. Activo' />
            <Tab label='2. Pasivo' />
            <Tab label='3. Patrimonio' />
            <Tab label='4. Ingresos' />
            <Tab label='5. Costos' />
            <Tab label='6. Gastos' />
          </Tabs>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 4 }}>
          <TextField
            size='small'
            placeholder='Buscar por código jerárquico (ej. 1.1.01) o nombre de la cuenta...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{ maxWidth: 460, width: '100%' }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />
        </Box>

        {/* Table */}
        <TableContainer sx={{ border: '1px solid #F1F5F9', borderRadius: '16px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Nombre de la Cuenta</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo de Cuenta</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Moneda</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Saldo (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569' }}>Saldo (VES)</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Conciliable</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={8}>
                      <Skeleton variant='text' height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se encontraron cuentas contables.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map(acc => (
                  <TableRow key={acc.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                      {acc.codigo}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#334155' }}>
                      {acc.nombre}
                    </TableCell>
                    <TableCell>
                      {getTypeChip(acc.tipo, acc.subtipo, acc.tipoCuentaNombre)}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B', fontWeight: 500 }}>
                      {acc.moneda}
                    </TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700, color: '#1E293B' }}>
                      ${acc.saldoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align='right' sx={{ color: '#64748B' }}>
                      {acc.saldoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </TableCell>
                    <TableCell align='center'>
                      {acc.permiteConciliacion ? (
                        <Chip label='Sí' size='small' sx={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 700 }} />
                      ) : (
                        <Typography variant='caption' sx={{ color: '#94A3B8' }}>No</Typography>
                      )}
                    </TableCell>
                    <TableCell align='center'>
                      <Tooltip title='Editar Cuenta'>
                        <IconButton size='small' onClick={() => handleOpenEdit(acc)} sx={{ color: '#6C5CE7' }}>
                          <i className='tabler-edit' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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
