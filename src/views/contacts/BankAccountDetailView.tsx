'use client'

import React, { useState, useEffect, useMemo } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Autocomplete from '@mui/material/Autocomplete'
import Skeleton from '@mui/material/Skeleton'

import CustomTextField from '@core/components/mui/TextField'
import CustomChip from '@core/components/mui/Chip'

import type {
  BankAccount,
  BankAccountType,
  BankCurrency} from '@/types/bankAccountTypes';
import {
  ALL_BANKS,
  VENEZUELAN_BANKS,
  INTERNATIONAL_BANKS
} from '@/types/bankAccountTypes'
import { bankAccountsService } from '@/services/bankAccountsService'
import { contactsService } from '@/services/contactsService'
import type { TerceroEntity } from '@/types/contactsTypes'

interface Props {
  id: string
}

export const BankAccountDetailView: React.FC<Props> = ({ id }) => {
  const router = useRouter()
  const isCreate = id === 'create'

  // Loading & Data states
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [account, setAccount] = useState<BankAccount | null>(null)
  const [allAccounts, setAllAccounts] = useState<BankAccount[]>([])
  const [contactsList, setContactsList] = useState<TerceroEntity[]>([])
  const [selectedContact, setSelectedContact] = useState<TerceroEntity | null>(null)

  // Form Fields
  const [ownerType, setOwnerType] = useState<'COMPANY' | 'CONTACT'>('COMPANY')
  const [banco, setBanco] = useState<string>(VENEZUELAN_BANKS[0].nombre)
  const [numeroCuenta, setNumeroCuenta] = useState<string>('')
  const [tipoCuenta, setTipoCuenta] = useState<BankAccountType>('CORRIENTE')
  const [moneda, setMoneda] = useState<BankCurrency>('VES')
  const [titular, setTitular] = useState<string>('Distribuidora Global C.A.')
  const [identificacionTitular, setIdentificacionTitular] = useState<string>('J-40192834-5')
  const [isPagoMovil, setIsPagoMovil] = useState<boolean>(false)
  const [telefonoPagoMovil, setTelefonoPagoMovil] = useState<string>('')
  const [emailNotificacion, setEmailNotificacion] = useState<string>('')
  const [isPredeterminada, setIsPredeterminada] = useState<boolean>(false)
  const [notas, setNotas] = useState<string>('')

  // Dialogs & Toasts
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Load Contacts list and all accounts for sequential navigation
  useEffect(() => {
    const initData = async () => {
      try {
        const [contacts, accounts] = await Promise.all([
          contactsService.getTerceros(),
          bankAccountsService.getBankAccounts()
        ])

        setContactsList(contacts)
        setAllAccounts(accounts)

        if (!isCreate) {
          const found = accounts.find(a => a.id === id) || (await bankAccountsService.getBankAccountById(id))

          if (found) {
            setAccount(found)
            setOwnerType(found.is_empresa ? 'COMPANY' : 'CONTACT')
            setBanco(found.banco)
            setNumeroCuenta(found.numero_cuenta)
            setTipoCuenta(found.tipo_cuenta)
            setMoneda(found.moneda)
            setTitular(found.titular)
            setIdentificacionTitular(found.identificacion_titular)
            setIsPagoMovil(Boolean(found.is_pago_movil))
            setTelefonoPagoMovil(found.telefono_pago_movil || '')
            setEmailNotificacion(found.email_notificacion || '')
            setIsPredeterminada(Boolean(found.is_predeterminada))
            setNotas(found.notas || '')

            if (!found.is_empresa && found.contacto_id) {
              const matchedContact = contacts.find(c => c.id === found.contacto_id)

              if (matchedContact) setSelectedContact(matchedContact)
            }
          }
        }
      } catch (err) {
        console.error('Error cargando cuenta bancaria:', err)
        setToast({ open: true, message: 'Error al cargar los datos', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [id, isCreate])

  // Sequential navigation
  const currentIndex = useMemo(() => {
    return allAccounts.findIndex(a => a.id === id)
  }, [allAccounts, id])

  const prevAccount = currentIndex > 0 ? allAccounts[currentIndex - 1] : null
  const nextAccount = currentIndex >= 0 && currentIndex < allAccounts.length - 1 ? allAccounts[currentIndex + 1] : null

  // Bank selection helper
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

  // Contact selection helper
  const handleContactSelect = (contact: TerceroEntity | null) => {
    setSelectedContact(contact)

    if (contact) {
      setTitular(contact.nombre_razon_social)
      setIdentificacionTitular(contact.identificacion)
      if (contact.telefono_principal) setTelefonoPagoMovil(contact.telefono_principal)
      if (contact.email_principal) setEmailNotificacion(contact.email_principal)
    }
  }

  // Save changes
  const handleSave = async () => {
    if (!banco.trim()) {
      setToast({ open: true, message: 'Selecciona una entidad bancaria.', severity: 'error' })
      
return
    }

    if (!numeroCuenta.trim()) {
      setToast({ open: true, message: 'Ingresa el número de cuenta o identificador.', severity: 'error' })
      
return
    }

    if (!titular.trim()) {
      setToast({ open: true, message: 'Ingresa el titular de la cuenta.', severity: 'error' })
      
return
    }

    if (!identificacionTitular.trim()) {
      setToast({ open: true, message: 'Ingresa el RIF o Cédula del titular.', severity: 'error' })
      
return
    }

    if (isPagoMovil && !telefonoPagoMovil.trim()) {
      setToast({ open: true, message: 'Para Pago Móvil debes registrar el número telefónico.', severity: 'error' })
      
return
    }

    try {
      setSaving(true)
      const isCompany = ownerType === 'COMPANY'
      const assignedContactId = isCompany ? 'COMPANY' : (selectedContact?.id || undefined)
      const assignedContactName = isCompany ? 'Empresa (Distribuidora Global C.A.)' : (selectedContact?.nombre_razon_social || undefined)

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

      if (isCreate) {
        const created = await bankAccountsService.createBankAccount(payload)

        setToast({ open: true, message: `Cuenta ${created.banco} creada con éxito`, severity: 'success' })
        router.push(`/contacts/bank-accounts/${created.id}`)
      } else {
        const updated = await bankAccountsService.updateBankAccount(id, payload)

        setAccount(updated)
        setToast({ open: true, message: `Cuenta ${updated.banco} actualizada con éxito`, severity: 'success' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la cuenta bancaria'

      setToast({ open: true, message: msg, severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleConfirmDelete = async () => {
    try {
      await bankAccountsService.deleteBankAccount(id)
      setToast({ open: true, message: 'Cuenta bancaria eliminada exitosamente', severity: 'success' })
      setDeleteConfirmOpen(false)
      router.push('/contacts/bank-accounts')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la cuenta'

      setToast({ open: true, message: msg, severity: 'error' })
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col gap-6 w-full pb-12'>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant='rectangular' width={300} height={40} sx={{ borderRadius: 2 }} />
          <Skeleton variant='rectangular' width={200} height={40} sx={{ borderRadius: 9999 }} />
        </Box>
        <Skeleton variant='rectangular' width='100%' height={400} sx={{ borderRadius: 4 }} />
      </div>
    )
  }

  if (!isCreate && !account) {
    return (
      <Card className='p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto rounded-2xl border border-[#E6E4F0]'>
        <i className='tabler-building-bank text-5xl text-[#9CA3AF] mb-3' />
        <Typography variant='h6' className='font-semibold text-textPrimary mb-1'>
          Cuenta Bancaria no encontrada
        </Typography>
        <Typography variant='body2' className='text-textSecondary mb-4'>
          El registro de cuenta bancaria que buscas no existe o fue desincorporado.
        </Typography>
        <Button
          component={Link}
          href='/contacts/bank-accounts'
          variant='contained'
          startIcon={<i className='tabler-arrow-left' />}
          sx={{ borderRadius: '9999px', backgroundColor: '#6C5CE7', px: 3, '&:hover': { backgroundColor: '#5A4AD1' } }}
        >
          Volver a Cuentas Bancarias
        </Button>
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-6 w-full pb-12'>
      {/* Top Header: Volver + Título + Chips | Navegador + Cancelar + Guardar + Eliminar */}
      <div className='flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap'>
        {/* Izquierda */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          <Tooltip title='Volver a cuentas bancarias'>
            <Button
              component={Link}
              href='/contacts/bank-accounts'
              variant='text'
              sx={{
                minWidth: 'auto',
                width: 38,
                height: 38,
                p: 0,
                borderRadius: '9999px',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E4F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': { color: '#6C5CE7', backgroundColor: '#F0EEF9', borderColor: '#6C5CE7' }
              }}
            >
              <i className='tabler-arrow-left text-lg' />
            </Button>
          </Tooltip>

          <div className='min-w-0 flex-1 flex items-center gap-2.5 flex-wrap'>
            <Typography variant='h4' className='font-bold text-textPrimary truncate'>
              {isCreate ? 'Nueva Cuenta Bancaria' : (banco ? `${banco} · ${numeroCuenta.slice(-4) || 'Detalle'}` : 'Cuenta Bancaria')}
            </Typography>

            {isCreate ? (
              <CustomChip variant='tonal' color='primary' size='small' label='Borrador' />
            ) : (
              <>
                <CustomChip variant='tonal' color='success' size='small' label='Activa' />
                <CustomChip
                  variant='tonal'
                  color={ownerType === 'COMPANY' ? 'primary' : 'info'}
                  size='small'
                  label={ownerType === 'COMPANY' ? 'Empresa' : 'Tercero'}
                />
                <CustomChip variant='tonal' color='warning' size='small' label={moneda} />
                {isPredeterminada && (
                  <CustomChip variant='tonal' color='success' size='small' label='Predeterminada' />
                )}
              </>
            )}
          </div>
        </div>

        {/* Derecha: Navegador + Acciones */}
        <div className='flex items-center gap-2.5 shrink-0'>
          {!isCreate && allAccounts.length > 0 && (
            <div className='flex items-center gap-1 bg-[var(--mui-palette-action-hover)] px-2 py-0.5 rounded-lg border border-[var(--mui-palette-divider)] shrink-0'>
              <Tooltip title={prevAccount ? `Anterior: ${prevAccount.banco}` : 'Primera cuenta'}>
                <span>
                  <IconButton
                    size='small'
                    disabled={!prevAccount}
                    onClick={() => prevAccount && router.push(`/contacts/bank-accounts/${prevAccount.id}`)}
                    className='text-primary'
                  >
                    <i className='tabler-chevron-left text-base' />
                  </IconButton>
                </span>
              </Tooltip>

              <Typography variant='caption' className='font-semibold text-textPrimary select-none px-1 font-mono'>
                {currentIndex + 1} / {allAccounts.length}
              </Typography>

              <Tooltip title={nextAccount ? `Siguiente: ${nextAccount.banco}` : 'Última cuenta'}>
                <span>
                  <IconButton
                    size='small'
                    disabled={!nextAccount}
                    onClick={() => nextAccount && router.push(`/contacts/bank-accounts/${nextAccount.id}`)}
                    className='text-primary'
                  >
                    <i className='tabler-chevron-right text-base' />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          )}

          <Button
            component={Link}
            href='/contacts/bank-accounts'
            variant='tonal'
            color='secondary'
            size='small'
            className='shrink-0'
          >
            Cancelar
          </Button>

          <Button
            variant='contained'
            color='primary'
            size='small'
            disabled={saving}
            startIcon={saving ? <i className='tabler-loader-2 animate-spin' /> : <i className='tabler-device-floppy' />}
            onClick={handleSave}
            className='shrink-0'
          >
            {saving ? (isCreate ? 'Creando...' : 'Guardando...') : (isCreate ? 'Crear' : 'Guardar')}
          </Button>

          {!isCreate && (
            <Tooltip title='Eliminar cuenta bancaria'>
              <Button
                variant='tonal'
                color='error'
                size='small'
                startIcon={<i className='tabler-trash' />}
                onClick={() => setDeleteConfirmOpen(true)}
                className='shrink-0'
              >
                Eliminar
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Form Content Cards */}
      <Grid container spacing={6}>
        {/* Card 1: Pertenencia y Titularidad */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            <CardContent className='flex flex-col gap-6 p-6'>
              <div className='flex items-center justify-between flex-wrap gap-2 border-b border-[var(--mui-palette-divider)] pb-4'>
                <div className='flex items-center gap-2.5'>
                  <div className='w-9 h-9 rounded-xl bg-[rgba(108,92,231,0.1)] text-[#6C5CE7] flex items-center justify-center text-lg'>
                    <i className='tabler-user-check' />
                  </div>
                  <div>
                    <Typography variant='h6' className='font-semibold text-textPrimary'>
                      Titularidad y Asignación de la Cuenta
                    </Typography>
                    <Typography variant='caption' className='text-textSecondary'>
                      Define si la cuenta pertenece a los fondos de la empresa o a un cliente/proveedor
                    </Typography>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
                  <Typography variant='body2' className={`font-semibold ${ownerType === 'COMPANY' ? 'text-[#6C5CE7]' : 'text-textSecondary'}`}>
                    Cuenta de la Empresa
                  </Typography>
                  <Switch
                    checked={ownerType === 'CONTACT'}
                    onChange={e => {
                      const next = e.target.checked ? 'CONTACT' : 'COMPANY'

                      setOwnerType(next)

                      if (next === 'COMPANY') {
                        setSelectedContact(null)
                        setTitular('Distribuidora Global C.A.')
                        setIdentificacionTitular('J-40192834-5')
                      } else {
                        setTitular('')
                        setIdentificacionTitular('')
                      }
                    }}
                    color='primary'
                  />
                  <Typography variant='body2' className={`font-semibold ${ownerType === 'CONTACT' ? 'text-[#6C5CE7]' : 'text-textSecondary'}`}>
                    Cuenta de Cliente / Proveedor
                  </Typography>
                </div>
              </div>

              <Grid container spacing={4}>
                {ownerType === 'CONTACT' && (
                  <Grid size={{ xs: 12 }}>
                    <Autocomplete
                      options={contactsList}
                      getOptionLabel={option => `${option.nombre_razon_social} (${option.identificacion})`}
                      value={selectedContact}
                      onChange={(_, newVal) => handleContactSelect(newVal)}
                      renderInput={params => (
                        <CustomTextField
                          {...params}
                          label='Vincular con Contacto / Tercero'
                          placeholder='Buscar cliente o proveedor por nombre o RIF...'
                          helperText='Al seleccionar un contacto se precargan automáticamente sus datos de titularidad'
                        />
                      )}
                    />
                  </Grid>
                )}

                <Grid size={{ xs: 12, md: 7 }}>
                  <CustomTextField
                    fullWidth
                    label='Nombre o Razón Social del Titular *'
                    placeholder='Ej: Distribuidora Global C.A. o Juan Pérez'
                    value={titular}
                    onChange={e => setTitular(e.target.value)}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <CustomTextField
                    fullWidth
                    label='RIF o Cédula de Identidad *'
                    placeholder='Ej: J-40192834-5 o V-18456789'
                    value={identificacionTitular}
                    onChange={e => setIdentificacionTitular(e.target.value.toUpperCase())}
                    required
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Datos Bancarios y Financieros */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden'
            }}
          >
            <CardContent className='flex flex-col gap-6 p-6'>
              <div className='flex items-center gap-2.5 border-b border-[var(--mui-palette-divider)] pb-4'>
                <div className='w-9 h-9 rounded-xl bg-[rgba(108,92,231,0.1)] text-[#6C5CE7] flex items-center justify-center text-lg'>
                  <i className='tabler-building-bank' />
                </div>
                <div>
                  <Typography variant='h6' className='font-semibold text-textPrimary'>
                    Datos Bancarios y Financieros
                  </Typography>
                  <Typography variant='caption' className='text-textSecondary'>
                    Entidad bancaria, número de cuenta, tipo de instrumento y moneda de curso
                  </Typography>
                </div>
              </div>

              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label='Entidad Bancaria *'
                    value={banco}
                    onChange={e => handleBankChange(e.target.value)}
                  >
                    <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#94A3B8' }}>
                      ── BANCOS NACIONALES (VENEZUELA) ──
                    </MenuItem>
                    {VENEZUELAN_BANKS.map(b => (
                      <MenuItem key={b.codigo} value={b.nombre}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span>{b.nombre}</span>
                          <span className='font-mono text-xs text-[#94A3B8]'>{b.codigo}</span>
                        </Box>
                      </MenuItem>
                    ))}

                    <MenuItem disabled sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#94A3B8', mt: 1 }}>
                      ── BANCOS INTERNACIONALES Y DIGITALES ──
                    </MenuItem>
                    {INTERNATIONAL_BANKS.map(b => (
                      <MenuItem key={b.codigo} value={b.nombre}>
                        <span>{b.nombre}</span>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    fullWidth
                    label='Número de Cuenta / Identificador *'
                    placeholder='Ej: 0102-0123-45-1234567890 o email para Zelle'
                    value={numeroCuenta}
                    onChange={e => setNumeroCuenta(e.target.value)}
                    helperText={
                      banco.includes('Zelle') || banco.includes('PayPal')
                        ? 'Ingresa el correo electrónico o identificador de cobro'
                        : 'Ingresa los 20 dígitos de la cuenta bancaria sin guiones o con formato estándar'
                    }
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label='Tipo de Cuenta *'
                    value={tipoCuenta}
                    onChange={e => setTipoCuenta(e.target.value as BankAccountType)}
                  >
                    <MenuItem value='CORRIENTE'>Cuenta Corriente</MenuItem>
                    <MenuItem value='AHORRO'>Cuenta de Ahorros</MenuItem>
                    <MenuItem value='VIRTUAL'>Billetera Virtual / Pasarela Digital</MenuItem>
                    <MenuItem value='OTRO'>Otro Instrumento Financiero</MenuItem>
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label='Moneda de la Cuenta *'
                    value={moneda}
                    onChange={e => setMoneda(e.target.value as BankCurrency)}
                  >
                    <MenuItem value='VES'>Bolívares (VES)</MenuItem>
                    <MenuItem value='USD'>Dólares Americanos (USD)</MenuItem>
                    <MenuItem value='EUR'>Euros (EUR)</MenuItem>
                  </CustomTextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Canales Digitales y Notificaciones */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden',
              height: '100%'
            }}
          >
            <CardContent className='flex flex-col gap-6 p-6'>
              <div className='flex items-center gap-2.5 border-b border-[var(--mui-palette-divider)] pb-4'>
                <div className='w-9 h-9 rounded-xl bg-[rgba(108,92,231,0.1)] text-[#6C5CE7] flex items-center justify-center text-lg'>
                  <i className='tabler-device-mobile' />
                </div>
                <div>
                  <Typography variant='h6' className='font-semibold text-textPrimary'>
                    Canales de Pago & Notificaciones
                  </Typography>
                  <Typography variant='caption' className='text-textSecondary'>
                    Configuración de Pago Móvil interbancario y correo para envío de comprobantes
                  </Typography>
                </div>
              </div>

              <div className='flex flex-col gap-4'>
                <FormControlLabel
                  control={<Switch checked={isPagoMovil} onChange={e => setIsPagoMovil(e.target.checked)} color='primary' />}
                  label='Habilitar canal de Pago Móvil para esta cuenta'
                />

                {isPagoMovil && (
                  <CustomTextField
                    fullWidth
                    label='Número Telefónico Receptor (Pago Móvil) *'
                    placeholder='Ej: 0414-1234567 o 0412-9876543'
                    value={telefonoPagoMovil}
                    onChange={e => setTelefonoPagoMovil(e.target.value)}
                    helperText='Requerido para generar códigos de cobro y liquidaciones de Pago Móvil'
                    required={isPagoMovil}
                  />
                )}

                <CustomTextField
                  fullWidth
                  label='Correo Electrónico para Comprobantes'
                  placeholder='Ej: pagos@empresa.com o finanzas@cliente.com'
                  type='email'
                  value={emailNotificacion}
                  onChange={e => setEmailNotificacion(e.target.value)}
                  helperText='Recibe confirmaciones automáticas de transferencias y conciliación'
                />
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Preferencias y Notas Operativas */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)',
              overflow: 'hidden',
              height: '100%'
            }}
          >
            <CardContent className='flex flex-col gap-6 p-6'>
              <div className='flex items-center gap-2.5 border-b border-[var(--mui-palette-divider)] pb-4'>
                <div className='w-9 h-9 rounded-xl bg-[rgba(108,92,231,0.1)] text-[#6C5CE7] flex items-center justify-center text-lg'>
                  <i className='tabler-settings' />
                </div>
                <div>
                  <Typography variant='h6' className='font-semibold text-textPrimary'>
                    Ajustes Operativos
                  </Typography>
                  <Typography variant='caption' className='text-textSecondary'>
                    Prioridad en tesorería y notas internas del equipo
                  </Typography>
                </div>
              </div>

              <div className='flex flex-col gap-4'>
                <FormControlLabel
                  control={<Switch checked={isPredeterminada} onChange={e => setIsPredeterminada(e.target.checked)} color='primary' />}
                  label='Cuenta Principal Predeterminada'
                />
                <Typography variant='caption' className='text-textSecondary -mt-2'>
                  Se seleccionará por defecto al emitir o cobrar facturas con este titular
                </Typography>

                <CustomTextField
                  fullWidth
                  multiline
                  rows={4}
                  label='Notas u Observaciones Internas'
                  placeholder='Ej: Cuenta custodia para retenciones, sucursal Centro, o contacto con el oficial de cuenta...'
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle className='font-bold text-textPrimary'>
          ¿Eliminar Cuenta Bancaria?
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' className='text-textSecondary'>
            Esta acción eliminará la cuenta bancaria de <strong>{banco}</strong> ({numeroCuenta}).
            Las facturas previamente asociadas conservarán su registro histórico.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color='secondary'>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleConfirmDelete}
            sx={{ borderRadius: '9999px' }}
          >
            Sí, Eliminar Cuenta Bancaria
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant='filled'
          sx={{ borderRadius: '12px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default BankAccountDetailView
