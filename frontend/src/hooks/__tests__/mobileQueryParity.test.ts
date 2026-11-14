import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOBILE_QUERY } from '../useFormFactor'

// The composer's phone sizes are a CSS media query; the hook is the other
// declaration of "phone". They must not drift.
describe('phone breakpoint', () => {
  it('the composer size vars use MOBILE_QUERY verbatim', () => {
    const css = readFileSync(
      new URL('../../css/09-component-shared.css', import.meta.url),
      'utf8',
    )
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root {\n    --composer-max-width`)
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root, [data-theme] {\n    --profile-pad`)
  })
})
