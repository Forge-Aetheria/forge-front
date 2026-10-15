// MUI Imports
import type { Theme } from '@mui/material'

// Type Imports
import type { Skin } from '@core/types'

const drawer = (skin: Skin): Theme['components'] => ({
  MuiDrawer: {
    defaultProps: {
      ...(skin === 'bordered' && {
        PaperProps: {
          elevation: 0
        }
      })
    },
    styleOverrides: {
      paper: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E6E4F0',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)'
      }
    }
  }
})

export default drawer
