'use client';

import React from 'react';

import CustomChip from '@core/components/mui/Chip';
import type { QuoteStatus } from '@/types/salesQuotesTypes';

interface Props {
  status: QuoteStatus;
  size?: 'small' | 'medium';
}

const statusConfig: Record<
  QuoteStatus,
  { label: string; icon: string; color: 'secondary' | 'info' | 'success' | 'warning' | 'error' }
> = {
  DRAFT: {
    label: 'Borrador',
    icon: 'tabler-file-pencil',
    color: 'secondary'
  },
  ISSUED: {
    label: 'Emitida',
    icon: 'tabler-send',
    color: 'info'
  },
  APPROVED: {
    label: 'Aprobada',
    icon: 'tabler-circle-check',
    color: 'success'
  },
  EXPIRED: {
    label: 'Vencida',
    icon: 'tabler-clock-exclamation',
    color: 'warning'
  },
  CANCELED: {
    label: 'Anulada',
    icon: 'tabler-circle-x',
    color: 'error'
  }
};

export const QuoteStatusChip: React.FC<Props> = ({ status, size = 'small' }) => {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <CustomChip
      size={size}
      variant='tonal'
      color={config.color}
      icon={<i className={`${config.icon} text-sm`} />}
      label={config.label}
    />
  );
};
