/**
 * The seam: `DuelSealConfirm`'s dispatch × `useFormFactor()` (#1313).
 *
 * Before this issue the seal was TWO dispatches out of one dispatcher — the
 * `formFactor === 'mobile'` branch picked through a `mobileDuelSeal` manifest
 * surface and the wide branch through `duelSeal`, so every faction shipped two
 * near-identical files whose only real difference was the positioning shell
 * (centred card + scrim vs. full-bleed sheet).
 *
 * After the collapse there is ONE responsive component per faction and ONE
 * surface. What this file pins is the surface a caller reaches, not the
 * internals of any skin:
 *
 *  - the `mobileDuelSeal` surface is gone from `SURFACE_KEYS`;
 *  - a phone reaches the SAME component the laptop does, per faction;
 *  - the eight sheets stay eight — no skin quietly falls through to Default on
 *    one form factor, which is the failure mode a shared chassis invites;
 *  - the chassis itself still switches: a scrim + a bounded card on a laptop,
 *    neither on a phone, and `role="dialog"` + `aria-modal` on both.
 *
 * `useFormFactor` is mocked because the harness has no DOM: `renderToStaticMarkup`
 * always takes `useSyncExternalStore`'s server snapshot, which is 'desktop', so
 * the phone branch is unreachable without the mock (the shape
 * `profileFormFactor.test.tsx` established for #1319).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../../i18n'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    // #1869: Singularity's perk flag. Irrelevant to the duel axis these
    // fixtures exercise, but part of the contract.
    reads_the_array: false,
  }
}

const CONFIG = {
  factions: [faction('wow', 1.5, 0.5), faction('snide', 2.0, 0.0)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

// Loaded after the mocks, the pattern `duelSkinSlots.test.tsx` established.
const { default: DuelSealConfirm, DefaultDuelSealConfirm } = await import('../DuelSealConfirm')
const { surfaceMap, SURFACE_KEYS } = await import('../../../factions')

function side(overrides: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    praxis_id: 10,
    display_name: 'Ada',
    faction_slug: 'wow',
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
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'wow' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Rax', faction_slug: 'snide' }),
} as unknown as DuelDetailOut

const PROPS = {
  duel: DUEL,
  viewerCharacterId: 1,
  taskPointValue: 60,
  onConfirm: () => {},
  onCancel: () => {},
} as const

function dispatch(slug: string | null): string {
  return renderToStaticMarkup(<DuelSealConfirm taskFactionSlug={slug} {...PROPS} />)
}

const SEAL_SLUGS = Object.keys(surfaceMap('duelSeal'))

/**
 * The registered SKINS — every row but `albescent`, and the exclusion is the
 * point rather than a carve-out.
 *
 * #2531 registered `duelSeal` for Albescent as a PASS-THROUGH: the row renders
 * `DefaultDuelSealConfirm` and is byte-identical to it, because this dialog is
 * the one na surface with no spectrum on it to re-cut, it is skinned by the
 * TASK's faction (so a non-member is looking at it), and its forfeit mode is the
 * one duel beat that cannot be undone. It exists so the manifest stops answering
 * "does Albescent dress this?" by silence.
 *
 * So the two assertions below that mean "no skin quietly fell through to the
 * Default" cannot include it — for Albescent, BEING the Default is the design,
 * and the assertion that holds it there is the byte-identity one further down,
 * which is strictly stronger than the distinctness these two ask of a skin.
 */
