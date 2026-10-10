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
 *
 * STATE-KEYED, NOT A BARE `toContain` (review of #3068). `.control-off` rides
 * UNCONDITIONALLY — the CSS only takes effect under `:disabled` — so a bare
 * `expect(busyTag).toContain('control-off')` passes just as well on the IDLE
 * tag and proves nothing about the busy state specifically; the review that
 * found the Singularity gap below named this the reason the gap survived.
 * `paintedOff()` below is the invariant that actually determines what paints:
 * disabled together with the class. It is asserted `false` before joining and
 * `true` while joining, in the same test, so a regression in either direction
 * fails.
 *
 * SINGULARITY (review of #3068). The generic sweep renders a bare/Ephemerists
 * skin and never reaches the one faction whose chassis is theme-invariant —
 * exactly why `SingularityFactionBody`'s `JOIN_SKIN` missing
 * `.sg-control-off` slipped through review. `JOIN_SKIN` is exported for this
 * file and rendered through the same `JoinConfirm` seam as the skins above.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { JoinConfirm, type JoinControlSkin } from '../../../components/JoinControl'
import type { Membership } from '../useFactionDetail'
import { JOIN_SKIN as SINGULARITY_JOIN_SKIN } from '../archetypes/SingularityFactionBody'
import {
  AA_NORMAL,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

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
  return extractConfirmTag(html)
}

function extractConfirmTag(html: string): string {
  const at = html.indexOf('data-join="confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

/**
 * The invariant that actually determines the paint: `.control-off` only acts
 * under `:disabled`, so this is `true` exactly when both are present — never
 * from the class alone.
 */
const paintedOff = (tag: string): boolean =>
  tag.includes('disabled=""') && tag.includes('control-off')

describe('the join confirm drops its paint instead of fading while busy (#2486)', () => {
  it('is not painted off before joining, and is painted off while joining', () => {
    const idle = confirmTag(SKINNED, false)
    const busy = confirmTag(SKINNED, true)
    expect(paintedOff(idle), 'not painted off before joining').toBe(false)
    expect(paintedOff(busy), 'painted off while joining').toBe(true)
    expect(busy, "the skin's identity class survives (#2146)").toContain('eph-cta')
  })

  it('declares no inline opacity while joining', () => {
    // The exact defect #2486 removed. The class alone is not the whole
    // invariant, since nothing stops a fade being composited over it.
    const tag = confirmTag(SKINNED, true)
    expect(tag, 'no fade on the CTA').not.toMatch(/(?:^|;|")\s*opacity\s*:/)
  })

  it('carries the class with no skin identity class to ride alongside', () => {
    const bare: JoinControlSkin = { openStyle: {}, confirmStyle: {}, cancelStyle: {} }
    const idle = confirmTag(bare, false)
    const busy = confirmTag(bare, true)
    expect(paintedOff(idle), 'not painted off before joining').toBe(false)
    expect(paintedOff(busy), 'the disabled treatment stands alone').toBe(true)
  })
})

/* -------------------------------------------------------------------------- */
/* Singularity — the theme-invariant chassis (review of #3068)                */
/* -------------------------------------------------------------------------- */

describe('the Singularity join confirm does not take the house neutral (#3011, review of #3068)', () => {
  it('wears .sg-control-off alongside .control-off, only while joining', () => {
    const idle = confirmTag(SINGULARITY_JOIN_SKIN, false)
    const busy = confirmTag(SINGULARITY_JOIN_SKIN, true)
    expect(paintedOff(idle), 'not painted off before joining').toBe(false)
    expect(paintedOff(busy), 'painted off while joining').toBe(true)
    expect(busy, "the Singularity's own repoint rides alongside").toContain('sg-control-off')
  })
})

/* -------------------------------------------------------------------------- */
/* Contrast — why the repoint is load-bearing, in light (review of #3068)     */
/* -------------------------------------------------------------------------- */

const THEMES = readThemes(readIndexCss())

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

describe('why the house neutral cannot land on the Singularity chassis, in light', () => {
  it('the chassis is the same near-black in light as in dark (theme-invariant)', () => {
    const light = resolve('--faction-singularity-card-bg', 'light')
    const dark = resolve('--faction-singularity-card-bg', 'dark')
    expect([light.r, light.g, light.b, light.a]).toEqual([dark.r, dark.g, dark.b, dark.a])
  })

  it('the house .control-off fill sits far off that chassis — loud, not illegible', () => {
    // Not an accessibility failure — the opposite one, the same "loudest
    // thing on the page" name `disabledControlContrast.test.ts` gives the
    // Singularity terminal's own case: a pale slab (#e2ddd2) on a near-black
    // chassis reads as the one live-looking thing on a disabled control.
    const ratio = contrastRatio(
      resolve('--control-off-fill', 'light'),
      resolve('--faction-singularity-card-bg', 'light'),
    )
    expect(ratio, `the house fill on the chassis reads ${formatRatio(ratio)}`).toBeGreaterThan(10)
  })

  it('the repointed pair clears AA on the panel it actually lands on', () => {
    const ratio = contrastRatio(
      resolve('--faction-singularity-term-dim', 'light'),
      resolve('--faction-singularity-term-panel', 'light'),
    )
    expect(ratio, `the repointed pair reads ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})
