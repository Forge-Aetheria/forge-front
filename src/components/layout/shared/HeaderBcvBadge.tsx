'use client'

import { useEffect, useState } from 'react'

import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'

import { getActiveBcvRate } from '@/services/inventoryService'

export const HeaderBcvBadge = () => {
  const [rate, setRate] = useState<number>(36.5)

  useEffect(() => {
    try {
      const active = getActiveBcvRate()

      if (active && active > 0) {
        setRate(active)
      }
    } catch {
      // Fallback a tasa base
    }
  }, [])

  return (
    <Tooltip title="Tasa oficial Banco Central de Venezuela (BCV)" arrow>
      <Chip
        size="small"
        icon={<i className="tabler-building-bank text-xs text-[#6C5CE7]" />}
        label={`BCV: ${rate.toFixed(2)} Bs/$`}
        sx={{
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.75rem',
          backgroundColor: '#F3F0FF',
          color: '#6C5CE7',
          border: '1px solid #E9D5FF',
          cursor: 'default',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: '#EBE5FF',
            borderColor: '#6C5CE7'
          }
        }}
      />
    </Tooltip>
  )
}

export default HeaderBcvBadge
