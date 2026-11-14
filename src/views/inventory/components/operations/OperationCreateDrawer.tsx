'use client'

import React from 'react'

import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Autocomplete from '@mui/material/Autocomplete'
import Tooltip from '@mui/material/Tooltip'

import type { Warehouse, WarehouseOperationType } from '@/types/inventoryTypes'
import type {
  FlattenedVariantOption,
  NewOrderLineDraft,
  OperationConfigMeta
} from './operationConstants'

interface OperationCreateDrawerProps {
  open: boolean
  operationType: WarehouseOperationType
  cfg: OperationConfigMeta
  warehouses: Warehouse[]
  variantOptions: FlattenedVariantOption[]
  creating: boolean
  newPartner: string
  setNewPartner: (val: string) => void
  newDocOrigin: string
  setNewDocOrigin: (val: string) => void
  newDate: string
  setNewDate: (val: string) => void
  newResponsable: string
  setNewResponsable: (val: string) => void
  newNotes: string
  setNewNotes: (val: string) => void
  originWhId: string
  setOriginWhId: (val: string) => void
  originLocCode: string
  setOriginLocCode: (val: string) => void
  destWhId: string
  setDestWhId: (val: string) => void
  destLocCode: string
  setDestLocCode: (val: string) => void
  newLines: NewOrderLineDraft[]
  setNewLines: React.Dispatch<React.SetStateAction<NewOrderLineDraft[]>>
  onAddDraftLine: () => void
  onRemoveDraftLine: (tempId: string) => void
  onClose: () => void
  onSubmit: (validateImmediately: boolean) => void
}

