'use client'

import React from 'react'

import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'

import type { Account } from '@/types/accountingTypes'

interface Props {
  contactType: 'CUSTOMER' | 'SUPPLIER'
  value: string
  onChange: (accountId: string) => void
  accounts: Account[]
  label?: string
  disabled?: boolean
  helperText?: string
  required?: boolean
}

export const ContactAccountingSelector: React.FC<Props> = ({
  contactType,
  value,
  onChange,
  accounts,
  label,
  disabled = false,
  helperText,
  required = false
}) => {
  // Filtrar cuentas relevantes (Activos para clientes CxC, Pasivos para proveedores CxP)
  const filteredAccounts = accounts.filter(acc => {
    if (contactType === 'CUSTOMER') {
      return acc.tipo === 'ASSET_CURRENT' && (acc.nombre.toLowerCase().includes('cobrar') || acc.nombre.toLowerCase().includes('cxc') || acc.permiteConciliacion)
    } else {
      return acc.tipo === 'LIABILITY_CURRENT' && (acc.nombre.toLowerCase().includes('pagar') || acc.nombre.toLowerCase().includes('cxp') || acc.permiteConciliacion)
    }
  })

  // Si no hay específicas, mostrar cuentas con conciliación habilitada del tipo correspondiente
  const displayAccounts = filteredAccounts.length > 0
    ? filteredAccounts
    : accounts.filter(a => contactType === 'CUSTOMER' ? a.tipo.startsWith('ASSET') : a.tipo.startsWith('LIABILITY'))

  const defaultLabel = contactType === 'CUSTOMER' ? 'Cuenta por Cobrar (CxC)' : 'Cuenta por Pagar (CxP)'

  return (
    <TextField
      select
      fullWidth
      size='small'
      label={label || defaultLabel}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      helperText={helperText || (contactType === 'CUSTOMER' ? 'Cuenta contable para registrar derechos de cobro' : 'Cuenta contable para registrar obligaciones con el proveedor')}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          backgroundColor: '#FAFAFC'
        }
      }}
    >
      {displayAccounts.map(acc => (
        <MenuItem key={acc.id} value={acc.id}>
          <Box className='flex items-center justify-between w-full gap-2'>
            <div className='flex items-center gap-2'>
              <span className='font-mono font-bold text-xs text-[#6C5CE7]'>{acc.codigo}</span>
              <span className='text-sm text-[#1E1B2E]'>{acc.nombre}</span>
            </div>
            <Chip
              size='small'
              label={acc.moneda}
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '9999px',
                backgroundColor: acc.moneda === 'USD' ? '#F0EEF9' : '#E0F2FE',
                color: acc.moneda === 'USD' ? '#6C5CE7' : '#0284C7'
              }}
            />
          </Box>
        </MenuItem>
      ))}
    </TextField>
  )
}
