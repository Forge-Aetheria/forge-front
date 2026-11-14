'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
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

import { accountingService } from '@/services/accountingService'
import type { Account, Journal, JournalEntry } from '@/types/accountingTypes'
import { DoubleEntryBalanceBar } from './components/DoubleEntryBalanceBar'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (entry: JournalEntry, message: string) => void
  entry?: JournalEntry | null
  accounts: Account[]
  journals: Journal[]
  defaultTasaBcv?: number
}

interface EditableLine {
  id: string
  cuentaId: string
  etiqueta: string
  contactoNombre: string
  debeUsd: number
  haberUsd: number
}

export const JournalEntryFormModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  entry,
  accounts,
  journals,
  defaultTasaBcv = 54.00
}) => {
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(entry || null)
  const isReadOnly = Boolean(currentEntry && currentEntry.estado === 'POSTED')

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
  }, [currentEntry, accounts, journals, defaultTasaBcv, open])

  // Real-time double entry calculations
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

  // Create manual entry
  const handleSubmit = async () => {
    if (!isBalanced) {
      setErrorMsg('El asiento no cumple con la partida doble (Debe != Haber).')

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
          etiqueta: l.etiqueta || documentoReferencia || 'Asiento Manual',
          debeUsd: dUsd,
          haberUsd: hUsd,
          debeVes: Number((dUsd * tasaBcv).toFixed(2)),
          haberVes: Number((hUsd * tasaBcv).toFixed(2))
        }
      })

      const newEntry = await accountingService.createJournalEntry({
        diarioId: diarioId || journals[0]?.id || 'jou-general',
        fecha,
        origen: 'MANUAL',
        documentoReferencia: documentoReferencia || undefined,
        tasaBcv,
        notas: notas || undefined,
        creadoPor: 'Usuario Administrador',
        lineas: journalItems
      })

      onSuccess(newEntry, `Asiento ${newEntry.numeroAsiento} publicado exitosamente.`)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar asiento')
    } finally {
      setSubmitting(false)
    }
  }

  // Reset entry to draft
  const handleResetToDraft = async () => {
    if (!currentEntry) return

    try {
      setSubmitting(true)
      const updated = await accountingService.resetJournalEntryToDraft(currentEntry.id)

      setCurrentEntry(updated)

      if (onSuccess) {
        onSuccess(updated, `Asiento ${updated.numeroAsiento} restablecido a Borrador.`)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer asiento a borrador')
    } finally {
      setSubmitting(false)
    }
  }

  // Reverse entry (EARS-JE-03)
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
        tasaBcv: currentEntry.tasaBcv,
        notas: `Reversión automática del asiento ${currentEntry.numeroAsiento}`,
        creadoPor: 'Usuario Administrador',
        lineas: invertedLines
      })

      onSuccess(contraEntry, `Contraasiento ${contraEntry.numeroAsiento} publicado exitosamente.`)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 5,
          pb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E6E4F0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              backgroundColor: 'rgba(108, 92, 231, 0.12)',
              color: '#6C5CE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}
          >
            <i className='tabler-book-2' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B' }}>
              {currentEntry ? `Asiento Contable: ${currentEntry.numeroAsiento}` : 'Nuevo Asiento Contable (Libro Diario)'}
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              {isReadOnly ? 'Asiento registrado y auditado (Modo Solo Lectura)' : 'Partida doble bimonetaria en tiempo real'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {currentEntry && (
            <Chip
              label={currentEntry.estado === 'POSTED' ? 'Publicado' : currentEntry.estado === 'DRAFT' ? 'Borrador' : currentEntry.estado}
              size='small'
              sx={{
                fontWeight: 700,
                backgroundColor: currentEntry.estado === 'POSTED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                color: currentEntry.estado === 'POSTED' ? '#10B981' : '#D97706'
              }}
            />
          )}
          <IconButton onClick={onClose} size='small' sx={{ color: '#94A3B8' }}>
            <i className='tabler-x' />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 5 }}>
        {errorMsg && (
          <Alert severity='error' sx={{ mb: 4, borderRadius: '14px' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Master Fields */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4, mt: 0.5 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Diario Contable'
            value={diarioId}
            disabled={isReadOnly}
            onChange={e => setDiarioId(e.target.value)}
          >
            {journals.map(j => (
              <MenuItem key={j.id} value={j.id}>
                {j.nombre}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            size='small'
            type='date'
            label='Fecha del Asiento'
            value={fecha}
            disabled={isReadOnly}
            onChange={e => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            size='small'
            label='Documento de Referencia'
            placeholder='Ej. Ajuste Mensual, N° Recibo'
            value={documentoReferencia}
            disabled={isReadOnly}
            onChange={e => setDocumentoReferencia(e.target.value)}
          />

          <TextField
            fullWidth
            size='small'
            type='number'
            label='Tasa BCV (Bs/USD)'
            value={tasaBcv}
            disabled={isReadOnly}
            onChange={e => setTasaBcv(Number(e.target.value))}
          />
        </Box>

        {/* Detail Table */}
        <TableContainer sx={{ border: '1px solid #E6E4F0', borderRadius: '16px', mb: 3 }}>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 260 }}>Cuenta Contable</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 200 }}>Etiqueta / Glosa</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', minWidth: 150 }}>Contacto (Opcional)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 130 }}>Debe (USD)</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700, color: '#475569', width: 130 }}>Haber (USD)</TableCell>
                {!isReadOnly && <TableCell align='center' sx={{ width: 60 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow key={line.id || idx}>
                  <TableCell>
                    <TextField
                      select
                      fullWidth
                      size='small'
                      value={line.cuentaId}
                      disabled={isReadOnly}
                      onChange={e => handleLineChange(idx, 'cuentaId', e.target.value)}
                    >
                      {accounts.map(acc => (
                        <MenuItem key={acc.id} value={acc.id}>
                          {acc.codigo} - {acc.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size='small'
                      placeholder='Descripción de la línea'
                      value={line.etiqueta}
                      disabled={isReadOnly}
                      onChange={e => handleLineChange(idx, 'etiqueta', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size='small'
                      placeholder='Tercero asociado'
                      value={line.contactoNombre}
                      disabled={isReadOnly}
                      onChange={e => handleLineChange(idx, 'contactoNombre', e.target.value)}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <TextField
                      type='number'
                      size='small'
                      value={line.debeUsd || ''}
                      disabled={isReadOnly}
                      inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                      onChange={e => handleLineChange(idx, 'debeUsd', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <TextField
                      type='number'
                      size='small'
                      value={line.haberUsd || ''}
                      disabled={isReadOnly}
                      inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                      onChange={e => handleLineChange(idx, 'haberUsd', Number(e.target.value))}
                    />
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>

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
              mb: 3
            }}
          >
            Agregar Línea Contable
          </Button>
        )}

        {/* Double Entry Balance Bar */}
        <DoubleEntryBalanceBar
          totalDebeUsd={totalDebeUsd}
          totalHaberUsd={totalHaberUsd}
          totalDebeVes={totalDebeVes}
          totalHaberVes={totalHaberVes}
        />
      </DialogContent>

      <DialogActions sx={{ p: 5, pt: 3, borderTop: '1px solid #E6E4F0', gap: 2 }}>
        <Button
          variant='outlined'
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            borderColor: '#CBD5E1',
            color: '#64748B',
            textTransform: 'none',
            fontWeight: 600,
            px: 4
          }}
        >
          Cerrar
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
              A Borrador
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
                '&:hover': { backgroundColor: '#dc2626' }
              }}
            >
              Revertir
            </Button>
          </>
        ) : (
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={!isBalanced || submitting}
            startIcon={submitting ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-check' />}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              '&:hover': { backgroundColor: '#5b4bc4' }
            }}
          >
            Publicar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
