'use client'

import React, { useState, useEffect } from 'react'

import CircularProgress from '@mui/material/CircularProgress'

import Chip from '@mui/material/Chip'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import type { SupplierLookup } from '@/types/purchasesTypes'
import { purchasesService } from '@/services/purchasesService'

interface Props {
  value: SupplierLookup | null
  onChange: (supplier: SupplierLookup | null) => void
  error?: boolean
  helperText?: string
  disabled?: boolean
}

export const SupplierAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  error = false,
  helperText,
  disabled = false
}) => {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<SupplierLookup[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Búsqueda predictiva debounced (300ms) por RIF/Cédula o Razón Social (EARS-EV-01)
  useEffect(() => {
    let active = true

    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const results = await purchasesService.searchSuppliers(searchTerm)

        if (active) {
          setOptions(results)
        }
      } catch (err) {
        console.error('Error searching suppliers:', err)
      } finally {
        if (active) setLoading(false)
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchTerm])

  return (
    <CustomAutocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disabled={disabled}
      isOptionEqualToValue={(option: SupplierLookup, val: SupplierLookup) => option.id === val.id}
      getOptionLabel={(option: SupplierLookup) =>
        `${option.identificacion} — ${option.razon_social}${
          option.nombre_comercial ? ` (${option.nombre_comercial})` : ''
        }`
      }
      options={options}
      loading={loading}
      value={value}
      onChange={(_event: any, newValue: SupplierLookup | null) => {
        onChange(newValue || null)
      }}
      onInputChange={(_event: any, newInputValue: string) => {
        setSearchTerm(newInputValue)
      }}
      renderOption={(props: any, option: SupplierLookup) => (
        <li
          {...props}
          key={option.id}
          className='p-3 border-b border-[#F4F3F8] last:border-none hover:bg-[#F0EEF9] cursor-pointer'
        >
          <div className='flex flex-col gap-1 w-full'>
            <div className='flex items-center justify-between gap-2'>
              <span className='font-semibold text-sm text-[#1E1B2E]'>{option.razon_social}</span>
              <Chip
                label={option.identificacion}
                size='small'
                sx={{
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  backgroundColor: '#F4F3F8',
                  color: '#6C5CE7',
                  border: '1px solid #DCD8EC'
                }}
              />
            </div>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]'>
              <span>{option.nombre_comercial ? `Comercial: ${option.nombre_comercial}` : option.email}</span>
              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#10B981] font-semibold text-[11px]'>
                <i className='tabler-credit-card text-xs' />
                {option.condicion_pago_default === 'CREDITO'
                  ? `Crédito ${option.dias_credito_default} días`
                  : 'Contado'}
              </span>
            </div>
          </div>
        </li>
      )}
      renderInput={(params: any) => (
        <CustomTextField
          {...params}
          label='Proveedor / Razón Social *'
          placeholder='Buscar por RIF (J-...), Cédula o Razón Social...'
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color='inherit' size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  )
}
