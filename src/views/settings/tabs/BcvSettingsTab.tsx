'use client'

import React, { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'

import CustomChip from '@core/components/mui/Chip'

import { BcvAuditHistoryTable } from '../components/BcvAuditHistoryTable'
import type { BcvRateConfig } from '@/types/settingsTypes'

interface Props {
  bcvConfig: BcvRateConfig
  onUpdateRate: (tasa: number, modo: 'AUTOMATICO_7AM' | 'MANUAL', motivo: string) => Promise<void>
  onToggleAutoMode: (auto: boolean) => Promise<void>
}

export const BcvSettingsTab: React.FC<Props> = ({
  bcvConfig,
  onUpdateRate,
  onToggleAutoMode
}) => {
  const isAuto = bcvConfig.modoActualizacion === 'AUTOMATICO_7AM'
  const [manualRate, setManualRate] = useState(bcvConfig.tasaActiva.toString())
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked

    setToggling(true)

    try {
      await onToggleAutoMode(checked)
    } finally {
      setToggling(false)
    }
  }

  const handleSaveManualRate = async (e: React.FormEvent) => {
    e.preventDefault()

    const num = parseFloat(manualRate)

    if (isNaN(num) || num <= 0) return

    setSaving(true)

    try {
      await onUpdateRate(num, 'MANUAL', motivo.trim() || 'Ajuste manual administrativo')
      setMotivo('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* KPI Principal y Controles de Tasa */}
      <div className='grid grid-cols-1 md:grid-cols-12 gap-5'>
        {/* KPI de Tasa Activa (5 cols) */}
        <div className='md:col-span-5'>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <CardContent className='p-6 flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold text-[#6B7280] uppercase tracking-wider'>
                  Tasa Oficial en Vivo (BCV)
                </span>
                <CustomChip
                  size='small'
                  variant='tonal'
                  color={isAuto ? 'info' : 'warning'}
                  label={isAuto ? 'Sincronizado' : 'Modo Manual'}
                />
              </div>

              <div className='flex items-baseline gap-2 mt-1'>
                <Typography variant='h3' className='font-mono font-bold text-[#6C5CE7]'>
                  {Number(bcvConfig.tasaActiva).toFixed(2)}
                </Typography>
                <span className='text-sm font-bold text-[#1E1B2E]'>Bs. / USD</span>
              </div>

              <span className='text-xs text-[#6B7280] mt-1 flex items-center gap-1.5'>
                <i className='tabler-clock text-[#6C5CE7]' />
                {bcvConfig.ultimaSincronizacion}
              </span>

              <div className='mt-3 pt-3 border-t border-[#F4F3F8] text-[11px] text-[#6B7280] leading-relaxed'>
                Esta tasa gobierna la conversión dual en Compras, Presupuestos de Venta, Terminales POS y Valoración del Kárdex.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Conmutación y Sobre-escritura (7 cols) */}
        <div className='md:col-span-7'>
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)',
              height: '100%'
            }}
          >
            <CardContent className='p-6 flex flex-col gap-4'>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <div>
                  <Typography variant='subtitle1' className='font-bold text-[#1E1B2E]'>
                    Política de Actualización Cambiaria
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Elija entre sincronización desatendida o control manual
                  </span>
                </div>

                <FormControlLabel
                  control={
                    <Switch
                      checked={isAuto}
                      onChange={handleToggle}
                      disabled={toggling}
                      color='primary'
                    />
                  }
                  label={
                    <span className='text-xs font-semibold text-[#1E1B2E]'>
                      {isAuto ? 'Sincronización Automática (7:00 AM)' : 'Modo Manual Habilitado'}
                    </span>
                  }
                />
              </div>

              {isAuto ? (
                <div className='bg-[#F8F7FC] p-4 rounded-2xl border border-[#E6E4F0] flex items-center gap-3 my-auto'>
                  <div className='w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0'>
                    <i className='tabler-refresh text-xl' />
                  </div>
                  <div>
                    <span className='font-bold text-xs text-[#1E1B2E] block'>
                      Sincronización Desatendida Activa
                    </span>
                    <span className='text-xs text-[#6B7280] leading-relaxed'>
                      El sistema consulta la API del BCV diariamente a las 7:00 AM para actualizar la tasa oficial. Para sobreescribir la tasa, desactive el switch arriba.
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveManualRate} className='flex flex-col gap-3 my-auto'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <TextField
                      size='small'
                      label='Nueva Tasa Manual (VES/USD)'
                      type='number'
                      value={manualRate}
                      onChange={e => setManualRate(e.target.value)}
                      required
                      inputProps={{ step: '0.01', min: '1' }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position='end'>Bs.</InputAdornment>
                        }
                      }}
                    />

                    <TextField
                      size='small'
                      label='Motivo del Ajuste'
                      placeholder='Ej. Cierre de fin de semana / Caída BCV'
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
                    />
                  </div>

                  <div className='flex justify-end pt-1'>
                    <Button
                      type='submit'
                      variant='contained'
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
                      sx={{
                        borderRadius: '9999px',
                        backgroundColor: '#6C5CE7',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 3,
                        boxShadow: '0 4px 14px rgba(108, 92, 231, 0.3)',
                        '&:hover': { backgroundColor: '#5B4CDB' }
                      }}
                    >
                      {saving ? 'Aplicando...' : 'Aplicar'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial de Auditoría Cambiaria */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
        }}
      >
        <CardContent className='p-6 flex flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                Bitácora de Auditoría de Tasas Cambiarias
              </Typography>
            </div>
            <CustomChip
              size='small'
              label={`${bcvConfig.historial.length} registros`}
              color='primary'
              variant='tonal'
            />
          </div>

          <BcvAuditHistoryTable entries={bcvConfig.historial} />
        </CardContent>
      </Card>
    </div>
  )
}
