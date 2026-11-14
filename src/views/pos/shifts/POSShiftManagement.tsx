'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'

// Type Imports
import type { POSShift } from '@/types/posTypes'
import { getActiveShift, saveActiveShift } from '@/services/posService'

const POSShiftManagement = () => {
  // States
  const [shift, setShift] = useState<POSShift | null>(null)
  const [declaredUSD, setDeclaredUSD] = useState<string>('')
  const [declaredVES, setDeclaredVES] = useState<string>('')
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    setShift(getActiveShift())
  }, [])

  if (!shift) return null

  const handleBlindClose = () => {
    const decUSD = parseFloat(declaredUSD) || 0
    const decVES = parseFloat(declaredVES) || 0

    const diffUSD = decUSD - shift.totalCashUSD
    const diffVES = decVES - shift.totalCashVES

    const updated: POSShift = {
      ...shift,
      status: 'CLOSED',
      closingDate: new Date().toISOString(),
      declaredCashUSD: decUSD,
      declaredCashVES: decVES,
      differenceUSD: diffUSD,
      differenceVES: diffVES
    }

    setShift(updated)
    saveActiveShift(updated)
    setClosed(true)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Page Header */}
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <Typography variant='h4' className='font-bold'>
            Gestión de Cajas & Turnos POS
          </Typography>
          <Typography variant='body2' className='text-textSecondary'>
            Aperturas, control de fondo inicial y arqueo ciego de fin de jornada
          </Typography>
        </div>

        <Button
          component={Link}
          href='/pos/terminal'
          variant='contained'
          color='primary'
          size='large'
          startIcon={<i className='tabler-device-tablet' />}
          className='font-bold shadow-md shadow-primary/30'
        >
          Abrir Terminal de Venta
        </Button>
      </div>

      <Grid container spacing={6}>
        {/* Left Column: Shift Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title='Turno Activo en Caja'
              subheader='Detalles de la sesión de cobranza'
              action={
                <Chip
                  label={shift.status === 'OPEN' ? '🟢 Turno Abierto' : '🔴 Turno Cerrado'}
                  color={shift.status === 'OPEN' ? 'success' : 'secondary'}
                  variant='tonal'
                  className='font-bold'
                />
              }
            />
            <Divider />
            <CardContent className='flex flex-col gap-4'>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Cajero Asignado:</Typography>
                <Typography variant='body1' className='font-bold'>{shift.cashierName}</Typography>
              </div>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Terminal:</Typography>
                <Typography variant='body1' className='font-bold'>{shift.terminalName}</Typography>
              </div>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Tasa BCV del Turno:</Typography>
                <Typography variant='body1' className='font-mono font-bold text-primary'>
                  {shift.exchangeRateBCV.toFixed(2)} Bs. / USD
                </Typography>
              </div>
              <div className='flex justify-between items-center'>
                <Typography variant='body2' className='text-textSecondary'>Hora de Apertura:</Typography>
                <Typography variant='body1'>{new Date(shift.openingDate).toLocaleString()}</Typography>
              </div>

              <Divider />

              <Typography variant='subtitle2' className='font-bold uppercase text-primary tracking-wider'>
                Fondo Inicial de Caja (Cash Float)
              </Typography>
              <div className='grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--mui-palette-action-hover)]'>
                <div>
                  <Typography variant='caption' className='text-textSecondary'>Fondo en Divisas</Typography>
                  <Typography variant='h6' className='font-bold font-mono'>${shift.initialCashUSD.toFixed(2)}</Typography>
                </div>
                <div>
                  <Typography variant='caption' className='text-textSecondary'>Fondo en Bolívares</Typography>
                  <Typography variant='h6' className='font-bold font-mono'>{shift.initialCashVES.toFixed(2)} Bs.</Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Blind Close (Arqueo Ciego) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title='Arqueo Ciego de Caja (Blind Close)'
              subheader='El operador ingresa el conteo físico sin conocer el total calculado por el sistema'
            />
            <Divider />
            <CardContent className='flex flex-col gap-4'>
              {!closed && shift.status === 'OPEN' ? (
                <>
                  <Alert severity='warning' className='text-xs'>
                    Ingrese el total de billetes y monedas contados físicamente en la gaveta antes de cerrar el turno.
                  </Alert>

                  <CustomTextField
                    fullWidth
                    label='Conteo Físico Efectivo Divisas ($ USD)'
                    placeholder='0.00'
                    type='number'
                    value={declaredUSD}
                    onChange={e => setDeclaredUSD(e.target.value)}
                  />

                  <CustomTextField
                    fullWidth
                    label='Conteo Físico Efectivo Bolívares (Bs. VES)'
                    placeholder='0.00'
                    type='number'
                    value={declaredVES}
                    onChange={e => setDeclaredVES(e.target.value)}
                  />

                  <Button
                    variant='contained'
                    color='error'
                    size='large'
                    onClick={handleBlindClose}
                    startIcon={<i className='tabler-lock' />}
                    className='mt-2 font-bold'
                  >
                    Cerrar Turno y Revelar Conciliación
                  </Button>
                </>
              ) : (
                <div className='flex flex-col gap-4'>
                  <Alert severity='success' className='text-xs'>
                    Turno cerrado con éxito. A continuación se presentan las diferencias conciliadas.
                  </Alert>

                  <div className='flex flex-col gap-2 p-4 rounded-xl bg-[var(--mui-palette-action-hover)] font-mono text-sm'>
                    <div className='flex justify-between'>
                      <span>Efectivo USD Declarado:</span>
                      <strong>${shift.declaredCashUSD?.toFixed(2)}</strong>
                    </div>
                    <div className='flex justify-between'>
                      <span>Efectivo USD Esperado:</span>
                      <strong>${shift.totalCashUSD.toFixed(2)}</strong>
                    </div>
                    <div className='flex justify-between border-t pt-1 font-bold'>
                      <span>Diferencia USD:</span>
                      <span className={(shift.differenceUSD || 0) < 0 ? 'text-error' : 'text-success'}>
                        {(shift.differenceUSD || 0) >= 0 ? '+' : ''}
                        ${shift.differenceUSD?.toFixed(2)}
                      </span>
                    </div>

                    <Divider className='my-2' />

                    <div className='flex justify-between'>
                      <span>Efectivo Bs. Declarado:</span>
                      <strong>{shift.declaredCashVES?.toFixed(2)} Bs.</strong>
                    </div>
                    <div className='flex justify-between'>
                      <span>Efectivo Bs. Esperado:</span>
                      <strong>{shift.totalCashVES.toFixed(2)} Bs.</strong>
                    </div>
                    <div className='flex justify-between border-t pt-1 font-bold'>
                      <span>Diferencia Bs.:</span>
                      <span className={(shift.differenceVES || 0) < 0 ? 'text-error' : 'text-success'}>
                        {(shift.differenceVES || 0) >= 0 ? '+' : ''}
                        {shift.differenceVES?.toFixed(2)} Bs.
                      </span>
                    </div>
                  </div>

                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={() => {
                      setClosed(false)
                      const reopened = { ...shift, status: 'OPEN' as const }

                      setShift(reopened)
                      saveActiveShift(reopened)
                    }}
                  >
                    Reabrir Turno para Pruebas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}

export default POSShiftManagement
