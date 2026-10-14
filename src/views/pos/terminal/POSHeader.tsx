'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CustomTextField from '@core/components/mui/TextField'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

type Props = {
  cashierName: string
  terminalName: string
  bcvRate: number
  onUpdateBCVRate: (newRate: number) => void
  fiscalMode: boolean
  onToggleFiscalMode: (fiscal: boolean) => void
  parkedCount: number
  onOpenParkedModal: () => void
}

const POSHeader = ({
  cashierName,
  terminalName,
  bcvRate,
  onUpdateBCVRate,
  fiscalMode,
  onToggleFiscalMode,
  parkedCount,
  onOpenParkedModal
}: Props) => {
  // States
  const [bcvModalOpen, setBcvModalOpen] = useState(false)
  const [tempRate, setTempRate] = useState(bcvRate.toString())

  const handleSaveBCV = () => {
    const val = parseFloat(tempRate)

    if (!isNaN(val) && val > 0) {
      onUpdateBCVRate(val)
      setBcvModalOpen(false)
    }
  }

  return (
    <header className='flex items-center justify-between px-4 py-2.5 bg-[var(--mui-palette-background-paper)] border-b border-[var(--mui-palette-divider)] shadow-xs select-none'>
      {/* Left: Terminal Info & Cashier */}
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <div className='flex items-center justify-center is-9 bs-9 rounded-lg bg-primary text-primaryContrastText font-bold shadow-xs'>
            <i className='tabler-device-tablet text-xl' />
          </div>
          <div>
            <div className='flex items-center gap-1.5'>
              <Typography variant='subtitle2' className='font-bold leading-tight'>
                {terminalName}
              </Typography>
              <Chip size='small' label='Online' color='success' variant='tonal' className='h-4 text-[10px]' />
            </div>
            <Typography variant='caption' className='text-textSecondary leading-tight'>
              Cajero: <strong>{cashierName}</strong>
            </Typography>
          </div>
        </div>

        {/* BCV Rate Pill */}
        <div
          onClick={() => {
            setTempRate(bcvRate.toString())
            setBcvModalOpen(true)
          }}
          className='cursor-pointer flex items-center gap-1.5 px-3 py-1 bg-[var(--mui-palette-action-hover)] hover:bg-[var(--mui-palette-action-selected)] border border-[var(--mui-palette-divider)] rounded-lg transition-colors'
        >
          <i className='tabler-currency-dollar text-primary text-base' />
          <Typography variant='caption' className='font-mono font-bold text-textPrimary'>
            Tasa BCV: {bcvRate.toFixed(2)} Bs.
          </Typography>
          <Tooltip title='Modificar Tasa BCV'>
            <i className='tabler-edit text-xs text-textSecondary' />
          </Tooltip>
        </div>
      </div>

      {/* Right: Controls & Navigation */}
      <div className='flex items-center gap-3'>
        {/* Fiscal Mode Switch */}
        <div className='flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[var(--mui-palette-divider)] bg-[var(--mui-palette-action-hover)]'>
          <i className={fiscalMode ? 'tabler-receipt-tax text-primary' : 'tabler-file-text text-warning'} />
          <FormControlLabel
            control={
              <Switch
                size='small'
                checked={fiscalMode}
                onChange={e => onToggleFiscalMode(e.target.checked)}
              />
            }
            label={
              <Typography variant='caption' className='font-bold select-none'>
                {fiscalMode ? 'Factura Fiscal (ON)' : 'Nota de Entrega (OFF)'}
              </Typography>
            }
            className='m-0'
          />
        </div>

        {/* Parked Orders */}
        <Button
          size='small'
          variant={parkedCount > 0 ? 'contained' : 'tonal'}
          color='warning'
          onClick={onOpenParkedModal}
          startIcon={<i className='tabler-player-pause' />}
          className='font-bold text-xs'
        >
          En Espera ({parkedCount})
        </Button>

        {/* Exit to ERP */}
        <Tooltip title='Salir al Panel del ERP'>
          <Button
            component={Link}
            href='/inventory'
            size='small'
            variant='tonal'
            color='secondary'
            startIcon={<i className='tabler-layout-dashboard' />}
            className='text-xs'
          >
            Panel ERP
          </Button>
        </Tooltip>
      </div>

      {/* BCV Rate Dialog */}
      <Dialog open={bcvModalOpen} onClose={() => setBcvModalOpen(false)}>
        <DialogTitle className='flex items-center gap-2'>
          <i className='tabler-currency-dollar text-primary' />
          Ajustar Tasa Oficial BCV
        </DialogTitle>
        <DialogContent className='pt-4'>
          <Typography variant='body2' className='mb-3 text-textSecondary'>
            Esta tasa se aplicará de forma histórica a todas las transacciones generadas en esta sesión.
          </Typography>
          <CustomTextField
            autoFocus
            fullWidth
            label='Tasa en Bolívares por USD (Bs.)'
            value={tempRate}
            onChange={e => setTempRate(e.target.value)}
            type='number'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBcvModalOpen(false)}>Cancelar</Button>
          <Button variant='contained' onClick={handleSaveBCV}>Guardar Tasa</Button>
        </DialogActions>
      </Dialog>
    </header>
  )
}

export default POSHeader
