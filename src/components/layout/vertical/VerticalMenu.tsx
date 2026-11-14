'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'
import classnames from 'classnames'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Component Imports
import VerticalMenuList from './VerticalMenuList'
import TouchMenuGrid from './TouchMenuGrid'

// Data Imports
import verticalMenuData from '@/data/navigation/verticalMenuData'

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const STORAGE_KEY = 'forge_sidebar_mode'

const VerticalMenu = ({ scrollMenu }: Props) => {
  // States
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Hooks
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { isBreakpointReached, isCollapsed, isHovered } = verticalNavOptions
  const isMini = isCollapsed && !isHovered
  const menuItems = verticalMenuData()

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  // Sync mode with localStorage safely after mounting
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])

  const handleModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  return (
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Mode Switcher Control (Visible when expanded) */}
      {!isMini && (
        <div className='flex items-center justify-between px-5 py-2 mbe-1 border-b border-[var(--mui-palette-divider)]'>
          <Typography variant='caption' className='font-semibold uppercase tracking-wider text-textSecondary text-[11px]'>
            {viewMode === 'grid' ? 'Vista Grilla' : 'Navegación'}
          </Typography>
          <div className='flex items-center gap-1 bg-[var(--mui-palette-action-hover)] p-0.5 rounded-lg'>
            <Tooltip title='Vista en Lista' placement='top'>
              <span>
                <IconButton
                  size='small'
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  className={classnames('is-7 bs-7 rounded-md transition-all', {
                    'bg-backgroundPaper shadow-xs text-primary': viewMode === 'list'
                  })}
                  onClick={() => handleModeChange('list')}
                >
                  <i className='tabler-layout-list text-base' />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title='Vista en Grilla táctil' placement='top'>
              <span>
                <IconButton
                  size='small'
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  className={classnames('is-7 bs-7 rounded-md transition-all', {
                    'bg-backgroundPaper shadow-xs text-primary': viewMode === 'grid'
                  })}
                  onClick={() => handleModeChange('grid')}
                >
                  <i className='tabler-layout-grid text-base' />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </div>
      )}

      {/* View Rendering based on active mode */}
      {viewMode === 'grid' && !isMini ? (
        <TouchMenuGrid items={menuItems} />
      ) : (
        <VerticalMenuList items={menuItems} />
      )}
    </ScrollWrapper>
  )
}

export default VerticalMenu
