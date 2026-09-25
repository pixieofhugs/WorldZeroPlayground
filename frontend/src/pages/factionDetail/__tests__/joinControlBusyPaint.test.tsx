/**
 * The seam: the join confirm's busy paint (#3011, audit of #2814/#2994).
 *
 * #2486 ruled that a disabled primary control must DROP its CTA paint for
 * `.control-off` rather than fade, because `opacity` composites the whole
 * element — the fill sinks toward the sheet and the label's ink fades over
 * the already-faded fill, losing contrast twice.
 * `proposeTask/__tests__/submitControlOff.test.tsx` enforced that for the
 * nine propose kits; this control's own busy fade (`opacity: busy ? 0.6 : 1`)
 * was outside that sweep and is fixed here, in the same shape.
 *
 * The class alone is not the whole invariant — nothing stops a fade being
 * composited on top of it — so both halves are asserted: the class is worn
 * AND no inline `opacity` survives.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { JoinConfirm, type JoinControlSkin } from '../../../components/JoinControl'
import type { Membership } from '../useFactionDetail'

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    state: 'eligible',
    currentFactionSlug: null,
    join: async () => {},
    joining: false,
    joinError: null,
    ...overrides,
  }
}

/** A skin carrying an identity class, the way the Ephemerists' `.eph-cta` does. */
const SKINNED: JoinControlSkin = {
  openStyle: {},
  confirmStyle: {},
  cancelStyle: {},
  className: 'eph-cta',
}

function confirmTag(skin: JoinControlSkin, joining: boolean): string {
  const html = renderToStaticMarkup(
    <JoinConfirm
      membership={membership({ joining })}
      name="The Ephemerists"
      skin={skin}
      joiningLabel="Joining…"
      onCancel={() => {}}
    />,
  )
  const at = html.indexOf('data-join="confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

describe('the join confirm drops its paint instead of fading while busy (#2486)', () => {
  it('is enabled before joining', () => {
    // `.control-off` rides unconditionally, the same as the propose kits'
    // submit control — the CSS only takes effect under `:disabled`.
    const tag = confirmTag(SKINNED, false)
    expect(tag, 'the control is enabled before joining').not.toContain('disabled=""')
  })

  it('wears .control-off while joining, alongside the skin\'s own class', () => {
    const tag = confirmTag(SKINNED, true)
    expect(tag, 'the control is disabled while joining').toContain('disabled=""')
    expect(tag, 'the measured disabled treatment').toContain('control-off')
    expect(tag, "the skin's identity class survives (#2146)").toContain('eph-cta')
  })

  it('declares no inline opacity while joining', () => {
    // The exact defect #2486 removed. The class alone is not the whole
    // invariant, since nothing stops a fade being composited over it.
    const tag = confirmTag(SKINNED, true)
    expect(tag, 'no fade on the CTA').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
  })

  it('carries the class with no skin identity class to ride alongside', () => {
    const bare: JoinControlSkin = { openStyle: {}, confirmStyle: {}, cancelStyle: {} }
    const tag = confirmTag(bare, true)
    expect(tag, 'the disabled treatment stands alone').toContain('control-off')
  })
})
