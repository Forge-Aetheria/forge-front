'use client'

// React Imports
import { useRef, useState, useEffect } from 'react'
import type { MouseEvent } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'

// Context & Service Imports
import { useAuth } from '@/contexts/AuthContext'
import { settingsService } from '@/services/settingsService'
import type { UserProfile } from '@/types/settingsTypes'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Styled component for badge content
const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  VENTAS: 'Ventas',
  COMPRAS: 'Compras',
  ALMACEN: 'Almacén',
  CAJERO_POS: 'Cajero POS',
  UNASSIGNED: 'Sin Rol Asignado'
}

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()
  const { settings } = useSettings()
  const { user, signOut } = useAuth()

  // Load User Profile on mount or open
  useEffect(() => {
    let isMounted = true

    settingsService.getUserProfile().then(p => {
      if (isMounted) setProfile(p)
    })

    return () => {
      isMounted = false
    }
  }, [open])

  const handleDropdownOpen = () => {
    setOpen(prev => !prev)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = async () => {
    setOpen(false)
    await signOut()
  }

  const userInitial = profile?.nombre
    ? profile.nombre.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'U'

  const userDisplayName = profile?.nombre || user?.email?.split('@')[0] || 'Usuario'

  const effectiveRole = profile?.rol
    ? String(profile.rol).toUpperCase()
    : String(user?.role || (user?.roles && user?.roles[0]) || 'UNASSIGNED').toUpperCase()

  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER'
  const roleLabel = ROLE_LABELS[effectiveRole] || 'Sin Rol Asignado'

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
      >
        <Avatar
          ref={anchorRef}
          alt={userDisplayName}
          src={profile?.avatarUrl}
          onClick={handleDropdownOpen}
          className='cursor-pointer bs-[38px] is-[38px] bg-primary text-white font-bold'
        >
          {userInitial}
        </Avatar>
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[250px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'} sx={{ borderRadius: '18px' }}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList sx={{ py: 1.5 }}>
                  {/* Cabecera de Identidad Autenticada */}
                  <div className='flex items-center plb-2 pli-5 gap-3' tabIndex={-1}>
                    <Avatar
                      alt={userDisplayName}
                      src={profile?.avatarUrl}
                      className='bg-primary text-white font-bold bs-11 is-11 shadow-xs'
                    >
                      {userInitial}
                    </Avatar>
                    <div className='flex items-start flex-col overflow-hidden'>
                      <Typography className='font-bold text-sm text-[#1E1B2E] truncate w-full' title={userDisplayName}>
                        {userDisplayName}
                      </Typography>
                      <Typography variant='caption' className='text-xs text-[#6B7280] truncate w-full' title={profile?.email || user?.email}>
                        {profile?.email || user?.email || 'admin@vuexy.com'}
                      </Typography>
                      <div className='flex items-center gap-1.5 mt-1'>
                        <Chip
                          size='small'
                          label={roleLabel}
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            borderRadius: '9999px',
                            backgroundColor: isAdmin ? '#F0EEF9' : '#E0F2FE',
                            color: isAdmin ? '#6C5CE7' : '#0284C7',
                            border: '1px solid',
                            borderColor: isAdmin ? '#DCD8EC' : '#BAE6FD'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <Divider sx={{ my: 1, borderColor: '#E6E4F0' }} />

                  {/* Mi Perfil */}
                  <MenuItem
                    className='mli-2 gap-3 py-2 rounded-xl transition-colors'
                    onClick={e => handleDropdownClose(e, '/profile')}
                  >
                    <i className='tabler-user text-lg text-[#6C5CE7]' />
                    <Typography color='text.primary' className='font-semibold text-sm'>
                      Mi Perfil
                    </Typography>
                  </MenuItem>

                  {/* Ajustes del Sistema - Solo Rol ADMIN */}
                  {isAdmin && (
                    <MenuItem
                      className='mli-2 gap-3 py-2 rounded-xl transition-colors'
                      onClick={e => handleDropdownClose(e, '/settings')}
                    >
                      <i className='tabler-settings text-lg text-[#6C5CE7]' />
                      <Typography color='text.primary' className='font-semibold text-sm'>
                        Ajustes del Sistema
                      </Typography>
                    </MenuItem>
                  )}

                  <Divider sx={{ my: 1, borderColor: '#E6E4F0' }} />

                  {/* Cerrar Sesión */}
                  <div className='flex items-center plb-1 pli-3'>
                    <Button
                      fullWidth
                      variant='contained'
                      size='small'
                      endIcon={<i className='tabler-logout' />}
                      onClick={handleUserLogout}
                      sx={{
                        borderRadius: '9999px',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 1,
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                        '&:hover': { backgroundColor: '#DC2626' },
                        '& .MuiButton-endIcon': { marginInlineStart: 1.5 }
                      }}
                    >
                      Cerrar Sesión
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
