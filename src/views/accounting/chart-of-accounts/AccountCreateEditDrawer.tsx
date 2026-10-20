'use client'

import React, { useState, useEffect } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'

import { accountingService } from '@/services/accountingService'
import type {
  Account,
  AccountType,
  SpecificAccountType,
  CurrencyCode
} from '@/types/accountingTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (acc: Account, isNew: boolean) => void
  account?: Account | null
}

interface SubtypeOption {
  value: SpecificAccountType
  label: string
  categoria: string // "1. Activo", "2. Pasivo", etc.
  parentType: AccountType
  prefijoSugerido: string
  esConciliableDefault: boolean
}

export const ACCOUNT_SUBTYPES: SubtypeOption[] = [
  // 1. ACTIVOS
  {
    value: 'BANCO_CAJA',
    label: 'Banco y Caja (Efectivo y Cuentas Bancarias)',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.01.',
    esConciliableDefault: true
  },
  {
    value: 'CXC',
    label: 'Cuentas por Cobrar (Clientes y Deudores)',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.02.',
    esConciliableDefault: true
  },
  {
    value: 'INVENTARIO',
    label: 'Inventario de Mercancía',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.03.',
    esConciliableDefault: false
  },
  {
    value: 'ACTIVO_CORRIENTE',
    label: 'Activo Corriente (Crédito Fiscal IVA, Prepagos)',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.04.',
    esConciliableDefault: true
  },
  {
    value: 'ACTIVO_FIJO',
    label: 'Activo No Corriente / Fijo (Mobiliario, Equipos)',
    categoria: '1. Activo',
    parentType: 'ASSET_NON_CURRENT',
    prefijoSugerido: '1.2.01.',
    esConciliableDefault: false
  },

  // 2. PASIVOS
  {
    value: 'CXP',
    label: 'Cuentas por Pagar (Proveedores y Acreedores)',
    categoria: '2. Pasivo',
    parentType: 'LIABILITY_CURRENT',
    prefijoSugerido: '2.1.01.',
    esConciliableDefault: true
  },
  {
    value: 'PASIVO_CORRIENTE',
    label: 'Pasivo Corriente (Débito Fiscal IVA, IGTF, Retenciones)',
    categoria: '2. Pasivo',
    parentType: 'LIABILITY_CURRENT',
    prefijoSugerido: '2.1.02.',
    esConciliableDefault: true
  },
  {
    value: 'PASIVO_NO_CORRIENTE',
    label: 'Pasivo No Corriente (Deudas a Largo Plazo)',
    categoria: '2. Pasivo',
    parentType: 'LIABILITY_NON_CURRENT',
    prefijoSugerido: '2.2.01.',
    esConciliableDefault: false
  },

  // 3. PATRIMONIO
  {
    value: 'PATRIMONIO',
    label: 'Capital Social y Resultados Acumulados',
    categoria: '3. Patrimonio',
    parentType: 'EQUITY',
    prefijoSugerido: '3.1.01.',
    esConciliableDefault: false
  },

  // 4. INGRESOS
  {
    value: 'INGRESO_VENTAS',
    label: 'Ingresos Operacionales (Ventas de Bienes y Servicios)',
    categoria: '4. Ingresos',
    parentType: 'INCOME',
    prefijoSugerido: '4.1.01.',
    esConciliableDefault: false
  },
  {
    value: 'INGRESO_FINANCIERO',
    label: 'Ingresos Financieros / Ganancia Cambiaria',
    categoria: '4. Ingresos',
    parentType: 'INCOME_FINANCIAL',
    prefijoSugerido: '4.1.02.',
    esConciliableDefault: false
  },

  // 5. COSTOS
  {
    value: 'COSTO_VENTAS',
    label: 'Costo de Ventas de Mercancía',
    categoria: '5. Costos',
    parentType: 'COST_OF_GOODS',
    prefijoSugerido: '5.1.01.',
    esConciliableDefault: false
  },

  // 6. GASTOS
  {
    value: 'GASTO_OPERATIVO',
    label: 'Gastos Operativos (Servicios Públicos, Nómina, Alquiler)',
    categoria: '6. Gastos',
    parentType: 'EXPENSE_OPERATING',
    prefijoSugerido: '6.1.01.',
    esConciliableDefault: false
  },
  {
    value: 'GASTO_FINANCIERO',
    label: 'Gastos Financieros (Comisiones Bancarias, Pérdida Cambiaria)',
    categoria: '6. Gastos',
    parentType: 'EXPENSE_FINANCIAL',
    prefijoSugerido: '6.1.02.',
    esConciliableDefault: false
  }
]

