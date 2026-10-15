// MUI Imports
import type { Theme } from '@mui/material/styles'

const fab: Theme['components'] = {
  MuiFab: {
    styleOverrides: {
      root: {
        variants: [
          {
            props: { color: 'default' },
            style: {
              color: 'rgb(var(--mui-mainColorChannels-light) / 0.9)',
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-grey-A100)'
              }
            }
          },
          {
            props: { color: 'primary' },
            style: {
              boxShadow: '0px 4px 14px rgba(108, 92, 231, 0.45)',
              '&:hover': {
                boxShadow: '0px 6px 20px rgba(108, 92, 231, 0.55)'
              },
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-primary-dark)'
              }
            }
          },
          {
            props: { color: 'secondary' },
            style: {
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-secondary-dark)'
              }
            }
          },
          {
            props: { color: 'error' },
            style: {
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-error-dark)'
              }
            }
          },
          {
            props: { color: 'warning' },
            style: {
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-warning-dark)'
              }
            }
          },
          {
            props: { color: 'info' },
            style: {
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-info-dark)'
              }
            }
          },
          {
            props: { color: 'success' },
            style: {
              '&.Mui-focusVisible:not(:has(span.MuiTouchRipple-root))': {
                backgroundColor: 'var(--mui-palette-success-dark)'
              }
            }
          }
        ]
      }
    }
  }
}

export default fab
