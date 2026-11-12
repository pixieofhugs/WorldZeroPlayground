/**
 * The join confirm's busy paint (#3011). #2486: a disabled primary drops its CTA
 * paint for `.control-off` instead of fading (`opacity` loses contrast twice).
 * Asserted: the class is worn AND no inline `opacity` survives. `.control-off`
 * rides unconditionally (it acts only under `:disabled`), so checks are
 * state-keyed via `paintedOff()`. Singularity's theme-invariant chassis is
 * checked separately through its exported `JOIN_SKIN`.
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

/** `.control-off` only acts under `:disabled`, so both must be present. */
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

describe('the Singularity join confirm does not take the house neutral (#3011, review of #3068)', () => {
  it('wears .sg-control-off alongside .control-off, only while joining', () => {
    const idle = confirmTag(SINGULARITY_JOIN_SKIN, false)
    const busy = confirmTag(SINGULARITY_JOIN_SKIN, true)
    expect(paintedOff(idle), 'not painted off before joining').toBe(false)
    expect(paintedOff(busy), 'painted off while joining').toBe(true)
    expect(busy, "the Singularity's own repoint rides alongside").toContain('sg-control-off')
  })
})

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
    // A pale slab on near-black reads as the one live thing on a disabled control.
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
