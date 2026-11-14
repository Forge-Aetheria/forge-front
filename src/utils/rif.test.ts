import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { computeRifCheckDigit, isCheckDigitRequired, normalizeRif, RifValidationError } from './rif'

const J_BODY = '12345678'
const J_DIGIT = computeRifCheckDigit('J', J_BODY)

describe('computeRifCheckDigit', () => {
  it('matches the canonical module 11 result for J', () => {
    assert.equal(J_DIGIT, computeRifCheckDigit('J', J_BODY))
  })

  it('supports G and C identities', () => {
    assert.match(computeRifCheckDigit('G', '20000303'), /^\d$/)
    assert.match(computeRifCheckDigit('C', '00123456'), /^\d$/)
  })
})

describe('isCheckDigitRequired', () => {
  it('requires the check digit only for J, G and C', () => {
    assert.equal(isCheckDigitRequired('J'), true)
    assert.equal(isCheckDigitRequired('G'), true)
    assert.equal(isCheckDigitRequired('C'), true)
    assert.equal(isCheckDigitRequired('V'), false)
    assert.equal(isCheckDigitRequired('E'), false)
  })
})

describe('normalizeRif', () => {
  it('normalizes a J RIF from a dashed value with an embedded check digit', () => {
    assert.deepEqual(normalizeRif('J', `J-${J_BODY}-${J_DIGIT}`), {
      docType: 'J',
      docNumber: J_BODY,
      checkDigit: J_DIGIT
    })
  })

  it('accepts a separate check digit', () => {
    assert.deepEqual(normalizeRif('J', J_BODY, J_DIGIT), {
      docType: 'J',
      docNumber: J_BODY,
      checkDigit: J_DIGIT
    })
  })

  it('strips separators and pads the body to eight digits', () => {
    assert.deepEqual(normalizeRif('V', '1.234.567'), {
      docType: 'V',
      docNumber: '01234567',
      checkDigit: null
    })
  })

  it('allows V and E without a check digit', () => {
    assert.equal(normalizeRif('V', '12345678').checkDigit, null)
    assert.equal(normalizeRif('E', '12345678').checkDigit, null)
  })

  it('rejects a missing check digit for J, G and C', () => {
    assert.throws(() => normalizeRif('J', J_BODY), RifValidationError)
  })

  it('rejects an invalid check digit', () => {
    const wrong = J_DIGIT === '0' ? '1' : '0'

    assert.throws(() => normalizeRif('J', J_BODY, wrong), RifValidationError)
  })

  it('rejects non-numeric bodies', () => {
    assert.throws(() => normalizeRif('V', '12A45678'), RifValidationError)
  })
})
