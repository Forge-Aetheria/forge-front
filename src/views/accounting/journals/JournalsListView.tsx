'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
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
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useSearchParams } from 'next/navigation'

import { accountingService } from '@/services/accountingService'
import type { Journal, Account, JournalType } from '@/types/accountingTypes'
import { JournalFormView } from './JournalFormView'

export const JournalsListView: React.FC = () => {
  const searchParams = useSearchParams()

  const [journals, setJournals] = useState<Journal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | string>('ALL')

  const [currentView, setCurrentView] = useState<'list' | 'form'>(
    searchParams.get('action') === 'new' ? 'form' : 'list'
  )
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [jList, aList] = await Promise.all([
        accountingService.getJournals(),
        accountingService.getAccounts()
      ])
      setJournals(jList)
      setAccounts(aList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const matchSearch =
        j.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.codigo.toLowerCase().includes(searchTerm.toLowerCase())

      let matchType = true
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'BANCO') {
          matchType = j.tipo === 'BANCO' || j.tipo === 'BANCO_VES' || j.tipo === 'BANCO_USD'
        } else {
          matchType = j.tipo === typeFilter
        }
      }

      return matchSearch && matchType
    })
  }, [journals, searchTerm, typeFilter])

  const handleSuccess = (journal: Journal, msg: string) => {
    setToastMessage(msg)
    loadData()
    setCurrentView('list')
    setSelectedJournal(null)
  }

  const getTypeChip = (j: Journal) => {
    const isBank = j.tipo === 'BANCO' || j.tipo === 'BANCO_VES' || j.tipo === 'BANCO_USD'
    if (isBank) {
      return {
        label: 'Banco',
        bg: '#E0F2FE',
        color: '#0284C7'
      }
    }
    if (j.tipo === 'CAJA') {
      return {
        label: 'Caja / Efectivo',
        bg: '#FEF3C7',
        color: '#D97706'
      }
    }
    if (j.tipo === 'VENTAS') {
      return {
        label: 'Ventas',
        bg: '#F0EEF9',
        color: '#6C5CE7'
      }
    }
    if (j.tipo === 'COMPRAS') {
      return {
        label: 'Compras',
        bg: '#FEE2E2',
        color: '#EF4444'
      }
    }
    return {
      label: 'Operaciones Varias',
      bg: '#EDE9FE',
      color: '#8B5CF6'
    }
  }

  // Vista Completa para Crear o Editar Diario Contable
  if (currentView === 'form') {
    return (
      <JournalFormView
        journal={selectedJournal}
        accounts={accounts}
        onBack={() => {
          setCurrentView('list')
          setSelectedJournal(null)
        }}
        onSuccess={handleSuccess}
      />
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 1. CABECERA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
            Diarios Contables (Libros Auxiliares)
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B' }}>
            Listado y parametrización de libros auxiliares de ventas, compras, cuentas bancarias y cajas
          </Typography>
        </Box>

        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          onClick={() => {
            setSelectedJournal(null)
            setCurrentView('form')
          }}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            fontWeight: 700,
            textTransform: 'none',
            px: 3.5,
            boxShadow: '0 4px 14px rgba(108, 92, 231, 0.3)',
            '&:hover': { backgroundColor: '#5b4bc4' }
          }}
        >
          Nuevo
        </Button>
      </Box>

      {/* 2. CARD PRINCIPAL CON FILTROS Y TABLA EN LISTA */}
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
            placeholder='Buscar diario por nombre o código...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 260,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
            }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: '#94A3B8' }} />
            }}
          />

          <TextField
            select
            size='small'
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            sx={{
              width: 250,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
            }}
          >
            <MenuItem value='ALL'>Todos los tipos de diario</MenuItem>
            <MenuItem value='BANCO'>Bancos (Cuentas Bancarias)</MenuItem>
            <MenuItem value='CAJA'>Cajas y Efectivo</MenuItem>
            <MenuItem value='VENTAS'>Diarios de Ventas</MenuItem>
            <MenuItem value='COMPRAS'>Diarios de Compras</MenuItem>
            <MenuItem value='VARIOS'>Operaciones Varias</MenuItem>
          </TextField>
        </Box>

        {/* Tabla Lista de Diarios Contables */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 280 }}>Diario Contable</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', width: 160 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', width: 120 }}>Moneda</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 240 }}>Cuenta Asociada (PUC)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 160 }}>Saldo ($ USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 180 }}>Saldo (Bs. VES)</TableCell>
                <TableCell align='center' sx={{ fontWeight: 700, color: '#475569', width: 110 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={8}>
                      <Skeleton variant='text' height={42} />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6, color: '#94A3B8' }}>
                    No se encontraron diarios contables que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJournals.map(j => {
                  const typeChip = getTypeChip(j)
                  const color = j.colorIdentificador || '#6C5CE7'
                  const icon = j.icono || 'tabler-notebook'
                  const monedaLabel =
                    j.moneda === 'USD'
                      ? 'USD ($)'
                      : j.moneda === 'VES'
                        ? 'VES (Bs.)'
                        : j.tipo === 'BANCO_USD'
                          ? 'USD ($)'
                          : j.tipo === 'BANCO_VES'
                            ? 'VES (Bs.)'
                            : 'Bimonetario'

                  return (
                    <TableRow
                      key={j.id}
                      hover
                      onClick={() => {
                        setSelectedJournal(j)
                        setCurrentView('form')
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td, &:last-child th': { border: 0 },
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Diario Contable (Icono + Nombre) */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: '12px',
                              backgroundColor: `${color}18`,
                              color: color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <i className={icon} style={{ fontSize: '1.25rem' }} />
                          </Box>
                          <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {j.nombre}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Código */}
                      <TableCell>
                        <Typography
                          variant='body2'
                          sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#6C5CE7' }}
                        >
                          {j.codigo}
                        </Typography>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell>
                        <Chip
                          label={typeChip.label}
                          size='small'
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            backgroundColor: typeChip.bg,
                            color: typeChip.color,
                            borderRadius: '9999px',
                            border: `1px solid ${typeChip.color}30`
                          }}
                        />
                      </TableCell>

                      {/* Moneda */}
                      <TableCell>
                        <Chip
                          label={monedaLabel}
                          size='small'
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            backgroundColor: '#F1F5F9',
                            color: '#475569'
                          }}
                        />
                      </TableCell>

                      {/* Cuenta Asociada (PUC) */}
                      <TableCell>
                        <Typography variant='body2' sx={{ color: '#334155' }}>
                          {j.cuentaPorDefectoNombre || j.cuentaPorDefectoId}
                        </Typography>
                      </TableCell>

                      {/* Saldo USD */}
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1E293B' }}>
                          ${j.saldoActualUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>

                      {/* Saldo VES */}
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: 'monospace', color: '#64748B' }}>
                          {j.saldoActualVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                        </Typography>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell align='center' onClick={e => e.stopPropagation()}>
                        <Button
                          variant='outlined'
                          size='small'
                          startIcon={<i className='tabler-edit' />}
                          onClick={() => {
                            setSelectedJournal(j)
                            setCurrentView('form')
                          }}
                          sx={{
                            borderRadius: '9999px',
                            borderColor: '#CBD5E1',
                            color: '#475569',
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2,
                            py: 0.4,
                            fontSize: '0.78rem',
                            '&:hover': {
                              borderColor: '#6C5CE7',
                              color: '#6C5CE7',
                              backgroundColor: 'rgba(108, 92, 231, 0.05)'
                            }
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Snackbar Notificaciones */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
