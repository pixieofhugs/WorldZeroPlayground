/**
 * The seam: `SealActions`' commit button, busy (#3011, audit of #2814/#2994).
 *
 * #2486 ruled that a disabled primary control must DROP its CTA paint for
 * `.control-off` rather than fade, because `opacity` composites the whole
 * element — the fill sinks toward the sheet and the label's ink fades over
 * the already-faded fill, losing contrast twice.
 * `proposeTask/__tests__/submitControlOff.test.tsx` enforced that for the
 * nine propose kits; the duel sheet's commit — `SealActions`, grandfathered
 * off that extraction on the owner's own ruling (see `JoinControl.tsx`'s
 * docblock) — kept the inline fade until now, in BOTH its normal and its
 * `danger` (forfeit) form.
 *
 * The outline cancel carries no fade today and is left alone; only the
 * commit button is asserted here.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { SealActions, type DuelSlotTheme } from '../shared'

const THEME: DuelSlotTheme = { accent: 'var(--color-accent)' }

function commitTag(busy: boolean, danger: boolean): string {
  const html = renderToStaticMarkup(
    <SealActions
      onConfirm={() => {}}
      onCancel={() => {}}
      busy={busy}
      danger={danger}
      theme={THEME}
    />,
  )
  const at = html.indexOf('data-testid="duel-seal-confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

describe('the duel commit drops its paint instead of fading while busy (#2486)', () => {
  it.each([
    ['seal', false],
    ['forfeit', true],
  ] as const)('%s — is enabled before submitting', (_name, danger) => {
    const tag = commitTag(false, danger)
    expect(tag, 'the control is enabled before submitting').not.toContain('disabled=""')
  })

  it.each([
    ['seal', false],
    ['forfeit', true],
  ] as const)('%s — wears .control-off while busy', (_name, danger) => {
    const tag = commitTag(true, danger)
    expect(tag, 'the control is disabled while busy').toContain('disabled=""')
    expect(tag, 'the measured disabled treatment').toContain('control-off')
    expect(tag, "the shared button chrome survives").toContain('btn-primary')
  })

  it.each([
    ['seal', false],
    ['forfeit', true],
  ] as const)('%s — declares no inline opacity while busy', (_name, danger) => {
    // The exact defect #2486 removed. The class alone is not the whole
    // invariant, since nothing stops a fade being composited over it.
    const tag = commitTag(true, danger)
    expect(tag, 'no fade on the CTA').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
  })
})
