'use client'

// React Imports
import type { ReactNode } from 'react'

// Next Imports
import { usePathname } from 'next/navigation'

// MUI Imports
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { VerticalMenuDataType, VerticalMenuItemDataType } from '@/types/menuTypes'

// Component Imports
import Link from '@components/Link'

type Props = {
  items: VerticalMenuDataType[]
}

const isMenuItem = (item: VerticalMenuDataType): item is VerticalMenuItemDataType => {
  return !('isSection' in item) && 'href' in item
}

const VerticalMenuGrid = ({ items }: Props) => {
  // Hooks
  const pathname = usePathname()

  // Filter only navigable items for the touch grid
  const menuItems = items.filter(isMenuItem)

  return (
    <div className='grid grid-cols-2 gap-2.5 p-3'>
      {menuItems.map((item, index) => {
        const isCurrentActive = item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false

        return (
          <Link
            key={index}
            href={item.href || '/'}
            className={classnames(
              'group relative flex flex-col items-center justify-center min-bs-[95px] p-3 rounded-xl transition-all duration-150 select-none text-center',
              'active:scale-95',
              {
                'bg-primary text-primaryContrastText shadow-md shadow-primary/30': isCurrentActive,
                'bg-[var(--mui-palette-customColors-bodyBg,#f8f7fa)] dark:bg-[var(--mui-palette-customColors-bodyBg,#25293c)] border border-[var(--mui-palette-divider)] hover:border-primary/50 hover:bg-[var(--mui-palette-action-hover)]':
                  !isCurrentActive
              }
            )}
          >
            {/* Optional Badge */}
            {item.suffix && typeof item.suffix === 'object' && 'label' in item.suffix && (
              <span className='absolute block-start-2 inline-end-2'>
                <Chip size='small' {...item.suffix} />
              </span>
            )}

            {/* Icon */}
            {item.icon && (
              <i
                className={classnames(item.icon, 'text-[30px] mbe-2 transition-transform group-hover:scale-110', {
                  'text-primaryContrastText': isCurrentActive,
                  'text-primary': !isCurrentActive
                })}
              />
            )}

            {/* Label */}
            <Typography
              variant='caption'
              className={classnames('font-medium leading-tight line-clamp-2', {
                'text-primaryContrastText': isCurrentActive,
                'text-textPrimary': !isCurrentActive
              })}
            >
              {item.label}
            </Typography>
          </Link>
        )
      })}
    </div>
  )
}

export default VerticalMenuGrid
