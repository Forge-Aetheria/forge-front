'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { TerceroEntity } from '@/types/contactsTypes';
import { ContactRoleChip } from './ContactRoleChip';

interface CardProps {
  tercero: TerceroEntity;
  onView?: (t: TerceroEntity) => void;
  onEdit?: (t: TerceroEntity) => void;
  onDeactivate: (id: string) => void;
  readOnly?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpenContacts?: (target: HTMLElement, company: TerceroEntity) => void;
}

export const ContactCard: React.FC<CardProps> = ({
  tercero,
  onView,
  onEdit,
  onDeactivate,
  readOnly,
  selected = false,
  onToggleSelect,
  onOpenContacts
}) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleView = (t: TerceroEntity) => {
    if (onView) onView(t);
    else if (onEdit) onEdit(t);
  };

  return (
    <Card
      onClick={() => handleView(tercero)}
      sx={{
        p: 2.5,
        borderRadius: '20px',
        border: selected ? '1.5px solid #6C5CE7' : '1px solid #E6E4F0',
        backgroundColor: selected ? '#F8F7FC' : '#FFFFFF',
        boxShadow: selected ? '0 6px 20px 0 rgba(108, 92, 231, 0.12)' : '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: '#6C5CE7',
          boxShadow: '0 6px 20px 0 rgba(108, 92, 231, 0.12)'
        }
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {!readOnly && onToggleSelect && (
            <div onClick={e => e.stopPropagation()}>
              <Checkbox
                checked={selected}
                onChange={() => onToggleSelect(tercero.id)}
                size="small"
                sx={{ p: 0.5, color: '#6C5CE7', '&.Mui-checked': { color: '#6C5CE7' } }}
              />
            </div>
          )}
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: tercero.parent_company_name ? '#F3F0FF' : tercero.tipo === 'EMPRESA' ? '#F3F0FF' : '#F0FDF4',
              color: tercero.parent_company_name ? '#6C5CE7' : tercero.tipo === 'EMPRESA' ? '#6C5CE7' : '#16A34A',
              border: tercero.parent_company_name ? '1px solid #E9D5FF' : tercero.tipo === 'EMPRESA' ? '1px solid #E9D5FF' : '1px solid #BBF7D0'
            }}
          >
            <i className={tercero.parent_company_name ? 'tabler-user text-xl' : tercero.tipo === 'EMPRESA' ? 'tabler-building text-xl' : 'tabler-user text-xl'} />
          </Avatar>
          <div>
            <Typography variant="body1" className="font-bold text-sm text-[#1E1B2E] line-clamp-1">
              {tercero.nombre_razon_social}
            </Typography>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className="font-mono font-medium text-[#6C5CE7]">{tercero.identificacion}</span>
              {tercero.nombre_comercial && (
                <span className="text-gray-400 truncate max-w-[150px]">· {tercero.nombre_comercial}</span>
              )}
            </div>
          </div>
        </div>

        {!readOnly && (
          <div onClick={e => e.stopPropagation()}>
            <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
              <i className="tabler-dots-vertical text-lg text-[#6B7280]" />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  router.push(`/contacts/${tercero.parent_company_id || tercero.id}`);
                }}
              >
                <i className="tabler-arrow-up-right text-sm mr-2 text-[#6C5CE7]" /> Ficha Completa
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  handleView(tercero);
                }}
              >
                <i className="tabler-eye text-sm mr-2 text-[#6C5CE7]" /> Vista Rápida
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  onDeactivate(tercero.id);
                }}
                sx={{ color: '#EF4444' }}
              >
                <i className="tabler-trash text-sm mr-2" /> Desactivar
              </MenuItem>
            </Menu>
          </div>
        )}
      </div>

      {/* Badges de Clasificación */}
      {tercero.contact_person_ref ? (
        <div className="my-2 flex flex-col gap-1.5">
          <div className="flex items-center">
            <ContactRoleChip
              rol={tercero.contact_person_ref.rol}
              isPrincipal={tercero.contact_person_ref.is_principal}
            />
          </div>
          {tercero.parent_company_name && (
            <div className="flex items-center gap-1.5 text-xs text-[#6C5CE7] bg-[#F3F0FF] border border-[#E9D5FF] px-2.5 py-1 rounded-xl font-medium">
              <i className="tabler-building text-sm shrink-0" />
              <span className="truncate">
                Empresa: <strong>{tercero.parent_company_name}</strong>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 my-2">
          {tercero.is_cliente && (
            <Chip
              size="small"
              label="Cliente"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 600,
                borderRadius: '9999px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0'
              }}
            />
          )}
        {tercero.is_proveedor && (
          <Chip
            size="small"
            label="Proveedor"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 600,
              borderRadius: '9999px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE'
            }}
          />
        )}
        {tercero.is_contacto && !tercero.is_cliente && !tercero.is_proveedor && (
          <Chip
            size="small"
            label="Contacto"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 500,
              borderRadius: '9999px',
              backgroundColor: '#F3F4F6',
              color: '#4B5563'
            }}
          />
        )}
      </div>
    )}

      {/* Info de contacto y ubicación */}
      <div className="space-y-1.5 py-2 border-y border-[#F4F3F8] my-2 text-xs">
        <div className="flex items-center gap-2 text-[#1E1B2E]">
          <i className="tabler-map-pin text-sm text-[#6C5CE7] shrink-0" />
          <span className="truncate">
            {tercero.ciudad || 'No especificada'}{tercero.estado ? `, ${tercero.estado}` : ''} ({tercero.pais || 'VE'})
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 text-[#1E1B2E]">
          <div className="flex items-center gap-2 min-w-0">
            <i className="tabler-phone text-sm text-[#6C5CE7] shrink-0" />
            <a
              href={`tel:${tercero.telefono_principal}`}
              onClick={e => e.stopPropagation()}
              className="text-[#6C5CE7] hover:underline truncate"
            >
              {tercero.telefono_principal || 'Sin teléfono'}
            </a>
          </div>
          {tercero.telefono_principal && (
            <Tooltip title={copiedKey === 'phone' ? '¡Copiado!' : 'Copiar teléfono'}>
              <IconButton
                size="small"
                onClick={e => handleCopy(e, tercero.telefono_principal, 'phone')}
                sx={{ p: 0.2, color: copiedKey === 'phone' ? '#10B981' : '#9CA3AF', '&:hover': { color: '#6C5CE7' } }}
              >
                <i className={copiedKey === 'phone' ? 'tabler-check text-xs' : 'tabler-copy text-xs'} />
              </IconButton>
            </Tooltip>
          )}
        </div>
        {tercero.email_principal && (
          <div className="flex items-center justify-between gap-1 text-[#1E1B2E]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <i className="tabler-mail text-sm text-[#6C5CE7] shrink-0" />
              <a
                href={`mailto:${tercero.email_principal}`}
                onClick={e => e.stopPropagation()}
                className="text-[#6C5CE7] hover:underline truncate"
              >
                {tercero.email_principal}
              </a>
            </div>
            <Tooltip title={copiedKey === 'email' ? '¡Copiado!' : 'Copiar correo'}>
              <IconButton
                size="small"
                onClick={e => handleCopy(e, tercero.email_principal, 'email')}
                sx={{ p: 0.2, color: copiedKey === 'email' ? '#10B981' : '#9CA3AF', '&:hover': { color: '#6C5CE7' } }}
              >
                <i className={copiedKey === 'email' ? 'tabler-check text-xs' : 'tabler-copy text-xs'} />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Resumen de referentes */}
      {tercero.tipo === 'EMPRESA' && !tercero.parent_company_name && (
        <div className="pt-1">
          {tercero.contactos_referentes && tercero.contactos_referentes.length > 0 ? (
            <div
              onClick={e => {
                e.stopPropagation();
                onOpenContacts?.(e.currentTarget, tercero);
              }}
              className="flex items-center justify-between text-xs font-medium text-[#6C5CE7] bg-[#F3F0FF] hover:bg-[#E9D5FF] px-2.5 py-1.5 rounded-xl border border-[#E9D5FF] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <i className="tabler-users text-sm shrink-0" />
                <span className="truncate">
                  {tercero.contactos_referentes.length}{' '}
                  {tercero.contactos_referentes.length === 1 ? 'persona de contacto' : 'personas de contacto'}
                </span>
              </div>
              <span className="flex items-center gap-0.5 text-[11px] font-semibold shrink-0 ml-1">
                <span>Ver</span>
                <i className="tabler-chevron-right text-xs" />
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-[#9CA3AF] italic">
              Sin personas de contacto
            </div>
          )}

          {tercero.direcciones_adicionales && tercero.direcciones_adicionales.length > 0 && (
            <div className="text-[11px] text-[#6B7280] pt-1.5 flex items-center gap-1">
              <i className="tabler-map-pins text-xs text-[#6C5CE7]" />
              <span>{tercero.direcciones_adicionales.length} direcciones adicionales</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
