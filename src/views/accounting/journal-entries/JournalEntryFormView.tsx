'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'

import { accountingService } from '@/services/accountingService'
import type { Account, Journal, JournalEntry, JournalItem, EntryStatus } from '@/types/accountingTypes'
import { DoubleEntryBalanceBar } from './components/DoubleEntryBalanceBar'

const DEFAULT_CONTACT_SUGGESTIONS = [
  'Inversiones Caroní C.A.',
  'Distribuidora Oriental S.A.S.',
  'Corporación Metalmecánica Bolivariana',
  'Corpoelec / Servicios Eléctricos',
  'Distribuidora Eléctrica del Sur C.A.',
  'Inmobiliaria Los Próceres (Alquiler Galpón)',
  'Cantv / Internet y Telecomunicaciones',
  'Ferretería Industrial Roscio C.A.',
  'SENIAT (Impuestos)',
  'Banco Mercantil C.A.',
  'Banesco Banco Universal'
];

interface Props {
  entry?: JournalEntry | null
  accounts: Account[]
  journals: Journal[]
  defaultTasaBcv?: number
  onBack: () => void
  onSuccess: (entry: JournalEntry, message: string) => void
  onEntryUpdated?: (entry: JournalEntry) => void
}

interface EditableLine {
  id: string
  cuentaId: string
  etiqueta: string
  contactoNombre: string
  debeUsd: number
  haberUsd: number
}

