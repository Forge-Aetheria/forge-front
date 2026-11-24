import type React from 'react'

export interface NumericSanitizeOptions {

  /** Allow a single decimal point `.` (default: false). */
  allowDecimal?: boolean

  /** Maximum number of decimal digits when `allowDecimal` is true (default: 4). */
  maxDecimals?: number

  /** Maximum total character length. */
  maxLength?: number
}

export interface NumericValidationOptions {
  fieldLabel?: string
  required?: boolean
  allowDecimal?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
}

const NAVIGATION_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End'
])

/**
 * Sanitizes an arbitrary string (e.g. from onChange or onPaste) to retain only
 * valid non-negative numeric characters according to the provided options.
 */
export const sanitizeNumericValue = (
  raw: string,
  options: NumericSanitizeOptions = {}
): string => {
  const { allowDecimal = false, maxDecimals = 4, maxLength } = options

  if (!raw) return ''

  let cleaned = allowDecimal ? raw.replace(/,/g, '.').replace(/[^\d.]/g, '') : raw.replace(/\D/g, '')

  if (allowDecimal) {
    const firstDotIndex = cleaned.indexOf('.')

    if (firstDotIndex !== -1) {
      const intPart = cleaned.slice(0, firstDotIndex)

      const decPart = cleaned
        .slice(firstDotIndex + 1)
        .replace(/\./g, '')
        .slice(0, maxDecimals)

      cleaned = `${intPart}.${decPart}`
    }
  }

  if (typeof maxLength === 'number' && maxLength > 0) {
    cleaned = cleaned.slice(0, maxLength)
  }

  return cleaned
}

/**
 * Prevents non-numeric keystrokes (letters, `e`, `E`, `+`, `-`, extra `.`)
 * while preserving navigation and clipboard shortcuts (Ctrl/Cmd + A/C/V/X/Z).
 */
export const handleNumericKeyDown = (
  event: React.KeyboardEvent<HTMLElement>,
  options: NumericSanitizeOptions = {}
): void => {
  const { allowDecimal = false } = options
  const { key, ctrlKey, metaKey, altKey } = event

  if (ctrlKey || metaKey || altKey || NAVIGATION_KEYS.has(key)) {
    return
  }

  if (/^\d$/.test(key)) {
    return
  }

  if (allowDecimal && key === '.') {
    const target = event.target as HTMLInputElement | null
    const currentValue = target?.value ?? ''

    if (!currentValue.includes('.')) {
      return
    }
  }

  event.preventDefault()
}

/**
 * Returns standard `inputProps` / `slotProps.htmlInput` attributes for MUI numeric text fields.
 */
export const getNumericInputProps = (
  options: NumericSanitizeOptions = {}
): { inputMode: 'numeric' | 'decimal'; maxLength?: number } => ({
  inputMode: options.allowDecimal ? 'decimal' : 'numeric',
  ...(typeof options.maxLength === 'number' ? { maxLength: options.maxLength } : {})
})

/**
 * Validates a numeric string against required, length, and numeric range rules.
 * Returns `null` if valid, or a localized error message string if invalid.
 */
export const validateNumericValue = (
  value: string,
  options: NumericValidationOptions = {}
): string | null => {
  const {
    fieldLabel = 'Este campo',
    required = false,
    allowDecimal = false,
    min,
    max,
    minLength,
    maxLength
  } = options

  const trimmed = value.trim()

  if (!trimmed) {
    return required ? `${fieldLabel} es obligatorio.` : null
  }

  const pattern = allowDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/

  if (!pattern.test(trimmed)) {
    return `${fieldLabel} solo permite caracteres numéricos${allowDecimal ? ' válidos' : ''}.`
  }

  if (typeof minLength === 'number' && trimmed.length < minLength) {
    return `${fieldLabel} debe tener al menos ${minLength} dígitos.`
  }

  if (typeof maxLength === 'number' && trimmed.length > maxLength) {
    return `${fieldLabel} no puede exceder ${maxLength} dígitos.`
  }

  const num = Number(trimmed)

  if (Number.isNaN(num)) {
    return `${fieldLabel} debe ser un número válido.`
  }

  if (typeof min === 'number' && num < min) {
    return `${fieldLabel} debe ser mayor o igual a ${min}.`
  }

  if (typeof max === 'number' && num > max) {
    return `${fieldLabel} no puede ser mayor a ${max}.`
  }

  return null
}
