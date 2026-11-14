'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

// Type Imports
import type { POSCartItem, POSCustomer } from '@/types/posTypes'
import { contactsService } from '@/services/contactsService'

type Props = {
  items: POSCartItem[]
  customer: POSCustomer
  onUpdateCustomer: (customer: POSCustomer) => void
  onUpdateQuantity: (cartItemId: string, newQty: number) => void
  onRemoveItem: (cartItemId: string) => void
  onClearCart: () => void
  onParkOrder: () => void
  onCheckout: () => void
  subtotalUSD: number
  subtotalVES: number
  taxUSD: number
  taxVES: number
  totalUSD: number
  totalVES: number
  fiscalMode: boolean
}

const POSCart = ({
  items,
  customer,
  onUpdateCustomer,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onParkOrder,
  onCheckout,
  subtotalUSD,
  subtotalVES,
  taxUSD,
  taxVES,
  totalUSD,
  totalVES,
  fiscalMode
}: Props) => {
  // States
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(customer.id)
  const [customers, setCustomers] = useState<POSCustomer[]>([])

  useEffect(() => {
    contactsService
      .getTerceros({ clasificacion: 'CLIENTE' })
      .then(list =>
        setCustomers(
          list.map(t => ({
            id: t.id,
            name: t.nombre_razon_social,
            identification: t.identificacion,
            email: t.email_principal || undefined,
            phone: t.telefono_principal || undefined,
            address: t.direccion || undefined
          }))
        )
      )
      .catch(() => setCustomers([]))
  }, [])

  const handleSaveCustomer = () => {
    const found = customers.find(c => c.id === selectedCustomerId)

    if (found) {
      onUpdateCustomer(found)
      setCustomerModalOpen(false)
    }
  }

  return (
    <div className='flex flex-col h-full bg-[var(--mui-palette-background-paper)] border-l border-[var(--mui-palette-divider)] select-none'>
      {/* Top Customer Info */}
      <div className='p-3 border-b border-[var(--mui-palette-divider)] flex items-center justify-between gap-2 bg-[var(--mui-palette-action-hover)]'>
        <div className='flex items-center gap-2 overflow-hidden'>
          <div className='flex items-center justify-center is-7 bs-7 rounded-full bg-primary/10 text-primary'>
            <i className='tabler-user text-base' />
          </div>
          <div className='flex flex-col overflow-hidden'>
            <Typography variant='caption' className='font-bold text-textPrimary truncate leading-tight'>
              {customer.name}
            </Typography>
            <Typography variant='caption' className='text-textSecondary text-[10px] leading-tight font-mono'>
              {customer.identification}
            </Typography>
          </div>
        </div>

        <Button
          size='small'
          variant='tonal'
          color='primary'
          onClick={() => setCustomerModalOpen(true)}
          className='text-[11px] h-7 px-2'
        >
          Cambiar
        </Button>
      </div>

      {/* Cart Items List */}
      <div className='grow overflow-y-auto p-3 flex flex-col gap-2'>
        {items.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-textSecondary gap-2 py-12'>
            <i className='tabler-shopping-cart-x text-5xl opacity-40' />
            <Typography variant='body2' className='text-center'>
              Ticket vacío.<br />Escanea un código de barras o selecciona un producto.
            </Typography>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className='flex flex-col p-2.5 rounded-xl border border-[var(--mui-palette-divider)] bg-[var(--mui-palette-background-default)] gap-2'
            >
              {/* Item Info Header */}
              <div className='flex items-start justify-between gap-2'>
                <div className='flex flex-col'>
                  <Typography className='font-bold text-xs leading-tight text-textPrimary'>
                    {item.name}
                  </Typography>
                  {item.variantLabel && (
                    <Typography variant='caption' className='text-textSecondary text-[11px]'>
                      {item.variantLabel}
                    </Typography>
                  )}
                  <Typography variant='caption' className='font-mono text-[10px] text-primary'>
                    {item.sku}
                  </Typography>
                </div>

                <div className='flex flex-col items-end'>
                  <Typography variant='caption' className='font-mono font-bold text-textPrimary'>
                    ${item.totalUSD.toFixed(2)}
                  </Typography>
                  <Typography variant='caption' className='font-mono text-[10px] text-textSecondary'>
                    {item.totalVES.toFixed(2)} Bs.
                  </Typography>
                </div>
              </div>

              {/* Quantity Controls & Delete */}
              <div className='flex items-center justify-between pt-1 border-t border-[var(--mui-palette-divider)]'>
                <div className='flex items-center gap-1.5'>
                  <IconButton
                    size='small'
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className='is-6 bs-6 rounded bg-[var(--mui-palette-action-hover)] hover:bg-[var(--mui-palette-action-selected)]'
                  >
                    <i className='tabler-minus text-xs' />
                  </IconButton>
                  <Typography variant='body2' className='font-mono font-bold px-1.5 min-w-[20px] text-center'>
                    {item.quantity}
                  </Typography>
                  <IconButton
                    size='small'
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className='is-6 bs-6 rounded bg-[var(--mui-palette-action-hover)] hover:bg-[var(--mui-palette-action-selected)]'
                  >
                    <i className='tabler-plus text-xs' />
                  </IconButton>
                  <Typography variant='caption' className='text-textDisabled text-[10px] ml-1'>
                    @ ${item.unitPriceUSD.toFixed(2)}
                  </Typography>
                </div>

                <IconButton
                  size='small'
                  color='error'
                  onClick={() => onRemoveItem(item.id)}
                  className='is-6 bs-6'
                >
                  <i className='tabler-trash text-sm' />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>

      <Divider />

      {/* Financial Summary */}
      <div className='p-3 flex flex-col gap-1.5 bg-[var(--mui-palette-background-default)]'>
        <div className='flex justify-between items-center text-xs'>
          <Typography variant='caption' className='text-textSecondary'>Subtotal:</Typography>
          <div className='flex items-center gap-2 font-mono'>
            <span className='font-semibold'>${subtotalUSD.toFixed(2)}</span>
            <span className='text-textSecondary text-[11px]'>({subtotalVES.toFixed(2)} Bs.)</span>
          </div>
        </div>

        {fiscalMode && (
          <div className='flex justify-between items-center text-xs'>
            <Typography variant='caption' className='text-textSecondary'>IVA (16%):</Typography>
            <div className='flex items-center gap-2 font-mono'>
              <span className='font-semibold'>${taxUSD.toFixed(2)}</span>
              <span className='text-textSecondary text-[11px]'>({taxVES.toFixed(2)} Bs.)</span>
            </div>
          </div>
        )}

        <div className='flex justify-between items-center pt-1 border-t border-[var(--mui-palette-divider)]'>
          <Typography variant='subtitle2' className='font-bold uppercase tracking-wider'>
            Total a Pagar:
          </Typography>
          <div className='flex flex-col items-end font-mono'>
            <Typography variant='h6' className='font-bold text-primary leading-tight'>
              ${totalUSD.toFixed(2)}
            </Typography>
            <Typography variant='caption' className='font-bold text-textSecondary leading-tight'>
              {totalVES.toFixed(2)} Bs.
            </Typography>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='p-3 pt-0 flex flex-col gap-2 bg-[var(--mui-palette-background-default)]'>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            size='small'
            variant='tonal'
            color='warning'
            disabled={items.length === 0}
            onClick={onParkOrder}
            startIcon={<i className='tabler-player-pause' />}
            className='text-xs font-bold'
          >
            Pausar Orden
          </Button>
          <Button
            size='small'
            variant='tonal'
            color='secondary'
            disabled={items.length === 0}
            onClick={onClearCart}
            startIcon={<i className='tabler-trash' />}
            className='text-xs font-bold'
          >
            Vaciar
          </Button>
        </div>

        {/* Big Checkout Button */}
        <Button
          fullWidth
          size='large'
          variant='contained'
          color='success'
          disabled={items.length === 0}
          onClick={onCheckout}
          startIcon={<i className='tabler-cash-register text-xl' />}
          className='py-3 text-sm font-bold shadow-md shadow-success/30'
        >
          COBRAR (${totalUSD.toFixed(2)} / {totalVES.toFixed(2)} Bs.)
        </Button>
      </div>

      {/* Customer Selector Modal */}
      <Dialog open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle className='flex items-center gap-2'>
          <i className='tabler-user text-primary' />
          Seleccionar Cliente
        </DialogTitle>
        <DialogContent className='pt-4'>
          <CustomTextField
            select
            fullWidth
            label='Cliente Registrado'
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
          >
            {customers.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} ({c.identification})
              </MenuItem>
            ))}
          </CustomTextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerModalOpen(false)}>Cancelar</Button>
          <Button variant='contained' onClick={handleSaveCustomer}>Asignar Cliente</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default POSCart
