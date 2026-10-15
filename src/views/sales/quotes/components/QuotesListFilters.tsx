'use client';

import React from 'react';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import CustomTextField from '@core/components/mui/TextField';
import { QuoteStatus, QuotesFilterState } from '@/types/salesQuotesTypes';

interface Props {
  filters: QuotesFilterState;
  onChange: (filters: QuotesFilterState) => void;
  onReset: () => void;
}

const statusOptions: { value: QuoteStatus | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: 'Todos los estados', icon: 'tabler-category' },
  { value: 'DRAFT', label: 'Borrador', icon: 'tabler-file-pencil' },
  { value: 'ISSUED', label: 'Emitida', icon: 'tabler-send' },
  { value: 'APPROVED', label: 'Aprobada', icon: 'tabler-circle-check' },
  { value: 'EXPIRED', label: 'Vencida', icon: 'tabler-clock-exclamation' },
  { value: 'CANCELED', label: 'Anulada', icon: 'tabler-circle-x' }
];

export const QuotesListFilters: React.FC<Props> = ({ filters, onChange, onReset }) => {
  return (
    <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E6E4F0] mb-5 shadow-sm">
      <Grid container spacing={2.5} alignItems="center">
        {/* Input de Búsqueda */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <CustomTextField
            size="small"
            fullWidth
            placeholder="Buscar por correlativo, cliente o RIF..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            sx={{
              '& .MuiInputBase-root': {
                height: '38px',
                minHeight: '38px',
                borderRadius: '10px',
                backgroundColor: '#F4F3F8',
                fontSize: '0.85rem'
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="tabler-search text-base text-[#6C5CE7]" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>

        {/* Filtro de Estado Comercial */}
        <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
          <CustomTextField
            select
            size="small"
            fullWidth
            value={filters.estado}
            onChange={e => onChange({ ...filters, estado: e.target.value as QuoteStatus | 'ALL' })}
            sx={{
              '& .MuiInputBase-root': {
                height: '38px',
                minHeight: '38px',
                borderRadius: '10px',
                backgroundColor: '#F4F3F8',
                fontSize: '0.85rem'
              }
            }}
          >
            {statusOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2 text-xs">
                  <i className={`${opt.icon} text-sm text-[#6C5CE7]`} />
                  <span>{opt.label}</span>
                </div>
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>

        {/* Fecha Desde */}
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <CustomTextField
            type="date"
            size="small"
            fullWidth
            value={filters.fecha_desde || ''}
            onChange={e => onChange({ ...filters, fecha_desde: e.target.value || undefined })}
            sx={{
              '& .MuiInputBase-root': {
                height: '38px',
                minHeight: '38px',
                borderRadius: '10px',
                backgroundColor: '#F4F3F8',
                fontSize: '0.82rem'
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <span className="text-[11px] font-semibold text-[#6B7280]">Desde:</span>
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>

        {/* Fecha Hasta */}
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <CustomTextField
            type="date"
            size="small"
            fullWidth
            value={filters.fecha_hasta || ''}
            onChange={e => onChange({ ...filters, fecha_hasta: e.target.value || undefined })}
            sx={{
              '& .MuiInputBase-root': {
                height: '38px',
                minHeight: '38px',
                borderRadius: '10px',
                backgroundColor: '#F4F3F8',
                fontSize: '0.82rem'
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <span className="text-[11px] font-semibold text-[#6B7280]">Hasta:</span>
                  </InputAdornment>
                )
              }
            }}
          />
        </Grid>

        {/* Botón Reset */}
        <Grid size={{ xs: 12, md: 1 }} className="flex justify-end">
          <Tooltip title="Restablecer filtros" arrow>
            <Button
              variant="text"
              size="small"
              onClick={onReset}
              sx={{
                height: '38px',
                minWidth: '38px',
                p: 0,
                borderRadius: '10px',
                color: '#6B7280',
                backgroundColor: '#F4F3F8',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9' }
              }}
            >
              <i className="tabler-filter-off text-base" />
            </Button>
          </Tooltip>
        </Grid>
      </Grid>
    </div>
  );
};
