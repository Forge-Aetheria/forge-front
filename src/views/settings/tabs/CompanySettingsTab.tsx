'use client'

import React, { useState, useRef } from 'react'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import CustomChip from '@core/components/mui/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import type { CompanySettings } from '@/types/settingsTypes'
import type { BankAccount } from '@/types/bankAccountTypes'
import { bankAccountsService } from '@/services/bankAccountsService'
import { BankAccountModal } from '@/views/contacts/components/BankAccountModal'

interface Props {
  company: CompanySettings
  onSave: (data: Partial<CompanySettings>) => Promise<void>
}

const RIF_REGEX = /^[VEJG]-\d{8,9}$/i

export const CompanySettingsTab: React.FC<Props> = ({ company, onSave }) => {
  const [razonSocial, setRazonSocial] = useState(company.razonSocial)
  const [nombreComercial, setNombreComercial] = useState(company.nombreComercial)
  const [rif, setRif] = useState(company.rif)
  const [direccionFiscal, setDireccionFiscal] = useState(company.direccionFiscal)
  const [telefono, setTelefono] = useState(company.telefonoCorporativo)
  const [emailFacturacion, setEmailFacturacion] = useState(company.emailFacturacion)
  const [monedaBase, setMonedaBase] = useState<'USD' | 'VES'>(company.monedaBase)
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || '')
  const [saving, setSaving] = useState(false)
  const [rifError, setRifError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cuentas Bancarias de la Empresa
  const [companyBankAccounts, setCompanyBankAccounts] = useState<BankAccount[]>([])
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null)

  React.useEffect(() => {
    const fetchCompanyAccounts = async () => {
      try {
        const list = await bankAccountsService.getCompanyBankAccounts()
        setCompanyBankAccounts(list)
      } catch (err) {
        console.error(err)
      }
    }
    fetchCompanyAccounts()
  }, [])

  const handleOpenAddCompanyAccount = () => {
    setEditingBankAccount(null)
    setBankModalOpen(true)
  }

  const handleOpenEditCompanyAccount = (acc: BankAccount) => {
    setEditingBankAccount(acc)
    setBankModalOpen(true)
  }

  const handleDeleteCompanyAccount = async (id: string, banco: string) => {
    if (!confirm(`¿Eliminar la cuenta bancaria de ${banco}?`)) return
    try {
      await bankAccountsService.deleteBankAccount(id)
      setCompanyBankAccounts(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      alert(err.message || 'Error al eliminar')
    }
  }

  const handleSetDefaultCompanyAccount = async (acc: BankAccount) => {
    try {
      await bankAccountsService.setDefaultBankAccount(acc.id, undefined, true)
      const list = await bankAccountsService.getCompanyBankAccounts()
      setCompanyBankAccounts(list)
    } catch (err: any) {
      alert(err.message || 'Error al actualizar')
    }
  }

  const handleCompanyAccountSaved = async () => {
    const list = await bankAccountsService.getCompanyBankAccounts()
    setCompanyBankAccounts(list)
  }

  const handleRifChange = (val: string) => {
    setRif(val)

    if (val && !RIF_REGEX.test(val)) {
      setRifError('Formato inválido. Ejemplo: J-40192834-5 o V-12345678-0')
    } else {
      setRifError('')
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    // Validar tamaño máx 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen seleccionada supera el límite máximo permitido de 2 MB.')

      return
    }

    const reader = new FileReader()

    reader.onload = e => {
      const result = e.target?.result as string

      setLogoUrl(result)
    }

    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoUrl('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rif && !RIF_REGEX.test(rif)) {
      setRifError('Debe ingresar un RIF válido con guiones (Ej: J-40192834-5)')

      return
    }

    setSaving(true)

    try {
      await onSave({
        razonSocial: razonSocial.trim(),
        nombreComercial: nombreComercial.trim(),
        rif: rif.trim().toUpperCase(),
        direccionFiscal: direccionFiscal.trim(),
        telefonoCorporativo: telefono.trim(),
        emailFacturacion: emailFacturacion.trim(),
        monedaBase,
        logoUrl
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Cabecera Fuera de la Caja: Título a la izquierda + Logo elegante a la derecha */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E4F0]'>
        <div>
          <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
            Identidad Legal y Facturación de la Empresa
          </Typography>
          <Typography variant='body2' className='text-xs text-[#6B7280] mt-0.5'>
            Estos datos fiscales y el logotipo oficial se imprimirán en cotizaciones, órdenes de compra y facturación
          </Typography>
        </div>

        {/* Logotipo compacto y estilizado en la esquina derecha */}
        <div className='flex items-center gap-3 shrink-0'>
          <input
            type='file'
            ref={fileInputRef}
            accept='image/png, image/jpeg, image/svg+xml, image/webp'
            hidden
            onChange={handleFileChange}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className='group relative flex items-center justify-center w-12 h-12 rounded-xl border border-[#DCD8EC] bg-[#FAFAFC] hover:border-[#6C5CE7] hover:bg-[#F0EEF9] transition-all cursor-pointer overflow-hidden p-1 shadow-2xs shrink-0'
            title='Haz clic para cambiar el logotipo'
          >
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
                  alt='Logo de la empresa'
                  className='w-full h-full object-contain'
                />
                <div className='absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-xl'>
                  <i className='tabler-camera text-sm' />
                </div>
              </>
            ) : (
              <div className='flex flex-col items-center justify-center text-[#9CA3AF] group-hover:text-[#6C5CE7] transition-colors'>
                <i className='tabler-photo-up text-base text-[#6C5CE7]' />
              </div>
            )}
          </div>

          <div className='flex flex-col items-start'>
            <Button
              type='button'
              size='small'
              variant='outlined'
              onClick={() => fileInputRef.current?.click()}
              startIcon={<i className='tabler-upload text-xs' />}
              sx={{
                borderRadius: '9999px',
                borderColor: '#DCD8EC',
                color: '#1E1B2E',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
                py: 0.4,
                px: 1.6,
                '&:hover': {
                  borderColor: '#6C5CE7',
                  color: '#6C5CE7',
                  backgroundColor: 'rgba(108, 92, 231, 0.04)'
                }
              }}
            >
              {logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
            </Button>

            {logoUrl && (
              <button
                type='button'
                onClick={handleRemoveLogo}
                className='text-[10px] font-semibold text-[#EF4444] hover:underline mt-1 bg-transparent border-0 cursor-pointer p-0'
              >
                Quitar logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulario con el orden y distribución original intacto */}
      <form onSubmit={handleSubmit} className='flex flex-col gap-5'>
        {/* Fila 1: Razón Social y Nombre Comercial (2 Columnas iguales) */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <TextField
            size='small'
            label='Razón Social (Legal)'
            placeholder='Ej. Distribuidora Global de Suministros C.A.'
            value={razonSocial}
            onChange={e => setRazonSocial(e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />

          <TextField
            size='small'
            label='Nombre Comercial'
            placeholder='Ej. Forge Global Suministros'
            value={nombreComercial}
            onChange={e => setNombreComercial(e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />
        </div>

        {/* Fila 2: RIF, Teléfono y Correo (3 Columnas iguales) */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <TextField
            size='small'
            label='RIF Fiscal'
            placeholder='Ej. J-40192834-5'
            value={rif}
            onChange={e => handleRifChange(e.target.value)}
            error={Boolean(rifError)}
            helperText={rifError || 'Formato V/E/J/G con guiones'}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />

          <TextField
            size='small'
            label='Teléfono Corporativo'
            placeholder='Ej. +58 286-9614420'
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />

          <TextField
            size='small'
            label='Correo de Facturación'
            placeholder='administracion@empresa.com'
            type='email'
            value={emailFacturacion}
            onChange={e => setEmailFacturacion(e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />
        </div>

        {/* Fila 3: Dirección Fiscal (2 cols) y Moneda Base (1 col) */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <div className='sm:col-span-2'>
            <TextField
              size='small'
              label='Dirección Fiscal Completa'
              placeholder='Av., Edificio, Piso, Oficina, Ciudad, Estado'
              value={direccionFiscal}
              onChange={e => setDireccionFiscal(e.target.value)}
              required
              fullWidth
              multiline
              rows={2}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          <TextField
            select
            size='small'
            label='Moneda Base de Registro'
            value={monedaBase}
            onChange={e => setMonedaBase(e.target.value as 'USD' | 'VES')}
            fullWidth
            helperText='Moneda principal de valoración'
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          >
            <MenuItem value='USD'>
              <strong>Dólares Americanos (USD $)</strong>
            </MenuItem>
            <MenuItem value='VES'>
              <strong>Bolívares Digitales (VES Bs.)</strong>
            </MenuItem>
          </TextField>
        </div>

        {/* Separador */}
        <hr className='border-t border-[#E6E4F0] my-2' />

        {/* Sección Cuentas Bancarias de la Empresa */}
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <div>
              <Typography variant='subtitle1' sx={{ fontWeight: 700, color: '#1E1B2E', display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='tabler-building-bank text-xl text-[#6C5CE7]' />
                Cuentas Bancarias y Métodos de Cobro de la Empresa
              </Typography>
              <Typography variant='caption' sx={{ color: '#64748B' }}>
                Cuentas oficiales donde la empresa recibe transferencias, pago móvil y emite pagos
              </Typography>
            </div>

            <Button
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-plus text-xs' />}
              onClick={handleOpenAddCompanyAccount}
              sx={{
                borderRadius: '9999px',
                borderColor: '#6C5CE7',
                color: '#6C5CE7',
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5
              }}
            >
              Agregar Cuenta
            </Button>
          </div>

          {companyBankAccounts.length === 0 ? (
            <div className='p-6 text-center rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#FAF9FD]'>
              <i className='tabler-building-bank text-3xl text-[#CBD5E1] mb-2 block mx-auto' />
              <Typography variant='body2' sx={{ fontWeight: 600, color: '#475569' }}>
                No hay cuentas bancarias corporativas registradas
              </Typography>
              <Typography variant='caption' sx={{ color: '#94A3B8', display: 'block', mb: 2 }}>
                Especifica las cuentas donde la empresa recibe transferencias o emite pagos.
              </Typography>
              <Button
                variant='outlined'
                size='small'
                onClick={handleOpenAddCompanyAccount}
                sx={{ borderRadius: '9999px', textTransform: 'none', borderColor: '#6C5CE7', color: '#6C5CE7' }}
              >
                Agregar Primera Cuenta
              </Button>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {companyBankAccounts.map(acc => (
                <div
                  key={acc.id}
                  className='p-4 rounded-2xl border border-[#E6E4F0] bg-[#FAFAFC] hover:border-[#6C5CE7] transition-all flex flex-col justify-between gap-3'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-9 h-9 rounded-xl bg-[rgba(108,92,231,0.12)] text-[#6C5CE7] flex items-center justify-center text-lg shrink-0'>
                        <i className='tabler-building-bank' />
                      </div>
                      <div>
                        <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#1E1B2E' }}>
                          {acc.banco}
                        </Typography>
                        <Typography variant='caption' sx={{ color: '#64748B' }}>
                          {acc.titular} ({acc.identificacion_titular})
                        </Typography>
                      </div>
                    </div>
                    <div className='flex items-center gap-1'>
                      <CustomChip
                        label={acc.moneda}
                        size='small'
                        variant='tonal'
                        color={acc.moneda === 'USD' ? 'primary' : 'success'}
                      />
                      {acc.is_predeterminada && (
                        <CustomChip
                          label='Principal'
                          size='small'
                          variant='tonal'
                          color='success'
                        />
                      )}
                    </div>
                  </div>

                  <div className='bg-[#FFFFFF] p-2.5 rounded-xl border border-[#E2E8F0]'>
                    <Typography variant='caption' sx={{ color: '#64748B', display: 'block', fontSize: '0.65rem' }}>
                      NÚMERO DE CUENTA / IDENTIFICADOR
                    </Typography>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B', fontSize: '0.8rem' }}>
                      {acc.numero_cuenta}
                    </Typography>
                    {acc.is_pago_movil && acc.telefono_pago_movil && (
                      <Typography variant='caption' sx={{ color: '#10B981', fontWeight: 700, display: 'block', mt: 0.5 }}>
                        Pago Móvil: {acc.telefono_pago_movil}
                      </Typography>
                    )}
                  </div>

                  <div className='flex items-center justify-between pt-1 border-t border-[#EAE8F2]'>
                    <Typography variant='caption' sx={{ color: '#64748B', textTransform: 'capitalize' }}>
                      {acc.tipo_cuenta.toLowerCase()}
                    </Typography>
                    <div className='flex items-center gap-1'>
                      {!acc.is_predeterminada && (
                        <Tooltip title='Establecer como cuenta principal'>
                          <IconButton size='small' onClick={() => handleSetDefaultCompanyAccount(acc)} sx={{ color: '#F59E0B' }}>
                            <i className='tabler-star text-sm' />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title='Editar'>
                        <IconButton size='small' onClick={() => handleOpenEditCompanyAccount(acc)} sx={{ color: '#6C5CE7' }}>
                          <i className='tabler-edit text-sm' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Eliminar'>
                        <IconButton size='small' onClick={() => handleDeleteCompanyAccount(acc.id, acc.banco)} sx={{ color: '#EF4444' }}>
                          <i className='tabler-trash text-sm' />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separador */}
        <hr className='border-t border-[#E6E4F0] my-2' />

        {/* Botón Guardar */}
        <div className='flex justify-end pt-2'>
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
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>

      {/* Modal Cuenta Bancaria de la Empresa */}
      <BankAccountModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSuccess={handleCompanyAccountSaved}
        initialAccount={editingBankAccount}
        isCompanyOnly={true}
        lockedContactId='COMPANY'
        lockedContactName={razonSocial || 'Empresa (Forge Global)'}
        lockedContactRif={rif || 'J-40192834-5'}
      />
    </div>
  )
}
