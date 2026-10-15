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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Quote } from '@/types/salesQuotesTypes';
import { QuoteStatusChip } from './QuoteStatusChip';

interface Props {
  quotes: Quote[];
  onSelectQuote: (quote: Quote) => void;
  onCancelQuote: (quote: Quote) => void;
  onCopyCorrelativo: (correlativo: string) => void;
}

export const QuotesTable: React.FC<Props> = ({
  quotes,
  onSelectQuote,
  onCancelQuote,
  onCopyCorrelativo
}) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <TableContainer
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E6E4F0',
        boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
        overflow: 'hidden'
      }}
    >
      <Table sx={{ minWidth: 800 }}>
        <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Correlativo</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Cliente / Razón Social</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Emisión</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Vencimiento</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Monto (USD)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Monto (VES)</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Estado</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {quotes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#F0EEF9] text-[#6C5CE7]">
                    <i className="tabler-file-off text-2xl" />
                  </span>
                  <Typography variant="body1" className="font-semibold text-[#1E1B2E]">
                    No se encontraron cotizaciones
                  </Typography>
                  <Typography variant="body2" className="text-[#6B7280]">
                    Intenta ajustar los filtros de búsqueda o registra un nuevo presupuesto.
                  </Typography>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            quotes.map(quote => {
              const isExpired = quote.fecha_vencimiento < today && quote.estado === 'ISSUED';

              return (
                <TableRow
                  key={quote.id}
                  hover
                  onClick={() => onSelectQuote(quote)}
                  sx={{
                    cursor: 'pointer',
                    height: '64px',
                    transition: 'background-color 0.15s ease',
                    '&:hover': {
                      backgroundColor: '#FAF9FF !important'
                    }
                  }}
                >
                  {/* Correlativo */}
                  <TableCell sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="font-semibold text-sm text-[#6C5CE7]">
                        {quote.correlativo}
                      </span>
                      <Tooltip title="Copiar correlativo" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onCopyCorrelativo(quote.correlativo)}
                          sx={{ color: '#9CA3AF', '&:hover': { color: '#6C5CE7' }, p: 0.5 }}
                        >
                          <i className="tabler-copy text-xs" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>

                  {/* Cliente */}
                  <TableCell sx={{ py: 1, verticalAlign: 'middle', maxWidth: 220 }}>
                    <div className="flex flex-col">
                      <Tooltip title={quote.cliente.nombre_razon_social} arrow>
                        <span className="font-semibold text-sm text-[#1E1B2E] truncate">
                          {quote.cliente.nombre_razon_social}
                        </span>
                      </Tooltip>
                      <span className="text-xs text-[#6B7280]">
                        {quote.cliente.identificacion}
                        {quote.cliente.nombre_comercial ? ` • ${quote.cliente.nombre_comercial}` : ''}
                      </span>
                    </div>
                  </TableCell>

                  {/* Fecha Emisión */}
                  <TableCell sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#6B7280', fontSize: '0.85rem' }}>
                    {quote.fecha_emision}
                  </TableCell>

                  {/* Vencimiento */}
                  <TableCell sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm ${isExpired ? 'text-[#EF4444] font-medium' : 'text-[#1E1B2E]'}`}>
                        {quote.fecha_vencimiento}
                      </span>
                      {isExpired && (
                        <Tooltip title="Cotización vencida" arrow>
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#FEE2E2] text-[#EF4444]">
                            <i className="tabler-alert-circle text-xs" />
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  {/* Monto Base (USD) */}
                  <TableCell align="right" sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-sm text-[#1E1B2E]">
                        ${quote.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {!quote.aplica_iva && (
                        <span className="text-[10px] text-[#6B7280] font-medium bg-[#F4F3F8] px-1.5 py-0.2 rounded-full border border-[#E6E4F0]">
                          Exento
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Monto Local (VES) */}
                  <TableCell align="right" sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span className="font-semibold text-xs text-[#10B981]">
                      Bs. {quote.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>

                  {/* Estado */}
                  <TableCell align="center" sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <QuoteStatusChip status={quote.estado} />
                  </TableCell>

                  {/* Acciones */}
                  <TableCell align="right" sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap', width: 120 }}>
                    <div className="flex justify-end items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <Tooltip title="Vista Rápida" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onSelectQuote(quote)}
                          sx={{ color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                        >
                          <i className="tabler-eye text-base" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Ficha Completa" arrow>
                        <IconButton
                          size="small"
                          component={Link}
                          href={`/sales/quotes/${quote.id}`}
                          sx={{ color: '#6C5CE7', '&:hover': { color: '#5A4AD1' } }}
                        >
                          <i className="tabler-arrow-up-right text-base" />
                        </IconButton>
                      </Tooltip>

                      {quote.estado === 'DRAFT' && (
                        <Tooltip title="Editar Borrador" arrow>
                          <IconButton
                            size="small"
                            component={Link}
                            href={`/sales/quotes/${quote.id}/edit`}
                            sx={{ color: '#38BDF8', '&:hover': { color: '#0284C7' } }}
                          >
                            <i className="tabler-edit text-base" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {quote.estado !== 'CANCELED' && (
                        <Tooltip title="Anular Cotización" arrow>
                          <IconButton
                            size="small"
                            onClick={() => onCancelQuote(quote)}
                            sx={{ color: '#EF4444', '&:hover': { color: '#DC2626' } }}
                          >
                            <i className="tabler-ban text-base" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
