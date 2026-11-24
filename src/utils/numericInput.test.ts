import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getNumericInputProps, sanitizeNumericValue, validateNumericValue } from './numericInput'

describe('sanitizeNumericValue', () => {
  it('strips letters and symbols for integer mode', () => {
    assert.equal(sanitizeNumericValue('abc123def45'), '12345')
    assert.equal(sanitizeNumericValue('1e5+-9.8'), '1598')
  })

  it('preserves a single decimal point and caps decimal places in decimal mode', () => {
    assert.equal(sanitizeNumericValue('12.34567', { allowDecimal: true, maxDecimals: 2 }), '12.34')
    assert.equal(sanitizeNumericValue('12.3.4.5', { allowDecimal: true, maxDecimals: 4 }), '12.345')
    assert.equal(sanitizeNumericValue('12,50abc', { allowDecimal: true, maxDecimals: 2 }), '12.50')
  })

  it('enforces maxLength when specified', () => {
    assert.equal(sanitizeNumericValue('01020123451234567890999', { maxLength: 20 }), '01020123451234567890')
  })
})

describe('validateNumericValue', () => {
  it('enforces required and digit-only constraints', () => {
    assert.match(validateNumericValue('', { required: true, fieldLabel: 'Número de cuenta' }) ?? '', /obligatorio/)
    assert.equal(validateNumericValue('', { required: false }), null)
    assert.match(validateNumericValue('123a', { fieldLabel: 'Cantidad' }) ?? '', /numéricos/)
  })

  it('enforces minLength, maxLength, min, and max', () => {
    assert.match(validateNumericValue('0102', { minLength: 20, maxLength: 20, fieldLabel: 'Cuenta' }) ?? '', /al menos 20/)
    assert.equal(validateNumericValue('01020123451234567890', { minLength: 20, maxLength: 20 }), null)
    assert.match(validateNumericValue('0', { allowDecimal: true, min: 1, fieldLabel: 'Demanda' }) ?? '', /mayor o igual a 1/)
    assert.equal(validateNumericValue('25.5', { allowDecimal: true, min: 0.01, max: 100 }), null)
  })
})

describe('getNumericInputProps', () => {
  it('returns numeric or decimal inputMode with optional maxLength', () => {
    assert.deepEqual(getNumericInputProps(), { inputMode: 'numeric' })
    assert.deepEqual(getNumericInputProps({ allowDecimal: true, maxLength: 12 }), {
      inputMode: 'decimal',
      maxLength: 12
    })
  })
})
