'use client'

import React, { forwardRef } from 'react'

import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import { styled } from '@mui/material/styles'

import ReactDatePicker from 'react-datepicker'
import type { DatePickerProps } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import CustomTextField from '@core/components/mui/TextField'

/**
 * Parses a `YYYY-MM-DD` string into a local `Date` without UTC day-shift.
 * Returns `null` when empty or invalid.
 */
export const parseLocalDate = (isoDate?: string | null): Date | null => {
  if (!isoDate) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim())

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Formats a `Date` into `YYYY-MM-DD` using local calendar fields.
 */
export const formatLocalDate = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const StyledDatePickerWrapper = styled(Box)(({ theme }) => ({
  width: '100%',
  '& .react-datepicker-wrapper': {
    width: '100%'
  },
  '& .react-datepicker-popper': {
    zIndex: 1300
  },
  '& .react-datepicker': {
    fontFamily: theme.typography.fontFamily,
    border: '1px solid #E6E4F0',
    borderRadius: '14px',
    boxShadow: '0 10px 30px rgba(30, 27, 46, 0.12)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  '& .react-datepicker__header': {
    backgroundColor: '#FAF9FF',
    borderBottom: '1px solid #E6E4F0',
    paddingTop: theme.spacing(1.5)
  },
  '& .react-datepicker__current-month': {
    color: '#1E1B2E',
    fontWeight: 700,
    fontSize: '0.9rem'
  },
  '& .react-datepicker__day-name': {
    color: '#6B7280',
    fontWeight: 600,
    fontSize: '0.75rem'
  },
  '& .react-datepicker__day': {
    color: '#1E1B2E',
    borderRadius: '8px',
    '&:hover': {
      backgroundColor: '#F3F0FF',
      color: '#6C5CE7'
    }
  },
  '& .react-datepicker__day--selected, & .react-datepicker__day--in-range, & .react-datepicker__day--keyboard-selected': {
    backgroundColor: '#6C5CE7 !important',
    color: '#FFFFFF !important',
    fontWeight: 600
  },
  '& .react-datepicker__day--today': {
    border: '1px solid #6C5CE7',
    fontWeight: 700
  },
  '& .react-datepicker__day--disabled': {
    color: '#CBD5E1',
    cursor: 'not-allowed',
    '&:hover': {
      backgroundColor: 'transparent',
      color: '#CBD5E1'
    }
  }
}))

interface DefaultDateInputProps {
  value?: string
  onClick?: () => void
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
}

const DefaultDateInput = forwardRef<HTMLInputElement, DefaultDateInputProps>(
  ({ value, onClick, label, placeholder, disabled, error, helperText }, ref) => (
    <CustomTextField
      fullWidth
      inputRef={ref}
      label={label}
      placeholder={placeholder || 'DD/MM/YYYY'}
      value={value || ''}
      onClick={onClick}
      disabled={disabled}
      error={error}
      helperText={helperText}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position='end'>
              <i className='tabler-calendar text-base text-[#6B7280]' />
            </InputAdornment>
          )
        }
      }}
    />
  )
)

DefaultDateInput.displayName = 'DefaultDateInput'

export type AppReactDatepickerProps = DatePickerProps & {
  label?: string
  placeholder?: string
  error?: boolean
  helperText?: string
  boxProps?: React.ComponentProps<typeof Box>
}

const AppReactDatepicker: React.FC<AppReactDatepickerProps> = ({
  label,
  placeholder,
  error,
  helperText,
  boxProps,
  customInput,
  dateFormat = 'dd/MM/yyyy',
  ...rest
}) => {
  return (
    <StyledDatePickerWrapper {...boxProps}>
      <ReactDatePicker
        dateFormat={dateFormat}
        customInput={
          customInput ?? (
            <DefaultDateInput
              label={label}
              placeholder={placeholder}
              disabled={rest.disabled}
              error={error}
              helperText={helperText}
            />
          )
        }
        {...rest}
      />
    </StyledDatePickerWrapper>
  )
}

export default AppReactDatepicker
