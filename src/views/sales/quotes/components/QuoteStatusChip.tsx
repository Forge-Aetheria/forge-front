'use client';

import React from 'react';
import Chip from '@mui/material/Chip';
import { QuoteStatus } from '@/types/salesQuotesTypes';

interface Props {
  status: QuoteStatus;
  size?: 'small' | 'medium';
}

const statusConfig: Record<
  QuoteStatus,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  DRAFT: {
    label: 'Borrador',
    icon: 'tabler-file-pencil',
    color: '#6B7280',
    bg: '#F4F3F8',
    border: '#E6E4F0'
  },
  ISSUED: {
    label: 'Emitida',
    icon: 'tabler-send',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)'
  },
  APPROVED: {
    label: 'Aprobada',
    icon: 'tabler-circle-check',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  EXPIRED: {
    label: 'Vencida',
    icon: 'tabler-clock-exclamation',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  CANCELED: {
    label: 'Anulada',
    icon: 'tabler-circle-x',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)'
  }
};

export const QuoteStatusChip: React.FC<Props> = ({ status, size = 'small' }) => {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <Chip
      size={size}
      icon={<i className={`${config.icon} text-sm`} style={{ color: config.color }} />}
      label={config.label}
      sx={{
        borderRadius: '9999px',
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.85rem',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        px: 1,
        '& .MuiChip-icon': {
          marginLeft: '4px',
          marginRight: '-2px'
        }
      }}
    />
  );
};
