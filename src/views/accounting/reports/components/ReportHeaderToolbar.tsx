'use client'

import React from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import type { CurrencyViewMode } from '@/types/accountingTypes'
import { ReportCurrencyToggle } from './ReportCurrencyToggle'

interface Props {
  title: string
  subtitle: string
  currencyMode: CurrencyViewMode
  onCurrencyModeChange: (mode: CurrencyViewMode) => void
  targetMoves: 'POSTED' | 'ALL'
  onTargetMovesChange: (moves: 'POSTED' | 'ALL') => void
  tasaBcv?: number
  onExportExcel: () => void
  onPrintPdf: () => void
  dateFilterSlot?: React.ReactNode
  extraActionsSlot?: React.ReactNode
}

export const ReportHeaderToolbar: React.FC<Props> = ({
  title,
  subtitle,
  currencyMode,
  onCurrencyModeChange,
  targetMoves,
  onTargetMovesChange,
  onExportExcel,
  onPrintPdf,
  dateFilterSlot,
  extraActionsSlot
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Fila Superior: Título + Botones de Exportación */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant='body2' sx={{ color: '#64748B' }}>
            {subtitle}
          </Typography>
        </Box>

        {/* Acciones principales */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant='outlined'
            startIcon={<i className='tabler-file-spreadsheet' />}
            onClick={onExportExcel}
            sx={{
              borderRadius: '9999px',
              borderColor: '#10B981',
              color: '#10B981',
              fontWeight: 600,
              textTransform: 'none',
              px: 2.5,
              py: 0.8,
              '&:hover': {
                borderColor: '#059669',
                backgroundColor: 'rgba(16, 185, 129, 0.06)'
              }
            }}
          >
            Exportar Excel
          </Button>

          <Button
            variant='contained'
            startIcon={<i className='tabler-printer' />}
            onClick={onPrintPdf}
            sx={{
              borderRadius: '9999px',
              backgroundColor: '#6C5CE7',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              py: 0.8,
              boxShadow: '0 4px 12px rgba(108, 92, 231, 0.25)',
              '&:hover': {
                backgroundColor: '#5b4bc4',
                boxShadow: '0 6px 16px rgba(108, 92, 231, 0.35)'
              }
            }}
          >
            Imprimir / PDF
          </Button>
        </Box>
      </Box>

      {/* Barra de Filtros, Selector Bimonetario y Fechas */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          p: 2.5,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E6E4F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
      >
        {/* Conmutador Bimonetario Opcional */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Moneda:
          </Typography>
          <ReportCurrencyToggle mode={currencyMode} onChange={onCurrencyModeChange} />
        </Box>

        {/* Filtros de Asientos y Fechas */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Segmented Control para Asientos Contables */}
          <Box
            sx={{
              display: 'inline-flex',
              p: '3px',
              backgroundColor: '#F1F5F9',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0'
            }}
          >
            <Button
              size='small'
              onClick={() => onTargetMovesChange('POSTED')}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                fontWeight: targetMoves === 'POSTED' ? 700 : 500,
                px: 2,
                py: 0.6,
                fontSize: '0.8125rem',
                backgroundColor: targetMoves === 'POSTED' ? '#FFFFFF' : 'transparent',
                color: targetMoves === 'POSTED' ? '#6C5CE7' : '#64748B',
                boxShadow: targetMoves === 'POSTED' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
                '&:hover': {
                  backgroundColor: targetMoves === 'POSTED' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
                }
              }}
            >
              Solo Confirmados
            </Button>

            <Button
              size='small'
              onClick={() => onTargetMovesChange('ALL')}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                fontWeight: targetMoves === 'ALL' ? 700 : 500,
                px: 2,
                py: 0.6,
                fontSize: '0.8125rem',
                backgroundColor: targetMoves === 'ALL' ? '#FFFFFF' : 'transparent',
                color: targetMoves === 'ALL' ? '#6C5CE7' : '#64748B',
                boxShadow: targetMoves === 'ALL' ? '0 2px 6px rgba(108, 92, 231, 0.12)' : 'none',
                '&:hover': {
                  backgroundColor: targetMoves === 'ALL' ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
                }
              }}
            >
              Todos (Incluye Borradores)
            </Button>
          </Box>

          {/* Slot para Fecha de Corte o Rango de Fechas */}
          {dateFilterSlot}

          {/* Slot para Acciones Adicionales (Expandir/Colapsar, etc.) */}
          {extraActionsSlot}
        </Box>
      </Box>
    </Box>
  )
}
