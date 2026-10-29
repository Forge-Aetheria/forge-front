'use client'

import React, { useState, useMemo } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import CustomChip from '@core/components/mui/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import InputAdornment from '@mui/material/InputAdornment'

import { UserCreateEditDrawer } from '../components/UserCreateEditDrawer'
import type { ErpUser, SystemRole, BackendRole, UserAccountStatus } from '@/types/settingsTypes'

interface Props {
  users: ErpUser[]
  availableRoles?: BackendRole[]
  isAdmin?: boolean
  onCreateUser: (data: {
    nombre: string
    email: string
    telefono?: string
    rol: SystemRole
    passwordInicial?: string
    estado?: UserAccountStatus
  }) => Promise<void>
  onUpdateUser: (
    id: string,
    data: {
      nombre: string
      telefono?: string
      rol: SystemRole
      estado: UserAccountStatus
      password?: string
    }
  ) => Promise<void>
  onToggleStatus: (id: string) => Promise<void>
}

const getRoleBadge = (roleName: string, availableRoles?: BackendRole[]) => {
  const normalized = String(roleName || '').trim().toUpperCase()

  if (normalized === 'ADMIN' || normalized === 'OWNER' || normalized === 'SUPERADMIN') {
    return { label: 'Administrador', color: 'primary' as const }
  }

  if (normalized === 'VENTAS' || normalized === 'SALES') {
    return { label: 'Ventas', color: 'info' as const }
  }

  if (normalized === 'COMPRAS' || normalized === 'PURCHASING') {
    return { label: 'Compras', color: 'secondary' as const }
  }

  if (normalized === 'ALMACEN' || normalized === 'WAREHOUSE') {
    return { label: 'Almacén', color: 'warning' as const }
  }

  if (normalized === 'CAJERO_POS' || normalized === 'POS') {
    return { label: 'Cajero POS', color: 'success' as const }
  }

  if (normalized === 'UNASSIGNED') {
    return { label: 'Sin Rol', color: 'secondary' as const }
  }

  // Buscar en availableRoles de la base de datos
  const found = availableRoles?.find(r => r.name.toLowerCase() === roleName.toLowerCase())

  if (found) {
    return {
      label: found.name.charAt(0).toUpperCase() + found.name.slice(1),
      color: 'primary' as const
    }
  }

  return {
    label: roleName.charAt(0).toUpperCase() + roleName.slice(1),
    color: 'secondary' as const
  }
}

