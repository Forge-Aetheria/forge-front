'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import type { CurrencyViewMode } from '@/types/accountingTypes'

interface Props {
  mode: CurrencyViewMode
  onChange: (mode: CurrencyViewMode) => void
}

export const ReportCurrencyToggle: React.FC<Props> = ({ mode, onChange }) => {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        p: 0.5,
        backgroundColor: '#F1F5F9',
        borderRadius: '9999px',
        border: '1px solid #E2E8F0'
      }}
    >
      <Button
        size='small'
        onClick={() => onChange('VES')}
        sx={{
          borderRadius: '9999px',
          textTransform: 'none',
          fontWeight: mode === 'VES' ? 700 : 500,
          px: 2.5,
          py: 0.7,
          fontSize: '0.82rem',
          backgroundColor: mode === 'VES' ? '#FFFFFF' : 'transparent',
          color: mode === 'VES' ? '#1E293B' : '#64748B',
          boxShadow: mode === 'VES' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          '&:hover': {
            backgroundColor: mode === 'VES' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
          }
        }}
      >
        Moneda Legal (VES)
      </Button>

      <Button
        size='small'
        onClick={() => onChange('USD')}
        sx={{
          borderRadius: '9999px',
          textTransform: 'none',
          fontWeight: mode === 'USD' ? 700 : 500,
          px: 2.5,
          py: 0.7,
          fontSize: '0.82rem',
          backgroundColor: mode === 'USD' ? '#FFFFFF' : 'transparent',
          color: mode === 'USD' ? '#1E293B' : '#64748B',
          boxShadow: mode === 'USD' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          '&:hover': {
            backgroundColor: mode === 'USD' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
          }
        }}
      >
        Moneda Dura (USD)
      </Button>

      <Button
        size='small'
        onClick={() => onChange('DUAL')}
        sx={{
          borderRadius: '9999px',
          textTransform: 'none',
          fontWeight: mode === 'DUAL' ? 700 : 500,
          px: 2.5,
          py: 0.7,
          fontSize: '0.82rem',
          backgroundColor: mode === 'DUAL' ? '#FFFFFF' : 'transparent',
          color: mode === 'DUAL' ? '#1E293B' : '#64748B',
          boxShadow: mode === 'DUAL' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
          '&:hover': {
            backgroundColor: mode === 'DUAL' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'
          }
        }}
      >
        Vista Dual (VES + USD)
      </Button>
    </Box>
  )
}
