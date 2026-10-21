'use client'

import React from 'react'
import CustomChip from '@core/components/mui/Chip'
import { PurchaseStatus } from '@/types/purchasesTypes'

interface Props {
  status: PurchaseStatus
  size?: 'small' | 'medium'
}

const statusConfig: Record<
  PurchaseStatus,
  { label: string; icon: string; color: 'secondary' | 'info' | 'success' | 'primary' | 'error' }
> = {
  DRAFT: {
    label: 'Borrador',
    icon: 'tabler-file-pencil',
    color: 'secondary'
  },
  RFQ_SENT: {
    label: 'Cotización Registrada',
    icon: 'tabler-file-check',
    color: 'info'
  },
  APPROVED: {
    label: 'Presupuesto Aprobado',
    icon: 'tabler-circle-check',
    color: 'success'
  },
  PURCHASE_ORDER: {
    label: 'Orden de Compra',
    icon: 'tabler-shopping-bag-check',
    color: 'primary'
  },
  CANCELED: {
    label: 'Anulada',
    icon: 'tabler-circle-x',
    color: 'error'
  }
}

export const PurchaseStatusChip: React.FC<Props> = ({ status, size = 'small' }) => {
  const config = statusConfig[status] || statusConfig.DRAFT

  return (
    <CustomChip
      size={size}
      variant='tonal'
      color={config.color}
      icon={<i className={`${config.icon} text-sm`} />}
      label={config.label}
    />
  )
}
