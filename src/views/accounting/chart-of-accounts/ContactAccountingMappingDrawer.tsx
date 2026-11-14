'use client'

import React, { useState, useEffect } from 'react'

import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import { accountingService } from '@/services/accountingService'
import type { Account, ContactAccountingConfig } from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  accounts: Account[]
}

export const ContactAccountingMappingDrawer: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  accounts
}) => {
  const [configs, setConfigs] = useState<ContactAccountingConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const cxcAccounts = accounts.filter(a => a.tipo === 'ASSET_CURRENT')
  const cxpAccounts = accounts.filter(a => a.tipo === 'LIABILITY_CURRENT')

  useEffect(() => {
    if (open) {
      setLoading(true)
      accountingService
        .getContactAccountingConfigs()
        .then(list => setConfigs(list))
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleConfigChange = (contactoId: string, field: 'cuentaCxcId' | 'cuentaCxpId', accountId: string) => {
    const acc = accounts.find(a => a.id === accountId)

    setConfigs(prev =>
      prev.map(c => {
        if (c.contactoId === contactoId) {
          if (field === 'cuentaCxcId') {
            return { ...c, cuentaCxcId: accountId, cuentaCxcNombre: acc?.nombre }
          }

          return { ...c, cuentaCxpId: accountId, cuentaCxpNombre: acc?.nombre }
        }

        return c
      })
    )
  }

  const handleSaveAll = async () => {
    try {
      setSubmitting(true)

      for (const config of configs) {
        await accountingService.updateContactAccountingConfig(config)
      }

      onSuccess('Mapeos contables de contactos actualizados exitosamente.')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const filteredConfigs = configs.filter(
    c =>
      c.contactoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactoRif.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 680 },
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0'
        }
      }}
    >
      <Box>
        {/* Cabecera */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid #E6E4F0' }}>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
              Mapeo Contable de Contactos
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Asignación de cuentas específicas de CxC (Clientes) y CxP (Proveedores) por tercero
            </Typography>
          </Box>
          <IconButton onClick={onClose} size='small' sx={{ color: '#94A3B8' }}>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Alert severity='info' sx={{ mb: 3, borderRadius: '14px' }}>
          Configurar cuentas contables específicas por contacto permite que el sistema emita facturas y pagos asignando automáticamente la subcuenta de balance sin intervención manual.
        </Alert>

        <TextField
          size='small'
          fullWidth
          placeholder='Buscar por nombre de contacto o RIF...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
          }}
        />

        {/* Tabla de Mapeo */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', maxHeight: 420 }}>
          <Table size='small' stickyHeader>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contacto / RIF</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Cuenta Contable Asignada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} align='center' sx={{ py: 4 }}>
                    <CircularProgress size={24} sx={{ color: '#6C5CE7' }} />
                  </TableCell>
                </TableRow>
              ) : filteredConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align='center' sx={{ py: 4, color: '#94A3B8' }}>
                    No se encontraron contactos para mapear.
                  </TableCell>
                </TableRow>
              ) : (
                filteredConfigs.map(c => {
                  const isCustomer = Boolean(c.cuentaCxcId)
                  const targetList = isCustomer ? cxcAccounts : cxpAccounts

                  return (
                    <TableRow key={c.contactoId} hover>
                      <TableCell sx={{ width: '45%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                          <Chip
                            label={isCustomer ? 'Cliente' : 'Proveedor'}
                            size='small'
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: isCustomer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: isCustomer ? '#10B981' : '#EF4444'
                            }}
                          />
                          <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                            {c.contactoNombre}
                          </Typography>
                        </Box>
                        <Typography variant='caption' sx={{ color: '#64748B' }}>
                          {c.contactoRif}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: '55%' }}>
                        <TextField
                          select
                          fullWidth
                          size='small'
                          value={isCustomer ? c.cuentaCxcId || '' : c.cuentaCxpId || ''}
                          onChange={e =>
                            handleConfigChange(
                              c.contactoId,
                              isCustomer ? 'cuentaCxcId' : 'cuentaCxpId',
                              e.target.value
                            )
                          }
                        >
                          {targetList.map(acc => (
                            <MenuItem key={acc.id} value={acc.id}>
                              {acc.codigo} - {acc.nombre}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Footer */}
      <Box sx={{ pt: 3, borderTop: '1px solid #E6E4F0', display: 'flex', gap: 2 }}>
        <Button
          fullWidth
          variant='outlined'
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            borderColor: '#CBD5E1',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Cancelar
        </Button>
        <Button
          fullWidth
          variant='contained'
          onClick={handleSaveAll}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-check' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { backgroundColor: '#5b4bc4' }
          }}
        >
          Guardar Asignaciones
        </Button>
      </Box>
    </Drawer>
  )
}
