'use client';

import React from 'react';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';

import type { QuoteTotalsCalculation, SalesFeatureFlags } from '@/types/salesQuotesTypes';

interface Props {
  totals: QuoteTotalsCalculation;
  tasaBcv: number;
  flags: SalesFeatureFlags;
  aplicaIva?: boolean;
  onToggleAplicaIva?: (val: boolean) => void;
  disabled?: boolean;
}

export const QuoteTotalsCard: React.FC<Props> = ({
  totals,
  tasaBcv,
  flags,
  aplicaIva = true,
  onToggleAplicaIva,
  disabled = false
}) => {
  return (
    <Card
      sx={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E4F0',
        borderRadius: '20px',
        boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
      }}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Typography variant="h6" className="font-semibold text-[#1E1B2E]">
            Resumen de Totales
          </Typography>
          <Chip
            size="small"
            label={`Tasa: ${tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2 })} VES/USD`}
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '0.72rem',
              backgroundColor: '#F0EEF9',
              color: '#6C5CE7',
              border: '1px solid #DCD8EC'
            }}
          />
        </div>

        {/* Switch para Aplicar o no IVA en la cotización */}
        {flags.TAXES_ENABLED && onToggleAplicaIva && (
          <div className="flex items-center justify-between bg-[#F8F7FC] p-2.5 rounded-xl border border-[#E6E4F0]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#1E1B2E] flex items-center gap-1.5">
                <i className="tabler-receipt-tax text-[#6C5CE7]" /> Aplica Impuesto IVA ({flags.IVA_RATE}%)
              </span>
              <span className="text-[11px] text-[#6B7280]">
                {aplicaIva ? 'Calcula IVA en productos gravados' : 'Cotización exenta / sin recargo de IVA'}
              </span>
            </div>
            <Switch
              size="small"
              checked={aplicaIva}
              onChange={e => onToggleAplicaIva(e.target.checked)}
              disabled={disabled}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#6C5CE7',
                  '& + .MuiSwitch-track': { backgroundColor: '#6C5CE7' }
                }
              }}
            />
          </div>
        )}

        <Divider sx={{ borderColor: '#E6E4F0' }} />

        {/* Subtotal Bruto */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6B7280]">Subtotal Bruto</span>
          <div className="text-right">
            <div className="font-medium text-[#1E1B2E]">
              ${totals.subtotal_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#9CA3AF]">
              Bs. {totals.subtotal_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Descuentos */}
        {totals.descuento_usd > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#EF4444] font-medium flex items-center gap-1">
              <i className="tabler-tag text-xs" /> Descuentos Comerciales
            </span>
            <div className="text-right">
              <div className="font-medium text-[#EF4444]">
                -${totals.descuento_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[#EF4444] opacity-80">
                -Bs. {totals.descuento_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Desglose de Base Imponible y Base Exenta si aplica */}
        {flags.TAXES_ENABLED && aplicaIva && totals.monto_exento_usd > 0 && (
          <div className="bg-[#FAFAFC] p-2 rounded-xl border border-[#F0EEF9] flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between text-[#6B7280]">
              <span>Base Imponible Gravada:</span>
              <span className="font-medium text-[#1E1B2E]">
                ${totals.base_imponible_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#6B7280]">
              <span>Monto Exento de IVA:</span>
              <span className="font-medium text-[#10B981]">
                ${totals.monto_exento_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Impuestos Condicionales (Regla R4) */}
        {flags.TAXES_ENABLED ? (
          <>
            {aplicaIva ? (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#6B7280]">IVA General ({flags.IVA_RATE}%)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E0DBF7] text-[#6C5CE7] font-semibold">
                    SENIAT
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[#1E1B2E]">
                    ${totals.iva_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
                    Bs. {totals.iva_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#6B7280]">Impuesto IVA</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F3F8] text-[#6B7280] font-semibold border border-[#DCD8EC]">
                    Exento / Sin IVA
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[#6B7280]">$0.00</div>
                  <div className="text-xs text-[#9CA3AF]">Bs. 0,00</div>
                </div>
              </div>
            )}

            {flags.IGTF_ENABLED && totals.igtf_usd > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">IGTF Divisas (3%)</span>
                <div className="text-right">
                  <div className="font-medium text-[#1E1B2E]">
                    ${totals.igtf_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
                    Bs. {totals.igtf_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-[#6B7280] italic bg-[#F4F3F8] p-2 rounded-xl text-center">
            Modo Neto Universal activo (Impuestos no desglosados)
          </div>
        )}

        <Divider sx={{ borderColor: '#E6E4F0', my: 0.5 }} />

        {/* Total Gran Bimonetario */}
        <div className="flex items-center justify-between pt-1">
          <Typography variant="h6" className="font-bold text-[#1E1B2E]">
            Total a Pagar
          </Typography>
          <div className="text-right">
            <div className="text-xl font-bold text-[#6C5CE7]">
              ${totals.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm font-semibold text-[#10B981]">
              Bs. {totals.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
