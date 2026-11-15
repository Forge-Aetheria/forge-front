'use client'

import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'

import { useBcvRateInfo } from '@/hooks/useBcvRate'

export const HeaderBcvBadge = () => {
  const { rate, isLoading, isFallback, isMissing, source } = useBcvRateInfo()

  const hasRate = rate > 0
  const label = hasRate ? `BCV: ${rate.toFixed(2)} Bs/$` : 'BCV: —'

  const tooltip = isMissing
    ? 'No hay una tasa BCV configurada. Configúrela en Ajustes.'
    : isFallback
      ? `Tasa BCV oficial no disponible. Usando tasa configurada (${source}).`
      : 'Tasa oficial Banco Central de Venezuela (BCV)'

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        size="small"
        icon={<i className="tabler-building-bank text-xs text-[#6C5CE7]" />}
        label={isLoading ? 'BCV: …' : label}
        sx={{
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.75rem',
          backgroundColor: isMissing ? '#FEF2F2' : isFallback ? '#FFFBEB' : '#F3F0FF',
          color: isMissing ? '#B91C1C' : isFallback ? '#B45309' : '#6C5CE7',
          border: `1px solid ${isMissing ? '#FECACA' : isFallback ? '#FDE68A' : '#E9D5FF'}`,
          cursor: 'default',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: isMissing ? '#FEE2E2' : isFallback ? '#FEF3C7' : '#EBE5FF',
            borderColor: isMissing ? '#FCA5A5' : isFallback ? '#FCD34D' : '#6C5CE7'
          }
        }}
      />
    </Tooltip>
  )
}

export default HeaderBcvBadge
