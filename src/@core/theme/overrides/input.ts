// MUI Imports
import type { Theme } from '@mui/material/styles'

const input: Theme['components'] = {
  MuiFormControl: {
    styleOverrides: {
      root: {
        '&:has(.MuiRadio-root) .MuiFormHelperText-root, &:has(.MuiCheckbox-root) .MuiFormHelperText-root, &:has(.MuiSwitch-root) .MuiFormHelperText-root':
          {
            marginInline: 0
          }
      }
    }
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        lineHeight: 1.6,
        '&.MuiInput-underline': {
          '&:before': {
            borderColor: 'var(--mui-palette-customColors-inputBorder)'
          },
          '&:not(.Mui-disabled, .Mui-error):hover:before': {
            borderColor: 'var(--mui-palette-action-active)'
          }
        },
        '&.Mui-disabled .MuiInputAdornment-root, &.Mui-disabled .MuiInputAdornment-root > *': {
          color: 'var(--mui-palette-action-disabled)'
        }
      }
    }
  },
  MuiFilledInput: {
    styleOverrides: {
      root: {
        borderStartStartRadius: 4,
        borderStartEndRadius: 4,
        '&:before': {
          borderBottom: '1px solid var(--mui-palette-text-secondary)'
        },
        '&:hover:before': {
          borderBottom: '1px solid var(--mui-palette-text-primary)'
        },
        '&.Mui-disabled:before': {
          borderBottomStyle: 'solid',
          opacity: 0.38
        }
      }
    }
  },
  MuiInputLabel: {
    styleOverrides: {
      shrink: ({ ownerState }) => ({
        ...(ownerState.variant === 'outlined' && {
          transform: 'translate(14px, -8px) scale(0.867)'
        }),
        ...(ownerState.variant === 'filled' && {
          transform: `translate(12px, ${ownerState.size === 'small' ? 4 : 7}px) scale(0.867)`
        }),
        ...(ownerState.variant === 'standard' && {
          transform: 'translate(0, -1.5px) scale(0.867)'
        })
      })
    }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        boxShadow: 'none !important',
        '&:not(.Mui-focused):not(.Mui-error):not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#6C5CE7'
        },
        '&.Mui-disabled': {
          backgroundColor: '#F8FAFC'
        },
        '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
          borderColor: '#E2E8F0'
        },
        '&.Mui-focused': {
          boxShadow: 'none !important'
        },
        '&:not(.Mui-error).MuiInputBase-colorPrimary.Mui-focused': {
          boxShadow: 'none !important'
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#6C5CE7',
          borderWidth: '1.5px'
        }
      },
      input: ({ theme, ownerState }) => ({
        ...(ownerState?.size === 'medium' && {
          '&:not(.MuiInputBase-inputMultiline, .MuiInputBase-inputAdornedStart)': {
            padding: theme.spacing(3.5, 4)
          },
          height: '1.5em'
        }),
        '& ~ .MuiOutlinedInput-notchedOutline': {
          borderColor: '#CBD5E1',
          borderWidth: '1px'
        }
      }),
      notchedOutline: {
        borderColor: '#CBD5E1',
        borderRadius: 10,
        boxShadow: 'none !important',
        '& legend': {
          fontSize: '0.867em'
        }
      }
    }
  },
  MuiInputAdornment: {
    styleOverrides: {
      root: {
        color: 'var(--mui-palette-text-primary)',
        '& i, & svg': {
          fontSize: '1rem !important'
        },
        '& *': {
          color: 'inherit !important'
        }
      }
    }
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        lineHeight: 1,
        letterSpacing: 'unset'
      }
    }
  }
}

export default input
