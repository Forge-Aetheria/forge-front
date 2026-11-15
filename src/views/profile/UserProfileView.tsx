'use client'

import React, { useState, useEffect, useRef } from 'react'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'

import CustomChip from '@core/components/mui/Chip'
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services/settingsService'
import type { CompanySettings, UserProfile } from '@/types/settingsTypes'
import { getTenantInitials } from '@/utils/tenantAvatar'

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMIN: 'Administrador General',
  VENTAS: 'Asesor Comercial / Ventas',
  COMPRAS: 'Especialista de Compras',
  ALMACEN: 'Jefe de Almacén y Operaciones',
  CAJERO_POS: 'Cajero de Punto de Venta',
  UNASSIGNED: 'Sin Rol Asignado'
}

const UserProfileView: React.FC = () => {
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [tenantAvatarUrl, setTenantAvatarUrl] = useState('')
  const [uploadingTenantAvatar, setUploadingTenantAvatar] = useState(false)
  const tenantAvatarInputRef = useRef<HTMLInputElement>(null)

  // Personal Info Form State
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Toast State
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({ open: false, message: '', severity: 'success' })

  const loadProfile = async () => {
    setLoading(true)

    try {
      const [dataResult, companyResult] = await Promise.allSettled([
        settingsService.getUserProfile(),
        settingsService.getCompanySettings()
      ])

      if (dataResult.status !== 'fulfilled') throw dataResult.reason

      const data = dataResult.value

      setProfile(data)
      setNombre(data.nombre)
      setTelefono(data.telefono || '')

      if (companyResult.status === 'fulfilled') {
        setCompany(companyResult.value)
        setTenantAvatarUrl(companyResult.value.logoUrl || '')
      }
    } catch {
      setToast({ open: true, message: 'Error al cargar los datos del perfil', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      setToast({ open: true, message: 'El nombre completo es obligatorio.', severity: 'error' })

      return
    }

    setSavingProfile(true)

    try {
      const updated = await settingsService.updateUserProfile({
        nombre: nombre.trim(),
        telefono: telefono.trim()
      })

      setProfile(updated)
      await refreshUser()
      setToast({ open: true, message: 'Perfil actualizado exitosamente.', severity: 'success' })
    } catch {
      setToast({ open: true, message: 'Error al actualizar el perfil.', severity: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const persistTenantAvatar = async (logoUrl: string, successMessage: string) => {
    setUploadingTenantAvatar(true)

    try {
      const updated = await settingsService.updateCompanySettings({ logoUrl })

      setCompany(updated)
      setTenantAvatarUrl(updated.logoUrl || '')
      await refreshUser()
      setToast({ open: true, message: successMessage, severity: 'success' })
    } catch {
      setToast({ open: true, message: 'No se pudo actualizar la imagen de la empresa.', severity: 'error' })
    } finally {
      setUploadingTenantAvatar(false)

      if (tenantAvatarInputRef.current) {
        tenantAvatarInputRef.current.value = ''
      }
    }
  }

  const handleTenantAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setToast({ open: true, message: 'Seleccione un archivo de imagen válido.', severity: 'error' })

      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setToast({ open: true, message: 'La imagen supera el límite máximo de 2 MB.', severity: 'error' })

      return
    }

    const reader = new FileReader()

    reader.onload = event2 => {
      const result = event2.target?.result as string

      void persistTenantAvatar(result, 'Imagen de la empresa actualizada exitosamente.')
    }

    reader.readAsDataURL(file)
  }

  const handleRemoveTenantAvatar = () => {
    void persistTenantAvatar('', 'Imagen de la empresa eliminada. Se usará el logo con iniciales.')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword) {
      setToast({ open: true, message: 'Ingrese su contraseña actual.', severity: 'error' })

      return
    }

    if (newPassword.length < 6) {
      setToast({
        open: true,
        message: 'La nueva contraseña debe tener un mínimo de 6 caracteres.',
        severity: 'error'
      })

      return
    }

    if (newPassword !== confirmPassword) {
      setToast({
        open: true,
        message: 'La confirmación de la nueva contraseña no coincide.',
        severity: 'error'
      })

      return
    }

    setSavingPassword(true)

    try {
      const res = await settingsService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      })

      if (res.success) {
        setToast({ open: true, message: res.message, severity: 'success' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setToast({ open: true, message: res.message, severity: 'error' })
      }
    } catch {
      setToast({ open: true, message: 'Error al cambiar la contraseña.', severity: 'error' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col gap-6 p-1'>
        <Skeleton variant='rectangular' height={70} sx={{ borderRadius: '18px' }} />
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant='rectangular' height={380} sx={{ borderRadius: '20px' }} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant='rectangular' height={520} sx={{ borderRadius: '20px' }} />
          </Grid>
        </Grid>
      </div>
    )
  }

  const isProfileAdmin = profile?.rol === 'ADMIN'
  const roleName = profile ? ROLE_DISPLAY_NAMES[profile.rol] || profile.rol : 'Sin Rol Asignado'

  return (
    <div className='flex flex-col gap-6 p-1'>
      {/* Header Principal */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3 flex-wrap'>
            <Typography variant='h4' className='font-bold text-[#1E1B2E]'>
              Mi Perfil
            </Typography>
            <CustomChip
              size='small'
              label={roleName}
              color={isProfileAdmin ? 'primary' : 'secondary'}
              variant='tonal'
            />
          </div>
          <Typography variant='body2' className='text-[#6B7280] mt-1'>
            Gestión de identidad, datos personales y seguridad de la cuenta
          </Typography>
        </div>

        {profile?.tenantName && (
          <div className='flex items-center gap-2 bg-[#FFFFFF] border border-[#E6E4F0] px-4 py-2 rounded-full shadow-xs'>
            {tenantAvatarUrl ? (
              <img
                src={tenantAvatarUrl}
                alt={profile.tenantName}
                className='w-5 h-5 rounded-full object-cover'
              />
            ) : (
              <span className='w-5 h-5 rounded-full bg-[#F3F0FF] text-[#6C5CE7] text-[9px] font-bold flex items-center justify-center'>
                {getTenantInitials(profile.tenantName)}
              </span>
            )}
            <span className='text-xs font-bold text-[#1E1B2E]'>{profile.tenantName}</span>
          </div>
        )}
      </div>

      <Grid container spacing={5}>
        {/* Columna Izquierda: Tarjeta de Avatar & Resumen de Acceso */}
        <Grid size={{ xs: 12, md: 4 }} className='flex flex-col gap-5'>
          {/* Tarjeta de Avatar y Rol */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className='p-6 flex flex-col items-center text-center'>
              <div className='relative mb-2'>
                <Avatar
                  alt={company?.nombreComercial || profile?.tenantName || nombre}
                  src={tenantAvatarUrl || undefined}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: '#6C5CE7',
                    color: '#FFFFFF',
                    fontSize: '2rem',
                    fontWeight: 800,
                    border: '3px solid #FFFFFF',
                    boxShadow: '0 4px 14px rgba(108, 92, 231, 0.25)'
                  }}
                >
                  {getTenantInitials(company?.nombreComercial || profile?.tenantName)}
                </Avatar>

                <input
                  ref={tenantAvatarInputRef}
                  type='file'
                  accept='image/png, image/jpeg, image/webp'
                  hidden
                  onChange={handleTenantAvatarChange}
                />

                <IconButton
                  size='small'
                  disabled={uploadingTenantAvatar}
                  onClick={() => tenantAvatarInputRef.current?.click()}
                  aria-label='Cambiar imagen de la empresa'
                  sx={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    backgroundColor: '#6C5CE7',
                    color: '#FFFFFF',
                    border: '2px solid #FFFFFF',
                    boxShadow: '0 4px 10px rgba(108, 92, 231, 0.35)',
                    '&:hover': { backgroundColor: '#5B4CDB' }
                  }}
                >
                  {uploadingTenantAvatar ? (
                    <CircularProgress size={14} color='inherit' />
                  ) : (
                    <i className='tabler-plus text-sm' />
                  )}
                </IconButton>

                {uploadingTenantAvatar && (
                  <div className='absolute inset-0 rounded-full bg-black/35 flex items-center justify-center'>
                    <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
                  </div>
                )}
              </div>

              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                {nombre || 'Usuario'}
              </Typography>
              <Typography variant='body2' className='text-xs text-[#6B7280] mb-2'>
                {profile?.email}
              </Typography>

              <CustomChip
                size='small'
                label='Cuenta Activa'
                color='success'
                variant='tonal'
              />

              {tenantAvatarUrl && (
                <button
                  type='button'
                  onClick={handleRemoveTenantAvatar}
                  disabled={uploadingTenantAvatar}
                  className='text-[11px] font-semibold text-[#EF4444] hover:underline mt-3 bg-transparent border-0 cursor-pointer p-0 disabled:opacity-50'
                >
                  Quitar imagen
                </button>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta Informativa de Seguridad & Permisos */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.04)'
            }}
          >
            <CardContent className='p-5 flex flex-col gap-3.5 text-xs text-[#6B7280]'>
              <Typography variant='subtitle2' className='font-bold text-[#1E1B2E] flex items-center gap-2'>
                <i className='tabler-shield-check text-[#6C5CE7] text-base' />
                Privilegios y Auditoría
              </Typography>

              <div className='flex items-center justify-between py-1 border-b border-[#F4F3F8]'>
                <span>Nivel de Acceso:</span>
                <strong className='text-[#1E1B2E] font-mono'>{profile?.rol}</strong>
              </div>

              <div className='flex items-center justify-between py-1 border-b border-[#F4F3F8]'>
                <span>Último Acceso Registrado:</span>
                <span className='text-[#1E1B2E]'>{profile?.ultimoIngreso || 'Hoy'}</span>
              </div>

              <div className='flex items-center justify-between py-1 border-b border-[#F4F3F8]'>
                <span>Fecha de Alta:</span>
                <span className='text-[#1E1B2E]'>{profile?.creadoEn || '15/01/2026'}</span>
              </div>

              <div className='bg-[#F8F7FC] p-3 rounded-xl border border-[#E6E4F0] mt-1 text-[11px] text-[#6B7280] leading-relaxed'>
                <i className='tabler-info-circle text-[#6C5CE7] mr-1 inline-block' />
                Los permisos operativos corresponden a su rol en el sistema. Para solicitar un cambio de funciones, contacte al Administrador.
              </div>
            </CardContent>
          </Card>
        </Grid>

        {/* Columna Derecha: Formularios de Datos y Contraseña */}
        <Grid size={{ xs: 12, md: 8 }} className='flex flex-col gap-5'>
          {/* Tarjeta de Información Personal */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className='p-6 flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                    Datos Personales
                  </Typography>
                  <span className='text-xs text-[#6B7280]'>
                    Actualice su nombre e información de contacto directo
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className='flex flex-col gap-4 mt-2'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <TextField
                    size='small'
                    label='Nombre Completo'
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#FAFAFC'
                      }
                    }}
                  />

                  <TextField
                    size='small'
                    label='Correo Electrónico'
                    value={profile?.email || ''}
                    disabled
                    fullWidth
                    helperText='El correo es su identificador de inicio de sesión'
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#F4F3F8'
                      }
                    }}
                  />
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <TextField
                    size='small'
                    label='Teléfono de Contacto'
                    placeholder='Ej. +58 412-1234567'
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#FAFAFC'
                      }
                    }}
                  />

                  <TextField
                    size='small'
                    label='Empresa / Organización'
                    value={profile?.tenantName || 'Distribuidora Global C.A.'}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#F4F3F8'
                      }
                    }}
                  />
                </div>

                <div className='flex justify-end mt-2'>
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={savingProfile}
                    startIcon={
                      savingProfile ? (
                        <CircularProgress size={16} color='inherit' />
                      ) : (
                        <i className='tabler-device-floppy text-base' />
                      )
                    }
                    sx={{
                      borderRadius: '9999px',
                      textTransform: 'none',
                      backgroundColor: '#6C5CE7',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      px: 3.5,
                      py: 1.1,
                      boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                      '&:hover': { backgroundColor: '#5B4CDB' }
                    }}
                  >
                    {savingProfile ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tarjeta de Seguridad (Cambio de Contraseña) */}
          <Card
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E6E4F0',
              boxShadow: '0 4px 18px 0 rgba(108, 92, 231, 0.05)'
            }}
          >
            <CardContent className='p-6 flex flex-col gap-4'>
              <div>
                <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                  Seguridad y Contraseña
                </Typography>
                <span className='text-xs text-[#6B7280]'>
                  Se recomienda usar al menos 6 caracteres con números y símbolos
                </span>
              </div>

              <form onSubmit={handleChangePassword} className='flex flex-col gap-4 mt-2'>
                <TextField
                  size='small'
                  label='Contraseña Actual'
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: '#FAFAFC'
                    }
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge='end'
                          >
                            <i
                              className={
                                showCurrentPassword ? 'tabler-eye-off text-[#6B7280]' : 'tabler-eye text-[#6B7280]'
                              }
                            />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <TextField
                    size='small'
                    label='Nueva Contraseña'
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    fullWidth
                    helperText='Mínimo 6 caracteres'
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#FAFAFC'
                      }
                    }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position='end'>
                            <IconButton
                              size='small'
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge='end'
                            >
                              <i
                                className={
                                  showNewPassword ? 'tabler-eye-off text-[#6B7280]' : 'tabler-eye text-[#6B7280]'
                                }
                              />
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />

                  <TextField
                    size='small'
                    label='Confirmar Nueva Contraseña'
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    fullWidth
                    error={Boolean(confirmPassword && newPassword !== confirmPassword)}
                    helperText={
                      confirmPassword && newPassword !== confirmPassword
                        ? 'Las contraseñas no coinciden'
                        : 'Repita la nueva contraseña'
                    }
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#FAFAFC'
                      }
                    }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position='end'>
                            <IconButton
                              size='small'
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge='end'
                            >
                              <i
                                className={
                                  showConfirmPassword ? 'tabler-eye-off text-[#6B7280]' : 'tabler-eye text-[#6B7280]'
                                }
                              />
                            </IconButton>
                          </InputAdornment>
                        )
                      }
                    }}
                  />
                </div>

                <div className='flex justify-end mt-2'>
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={savingPassword}
                    startIcon={
                      savingPassword ? (
                        <CircularProgress size={16} color='inherit' />
                      ) : (
                        <i className='tabler-lock-check text-base' />
                      )
                    }
                    sx={{
                      borderRadius: '9999px',
                      textTransform: 'none',
                      backgroundColor: '#6C5CE7',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      px: 3.5,
                      py: 1.1,
                      boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                      '&:hover': { backgroundColor: '#5B4CDB' }
                    }}
                  >
                    {savingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar Notificaciones */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant='filled'
          sx={{ borderRadius: '14px', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default UserProfileView
