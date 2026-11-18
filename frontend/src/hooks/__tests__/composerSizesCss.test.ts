import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOBILE_QUERY } from '../useFormFactor'

const css = readFileSync(
  new URL('../../css/09-component-shared.css', import.meta.url),
  'utf8',
)

const vars = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/(--composer-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]),
  )

// Node renders no media query, so the per-width composer sizes are pinned here.
describe('composer sizes', () => {
  it('desktop values sit in :root', () => {
    const block = css.match(/:root \{\n(  --composer-max-width[^}]*)\}/)![1]
    expect(vars(block)).toEqual({
      '--composer-max-width': '720px',
      '--composer-padding': 'var(--space-xl) var(--space-2xl) var(--space-2xl)',
      '--composer-pad-x': 'var(--space-2xl)',
      '--composer-pad-bottom': 'var(--space-2xl)',
      '--composer-gap': 'var(--space-xl)',
      '--composer-title-size': 'var(--text-heading)',
      '--composer-head-height': '96px',
      '--composer-heading-height': '48px',
      '--composer-sheet-padding': 'var(--space-2xl) var(--space-lg) var(--space-4xl)',
      '--composer-bar-padding': 'var(--space-md) var(--space-lg)',
      '--composer-page-inset': 'var(--space-lg)',
      '--composer-row-direction': 'row',
    })
  })

  it('phone values sit in the MOBILE_QUERY block', () => {
    const block = css.match(
      new RegExp(`@media ${MOBILE_QUERY.replace(/[()]/g, '\\$&')} \\{\\n  :root \\{\\n(  +--composer-max-width[^}]*)\\}`),
    )![1]
    expect(vars(block)).toEqual({
      '--composer-max-width': '100%',
      '--composer-padding': 'var(--space-lg) var(--space-lg) var(--space-xl)',
      '--composer-pad-x': 'var(--space-lg)',
      '--composer-pad-bottom': 'var(--space-xl)',
      '--composer-gap': 'var(--space-lg)',
      '--composer-title-size': 'var(--text-title)',
      '--composer-head-height': '80px',
      '--composer-heading-height': '82px',
      '--composer-sheet-padding': 'var(--space-lg) var(--space-md) var(--space-3xl)',
      '--composer-bar-padding': 'var(--space-sm) var(--space-lg)',
      '--composer-page-inset': 'var(--space-md)',
      '--composer-row-direction': 'column',
    })
  })
})
