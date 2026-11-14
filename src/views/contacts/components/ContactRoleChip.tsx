import React from 'react';

import Tooltip from '@mui/material/Tooltip';

import CustomChip from '@core/components/mui/Chip';
import type { ContactRole } from '@/types/contactsTypes';

interface Props {
  rol: ContactRole;
  isPrincipal?: boolean;
}

const roleLabels: Record<ContactRole, string> = {
  REPRESENTANTE_LEGAL: 'Rep. Legal',
  PAGOS_RETENCIONES: 'Pagos / Retenciones',
  COMPRAS: 'Compras',
  VENTAS: 'Ventas',
  OPERATIVO: 'Operativo',
  ADMINISTRATIVO: 'Administrativo'
};

export const ContactRoleChip: React.FC<Props> = ({ rol, isPrincipal }) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isPrincipal && (
        <Tooltip title="Contacto Principal">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] border border-[#D8B4FE]">
            <i className="tabler-star text-xs text-[#6C5CE7]" />
          </span>
        </Tooltip>
      )}
      <CustomChip
        size="small"
        variant="tonal"
        color={rol === 'REPRESENTANTE_LEGAL' ? 'primary' : 'secondary'}
        label={roleLabels[rol] || rol}
      />
    </div>
  );
};
