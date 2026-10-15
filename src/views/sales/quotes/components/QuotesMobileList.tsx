'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { Quote } from '@/types/salesQuotesTypes';
import { QuoteStatusChip } from './QuoteStatusChip';

interface Props {
  quotes: Quote[];
  onSelectQuote: (quote: Quote) => void;
  onCancelQuote: (quote: Quote) => void;
  onCopyCorrelativo: (correlativo: string) => void;
}

export const QuotesMobileList: React.FC<Props> = ({
  quotes,
  onSelectQuote,
  onCancelQuote,
  onCopyCorrelativo
}) => {
  if (quotes.length === 0) {
    return (
      <div className="bg-[#FFFFFF] p-8 rounded-2xl border border-[#E6E4F0] text-center shadow-sm">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F0EEF9] text-[#6C5CE7] mb-2">
          <i className="tabler-file-off text-2xl" />
        </span>
        <Typography variant="body1" className="font-semibold text-[#1E1B2E]">
          No se encontraron cotizaciones
        </Typography>
        <Typography variant="body2" className="text-[#6B7280]">
          Ajusta los filtros o registra una nueva cotización.
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {quotes.map(quote => (
        <Card
          key={quote.id}
          onClick={() => onSelectQuote(quote)}
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E6E4F0',
            boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:active': { transform: 'scale(0.99)' }
          }}
        >
          <CardContent className="p-4 flex flex-col gap-2.5">
            {/* Header: Correlativo + Estado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <span className="font-bold text-base text-[#6C5CE7]">
                  {quote.correlativo}
                </span>
                <IconButton
                  size="small"
                  onClick={() => onCopyCorrelativo(quote.correlativo)}
                  sx={{ color: '#9CA3AF', p: 0.5 }}
                >
                  <i className="tabler-copy text-xs" />
                </IconButton>
              </div>
              <QuoteStatusChip status={quote.estado} />
            </div>

            {/* Cliente */}
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-[#1E1B2E]">
                {quote.cliente.nombre_razon_social}
              </span>
              <span className="text-xs text-[#6B7280]">
                {quote.cliente.identificacion}
              </span>
            </div>

            <Divider sx={{ borderColor: '#F4F3F8', my: 0.5 }} />

            {/* Fechas y Montos Duales */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-xs text-[#6B7280]">
                <span>Emisión: {quote.fecha_emision}</span>
                <span>Vence: {quote.fecha_vencimiento}</span>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {!quote.aplica_iva && (
                    <span className="text-[10px] text-[#6B7280] font-medium bg-[#F4F3F8] px-1.5 py-0.2 rounded-full border border-[#E6E4F0]">
                      Exento
                    </span>
                  )}
                  <span className="text-base font-bold text-[#1E1B2E]">
                    ${quote.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#10B981]">
                  Bs. {quote.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2 pt-1" onClick={e => e.stopPropagation()}>
              <Button
                component={Link}
                href={`/sales/quotes/${quote.id}`}
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: '9999px',
                  borderColor: '#DCD8EC',
                  color: '#6C5CE7',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2
                }}
              >
                Ficha Completa
              </Button>

              {quote.estado !== 'CANCELED' && (
                <IconButton
                  size="small"
                  onClick={() => onCancelQuote(quote)}
                  sx={{
                    color: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)'
                  }}
                  title="Anular"
                >
                  <i className="tabler-ban text-sm" />
                </IconButton>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
