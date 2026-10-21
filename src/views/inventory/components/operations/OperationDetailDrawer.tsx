'use client'

import React from 'react'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import CustomChip from '@core/components/mui/Chip'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import type { WarehouseOperationOrder } from '@/types/inventoryTypes'
import type { OperationConfigMeta } from './operationConstants'
import { STATUS_META } from './operationConstants'

interface OperationDetailDrawerProps {
  order: WarehouseOperationOrder | null
  cfg: OperationConfigMeta
  bcvRate: number
  editedQtys: Record<string, string>
  onQtyChange: (lineId: string, val: string) => void
  validating: boolean
  onClose: () => void
  onValidate: (order: WarehouseOperationOrder, customQtys: Record<string, number>) => void
  onCancelOrder: (orderId: string) => void
}

const OperationDetailDrawer: React.FC<OperationDetailDrawerProps> = ({
  order,
  cfg,
  bcvRate,
  editedQtys,
  onQtyChange,
  validating,
  onClose,
  onValidate,
  onCancelOrder
}) => {
  if (!order) return null

  const st = STATUS_META[order.estado] || STATUS_META.READY
  const isEditable = order.estado !== 'COMPLETED' && order.estado !== 'CANCELLED'

  const totalValuationUsd = order.lineas.reduce((acc, l) => {
    const qty = isEditable
      ? Number(editedQtys[l.id] ?? l.cantidad_demanda)
      : l.cantidad_procesada

    return acc + qty * l.costo_unitario_usd
  }, 0)

  return (
    <Drawer
      anchor='right'
      open={Boolean(order)}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 580 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0',
          p: 0
        }
      }}
    >
      <div className='flex flex-col h-full'>
        {/* Header */}
        <div className='p-5 bg-[#FAFAFC] border-b border-[#E6E4F0] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className='w-10 h-10 rounded-full flex items-center justify-center'
              style={{ backgroundColor: cfg.accentBg, color: cfg.accentColor }}
            >
              <i className={`${cfg.icon} text-lg`} />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-mono text-xs font-bold text-[#6C5CE7]'>
                  {order.codigo}
                </span>
                <CustomChip
                  size='small'
                  variant='tonal'
                  color={st.color}
                  label={st.label}
                />
              </div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E] leading-tight mt-0.5'>
                {order.tercero_nombre}
              </Typography>
            </div>
          </div>
          <IconButton onClick={onClose} size='small'>
            <i className='tabler-x text-lg text-[#6B7280]' />
          </IconButton>
        </div>

        {/* Body */}
        <div className='p-5 flex-1 overflow-y-auto flex flex-col gap-4'>
          {/* Route Origin -> Destination */}
          <div className='p-4 rounded-2xl bg-[#F4F3F8]/70 border border-[#E6E4F0] grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <span className='text-[10px] uppercase tracking-wider text-[#6B7280] font-bold block'>
                Ubicación Origen (Salida)
              </span>
              <span className='font-bold text-sm text-[#1E1B2E] block mt-0.5'>
                {order.almacen_origen_nombre}
              </span>
              {order.ubicacion_origen_nombre && (
                <span className='text-xs font-mono text-[#6C5CE7] block mt-0.5'>
                  {order.ubicacion_origen_nombre}
                </span>
              )}
            </div>

            <div>
              <span className='text-[10px] uppercase tracking-wider text-[#6B7280] font-bold block'>
                Ubicación Destino (Entrada)
              </span>
              <span className='font-bold text-sm text-[#6C5CE7] block mt-0.5'>
                {order.almacen_destino_nombre}
              </span>
              {order.ubicacion_destino_nombre && (
                <span className='text-xs font-mono text-[#1E1B2E] block mt-0.5'>
                  {order.ubicacion_destino_nombre}
                </span>
              )}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
            <div className='p-3 rounded-xl border border-[#E6E4F0]'>
              <span className='text-[10px] uppercase font-bold text-[#6B7280] block'>
                Documento Origen
              </span>
              <span className='font-mono font-bold text-xs text-[#1E1B2E] mt-0.5 block'>
                {order.documento_origen || 'Registro Directo'}
              </span>
            </div>

            <div className='p-3 rounded-xl border border-[#E6E4F0]'>
              <span className='text-[10px] uppercase font-bold text-[#6B7280] block'>
                Fecha Programada
              </span>
              <span className='font-bold text-xs text-[#1E1B2E] mt-0.5 block'>
                {order.fecha_programada}
              </span>
            </div>

            <div className='p-3 rounded-xl border border-[#E6E4F0] col-span-2 sm:col-span-1'>
              <span className='text-[10px] uppercase font-bold text-[#6B7280] block'>
                Responsable
              </span>
              <span className='font-bold text-xs text-[#1E1B2E] mt-0.5 block'>
                {order.responsable}
              </span>
            </div>
          </div>

          {/* Product Lines Table */}
          <div className='rounded-2xl border border-[#E6E4F0] overflow-hidden'>
            <div className='bg-[#F4F3F8] px-4 py-2.5 border-b border-[#E6E4F0] flex items-center justify-between'>
              <span className='text-xs font-bold text-[#1E1B2E] uppercase tracking-wider'>
                Líneas de Productos ({order.lineas.length})
              </span>
              {isEditable && (
                <span className='text-[11px] text-[#6C5CE7] font-semibold'>
                  Puedes ajustar la cantidad antes de validar
                </span>
              )}
            </div>

            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='border-b border-[#E6E4F0] text-[10px] uppercase text-[#6B7280] font-bold bg-[#FAFAFC]'>
                  <th className='py-2.5 px-3'>Artículo / SKU</th>
                  <th className='py-2.5 px-3 text-right w-[90px]'>Demanda</th>
                  <th className='py-2.5 px-3 text-right w-[120px]'>
                    {isEditable ? 'Cant. a Procesar' : 'Procesado'}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E6E4F0] text-xs'>
                {order.lineas.map(line => (
                  <tr key={line.id}>
                    <td className='py-2.5 px-3'>
                      <span className='font-bold text-[#1E1B2E] block'>
                        {line.producto_nombre}
                      </span>
                      <span className='font-mono text-[11px] text-[#6C5CE7]'>
                        {line.variante_sku}
                      </span>
                      <span className='text-[10px] text-[#9CA3AF] ml-2'>
                        Costo: ${line.costo_unitario_usd.toFixed(2)}/{line.uom_code}
                      </span>
                    </td>

                    <td className='py-2.5 px-3 text-right font-semibold text-[#6B7280]'>
                      {line.cantidad_demanda} {line.uom_code}
                    </td>

                    <td className='py-2.5 px-3 text-right'>
                      {isEditable ? (
                        <TextField
                          size='small'
                          type='number'
                          value={editedQtys[line.id] ?? String(line.cantidad_demanda)}
                          onChange={e => onQtyChange(line.id, e.target.value)}
                          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                          sx={{
                            width: 95,
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '10px',
                              backgroundColor: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }
                          }}
                        />
                      ) : (
                        <span className='font-bold text-[#10B981]'>
                          {line.cantidad_procesada} {line.uom_code}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Valuation Summary */}
          <div className='p-3.5 rounded-2xl bg-[#F0EEF9]/60 border border-[#DCD8EC] flex items-center justify-between flex-wrap gap-2'>
            <span className='text-xs font-bold text-[#1E1B2E]'>
              Valoración Costo de la Operación:
            </span>
            <div className='text-right'>
              <span className='font-bold text-sm text-[#6C5CE7] block'>
                ${totalValuationUsd.toFixed(2)} USD
              </span>
              <span className='text-[11px] font-medium text-[#6B7280]'>
                ≈ Bs.{' '}
                {(totalValuationUsd * bcvRate).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>

          {/* Notes */}
          {order.notas && (
            <div className='p-3.5 rounded-2xl border border-[#E6E4F0] bg-[#FAFAFC]'>
              <span className='text-[10px] uppercase tracking-wider text-[#6B7280] font-bold block mb-1'>
                Notas y Observaciones
              </span>
              <p className='text-xs text-[#1E1B2E] leading-relaxed'>{order.notas}</p>
            </div>
          )}

          {order.fecha_efectiva && (
            <div className='p-3 rounded-xl bg-[#E8F5E9] text-[#10B981] text-xs font-semibold flex items-center gap-2'>
              <i className='tabler-circle-check text-base' />
              <span>
                Operación validada el{' '}
                {new Date(order.fecha_efectiva).toLocaleString('es-VE')} y asentada en el Kárdex.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className='p-4 bg-[#FAFAFC] border-t border-[#E6E4F0] flex items-center justify-between gap-2'>
          {isEditable ? (
            <>
              <Button
                variant='outlined'
                color='error'
                onClick={() => onCancelOrder(order.id)}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Anular
              </Button>

              <div className='flex items-center gap-2'>
                <Button
                  variant='outlined'
                  onClick={onClose}
                  sx={{
                    borderRadius: '9999px',
                    textTransform: 'none',
                    borderColor: '#DCD8EC',
                    color: '#6B7280',
                    fontWeight: 600
                  }}
                >
                  Cerrar
                </Button>

                <Button
                  variant='contained'
                  disabled={validating}
                  onClick={() => {
                    const parsedMap: Record<string, number> = {}

                    Object.entries(editedQtys).forEach(([k, v]) => {
                      parsedMap[k] = Math.max(0, Number(v) || 0)
                    })
                    onValidate(order, parsedMap)
                  }}
                  sx={{
                    borderRadius: '9999px',
                    textTransform: 'none',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    px: 3,
                    '&:hover': { backgroundColor: '#059669' }
                  }}
                  startIcon={<i className='tabler-check text-base' />}
                >
                  {validating ? 'Validando...' : 'Validar'}
                </Button>
              </div>
            </>
          ) : (
            <Button
              fullWidth
              variant='outlined'
              onClick={onClose}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                borderColor: '#DCD8EC',
                color: '#1E1B2E',
                fontWeight: 600
              }}
            >
              Cerrar
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  )
}

export default OperationDetailDrawer
