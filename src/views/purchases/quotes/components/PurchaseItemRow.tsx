'use client'

import React from 'react'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CustomTextField from '@core/components/mui/TextField'
import CustomAutocomplete from '@core/components/mui/Autocomplete'
import { PurchaseProductLookup } from '@/types/purchasesTypes'

export interface FormPurchaseItemLine {
  id: string
  producto_id: string
  producto_sku: string
  producto_nombre: string
  uom_code: string
  is_physical_stock: boolean
  cantidad: number
  costo_unitario: number
  descuento_proveedor_porcentaje: number
  alicuota_iva: '16' | '8' | '0' | 'EXEMPT'
}

interface Props {
  index: number
  line: FormPurchaseItemLine
  products: PurchaseProductLookup[]
  tasaBcv: number
  aplicaIvaCompras?: boolean
  onUpdate: (updated: FormPurchaseItemLine) => void
  onRemove: () => void
  disabled?: boolean
}

export const PurchaseItemRow: React.FC<Props> = ({
  index,
  line,
  products,
  tasaBcv,
  aplicaIvaCompras = true,
  onUpdate,
  onRemove,
  disabled = false
}) => {
  const selectedProduct = products.find(p => p.id === line.producto_id) || null

  const rawCost = (line.cantidad || 0) * (line.costo_unitario || 0)
  const discountAmount = rawCost * ((line.descuento_proveedor_porcentaje || 0) / 100)
  const netSubtotal = rawCost - discountAmount
  const netSubtotalVes = netSubtotal * tasaBcv

  const isInvalidQty = line.cantidad <= 0
  const isInvalidCost = line.costo_unitario <= 0

  const handleProductChange = (_event: any, prod: PurchaseProductLookup | null) => {
    if (!prod) return
    onUpdate({
      ...line,
      producto_id: prod.id,
      producto_sku: prod.sku,
      producto_nombre: prod.nombre,
      uom_code: prod.uom_code,
      is_physical_stock: prod.is_physical_stock,
      costo_unitario: prod.costo_unitario_ult_compra_usd,
      alicuota_iva: prod.alicuota_iva || '16'
    })
  }

  return (
    <TableRow
      sx={{
        backgroundColor: isInvalidQty || isInvalidCost ? '#FFF5F5' : '#FFFFFF',
        height: '48px',
        '&:hover': {
          backgroundColor: isInvalidQty || isInvalidCost ? '#FEE2E2 !important' : '#FAFAFC !important'
        }
      }}
    >
      {/* # Index compacto 28px-32px (EARS-UB-07) */}
      <TableCell
        sx={{
          width: 28,
          minWidth: 28,
          maxWidth: 32,
          px: 0.5,
          py: 0.8,
          color: '#9CA3AF',
          fontSize: '0.78rem',
          textAlign: 'center'
        }}
      >
        {index + 1}
      </TableCell>

      {/* Producto / Insumo / Servicio Picker */}
      <TableCell sx={{ minWidth: 260, py: 0.8 }}>
        <div className='flex flex-col gap-1'>
          <CustomAutocomplete
            size='small'
            disabled={disabled}
            options={products}
            value={selectedProduct}
            isOptionEqualToValue={(opt: PurchaseProductLookup, val: PurchaseProductLookup) => opt.id === val.id}
            getOptionLabel={(opt: PurchaseProductLookup) => `${opt.sku} - ${opt.nombre}`}
            onChange={handleProductChange}
            sx={{
              '& .MuiInputBase-root': {
                minHeight: '34px',
                height: '34px',
                backgroundColor: '#F4F3F8',
                borderRadius: '10px',
                border: '1px solid #DCD8EC',
                fontSize: '0.82rem',
                padding: '0 8px'
              },
              '& .MuiInputBase-input': {
                padding: '3px 4px !important',
                fontSize: '0.82rem'
              }
            }}
            renderOption={(props: any, opt: PurchaseProductLookup) => (
              <li
                {...props}
                key={opt.id}
                className='p-2 text-xs hover:bg-[#F0EEF9] cursor-pointer border-b border-[#F4F3F8]'
              >
                <div className='flex flex-col gap-0.5 w-full'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-[#1E1B2E]'>{opt.nombre}</span>
                    <span className='font-bold text-[#6C5CE7]'>
                      ${opt.costo_unitario_ult_compra_usd.toFixed(2)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-[#6B7280]'>
                    <span>
                      SKU: {opt.sku} ({opt.uom_code})
                    </span>
                    {opt.is_physical_stock ? (
                      <span className='text-[#10B981] font-medium'>
                        Almacenable · En tránsito: {opt.stock_en_transito_actual}
                      </span>
                    ) : (
                      <span className='text-[#0284C7] font-medium'>Servicio / Gasto (Sin recepción física)</span>
                    )}
                  </div>
                </div>
              </li>
            )}
            renderInput={(params: any) => (
              <CustomTextField
                {...params}
                placeholder='Seleccione producto, insumo o servicio...'
                error={!line.producto_id}
              />
            )}
          />
        </div>
      </TableCell>

      {/* Cantidad */}
      <TableCell sx={{ width: 95, py: 0.8 }}>
        <CustomTextField
          size='small'
          type='number'
          disabled={disabled}
          value={line.cantidad}
          onChange={e => {
            const val = parseFloat(e.target.value)
            onUpdate({ ...line, cantidad: isNaN(val) ? 0 : val })
          }}
          inputProps={{ min: 1, step: 1 }}
          error={isInvalidQty}
          sx={{
            width: '76px',
            '& .MuiInputBase-root': {
              minHeight: '34px',
              height: '34px',
              backgroundColor: isInvalidQty ? '#FEE2E2' : '#F4F3F8',
              borderRadius: '10px',
              border: `1px solid ${isInvalidQty ? '#FCA5A5' : '#DCD8EC'}`,
              fontSize: '0.82rem'
            },
            '& .MuiInputBase-input': {
              padding: '3px 4px !important',
              textAlign: 'center'
            }
          }}
        />
      </TableCell>

      {/* Costo Unitario (USD) */}
      <TableCell sx={{ width: 115, py: 0.8 }}>
        <CustomTextField
          size='small'
          type='number'
          disabled={disabled}
          value={line.costo_unitario}
          onChange={e => {
            const val = parseFloat(e.target.value)
            onUpdate({ ...line, costo_unitario: isNaN(val) ? 0 : val })
          }}
          inputProps={{ min: 0.01, step: 0.5 }}
          error={isInvalidCost}
          sx={{
            width: '100%',
            '& .MuiInputBase-root': {
              minHeight: '34px',
              height: '34px',
              backgroundColor: isInvalidCost ? '#FEE2E2' : '#F4F3F8',
              borderRadius: '10px',
              border: `1px solid ${isInvalidCost ? '#FCA5A5' : '#DCD8EC'}`,
              fontSize: '0.82rem'
            },
            '& .MuiInputBase-input': {
              padding: '3px 6px !important',
              textAlign: 'right'
            }
          }}
        />
      </TableCell>

      {/* Descuento Proveedor % */}
      <TableCell sx={{ width: 85, py: 0.8 }}>
        <CustomTextField
          size='small'
          type='number'
          disabled={disabled}
          value={line.descuento_proveedor_porcentaje}
          onChange={e => {
            const val = parseFloat(e.target.value)
            onUpdate({
              ...line,
              descuento_proveedor_porcentaje: isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
            })
          }}
          inputProps={{ min: 0, max: 100, step: 1 }}
          sx={{
            width: '100%',
            '& .MuiInputBase-root': {
              minHeight: '34px',
              height: '34px',
              backgroundColor: '#F4F3F8',
              borderRadius: '10px',
              border: '1px solid #DCD8EC',
              fontSize: '0.82rem'
            },
            '& .MuiInputBase-input': {
              padding: '3px 4px !important',
              textAlign: 'center'
            }
          }}
        />
      </TableCell>

      {/* Chip Monolínea de Alícuota IVA 22px (EARS-UB-08) */}
      <TableCell align='center' sx={{ width: 58, minWidth: 58, px: 0.5, py: 0.8 }}>
        {!aplicaIvaCompras ? (
          <Tooltip title='Modo Costo Neto (Sin Crédito Fiscal IVA)' arrow>
            <span className='inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-medium bg-[#F4F3F8] text-[#9CA3AF] border border-[#E6E4F0] whitespace-nowrap leading-none select-none'>
              0%
            </span>
          </Tooltip>
        ) : line.alicuota_iva === 'EXEMPT' || line.alicuota_iva === '0' ? (
          <Tooltip title='Exento (0%). Clic para cambiar a IVA General 16%' arrow>
            <button
              type='button'
              disabled={disabled}
              onClick={() => onUpdate({ ...line, alicuota_iva: '16' })}
              className='inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-semibold bg-[#F4F3F8] text-[#6B7280] border border-[#DCD8EC] hover:bg-[#EAE8F4] transition-colors cursor-pointer whitespace-nowrap leading-none select-none'
            >
              0%
            </button>
          </Tooltip>
        ) : line.alicuota_iva === '8' ? (
          <Tooltip title='Alícuota Reducida 8%. Clic para cambiar a Exento (0%)' arrow>
            <button
              type='button'
              disabled={disabled}
              onClick={() => onUpdate({ ...line, alicuota_iva: 'EXEMPT' })}
              className='inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] hover:bg-[#BAE6FD] transition-colors cursor-pointer whitespace-nowrap leading-none select-none'
            >
              8%
            </button>
          </Tooltip>
        ) : (
          <Tooltip title='IVA General 16%. Clic para alternar (8% / Exento)' arrow>
            <button
              type='button'
              disabled={disabled}
              onClick={() => onUpdate({ ...line, alicuota_iva: '8' })}
              className='inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-bold bg-[#F0EEF9] text-[#6C5CE7] border border-[#DCD8EC] hover:bg-[#E5E0F8] transition-colors cursor-pointer whitespace-nowrap leading-none select-none'
            >
              16%
            </button>
          </Tooltip>
        )}
      </TableCell>

      {/* Subtotal Neto Línea (USD & VES) */}
      <TableCell align='right' sx={{ width: 125, py: 0.8 }}>
        <div className='flex flex-col items-end'>
          <span className='font-bold text-sm text-[#1E1B2E]'>${netSubtotal.toFixed(2)}</span>
          <span className='text-[11px] text-[#9CA3AF]'>Bs. {netSubtotalVes.toFixed(2)}</span>
        </div>
      </TableCell>

      {/* Eliminar Fila */}
      <TableCell align='center' sx={{ width: 44, py: 0.8 }}>
        <Tooltip title='Eliminar línea' arrow>
          <IconButton
            size='small'
            disabled={disabled}
            onClick={onRemove}
            sx={{
              width: 30,
              height: 30,
              color: '#EF4444',
              borderRadius: '8px',
              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
            }}
          >
            <i className='tabler-trash text-sm' />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  )
}
