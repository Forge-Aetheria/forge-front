'use client';

import React from 'react';

import Link from 'next/link';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';

import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

import CustomChip from '@core/components/mui/Chip';
import type {
  TerceroEntity,
  ContactVisibleColumns,
  ContactSortKey,
  ContactSortDirection
} from '@/types/contactsTypes';
import { ContactRoleChip } from './ContactRoleChip';

interface Props {
  terceros: TerceroEntity[];
  onView?: (t: TerceroEntity) => void;
  onEdit?: (t: TerceroEntity) => void;
  onDeactivate: (id: string) => void;
  readOnly?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  visibleColumns?: ContactVisibleColumns;
  sortKey?: ContactSortKey | null;
  sortDirection?: ContactSortDirection;
  onSort?: (key: ContactSortKey) => void;
  onOpenContacts?: (target: HTMLElement, company: TerceroEntity) => void;
}

export const ContactsTable: React.FC<Props> = ({
  terceros,
  onView,
  onEdit,
  onDeactivate,
  readOnly,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  visibleColumns = {
    clasificacion: false,
    ubicacion: true,
    contactoDirecto: true,
    referentes: true
  },
  sortKey,
  sortDirection = 'asc',
  onSort,
  onOpenContacts
}) => {
  const handleView = (t: TerceroEntity) => {
    if (onView) onView(t);
    else if (onEdit) onEdit(t);
  };

  return (
    <TableContainer>
      <Table sx={{ width: '100%', minWidth: 780 }}>
        <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
          <TableRow sx={{ '& th': { color: '#6B7280', fontWeight: 600, fontSize: '0.78rem', py: 1.5, whiteSpace: 'nowrap' } }}>
            {!readOnly && (
              <TableCell padding="checkbox" sx={{ width: 44, p: 0.5 }}>
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < terceros.length}
                  checked={terceros.length > 0 && selectedIds.length === terceros.length}
                  onChange={e => onToggleSelectAll?.(e.target.checked)}
                  sx={{
                    color: '#6C5CE7',
                    '&.Mui-checked': { color: '#6C5CE7' },
                    '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' }
                  }}
                />
              </TableCell>
            )}
            <TableCell
              onClick={() => onSort?.('nombre')}
              sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 200 }}
            >
              <div className="flex items-center gap-1.5 group">
                <span>CONTACTO / EMPRESA</span>
                {sortKey === 'nombre' ? (
                  <i
                    className={
                      sortDirection === 'asc'
                        ? 'tabler-arrow-up text-sm text-[#6C5CE7]'
                        : 'tabler-arrow-down text-sm text-[#6C5CE7]'
                    }
                  />
                ) : (
                  <i className="tabler-arrows-sort text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </TableCell>

            {visibleColumns.clasificacion && (
              <TableCell
                onClick={() => onSort?.('tipo')}
                sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 120 }}
              >
                <div className="flex items-center gap-1.5 group">
                  <span>CLASIFICACIÓN</span>
                  {sortKey === 'tipo' ? (
                    <i
                      className={
                        sortDirection === 'asc'
                          ? 'tabler-arrow-up text-sm text-[#6C5CE7]'
                          : 'tabler-arrow-down text-sm text-[#6C5CE7]'
                      }
                    />
                  ) : (
                    <i className="tabler-arrows-sort text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </TableCell>
            )}

            {visibleColumns.ubicacion && (
              <TableCell
                onClick={() => onSort?.('ciudad')}
                sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 140 }}
              >
                <div className="flex items-center gap-1.5 group">
                  <span>UBICACIÓN</span>
                  {sortKey === 'ciudad' ? (
                    <i
                      className={
                        sortDirection === 'asc'
                          ? 'tabler-arrow-up text-sm text-[#6C5CE7]'
                          : 'tabler-arrow-down text-sm text-[#6C5CE7]'
                      }
                    />
                  ) : (
                    <i className="tabler-arrows-sort text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </TableCell>
            )}

            {visibleColumns.contactoDirecto && (
              <TableCell sx={{ minWidth: 160 }}>
                <span>CONTACTO DIRECTO</span>
              </TableCell>
            )}

            {visibleColumns.referentes && (
              <TableCell
                onClick={() => onSort?.('referentes')}
                sx={{ cursor: 'pointer', userSelect: 'none', minWidth: 140 }}
              >
                <div className="flex items-center gap-1.5 group">
                  <span>EMPRESA / REFERENTES</span>
                  {sortKey === 'referentes' ? (
                    <i
                      className={
                        sortDirection === 'asc'
                          ? 'tabler-arrow-up text-sm text-[#6C5CE7]'
                          : 'tabler-arrow-down text-sm text-[#6C5CE7]'
                      }
                    />
                  ) : (
                    <i className="tabler-arrows-sort text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </TableCell>
            )}

            {!readOnly && <TableCell align="right" sx={{ width: 96, textAlign: 'right' }}>ACCIONES</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {terceros.map(t => {
            const isSelected = selectedIds.includes(t.id);

            return (
              <TableRow
                key={t.id}
                hover
                selected={isSelected}
                onClick={() => handleView(t)}
                sx={{
                  cursor: 'pointer',
                  height: 64,
                  transition: 'background-color 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(108, 92, 231, 0.04) !important'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(108, 92, 231, 0.08) !important'
                  },
                  '& td': { py: 1.25, borderColor: '#F4F3F8', verticalAlign: 'middle' }
                }}
              >
                {!readOnly && (
                  <TableCell padding="checkbox" onClick={e => e.stopPropagation()} sx={{ width: 48 }}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(t.id)}
                      sx={{
                        color: '#6C5CE7',
                        '&.Mui-checked': { color: '#6C5CE7' }
                      }}
                    />
                  </TableCell>
                )}

                {/* Entidad / Tercero */}
                <TableCell sx={{ minWidth: 230, maxWidth: 280 }}>
                  <div className="flex items-center gap-3">
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        bgcolor: t.parent_company_name ? '#F3F0FF' : t.tipo === 'EMPRESA' ? '#F3F0FF' : '#F0FDF4',
                        color: t.parent_company_name ? '#6C5CE7' : t.tipo === 'EMPRESA' ? '#6C5CE7' : '#16A34A',
                        border: t.parent_company_name ? '1px solid #E9D5FF' : t.tipo === 'EMPRESA' ? '1px solid #E9D5FF' : '1px solid #BBF7D0',
                        flexShrink: 0
                      }}
                    >
                      <i className={t.parent_company_name ? 'tabler-user text-lg' : t.tipo === 'EMPRESA' ? 'tabler-building text-lg' : 'tabler-user text-lg'} />
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <Tooltip title={t.nombre_razon_social} arrow enterDelay={400} placement="top-start">
                        <Typography variant="body2" className="font-semibold text-[#1E1B2E] truncate block max-w-[200px]">
                          {t.nombre_razon_social}
                        </Typography>
                      </Tooltip>
                      <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-0.5 whitespace-nowrap overflow-hidden">
                        <span className="font-mono font-medium text-[#6C5CE7] shrink-0">{t.identificacion}</span>
                        {t.nombre_comercial && (
                          <Tooltip title={t.nombre_comercial} arrow enterDelay={400} placement="top-start">
                            <span className="text-gray-400 truncate max-w-[140px] block">· {t.nombre_comercial}</span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Clasificación */}
                {visibleColumns.clasificacion && (
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {t.contact_person_ref ? (
                      <div className="flex items-center whitespace-nowrap">
                        <ContactRoleChip
                          rol={t.contact_person_ref.rol}
                          isPrincipal={t.contact_person_ref.is_principal}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        {t.is_cliente && (
                          <CustomChip
                            size="small"
                            variant="tonal"
                            color="success"
                            label="Cliente"
                          />
                        )}
                        {t.is_proveedor && (
                          <CustomChip
                            size="small"
                            variant="tonal"
                            color="info"
                            label="Proveedor"
                          />
                        )}
                        {t.is_contacto && !t.is_cliente && !t.is_proveedor && (
                          <CustomChip
                            size="small"
                            variant="tonal"
                            color="secondary"
                            label="Contacto"
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                )}


                {/* Ubicación */}
                {visibleColumns.ubicacion && (
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {(() => {
                      const fullLocation = [t.ciudad, t.estado, t.pais || 'Venezuela'].filter(Boolean).join(', ');

                      
return (
                        <Tooltip title={fullLocation} arrow enterDelay={400} placement="top-start">
                          <div className="flex items-center gap-1.5 text-xs text-[#1E1B2E] max-w-[170px]">
                            <i className="tabler-map-pin text-sm text-[#6C5CE7] shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium block truncate max-w-[150px]">
                                {t.ciudad || 'No especificada'}{t.estado ? `, ${t.estado}` : ''}
                              </span>
                              <span className="text-[#6B7280] text-[11px] block truncate max-w-[150px]">{t.pais || 'Venezuela'}</span>
                            </div>
                          </div>
                        </Tooltip>
                      );
                    })()}
                  </TableCell>
                )}

                {/* Contacto Directo */}
                {visibleColumns.contactoDirecto && (
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 group whitespace-nowrap">
                        <a
                          href={`tel:${t.telefono_principal}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-[#6C5CE7] hover:underline flex items-center gap-1 font-medium"
                        >
                          <i className="tabler-phone text-xs shrink-0" />
                          <span className="truncate max-w-[130px]">{t.telefono_principal || 'Sin teléfono'}</span>
                        </a>
                        {t.telefono_principal && (
                          <Tooltip title="Copiar teléfono" arrow>
                            <IconButton
                              size="small"
                              onClick={e => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.telefono_principal);
                              }}
                              sx={{ p: 0.2, color: '#9CA3AF', opacity: 0, '&:hover': { color: '#6C5CE7' }, '.group:hover &': { opacity: 1 } }}
                            >
                              <i className="tabler-copy text-xs" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </div>
                      {t.email_principal ? (
                        <div className="flex items-center gap-1 group whitespace-nowrap">
                          <Tooltip title={t.email_principal} arrow enterDelay={400} placement="top-start">
                            <a
                              href={`mailto:${t.email_principal}`}
                              onClick={e => e.stopPropagation()}
                              className="text-xs text-[#6B7280] hover:underline flex items-center gap-1 truncate max-w-[170px]"
                            >
                              <i className="tabler-mail text-xs shrink-0" />
                              <span className="truncate">{t.email_principal}</span>
                            </a>
                          </Tooltip>
                          <Tooltip title="Copiar correo" arrow>
                            <IconButton
                              size="small"
                              onClick={e => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.email_principal);
                              }}
                              sx={{ p: 0.2, color: '#9CA3AF', opacity: 0, '&:hover': { color: '#6C5CE7' }, '.group:hover &': { opacity: 1 } }}
                            >
                              <i className="tabler-copy text-xs" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">Sin correo</span>
                      )}
                    </div>
                  </TableCell>
                )}

                {/* Empresa / Referentes */}
                {visibleColumns.referentes && (
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {t.parent_company_name ? (
                      <Tooltip title={`Pertenece a ${t.parent_company_name}`} arrow enterDelay={400} placement="top-start">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-[#6C5CE7] bg-[#F3F0FF] border border-[#E9D5FF] max-w-[170px]">
                          <i className="tabler-building text-xs shrink-0" />
                          <span className="truncate">{t.parent_company_name}</span>
                        </span>
                      </Tooltip>
                    ) : t.tipo === 'EMPRESA' ? (
                      t.contactos_referentes && t.contactos_referentes.length > 0 ? (
                        <Tooltip title={`Ver ${t.contactos_referentes.length} personas de contacto`} arrow enterDelay={400}>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onOpenContacts?.(e.currentTarget, t);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs font-semibold bg-[#F3F0FF] text-[#6C5CE7] border border-[#E9D5FF] hover:bg-[#6C5CE7] hover:text-white transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                          >
                            <i className="tabler-users text-sm shrink-0" />
                            <span className="whitespace-nowrap">
                              {t.contactos_referentes.length}{' '}
                              {t.contactos_referentes.length === 1 ? 'contacto' : 'contactos'}
                            </span>
                            <i className="tabler-chevron-down text-xs opacity-75 shrink-0" />
                          </button>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-[#9CA3AF] italic whitespace-nowrap">Sin contactos</span>
                      )
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">—</span>
                    )}
                  </TableCell>
                )}

                {/* Acciones */}
                {!readOnly && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', width: 110 }}>
                    <div className="flex justify-end items-center gap-0.5">
                      <Tooltip title="Vista Rápida" arrow>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            handleView(t);
                          }}
                          sx={{ color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                        >
                          <i className="tabler-eye text-base" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ficha Completa" arrow>
                        <IconButton
                          size="small"
                          component={Link}
                          href={`/contacts/${t.id}`}
                          onClick={e => e.stopPropagation()}
                          sx={{ color: '#6C5CE7', '&:hover': { color: '#5A4AD1' } }}
                        >
                          <i className="tabler-arrow-up-right text-base" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Desactivar" arrow>
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            onDeactivate(t.id);
                          }}
                          sx={{ color: '#EF4444' }}
                        >
                          <i className="tabler-trash text-base" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
