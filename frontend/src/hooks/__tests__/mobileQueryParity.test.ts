import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOBILE_QUERY } from '../useFormFactor'

// The phone values are a CSS media query; the hook is the other declaration of
// "phone". They must not drift.
const css = readFileSync(
  new URL('../../css/09-component-shared.css', import.meta.url),
  'utf8',
)

describe('phone breakpoint', () => {
  it.each(['--profile-pad', '--feed-bar-pad', '--sheet-align', '--fx-align'])(
    'the block opening with %s uses MOBILE_QUERY verbatim',
    (first) => {
      expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root, [data-theme] {\n    ${first}`)
    },
  )

  it('the composer size vars use MOBILE_QUERY verbatim', () => {
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root {\n    --composer-max-width`)
  })
})

// Dialogs and the task-detail column read phone values from the cascade, which
// the node harness cannot lay out; pin the declarations the components rely on.
function phoneBlock(first: string): string {
  const start = css.indexOf(`@media ${MOBILE_QUERY} {\n  :root, [data-theme] {\n    ${first}`)
  return css.slice(start, css.indexOf('\n}\n', start))
}

describe('phone vars the components read', () => {
  it('takeover ground flips on [data-theme] only', () => {
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  [data-theme] {\n    --takeover-bg: var(--color-bg-page)`)
  })

  it.each([
    '--sheet-align: flex-end',
    '--sheet-pad: 0',
    '--sheet-full: 100%',
    '--takeover-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom))',
    '--switcher-bottom: calc(var(--space-xl) + var(--tab-bar-clearance))',
    '--letter-width: 100%',
    '--alb-card-width: 100%',
  ])('dialog block declares %s', (decl) => {
    expect(phoneBlock('--sheet-align')).toContain(decl)
  })

  it.each([
    '--fx-row-direction: column',
    '--fx-align: stretch',
    '--fx-col-flex: 1 1 auto',
    '--fx-col-width: 100%',
    '--fx-action-top: 0',
  ])('task-detail block declares %s', (decl) => {
    expect(phoneBlock('--fx-align')).toContain(decl)
  })
})
