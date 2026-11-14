'use client'

import { useState, useEffect } from 'react'

import { usePathname } from 'next/navigation'

import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import classnames from 'classnames'

import type {
  VerticalMenuDataType,
  VerticalMenuItemDataType,
  VerticalSubMenuDataType
} from '@/types/menuTypes'
import Link from '@components/Link'

type Props = {
  items: VerticalMenuDataType[]
}

interface NavLayer {
  title: React.ReactNode
  items: VerticalMenuDataType[]
}

const isItemActive = (item: VerticalMenuDataType, path: string): boolean => {
  if ('href' in item && item.href) {
    if (item.href === '/') return path === '/'
    
return path === item.href || path.startsWith(item.href + '/') || path.startsWith(item.href + '?')
  }

  if ('children' in item && Array.isArray((item as VerticalSubMenuDataType).children)) {
    return (item as VerticalSubMenuDataType).children.some(child => isItemActive(child, path))
  }

  
return false
}

const findPathStack = (
  menuItems: VerticalMenuDataType[],
  path: string,
  currentStack: NavLayer[] = []
): NavLayer[] | null => {
  for (const item of menuItems) {
    if ('children' in item && Array.isArray((item as VerticalSubMenuDataType).children)) {
      const sub = item as VerticalSubMenuDataType
      const newStack = [...currentStack, { title: sub.label, items: sub.children }]

      const hasDirectMatch = sub.children.some(
        c => 'href' in c && c.href && (path === c.href || path.startsWith(c.href + '/') || path.startsWith(c.href + '?'))
      )

      if (hasDirectMatch) {
        return newStack
      }

      const deep = findPathStack(sub.children, path, newStack)

      if (deep) return deep
    }
  }

  
return null
}

export const TouchMenuGrid = ({ items }: Props) => {
  const pathname = usePathname()
  const [navStack, setNavStack] = useState<NavLayer[]>([])

  // Sincronizar automáticamente la pila con la ruta activa al cargar o navegar
  useEffect(() => {
    const matchingStack = findPathStack(items, pathname)

    if (matchingStack && matchingStack.length > 0) {
      setNavStack(matchingStack)
    }
  }, [pathname, items])

  // The active list of items is either the top of the stack or the root items
  const currentItems = navStack.length > 0 ? navStack[navStack.length - 1].items : items
  const currentTitle = navStack.length > 0 ? navStack[navStack.length - 1].title : 'Menú Principal'

  const handleDrillDown = (subMenu: VerticalSubMenuDataType) => {
    if (subMenu.children && subMenu.children.length > 0) {
      setNavStack(prev => [...prev, { title: subMenu.label, items: subMenu.children }])
    }
  }

  const handleGoBack = () => {
    setNavStack(prev => prev.slice(0, -1))
  }

  return (
    <div className='flex flex-col gap-2 p-2'>
      {/* Header de Capa con Botón Volver si está en subnivel */}
      {navStack.length > 0 && (
        <div className='flex items-center justify-between px-1 py-1 mb-1 border-b border-[var(--mui-palette-divider)]'>
          <Button
            size='small'
            variant='tonal'
            onClick={handleGoBack}
            startIcon={<i className='tabler-arrow-left text-sm' />}
            className='text-xs font-semibold'
          >
            Volver
          </Button>
          <span className='text-[11px] font-bold text-textSecondary uppercase tracking-wider truncate max-w-[130px]'>
            {currentTitle}
          </span>
        </div>
      )}

      {/* Grid de Botones Táctiles */}
      <div className='grid grid-cols-2 gap-2.5'>
        {currentItems.map((item, index) => {
          // Si es sección informativa, ignorar o renderizar como separador
          if ('isSection' in item) {
            return null
          }

          // Si tiene hijos, es un botón de nivel que abre el submenú táctil
          const hasChildren =
            'children' in item &&
            Array.isArray((item as VerticalSubMenuDataType).children) &&
            (item as VerticalSubMenuDataType).children.length > 0

          if (hasChildren) {
            const subMenu = item as VerticalSubMenuDataType
            const isCategoryActive = isItemActive(subMenu, pathname)

            return (
              <div
                key={index}
                onClick={() => handleDrillDown(subMenu)}
                className={classnames(
                  'group relative flex flex-col items-center justify-center min-bs-[95px] p-3 rounded-2xl cursor-pointer transition-all duration-150 select-none text-center',
                  'active:scale-95 shadow-xs',
                  {
                    'bg-primary/[0.08] border-2 border-primary/60 text-primary': isCategoryActive,
                    'bg-[var(--mui-palette-customColors-bodyBg,#f8f7fa)] border border-[var(--mui-palette-divider)] hover:border-primary/50 hover:bg-[var(--mui-palette-action-hover)]':
                      !isCategoryActive
                  }
                )}
              >
                {/* Indicador visual de submenú (chevron o píldora) */}
                <span
                  className={classnames('absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full text-xs', {
                    'bg-primary text-white': isCategoryActive,
                    'bg-primary/10 text-primary': !isCategoryActive
                  })}
                >
                  <i className='tabler-chevron-right text-xs' />
                </span>

                {/* Icono */}
                {subMenu.icon && (
                  <i
                    className={classnames(subMenu.icon, 'text-[30px] mb-2 text-primary transition-transform group-hover:scale-110')}
                  />
                )}

                {/* Label */}
                <Typography variant='caption' className='font-semibold text-textPrimary leading-tight line-clamp-2'>
                  {subMenu.label}
                </Typography>
              </div>
            )
          }

          // Si es un ítem navegable final
          const menuItem = item as VerticalMenuItemDataType

          const isCurrentActive = menuItem.href
            ? menuItem.href === '/'
              ? pathname === '/'
              : pathname.startsWith(menuItem.href)
            : false

          return (
            <Link
              key={index}
              href={menuItem.href || '/'}
              className={classnames(
                'group relative flex flex-col items-center justify-center min-bs-[95px] p-3 rounded-2xl transition-all duration-150 select-none text-center',
                'active:scale-95 shadow-xs',
                {
                  'bg-primary text-primaryContrastText shadow-md shadow-primary/30': isCurrentActive,
                  'bg-[var(--mui-palette-customColors-bodyBg,#f8f7fa)] border border-[var(--mui-palette-divider)] hover:border-primary/50 hover:bg-[var(--mui-palette-action-hover)]':
                    !isCurrentActive
                }
              )}
            >
              {/* Optional Badge */}
              {menuItem.suffix && typeof menuItem.suffix === 'object' && 'label' in menuItem.suffix && (
                <span className='absolute top-2 right-2'>
                  <Chip size='small' {...menuItem.suffix} />
                </span>
              )}

              {/* Icon */}
              {menuItem.icon && (
                <i
                  className={classnames(menuItem.icon, 'text-[30px] mb-2 transition-transform group-hover:scale-110', {
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
                {menuItem.label}
              </Typography>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default TouchMenuGrid
