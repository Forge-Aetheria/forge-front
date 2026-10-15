'use client';

import React, { useState } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CustomTextField from '@core/components/mui/TextField';
import CustomAutocomplete from '@core/components/mui/Autocomplete';
import { ProductLookup } from '@/types/salesQuotesTypes';

export interface FormItemLine {
  id: string;
  producto_id: string;
  producto_sku: string;
  producto_nombre: string;
  is_physical_stock: boolean;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  alicuota_iva?: string;
  stock_disponible: number;
}

interface Props {
  index: number;
  line: FormItemLine;
  products: ProductLookup[];
  tasaBcv: number;
  quoteAplicaIva?: boolean;
  onUpdate: (updated: FormItemLine) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export const QuoteItemRow: React.FC<Props> = ({
  index,
  line,
  products,
  tasaBcv,
  quoteAplicaIva = true,
  onUpdate,
  onRemove,
  disabled = false
}) => {
  const [stockPopoverAnchor, setStockPopoverAnchor] = useState<HTMLElement | null>(null);

  const selectedProduct = products.find(p => p.id === line.producto_id) || null;

  const rawSubtotal = line.cantidad * line.precio_unitario;
  const discountAmount = rawSubtotal * ((line.descuento_porcentaje || 0) / 100);
  const netSubtotal = rawSubtotal - discountAmount;
  const netSubtotalVes = netSubtotal * tasaBcv;

  const isStockInsufficient =
    line.is_physical_stock && line.cantidad > line.stock_disponible;

  const handleProductChange = (_event: any, prod: ProductLookup | null) => {
    if (!prod) return;
    onUpdate({
      ...line,
      producto_id: prod.id,
      producto_sku: prod.sku,
      producto_nombre: prod.nombre,
      is_physical_stock: prod.is_physical_stock,
      precio_unitario: prod.precio_unitario_base,
      alicuota_iva: prod.alicuota_iva || '16',
      stock_disponible: prod.stock_disponible
    });
  };

  return (
    <TableRow
      sx={{
        backgroundColor: isStockInsufficient ? '#FFF5F5' : '#FFFFFF',
        height: '48px',
        '&:hover': {
          backgroundColor: isStockInsufficient ? '#FEE2E2 !important' : '#FAFAFC !important'
        }
      }}
    >
      {/* # Index */}
      <TableCell sx={{ width: 28, minWidth: 28, maxWidth: 32, px: 0.5, py: 0.8, color: '#9CA3AF', fontSize: '0.78rem', textAlign: 'center' }}>
        {index + 1}
      </TableCell>

      {/* Producto Picker */}
      <TableCell sx={{ minWidth: 260, py: 0.8 }}>
        <CustomAutocomplete
          size="small"
          disabled={disabled}
          options={products}
          value={selectedProduct}
          isOptionEqualToValue={(opt: any, val: any) => opt.id === val.id}
          getOptionLabel={(opt: any) => `${opt.sku} - ${opt.nombre}`}
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
          renderOption={(props: any, opt: any) => (
            <li {...props} key={opt.id} className="p-2 text-xs hover:bg-[#F0EEF9] cursor-pointer border-b border-[#F4F3F8]">
              <div className="flex flex-col gap-0.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1E1B2E]">{opt.nombre}</span>
                  <span className="font-bold text-[#6C5CE7]">${opt.precio_unitario_base.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280]">
                  <span>SKU: {opt.sku}</span>
                  {opt.is_physical_stock ? (
                    <span className={opt.stock_disponible > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                      Stock: {opt.stock_disponible}
                    </span>
                  ) : (
                    <span className="text-[#38BDF8]">
                      {opt.tipo === 'SERVICE' ? 'Servicio' : 'Bajo Pedido'}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )}
          renderInput={(params: any) => (
            <CustomTextField
              {...params}
              placeholder="Seleccione un producto..."
              error={!line.producto_id}
            />
          )}
        />
      </TableCell>

      {/* Cantidad + Indicador Interactivo de Stock */}
      <TableCell sx={{ width: 130, py: 0.8 }}>
        <div className="flex items-center gap-1.5">
          <CustomTextField
            size="small"
            type="number"
            disabled={disabled}
            value={line.cantidad}
            onChange={e => {
              const val = parseFloat(e.target.value);
              onUpdate({ ...line, cantidad: isNaN(val) ? 1 : Math.max(1, val) });
            }}
            inputProps={{ min: 1, step: 1 }}
            error={isStockInsufficient}
            sx={{
              width: '64px',
              '& .MuiInputBase-root': {
                minHeight: '34px',
                height: '34px',
                backgroundColor: isStockInsufficient ? '#FEE2E2' : '#F4F3F8',
                borderRadius: '10px',
                border: `1px solid ${isStockInsufficient ? '#FCA5A5' : '#DCD8EC'}`,
                fontSize: '0.82rem'
              },
              '& .MuiInputBase-input': {
                padding: '3px 4px !important',
                textAlign: 'center'
              }
            }}
          />

          {/* Botón Indicador de Stock con Popover al dar clic */}
          {selectedProduct && (
            <>
              <Tooltip
                title={
                  line.is_physical_stock
                    ? isStockInsufficient
                      ? `¡Stock insuficiente! Disponible: ${line.stock_disponible}`
                      : `Stock disponible: ${line.stock_disponible} (Clic para ver detalle)`
                    : 'Servicio / Bajo pedido (Clic para ver detalle)'
                }
                arrow
              >
                <IconButton
                  size="small"
                  onClick={e => setStockPopoverAnchor(e.currentTarget)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    backgroundColor: !line.is_physical_stock
                      ? '#F0EEF9'
                      : isStockInsufficient
                      ? '#FEE2E2'
                      : '#E8F5E9',
                    color: !line.is_physical_stock
                      ? '#6C5CE7'
                      : isStockInsufficient
                      ? '#EF4444'
                      : '#10B981',
                    border: `1px solid ${
                      !line.is_physical_stock
                        ? '#DCD8EC'
                        : isStockInsufficient
                        ? '#FCA5A5'
                        : '#A5D6A7'
                    }`,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: !line.is_physical_stock
                        ? '#E0DBF7'
                        : isStockInsufficient
                        ? '#FECACA'
                        : '#C8E6C9',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <i
                    className={`text-sm ${
                      !line.is_physical_stock
                        ? 'tabler-infinity'
                        : isStockInsufficient
                        ? 'tabler-alert-triangle'
                        : 'tabler-packages'
                    }`}
                  />
                </IconButton>
              </Tooltip>

              {/* Popover con Detalle de Stock */}
              <Popover
                open={Boolean(stockPopoverAnchor)}
                anchorEl={stockPopoverAnchor}
                onClose={() => setStockPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                PaperProps={{
                  sx: {
                    p: 2,
                    borderRadius: '16px',
                    border: '1px solid #E6E4F0',
                    boxShadow: '0 8px 24px rgba(108, 92, 231, 0.12)',
                    minWidth: 240,
                    backgroundColor: '#FFFFFF'
                  }
                }}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-bold text-xs text-[#1E1B2E]">
                      Disponibilidad en Almacén
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        !line.is_physical_stock
                          ? 'bg-[#F0EEF9] text-[#6C5CE7]'
                          : isStockInsufficient
                          ? 'bg-[#FEE2E2] text-[#EF4444]'
                          : 'bg-[#E8F5E9] text-[#2E7D32]'
                      }`}
                    >
                      {!line.is_physical_stock
                        ? 'Sin límite'
                        : isStockInsufficient
                        ? 'Insuficiente'
                        : 'Disponible'}
                    </span>
                  </div>

                  <span className="text-xs text-[#6B7280] font-medium">
                    {line.producto_nombre}
                  </span>

                  <Divider sx={{ borderColor: '#F4F3F8', my: 0.5 }} />

                  {line.is_physical_stock ? (
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between text-[#6B7280]">
                        <span>Existencia física:</span>
                        <strong className="text-[#1E1B2E]">
                          {selectedProduct.stock_fisico} un.
                        </strong>
                      </div>
                      <div className="flex justify-between text-[#6B7280]">
                        <span>Comprometido:</span>
                        <strong className="text-[#F59E0B]">
                          {selectedProduct.stock_comprometido} un.
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[#F4F3F8]">
                        <span className="font-semibold text-[#1E1B2E]">
                          Stock Disponible:
                        </span>
                        <strong
                          className={`text-sm ${
                            isStockInsufficient ? 'text-[#EF4444]' : 'text-[#10B981]'
                          }`}
                        >
                          {line.stock_disponible} un.
                        </strong>
                      </div>
                      <div className="flex justify-between text-xs text-[#6B7280] pt-1">
                        <span>Cantidad en presupuesto:</span>
                        <strong className="text-[#6C5CE7]">{line.cantidad} un.</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#6B7280] flex flex-col gap-1">
                      <p>
                        Este ítem es un <strong>servicio o producto bajo pedido</strong> (Dropshipping).
                      </p>
                      <p className="text-[#10B981] font-semibold">
                        ✓ No requiere ni descuenta existencias físicas en almacén.
                      </p>
                    </div>
                  )}
                </div>
              </Popover>
            </>
          )}
        </div>
      </TableCell>

      {/* Precio Unitario */}
      <TableCell sx={{ width: 110, py: 0.8 }}>
        <CustomTextField
          size="small"
          type="number"
          disabled={disabled}
          value={line.precio_unitario}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdate({ ...line, precio_unitario: isNaN(val) ? 0 : Math.max(0, val) });
          }}
          inputProps={{ min: 0, step: 0.5 }}
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
              padding: '3px 6px !important',
              textAlign: 'right'
            }
          }}
        />
      </TableCell>

      {/* Descuento % */}
      <TableCell sx={{ width: 85, py: 0.8 }}>
        <CustomTextField
          size="small"
          type="number"
          disabled={disabled}
          value={line.descuento_porcentaje}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdate({
              ...line,
              descuento_porcentaje: isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
            });
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

      {/* Estado IVA del Ítem */}
      <TableCell align="center" sx={{ width: 55, minWidth: 55, px: 0.5, py: 0.8 }}>
        {!quoteAplicaIva ? (
          <Tooltip title="Presupuesto configurado sin IVA" arrow>
            <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-medium bg-[#F4F3F8] text-[#9CA3AF] border border-[#E6E4F0] whitespace-nowrap leading-none select-none">
              0%
            </span>
          </Tooltip>
        ) : line.alicuota_iva === 'EXEMPT' || line.alicuota_iva === '0' ? (
          <Tooltip title="Ítem exento de IVA (0%). Clic para aplicar IVA 16%" arrow>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onUpdate({ ...line, alicuota_iva: '16' })}
              className="inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-semibold bg-[#F4F3F8] text-[#6B7280] border border-[#DCD8EC] hover:bg-[#EAE8F4] transition-colors cursor-pointer whitespace-nowrap leading-none select-none"
            >
              0%
            </button>
          </Tooltip>
        ) : (
          <Tooltip title="Gravado con IVA 16%. Clic para marcar como Exento (0%)" arrow>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onUpdate({ ...line, alicuota_iva: 'EXEMPT' })}
              className="inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[11px] font-bold bg-[#F0EEF9] text-[#6C5CE7] border border-[#DCD8EC] hover:bg-[#E5E0F8] transition-colors cursor-pointer whitespace-nowrap leading-none select-none"
            >
              16%
            </button>
          </Tooltip>
        )}
      </TableCell>

      {/* Subtotal Línea (USD & VES) */}
      <TableCell align="right" sx={{ width: 120, py: 0.8 }}>
        <div className="flex flex-col items-end">
          <span className="font-bold text-sm text-[#1E1B2E]">
            ${netSubtotal.toFixed(2)}
          </span>
          <span className="text-[11px] text-[#9CA3AF]">
            Bs. {netSubtotalVes.toFixed(2)}
          </span>
        </div>
      </TableCell>

      {/* Botón Eliminar */}
      <TableCell align="center" sx={{ width: 44, py: 0.8 }}>
        <Tooltip title="Eliminar fila" arrow>
          <IconButton
            size="small"
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
            <i className="tabler-trash text-sm" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};
