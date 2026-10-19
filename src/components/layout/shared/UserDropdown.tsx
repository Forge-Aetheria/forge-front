'use client'

// React Imports
import { useRef, useState } from 'react'
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

// Context Imports
import { useAuth } from '@/contexts/AuthContext'

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

const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()
  const { settings } = useSettings()
  const { user, signOut } = useAuth()

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
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

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'
  const userDisplayName = user?.email?.split('@')[0] || 'Usuario'

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
          alt={user?.email || 'Usuario'}
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
        className='min-is-[240px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-6 gap-3' tabIndex={-1}>
                    <Avatar alt={userDisplayName} className='bg-primary text-white font-bold'>
                      {userInitial}
                    </Avatar>
                    <div className='flex items-start flex-col'>
                      <Typography className='font-semibold capitalize text-sm' color='text.primary'>
                        {userDisplayName}
                      </Typography>
                      <Typography variant='caption' className='text-xs text-textSecondary'>
                        {user?.email || 'Invitado'}
                      </Typography>
                      {user?.tenantName && (
                        <Typography variant='caption' className='text-xs font-semibold text-primary'>
                          🏢 {user.tenantName}
                        </Typography>
                      )}
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/home')}>
                    <i className='tabler-smart-home' />
                    <Typography color='text.primary'>Inicio</Typography>
                  </MenuItem>
                  <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/inventory')}>
                    <i className='tabler-box' />
                    <Typography color='text.primary'>Inventario</Typography>
                  </MenuItem>
                  <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/pos/terminal')}>
                    <i className='tabler-device-laptop' />
                    <Typography color='text.primary'>Terminal POS</Typography>
                  </MenuItem>
                  <Divider className='mlb-1' />
                  <div className='flex items-center plb-2 pli-3'>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='tabler-logout' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
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
