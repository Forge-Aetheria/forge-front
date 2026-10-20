'use client'

import React, { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'

import {
  BankAccount,
  BankAccountType,
  BankCurrency,
  ALL_BANKS,
  VENEZUELAN_BANKS
} from '@/types/bankAccountTypes'
import { bankAccountsService } from '@/services/bankAccountsService'
import { contactsService } from '@/services/contactsService'
import type { TerceroEntity } from '@/types/contactsTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (savedAccount: BankAccount) => void
  initialAccount?: BankAccount | null
  // Si se abre desde la ficha del contacto o empresa, se bloquea la pertenencia
  lockedContactId?: string
  lockedContactName?: string
  lockedContactRif?: string
  isCompanyOnly?: boolean
}

export const BankAccountModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  initialAccount,
  lockedContactId,
  lockedContactName,
  lockedContactRif,
  isCompanyOnly = false
}) => {
  const isEditing = Boolean(initialAccount?.id)

  const [ownerType, setOwnerType] = useState<'COMPANY' | 'CONTACT'>(
    isCompanyOnly || initialAccount?.is_empresa ? 'COMPANY' : 'CONTACT'
  )
  const [contactsList, setContactsList] = useState<TerceroEntity[]>([])
  const [selectedContact, setSelectedContact] = useState<TerceroEntity | null>(null)

  // Fields
  const [banco, setBanco] = useState<string>('')
  const [numeroCuenta, setNumeroCuenta] = useState<string>('')
  const [tipoCuenta, setTipoCuenta] = useState<BankAccountType>('CORRIENTE')
  const [moneda, setMoneda] = useState<BankCurrency>('VES')
  const [titular, setTitular] = useState<string>('')
  const [identificacionTitular, setIdentificacionTitular] = useState<string>('')
  const [isPagoMovil, setIsPagoMovil] = useState<boolean>(false)
  const [telefonoPagoMovil, setTelefonoPagoMovil] = useState<string>('')
  const [emailNotificacion, setEmailNotificacion] = useState<string>('')
  const [isPredeterminada, setIsPredeterminada] = useState<boolean>(false)
  const [notas, setNotas] = useState<string>('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load contacts for assignment
  useEffect(() => {
    if (!open) return
    const fetchContacts = async () => {
      try {
        const list = await contactsService.getTerceros()
        setContactsList(list)
      } catch (err) {
        console.error(err)
      }
    }
    fetchContacts()
  }, [open])

  // Reset or fill form
  useEffect(() => {
    if (!open) return

    if (initialAccount) {
      setOwnerType(initialAccount.is_empresa ? 'COMPANY' : 'CONTACT')
      setBanco(initialAccount.banco)
      setNumeroCuenta(initialAccount.numero_cuenta)
      setTipoCuenta(initialAccount.tipo_cuenta)
      setMoneda(initialAccount.moneda)
      setTitular(initialAccount.titular)
      setIdentificacionTitular(initialAccount.identificacion_titular)
      setIsPagoMovil(Boolean(initialAccount.is_pago_movil))
      setTelefonoPagoMovil(initialAccount.telefono_pago_movil || '')
      setEmailNotificacion(initialAccount.email_notificacion || '')
      setIsPredeterminada(Boolean(initialAccount.is_predeterminada))
      setNotas(initialAccount.notas || '')
    } else {
      // Default new
      const isCo = isCompanyOnly || lockedContactId === 'COMPANY'
      setOwnerType(isCo ? 'COMPANY' : 'CONTACT')
      setBanco(VENEZUELAN_BANKS[0].nombre)
      setNumeroCuenta('')
      setTipoCuenta('CORRIENTE')
      setMoneda('VES')
      setTitular(lockedContactName || (isCo ? 'Forge Global Suministros C.A.' : ''))
      setIdentificacionTitular(lockedContactRif || (isCo ? 'J-40192834-5' : ''))
      setIsPagoMovil(false)
      setTelefonoPagoMovil('')
      setEmailNotificacion('')
      setIsPredeterminada(false)
      setNotas('')
    }
    setErrorMsg(null)
  }, [open, initialAccount, lockedContactId, lockedContactName, lockedContactRif, isCompanyOnly])

  const handleBankChange = (newBankName: string) => {
    setBanco(newBankName)
    const bankFound = ALL_BANKS.find(b => b.nombre === newBankName)
    if (bankFound) {
      if (bankFound.codigo === 'ZELLE' || bankFound.codigo === 'PAYPAL' || bankFound.codigo === 'BINANCE') {
        setTipoCuenta('VIRTUAL')
        setMoneda('USD')
        setIsPagoMovil(false)
      } else if (!bankFound.esNacional) {
        setMoneda('USD')
        setIsPagoMovil(false)
      }
    }
  }

  const handleContactSelect = (contact: TerceroEntity | null) => {
    setSelectedContact(contact)
    if (contact && !titular) {
      setTitular(contact.nombre_razon_social)
      setIdentificacionTitular(contact.identificacion)
      setTelefonoPagoMovil(contact.telefono_principal || '')
      setEmailNotificacion(contact.email_principal || '')
    }
  }

  const handleSubmit = async () => {
    if (!banco.trim()) {
      setErrorMsg('Selecciona o ingresa la entidad bancaria.')
      return
    }
    if (!numeroCuenta.trim()) {
      setErrorMsg('Ingresa el número de cuenta, correo o identificador de la cuenta.')
      return
    }
    if (!titular.trim()) {
      setErrorMsg('Ingresa el nombre o razón social del titular.')
      return
    }
    if (!identificacionTitular.trim()) {
      setErrorMsg('Ingresa el RIF o Cédula de Identidad del titular.')
      return
    }
    if (isPagoMovil && !telefonoPagoMovil.trim()) {
      setErrorMsg('Para habilitar Pago Móvil debes registrar el número telefónico receptor.')
      return
    }

    try {
      setSaving(true)
      setErrorMsg(null)

      const isCompany = isCompanyOnly || ownerType === 'COMPANY' || lockedContactId === 'COMPANY'
      const assignedContactId = isCompany ? 'COMPANY' : (lockedContactId || selectedContact?.id || undefined)
      const assignedContactName = isCompany ? 'Empresa (Forge Global)' : (lockedContactName || selectedContact?.nombre_razon_social || undefined)
      const assignedContactType: 'EMPRESA' | 'CLIENTE' | 'PROVEEDOR' | 'AMBOS' = isCompany
        ? 'EMPRESA'
        : selectedContact?.is_cliente && selectedContact?.is_proveedor
        ? 'AMBOS'
        : selectedContact?.is_cliente
        ? 'CLIENTE'
        : 'PROVEEDOR'

      const bankOption = ALL_BANKS.find(b => b.nombre === banco)

      const payload = {
        banco: banco.trim(),
        codigo_banco: bankOption?.codigo,
        numero_cuenta: numeroCuenta.trim(),
        tipo_cuenta: tipoCuenta,
        moneda,
        titular: titular.trim(),
        identificacion_titular: identificacionTitular.trim().toUpperCase(),
        is_pago_movil: isPagoMovil,
        telefono_pago_movil: isPagoMovil ? telefonoPagoMovil.trim() : undefined,
        email_notificacion: emailNotificacion.trim() || undefined,
        is_predeterminada: isPredeterminada,
        contacto_id: assignedContactId,
        contacto_nombre: assignedContactName,
        contacto_tipo: assignedContactType,
        is_empresa: isCompany,
        notas: notas.trim() || undefined
      }

      let saved: BankAccount
      if (initialAccount?.id) {
        saved = await bankAccountsService.updateBankAccount(initialAccount.id, payload)
      } else {
        saved = await bankAccountsService.createBankAccount(payload)
      }

      onSuccess(saved)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la cuenta bancaria')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: 'rgba(108, 92, 231, 0.12)',
              color: '#6C5CE7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            <i className='tabler-building-bank' />
          </Box>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 800, color: '#1E293B' }}>
              {isEditing ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
            </Typography>
            <Typography variant='caption' sx={{ color: '#64748B' }}>
              {isCompanyOnly || lockedContactId === 'COMPANY'
                ? 'Cuenta bancaria corporativa para recepción y emisión de fondos'
                : lockedContactName
                ? `Cuenta bancaria asociada a ${lockedContactName}`
                : 'Registro de cuenta bancaria o método de pago para transacciones'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size='small'>
          <i className='tabler-x text-lg' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        {errorMsg && (
          <Alert severity='error' sx={{ borderRadius: '12px' }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {/* Asignación (solo si no está pre-bloqueado por contacto o empresa) */}
        {!lockedContactId && !isCompanyOnly && (
          <Box sx={{ p: 2, borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <Typography variant='caption' sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              ¿A quién pertenece esta cuenta?
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: ownerType === 'CONTACT' ? 2 : 0 }}>
              <Button
                variant={ownerType === 'COMPANY' ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setOwnerType('COMPANY')}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontWeight: 700,
                  flex: 1,
                  backgroundColor: ownerType === 'COMPANY' ? '#6C5CE7' : 'transparent',
                  borderColor: '#6C5CE7',
                  color: ownerType === 'COMPANY' ? '#FFFFFF' : '#6C5CE7'
                }}
              >
                Cuenta de la Empresa
              </Button>
              <Button
                variant={ownerType === 'CONTACT' ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setOwnerType('CONTACT')}
                sx={{
                  borderRadius: '9999px',
                  textTransform: 'none',
                  fontWeight: 700,
                  flex: 1,
                  backgroundColor: ownerType === 'CONTACT' ? '#6C5CE7' : 'transparent',
                  borderColor: '#6C5CE7',
                  color: ownerType === 'CONTACT' ? '#FFFFFF' : '#6C5CE7'
                }}
              >
                Contacto / Tercero
              </Button>
            </Box>

            {ownerType === 'CONTACT' && (
              <Autocomplete
                options={contactsList}
                getOptionLabel={opt => `${opt.nombre_razon_social} (${opt.identificacion})`}
                value={selectedContact}
                onChange={(_, val) => handleContactSelect(val)}
                renderInput={params => (
                  <TextField
                    {...params}
                    size='small'
                    label='Seleccionar Contacto / Beneficiario *'
                    placeholder='Buscar por nombre o RIF...'
                    sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px', mt: 1 }}
                  />
                )}
              />
            )}
          </Box>
        )}

        {/* Fila 1: Banco y Moneda */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
          <TextField
            select
            fullWidth
            size='small'
            label='Entidad Bancaria *'
            value={banco}
            onChange={e => handleBankChange(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          >
            <MenuItem disabled value='' sx={{ fontWeight: 700, color: '#94A3B8' }}>
              — Bancos Nacionales (Venezuela) —
            </MenuItem>
            {VENEZUELAN_BANKS.map(b => (
              <MenuItem key={b.codigo} value={b.nombre}>
                {b.nombreCorto} ({b.codigo})
              </MenuItem>
            ))}
            <MenuItem disabled value='divider' sx={{ fontWeight: 700, color: '#94A3B8' }}>
              — Cuentas Internacionales y Digitales —
            </MenuItem>
            {ALL_BANKS.filter(b => !b.esNacional).map(b => (
              <MenuItem key={b.codigo} value={b.nombre}>
                {b.nombreCorto}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            size='small'
            label='Moneda *'
            value={moneda}
            onChange={e => setMoneda(e.target.value as BankCurrency)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          >
            <MenuItem value='VES'>Bolívares (VES)</MenuItem>
            <MenuItem value='USD'>Dólares (USD)</MenuItem>
            <MenuItem value='EUR'>Euros (EUR)</MenuItem>
          </TextField>
        </Box>

        {/* Fila 2: N° de Cuenta y Tipo */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            size='small'
            label='N° de Cuenta / Identificador *'
            placeholder='Ej: 0134-0012-34-5678901234'
            value={numeroCuenta}
            onChange={e => setNumeroCuenta(e.target.value)}
            helperText='20 dígitos para banca venezolana o correo/ID para billeteras'
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />

          <TextField
            select
            fullWidth
            size='small'
            label='Tipo de Cuenta'
            value={tipoCuenta}
            onChange={e => setTipoCuenta(e.target.value as BankAccountType)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          >
            <MenuItem value='CORRIENTE'>Corriente</MenuItem>
            <MenuItem value='AHORRO'>Ahorro</MenuItem>
            <MenuItem value='VIRTUAL'>Virtual / Digital</MenuItem>
            <MenuItem value='OTRO'>Otro</MenuItem>
          </TextField>
        </Box>

        {/* Fila 3: Titular y RIF / Cédula */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            size='small'
            label='Nombre del Titular *'
            placeholder='Razón Social o Nombre Completo'
            value={titular}
            onChange={e => setTitular(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />

          <TextField
            fullWidth
            size='small'
            label='RIF o C.I. del Titular *'
            placeholder='Ej: J-40192834-5 o V-18234567'
            value={identificacionTitular}
            onChange={e => setIdentificacionTitular(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
        </Box>

        {/* Apartado Pago Móvil */}
        <Box sx={{ p: 2, borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isPagoMovil}
                onChange={e => setIsPagoMovil(e.target.checked)}
                sx={{
                  '& .Mui-checked': { color: '#6C5CE7' },
                  '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C5CE7' }
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 700, color: '#1E293B' }}>
                  Habilitar para Pago Móvil
                </Typography>
                <Chip label='P2P / C2P' size='small' sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
              </Box>
            }
          />

          {isPagoMovil && (
            <Box sx={{ mt: 1.5 }}>
              <TextField
                fullWidth
                size='small'
                label='Teléfono Registrado en Pago Móvil *'
                placeholder='Ej: 0414-9876543 o 0424-1234567'
                value={telefonoPagoMovil}
                onChange={e => setTelefonoPagoMovil(e.target.value)}
                sx={{ backgroundColor: '#FFFFFF', borderRadius: '12px' }}
              />
            </Box>
          )}
        </Box>

        {/* Fila 4: Correo de Notificación y Predeterminada */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            size='small'
            type='email'
            label='Correo para Comprobantes (Opcional)'
            placeholder='pagos@dominio.com'
            value={emailNotificacion}
            onChange={e => setEmailNotificacion(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPredeterminada}
                onChange={e => setIsPredeterminada(e.target.checked)}
                sx={{
                  '& .Mui-checked': { color: '#10B981' },
                  '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#10B981' }
                }}
              />
            }
            label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Cuenta Principal</Typography>}
          />
        </Box>

        <TextField
          fullWidth
          size='small'
          label='Notas / Referencia interna'
          placeholder='Ej: Solo para depósitos en efectivo, cuenta para nómina, etc.'
          value={notas}
          onChange={e => setNotas(e.target.value)}
          multiline
          rows={2}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          sx={{ borderRadius: '9999px', textTransform: 'none', color: '#64748B', fontWeight: 600 }}
        >
          Cancelar
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            borderRadius: '9999px',
            backgroundColor: '#6C5CE7',
            textTransform: 'none',
            fontWeight: 700,
            px: 4,
            boxShadow: '0 4px 12px rgba(108, 92, 231, 0.25)',
            '&:hover': { backgroundColor: '#5b4bc4' }
          }}
        >
          {saving ? 'Guardando...' : isEditing ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