const OperationCreateDrawer: React.FC<OperationCreateDrawerProps> = ({
  open,
  operationType,
  cfg,
  warehouses,
  variantOptions,
  creating,
  newPartner,
  setNewPartner,
  newDocOrigin,
  setNewDocOrigin,
  newDate,
  setNewDate,
  newResponsable,
  setNewResponsable,
  newNotes,
  setNewNotes,
  originWhId,
  setOriginWhId,
  originLocCode,
  setOriginLocCode,
  destWhId,
  setDestWhId,
  destLocCode,
  setDestLocCode,
  newLines,
  setNewLines,
  onAddDraftLine,
  onRemoveDraftLine,
  onClose,
  onSubmit
}) => {
  const originWarehouseObj = warehouses.find(w => w.id === originWhId)
  const destWarehouseObj = warehouses.find(w => w.id === destWhId)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 620 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0',
          p: 0
        }
      }}
    >
      <div className='flex flex-col h-full'>
        <div className='p-5 bg-[#FAFAFC] border-b border-[#E6E4F0] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className='w-10 h-10 rounded-full flex items-center justify-center'
              style={{ backgroundColor: cfg.accentBg, color: cfg.accentColor }}
            >
              <i className={`${cfg.icon} text-lg`} />
            </div>
            <div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                {operationType === 'RECEIPT'
                  ? 'Nueva Recepción'
                  : operationType === 'DELIVERY'
                  ? 'Nueva Entrega'
                  : 'Nueva Transferencia'}
              </Typography>
              <span className='text-xs text-[#6B7280]'>
                Completa los datos de almacén y las líneas de productos
              </span>
            </div>
          </div>
          <IconButton onClick={onClose} size='small'>
            <i className='tabler-x text-lg text-[#6B7280]' />
          </IconButton>
        </div>

        <div className='p-5 flex-1 overflow-y-auto flex flex-col gap-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <TextField
              size='small'
              label={cfg.partnerLabel}
              placeholder={cfg.partnerPlaceholder}
              value={newPartner}
              onChange={e => setNewPartner(e.target.value)}
              fullWidth
            />
            <TextField
              size='small'
              label='Documento Origen / Referencia'
              placeholder={cfg.docPlaceholder}
              value={newDocOrigin}
              onChange={e => setNewDocOrigin(e.target.value)}
              fullWidth
            />
          </div>

          {/* Selectores de Almacén y Ubicación según tipo de operación */}
          <div className='p-4 rounded-2xl bg-[#F4F3F8]/70 border border-[#E6E4F0] flex flex-col gap-3'>
            <span className='text-xs font-bold text-[#1E1B2E] uppercase tracking-wider'>
              Ruta de Almacén y Ubicaciones
            </span>

            {(operationType === 'DELIVERY' || operationType === 'INTERNAL_TRANSFER') && (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <TextField
                  select
                  size='small'
                  label='Almacén Origen (Salida)'
                  value={originWhId}
                  onChange={e => {
                    const whId = e.target.value
                    const wh = warehouses.find(w => w.id === whId)

                    setOriginWhId(whId)
                    setOriginLocCode(
                      wh?.locations[0] ? `${wh.locations[0].code} · ${wh.locations[0].name}` : ''
                    )
                  }}
                  fullWidth
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size='small'
                  label='Ubicación Interna Origen'
                  value={originLocCode}
                  onChange={e => setOriginLocCode(e.target.value)}
                  fullWidth
                >
                  {(originWarehouseObj?.locations || []).map(loc => {
                    const val = `${loc.code} · ${loc.name}`

                    return (
                      <MenuItem key={loc.id} value={val}>
                        {val}
                      </MenuItem>
                    )
                  })}
                </TextField>
              </div>
            )}

            {(operationType === 'RECEIPT' || operationType === 'INTERNAL_TRANSFER') && (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <TextField
                  select
                  size='small'
                  label='Almacén Destino (Entrada)'
                  value={destWhId}
                  onChange={e => {
                    const whId = e.target.value
                    const wh = warehouses.find(w => w.id === whId)

                    setDestWhId(whId)
                    setDestLocCode(
                      wh?.locations[0] ? `${wh.locations[0].code} · ${wh.locations[0].name}` : ''
                    )
                  }}
                  fullWidth
                >
                  {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size='small'
                  label='Ubicación Interna Destino'
                  value={destLocCode}
                  onChange={e => setDestLocCode(e.target.value)}
                  fullWidth
                >
                  {(destWarehouseObj?.locations || []).map(loc => {
                    const val = `${loc.code} · ${loc.name}`

                    return (
                      <MenuItem key={loc.id} value={val}>
                        {val}
                      </MenuItem>
                    )
                  })}
                </TextField>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <TextField
              size='small'
              type='date'
              label='Fecha Programada'
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              size='small'
              label='Responsable de Almacén'
              value={newResponsable}
              onChange={e => setNewResponsable(e.target.value)}
              fullWidth
            />
          </div>

          <Divider sx={{ borderColor: '#E6E4F0' }} />

          {/* Multiline Products Editor */}
          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-[#1E1B2E] uppercase tracking-wider'>
              Artículos de la Operación ({newLines.length})
            </span>
            <Button
              size='small'
              onClick={onAddDraftLine}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                color: '#6C5CE7',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
              startIcon={<i className='tabler-plus text-sm' />}
            >
              Agregar línea
            </Button>
          </div>

          <div className='flex flex-col gap-2.5'>
            {newLines.map((line, index) => (
              <div
                key={line.tempId}
                className='p-3 rounded-2xl border border-[#E6E4F0] bg-[#FAFAFC] flex items-center gap-2.5'
              >
                <span className='font-mono text-xs font-bold text-[#6C5CE7] w-5 text-center'>
                  {index + 1}
                </span>

                <div className='flex-1 min-w-0'>
                  <Autocomplete
                    size='small'
                    options={variantOptions}
                    value={line.variantOption}
                    onChange={(_, val) =>
                      setNewLines(prev =>
                        prev.map(item =>
                          item.tempId === line.tempId ? { ...item, variantOption: val } : item
                        )
                      )
                    }
                    getOptionLabel={opt => `${opt.productName} (${opt.sku})`}
                    renderInput={params => (
                      <TextField
                        {...params}
                        placeholder='Buscar producto o SKU...'
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            backgroundColor: '#FFFFFF'
                          }
                        }}
                      />
                    )}
                  />
                  {line.variantOption && (
                    <span className='text-[10px] text-[#6B7280] mt-1 block px-1'>
                      Stock físico actual:{' '}
                      <strong>
                        {line.variantOption.physicalStock} {line.variantOption.uomCode}
                      </strong>{' '}
                      · Costo unitario: ${line.variantOption.unitCost.toFixed(2)}
                    </span>
                  )}
                </div>

                <TextField
                  size='small'
                  type='number'
                  label='Cantidad'
                  value={line.cantidad}
                  onChange={e =>
                    setNewLines(prev =>
                      prev.map(item =>
                        item.tempId === line.tempId
                          ? { ...item, cantidad: e.target.value }
                          : item
                      )
                    )
                  }
                  slotProps={{ htmlInput: { min: 1, step: 'any' } }}
                  sx={{
                    width: 105,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 700
                    }
                  }}
                />

                <Tooltip title='Quitar línea'>
                  <span>
                    <IconButton
                      size='small'
                      disabled={newLines.length === 1}
                      onClick={() => onRemoveDraftLine(line.tempId)}
                      sx={{ color: '#EF4444' }}
                    >
                      <i className='tabler-trash text-base' />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            ))}
          </div>

          <TextField
            size='small'
            multiline
            minRows={2}
            label='Notas / Observaciones de Almacén'
            placeholder='Instrucciones de descarga, número de precinto, transportista...'
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            fullWidth
          />
        </div>

        <div className='p-4 bg-[#FAFAFC] border-t border-[#E6E4F0] flex items-center justify-between gap-2 flex-wrap'>
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
            Cancelar
          </Button>

          <div className='flex items-center gap-2'>
            <Button
              variant='outlined'
              disabled={creating}
              onClick={() => onSubmit(false)}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                borderColor: '#6C5CE7',
                color: '#6C5CE7',
                fontWeight: 700
              }}
            >
              Guardar p/ Procesar Luego
            </Button>

            <Button
              variant='contained'
              disabled={creating}
              onClick={() => onSubmit(true)}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                fontWeight: 700,
                px: 2.5,
                '&:hover': { backgroundColor: '#059669' }
              }}
              startIcon={<i className='tabler-check text-base' />}
            >
              Crear y Validar Ahora
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default OperationCreateDrawer
