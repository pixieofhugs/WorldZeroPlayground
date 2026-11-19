import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOBILE_QUERY } from '../useFormFactor'

// Dialogs read phone-vs-desktop from the cascade, which the node harness cannot
// lay out; pin the phone declarations the components rely on.
describe('dialog shell vars', () => {
  const css = readFileSync(new URL('../../css/09-component-shared.css', import.meta.url), 'utf8')
  const start = css.indexOf(`@media ${MOBILE_QUERY} {\n  :root, [data-theme] {\n    --sheet-align`)
  const phone = css.slice(start, css.indexOf('\n}\n', start))

  it.each([
    '--sheet-align: flex-end',
    '--sheet-pad: 0',
    '--sheet-full: 100%',
    '--takeover-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom))',
    '--switcher-bottom: calc(var(--space-xl) + var(--tab-bar-clearance))',
    '--letter-width: 100%',
  ])('phone block declares %s', (decl) => {
    expect(start).toBeGreaterThan(-1)
    expect(phone).toContain(decl)
  })
})
