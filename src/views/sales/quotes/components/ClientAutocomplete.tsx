'use client';

import React, { useState, useEffect } from 'react';

import CircularProgress from '@mui/material/CircularProgress';

import Chip from '@mui/material/Chip';

import CustomAutocomplete from '@core/components/mui/Autocomplete';
import CustomTextField from '@core/components/mui/TextField';

import type { ClientLookup } from '@/types/salesQuotesTypes';
import { salesQuotesService } from '@/services/salesQuotesService';

interface Props {
  value: ClientLookup | null;
  onChange: (client: ClientLookup | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export const ClientAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  error = false,
  helperText,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ClientLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search
  useEffect(() => {
    let active = true;

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await salesQuotesService.searchClients(searchTerm);

        if (active) {
          setOptions(results);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  return (
    <CustomAutocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disabled={disabled}
      isOptionEqualToValue={(option: any, val: any) => option.id === val.id}
      getOptionLabel={(option: any) =>
        `${option.identificacion} — ${option.nombre_razon_social}${
          option.nombre_comercial ? ` (${option.nombre_comercial})` : ''
        }`
      }
      options={options}
      loading={loading}
      value={value}
      onChange={(_event: any, newValue: any) => {
        onChange(newValue || null);
      }}
      onInputChange={(_event: any, newInputValue: string) => {
        setSearchTerm(newInputValue);
      }}
      renderOption={(props: any, option: any) => (
        <li {...props} key={option.id} className="p-3 border-b border-[#F4F3F8] last:border-none hover:bg-[#F0EEF9] cursor-pointer">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[#1E1B2E]">
                {option.nombre_razon_social}
              </span>
              <Chip
                label={option.identificacion}
                size="small"
                sx={{
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  backgroundColor: '#F4F3F8',
                  color: '#6C5CE7',
                  border: '1px solid #DCD8EC'
                }}
              />
            </div>
            {option.nombre_comercial && (
              <span className="text-xs text-[#6B7280]">
                Comercial: {option.nombre_comercial}
              </span>
            )}
            <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
              {option.telefono && (
                <span className="flex items-center gap-1">
                  <i className="tabler-phone text-xs" /> {option.telefono}
                </span>
              )}
              {option.email && (
                <span className="flex items-center gap-1">
                  <i className="tabler-mail text-xs" /> {option.email}
                </span>
              )}
            </div>
          </div>
        </li>
      )}
      renderInput={(params: any) => (
        <CustomTextField
          {...params}
          label="Cliente / Razón Social *"
          placeholder="Buscar por RIF, Cédula o Razón Social..."
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
};
