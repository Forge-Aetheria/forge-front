'use client'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import UserDropdown from '@components/layout/shared/UserDropdown'
import HeaderBcvBadge from '@components/layout/shared/HeaderBcvBadge'
import FoundlyBreadcrumbs from '@components/layout/shared/FoundlyBreadcrumbs'
import CommandPaletteDialog from '@components/layout/shared/CommandPaletteDialog'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const NavbarContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-3 is-full')}>
      <div className='flex items-center gap-3 min-is-0 flex-1 overflow-hidden'>
        <NavToggle />
        <FoundlyBreadcrumbs />
      </div>

      <div className='flex items-center gap-2.5 shrink-0'>
        <CommandPaletteDialog />
        <HeaderBcvBadge />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
