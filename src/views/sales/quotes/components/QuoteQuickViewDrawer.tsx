'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { Quote } from '@/types/salesQuotesTypes';
import { QuoteStatusChip } from './QuoteStatusChip';
import { BcvRateBadge } from './BcvRateBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  quote: Quote | null;
}

export const QuoteQuickViewDrawer: React.FC<Props> = ({ open, onClose, quote }) => {
  const router = useRouter();

  if (!quote) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0',
          boxShadow: '-4px 0 24px rgba(108, 92, 231, 0.08)',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#E6E4F0] flex items-center justify-between bg-[#FAFAFC]">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F0EEF9] text-[#6C5CE7]">
            <i className="tabler-file-invoice text-base" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#1E1B2E]">
                {quote.correlativo}
              </span>
              <QuoteStatusChip status={quote.estado} size="small" />
            </div>
            <span className="text-xs text-[#6B7280]">Vista Rápida de Cotización</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip title="Abrir en pantalla completa" arrow>
            <IconButton
              size="small"
              onClick={() => {
                onClose();
                router.push(`/sales/quotes/${quote.id}`);
              }}
              sx={{ color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
            >
              <i className="tabler-maximize text-base" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={onClose} sx={{ color: '#6B7280' }}>
            <i className="tabler-x text-base" />
          </IconButton>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Tasa BCV */}
        <div className="flex items-center justify-between bg-[#F4F3F8] p-3 rounded-2xl border border-[#DCD8EC]">
          <span className="text-xs font-semibold text-[#1E1B2E]">Tasa Aplicada</span>
          <BcvRateBadge rate={quote.tasa_bcv} compact />
        </div>

        {/* Cliente */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E6E4F0] shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider">
              Datos del Cliente
            </span>
            <Chip
              label={quote.cliente.identificacion}
              size="small"
              sx={{
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.7rem',
                backgroundColor: '#F0EEF9',
                color: '#6C5CE7'
              }}
            />
          </div>
          <Typography variant="subtitle1" className="font-bold text-[#1E1B2E]">
            {quote.cliente.nombre_razon_social}
          </Typography>
          {quote.cliente.nombre_comercial && (
            <span className="text-xs text-[#6B7280]">
              Nombre comercial: {quote.cliente.nombre_comercial}
            </span>
          )}
          <div className="flex flex-col gap-1 text-xs text-[#6B7280] pt-1">
            <div className="flex items-center gap-1.5">
              <i className="tabler-phone text-xs text-[#9CA3AF]" />
              <span>{quote.cliente.telefono || 'Sin teléfono'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <i className="tabler-mail text-xs text-[#9CA3AF]" />
              <span>{quote.cliente.email || 'Sin correo'}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <i className="tabler-map-pin text-xs text-[#9CA3AF] mt-0.5" />
              <span>{quote.cliente.direccion}</span>
            </div>
          </div>
        </div>

        {/* Fechas de Vigencia */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E6E4F0]">
          <div>
            <span className="text-[#9CA3AF] block mb-0.5">Fecha de Emisión</span>
            <span className="font-semibold text-[#1E1B2E]">{quote.fecha_emision}</span>
          </div>
          <div>
            <span className="text-[#9CA3AF] block mb-0.5">Fecha de Vencimiento</span>
            <span className="font-semibold text-[#1E1B2E]">{quote.fecha_vencimiento}</span>
          </div>
        </div>

        {/* Detalle de Líneas de Ítems */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider">
            Ítems del Presupuesto ({quote.items.length})
          </span>
          <div className="flex flex-col gap-2">
            {quote.items.map((it, idx) => (
              <div
                key={it.id || idx}
                className="bg-[#FAFAFC] p-3 rounded-xl border border-[#E6E4F0] flex flex-col gap-1.5 text-xs"
              >
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-[#1E1B2E]">
                    {it.producto_nombre}
                  </span>
                  <span className="font-bold text-[#1E1B2E]">
                    ${it.total_linea.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280]">
                  <span>SKU: {it.producto_sku}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F4F3F8] text-[#6B7280] border border-[#E6E4F0]">
                      {!quote.aplica_iva || it.alicuota_iva === 'EXEMPT' || it.alicuota_iva === '0' ? 'Exento' : 'IVA 16%'}
                    </span>
                    <span>
                      {it.cantidad} x ${it.precio_unitario.toFixed(2)}
                      {it.descuento_porcentaje > 0 ? ` (-${it.descuento_porcentaje}%)` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de Montos Bimonetarios */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E6E4F0] shadow-sm flex flex-col gap-2">
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>Subtotal</span>
            <span>${quote.subtotal_usd.toFixed(2)} USD</span>
          </div>
          {quote.descuento_total_usd > 0 && (
            <div className="flex justify-between text-xs text-[#EF4444]">
              <span>Descuento</span>
              <span>-${quote.descuento_total_usd.toFixed(2)} USD</span>
            </div>
          )}
          {quote.aplica_iva ? (
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>IVA ({quote.iva_total_usd > 0 ? '16%' : '0%'})</span>
              <span>${quote.iva_total_usd.toFixed(2)} USD</span>
            </div>
          ) : (
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>Régimen IVA</span>
              <span className="text-[#10B981] font-semibold">Exento / Sin IVA</span>
            </div>
          )}
          <Divider sx={{ borderColor: '#F4F3F8' }} />
          <div className="flex justify-between items-baseline pt-1">
            <span className="font-bold text-sm text-[#1E1B2E]">Total General</span>
            <div className="text-right">
              <div className="text-base font-bold text-[#6C5CE7]">
                ${quote.total_usd.toFixed(2)} USD
              </div>
              <div className="text-xs font-semibold text-[#10B981]">
                Bs. {quote.total_ves.toFixed(2)} VES
              </div>
            </div>
          </div>
        </div>

        {/* Motivo de anulación si aplica */}
        {quote.estado === 'CANCELED' && quote.motivo_anulacion && (
          <div className="bg-[#FEE2E2] p-3 rounded-xl border border-[#FCA5A5] text-xs text-[#B91C1C]">
            <strong>Motivo de anulación:</strong> {quote.motivo_anulacion}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#E6E4F0] bg-[#FAFAFC] flex items-center justify-between gap-3">
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            borderRadius: '9999px',
            borderColor: '#DCD8EC',
            color: '#6B7280',
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Cerrar
        </Button>
        <Button
          component={Link}
          href={`/sales/quotes/${quote.id}`}
          variant="contained"
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#5B4CDB',
              boxShadow: 'none'
            }
          }}
          startIcon={<i className="tabler-external-link text-base" />}
        >
          Ficha Completa
        </Button>
      </div>
    </Drawer>
  );
};
