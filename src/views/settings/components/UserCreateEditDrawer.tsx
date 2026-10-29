'use client'

import React, { useState, useEffect } from 'react'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

import type { ErpUser, SystemRole, UserAccountStatus } from '@/types/settingsTypes'

interface Props {
  open: boolean
  isAdmin?: boolean
  onClose: () => void
  userToEdit: ErpUser | null
  onSave: (data: {
    nombre: string
    email: string
    telefono?: string
    rol: SystemRole
    estado: UserAccountStatus
    passwordInicial?: string
    password?: string
  }) => Promise<void>
}

const ROLES: { value: SystemRole; label: string; desc: string }[] = [
  { value: 'ADMIN', label: 'Administrador General', desc: 'Acceso total y configuración' },
  { value: 'VENTAS', label: 'Asesor Comercial / Ventas', desc: 'Presupuestos y clientes' },
  { value: 'COMPRAS', label: 'Especialista de Compras', desc: 'Cotizaciones y proveedores' },
  { value: 'ALMACEN', label: 'Almacén y Operaciones', desc: 'Recepciones, entregas e inventario' },
  { value: 'CAJERO_POS', label: 'Cajero POS', desc: 'Terminal y arqueo de caja' }
]

export const UserCreateEditDrawer: React.FC<Props> = ({
  open,
  isAdmin = true,
  onClose,
  userToEdit,
  onSave
}) => {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rol, setRol] = useState<SystemRole>('VENTAS')
  const [estado, setEstado] = useState<UserAccountStatus>('ACTIVO')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userToEdit) {
      setNombre(userToEdit.nombre)
      setEmail(userToEdit.email)
      setTelefono(userToEdit.telefono || '')
      const normalizedRol = (String(userToEdit.rol || '').toUpperCase() as SystemRole) || 'VENTAS'
      setRol(normalizedRol)
      setEstado(userToEdit.estado)
      setPassword('')
      setPasswordError('')
      setShowPassword(false)
    } else {
      setNombre('')
      setEmail('')
      setTelefono('')
      setRol('VENTAS')
      setEstado('ACTIVO')
      setPassword('')
      setPasswordError('')
      setShowPassword(false)
    }
  }, [userToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !email.trim()) return

    if (!userToEdit && password.length < 6) {
      setPasswordError('La contraseña inicial debe tener al menos 6 caracteres.')

      return
    }

    if (userToEdit && password && password.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.')

      return
    }

    setSubmitting(true)

    try {
      await onSave({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || undefined,
        rol,
        estado,
        passwordInicial: !userToEdit ? password.trim() : undefined,
        password: userToEdit && password.trim() ? password.trim() : undefined
      })
      onClose()
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
          width: { xs: '100%', sm: 460 },
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E6E4F0'
        }
      }}
    >
      <div className='flex flex-col h-full'>
        {/* Header */}
        <div className='p-5 bg-[#FAFAFC] border-b border-[#E6E4F0] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-[#F0EEF9] text-[#6C5CE7] flex items-center justify-center font-bold'>
              <i className={userToEdit ? 'tabler-user-edit text-lg' : 'tabler-user-plus text-lg'} />
            </div>
            <div>
              <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
                {userToEdit ? 'Editar Usuario' : 'Nuevo Usuario ERP'}
              </Typography>
              <span className='text-xs text-[#6B7280]'>
                {userToEdit
                  ? 'Modifique privilegios, datos o contraseña del usuario'
                  : 'Asigne credenciales y rol en el sistema'}
              </span>
            </div>
          </div>
          <IconButton onClick={onClose} size='small'>
            <i className='tabler-x text-lg text-[#6B7280]' />
          </IconButton>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className='p-6 flex-1 overflow-y-auto flex flex-col gap-4'>
          <TextField
            size='small'
            label='Nombre Completo'
            placeholder='Ej. María Alejandra Contreras'
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />

          <TextField
            size='small'
            label='Correo Electrónico (Acceso)'
            placeholder='usuario@empresa.com'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={Boolean(userToEdit)}
            required
            fullWidth
            helperText={userToEdit ? 'El correo no se puede modificar' : 'Se utilizará para iniciar sesión'}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: userToEdit ? '#F4F3F8' : '#FAFAFC' } }}
          />

          <TextField
            size='small'
            label='Teléfono (Opcional)'
            placeholder='+58 412-1234567'
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          />

          <TextField
            select
            size='small'
            label='Rol en el ERP'
            value={rol}
            onChange={e => setRol(e.target.value as SystemRole)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          >
            {ROLES.map(r => (
              <MenuItem key={r.value} value={r.value} className='flex flex-col items-start py-2'>
                <span className='font-bold text-sm text-[#1E1B2E]'>{r.label}</span>
                <span className='text-xs text-[#6B7280]'>{r.desc}</span>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size='small'
            label='Estado de la Cuenta'
            value={estado}
            onChange={e => setEstado(e.target.value as UserAccountStatus)}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
          >
            <MenuItem value='ACTIVO'>
              <span className='font-semibold text-success'>● Activo (Acceso habilitado)</span>
            </MenuItem>
            <MenuItem value='INACTIVO'>
              <span className='font-semibold text-textSecondary'>○ Inactivo (Acceso suspendido)</span>
            </MenuItem>
          </TextField>

          {/* Sección de Contraseña (Solo accesible para Administrador) */}
          {(!userToEdit || isAdmin) && (
            <div className='p-4 rounded-xl border border-[#E6E4F0] bg-[#FAFAFC] flex flex-col gap-2.5 mt-1'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-[#1E1B2E] flex items-center gap-1.5'>
                  <i className='tabler-key text-[#6C5CE7] text-sm' />
                  {userToEdit ? 'Modificar Contraseña' : 'Contraseña de Acceso'}
                </span>
                {userToEdit ? (
                  <span className='text-[10px] text-[#6B7280] bg-[#FFFFFF] border border-[#E6E4F0] px-2 py-0.5 rounded-full'>
                    Opcional (Solo Admin)
                  </span>
                ) : (
                  <span className='text-[10px] text-[#6C5CE7] bg-[#F0EEF9] border border-[#DCD8EC] px-2 py-0.5 rounded-full font-bold'>
                    Requerido
                  </span>
                )}
              </div>

              <TextField
                size='small'
                label={userToEdit ? 'Nueva Contraseña' : 'Contraseña Temporal Inicial'}
                type={showPassword ? 'text' : 'password'}
                placeholder='Mínimo 6 caracteres'
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                error={Boolean(passwordError)}
                helperText={
                  passwordError ||
                  (userToEdit
                    ? 'Deje en blanco si no desea modificar la contraseña actual'
                    : 'El usuario podrá cambiarla posteriormente desde Mi Perfil')
                }
                required={!userToEdit}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          size='small'
                          onClick={() => setShowPassword(p => !p)}
                          onMouseDown={e => e.preventDefault()}
                        >
                          <i className={showPassword ? 'tabler-eye-off text-base text-[#6B7280]' : 'tabler-eye text-base text-[#6B7280]'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FFFFFF' } }}
              />
            </div>
          )}

          <div className='mt-auto pt-6 flex items-center justify-end gap-2.5'>
            <Button
              variant='outlined'
              onClick={onClose}
              sx={{
                borderRadius: '9999px',
                borderColor: '#E6E4F0',
                color: '#6B7280',
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                color: '#FFFFFF',
                fontWeight: 600,
                textTransform: 'none',
                px: 3.5,
                boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}
