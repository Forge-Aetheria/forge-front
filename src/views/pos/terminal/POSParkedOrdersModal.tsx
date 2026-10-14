'use client'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'

// Type Imports
import type { ParkedOrder } from '@/types/posTypes'

type Props = {
  open: boolean
  onClose: () => void
  orders: ParkedOrder[]
  onResumeOrder: (order: ParkedOrder) => void
  onDeleteOrder: (orderId: string) => void
}

const POSParkedOrdersModal = ({
  open,
  onClose,
  orders,
  onResumeOrder,
  onDeleteOrder
}: Props) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle className='flex items-center justify-between border-b border-[var(--mui-palette-divider)] pb-3'>
        <div className='flex items-center gap-2'>
          <i className='tabler-player-pause text-warning text-xl' />
          <Typography variant='h6' className='font-bold'>
            Tickets en Espera ({orders.length})
          </Typography>
        </div>
        <IconButton size='small' onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>

      <DialogContent className='pt-4 flex flex-col gap-2.5 max-h-[450px] overflow-y-auto'>
        {orders.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-8 text-textSecondary gap-2'>
            <i className='tabler-inbox text-4xl opacity-40' />
            <Typography>No hay tickets en espera actualmente.</Typography>
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              className='flex items-center justify-between p-3.5 rounded-xl border border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-paper)] hover:border-warning/50 transition-all select-none'
            >
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <Typography variant='subtitle2' className='font-bold font-mono text-primary'>
                    {order.code}
                  </Typography>
                  <Chip
                    size='small'
                    label={`${order.items.length} ítems`}
                    color='secondary'
                    variant='tonal'
                    className='h-4 text-[10px]'
                  />
                  <Chip
                    size='small'
                    label={order.fiscalMode ? 'Fiscal' : 'Nota'}
                    color={order.fiscalMode ? 'primary' : 'warning'}
                    variant='outlined'
                    className='h-4 text-[10px]'
                  />
                </div>
                <Typography variant='body2' className='font-medium text-textPrimary mt-0.5'>
                  {order.customer.name}
                </Typography>
                <Typography variant='caption' className='text-textSecondary text-[11px]'>
                  Pausado: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </div>

              <div className='flex items-center gap-3'>
                <div className='flex flex-col items-end font-mono'>
                  <Typography variant='subtitle1' className='font-bold text-textPrimary leading-tight'>
                    ${order.totalUSD.toFixed(2)}
                  </Typography>
                  <Typography variant='caption' className='text-textSecondary leading-tight'>
                    {order.totalVES.toFixed(2)} Bs.
                  </Typography>
                </div>

                <Button
                  size='small'
                  variant='contained'
                  color='warning'
                  onClick={() => {
                    onResumeOrder(order)
                    onClose()
                  }}
                  className='text-xs font-bold'
                >
                  Recuperar
                </Button>

                <IconButton
                  size='small'
                  color='error'
                  onClick={() => onDeleteOrder(order.id)}
                >
                  <i className='tabler-trash text-base' />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </DialogContent>

      <DialogActions className='border-t border-[var(--mui-palette-divider)]'>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

export default POSParkedOrdersModal