export const JournalEntryFormView: React.FC<Props> = ({
  entry,
  accounts,
  journals,
  defaultTasaBcv = 54.00,
  onBack,
  onSuccess,
  onEntryUpdated
}) => {
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(entry || null)
  const isReadOnly = Boolean(currentEntry && currentEntry.estado === 'POSTED')

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const [diarioId, setDiarioId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [documentoReferencia, setDocumentoReferencia] = useState('')
  const [tasaBcv, setTasaBcv] = useState(defaultTasaBcv)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [lines, setLines] = useState<EditableLine[]>([
    { id: '1', cuentaId: accounts[0]?.id || '', etiqueta: 'Partida Inicial', contactoNombre: '', debeUsd: 100, haberUsd: 0 },
    { id: '2', cuentaId: accounts[1]?.id || '', etiqueta: 'Contrapartida', contactoNombre: '', debeUsd: 0, haberUsd: 100 }
  ])

  useEffect(() => {
    setCurrentEntry(entry || null)
  }, [entry])

  useEffect(() => {
    if (currentEntry) {
      setDiarioId(currentEntry.diarioId)
      setFecha(currentEntry.fecha)
      setDocumentoReferencia(currentEntry.documentoReferencia || '')
      setTasaBcv(currentEntry.tasaBcv)
      setNotas(currentEntry.notas || '')
      setLines(
        currentEntry.lineas.map(l => ({
          id: l.id,
          cuentaId: l.cuentaId,
          etiqueta: l.etiqueta,
          contactoNombre: l.contactoNombre || '',
          debeUsd: l.debeUsd,
          haberUsd: l.haberUsd
        }))
      )
    } else {
      setDiarioId(journals[0]?.id || '')
      setFecha(new Date().toISOString().split('T')[0])
      setDocumentoReferencia('')
      setTasaBcv(defaultTasaBcv)
      setNotas('')
      setLines([
        { id: '1', cuentaId: accounts[0]?.id || '', etiqueta: '', contactoNombre: '', debeUsd: 0, haberUsd: 0 },
        { id: '2', cuentaId: accounts[1]?.id || '', etiqueta: '', contactoNombre: '', debeUsd: 0, haberUsd: 0 }
      ])
    }
    setErrorMsg(null)
  }, [currentEntry, accounts, journals, defaultTasaBcv])

  // Cálculos en tiempo real
  const totalDebeUsd = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.debeUsd) || 0), 0), [lines])
  const totalHaberUsd = useMemo(() => lines.reduce((acc, l) => acc + (Number(l.haberUsd) || 0), 0), [lines])
  const totalDebeVes = Number((totalDebeUsd * tasaBcv).toFixed(2))
  const totalHaberVes = Number((totalHaberUsd * tasaBcv).toFixed(2))

  const isBalanced = Math.abs(totalDebeUsd - totalHaberUsd) <= 0.01 && totalDebeUsd > 0

  const handleLineChange = (index: number, field: keyof EditableLine, value: any) => {
    setLines(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: String(Date.now()),
        cuentaId: accounts[0]?.id || '',
        etiqueta: '',
        contactoNombre: '',
        debeUsd: 0,
        haberUsd: 0
      }
    ])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  // Guardar asiento (Confirmado o Borrador)
  const handleSave = async (targetStatus: EntryStatus) => {
    if (targetStatus === 'POSTED' && !isBalanced) {
      setErrorMsg('El asiento no cumple con la partida doble obligatoria para su confirmación (Debe != Haber).')
      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)

      const journalItems = lines.map(l => {
        const acc = accounts.find(a => a.id === l.cuentaId)
        const dUsd = Number(l.debeUsd) || 0
        const hUsd = Number(l.haberUsd) || 0

        return {
          cuentaId: l.cuentaId,
          cuentaCodigo: acc?.codigo || '0.0.00.00',
          cuentaNombre: acc?.nombre || 'Cuenta',
          contactoNombre: l.contactoNombre || undefined,
          etiqueta: l.etiqueta || documentoReferencia || 'Asiento Contable',
          debeUsd: dUsd,
          haberUsd: hUsd,
          debeVes: Number((dUsd * tasaBcv).toFixed(2)),
          haberVes: Number((hUsd * tasaBcv).toFixed(2))
        }
      })

      let savedEntry: JournalEntry

      if (currentEntry?.id) {
        savedEntry = await accountingService.updateJournalEntry(currentEntry.id, {
          diarioId: diarioId || journals[0]?.id || 'jou-general',
          fecha,
          documentoReferencia: documentoReferencia || undefined,
          estado: targetStatus,
          tasaBcv,
          notas: notas || undefined,
          lineas: journalItems
        })
        setCurrentEntry(savedEntry)
        if (onEntryUpdated) {
          onEntryUpdated(savedEntry)
        }
      } else {
        savedEntry = await accountingService.createJournalEntry({
          diarioId: diarioId || journals[0]?.id || 'jou-general',
          fecha,
          origen: 'MANUAL',
          documentoReferencia: documentoReferencia || undefined,
          estado: targetStatus,
          tasaBcv,
          notas: notas || undefined,
          creadoPor: 'Usuario Administrador',
          lineas: journalItems
        })
      }

      const actionMsg =
        targetStatus === 'POSTED'
          ? `Asiento ${savedEntry.numeroAsiento} publicado exitosamente.`
          : `Asiento ${savedEntry.numeroAsiento} guardado en estado Borrador.`

      onSuccess(savedEntry, actionMsg)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar asiento')
    } finally {
      setSubmitting(false)
    }
  }

  // Restablecer asiento a Borrador (Permite editar sin abandonar la pantalla)
  const handleResetToDraft = async () => {
    if (!currentEntry) return

    try {
      setSubmitting(true)
      setErrorMsg(null)
      const updated = await accountingService.resetJournalEntryToDraft(currentEntry.id)

      setCurrentEntry(updated)
      if (onEntryUpdated) {
        onEntryUpdated(updated)
      }
      setToast({
        open: true,
        message: `Asiento ${updated.numeroAsiento} restablecido a Borrador. Ahora puedes editar sus líneas libremente en esta pantalla.`,
        severity: 'info'
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer asiento a borrador')
    } finally {
      setSubmitting(false)
    }
  }

  // Revertir asiento (Contraasiento)
  const handleReverseEntry = async () => {
    if (!currentEntry) return

    try {
      setSubmitting(true)

      const invertedLines = currentEntry.lineas.map(l => ({
        cuentaId: l.cuentaId,
        cuentaCodigo: l.cuentaCodigo,
        cuentaNombre: l.cuentaNombre,
        contactoNombre: l.contactoNombre,
        etiqueta: `Contraasiento de ${currentEntry.numeroAsiento}`,
        debeUsd: l.haberUsd,
        haberUsd: l.debeUsd,
        debeVes: l.haberVes,
        haberVes: l.debeVes
      }))

      const contraEntry = await accountingService.createJournalEntry({
        diarioId: currentEntry.diarioId,
        fecha: new Date().toISOString().split('T')[0],
        origen: 'MANUAL',
        documentoReferencia: `Contraasiento de ${currentEntry.numeroAsiento}`,
        estado: 'POSTED',
        tasaBcv: currentEntry.tasaBcv,
        notas: `Reversión automática del asiento ${currentEntry.numeroAsiento}`,
        creadoPor: 'Usuario Administrador',
        lineas: invertedLines
      })

      onSuccess(contraEntry, `Contraasiento ${contraEntry.numeroAsiento} publicado exitosamente.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 1. BARRA SUPERIOR DE ACCIONES Y RETORNO */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Tooltip title='Volver al libro diario'>
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
                {currentEntry ? `Asiento Contable: ${currentEntry.numeroAsiento}` : 'Nuevo Asiento Contable (Libro Diario)'}
              </Typography>
              {currentEntry && (
                <Chip
                  label={currentEntry.estado === 'POSTED' ? 'Publicado' : currentEntry.estado === 'DRAFT' ? 'Borrador' : 'Anulado'}
                  size='small'
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    backgroundColor:
                      currentEntry.estado === 'POSTED'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : currentEntry.estado === 'DRAFT'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.12)',
                    color:
                      currentEntry.estado === 'POSTED'
                        ? '#10B981'
                        : currentEntry.estado === 'DRAFT'
                          ? '#D97706'
                          : '#EF4444'
                  }}
                />
              )}
              {currentEntry?.origen && (
                <Chip
                  label={`Origen: ${currentEntry.origen}`}
                  size='small'
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B'
                  }}
                />
              )}
            </Box>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              {isReadOnly
                ? 'Asiento registrado y auditado (Modo Solo Lectura - Inmutable)'
                : 'Registro de partida doble bimonetaria en tiempo real (Debe = Haber)'}
            </Typography>
          </Box>
        </Box>

        {/* Botones de Cabecera */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant='outlined'
            onClick={onBack}
            disabled={submitting}
            sx={{
              borderRadius: '9999px',
              borderColor: '#CBD5E1',
              color: '#64748B',
              fontWeight: 600,
              textTransform: 'none',
              px: 3.5
            }}
          >
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </Button>

          {isReadOnly ? (
            <>
              <Button
                variant='outlined'
                onClick={handleResetToDraft}
                disabled={submitting}
                startIcon={<i className='tabler-rotate-2' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#D97706',
                  color: '#D97706',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 3.5,
                  '&:hover': {
                    borderColor: '#B45309',
                    backgroundColor: 'rgba(217, 119, 6, 0.04)'
                  }
                }}
              >
                Restablecer a Borrador
              </Button>

              <Button
                variant='contained'
                onClick={handleReverseEntry}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-rotate-clockwise' />}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#EF4444',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 4,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                  '&:hover': { backgroundColor: '#dc2626' }
                }}
              >
                Revertir Asiento (Crear Contraasiento)
              </Button>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Tooltip title='Guardar como Borrador'>
                <span>
                  <IconButton
                    onClick={() => handleSave('DRAFT')}
                    disabled={submitting}
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '9999px',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E4F0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' },
                      '&:disabled': { backgroundColor: '#F1F5F9', color: '#94A3B8' }
                    }}
                  >
                    {submitting ? (
                      <CircularProgress size={18} color='inherit' />
                    ) : (
                      <i className='tabler-device-floppy text-lg' />
                    )}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title='Publicar Asiento (Debe = Haber)'>
                <span>
                  <IconButton
                    onClick={() => handleSave('POSTED')}
                    disabled={!isBalanced || submitting}
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '9999px',
                      backgroundColor: '#6C5CE7',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)',
                      '&:hover': { backgroundColor: '#5B4CDB' },
                      '&:disabled': { backgroundColor: '#E2E8F0', color: '#94A3B8' }
                    }}
                  >
                    <i className='tabler-check text-lg' />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity='error' sx={{ borderRadius: '16px' }}>
          {errorMsg}
        </Alert>
      )}

      {/* 2. CARD 1: CABECERA Y DATOS GENERALES DEL ASIENTO */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6C5CE7'
            }}
          >
            <i className='tabler-file-invoice' style={{ fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Parámetros Generales del Asiento
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Identificación del diario contable, fecha de imputación y tasa de cambio BCV
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3.5}>
          {/* Diario Contable */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Diario Contable *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={diarioId}
              disabled={isReadOnly}
              onChange={e => setDiarioId(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            >
              {journals.map(j => (
                <MenuItem key={j.id} value={j.id}>
                  {j.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Fecha del Asiento */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Fecha del Asiento *
            </Typography>
            <TextField
              fullWidth
              size='small'
              type='date'
              value={fecha}
              disabled={isReadOnly}
              onChange={e => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Grid>

          {/* Documento de Referencia */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Documento de Referencia
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Ej: FAC-2026-0012, AJUSTE-01'
              value={documentoReferencia}
              disabled={isReadOnly}
              onChange={e => setDocumentoReferencia(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Grid>

          {/* Tasa BCV */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Tasa Oficial BCV (Bs/USD)
            </Typography>
            <TextField
              fullWidth
              size='small'
              type='number'
              value={tasaBcv}
              disabled={isReadOnly}
              onChange={e => setTasaBcv(Number(e.target.value))}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Grid>

          {/* Glosa / Notas Generales */}
          <Grid size={{ xs: 12 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Concepto General / Observaciones del Asiento (Glosa)
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Descripción narrativa de la operación contable para auditoría fiscal...'
              value={notas}
              disabled={isReadOnly}
              onChange={e => setNotas(e.target.value)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Grid>
        </Grid>
      </Card>

      {/* 3. CARD 2: LÍNEAS DE APUNTES CONTABLES (PARTIDA DOBLE) */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'rgba(108, 92, 231, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6C5CE7'
              }}
            >
              <i className='tabler-list-details' style={{ fontSize: '1.25rem' }} />
            </Box>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
                Líneas de Asiento (Apuntes Contables)
              </Typography>
              <Typography variant='caption' sx={{ color: '#64748B' }}>
                Distribución en partida doble: todo débito debe estar respaldado por su contrapartida crédito
              </Typography>
            </Box>
          </Box>

          {!isReadOnly && (
            <Button
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-plus' />}
              onClick={handleAddLine}
              sx={{
                borderRadius: '9999px',
                color: '#6C5CE7',
                borderColor: '#6C5CE7',
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Agregar Línea
            </Button>
          )}
        </Box>

        <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', mb: 3.5, overflow: 'hidden' }}>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 280 }}>Cuenta Contable *</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 220 }}>Concepto / Glosa de Línea</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 180 }}>Contacto / Tercero (Opcional)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 140 }}>Debe (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 140 }}>Haber (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 150 }}>Equiv. (VES)</TableCell>
                {!isReadOnly && <TableCell align='center' sx={{ width: 60 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, idx) => {
                const dUsd = Number(line.debeUsd) || 0
                const hUsd = Number(line.haberUsd) || 0
                const dVes = Number((dUsd * tasaBcv).toFixed(2))
                const hVes = Number((hUsd * tasaBcv).toFixed(2))

                return (
                  <TableRow key={line.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Autocomplete
                        size='small'
                        disabled={isReadOnly}
                        options={accounts}
                        value={accounts.find(a => a.id === line.cuentaId) || null}
                        onChange={(_, newVal) => {
                          if (newVal) {
                            handleLineChange(idx, 'cuentaId', newVal.id)
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                  variant='body2'
                                  sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#6C5CE7' }}
                                >
                                  {opt.codigo}
                                </Typography>
                                <Typography variant='body2' sx={{ color: '#1E293B', fontWeight: 500 }}>
                                  {opt.nombre}
                                </Typography>
                              </Box>
                              <Chip
                                label={opt.tipoCuentaNombre || (opt.tipo.startsWith('ASSET') ? 'Activo' : opt.tipo.startsWith('EXPENSE') ? 'Gasto' : opt.tipo.startsWith('INCOME') ? 'Ingreso' : 'Pasivo')}
                                size='small'
                                sx={{
                                  height: 20,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  backgroundColor: '#F1F5F9',
                                  color: '#64748B'
                                }}
                              />
                            </Box>
                          </li>
                        )}
                        renderInput={params => (
                          <TextField
                            {...params}
                            placeholder='Buscar cuenta por código o nombre...'
                            sx={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '10px',
                              '& .MuiOutlinedInput-root': { borderRadius: '10px', boxShadow: 'none !important' }
                            }}
                          />
                        )}
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        fullWidth
                        size='small'
                        placeholder='Descripción de la línea'
                        value={line.etiqueta}
                        disabled={isReadOnly}
                        onChange={e => handleLineChange(idx, 'etiqueta', e.target.value)}
                        sx={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          '& .MuiOutlinedInput-root': { borderRadius: '10px', boxShadow: 'none !important' }
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Autocomplete
                        freeSolo
                        size='small'
                        disabled={isReadOnly}
                        options={DEFAULT_CONTACT_SUGGESTIONS}
                        value={line.contactoNombre || ''}
                        onInputChange={(_, newInputValue) => {
                          handleLineChange(idx, 'contactoNombre', newInputValue)
                        }}
                        onChange={(_, newVal) => {
                          handleLineChange(idx, 'contactoNombre', typeof newVal === 'string' ? newVal : newVal || '')
                        }}
                        renderInput={params => (
                          <TextField
                            {...params}
                            placeholder='Escribe o busca tercero...'
                            sx={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '10px',
                              '& .MuiOutlinedInput-root': { borderRadius: '10px', boxShadow: 'none !important' }
                            }}
                          />
                        )}
                      />
                    </TableCell>

                    <TableCell align='right'>
                      <TextField
                        type='number'
                        size='small'
                        value={line.debeUsd || ''}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', fontWeight: 700 } }}
                        onChange={e => handleLineChange(idx, 'debeUsd', Number(e.target.value))}
                        sx={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          '& .MuiOutlinedInput-root': { borderRadius: '10px' }
                        }}
                      />
                    </TableCell>

                    <TableCell align='right'>
                      <TextField
                        type='number'
                        size='small'
                        value={line.haberUsd || ''}
                        disabled={isReadOnly}
                        inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', fontWeight: 700 } }}
                        onChange={e => handleLineChange(idx, 'haberUsd', Number(e.target.value))}
                        sx={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          '& .MuiOutlinedInput-root': { borderRadius: '10px' }
                        }}
                      />
                    </TableCell>

                    <TableCell align='right'>
                      <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
                        {dUsd > 0
                          ? `Debe: ${dVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
                          : hUsd > 0
                            ? `Haber: ${hVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
                            : '—'}
                      </Typography>
                    </TableCell>

                    {!isReadOnly && (
                      <TableCell align='center'>
                        <Tooltip title='Eliminar Línea'>
                          <span>
                            <IconButton
                              size='small'
                              disabled={lines.length <= 2}
                              onClick={() => handleRemoveLine(idx)}
                              sx={{ color: '#EF4444' }}
                            >
                              <i className='tabler-trash' />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Barra de Cuadre Bimonetario */}
        <DoubleEntryBalanceBar
          totalDebeUsd={totalDebeUsd}
          totalHaberUsd={totalHaberUsd}
          totalDebeVes={totalDebeVes}
          totalHaberVes={totalHaberVes}
        />
      </Card>

      {/* Notificaciones */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant='filled' sx={{ width: '100%', borderRadius: '12px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
