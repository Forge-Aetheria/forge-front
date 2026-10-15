import React from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { ContactRole } from '@/types/contactsTypes';

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
      <Chip
        size="small"
        label={roleLabels[rol] || rol}
        sx={{
          borderRadius: '9999px',
          fontWeight: 500,
          fontSize: '0.72rem',
          backgroundColor:
            rol === 'REPRESENTANTE_LEGAL' ? 'rgba(108, 92, 231, 0.12)' : 'rgba(30, 27, 46, 0.06)',
          color: rol === 'REPRESENTANTE_LEGAL' ? '#6C5CE7' : '#1E1B2E',
          border: '1px solid rgba(230, 228, 240, 0.8)'
        }}
      />
    </div>
  );
};
