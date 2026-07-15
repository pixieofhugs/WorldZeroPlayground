import { describe, it, expect } from 'vitest'
import { formFactorFor, MOBILE_QUERY } from '../useFormFactor'

describe('useFormFactor', () => {
  it('maps a matching mobile media query to mobile, else desktop', () => {
    expect(formFactorFor(true)).toBe('mobile')
    expect(formFactorFor(false)).toBe('desktop')
  })

  it('breaks at the phone/desktop boundary (768px), no tablet tier', () => {
    expect(MOBILE_QUERY).toBe('(max-width: 767px)')
  })
})
