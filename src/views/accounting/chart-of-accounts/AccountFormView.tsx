'use client'

import React, { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'

import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'

import CustomChip from '@core/components/mui/Chip'

import { accountingService } from '@/services/accountingService'
import type {
  Account,
  AccountType,
  SpecificAccountType,
  CurrencyCode
} from '@/types/accountingTypes'

interface SubtypeOption {
  value: SpecificAccountType
  label: string
  categoria: string
  parentType: AccountType
  prefijoSugerido: string
  esConciliableDefault: boolean
  descripcion: string
  diarioAfectado: string
  destinoReporte: 'BALANCE_GENERAL' | 'ESTADO_RESULTADOS'
}

export const ACCOUNT_SUBTYPES: SubtypeOption[] = [
  // 1. ACTIVOS
  {
    value: 'BANCO_CAJA',
    label: 'Banco y Caja (Efectivo y Cuentas Bancarias)',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.01.',
    esConciliableDefault: true,
    descripcion: 'Cuentas de liquidez inmediata en efectivo o entidades financieras bancarias nacionales e internacionales (USD/VES).',
    diarioAfectado: 'Diario de Banco y Efectivo / Tesorería',
    destinoReporte: 'BALANCE_GENERAL'
  },
  {
    value: 'CXC',
    label: 'Cuentas por Cobrar (Clientes y Deudores)',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.02.',
    esConciliableDefault: true,
    descripcion: 'Derechos de cobro exigibles a clientes por ventas de mercancías o servicios prestados a crédito.',
    diarioAfectado: 'Diario de Ventas y Facturas de Clientes',
    destinoReporte: 'BALANCE_GENERAL'
  },
  {
    value: 'INVENTARIO',
    label: 'Inventario de Mercancía',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.03.',
    esConciliableDefault: false,
    descripcion: 'Existencias de bienes comprados para la reventa o materias primas valoradas al costo.',
    diarioAfectado: 'Diario de Operaciones Varias / Compras',
    destinoReporte: 'BALANCE_GENERAL'
  },
  {
    value: 'ACTIVO_CORRIENTE',
    label: 'Activo Corriente (Crédito Fiscal IVA, Prepagos)',
    categoria: '1. Activo',
    parentType: 'ASSET_CURRENT',
    prefijoSugerido: '1.1.04.',
    esConciliableDefault: true,
    descripcion: 'Crédito fiscal generado en compras de bienes o servicios, anticipos a proveedores y gastos pagados por anticipado.',
    diarioAfectado: 'Diario de Compras y Retenciones',
    destinoReporte: 'BALANCE_GENERAL'
  },
  {
    value: 'ACTIVO_FIJO',
    label: 'Activo No Corriente / Fijo (Mobiliario, Equipos)',
    categoria: '1. Activo',
    parentType: 'ASSET_NON_CURRENT',
    prefijoSugerido: '1.2.01.',
    esConciliableDefault: false,
    descripcion: 'Bienes tangibles e intangibles de uso continuo de la empresa (mobiliario, computadoras, maquinarias, vehículos).',
    diarioAfectado: 'Diario de Activos y Amortizaciones',
    destinoReporte: 'BALANCE_GENERAL'
  },

  // 2. PASIVOS
  {
    value: 'CXP',
    label: 'Cuentas por Pagar (Proveedores y Acreedores)',
    categoria: '2. Pasivo',
    parentType: 'LIABILITY_CURRENT',
    prefijoSugerido: '2.1.01.',
    esConciliableDefault: true,
    descripcion: 'Obligaciones contraídas con proveedores por compras o suministros de bienes y servicios a crédito.',
    diarioAfectado: 'Diario de Compras y Facturas de Proveedores',
    destinoReporte: 'BALANCE_GENERAL'
  },
  {
    value: 'PASIVO_CORRIENTE',
    label: 'Pasivo Corriente (Débito Fiscal IVA, IGTF, Retenciones)',
    categoria: '2. Pasivo',
    parentType: 'LIABILITY_CURRENT',
    prefijoSugerido: '2.1.02.',
    esConciliableDefault: true,
    descripcion: 'Impuestos recaudados pendientes de enterar al SENIAT (Débito Fiscal IVA, IGTF, Retenciones ISLR y retenciones IVA).',
    diarioAfectado: 'Diario de Ventas y Liquidación de Impuestos',
    destinoReporte: 'BALANCE_GENERAL'
  },
  {
    value: 'PASIVO_NO_CORRIENTE',
    label: 'Pasivo No Corriente (Deudas a Largo Plazo)',
    categoria: '2. Pasivo',
    parentType: 'LIABILITY_NON_CURRENT',
    prefijoSugerido: '2.2.01.',
    esConciliableDefault: false,
    descripcion: 'Obligaciones y préstamos bancarios o pasivos con vencimiento superior a 12 meses.',
    diarioAfectado: 'Diario de Operaciones Varias',
    destinoReporte: 'BALANCE_GENERAL'
  },

  // 3. PATRIMONIO
  {
    value: 'PATRIMONIO',
    label: 'Capital Social y Resultados Acumulados',
    categoria: '3. Patrimonio',
    parentType: 'EQUITY',
    prefijoSugerido: '3.1.01.',
    esConciliableDefault: false,
    descripcion: 'Aportes de socios, reserva legal, utilidades retenidas de ejercicios anteriores y resultado del ejercicio.',
    diarioAfectado: 'Diario de Cierre y Apertura Contable',
    destinoReporte: 'BALANCE_GENERAL'
  },

  // 4. INGRESOS
  {
    value: 'INGRESO_VENTAS',
    label: 'Ingresos Operacionales (Ventas de Bienes y Servicios)',
    categoria: '4. Ingresos',
    parentType: 'INCOME',
    prefijoSugerido: '4.1.01.',
    esConciliableDefault: false,
    descripcion: 'Ingresos devengados por la venta del giro habitual del negocio. Solo elegible en facturas de clientes.',
    diarioAfectado: 'Diario de Ventas',
    destinoReporte: 'ESTADO_RESULTADOS'
  },
  {
    value: 'INGRESO_FINANCIERO',
    label: 'Ingresos Financieros / Ganancia Cambiaria',
    categoria: '4. Ingresos',
    parentType: 'INCOME_FINANCIAL',
    prefijoSugerido: '4.1.02.',
    esConciliableDefault: false,
    descripcion: 'Ganancias por diferencial cambiario entre la emisión y el cobro según tasa oficial BCV, o intereses ganados.',
    diarioAfectado: 'Diario de Pagos y Diferencial Cambiario',
    destinoReporte: 'ESTADO_RESULTADOS'
  },

  // 5. COSTOS
  {
    value: 'COSTO_VENTAS',
    label: 'Costo de Ventas de Mercancía',
    categoria: '5. Costos',
    parentType: 'COST_OF_GOODS',
    prefijoSugerido: '5.1.01.',
    esConciliableDefault: false,
    descripcion: 'Costo directo atribuible a la adquisición o producción de los productos vendidos a los clientes.',
    diarioAfectado: 'Diario de Ventas / Inventario',
    destinoReporte: 'ESTADO_RESULTADOS'
  },

  // 6. GASTOS
  {
    value: 'GASTO_OPERATIVO',
    label: 'Gastos Operativos (Servicios Públicos, Nómina, Alquiler)',
    categoria: '6. Gastos',
    parentType: 'EXPENSE_OPERATING',
    prefijoSugerido: '6.1.01.',
    esConciliableDefault: false,
    descripcion: 'Gastos ordinarios de funcionamiento administrativo y operacional (luz, agua, internet, sueldos, alquileres de local).',
    diarioAfectado: 'Diario de Compras y Facturas de Gastos',
    destinoReporte: 'ESTADO_RESULTADOS'
  },
  {
    value: 'GASTO_FINANCIERO',
    label: 'Gastos Financieros (Comisiones Bancarias, Pérdida Cambiaria)',
    categoria: '6. Gastos',
    parentType: 'EXPENSE_FINANCIAL',
    prefijoSugerido: '6.1.02.',
    esConciliableDefault: false,
    descripcion: 'Comisiones cobradas por la banca y pérdida por diferencial cambiario entre la emisión y el pago.',
    diarioAfectado: 'Diario de Banco / Tesorería',
    destinoReporte: 'ESTADO_RESULTADOS'
  }
]

interface Props {
  account?: Account | null
  onBack: () => void
  onSaved: (account: Account, isNew: boolean) => void
}

export const AccountFormView: React.FC<Props> = ({ account, onBack, onSaved }) => {
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
  }, [account])

  const handleSubtypeChange = (newSubtype: SpecificAccountType) => {
    setSubtipo(newSubtype)
    const opt = ACCOUNT_SUBTYPES.find(s => s.value === newSubtype)

    if (opt) {
      setTipo(opt.parentType)
      setPermiteConciliacion(opt.esConciliableDefault)

      if (!isEditing) {
        setCodigo(opt.prefijoSugerido)
      }
    }
  }

  const selectedSubtype = ACCOUNT_SUBTYPES.find(s => s.value === subtipo) || ACCOUNT_SUBTYPES[0]

  // Cálculo de nivel jerárquico
  const jerarquiaNivel = React.useMemo(() => {
    const parts = codigo.trim().split('.').filter(Boolean)

    if (parts.length === 0) return 'Sin código'
    if (parts.length === 1) return 'Nivel 1 - Clase'
    if (parts.length === 2) return 'Nivel 2 - Grupo'
    if (parts.length === 3) return 'Nivel 3 - Subgrupo / Mayor'
    
return `Nivel ${parts.length} - Cuenta Imputable Detalle`
  }, [codigo])

  const handleSubmit = async () => {
    const codeRegex = /^\d+(\.\d+)+$/

    if (!codigo.trim() || !codeRegex.test(codigo.trim())) {
      setErrorMsg('El código contable debe seguir la notación jerárquica con puntos (ej: 1.1.01.05 o 6.1.01.03).')
      
return
    }

    if (!nombre.trim()) {
      setErrorMsg('Debes especificar el nombre descriptivo de la cuenta contable.')
      
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

        onSaved(updated, false)
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

        onSaved(created, true)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cuenta contable')
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* 1. BARRA SUPERIOR DE ACCIONES Y RETORNO */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Tooltip title='Volver'>
            <IconButton
              onClick={onBack}
              sx={{
                width: 38,
                height: 38,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className='tabler-arrow-left text-lg' />
            </IconButton>
          </Tooltip>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant='h5' sx={{ fontWeight: 800, color: '#1E293B' }}>
                {isEditing ? `Editar Cuenta: ${account?.codigo} - ${account?.nombre}` : 'Nueva Cuenta Contable'}
              </Typography>
              <CustomChip
                label={selectedSubtype.categoria}
                size='small'
                variant='tonal'
                color='primary'
              />
              <CustomChip
                label={activo ? 'Activa' : 'Inactiva'}
                size='small'
                variant='tonal'
                color={activo ? 'success' : 'error'}
              />
            </Box>
          </Box>
        </Box>

        {/* Botones de Cabecera */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant='tonal'
            color='secondary'
            size='small'
            onClick={onBack}
            disabled={submitting}
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Cancelar
          </Button>

          <Button
            variant='contained'
            color='primary'
            size='small'
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={
              submitting ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-device-floppy text-base' />
              )
            }
            sx={{
              borderRadius: '9999px',
              fontWeight: 600,
              textTransform: 'none',
              px: 3
            }}
          >
            Guardar
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity='error' sx={{ borderRadius: '16px' }}>
          {errorMsg}
        </Alert>
      )}

      {/* 2. CARD 1: CLASIFICACIÓN Y NATURALEZA CONTABLE */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6C5CE7'
            }}
          >
            <i className='tabler-category-2' style={{ fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Naturaleza y Clasificación Contable
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Define el comportamiento en libros diarios, conciliaciones y estados financieros (Odoo Style)
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Tipo de Cuenta (Naturaleza Contable) *
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={subtipo}
              onChange={e => handleSubtypeChange(e.target.value as SpecificAccountType)}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            >
              {ACCOUNT_SUBTYPES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {opt.label}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{
                        ml: 2,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#64748B',
                        backgroundColor: '#F1F5F9',
                        px: 1.2,
                        py: 0.3,
                        borderRadius: '6px'
                      }}
                    >
                      {opt.categoria}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                p: 2.5
              }}
            >
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Regla Operativa Asociada
              </Typography>
              <Typography variant='body2' sx={{ mt: 0.5, color: '#334155', fontWeight: 500 }}>
                {selectedSubtype.descripcion}
              </Typography>
              <Divider sx={{ my: 1.5, borderColor: '#E2E8F0' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  Diario Afectado:
                </Typography>
                <Typography variant='caption' sx={{ fontWeight: 700, color: '#1E293B' }}>
                  {selectedSubtype.diarioAfectado}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* 3. CARD 2: DATOS MAESTROS DE IDENTIFICACIÓN */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6C5CE7'
            }}
          >
            <i className='tabler-file-spreadsheet' style={{ fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Identificación y Nomenclatura en el Catálogo
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Estructura jerárquica con notación decimal para el Plan Único de Cuentas
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3.5}>
          {/* Código Jerárquico */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569' }}>
                Código Jerárquico *
              </Typography>
              <CustomChip label={jerarquiaNivel} size='small' variant='tonal' color='secondary' />
            </Box>
            <TextField
              fullWidth
              size='small'
              placeholder='Ej: 1.1.01.05'
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              helperText={`Prefijo sugerido para ${selectedSubtype.label.split('(')[0].trim()}: ${selectedSubtype.prefijoSugerido}xx`}
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Grid>

          {/* Nombre de la Cuenta */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Nombre de la Cuenta *
            </Typography>
            <TextField
              fullWidth
              size='small'
              placeholder='Ej: Banesco Banco Universal (VES) o Servicios Públicos (Luz, Agua)'
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              helperText='Nombre oficial que se imprimirá en el Balance y Estado de Resultados'
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
          </Grid>

          {/* Moneda Operativa */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Moneda Operativa de la Cuenta
            </Typography>
            <TextField
              select
              fullWidth
              size='small'
              value={moneda}
              onChange={e => setMoneda(e.target.value as any)}
              helperText='Define si la cuenta admite transacciones multimoneda o es exclusiva'
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            >
              <MenuItem value='AMBAS'>Bimonetaria (USD y VES - Tipo de Cambio BCV)</MenuItem>
              <MenuItem value='USD'>Solo Dólares (USD)</MenuItem>
              <MenuItem value='VES'>Solo Bolívares (VES)</MenuItem>
            </TextField>
          </Grid>

          {/* Destino en Estados Financieros */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              Presentación en Estados Financieros
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                  {selectedSubtype.destinoReporte === 'BALANCE_GENERAL'
                    ? 'Balance General (Situación Financiera)'
                    : 'Estado de Resultados (Ganancias y Pérdidas)'}
                </Typography>
                <Typography variant='caption' sx={{ color: '#64748B' }}>
                  {selectedSubtype.destinoReporte === 'BALANCE_GENERAL'
                    ? 'Cuentas reales y acumulativas de activo, pasivo o patrimonio'
                    : 'Cuentas nominales y transitorias del ejercicio fiscal'}
                </Typography>
              </Box>
              <CustomChip label={selectedSubtype.destinoReporte === 'BALANCE_GENERAL' ? 'Balance' : 'PyG'} size='small' variant='tonal' color={selectedSubtype.destinoReporte === 'BALANCE_GENERAL' ? 'info' : 'warning'} />
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* 4. CARD 3: REGLAS OPERATIVAS Y CONCILIACIÓN */}
      <Card
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E4F0',
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          p: { xs: 3, sm: 4.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6C5CE7'
            }}
          >
            <i className='tabler-adjustments-check' style={{ fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
              Reglas de Operación y Conciliación
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              Control de conciliación bancaria y disponibilidad de imputación
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                backgroundColor: permiteConciliacion ? 'rgba(108, 92, 231, 0.03)' : '#FFFFFF'
              }}
            >
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
                  <Box sx={{ ml: 1 }}>
                    <Typography variant='body1' sx={{ fontWeight: 700, color: '#1E293B' }}>
                      Permite Conciliación Contable
                    </Typography>
                    <Typography variant='body2' sx={{ color: '#64748B', mt: 0.5 }}>
                      Habilita el cruce y emparejamiento de transacciones abiertas (facturas vs. pagos). Requerido para
                      bancos, cuentas por cobrar a clientes (CxC) y cuentas por pagar a proveedores (CxP).
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                backgroundColor: activo ? 'rgba(16, 185, 129, 0.03)' : '#FFFFFF'
              }}
            >
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
                  <Box sx={{ ml: 1 }}>
                    <Typography variant='body1' sx={{ fontWeight: 700, color: '#1E293B' }}>
                      Cuenta Activa para Transacciones
                    </Typography>
                    <Typography variant='body2' sx={{ color: '#64748B', mt: 0.5 }}>
                      Al estar activa, aparece en los selectores de facturación, registro de gastos directos, cobranzas y
                      asientos manuales de diario.
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* 5. CARD 4: RESUMEN FINANCIERO Y SALDOS (Si está editando) */}
      {isEditing && account && (
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6E4F0',
            borderRadius: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            p: { xs: 3, sm: 4.5 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981'
              }}
            >
              <i className='tabler-wallet' style={{ fontSize: '1.25rem' }} />
            </Box>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.1rem' }}>
                Saldos Contables Actuales
              </Typography>
              <Typography variant='caption' sx={{ color: '#64748B' }}>
                Balance acumulado consolidado a partir de los asientos contables publicados en el Libro Mayor
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                sx={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  p: 3,
                  textAlign: 'center'
                }}
              >
                <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
                  Saldo en Dólares (USD)
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 800, color: '#1E293B', mt: 1 }}>
                  ${account.saldoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                sx={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  p: 3,
                  textAlign: 'center'
                }}
              >
                <Typography variant='caption' sx={{ color: '#64748B', fontWeight: 600 }}>
                  Saldo en Bolívares (VES)
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 800, color: '#6C5CE7', mt: 1 }}>
                  {account.saldoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* 6. BARRA DE ACCIÓN INFERIOR */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pb: 4 }}>
        <Button
          variant='tonal'
          color='secondary'
          size='small'
          onClick={onBack}
          disabled={submitting}
          sx={{
            borderRadius: '9999px',
            fontWeight: 600,
            textTransform: 'none'
          }}
        >
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='primary'
          size='small'
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy text-base' />}
          sx={{
            borderRadius: '9999px',
            fontWeight: 600,
            textTransform: 'none',
            px: 4
          }}
        >
          {submitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Box>
  )
}