export const UsersManagementTab: React.FC<Props> = ({
  users,
  availableRoles,
  isAdmin = true,
  onCreateUser,
  onUpdateUser,
  onToggleStatus
}) => {
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ErpUser | null>(null)

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users

    const q = search.toLowerCase()

    return users.filter(
      u =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q)
    )
  }, [users, search])

  const handleOpenCreate = () => {
    setSelectedUser(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (user: ErpUser) => {
    setSelectedUser(user)
    setDrawerOpen(true)
  }

  const handleSave = async (data: {
    nombre: string
    email: string
    telefono?: string
    rol: SystemRole
    estado: UserAccountStatus
    passwordInicial?: string
    password?: string
  }) => {
    if (selectedUser) {
      await onUpdateUser(selectedUser.id, {
        nombre: data.nombre,
        telefono: data.telefono,
        rol: data.rol,
        estado: data.estado,
        password: data.password
      })
    } else {
      await onCreateUser(data)
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
      <CardContent className='p-6 flex flex-col gap-4'>
        {/* Cabecera y Barra de Acciones */}
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <div>
            <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
              Control de Accesos y Roles del Personal (RBAC)
            </Typography>
          </div>

          <div className='flex items-center gap-3 flex-wrap'>
            <TextField
              size='small'
              placeholder='Buscar por nombre, correo o rol...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{
                width: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9999px',
                  backgroundColor: '#FAFAFC'
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search text-[#6B7280]' />
                    </InputAdornment>
                  )
                }
              }}
            />

            <Button
              variant='contained'
              onClick={handleOpenCreate}
              startIcon={<i className='tabler-plus text-base' />}
              sx={{
                borderRadius: '9999px',
                backgroundColor: '#6C5CE7',
                color: '#FFFFFF',
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                boxShadow: '0 4px 14px rgba(108, 92, 231, 0.35)',
                '&:hover': { backgroundColor: '#5B4CDB' }
              }}
            >
              Nuevo
            </Button>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className='overflow-x-auto rounded-2xl border border-[#E6E4F0] mt-2'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#F4F3F8] text-[#1E1B2E] font-bold border-b border-[#E6E4F0]'>
              <tr>
                <th className='py-3.5 px-4'>Usuario / Nombre</th>
                <th className='py-3.5 px-4'>Teléfono</th>
                <th className='py-3.5 px-4'>Rol Asignado</th>
                <th className='py-3.5 px-4 text-center'>Estado</th>
                <th className='py-3.5 px-4'>Último Acceso</th>
                <th className='py-3.5 px-4 text-right'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E6E4F0] bg-[#FFFFFF]'>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className='py-8 text-center text-[#6B7280]'>
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const roleCfg = getRoleBadge(user.rol, availableRoles)
                  const isActive = user.estado === 'ACTIVO'

                  return (
                    <tr key={user.id} className='hover:bg-[#FAFAFD] transition-colors'>
                      {/* Avatar y Nombre */}
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-3'>
                          <Avatar
                            src={user.avatarUrl}
                            alt={user.nombre}
                            sx={{ width: 36, height: 36 }}
                          />
                          <div>
                            <span className='font-bold text-[#1E1B2E] text-sm block'>
                              {user.nombre}
                            </span>
                            <span className='text-[11px] text-[#6B7280]'>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className='py-3 px-4 text-[#1E1B2E]'>
                        {user.telefono ? (
                          <span className='flex items-center gap-1 font-mono'>
                            <i className='tabler-phone text-xs text-[#6B7280]' />
                            {user.telefono}
                          </span>
                        ) : (
                          <span className='text-[#9CA3AF] italic'>No registrado</span>
                        )}
                      </td>

                      {/* Rol Asignado */}
                      <td className='py-3 px-4'>
                        <CustomChip
                          size='small'
                          label={roleCfg.label}
                          variant='tonal'
                          color={roleCfg.color}
                        />
                      </td>

                      {/* Estado */}
                      <td className='py-3 px-4 text-center'>
                        <CustomChip
                          size='small'
                          label={isActive ? 'Activo' : 'Inactivo'}
                          color={isActive ? 'success' : 'secondary'}
                          variant='tonal'
                        />
                      </td>

                      {/* Último Acceso */}
                      <td className='py-3 px-4 text-[#6B7280]'>
                        {user.ultimoIngreso || 'Sin ingresos'}
                      </td>

                      {/* Acciones */}
                      <td className='py-3 px-4 text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Tooltip title='Editar usuario'>
                            <IconButton
                              size='small'
                              onClick={() => handleOpenEdit(user)}
                              sx={{ color: '#6C5CE7', '&:hover': { backgroundColor: '#F0EEF9' } }}
                            >
                              <i className='tabler-edit text-base' />
                            </IconButton>
                          </Tooltip>

                          {isAdmin && (
                            <Tooltip title='Modificar contraseña'>
                              <IconButton
                                size='small'
                                onClick={() => handleOpenEdit(user)}
                                sx={{ color: '#0284C7', '&:hover': { backgroundColor: '#E0F2FE' } }}
                              >
                                <i className='tabler-key text-base' />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title={isActive ? 'Desactivar acceso' : 'Habilitar acceso'}>
                            <IconButton
                              size='small'
                              onClick={() => onToggleStatus(user.id)}
                              sx={{
                                color: isActive ? '#EF4444' : '#10B981',
                                '&:hover': { backgroundColor: isActive ? '#FEE2E2' : '#E8F5E9' }
                              }}
                            >
                              <i className={isActive ? 'tabler-user-off text-base' : 'tabler-user-check text-base'} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Drawer de Creación/Edición */}
      <UserCreateEditDrawer
        open={drawerOpen}
        isAdmin={isAdmin}
        availableRoles={availableRoles}
        onClose={() => setDrawerOpen(false)}
        userToEdit={selectedUser}
        onSave={handleSave}
      />
    </Card>
  )
}
