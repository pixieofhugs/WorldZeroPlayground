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
 *
 * STATE-KEYED, NOT A BARE `toContain` (review of #3068). `.control-off` rides
 * UNCONDITIONALLY — the CSS only takes effect under `:disabled` — so a bare
 * `expect(busyTag).toContain('control-off')` passes just as well on a LIVE
 * tag and proves nothing about the busy state specifically; the review that
 * found the Singularity gap below named this the reason the gap survived.
 * `paintedOff()` is the invariant that actually determines what paints:
 * disabled together with the class, asserted `false` while live and `true`
 * while busy in the same test.
 *
 * SINGULARITY (review of #3068). `SealActions` alone can't reach the one
 * caller whose ground is theme-invariant — that lives in the skin that wires
 * `confirmClassName`, one layer up. `SingularityDuelSealConfirm` is rendered
 * directly below, the same fixture shape `duelSkinSlots.test.tsx` uses.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { SealActions, type DuelSlotTheme } from '../shared'
import {
  AA_NORMAL,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'

const THEME: DuelSlotTheme = { accent: 'var(--color-accent)' }

function commitTag(busy: boolean, danger: boolean, confirmClassName?: string): string {
  const html = renderToStaticMarkup(
    <SealActions
      onConfirm={() => {}}
      onCancel={() => {}}
      busy={busy}
      danger={danger}
      theme={THEME}
      confirmClassName={confirmClassName}
    />,
  )
  const at = html.indexOf('data-testid="duel-seal-confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

/**
 * The invariant that actually determines the paint: `.control-off` only acts
 * under `:disabled`, so this is `true` exactly when both are present — never
 * from the class alone.
 */
const paintedOff = (tag: string): boolean =>
  tag.includes('disabled=""') && tag.includes('control-off')

describe('the duel commit drops its paint instead of fading while busy (#2486)', () => {
  it.each([
    ['seal', false],
    ['forfeit', true],
  ] as const)('%s — is not painted off live, and is painted off while busy', (_name, danger) => {
    const live = commitTag(false, danger)
    const busy = commitTag(true, danger)
    expect(paintedOff(live), 'not painted off before submitting').toBe(false)
    expect(paintedOff(busy), 'painted off while busy').toBe(true)
    expect(busy, 'the shared button chrome survives').toContain('btn-primary')
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

  it('carries an optional confirmClassName alongside .control-off, never instead of it', () => {
    const live = commitTag(false, false, 'sg-control-off')
    const busy = commitTag(true, false, 'sg-control-off')
    expect(paintedOff(live), 'not painted off before submitting').toBe(false)
    expect(paintedOff(busy), 'painted off while busy').toBe(true)
    expect(busy, 'the caller class rides alongside').toContain('sg-control-off')
    expect(busy, 'the shared button chrome survives').toContain('btn-primary')
  })
})

/* -------------------------------------------------------------------------- */
/* Singularity — the theme-invariant chassis (review of #3068)                */
/* -------------------------------------------------------------------------- */

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    reads_the_array: false,
    takes_duel_ties: false,
  }
}

const CONFIG = {
  factions: [faction('singularity', 1.5, 0.5), faction('snide', 2.0, 0.0)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

const { default: SingularityDuelSealConfirm } = await import('../SingularityDuelSealConfirm')

function side(overrides: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    praxis_id: 10,
    display_name: 'Ada',
    faction_slug: 'singularity',
    avatar_url: null,
    is_submitted: false,
    points_from_votes: 0,
    ...overrides,
  } as DuelSideOut
}

const DUEL = {
  id: 5,
  status: 'active',
  forfeited_by_character_id: null,
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'singularity' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Rax', faction_slug: 'snide' }),
} as unknown as DuelDetailOut

function singularityCommitTag(busy: boolean): string {
  const html = renderToStaticMarkup(
    <SingularityDuelSealConfirm
      duel={DUEL}
      viewerCharacterId={1}
      taskPointValue={60}
      onConfirm={() => {}}
      onCancel={() => {}}
      busy={busy}
      mode="submit"
    />,
  )
  const at = html.indexOf('data-testid="duel-seal-confirm"')
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
}

describe('the Singularity duel commit does not take the house neutral (#3011, review of #3068)', () => {
  it('wears .sg-control-off alongside .control-off, only while busy', () => {
    const live = singularityCommitTag(false)
    const busy = singularityCommitTag(true)
    expect(paintedOff(live), 'not painted off before submitting').toBe(false)
    expect(paintedOff(busy), 'painted off while busy').toBe(true)
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
    // Singularity terminal's own case.
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

/* -------------------------------------------------------------------------- */
/* The hover reopen (review of #3068)                                         */
/* -------------------------------------------------------------------------- */

describe('the hover arm does not reopen the fade `.control-off:disabled` just closed', () => {
  it('.btn-primary:hover is guarded by :not(:disabled)', () => {
    // `.btn-primary:hover { opacity: 0.85 }` carried no such guard — hovering
    // a BUSY `.control-off` commit re-composited the fill the class had just
    // replaced, the exact defect #2486 removed, reopened through the hover
    // arm rather than the busy spelling. Source text, not computed style: no
    // DOM here to actually hover.
    const css = readIndexCss()
    const rule = /\.btn-primary:hover(:not\(:disabled\))?\s*\{/.exec(css)
    expect(rule, '.btn-primary:hover exists').not.toBeNull()
    expect(rule![1], '.btn-primary:hover is guarded by :not(:disabled)').toBe(':not(:disabled)')
  })
})
