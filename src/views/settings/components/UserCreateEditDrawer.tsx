'use client'

import React, { useEffect, useMemo, useState } from 'react'

import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'

import type { ErpRole, ErpUser, UserAccountStatus } from '@/types/settingsTypes'
import { settingsService } from '@/services/settingsService'
import { diffRoleIds, summarizeRemovedRoles, validateRoleIds } from '@/utils/roleSet'

export interface UserSaveData {
  nombre: string
  email: string
  telefono?: string
  roleIds: string[]
  initialRoleId?: string
  estado: UserAccountStatus
  passwordInicial?: string
  password?: string
}

interface Props {
  open: boolean
  isAdmin?: boolean
  currentUserId?: string
  canAssignRoles?: boolean
  onClose: () => void
  userToEdit: ErpUser | null
  onSave: (data: UserSaveData) => Promise<void>
}

const mapAssignableRole = (role: {
  id: string
  name: string
  description?: string | null
  isSystem?: boolean | null
}): ErpRole => ({
  id: role.id,
  name: role.name,
  description: role.description ?? undefined,
  isSystem: Boolean(role.isSystem)
})

export const UserCreateEditDrawer: React.FC<Props> = ({
  open,
  isAdmin = true,
  currentUserId,
  canAssignRoles = true,
  onClose,
  userToEdit,
  onSave
}) => {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<ErpRole[]>([])
  const [initialRoleId, setInitialRoleId] = useState('')
  const [estado, setEstado] = useState<UserAccountStatus>('ACTIVO')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selfEditConfirmed, setSelfEditConfirmed] = useState(false)
  const [pendingZeroRole, setPendingZeroRole] = useState<UserSaveData | null>(null)
  const [roleOptions, setRoleOptions] = useState<ErpRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState('')

  useEffect(() => {
    if (!open) return

    let active = true

    setRolesLoading(true)
    setRolesError('')

    settingsService
      .getAssignableRoles()
      .then(roles => {
        if (active) {
          setRoleOptions(roles.map(mapAssignableRole))
        }
      })
      .catch(() => {
        if (active) {
          setRolesError('No se pudieron cargar los roles disponibles del tenant.')
        }
      })
      .finally(() => {
        if (active) {
          setRolesLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    setFormError('')
    setPasswordError('')
    setSelfEditConfirmed(false)
    setPendingZeroRole(null)

    if (userToEdit) {
      setNombre(userToEdit.nombre)
      setEmail(userToEdit.email)
      setTelefono(userToEdit.telefono || '')
      setSelectedRoles(userToEdit.roles ?? [])
      setInitialRoleId('')
      setEstado(userToEdit.estado)
    } else {
      setNombre('')
      setEmail('')
      setTelefono('')
      setSelectedRoles([])
      setInitialRoleId('')
      setEstado('ACTIVO')
    }

    setPassword('')
    setShowPassword(false)
  }, [userToEdit, open])

  const roleOptionsWithAssigned = useMemo(() => {
    const byId = new Map(roleOptions.map(role => [role.id, role]))

    for (const role of selectedRoles) {
      if (!byId.has(role.id)) {
        byId.set(role.id, role)
      }
    }

    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name))
  }, [roleOptions, selectedRoles])

  const isSelfEdit = Boolean(userToEdit && currentUserId && userToEdit.id === currentUserId)

  const rolesChanged = userToEdit
    ? (() => {
        const diff = diffRoleIds(
          userToEdit.roles.map(role => role.id),
          selectedRoles.map(role => role.id)
        )

        return diff.toAssign.length > 0 || diff.toRevoke.length > 0
      })()
    : false

  const requiresSelfConfirmation = isSelfEdit && rolesChanged && !selfEditConfirmed

  const buildPayload = (): UserSaveData => ({
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    telefono: telefono.trim() || undefined,
    roleIds: userToEdit
      ? selectedRoles.map(role => role.id)
      : initialRoleId
        ? [initialRoleId]
        : [],
    initialRoleId: userToEdit ? undefined : initialRoleId || undefined,
    estado,
    passwordInicial: !userToEdit ? password.trim() : undefined,
    password: userToEdit && password.trim() ? password.trim() : undefined
  })

  const performSave = async (data: UserSaveData) => {
    setSubmitting(true)
    setFormError('')

    try {
      await onSave(data)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el usuario.'

      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

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

    const data = buildPayload()

    if (!userToEdit && !initialRoleId) {
      setFormError('Seleccione el rol inicial del usuario.')

      return
    }

    if (userToEdit) {
      const validation = validateRoleIds(
        data.roleIds,
        roleOptionsWithAssigned.map(role => ({ id: role.id }))
      )

      if (!validation.valid) {
        setFormError(`Rol(es) no disponible(s) en el tenant: ${validation.invalid.join(', ')}`)

        return
      }

      if (data.roleIds.length === 0 && userToEdit.roles.length > 0) {
        setPendingZeroRole(data)

        return
      }
    }

    if (requiresSelfConfirmation) {
      setFormError('Confirme que desea modificar sus propios roles antes de guardar.')

      return
    }

    await performSave(data)
  }

  const removedRoles = userToEdit ? summarizeRemovedRoles(userToEdit.roles, []) : []
  const canEditRoles = canAssignRoles && !submitting
  const roleEditorDisabled = !canEditRoles || rolesLoading

  return (
    <>
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
            {formError && (
              <Alert severity='error' variant='standard' onClose={() => setFormError('')} sx={{ borderRadius: '12px' }}>
                {formError}
              </Alert>
            )}

            {isSelfEdit && (
              <Alert severity='warning' variant='standard' sx={{ borderRadius: '12px' }}>
                Está editando su propia cuenta. Verifique los roles antes de guardar.
                {rolesChanged && (
                  <FormControlLabel
                    className='mt-2 block'
                    control={
                      <Checkbox
                        size='small'
                        checked={selfEditConfirmed}
                        onChange={event => setSelfEditConfirmed(event.target.checked)}
                        disabled={submitting}
                      />
                    }
                    label='Confirmo modificar mis propios roles'
                  />
                )}
              </Alert>
            )}

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

            {userToEdit ? (
              <>
                <Autocomplete
                  multiple
                  size='small'
                  disableCloseOnSelect
                  options={roleOptionsWithAssigned}
                  value={selectedRoles}
                  onChange={(_event, value) => setSelectedRoles(value)}
                  getOptionLabel={role => role.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  disabled={roleEditorDisabled}
                  noOptionsText='No hay roles disponibles'
                  renderInput={params => (
                    <TextField
                      {...params}
                      label='Roles en el ERP'
                      placeholder={selectedRoles.length === 0 ? 'Sin rol asignado' : 'Agregar rol'}
                      error={Boolean(rolesError)}
                      helperText={
                        rolesError ||
                        (!canAssignRoles
                          ? 'No tiene permiso para gestionar roles; solo lectura.'
                          : rolesLoading
                            ? 'Cargando roles disponibles...'
                            : selectedRoles.length === 0
                              ? 'El usuario no tiene roles asignados.'
                              : 'Agregue o quite roles; los demás se conservan.')
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
                    />
                  )}
                />
                {rolesLoading && (
                  <span className='flex items-center gap-2 text-xs text-[#6B7280]'>
                    <CircularProgress size={12} /> Cargando roles...
                  </span>
                )}
              </>
            ) : (
              <TextField
                select
                size='small'
                label='Rol inicial en el ERP'
                value={initialRoleId}
                onChange={e => setInitialRoleId(e.target.value)}
                required
                fullWidth
                disabled={roleEditorDisabled}
                error={Boolean(rolesError)}
                helperText={
                  rolesError ||
                  (rolesLoading
                    ? 'Cargando roles disponibles...'
                    : 'Seleccione el rol con el que se creará el usuario.')
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
              >
                {roleOptions.map(role => (
                  <MenuItem key={role.id} value={role.id} className='flex flex-col items-start py-2'>
                    <span className='font-bold text-sm text-[#1E1B2E]'>{role.name}</span>
                    <span className='text-xs text-[#6B7280]'>{role.description || 'Rol del sistema'}</span>
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              size='small'
              label='Estado de la Cuenta'
              value={estado}
              onChange={e => setEstado(e.target.value as UserAccountStatus)}
              fullWidth
              disabled={submitting}
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
                  disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting || roleEditorDisabled || requiresSelfConfirmation}
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

      <Dialog open={pendingZeroRole !== null} onClose={() => setPendingZeroRole(null)}>
        <DialogTitle>Quitar todos los roles</DialogTitle>
        <DialogContent>
          <DialogContentText>
            El usuario quedará sin roles y perderá el acceso a las funciones protegidas. Roles que se
            quitarán:
          </DialogContentText>
          <ul className='mt-2 list-disc pl-5 text-sm text-[#1E1B2E]'>
            {removedRoles.map(role => (
              <li key={role.id}>{role.name}</li>
            ))}
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingZeroRole(null)}>Cancelar</Button>
          <Button
            color='error'
            variant='contained'
            onClick={() => {
              const data = pendingZeroRole

              setPendingZeroRole(null)

              if (data) {
                void performSave(data)
              }
            }}
          >
            Quitar roles
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