export const AccountCreateEditDrawer: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  account
}) => {
  const isEditing = Boolean(account)

  const [subtipo, setSubtipo] = useState<SpecificAccountType>('BANCO_CAJA')
  const [tipo, setTipo] = useState<AccountType>('ASSET_CURRENT')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState<CurrencyCode | 'AMBAS'>('AMBAS')
  const [permiteConciliacion, setPermiteConciliacion] = useState(true)
  const [activo, setActivo] = useState(true)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (account) {
      setCodigo(account.codigo)
      setNombre(account.nombre)
      setTipo(account.tipo)
      setMoneda(account.moneda)
      setPermiteConciliacion(account.permiteConciliacion)
      setActivo(account.activo)

      const matched =
        ACCOUNT_SUBTYPES.find(s => s.value === account.subtipo) ||
        (account.codigo.startsWith('1.1.01') ? ACCOUNT_SUBTYPES.find(s => s.value === 'BANCO_CAJA') : undefined) ||
        (account.codigo.startsWith('1.1.02') ? ACCOUNT_SUBTYPES.find(s => s.value === 'CXC') : undefined) ||
        (account.codigo.startsWith('1.1.03') ? ACCOUNT_SUBTYPES.find(s => s.value === 'INVENTARIO') : undefined) ||
        (account.codigo.startsWith('2.1.01') ? ACCOUNT_SUBTYPES.find(s => s.value === 'CXP') : undefined) ||
        ACCOUNT_SUBTYPES.find(s => s.parentType === account.tipo) ||
        ACCOUNT_SUBTYPES[0]

      setSubtipo(matched.value)
    } else {
      setSubtipo('BANCO_CAJA')
      setTipo('ASSET_CURRENT')
      setCodigo('1.1.01.')
      setNombre('')
      setMoneda('AMBAS')
      setPermiteConciliacion(true)
      setActivo(true)
    }
    setErrorMsg(null)
  }, [account, open])

  const handleSubtypeChange = (newSubtype: SpecificAccountType) => {
    setSubtipo(newSubtype)
    const opt = ACCOUNT_SUBTYPES.find(s => s.value === newSubtype)

    if (opt) {
      setTipo(opt.parentType)
      setPermiteConciliacion(opt.esConciliableDefault)

      // Sugerir prefijo numérico si es creación nueva
      if (!isEditing) {
        setCodigo(opt.prefijoSugerido)
      }
    }
  }

  const selectedSubtype = ACCOUNT_SUBTYPES.find(s => s.value === subtipo) || ACCOUNT_SUBTYPES[0]

  const handleSubmit = async () => {
    const codeRegex = /^\d+(\.\d+)+$/

    if (!codigo.trim() || !codeRegex.test(codigo.trim())) {
      setErrorMsg('El código contable debe seguir la notación jerárquica con puntos (ej: 1.1.01.05).')

      return
    }

    if (!nombre.trim()) {
      setErrorMsg('Debes especificar el nombre de la cuenta contable.')

      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)

      if (isEditing && account) {
        const updated = await accountingService.updateAccount(account.id, {
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          tipo,
          subtipo,
          tipoCuentaNombre: selectedSubtype.label,
          moneda,
          permiteConciliacion,
          activo
        })

        onSuccess(updated, false)
      } else {
        const created = await accountingService.createAccount({
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          tipo,
          subtipo,
          tipoCuentaNombre: selectedSubtype.label,
          moneda,
          permiteConciliacion,
          activo
        })

        onSuccess(created, true)
      }

      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar cuenta contable')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0'
        }
      }}
    >
      <Box>
        {/* Cabecera del Drawer */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 800, color: '#1E293B' }}>
              {isEditing ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Parametrización en el Plan Único de Cuentas (PUC)
            </Typography>
          </Box>
          <IconButton onClick={onClose} size='small' sx={{ color: '#94A3B8' }}>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        {errorMsg && (
          <Alert severity='error' sx={{ mb: 3, borderRadius: '12px' }}>
            {errorMsg}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {/* Campo Explicito: Tipo de Cuenta (Estilo Odoo) */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569' }}>
                Tipo de Cuenta (Naturaleza Contable)
              </Typography>
              <Chip
                label={selectedSubtype.categoria}
                size='small'
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  backgroundColor: 'rgba(108, 92, 231, 0.1)',
                  color: '#6C5CE7'
                }}
              />
            </Box>
            <TextField
              select
              fullWidth
              size='small'
              value={subtipo}
              onChange={e => handleSubtypeChange(e.target.value as SpecificAccountType)}
              helperText='Define la función y el comportamiento de la cuenta en los diarios de compras, ventas y tesorería'
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            >
              {ACCOUNT_SUBTYPES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>{opt.label}</span>
                    <Typography
                      variant='caption'
                      sx={{
                        ml: 1,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748B',
                        backgroundColor: '#F1F5F9',
                        px: 1,
                        py: 0.2,
                        borderRadius: '4px'
                      }}
                    >
                      {opt.categoria}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Código Jerárquico */}
          <TextField
            fullWidth
            size='small'
            label='Código Jerárquico'
            placeholder='Ej: 1.1.01.05'
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            helperText={`Sugerencia de nivel para este tipo: ${selectedSubtype.prefijoSugerido}xx`}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
            }}
          />

          {/* Nombre de la Cuenta */}
          <TextField
            fullWidth
            size='small'
            label='Nombre de la Cuenta'
            placeholder='Ej: Banesco Banco Universal (VES) o Alquiler Galpón'
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
            }}
          />

          {/* Moneda Operativa */}
          <TextField
            select
            fullWidth
            size='small'
            label='Moneda Operativa'
            value={moneda}
            onChange={e => setMoneda(e.target.value as any)}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
            }}
          >
            <MenuItem value='AMBAS'>Bimonetaria (USD y VES)</MenuItem>
            <MenuItem value='USD'>Solo Dólares (USD)</MenuItem>
            <MenuItem value='VES'>Solo Bolívares (VES)</MenuItem>
          </TextField>

          {/* Switch Permite Conciliación */}
          <FormControlLabel
            control={
              <Switch
                checked={permiteConciliacion}
                onChange={e => setPermiteConciliacion(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C5CE7' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C5CE7' }
                }}
              />
            }
            label={
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Permite Conciliación
                </Typography>
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  Requerido para cuentas de Banco/Caja, Clientes (CxC) o Proveedores (CxP)
                </Typography>
              </Box>
            }
          />

          {/* Switch Cuenta Activa */}
          <FormControlLabel
            control={
              <Switch
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10B981' }
                }}
              />
            }
            label={
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Cuenta Activa
                </Typography>
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  Disponible para su selección en facturas, pagos y asientos
                </Typography>
              </Box>
            }
          />
        </Box>
      </Box>

      {/* Acciones del Drawer */}
      <Box sx={{ pt: 4, borderTop: '1px solid #E6E4F0', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant='outlined'
          onClick={onClose}
          disabled={submitting}
          sx={{
            borderRadius: '9999px',
            borderColor: '#CBD5E1',
            color: '#64748B',
            fontWeight: 600,
            textTransform: 'none',
            px: 4
          }}
        >
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            fontWeight: 700,
            textTransform: 'none',
            px: 4,
            '&:hover': { backgroundColor: '#5b4bc4' }
          }}
        >
          {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
        </Button>
      </Box>
    </Drawer>
  )
}
