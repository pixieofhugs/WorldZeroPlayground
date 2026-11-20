import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOBILE_QUERY } from '../useFormFactor'

// The phone values are a CSS media query; the hook is the other declaration of
// "phone". They must not drift.
const css = readFileSync(
  new URL('../../css/09-component-shared.css', import.meta.url),
  'utf8',
)
const detailCss = readFileSync(
  new URL('../../pages/taskDetail/taskDetail.css', import.meta.url),
  'utf8',
)

const praxisCss = readFileSync(
  new URL('../../pages/praxisDetail/praxisDetail.css', import.meta.url),
  'utf8',
)

describe('phone breakpoint', () => {
  it.each(["--profile-pad", "--feed-bar-pad"])(
    'the block opening with %s uses MOBILE_QUERY verbatim',
    (first) => {
      expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root, [data-theme] {\n    ${first}`)
    },
  )

  it('the composer size vars use MOBILE_QUERY verbatim', () => {
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root {\n    --composer-max-width`)
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  :root {\n    --sheet-align`)
    expect(detailCss).toContain(`@media ${MOBILE_QUERY} {\n  :root {\n    --detail-row-align`)
    expect(praxisCss).toContain(`@media ${MOBILE_QUERY} {\n  :root {\n    --praxis-section-gap`)
  })
})

// Dialogs and the task-detail column read phone values from the cascade, which
// the node harness cannot lay out; pin the declarations the components rely on.
const vars = (block: string) =>
  Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]))

function phoneBlock(first: string, src = css): string {
  const start = src.indexOf(`@media ${MOBILE_QUERY} {\n  :root {\n    ${first}`)
  return src.slice(start, src.indexOf('\n}\n', start))
}

describe('phone vars the components read', () => {
  it('takeover ground flips on [data-theme] only', () => {
    expect(css).toContain(`@media ${MOBILE_QUERY} {\n  .task-fit-card {\n    width: 100%;\n  }\n  [data-theme] {\n    --takeover-bg: var(--color-bg-page)`)
  })

  it('dialog block is exactly these vars', () => {
    expect(vars(phoneBlock('--sheet-align'))).toEqual({
      '--sheet-align': 'flex-end',
      '--sheet-pad': '0',
      '--sheet-full': '100%',
      '--sheet-border': 'none',
      '--sheet-radius': '16px 16px 0 0',
      '--takeover-bottom': 'calc(var(--space-lg) + env(safe-area-inset-bottom))',
      '--takeover-height': '100%',
      '--takeover-radius': '0',
      '--everymen-band-pad': 'var(--space-sm) var(--space-lg)',
      '--switcher-bottom': 'calc(var(--space-xl) + var(--tab-bar-clearance))',
    })
  })

  it('task-detail block is exactly these vars', () => {
    expect(vars(phoneBlock('--detail-row-align', detailCss))).toEqual({
      '--detail-row-align': 'stretch',
      '--detail-row-direction': 'column',
      '--detail-pad': 'var(--space-lg)',
      '--detail-section-gap': 'var(--space-xl)',
      '--detail-panel-space': 'var(--space-lg)',
      '--detail-title-size': 'var(--text-title)',
      '--detail-shell-pad': 'var(--space-lg) var(--space-md) var(--space-xl)',
      '--detail-card-pad': 'var(--space-md)',
      '--detail-stamp-pad': 'var(--space-md)',
      '--detail-btn-pad': 'var(--space-md) var(--space-lg)',
      '--detail-cta-pad': 'var(--space-sm) var(--space-md)',
      '--detail-btn-size': 'var(--text-xl)',
      '--detail-hero-size': 'var(--text-heading)',
      '--detail-lead-size': 'var(--text-content)',
      '--detail-kicker-size': 'var(--text-lg)',
      '--detail-wage-flex': '1 1 auto',
      '--detail-wage-min': '0',
      '--detail-worth-min-default': '122px',
      '--detail-worth-min-singularity': '118px',
      '--detail-worth-min-snide': '132px',
      '--detail-action-top': '0',
      '--detail-col-flex': '1 1 auto',
      '--detail-col-width': '100%',
    })
  })

  it('praxis-detail block is exactly these vars', () => {
    expect(vars(phoneBlock('--praxis-section-gap', praxisCss))).toEqual({
      '--praxis-section-gap': 'var(--space-xl)',
      '--praxis-split-direction': 'column',
      '--praxis-pad': 'var(--space-lg)',
      '--praxis-everymen-pad': 'var(--space-xl)',
      '--praxis-sheet-pad': 'var(--space-lg) var(--space-md) var(--space-xl)',
      '--praxis-lead-size': 'var(--text-content)',
      '--praxis-hero-size': 'var(--text-heading)',
      '--praxis-kicker-size': 'var(--text-lg)',
      '--praxis-plate-size': 'var(--text-title)',
    })
  })
})