const SKIN_SLUGS = SEAL_SLUGS.filter((slug) => slug !== 'albescent')

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe('the duel seal is one responsive component per faction', () => {
  it('no longer advertises a mobileDuelSeal surface', () => {
    expect(SURFACE_KEYS).not.toContain('mobileDuelSeal')
  })

  it('registers a seal for every faction that had one', () => {
    // Seven skins, plus `albescent` — which is not an eighth skin but the
    // pass-through row #2531 added; see SKIN_SLUGS above.
    expect(SEAL_SLUGS.sort()).toEqual(
      ['coven', 'ephemerists', 'everymen', 'singularity', 'snide', 'ua', 'wow', 'albescent'].sort(),
    )
  })

  it.each(SEAL_SLUGS)('%s reaches its own registered skin on a phone', (slug) => {
    mocks.formFactor = 'mobile'
    const Skin = surfaceMap('duelSeal')[slug]
    expect(dispatch(slug)).toBe(renderToStaticMarkup(<Skin {...PROPS} />))
  })

  it.each(SKIN_SLUGS)('%s keeps its own dress on a phone, not the Default', (slug) => {
    mocks.formFactor = 'mobile'
    expect(dispatch(slug)).not.toBe(renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />))
  })

  // Eight sheets in, eight out — at BOTH widths. A chassis that swallowed a
  // faction's frame would collapse two of these into one and nothing else in
  // the suite would notice.
  it.each(['desktop', 'mobile'] as const)('renders eight distinct sheets on %s', (formFactor) => {
    mocks.formFactor = formFactor
    const sheets = [renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />), ...SKIN_SLUGS.map(dispatch)]
    expect(new Set(sheets).size).toBe(sheets.length)
  })

  /**
   * The ninth row, asserted from the other side (#2531). A pass-through is held
   * to EQUALITY where a skin is held to difference — "a pass-through that shifts
   * a pixel is a bug" — so an Albescent duel seal that ever grew a dress of its
   * own fails here rather than quietly appearing in front of a non-member.
   */
  it.each(['desktop', 'mobile'] as const)('albescent is the Default sheet on %s, by design', (formFactor) => {
    mocks.formFactor = formFactor
    expect(dispatch('albescent')).toBe(renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />))
  })

  // The unaffiliated seal is the Default one, on both form factors.
  it.each(['desktop', 'mobile'] as const)('leaves na on the Default sheet on %s', (formFactor) => {
    mocks.formFactor = formFactor
    expect(dispatch(null)).toBe(renderToStaticMarkup(<DefaultDuelSealConfirm {...PROPS} />))
  })
})

describe('the shared chassis switches, and nothing else does', () => {
  const EVERY_SLUG = [null, ...SEAL_SLUGS]

  it.each(EVERY_SLUG)('%s is a centred, bounded card on a laptop', (slug) => {
    const html = dispatch(slug)
    expect(html, 'the bounded card').toContain('max-w-[460px]')
    expect(html, 'the centring shell').toContain('items-center justify-center')
  })

  it.each(EVERY_SLUG)('%s is full-bleed on a phone — no card, no scrim', (slug) => {
    mocks.formFactor = 'mobile'
    const html = dispatch(slug)
    expect(html, 'the bounded card').not.toContain('max-w-[460px]')
    expect(html, 'the centring shell').not.toContain('items-center justify-center')
    expect(html, 'the desktop scrim').not.toContain('rgba(0,0,0,0.')
  })

  // The `ground` / `card` split, asserted rather than trusted: a skin that put
  // its radius or its drop shadow in `ground` would wear a floating card's
  // chrome at the viewport edge, which is the one thing the chassis exists to
  // decide. Only the ROOT is read — the panels INSIDE a sheet keep their own
  // radii at both widths, and always did.
  it.each(EVERY_SLUG)('%s wears no card chrome on a phone', (slug) => {
    mocks.formFactor = 'mobile'
    const root = dispatch(slug).slice(0, dispatch(slug).indexOf('>') + 1)
    expect(root, 'radius on the phone shell').not.toContain('border-radius')
    expect(root, 'drop shadow on the phone shell').not.toContain('box-shadow')
  })

  it.each(EVERY_SLUG)('%s keeps the dialog contract on both form factors', (slug) => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const html = dispatch(slug)
      expect(html, formFactor).toContain('role="dialog"')
      expect(html, formFactor).toContain('aria-modal="true"')
    }
  })
})
