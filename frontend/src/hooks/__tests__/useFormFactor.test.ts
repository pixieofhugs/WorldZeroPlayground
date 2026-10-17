// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { formFactorFor, MOBILE_QUERY, useFormFactor } from '../useFormFactor'

/** A matchMedia stub that evaluates MOBILE_QUERY for a given viewport + pointer. */
function stubViewport(width: number, pointer: 'fine' | 'coarse') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches:
      query === MOBILE_QUERY && width <= 767 && pointer === 'coarse',
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('useFormFactor', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps a matching mobile media query to mobile, else desktop', () => {
    expect(formFactorFor(true)).toBe('mobile')
    expect(formFactorFor(false)).toBe('desktop')
  })

  it('is width AND touch-first: 768px and a coarse pointer (#3182)', () => {
    expect(MOBILE_QUERY).toBe('(max-width: 767px) and (pointer: coarse)')
  })

  it('a fine-pointer window at 621px gets the desktop shell', () => {
    stubViewport(621, 'fine')
    expect(renderHook(() => useFormFactor()).result.current).toBe('desktop')
  })

  it('a coarse-pointer viewport at 390px gets the phone shell', () => {
    stubViewport(390, 'coarse')
    expect(renderHook(() => useFormFactor()).result.current).toBe('mobile')
  })
})
