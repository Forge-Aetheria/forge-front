'use client'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'
import type { VerticalMenuDataType, VerticalMenuItemDataType } from '@/types/menuTypes'

// Component Imports
import { Menu, MenuItem } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  items: VerticalMenuDataType[]
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const isMenuItem = (item: VerticalMenuDataType): item is VerticalMenuItemDataType => {
  return !('isSection' in item) && 'href' in item
}

const VerticalMenuList = ({ items }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { transitionDuration } = verticalNavOptions
  const menuItems = items.filter(isMenuItem)

  return (
    <Menu
      popoutMenuOffset={{ mainAxis: 23 }}
      menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
      renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
      renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
      menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
    >
      {menuItems.map((item, index) => {
        const { label, icon, prefix, suffix, excludeLang, ...rest } = item

        return (
          <MenuItem
            key={item.href || index}
            icon={icon ? <i className={icon} /> : undefined}
            {...rest}
          >
            {label}
          </MenuItem>
        )
      })}
    </Menu>
  )
}

export default VerticalMenuList
