'use client'

import React, { useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'

import type { FiscalRulesConfig } from '@/types/settingsTypes'
import type { SalesInvoicingPolicy, PurchaseControlPolicy, DeliveryPolicy } from '@/types/inventoryTypes'

interface Props {
  fiscalRules: FiscalRulesConfig
  onSave: (rules: Partial<FiscalRulesConfig>) => Promise<void>
}

export const FiscalRulesTab: React.FC<Props> = ({ fiscalRules, onSave }) => {
  const [localizacionVeActiva, setLocalizacionVeActiva] = useState(
    fiscalRules.localizacionVeActiva
  )
  const [ivaGeneralPct, setIvaGeneralPct] = useState(fiscalRules.ivaGeneralPct.toString())
  const [ivaReducidoPct, setIvaReducidoPct] = useState(fiscalRules.ivaReducidoPct.toString())
  const [igtfPct, setIgtfPct] = useState(fiscalRules.igtfPct.toString())
  const [retencionIva, setRetencionIva] = useState(fiscalRules.retencionIvaPorDefecto.toString())
  const [diasVigencia, setDiasVigencia] = useState(
    fiscalRules.diasVigenciaCotizacion.toString()
  )
  const [salesInvoicingPolicyDefault, setSalesInvoicingPolicyDefault] = useState<SalesInvoicingPolicy>(
    fiscalRules.salesInvoicingPolicyDefault || 'ORDERED'
  )
  const [purchaseControlPolicyDefault, setPurchaseControlPolicyDefault] = useState<PurchaseControlPolicy>(
    fiscalRules.purchaseControlPolicyDefault || 'ORDERED'
  )
  const [deliveryPolicyDefault, setDeliveryPolicyDefault] = useState<DeliveryPolicy>(
    fiscalRules.deliveryPolicyDefault || 'PARTIAL'
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)

    try {
      await onSave({
        localizacionVeActiva,
        ivaGeneralPct: Number(ivaGeneralPct) || 16,
        ivaReducidoPct: Number(ivaReducidoPct) || 8,
        igtfPct: Number(igtfPct) || 3,
        retencionIvaPorDefecto: Number(retencionIva) || 75,
        diasVigenciaCotizacion: Number(diasVigencia) || 15,
        salesInvoicingPolicyDefault,
        purchaseControlPolicyDefault,
        deliveryPolicyDefault
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E6E4F0',
        boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
      }}
    >
      <CardContent className='p-6 flex flex-col gap-5'>
        <div>
          <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
            Fiscalidad y Parámetros Comerciales Globales
          </Typography>
          <span className='text-xs text-[#6B7280]'>
            Configuración de tributos SENIAT, IGTF y políticas de validez para cotizaciones y compras (Regla R4)
          </span>
        </div>

        {/* Master Switch Localización VE */}
        <div className='p-4 rounded-2xl border border-[#E6E4F0] bg-[#FAFAFC] flex items-center justify-between flex-wrap gap-3'>
          <div>
            <span className='font-bold text-sm text-[#1E1B2E] block'>
              Localización Fiscal Venezolana (SENIAT / BCV)
            </span>
            <span className='text-xs text-[#6B7280]'>
              Habilita desglose de IVA (16%/8%/Exento), cálculo de IGTF (3%) y validación estricta de RIF
            </span>
          </div>
          <FormControlLabel
            control={
              <Switch
                checked={localizacionVeActiva}
                onChange={e => setLocalizacionVeActiva(e.target.checked)}
                color='primary'
              />
            }
            label={
              <span className='text-xs font-bold text-[#1E1B2E]'>
                {localizacionVeActiva ? 'Activo' : 'Inactivo (Modo Neto Universal)'}
              </span>
            }
          />
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4 mt-1'>
          <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] mt-1'>
            Alícuotas de Impuesto al Valor Agregado (IVA)
          </Typography>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <TextField
              size='small'
              label='IVA General (%)'
              type='number'
              value={ivaGeneralPct}
              onChange={e => setIvaGeneralPct(e.target.value)}
              disabled={!localizacionVeActiva}
              required
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              slotProps={{ input: { endAdornment: <InputAdornment position='end'>%</InputAdornment> } }}
            />

            <TextField
              size='small'
              label='IVA Reducido (%)'
              type='number'
              value={ivaReducidoPct}
              onChange={e => setIvaReducidoPct(e.target.value)}
              disabled={!localizacionVeActiva}
              required
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              slotProps={{ input: { endAdornment: <InputAdornment position='end'>%</InputAdornment> } }}
            />

            <TextField
              size='small'
              label='Impuesto IGTF (%)'
              type='number'
              value={igtfPct}
              onChange={e => setIgtfPct(e.target.value)}
              disabled={!localizacionVeActiva}
              required
              fullWidth
              helperText='Aplica a pagos en divisas / efectivo'
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              slotProps={{ input: { endAdornment: <InputAdornment position='end'>%</InputAdornment> } }}
            />
          </div>

          <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] mt-2'>
            Retenciones y Términos Comerciales
          </Typography>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <TextField
              select
              size='small'
              label='Porcentaje de Retención IVA por Defecto'
              value={retencionIva}
              onChange={e => setRetencionIva(e.target.value)}
              disabled={!localizacionVeActiva}
              fullWidth
              helperText='Aplica a Proveedores y Clientes calificados como Contribuyentes Especiales'
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            >
              <MenuItem value='75'>75% de Retención (Estándar SENIAT)</MenuItem>
              <MenuItem value='100'>100% de Retención (Agente de Retención Total)</MenuItem>
            </TextField>

            <TextField
              size='small'
              label='Días de Vigencia para Presupuestos y Cotizaciones'
              type='number'
              value={diasVigencia}
              onChange={e => setDiasVigencia(e.target.value)}
              required
              fullWidth
              helperText='Tiempo antes de exigir recálculo de costos y tasa'
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              slotProps={{ input: { endAdornment: <InputAdornment position='end'>Días</InputAdornment> } }}
            />
          </div>

          {/* Políticas Generales de Facturación y Control */}
          <div className='mt-2'>
            <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-1.5'>
              <i className='tabler-file-settings text-[#6C5CE7]' /> Políticas Generales de Facturación y Despacho
            </Typography>
            <span className='text-xs text-[#6B7280] block mt-0.5 mb-3'>
              Rigen de forma general para todos los artículos que no tengan una política específica configurada. Si un producto define su propia política, prevalece la del producto.
            </span>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <TextField
                select
                size='small'
                label='Política General de Entrega'
                value={deliveryPolicyDefault}
                onChange={e => setDeliveryPolicyDefault(e.target.value as DeliveryPolicy)}
                fullWidth
                helperText='Determina cómo almacén gestiona los despachos'
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              >
                <MenuItem value='PARTIAL'>Permitir Entregas Parciales (A medida que haya stock)</MenuItem>
                <MenuItem value='ALL_AT_ONCE'>Entregar Todos a la Vez (Pedido completo)</MenuItem>
              </TextField>

              <TextField
                select
                size='small'
                label='Política General de Facturación (Ventas)'
                value={salesInvoicingPolicyDefault}
                onChange={e => setSalesInvoicingPolicyDefault(e.target.value as SalesInvoicingPolicy)}
                fullWidth
                helperText='Determina cuándo se puede emitir la factura del cliente'
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              >
                <MenuItem value='ORDERED'>Facturar Cantidades Pedidas (Inmediato al confirmar)</MenuItem>
                <MenuItem value='DELIVERED'>Facturar Cantidades Entregadas (Requiere entrega en almacén)</MenuItem>
              </TextField>

              <TextField
                select
                size='small'
                label='Política General de Control (Compras)'
                value={purchaseControlPolicyDefault}
                onChange={e => setPurchaseControlPolicyDefault(e.target.value as PurchaseControlPolicy)}
                fullWidth
                helperText='Determina cuándo se puede registrar la factura del proveedor'
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              >
                <MenuItem value='ORDERED'>Controlar Cantidades Pedidas (Inmediato al confirmar)</MenuItem>
                <MenuItem value='RECEIVED'>Controlar Cantidades Recibidas (Requiere recepción en almacén)</MenuItem>
              </TextField>
            </div>
          </div>

          <div className='flex justify-end pt-3'>
            <Button
              type='submit'
              variant='contained'
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                color: '#FFFFFF',
                fontWeight: 600,
                textTransform: 'none',
                px: 3.5,
                py: 1.1,
                boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
            >
              {saving ? 'Guardando...' : 'Guardar Reglas'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
