'use client'

import React, { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { useAuth } from '@/contexts/AuthContext'
import {
  createUnitOfMeasure,
  deactivateUnitOfMeasure,
  getUnitsOfMeasure,
  seedDefaultUnitsOfMeasure,
  type UnitOfMeasure
} from '@/services/inventoryService'

interface ToastState {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info'
}

const CATALOG_WRITE_PERMISSION = 'inventory:catalog:write'

const InventoryUnitsOfMeasureView: React.FC = () => {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(CATALOG_WRITE_PERMISSION)

  const [units, setUnits] = useState<UnitOfMeasure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' })

  const loadUnits = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getUnitsOfMeasure()

      setUnits(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el catálogo de unidades'

      setError(message)
      setUnits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedCode = code.trim()
    const trimmedName = name.trim()

    if (!trimmedCode || !trimmedName) {
      setToast({ open: true, message: 'Código y nombre son obligatorios', severity: 'error' })
      
return
    }

    setSaving(true)

    try {
      const created = await createUnitOfMeasure({ code: trimmedCode, name: trimmedName })

      setCode('')
      setName('')
      setToast({
        open: true,
        message: `Unidad "${created.code}" creada exitosamente`,
        severity: 'success'
      })
      await loadUnits()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la unidad'

      setToast({ open: true, message, severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (unit: UnitOfMeasure) => {
    if (!window.confirm(`¿Desactivar la unidad "${unit.code}"?`)) return

    setSaving(true)

    try {
      await deactivateUnitOfMeasure(unit.code)
      setToast({
        open: true,
        message: `Unidad "${unit.code}" desactivada`,
        severity: 'success'
      })
      await loadUnits()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al desactivar la unidad'

      setToast({ open: true, message, severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSeed = async () => {
    setSaving(true)

    try {
      const seeded = await seedDefaultUnitsOfMeasure()

      setToast({
        open: true,
        message: `Se sembraron ${seeded.length} unidades base`,
        severity: 'success'
      })
      await loadUnits()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al sembrar las unidades base'

      setToast({ open: true, message, severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box className='flex flex-col gap-6'>
      <Box className='flex flex-wrap items-start justify-between gap-3'>
        <Box>
          <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
            Unidades de Medida
          </Typography>
          <Typography variant='body2' className='text-[#6B7280]'>
            Catálogo canónico usado por productos, compras y ventas.
          </Typography>
        </Box>
        {canWrite && (
          <Button
            variant='outlined'
            onClick={handleSeed}
            disabled={saving}
            startIcon={<i className='tabler-seeding' />}
          >
            Sembrar unidades base
          </Button>
        )}
      </Box>

      {canWrite && (
        <Card>
          <CardContent>
            <form onSubmit={handleCreate}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='flex-start'>
                <TextField
                  label='Código'
                  size='small'
                  value={code}
                  onChange={event => setCode(event.target.value.toUpperCase())}
                  placeholder='UNI'
                  disabled={saving}
                  inputProps={{ maxLength: 20 }}
                  sx={{ width: { xs: '100%', sm: 180 } }}
                />
                <TextField
                  label='Nombre'
                  size='small'
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder='Unidad'
                  disabled={saving}
                  sx={{ flex: 1, minWidth: { xs: '100%', sm: 240 } }}
                />
                <Button type='submit' variant='contained' disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear unidad'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={loadUnits}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <Box className='flex justify-center py-10'>
              <CircularProgress size={28} />
            </Box>
          ) : units.length === 0 ? (
            <Box className='flex flex-col items-center gap-3 py-10 text-center'>
              <Typography variant='subtitle1' className='font-semibold text-[#1E1B2E]'>
                No hay unidades de medida activas
              </Typography>
              <Typography variant='body2' className='text-[#6B7280]'>
                Siembra las unidades base o crea una nueva para empezar.
              </Typography>
              {canWrite && (
                <Button variant='contained' onClick={handleSeed} disabled={saving}>
                  Sembrar unidades base
                </Button>
              )}
            </Box>
          ) : (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align='right'>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map(unit => (
                  <TableRow key={unit.id} hover>
                    <TableCell>
                      <span className='font-mono font-bold text-xs'>{unit.code}</span>
                    </TableCell>
                    <TableCell>{unit.name}</TableCell>
                    <TableCell>
                      <CustomChip label='Activa' color='success' size='small' />
                    </TableCell>
                    <TableCell align='right'>
                      {canWrite && (
                        <Tooltip title='Desactivar'>
                          <span>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleDeactivate(unit)}
                              disabled={saving}
                            >
                              <i className='tabler-archive' />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default InventoryUnitsOfMeasureView
