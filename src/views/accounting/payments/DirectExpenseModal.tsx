'use client'

import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import { accountingService } from '@/services/accountingService'
import type { Journal, Account, CurrencyCode, DirectExpenseForm } from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  journals: Journal[]
  accounts: Account[]
  tasaBcv: number
  preselectedJournalId?: string
}

export const DirectExpenseModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  journals,
  accounts,
  tasaBcv,
  preselectedJournalId
}) => {
  const bankJournals = journals.filter(j => j.tipo.startsWith('BANCO') || j.tipo === 'CAJA')
  const expenseAccounts = accounts.filter(a => a.tipo.startsWith('EXPENSE'))

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [diarioSalidaId, setDiarioSalidaId] = useState(preselectedJournalId || bankJournals[0]?.id || '')
  const [beneficiario, setBeneficiario] = useState('')
  const [conceptoGeneral, setConceptoGeneral] = useState('')
  const [moneda, setMoneda] = useState<CurrencyCode>('USD')
  const [submitting, setSubmitting] = useState(false)

  // Dynamic lines
  const [lineas, setLineas] = useState<
    { id: string; cuentaGastoId: string; descripcion: string; monto: string; aplicaIva: boolean }[]
  >([
    {
      id: 'l-1',
      cuentaGastoId: expenseAccounts[0]?.id || 'acc-610201',
      descripcion: 'Comisiones y mantenimiento de cuenta',
      monto: '15.00',
      aplicaIva: false
    }
  ])

  const handleAddLine = () => {
    setLineas(prev => [
      ...prev,
      {
        id: `l-${Date.now()}`,
        cuentaGastoId: expenseAccounts[0]?.id || 'acc-610201',
        descripcion: '',
        monto: '',
        aplicaIva: false
      }
    ])
  }

  const handleRemoveLine = (id: string) => {
    if (lineas.length === 1) return
    setLineas(prev => prev.filter(l => l.id !== id))
  }

  const handleLineChange = (id: string, field: string, value: any) => {
    setLineas(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)))
  }

  // Totales
  const subtotal = lineas.reduce((acc, l) => acc + (parseFloat(l.monto) || 0), 0)
  const ivaTotal = lineas.filter(l => l.aplicaIva).reduce((acc, l) => acc + (parseFloat(l.monto) || 0) * 0.16, 0)
  const total = subtotal + ivaTotal
  const totalVes = Number((total * tasaBcv).toFixed(2))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!diarioSalidaId || !conceptoGeneral.trim() || total <= 0) return

    setSubmitting(true)

    try {
      const payload: DirectExpenseForm = {
        fecha,
        diarioSalidaId,
        beneficiario: beneficiario.trim() || undefined,
        conceptoGeneral: conceptoGeneral.trim(),
        moneda,
        tasaBcv,
        lineas: lineas.map(l => ({
          id: l.id,
          cuentaGastoId: l.cuentaGastoId,
          descripcion: l.descripcion.trim(),
          monto: parseFloat(l.monto) || 0,
          aplicaIva: l.aplicaIva
        })),
        aplicaIgtf: false
      }

      const entry = await accountingService.createDirectExpense(payload)

      onSuccess(`Gasto Directo registrado y contabilizado en asiento ${entry.numeroAsiento}.`)
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Error al registrar el gasto directo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          boxShadow: '0 8px 32px rgba(108, 92, 231, 0.08)'
        }
      }}
    >
      <DialogTitle className='p-6 pb-4 bg-[#FAFAFC] border-b border-[#E6E4F0] flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-lg'>
            <i className='tabler-receipt-tax' />
          </div>
          <div>
            <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
              Registrar Gasto Directo en Cuenta
            </Typography>
            <span className='text-xs text-[#6B7280]'>
              Egresos inmediatos sin factura previa (comisiones, caja chica, servicios)
            </span>
          </div>
        </div>
        <IconButton onClick={onClose} size='small'>
          <i className='tabler-x text-lg text-[#6B7280]' />
        </IconButton>
      </DialogTitle>

      <DialogContent className='p-6 flex flex-col gap-5'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-5 mt-2'>
          {/* Fila 1: Fecha, Diario de Salida, Moneda */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <TextField
              size='small'
              label='Fecha del Gasto'
              type='date'
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />

            <TextField
              select
              size='small'
              label='Diario de Salida (Banco/Caja)'
              value={diarioSalidaId}
              onChange={e => setDiarioSalidaId(e.target.value)}
              required
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            >
              {bankJournals.map(j => (
                <MenuItem key={j.id} value={j.id}>
                  {j.nombre}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size='small'
              label='Moneda del Gasto'
              value={moneda}
              onChange={e => setMoneda(e.target.value as CurrencyCode)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            >
              <MenuItem value='USD'>Dólares Americanos ($ USD)</MenuItem>
              <MenuItem value='VES'>Bolívares Digitales (Bs. VES)</MenuItem>
            </TextField>
          </div>

          {/* Fila 2: Beneficiario y Concepto General */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <TextField
              size='small'
              label='Beneficiario / Proveedor Informal (Opcional)'
              placeholder='Ej. Banco Banesco / Cantv / Estación de Servicio'
              value={beneficiario}
              onChange={e => setBeneficiario(e.target.value)}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />

            <TextField
              size='small'
              label='Concepto General del Gasto'
              placeholder='Ej. Comisiones bancarias del mes de Octubre'
              value={conceptoGeneral}
              onChange={e => setConceptoGeneral(e.target.value)}
              required
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          {/* Líneas de Cuentas de Gasto */}
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <Typography variant='subtitle2' className='font-bold text-[#1E1B2E]'>
                Líneas de Cuentas de Gasto
              </Typography>
              <Button
                size='small'
                variant='outlined'
                onClick={handleAddLine}
                startIcon={<i className='tabler-plus text-xs' />}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#6C5CE7',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Agregar Línea
              </Button>
            </div>

            <div className='flex flex-col gap-3'>
              {lineas.map((l, index) => (
                <div
                  key={l.id}
                  className='grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl border border-[#E6E4F0] bg-[#FAFAFC] items-center'
                >
                  <div className='sm:col-span-5'>
                    <TextField
                      select
                      size='small'
                      label='Cuenta de Gasto'
                      value={l.cuentaGastoId}
                      onChange={e => handleLineChange(l.id, 'cuentaGastoId', e.target.value)}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FFFFFF' } }}
                    >
                      {expenseAccounts.map(a => (
                        <MenuItem key={a.id} value={a.id} className='text-xs'>
                          <span className='font-mono font-bold text-[#6C5CE7] mr-1'>{a.codigo}</span> {a.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>

                  <div className='sm:col-span-3'>
                    <TextField
                      size='small'
                      label='Detalle / Glosa'
                      placeholder='Motivo específico'
                      value={l.descripcion}
                      onChange={e => handleLineChange(l.id, 'descripcion', e.target.value)}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FFFFFF' } }}
                    />
                  </div>

                  <div className='sm:col-span-2'>
                    <TextField
                      size='small'
                      label={`Importe (${moneda})`}
                      type='number'
                      value={l.monto}
                      onChange={e => handleLineChange(l.id, 'monto', e.target.value)}
                      required
                      fullWidth
                      inputProps={{ min: '0.01', step: '0.01' }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FFFFFF' } }}
                    />
                  </div>

                  <div className='sm:col-span-1 flex items-center justify-center'>
                    <FormControlLabel
                      control={
                        <Switch
                          size='small'
                          checked={l.aplicaIva}
                          onChange={e => handleLineChange(l.id, 'aplicaIva', e.target.checked)}
                          color='primary'
                        />
                      }
                      label={<span className='text-[10px] font-bold text-[#6B7280]'>IVA</span>}
                      labelPlacement='top'
                      className='m-0'
                    />
                  </div>

                  <div className='sm:col-span-1 flex items-center justify-end'>
                    <IconButton
                      size='small'
                      disabled={lineas.length === 1}
                      onClick={() => handleRemoveLine(l.id)}
                      sx={{ color: '#EF4444' }}
                    >
                      <i className='tabler-trash text-base' />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Asiento Directo */}
          <div className='p-4 rounded-2xl bg-[#F8F7FC] border border-[#E6E4F0] flex items-center justify-between flex-wrap gap-4'>
            <div>
              <span className='text-xs font-semibold text-[#6B7280] block'>Total a Egresar:</span>
              <Typography variant='h5' className='font-bold text-[#1E1B2E] font-mono'>
                {moneda === 'USD' ? `$${total.toFixed(2)}` : `${total.toFixed(2)} Bs.`}
              </Typography>
              <span className='text-xs font-semibold text-[#6C5CE7]'>
                {moneda === 'USD' ? `Equivalente: ${totalVes.toLocaleString('es-VE')} Bs.` : `Equivalente: $${(total / tasaBcv).toFixed(2)} USD`}
              </span>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outlined'
                onClick={onClose}
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#E6E4F0',
                  color: '#6B7280',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3
                }}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={submitting || total <= 0}
                startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
                sx={{
                  borderRadius: '9999px',
                  backgroundColor: '#6C5CE7',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 3.5,
                  boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                  '&:hover': { backgroundColor: '#5B4CDB' }
                }}
              >
                {submitting ? 'Registrando...' : 'Contabilizar Gasto'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
