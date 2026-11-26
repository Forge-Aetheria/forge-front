'use client'

import React, { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { PermissionMatrix } from './PermissionMatrix'
import { computePermissionIds, isReduction } from '@/utils/rolePermissions'
import type { ErpPermission, ErpRole } from '@/types/settingsTypes'

export interface RoleSaveData {
  id?: string
  name: string
  description?: string
  permissionIds: string[]
  previousPermissionIds: string[]
  confirmReplace: boolean
  expectedUpdatedAt?: string
}

interface Props {
  role: ErpRole | null
  permissions: ErpPermission[]
  catalogLoading?: boolean
  catalogError?: string
  canUpdate: boolean
  canSetPermissions: boolean
  hasModule?: (module: string) => boolean
  onCancel: () => void
  onSave: (data: RoleSaveData) => Promise<void>
  onError?: (message: string) => void
}

/** Full-page in-context editor for creating/editing a tenant role. */
export const RoleEditorView: React.FC<Props> = ({
  role,
  permissions,
  catalogLoading = false,
  catalogError,
  canUpdate,
  canSetPermissions,
  hasModule,
  onCancel,
  onSave,
  onError
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmReduction, setConfirmReduction] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const previousPermissionIds = useMemo(
    () => (role?.permissions ?? []).map(permission => permission.id),
    [role]
  )

  useEffect(() => {
    setName(role?.name ?? '')
    setDescription(role?.description ?? '')
    setSelectedIds(previousPermissionIds)
    setConfirmReduction(false)
    setFormError('')
    setSubmitting(false)
  }, [role, previousPermissionIds])

  const isSystem = Boolean(role?.isSystem)
  const nameDisabled = submitting || isSystem || (!role && !canUpdate)
  const permissionsDisabled = submitting || !canSetPermissions || catalogLoading || Boolean(catalogError)
  const reduction = role !== null && isReduction(previousPermissionIds, selectedIds)
  const blockedByCatalog = permissions.length === 0 || Boolean(catalogError)
  const saveDisabled = submitting || blockedByCatalog || (reduction && !confirmReduction)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('El nombre del rol es obligatorio.')
      
return
    }

    if (reduction && !confirmReduction) {
      setFormError('Confirme que desea reducir los permisos del rol.')
      
return
    }

    setSubmitting(true)

    try {
      await onSave({
        id: role?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds: computePermissionIds(new Set(selectedIds)),
        previousPermissionIds,
        confirmReplace: reduction,
        expectedUpdatedAt: role?.updatedAt
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el rol.'

      if (onError) {
        onError(message)
      } else {
        setFormError(message)
      }
    } finally {
      setSubmitting(false)
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
        <div className='flex items-center gap-3'>
          <Button
            onClick={onCancel}
            startIcon={<i className='tabler-arrow-left text-base' />}
            sx={{
              borderRadius: '9999px',
              color: '#6B7280',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Volver
          </Button>
          <div>
            <Typography variant='h6' className='font-bold text-[#1E1B2E]'>
              {role ? `Editar rol: ${role.name}` : 'Nuevo rol'}
            </Typography>
            <span className='text-xs text-[#6B7280]'>
              {role
                ? 'Ajuste los permisos por módulo del rol'
                : 'Defina el nombre y los permisos por módulo'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {formError && (
            <Alert severity='error' variant='standard' onClose={() => setFormError('')} sx={{ borderRadius: '12px' }}>
              {formError}
            </Alert>
          )}

          {catalogError && (
            <Alert severity='error' variant='standard' sx={{ borderRadius: '12px' }}>
              {catalogError}
            </Alert>
          )}

          {isSystem && (
            <Alert severity='info' variant='standard' sx={{ borderRadius: '12px' }}>
              Rol del sistema: el nombre es inmutable y no puede eliminarse.
            </Alert>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <TextField
              size='small'
              label='Nombre del rol'
              placeholder='Ej. Supervisor de inventario'
              value={name}
              onChange={event => setName(event.target.value)}
              required
              fullWidth
              disabled={nameDisabled}
              helperText={isSystem ? 'El nombre de un rol del sistema no se puede modificar.' : undefined}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: nameDisabled ? '#F4F3F8' : '#FAFAFC' } }}
            />

            <TextField
              size='small'
              label='Descripción (opcional)'
              placeholder='Responsabilidades del rol'
              value={description}
              onChange={event => setDescription(event.target.value)}
              fullWidth
              multiline
              minRows={1}
              disabled={submitting}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#FAFAFC' } }}
            />
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-xs font-bold text-[#1E1B2E] flex items-center gap-1.5'>
              <i className='tabler-lock-access text-[#6C5CE7] text-sm' />
              Permisos por módulo
            </span>
            <span className='text-[11px] text-[#6B7280]'>
              {selectedIds.length} permiso(s) seleccionado(s)
            </span>
          </div>

          <PermissionMatrix
            permissions={permissions}
            selectedIds={selectedIds}
            loading={catalogLoading}
            disabled={permissionsDisabled}
            hasModule={hasModule}
            onChange={setSelectedIds}
          />

          {reduction && (
            <Alert severity='warning' variant='standard' sx={{ borderRadius: '12px' }}>
              Este cambio reduce los permisos actuales del rol.
              <FormControlLabel
                className='mt-2 block'
                control={
                  <Checkbox
                    size='small'
                    checked={confirmReduction}
                    onChange={event => setConfirmReduction(event.target.checked)}
                    disabled={submitting}
                  />
                }
                label='Confirmo reducir los permisos de este rol'
              />
            </Alert>
          )}

          <div className='pt-2 flex items-center justify-end gap-2.5'>
            <Button
              variant='outlined'
              onClick={onCancel}
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
              disabled={saveDisabled}
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
      </CardContent>
    </Card>
  )
}

export default RoleEditorView
