'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

import Grid from '@mui/material/Grid'
import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

import CustomChip from '@core/components/mui/Chip'

import { accountingService } from '@/services/accountingService'
import type { Journal, JournalType, Account, CurrencyCode } from '@/types/accountingTypes'

interface Props {
  journal?: Journal | null
  accounts: Account[]
  defaultTasaBcv?: number
  onBack: () => void
  onSuccess: (journal: Journal, message: string) => void
}

const COLOR_PALETTE = [
  { label: 'Azul Banco', value: '#0284C7' },
  { label: 'Púrpura Foundly', value: '#6C5CE7' },
  { label: 'Verde Ventas', value: '#10B981' },
  { label: 'Ámbar Caja', value: '#F59E0B' },
  { label: 'Rojo Compras', value: '#EF4444' },
  { label: 'Índigo Operaciones', value: '#4F46E5' },
  { label: 'Violeta Ajustes', value: '#8B5CF6' },
  { label: 'Gris Neutro', value: '#64748B' }
]

// Ícono asignado automáticamente según el tipo de diario
const getIconForType = (type: JournalType): string => {
  if (type.startsWith('BANCO') || type === 'BANCO') return 'tabler-building-bank'
  if (type === 'CAJA') return 'tabler-cash'
  if (type === 'VENTAS') return 'tabler-file-invoice'
  if (type === 'COMPRAS') return 'tabler-receipt'
  
return 'tabler-adjustments-alt'
}

