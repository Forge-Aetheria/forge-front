'use client'

import React, { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import {
  computePermissionIds,
  formatPermissionLabel,
  groupPermissionsByModule,
  moduleSelectionState,
  toggleModuleSelection
} from '@/utils/rolePermissions'
import type { ErpPermission } from '@/types/settingsTypes'

interface Props {
  permissions: ErpPermission[]
  selectedIds: string[]
  loading?: boolean
  disabled?: boolean
  hasModule?: (module: string) => boolean
  onChange: (next: string[]) => void
}

export const PermissionMatrix: React.FC<Props> = ({
  permissions,
  selectedIds,
  loading = false,
  disabled = false,
  hasModule,
  onChange
}) => {
  const groups = React.useMemo(() => groupPermissionsByModule(permissions), [permissions])
  const selected = React.useMemo(() => new Set(selectedIds), [selectedIds])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <Box className='flex items-center gap-2 text-xs text-[#6B7280] py-4'>
        <CircularProgress size={14} /> Cargando catálogo de permisos...
      </Box>
    )
  }

  if (groups.length === 0) {
    return (
      <Box className='text-xs text-[#6B7280] py-4'>
        No hay permisos disponibles en el catálogo.
      </Box>
    )
  }

  const toggleExpanded = (module: string) => {
    setExpanded(previous => {
      const next = new Set(previous)

      if (next.has(module)) {
        next.delete(module)
      } else {
        next.add(module)
      }

      return next
    })
  }

  const expandAll = () => setExpanded(new Set(groups.map(group => group.module)))
  const collapseAll = () => setExpanded(new Set())

  const togglePermission = (permissionId: string, checked: boolean) => {
    const next = new Set(selected)

    if (checked) {
      next.add(permissionId)
    } else {
      next.delete(permissionId)
    }

    onChange(computePermissionIds(next))
  }

  return (
    <Box className='flex flex-col gap-3'>
      <Box className='flex items-center justify-end gap-2'>
        <Button size='small' onClick={expandAll} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
          Expandir todo
        </Button>
        <Button size='small' onClick={collapseAll} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
          Colapsar todo
        </Button>
      </Box>

      {groups.map(group => {
        const state = moduleSelectionState(group.permissions, selected)
        const moduleEnabled = hasModule ? hasModule(group.module) : true
        const isExpanded = expanded.has(group.module)

        return (
          <Box key={group.module} className='rounded-xl border border-[#E6E4F0] bg-[#FFFFFF]'>
            <Box className='flex items-center justify-between gap-3 px-2 py-1.5 bg-[#FAFAFC] border-b border-[#E6E4F0] rounded-t-xl'>
              <Box className='flex items-center gap-1 min-w-0'>
                <IconButton size='small' onClick={() => toggleExpanded(group.module)} aria-label='Expandir módulo'>
                  <i className={isExpanded ? 'tabler-chevron-down text-base' : 'tabler-chevron-right text-base'} />
                </IconButton>
                <FormControlLabel
                  control={
                    <Checkbox
                      size='small'
                      checked={state === 'all'}
                      indeterminate={state === 'some'}
                      disabled={disabled}
                      onChange={event => {
                        const next = toggleModuleSelection(
                          group.permissions,
                          selected,
                          event.target.checked
                        )

                        onChange(computePermissionIds(next))
                      }}
                    />
                  }
                  label={
                    <span className='font-bold text-sm text-[#1E1B2E]'>
                      {group.module}
                      <span className='ml-2 text-[11px] font-normal text-[#6B7280]'>
                        ({group.permissions.filter(permission => selected.has(permission.id)).length}/
                        {group.permissions.length})
                      </span>
                    </span>
                  }
                />
              </Box>
              <Box className='flex items-center gap-2 pr-2'>
                {hasModule && (
                  <CustomChip
                    size='small'
                    variant='tonal'
                    color={moduleEnabled ? 'success' : 'secondary'}
                    label={moduleEnabled ? 'Módulo activo' : 'No contratado'}
                  />
                )}
              </Box>
            </Box>
            {isExpanded && (
              <Box className='grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 px-2 py-2'>
                {group.permissions.map(permission => (
                  <FormControlLabel
                    key={permission.id}
                    className='items-start'
                    control={
                      <Checkbox
                        size='small'
                        checked={selected.has(permission.id)}
                        disabled={disabled}
                        onChange={event => togglePermission(permission.id, event.target.checked)}
                      />
                    }
                    label={
                      <span className='flex flex-col'>
                        <Typography variant='body2' className='text-[#1E1B2E] font-medium'>
                          {formatPermissionLabel(permission.action)}
                        </Typography>
                        {permission.description && (
                          <span className='text-[11px] text-[#6B7280]'>{permission.description}</span>
                        )}
                      </span>
                    }
                  />
                ))}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

export default PermissionMatrix
