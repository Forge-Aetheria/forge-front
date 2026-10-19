'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Popover from '@mui/material/Popover';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { TerceroEntity, ContactPerson } from '@/types/contactsTypes';
import { ContactRoleChip } from './ContactRoleChip';

interface Props {
  open: boolean;
  anchorEl: HTMLElement | null;
  company: TerceroEntity | null;
  onClose: () => void;
}

export const CompanyContactsPopoverSheet: React.FC<Props> = ({
  open,
  anchorEl,
  company,
  onClose
}) => {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width:768px)');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!company || !company.contactos_referentes) return null;

  const allContacts = company.contactos_referentes;
  const sortedContacts = [...allContacts].sort((a, b) => (b.is_principal ? 1 : 0) - (a.is_principal ? 1 : 0));
  const displayedContacts = sortedContacts.slice(0, 2);
  const remainingCount = sortedContacts.length - displayedContacts.length;

  const handleCopy = (text: string, label: string = 'Texto') => {
    navigator.clipboard.writeText(text);
    setCopiedText(`${label} copiado`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Contenido de la lista de personas de contacto
  const renderContactsList = () => (
    <div className="flex flex-col gap-3">
      {displayedContacts.length === 0 ? (
        <div className="p-4 text-center text-xs text-[#6B7280] bg-[#F8F7FC] rounded-xl border border-dashed border-[#E6E4F0]">
          Sin personas de contacto registradas para esta empresa.
        </div>
      ) : (
        displayedContacts.map(person => (
          <div
            key={person.id}
            className="p-3 bg-white rounded-xl border border-[#E6E4F0] hover:border-[#6C5CE7] transition-all flex flex-col gap-2.5 shadow-sm"
          >
            {/* Cabecera del Contacto con Avatar e Identidad */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    bgcolor: '#F3F0FF',
                    color: '#6C5CE7',
                    border: '1.5px solid #E9D5FF'
                  }}
                >
                  {getInitials(person.nombre)}
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-[#1E1B2E] truncate">
                      {person.nombre}
                    </span>
                    <ContactRoleChip rol={person.rol} isPrincipal={person.is_principal} />
                  </div>
                  <span className="text-[11px] text-[#6B7280] block truncate">
                    {person.cargo || 'Contacto'} {person.cedula_identidad ? `· C.I. ${person.cedula_identidad}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones Táctiles Directas (Llamar, Correo, Copiar) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#F4F3F8]">
              {/* Teléfono */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <i className="tabler-phone text-xs text-[#6C5CE7]" />
                  <a
                    href={`tel:${person.telefono}`}
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#6C5CE7] hover:underline"
                  >
                    <span>{person.telefono}</span>
                  </a>
                  <Tooltip title="Copiar teléfono">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(person.telefono, 'Teléfono')}
                      sx={{ p: 0.25, color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                    >
                      <i className="tabler-copy text-xs" />
                    </IconButton>
                  </Tooltip>
                </div>

                <Button
                  size="small"
                  variant="contained"
                  component="a"
                  href={`tel:${person.telefono}`}
                  startIcon={<i className="tabler-phone-call text-xs" />}
                  sx={{
                    borderRadius: '9999px',
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    py: 0.25,
                    px: 1.5,
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#059669', boxShadow: 'none' }
                  }}
                >
                  Llamar
                </Button>
              </div>

              {/* Correo Electrónico con botón de Copiar */}
              {person.email && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <i className="tabler-mail text-xs text-[#6C5CE7]" />
                    <a
                      href={`mailto:${person.email}`}
                      className="text-xs text-[#4B5563] hover:underline truncate"
                    >
                      {person.email}
                    </a>
                    <Tooltip title="Copiar correo">
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(person.email, 'Correo')}
                        sx={{ p: 0.25, color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                      >
                        <i className="tabler-copy text-xs" />
                      </IconButton>
                    </Tooltip>
                  </div>

                  <Button
                    size="small"
                    variant="outlined"
                    component="a"
                    href={`mailto:${person.email}`}
                    startIcon={<i className="tabler-mail text-xs" />}
                    sx={{
                      borderRadius: '9999px',
                      textTransform: 'none',
                      fontSize: '0.72rem',
                      py: 0.25,
                      px: 1.5,
                      borderColor: '#E6E4F0',
                      color: '#1E1B2E',
                      '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#F8F7FC' }
                    }}
                  >
                    Correo
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Botón para ver restantes en Ficha Completa si tiene más de 2 contactos */}
      {remainingCount > 0 && (
        <div className="pt-2 border-t border-[#F4F3F8]">
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              onClose();
              router.push(`/contacts/${company.id}`);
            }}
            endIcon={<i className="tabler-arrow-up-right text-sm" />}
            sx={{
              borderRadius: '9999px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.78rem',
              borderColor: '#E6E4F0',
              color: '#6C5CE7',
              py: 0.8,
              backgroundColor: '#F8F7FC',
              '&:hover': {
                borderColor: '#6C5CE7',
                backgroundColor: '#F3F0FF'
              }
            }}
          >
            Ver los {remainingCount} contactos restantes en Ficha Completa
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isDesktop ? (
        /* Versión Desktop: Popover Anclado a la Celda */
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={onClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '20px',
                p: 2.5,
                width: 390,
                maxHeight: 460,
                overflowY: 'auto',
                boxShadow: '0 12px 32px rgba(108, 92, 231, 0.15)',
                border: '1px solid #E6E4F0',
                backgroundColor: '#FFFFFF'
              }
            }
          }}
        >
          {/* Header del Popover */}
          <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-[#F4F3F8]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <i className="tabler-users text-[#6C5CE7] text-base" />
                <Typography variant="subtitle2" className="font-bold text-[#1E1B2E]">
                  Personas de Contacto ({allContacts.length})
                </Typography>
              </div>
              <Typography variant="caption" className="text-[#6B7280] truncate block mt-0.5">
                {company.nombre_razon_social} · {company.identificacion}
              </Typography>
            </div>
            <IconButton size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
              <i className="tabler-x text-base" />
            </IconButton>
          </div>

          {renderContactsList()}
        </Popover>
      ) : (
        /* Versión Móvil: Bottom Sheet Deslizante desde Abajo */
        <Drawer
          anchor="bottom"
          open={open}
          onClose={onClose}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                p: 3,
                maxHeight: '82vh',
                overflowY: 'auto',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.12)'
              }
            }
          }}
        >
          {/* Tirador táctil para deslizar */}
          <div className="w-12 h-1 bg-[#E6E4F0] rounded-full mx-auto mb-3" />

          {/* Header del Bottom Sheet */}
          <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-[#F4F3F8]">
            <div className="min-w-0">
              <Typography variant="h6" className="font-bold text-[#1E1B2E] text-base">
                Personas de Contacto ({allContacts.length})
              </Typography>
              <Typography variant="caption" className="text-[#6B7280] truncate block mt-0.5">
                {company.nombre_razon_social}
              </Typography>
            </div>
            <IconButton size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
              <i className="tabler-x text-lg" />
            </IconButton>
          </div>

          {renderContactsList()}
        </Drawer>
      )}

      {/* Toast Feedback de Copiado */}
      <Snackbar
        open={Boolean(copiedText)}
        autoHideDuration={2000}
        onClose={() => setCopiedText(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" sx={{ borderRadius: '12px', bgcolor: '#6C5CE7' }}>
          ¡Copiado al portapapeles: {copiedText}!
        </Alert>
      </Snackbar>
    </>
  );
};

export default CompanyContactsPopoverSheet;
