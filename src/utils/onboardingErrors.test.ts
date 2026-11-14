import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveOnboardingErrorTarget } from './onboardingErrors'

describe('resolveOnboardingErrorTarget', () => {
  it('routes fiscal identity fields to step 0', () => {
    assert.deepEqual(resolveOnboardingErrorTarget('legalName', 'x'), { step: 0, field: 'legalName' })
    assert.deepEqual(resolveOnboardingErrorTarget('checkDigit', 'x'), {
      step: 0,
      field: 'checkDigit'
    })
  })

  it('routes fiscal preference fields to step 1', () => {
    assert.deepEqual(resolveOnboardingErrorTarget('baseCurrency', 'x'), {
      step: 1,
      field: 'baseCurrency'
    })
    assert.deepEqual(resolveOnboardingErrorTarget('defaultVatAliquot', 'x'), {
      step: 1,
      field: 'defaultVatAliquot'
    })
  })

  it('defaults a missing field to checkDigit when the message mentions the check digit', () => {
    assert.deepEqual(resolveOnboardingErrorTarget(undefined, 'dígito verificador incorrecto'), {
      step: 0,
      field: 'checkDigit'
    })
  })

  it('defaults a missing field to docNumber otherwise', () => {
    assert.deepEqual(resolveOnboardingErrorTarget(undefined, 'documento inválido'), {
      step: 0,
      field: 'docNumber'
    })
  })

  it('returns null for an unknown explicit field', () => {
    assert.equal(resolveOnboardingErrorTarget('unknownField', 'x'), null)
  })
})
