'use client'

import React from 'react'

import Link from 'next/link'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'

import type { PurchaseQuote, PurchaseVisibleColumns } from '@/types/purchasesTypes'
import { PurchaseStatusChip } from './PurchaseStatusChip'

interface Props {
  quotes: PurchaseQuote[]
  activeBcvRate: number
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: (checked: boolean) => void
  visibleColumns?: PurchaseVisibleColumns
  onSelectQuote: (quote: PurchaseQuote) => void
  onCancelQuote: (quote: PurchaseQuote) => void
  onCopyCorrelativo: (correlativo: string) => void
}

const defaultColumns: PurchaseVisibleColumns = {
  refProveedor: true,
  fechaVigencia: true,
  costoUsd: true,
  costoVes: true,
  estado: true
}

export const PurchasesTable: React.FC<Props> = ({
  quotes,
  activeBcvRate,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  visibleColumns = defaultColumns,
  onSelectQuote,
  onCancelQuote,
  onCopyCorrelativo
}) => {
  const today = new Date().toISOString().split('T')[0]

  // Calcular número total de columnas visibles para el colSpan del estado vacío
  let totalCols = 3 // Checkbox, Correlativo, Proveedor, Acciones = 4

  if (visibleColumns.refProveedor) totalCols++
  if (visibleColumns.fechaVigencia) totalCols++
  if (visibleColumns.costoUsd) totalCols++
  if (visibleColumns.costoVes) totalCols++
  if (visibleColumns.estado) totalCols++

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
      <Table sx={{ minWidth: 880 }}>
        <TableHead sx={{ backgroundColor: '#F4F3F8' }}>
          <TableRow>
            {/* Checkbox de Selección General */}
            <TableCell padding='checkbox' sx={{ width: 44, p: 0.5 }}>
              <Checkbox
                indeterminate={selectedIds.length > 0 && selectedIds.length < quotes.length}
                checked={quotes.length > 0 && selectedIds.length === quotes.length}
                onChange={e => onToggleSelectAll?.(e.target.checked)}
                sx={{
                  color: '#6C5CE7',
                  '&.Mui-checked': { color: '#6C5CE7' },
                  '&.MuiCheckbox-indeterminate': { color: '#6C5CE7' }
                }}
              />
            </TableCell>

            <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Correlativo</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Proveedor (Nombre + RIF)</TableCell>

            {visibleColumns.refProveedor && (
              <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Ref. Proveedor</TableCell>
            )}

            {visibleColumns.fechaVigencia && (
              <TableCell sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>Fecha / Vigencia</TableCell>
            )}

            {visibleColumns.costoUsd && (
              <TableCell align='right' sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>
                Costo Base (USD)
              </TableCell>
            )}

            {visibleColumns.costoVes && (
              <TableCell align='right' sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>
                Costo (VES)
              </TableCell>
            )}

            {visibleColumns.estado && (
              <TableCell align='center' sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>
                Estado
              </TableCell>
            )}

            <TableCell align='center' sx={{ fontWeight: 600, color: '#1E1B2E', py: 1.8 }}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {quotes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalCols + 1} align='center' sx={{ py: 6 }}>
                <div className='flex flex-col items-center justify-center gap-2'>
                  <span className='flex items-center justify-center w-12 h-12 rounded-full bg-[#F0EEF9] text-[#6C5CE7]'>
                    <i className='tabler-shopping-bag-exclamation text-2xl' />
                  </span>
                  <Typography variant='body1' className='font-semibold text-[#1E1B2E]'>
                    No se encontraron registros de compras
                  </Typography>
                  <Typography variant='body2' className='text-[#6B7280]'>
                    Ajuste los filtros de búsqueda o registre una nueva Solicitud de Cotización de Proveedor.
                  </Typography>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            quotes.map(quote => {
              const displayCorrelativo = quote.correlativo_orden_compra || quote.correlativo

              const isValidityExpired =
                quote.estado === 'RFQ_SENT' && quote.fecha_vencimiento_cotizacion < today

              const isRateOutdated =
                quote.estado === 'RFQ_SENT' && Math.abs(quote.tasa_bcv.tasa - activeBcvRate) > 0.001

              const isSelected = selectedIds.includes(quote.id)

              return (
                <TableRow
                  key={quote.id}
                  hover
                  selected={isSelected}
                  onClick={() => onSelectQuote(quote)}
                  sx={{
                    cursor: 'pointer',
                    height: '66px',
                    transition: 'background-color 0.15s ease',
                    backgroundColor: isSelected ? 'rgba(108, 92, 231, 0.06) !important' : undefined,
                    '&:hover': {
                      backgroundColor: isSelected
                        ? 'rgba(108, 92, 231, 0.1) !important'
                        : '#FAF9FF !important'
                    }
                  }}
                >
                  {/* Checkbox de Fila */}
                  <TableCell
                    padding='checkbox'
                    sx={{ width: 44, p: 0.5 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(quote.id)}
                      sx={{
                        color: '#6C5CE7',
                        '&.Mui-checked': { color: '#6C5CE7' }
                      }}
                    />
                  </TableCell>

                  {/* Correlativo */}
                  <TableCell sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div className='flex flex-col' onClick={e => e.stopPropagation()}>
                      <div className='flex items-center gap-1'>
                        <span className='font-bold text-sm text-[#6C5CE7]'>{displayCorrelativo}</span>
                        <Tooltip title='Copiar correlativo' arrow>
                          <IconButton
                            size='small'
                            onClick={() => onCopyCorrelativo(displayCorrelativo)}
                            sx={{ color: '#9CA3AF', '&:hover': { color: '#6C5CE7' }, p: 0.4 }}
                          >
                            <i className='tabler-copy text-xs' />
                          </IconButton>
                        </Tooltip>
                      </div>
                      {quote.correlativo_orden_compra && (
                        <span className='text-[11px] text-[#6B7280]'>Origen: {quote.correlativo}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Proveedor (Nombre + RIF) */}
                  <TableCell sx={{ py: 1, verticalAlign: 'middle', maxWidth: 230 }}>
                    <div className='flex flex-col'>
                      <Tooltip title={quote.proveedor.razon_social} arrow>
                        <span className='font-semibold text-sm text-[#1E1B2E] truncate'>
                          {quote.proveedor.razon_social}
                        </span>
                      </Tooltip>
                      <span className='text-xs text-[#6B7280]'>
                        {quote.proveedor.identificacion} ·{' '}
                        {quote.condicion_pago === 'CREDITO' ? `Créd. ${quote.dias_credito}d` : 'Contado'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Ref. Proveedor */}
                  {visibleColumns.refProveedor && (
                    <TableCell sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {quote.referencia_proveedor ? (
                        <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4F3F8] text-[#1E1B2E] border border-[#E6E4F0]'>
                          {quote.referencia_proveedor}
                        </span>
                      ) : (
                        <span className='text-xs text-[#9CA3AF]'>Sin ref.</span>
                      )}
                    </TableCell>
                  )}

                  {/* Fecha / Vigencia */}
                  {visibleColumns.fechaVigencia && (
                    <TableCell sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div className='flex flex-col'>
                        <span className='text-xs font-medium text-[#1E1B2E]'>{quote.fecha_registro}</span>
                        <div className='flex items-center gap-1'>
                          <span
                            className={`text-[11px] ${
                              isValidityExpired || isRateOutdated
                                ? 'text-[#F59E0B] font-semibold'
                                : 'text-[#6B7280]'
                            }`}
                          >
                            Vig: {quote.fecha_vencimiento_cotizacion}
                          </span>
                          {(isValidityExpired || isRateOutdated) && (
                            <Tooltip
                              title='La tasa BCV o vigencia ha cambiado, actualice los costos del presupuesto'
                              arrow
                            >
                              <span className='inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#FEF3C7] text-[#D97706]'>
                                <i className='tabler-alert-triangle text-[11px]' />
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Costo Base (USD) */}
                  {visibleColumns.costoUsd && (
                    <TableCell align='right' sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div className='flex flex-col items-end'>
                        <span className='font-bold text-sm text-[#1E1B2E]'>
                          ${quote.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {!quote.aplica_iva_compras && (
                          <span className='text-[10px] text-[#6B7280] font-medium bg-[#F4F3F8] px-1.5 py-0.2 rounded-full border border-[#E6E4F0]'>
                            Costo Neto
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Costo (VES) */}
                  {visibleColumns.costoVes && (
                    <TableCell align='right' sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div className='flex flex-col items-end'>
                        <span className='font-semibold text-xs text-[#10B981]'>
                          Bs.{' '}
                          {quote.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className='text-[10px] text-[#9CA3AF]'>Tasa: {quote.tasa_bcv.tasa.toFixed(2)}</span>
                      </div>
                    </TableCell>
                  )}

                  {/* Estado */}
                  {visibleColumns.estado && (
                    <TableCell align='center' sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <PurchaseStatusChip status={quote.estado} />
                    </TableCell>
                  )}

                  {/* Acciones */}
                  <TableCell align='right' sx={{ py: 1, verticalAlign: 'middle', whiteSpace: 'nowrap', width: 120 }}>
                    <div className='flex justify-end items-center gap-0.5' onClick={e => e.stopPropagation()}>
                      <Tooltip title='Vista Rápida' arrow>
                        <IconButton
                          size='small'
                          onClick={() => onSelectQuote(quote)}
                          sx={{ color: '#6B7280', '&:hover': { color: '#6C5CE7' } }}
                        >
                          <i className='tabler-eye text-base' />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title='Abrir Ficha Completa y Acciones (Aprobar / OC)' arrow>
                        <IconButton
                          size='small'
                          component={Link}
                          href={`/purchases/quotes/${quote.id}`}
                          sx={{ color: '#6C5CE7', '&:hover': { color: '#5A4AD1' } }}
                        >
                          <i className='tabler-arrow-up-right text-base' />
                        </IconButton>
                      </Tooltip>

                      {(quote.estado === 'DRAFT' || quote.estado === 'RFQ_SENT') && (
                        <Tooltip title='Editar Solicitud' arrow>
                          <IconButton
                            size='small'
                            component={Link}
                            href={`/purchases/quotes/${quote.id}/edit`}
                            sx={{ color: '#0284C7', '&:hover': { color: '#0369A1' } }}
                          >
                            <i className='tabler-edit text-base' />
                          </IconButton>
                        </Tooltip>
                      )}

                      {quote.estado !== 'CANCELED' && (
                        <Tooltip title='Anular Compra' arrow>
                          <IconButton
                            size='small'
                            onClick={() => onCancelQuote(quote)}
                            sx={{ color: '#EF4444', '&:hover': { color: '#DC2626' } }}
                          >
                            <i className='tabler-ban text-base' />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