export const JournalFormView: React.FC<Props> = ({
  journal,
  accounts,
  onBack,
  onSuccess
}) => {
  const isEditing = Boolean(journal?.id)

  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState<JournalType>('BANCO')
  const [moneda, setMoneda] = useState<CurrencyCode | 'AMBAS'>('VES')
  const [cuentaPorDefectoId, setCuentaPorDefectoId] = useState('')
  const [saldoInicialUsd, setSaldoInicialUsd] = useState<number | string>(0)
  const [saldoInicialVes, setSaldoInicialVes] = useState<number | string>(0)
  const [colorIdentificador, setColorIdentificador] = useState('#0284C7')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (journal) {
      setNombre(journal.nombre)
      setCodigo(journal.codigo)

      const mappedTipo: JournalType =
        journal.tipo === 'BANCO_VES' || journal.tipo === 'BANCO_USD' ? 'BANCO' : journal.tipo

      setTipo(mappedTipo)
      setMoneda(
        journal.moneda ||
          (journal.tipo === 'BANCO_USD' ? 'USD' : journal.tipo === 'BANCO_VES' ? 'VES' : 'AMBAS')
      )
      setCuentaPorDefectoId(journal.cuentaPorDefectoId || '')
      setSaldoInicialUsd(journal.saldoActualUsd || 0)
      setSaldoInicialVes(journal.saldoActualVes || 0)
      setColorIdentificador(journal.colorIdentificador || '#0284C7')
    } else {
      setNombre('')
      setCodigo('')
      setTipo('BANCO')
      setMoneda('VES')
      setCuentaPorDefectoId(accounts[0]?.id || '')
      setSaldoInicialUsd(0)
      setSaldoInicialVes(0)
      setColorIdentificador('#0284C7')
    }

    setErrorMsg(null)
  }, [journal, accounts])

  // Filtrar cuentas sugeridas según el tipo de diario
  const eligibleAccounts = useMemo(() => {
    if (tipo === 'VENTAS') {
      return accounts.filter(a => a.tipo.startsWith('INCOME'))
    }

    if (tipo === 'COMPRAS') {
      return accounts.filter(
        a => a.tipo.startsWith('EXPENSE') || a.tipo === 'COST_OF_GOODS' || a.codigo === '1.1.03.01'
      )
    }

    if (tipo === 'BANCO' || tipo === 'CAJA' || tipo === 'BANCO_VES' || tipo === 'BANCO_USD') {
      return accounts.filter(
        a => a.subtipo === 'BANCO_CAJA' || a.codigo.startsWith('1.1.01') || a.tipo.startsWith('ASSET')
      )
    }

    
return accounts
  }, [accounts, tipo])

  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === cuentaPorDefectoId) || null
  }, [accounts, cuentaPorDefectoId])

  // Al cambiar tipo de diario: asigna automáticamente ícono, color y cuenta sugerida
  const handleTypeChange = (newTipo: JournalType) => {
    setTipo(newTipo)

    if (newTipo === 'VENTAS') {
      setColorIdentificador('#10B981')
      setMoneda('AMBAS')
    } else if (newTipo === 'COMPRAS') {
      setColorIdentificador('#EF4444')
      setMoneda('AMBAS')
    } else if (newTipo === 'BANCO') {
      setColorIdentificador(moneda === 'USD' ? '#6C5CE7' : '#0284C7')
    } else if (newTipo === 'CAJA') {
      setColorIdentificador('#F59E0B')
      setMoneda('AMBAS')
    } else {
      setColorIdentificador('#8B5CF6')
      setMoneda('AMBAS')
    }

    const firstEligible = accounts.find(a => {
      if (newTipo === 'VENTAS') return a.tipo.startsWith('INCOME')
      if (newTipo === 'COMPRAS') return a.tipo.startsWith('EXPENSE') || a.tipo === 'COST_OF_GOODS'
      if (newTipo === 'BANCO' || newTipo === 'CAJA') return a.codigo.startsWith('1.1.01')
      
return true
    })

    if (firstEligible) {
      setCuentaPorDefectoId(firstEligible.id)
    }
  }

  const handleMonedaChange = (newMoneda: CurrencyCode | 'AMBAS') => {
    setMoneda(newMoneda)

    if (tipo === 'BANCO') {
      setColorIdentificador(newMoneda === 'USD' ? '#6C5CE7' : '#0284C7')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      setErrorMsg('El nombre del diario es obligatorio.')
      
return
    }

    if (!codigo.trim()) {
      setErrorMsg('El código corto o secuencia es obligatorio.')
      
return
    }

    if (!cuentaPorDefectoId) {
      setErrorMsg('Debes asignar una cuenta contable por defecto del Plan de Cuentas.')
      
return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)

      const numUsd = typeof saldoInicialUsd === 'number' ? saldoInicialUsd : parseFloat(saldoInicialUsd) || 0
      const numVes = typeof saldoInicialVes === 'number' ? saldoInicialVes : parseFloat(saldoInicialVes) || 0
      const autoIcon = getIconForType(tipo)

      if (isEditing && journal) {
        const updated = await accountingService.updateJournal(journal.id, {
          nombre: nombre.trim(),
          codigo: codigo.trim().toUpperCase(),
          tipo,
          moneda,
          cuentaPorDefectoId,
          cuentaPorDefectoNombre: selectedAccount?.nombre || '',
          colorIdentificador,
          icono: autoIcon
        })

        onSuccess(updated, `Diario contable "${updated.nombre}" actualizado exitosamente.`)
      } else {
        const created = await accountingService.createJournal({
          nombre: nombre.trim(),
          codigo: codigo.trim().toUpperCase(),
          tipo,
          moneda,
          cuentaPorDefectoId,
          cuentaPorDefectoNombre: selectedAccount?.nombre || '',
          saldoInicialUsd: numUsd,
          saldoInicialVes: numVes,
          colorIdentificador,
          icono: autoIcon
        })

        onSuccess(created, `Diario contable "${created.nombre}" creado exitosamente.`)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el diario contable')
    } finally {
      setSubmitting(false)
    }
  }

  const currentIcon = getIconForType(tipo)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 1. BARRA SUPERIOR DE ACCIONES */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Tooltip title='Volver'>
            <IconButton
              onClick={onBack}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
                {isEditing ? `Editar Diario: ${journal?.nombre}` : 'Nuevo Diario Contable'}
              </Typography>
              <CustomChip
                label={isEditing ? 'Edición' : 'Nuevo Libro'}
                size='small'
                variant='tonal'
                color='primary'
              />
              <CustomChip
                label={tipo === 'BANCO' ? `Banco (${moneda})` : tipo}
                size='small'
                variant='tonal'
                color='secondary'
              />
            </Box>
            
          </Box>
        </Box>

        {/* Botones de Cabecera */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant='tonal'
            color='secondary'
            size='small'
            onClick={onBack}
            disabled={submitting}
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Cancelar
          </Button>

          <Button
            variant='contained'
            color='primary'
            size='small'
            onClick={handleSave}
            disabled={submitting || !nombre.trim() || !codigo.trim()}
            startIcon={
              submitting ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-device-floppy text-base' />
              )
            }
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'none',
              px: 3
            }}
          >
            Guardar
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity='error' sx={{ borderRadius: '16px' }}>
          {errorMsg}
        </Alert>
      )}

      {/* 2. CARD DE CONFIGURACIÓN DEL DIARIO */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              backgroundColor: `${colorIdentificador}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colorIdentificador
            }}
          >
            <i className={currentIcon} style={{ fontSize: '1.45rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Parámetros del Diario Contable
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Identificación, tipo de libro, moneda operativa y cuenta asociada del catálogo
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3.5}>
          {/* Nombre del Diario */}
          <Grid size={{ xs: 12, sm: 8 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Nombre del Diario Contable *
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Ej: Banesco Banco Universal, Caja Chica Principal, Diario de Ventas...'
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>

          {/* Código / Secuencia */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Código Corto / Secuencia *
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Ej: BN-01, CAJA-01, FAC-CLI'
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            />
          </Grid>

          {/* Tipo de Diario */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Tipo de Diario *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={tipo}
              onChange={e => handleTypeChange(e.target.value as JournalType)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            >
              <MenuItem value='BANCO'>Banco (Cuenta Bancaria)</MenuItem>
              <MenuItem value='CAJA'>Caja (Efectivo y Caja Chica)</MenuItem>
              <MenuItem value='VENTAS'>Ventas (Facturas de Clientes)</MenuItem>
              <MenuItem value='COMPRAS'>Compras (Facturas de Proveedores)</MenuItem>
              <MenuItem value='VARIOS'>Operaciones Varias y Ajustes</MenuItem>
            </TextField>
          </Grid>

          {/* Moneda Operativa */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Moneda Operativa *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={moneda}
              onChange={e => handleMonedaChange(e.target.value as any)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
              }}
            >
              <MenuItem value='VES'>Bolívares (VES Bs.)</MenuItem>
              <MenuItem value='USD'>Dólares (USD $)</MenuItem>
              <MenuItem value='AMBAS'>Bimonetario / Ambas (VES y USD)</MenuItem>
            </TextField>
          </Grid>

          {/* Cuenta Contable por Defecto con Autocomplete */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Cuenta Contable Asociada (PUC) *
            </Typography>
            <Autocomplete
              size='small'
              options={eligibleAccounts}
              value={selectedAccount}
              onChange={(_, newVal) => {
                if (newVal) {
                  setCuentaPorDefectoId(newVal.id)
                } else {
                  setCuentaPorDefectoId('')
                }
              }}
              getOptionLabel={acc => `${acc.codigo} - ${acc.nombre}`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.toLowerCase().trim()

                if (!q) return options
                
return options.filter(
                  a => a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q)
                )
              }}
              renderOption={(props, opt) => (
                <li {...props} key={opt.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#6C5CE7' }}>
                        {opt.codigo}
                      </Typography>
                      <Typography variant='body2' sx={{ color: '#1E293B', fontWeight: 500 }}>
                        {opt.nombre}
                      </Typography>
                    </Box>
                    <CustomChip label={opt.tipoCuentaNombre || opt.tipo} size='small' variant='tonal' color='secondary' />
                  </Box>
                </li>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  placeholder='Buscar cuenta por código o nombre...'
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                  }}
                />
              )}
            />
          </Grid>

          {/* Saldos Iniciales (Solo al crear) */}
          {!isEditing && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                  Saldo Inicial en Dólares ($ USD)
                </Typography>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  value={saldoInicialUsd}
                  onChange={e => setSaldoInicialUsd(e.target.value === '' ? '' : Number(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                  Saldo Inicial en Bolívares (Bs. VES)
                </Typography>
                <TextField
                  fullWidth
                  size='small'
                  type='number'
                  value={saldoInicialVes}
                  onChange={e => setSaldoInicialVes(e.target.value === '' ? '' : Number(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', boxShadow: 'none !important' }
                  }}
                />
              </Grid>
            </>
          )}

          {/* Color Distintivo */}
          <Grid size={{ xs: 12 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1.5 }}>
              Color Identificador del Diario
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {COLOR_PALETTE.map(c => {
                const isSelected = colorIdentificador === c.value

                
return (
                  <Box
                    key={c.value}
                    onClick={() => setColorIdentificador(c.value)}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      backgroundColor: c.value,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      border: isSelected ? '3px solid #1E293B' : '2px solid transparent',
                      transition: 'transform 0.15s ease',
                      '&:hover': { transform: 'scale(1.15)' }
                    }}
                  >
                    {isSelected && <i className='tabler-check' style={{ fontSize: '1rem', fontWeight: 900 }} />}
                  </Box>
                )
              })}
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Box>
  )
}
