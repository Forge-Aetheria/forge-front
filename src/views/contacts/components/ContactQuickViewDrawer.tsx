'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CustomChip from '@core/components/mui/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { TerceroEntity } from '@/types/contactsTypes';
import { ContactRoleChip } from './ContactRoleChip';

interface Props {
  open: boolean;
  onClose: () => void;
  contact: TerceroEntity | null;
  initialExpandedContactId?: string | null;
}

export const ContactQuickViewDrawer: React.FC<Props> = ({
  open,
  onClose,
  contact,
  initialExpandedContactId
}) => {
  const router = useRouter();
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

  useEffect(() => {
    if (initialExpandedContactId) {
      setExpandedContactId(initialExpandedContactId);
    }
  }, [initialExpandedContactId, open]);

  if (!contact) return null;

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMessage(`¡${label} copiado al portapapeles!`);
    setTimeout(() => setCopiedMessage(null), 2500);
  };

  const handleCopyRIF = () => {
    handleCopy(contact.identificacion, 'Identificación');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'w-[90vw] sm:w-[540px] md:w-[600px] p-6 flex flex-col justify-between overflow-y-auto bg-white'
        }
      }}
    >
      <div className="flex flex-col gap-6">
        {/* 1. Header con Avatar, Título y Acciones */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: contact.tipo === 'EMPRESA' ? '#F3F0FF' : '#F0FDF4',
                color: contact.tipo === 'EMPRESA' ? '#6C5CE7' : '#16A34A',
                border: contact.tipo === 'EMPRESA' ? '1.5px solid #E9D5FF' : '1.5px solid #BBF7D0'
              }}
            >
              <i className={contact.tipo === 'EMPRESA' ? 'tabler-building text-2xl' : 'tabler-user text-2xl'} />
            </Avatar>
            <div>
              <Typography variant="h5" className="font-bold text-[#1E1B2E] leading-tight">
                {contact.nombre_razon_social}
              </Typography>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-1 flex-wrap">
                <div className="flex items-center gap-1 bg-[#F8F7FC] px-2 py-0.5 rounded border border-[#E6E4F0]">
                  <span className="font-mono font-bold text-[#6C5CE7]">{contact.identificacion}</span>
                  <Tooltip title="Copiar Identificación">
                    <IconButton size="small" onClick={handleCopyRIF} sx={{ p: 0.2 }}>
                      <i className="tabler-copy text-xs text-[#6B7280]" />
                    </IconButton>
                  </Tooltip>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                  {contact.tipo === 'EMPRESA' ? 'Empresa Jurídica' : 'Persona Natural'}
                </span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${contact.origen === 'EXTRANJERO' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'}`}>
                  <i className={contact.origen === 'EXTRANJERO' ? 'tabler-world text-[11px]' : 'tabler-flag text-[11px]'} />
                  {contact.origen === 'EXTRANJERO' ? 'Extranjero' : 'Nacional'}
                </span>
                {contact.codigo && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-700">
                    Cód: {contact.codigo}
                  </span>
                )}
                {contact.nombre_comercial && (
                  <span className="text-gray-400">· {contact.nombre_comercial}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Tooltip title="Abrir en pantalla completa">
              <IconButton
                size="small"
                onClick={() => {
                  onClose();
                  router.push(`/contacts/${contact.id}`);
                }}
                sx={{ color: '#6C5CE7' }}
              >
                <i className="tabler-maximize text-lg" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
              <i className="tabler-x text-xl" />
            </IconButton>
          </div>
        </div>

        {/* 2. Badges de Clasificación Comercial */}
        <div className="flex flex-wrap items-center gap-1.5 -mt-2">
          {contact.is_cliente && (
            <CustomChip
              size="small"
              label="Cliente"
              variant="tonal"
              color="success"
            />
          )}
          {contact.is_proveedor && (
            <CustomChip
              size="small"
              label="Proveedor"
              variant="tonal"
              color="info"
            />
          )}
          {contact.is_contacto && !contact.is_cliente && !contact.is_proveedor && (
            <CustomChip
              size="small"
              label="Contacto"
              variant="tonal"
              color="secondary"
            />
          )}
        </div>

        <Divider />

        {/* 3. Datos de Contacto Directo */}
        <div className="space-y-3">
          <Typography variant="caption" className="font-bold text-[#6B7280] uppercase tracking-wider block">
            Contacto Directo
          </Typography>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-[#F8F7FC] rounded-xl border border-[#E6E4F0] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#6C5CE7] shrink-0">
                  <i className="tabler-phone text-base" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-[#6B7280] block">Teléfono Principal</span>
                  {contact.telefono_principal ? (
                    <a href={`tel:${contact.telefono_principal}`} className="font-medium text-[#6C5CE7] hover:underline truncate block">
                      {contact.telefono_principal}
                    </a>
                  ) : (
                    <span className="text-[#9CA3AF]">Sin registrar</span>
                  )}
                </div>
              </div>
              {contact.telefono_principal && (
                <Tooltip title="Copiar teléfono">
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(contact.telefono_principal, 'Teléfono')}
                    sx={{ p: 0.3, color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                  >
                    <i className="tabler-copy text-sm" />
                  </IconButton>
                </Tooltip>
              )}
            </div>

            <div className="p-3 bg-[#F8F7FC] rounded-xl border border-[#E6E4F0] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center text-[#6C5CE7] shrink-0">
                  <i className="tabler-mail text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-[#6B7280] block">Correo Electrónico</span>
                  {contact.email_principal ? (
                    <a href={`mailto:${contact.email_principal}`} className="font-medium text-[#6C5CE7] hover:underline truncate block">
                      {contact.email_principal}
                    </a>
                  ) : (
                    <span className="text-[#9CA3AF]">Sin registrar</span>
                  )}
                </div>
              </div>
              {contact.email_principal && (
                <Tooltip title="Copiar correo">
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(contact.email_principal, 'Correo')}
                    sx={{ p: 0.3, color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                  >
                    <i className="tabler-copy text-sm" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* 4. Ubicación Principal */}
        <div className="space-y-2">
          <Typography variant="caption" className="font-bold text-[#6B7280] uppercase tracking-wider block">
            Ubicación Geográfica
          </Typography>
          <div className="p-3 bg-[#F8F7FC] rounded-xl border border-[#E6E4F0] flex items-start gap-2.5 text-sm text-[#1E1B2E]">
            <i className="tabler-map-pin text-[#6C5CE7] text-lg mt-0.5 shrink-0" />
            <div>
              <span className="font-medium block">{contact.direccion || 'Dirección no especificada'}</span>
              <span className="text-xs text-[#6B7280] block mt-0.5">
                {contact.ciudad ? `${contact.ciudad}, ` : ''}{contact.estado ? `${contact.estado}, ` : ''}{contact.pais || 'Venezuela'}
                {contact.codigo_postal ? ` · C.P. ${contact.codigo_postal}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Personas Referentes (para Empresas) - Acordeón Desplegable */}
        {contact.tipo === 'EMPRESA' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Typography variant="caption" className="font-bold text-[#6B7280] uppercase tracking-wider">
                Personas de Contacto en la Empresa ({contact.contactos_referentes?.length || 0})
              </Typography>
            </div>

            {!contact.contactos_referentes || contact.contactos_referentes.length === 0 ? (
              <div className="p-3 bg-[#F8F7FC] rounded-xl border border-dashed border-[#E6E4F0] text-center text-xs text-[#6B7280]">
                Sin personas referentes registradas.
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {[...(contact.contactos_referentes || [])]
                  .sort((a, b) => (b.is_principal ? 1 : 0) - (a.is_principal ? 1 : 0))
                  .map(person => {
                    const isExpanded = expandedContactId === person.id;
                    return (
                      <div
                        key={person.id}
                        className="bg-white rounded-xl border border-[#E6E4F0] hover:border-[#6C5CE7] transition-all overflow-hidden shadow-sm"
                      >
                        {/* Cabecera Clickeable para Desplegar */}
                        <div
                          onClick={() => setExpandedContactId(isExpanded ? null : person.id)}
                          className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#F8F7FC] transition-colors select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                                fontSize: '0.75rem',
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
                                <span className="font-semibold text-xs sm:text-sm text-[#1E1B2E] truncate">
                                  {person.nombre}
                                </span>
                                <ContactRoleChip rol={person.rol} isPrincipal={person.is_principal} />
                              </div>
                              <span className="text-[11px] text-[#6B7280] block truncate">
                                {person.cargo || 'Contacto'} {person.cedula_identidad ? `· C.I. ${person.cedula_identidad}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[#6B7280]">
                            <span className="text-[11px] hidden sm:inline text-[#6C5CE7] font-medium">
                              {isExpanded ? 'Ocultar' : 'Ver datos'}
                            </span>
                            <i className={isExpanded ? 'tabler-chevron-up text-base text-[#6C5CE7]' : 'tabler-chevron-down text-base'} />
                          </div>
                        </div>

                        {/* Contenido Desplegable */}
                        {isExpanded && (
                          <div className="p-3 bg-[#F8F7FC] border-t border-[#F4F3F8] flex flex-col gap-2.5 animate-fadeIn">
                            {/* Fila Teléfono */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <i className="tabler-phone text-xs text-[#6C5CE7]" />
                                <a
                                  href={`tel:${person.telefono}`}
                                  className="text-xs font-mono font-semibold text-[#6C5CE7] hover:underline"
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
                                  fontSize: '0.7rem',
                                  py: 0.2,
                                  px: 1.25,
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

                            {/* Fila Correo con Copiar */}
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
                                    fontSize: '0.7rem',
                                    py: 0.2,
                                    px: 1.25,
                                    borderColor: '#E6E4F0',
                                    color: '#1E1B2E',
                                    '&:hover': { borderColor: '#6C5CE7', backgroundColor: '#FFFFFF' }
                                  }}
                                >
                                  Correo
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 6. Direcciones Adicionales (para Empresas) */}
        {contact.tipo === 'EMPRESA' && contact.direcciones_adicionales && contact.direcciones_adicionales.length > 0 && (
          <div className="space-y-2">
            <Typography variant="caption" className="font-bold text-[#6B7280] uppercase tracking-wider block">
              Sucursales y Puntos de Despacho ({contact.direcciones_adicionales.length})
            </Typography>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {contact.direcciones_adicionales.map(addr => (
                <div key={addr.id} className="p-2.5 bg-[#F8F7FC] rounded-xl border border-[#E6E4F0] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] uppercase text-[#6C5CE7]">
                      {addr.tipo === 'ENTREGA' ? 'Despacho' : addr.tipo === 'FACTURACION' ? 'Facturación' : 'Fiscal'}
                    </span>
                    {addr.is_predeterminada && (
                      <span className="text-[10px] bg-[#F3F0FF] text-[#6C5CE7] font-semibold px-1.5 py-0.2 rounded border border-[#E9D5FF]">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-[#1E1B2E] block">{addr.direccion}</span>
                  <span className="text-[11px] text-[#6B7280] block">
                    {addr.ciudad}, {addr.estado} ({addr.pais}) {addr.codigo_postal ? `· C.P. ${addr.codigo_postal}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions (Coherente con Inventario: Cerrar y Ficha Completa) */}
      <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-[#E6E4F0]">
        <Button variant="outlined" color="secondary" onClick={onClose} sx={{ borderRadius: '9999px' }}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            onClose();
            router.push(`/contacts/${contact.id}`);
          }}
          endIcon={<i className="tabler-arrow-up-right" />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            px: 3.5,
            fontWeight: 600,
            '&:hover': { backgroundColor: '#5A4AD1' }
          }}
        >
          Ficha Completa
        </Button>
      </div>

      {/* Snackbar Toast para copia al portapapeles */}
      <Snackbar
        open={Boolean(copiedMessage)}
        autoHideDuration={2000}
        onClose={() => setCopiedMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" sx={{ borderRadius: '12px', bgcolor: '#6C5CE7' }}>
          {copiedMessage}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default ContactQuickViewDrawer;
