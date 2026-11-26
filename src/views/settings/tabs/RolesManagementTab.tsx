'use client'

import React, { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { RoleEditorView, type RoleSaveData } from '../components/RoleEditorView'
import type { ErpPermission, ErpRole } from '@/types/settingsTypes'

interface Props {
  roles: ErpRole[]
  permissions: ErpPermission[]
  loading?: boolean
  catalogLoading?: boolean
  catalogError?: string
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canSetPermissions: boolean
  hasModule?: (module: string) => boolean
  onCreate: (data: RoleSaveData) => Promise<void>
  onUpdate: (data: RoleSaveData) => Promise<void>
  onDelete: (role: ErpRole) => Promise<void>
  onError?: (message: string) => void
}

const moduleCount = (role: ErpRole): number =>
  new Set((role.permissions ?? []).map(permission => permission.module)).size

export const RolesManagementTab: React.FC<Props> = ({
  roles,
  permissions,
  loading = false,
  catalogLoading = false,
  catalogError,
  canCreate,
  canUpdate,
  canDelete,
  canSetPermissions,
  hasModule,
  onCreate,
  onUpdate,
  onDelete,
  onError
}) => {
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<ErpRole | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<ErpRole | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const sortedRoles = useMemo(
    () => [...roles].sort((left, right) => left.name.localeCompare(right.name)),
    [roles]
  )

  const openCreate = () => {
    setSelectedRole(null)
    setEditorOpen(true)
  }

  const openEdit = (role: ErpRole) => {
    setSelectedRole(role)
    setEditorOpen(true)
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return

    setDeleting(true)
    setDeleteError('')

    try {
      await onDelete(roleToDelete)
      setRoleToDelete(null)
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar el rol.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (data: RoleSaveData) => {
    if (data.id) {
      await onUpdate(data)
    } else {
      await onCreate(data)
    }

    setEditorOpen(false)
  }

  if (editorOpen) {
    return (
      <RoleEditorView
        role={selectedRole}
        permissions={permissions}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        canUpdate={canUpdate}
        canSetPermissions={canSetPermissions}
        hasModule={hasModule}
        onCancel={() => setEditorOpen(false)}
        onSave={handleSave}
        onError={onError}
      />
    )
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
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <div>
            <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
              Roles del tenant y permisos por módulo
            </Typography>
            <span className='text-xs text-[#6B7280]'>
              Asigne módulos seleccionando sus permisos; no se requieren cambios de plan.
            </span>
          </div>

          <Button
            variant='contained'
            onClick={openCreate}
            disabled={!canCreate || Boolean(catalogError)}
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
            Nuevo rol
          </Button>
        </div>

        {catalogError && (
          <div className='rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-xs text-[#B91C1C]'>
            {catalogError}
          </div>
        )}

        <div className='overflow-x-auto rounded-2xl border border-[#E6E4F0] mt-2'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#F4F3F8] text-[#1E1B2E] font-bold border-b border-[#E6E4F0]'>
              <tr>
                <th className='py-3.5 px-4'>Rol</th>
                <th className='py-3.5 px-4'>Descripción</th>
                <th className='py-3.5 px-4 text-center'>Permisos</th>
                <th className='py-3.5 px-4 text-center'>Módulos</th>
                <th className='py-3.5 px-4 text-center'>Tipo</th>
                <th className='py-3.5 px-4 text-right'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E6E4F0] bg-[#FFFFFF]'>
              {loading ? (
                <tr>
                  <td colSpan={6} className='py-8 text-center text-[#6B7280]'>
                    <span className='inline-flex items-center gap-2'>
                      <CircularProgress size={14} /> Cargando roles...
                    </span>
                  </td>
                </tr>
              ) : sortedRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className='py-8 text-center text-[#6B7280]'>
                    No hay roles en el tenant.
                  </td>
                </tr>
              ) : (
                sortedRoles.map(role => (
                  <tr key={role.id} className='hover:bg-[#FAFAFD] transition-colors'>
                    <td className='py-3 px-4'>
                      <span className='font-bold text-[#1E1B2E] text-sm block'>{role.name}</span>
                    </td>
                    <td className='py-3 px-4 text-[#6B7280]'>
                      {role.description || <span className='italic text-[#9CA3AF]'>Sin descripción</span>}
                    </td>
                    <td className='py-3 px-4 text-center font-mono'>
                      {(role.permissions ?? []).length}
                    </td>
                    <td className='py-3 px-4 text-center font-mono'>{moduleCount(role)}</td>
                    <td className='py-3 px-4 text-center'>
                      <CustomChip
                        size='small'
                        variant='tonal'
                        color={role.isSystem ? 'primary' : 'secondary'}
                        label={role.isSystem ? 'Sistema' : 'Personalizado'}
                      />
                    </td>
                    <td className='py-3 px-4 text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Tooltip title={canUpdate || canSetPermissions ? 'Editar rol' : 'Sin permiso'}>
                          <span>
                            <IconButton
                              size='small'
                              onClick={() => openEdit(role)}
                              disabled={!canUpdate && !canSetPermissions}
                              sx={{ color: '#6C5CE7', '&:hover': { backgroundColor: '#F0EEF9' } }}
                            >
                              <i className='tabler-edit text-base' />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            role.isSystem
                              ? 'Los roles del sistema no se pueden eliminar'
                              : canDelete
                                ? 'Eliminar rol'
                                : 'Sin permiso'
                          }
                        >
                          <span>
                            <IconButton
                              size='small'
                              onClick={() => {
                                setDeleteError('')
                                setRoleToDelete(role)
                              }}
                              disabled={!canDelete || role.isSystem}
                              sx={{ color: '#EF4444', '&:hover': { backgroundColor: '#FEE2E2' } }}
                            >
                              <i className='tabler-trash text-base' />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={roleToDelete !== null} onClose={() => setRoleToDelete(null)}>
        <DialogTitle>Eliminar rol</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Eliminar el rol “{roleToDelete?.name}”? Esta acción es un soft-delete y no afecta a otros
            roles.
          </DialogContentText>
          {deleteError && (
            <div className='mt-3 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]'>
              {deleteError}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleToDelete(null)} disabled={deleting} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={deleting}
            color='error'
            variant='contained'
            startIcon={deleting ? <CircularProgress size={14} color='inherit' /> : undefined}
            sx={{ textTransform: 'none', borderRadius: '9999px' }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default RolesManagementTab
