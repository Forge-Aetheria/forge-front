'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import type { CurrencyViewMode } from '@/types/accountingTypes'

interface Props {
  mode: CurrencyViewMode
  onChange: (mode: CurrencyViewMode) => void
}

export const ReportCurrencyToggle: React.FC<Props> = ({ mode, onChange }) => {
  const handleSelect = (newMode: CurrencyViewMode) => {
    onChange(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('forge_accounting_currency_mode', newMode)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          display: 'inline-flex',
          p: '3px',
          backgroundColor: '#F1F5F9',
          borderRadius: '9999px',
          border: '1px solid #E2E8F0'
        }}
      >
        <Tooltip title='Ver cifras únicamente en Bolívares a la tasa oficial BCV' arrow>
          <Button
            size='small'
            onClick={() => handleSelect('VES')}
            startIcon={<i className='tabler-coin' style={{ fontSize: 16 }} />}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: mode === 'VES' ? 700 : 500,
              px: 2,
              py: 0.6,
              fontSize: '0.8125rem',
              backgroundColor: mode === 'VES' ? '#FFFFFF' : 'transparent',
              color: mode === 'VES' ? '#6C5CE7' : '#64748B',
              boxShadow: mode === 'VES' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
              '&:hover': {
                backgroundColor: mode === 'VES' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
              }
            }}
          >
            Solo Bolívares (Bs.)
          </Button>
        </Tooltip>

        <Tooltip title='Ver cifras únicamente en Dólares estadounidenses' arrow>
          <Button
            size='small'
            onClick={() => handleSelect('USD')}
            startIcon={<i className='tabler-currency-dollar' style={{ fontSize: 16 }} />}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: mode === 'USD' ? 700 : 500,
              px: 2,
              py: 0.6,
              fontSize: '0.8125rem',
              backgroundColor: mode === 'USD' ? '#FFFFFF' : 'transparent',
              color: mode === 'USD' ? '#6C5CE7' : '#64748B',
              boxShadow: mode === 'USD' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
              '&:hover': {
                backgroundColor: mode === 'USD' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
              }
            }}
          >
            Solo Dólares ($)
          </Button>
        </Tooltip>

        <Tooltip title='Vista opcional bimonetaria: columnas en USD y VES en paralelo' arrow>
          <Button
            size='small'
            onClick={() => handleSelect('DUAL')}
            startIcon={<i className='tabler-columns-2' style={{ fontSize: 16 }} />}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: mode === 'DUAL' ? 700 : 500,
              px: 2,
              py: 0.6,
              fontSize: '0.8125rem',
              backgroundColor: mode === 'DUAL' ? '#FFFFFF' : 'transparent',
              color: mode === 'DUAL' ? '#6C5CE7' : '#64748B',
              boxShadow: mode === 'DUAL' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
              '&:hover': {
                backgroundColor: mode === 'DUAL' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
              }
            }}
          >
            Vista Dual (USD + Bs.)
          </Button>
        </Tooltip>
      </Box>
    </Box>
  )
}
