/**
 * WOW seal: the opponent's colour is never an ink and never a text ground (#1115,
 * WORLD_ZERO_STYLE §3). It can be any hue, so it is held only as the `Rosette`
 * ring. `factionContrast.test.ts` measures token values and cannot see this
 * pairing, so nothing else in the repo would catch a string in the foe's colour.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import { factionCssVar } from '../../../utils/factions'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

// Static render always takes the 'desktop' snapshot; mock to reach phone.
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

/**
 * The stakes come off the viewer's `DuelSideOut` multipliers (`duelStakes`), not
 * this config; the opponent reaches this test only as a set of tokens.
 */
const CONFIG = {
  factions: [
    {
      slug: 'wow',
      own_task_modifier: 1.0,
      other_task_modifier: 1.0,
      collab_own_modifier: 1.0,
      collab_other_modifier: 1.0,
      duel_win_modifier: 1.5,
      duel_loss_modifier: 0.5,
    } as FactionConfigOut,
  ],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

// Loaded after the mocks.
const { default: WowDuelSealConfirm } = await import('../WowDuelSealConfirm')

function side(overrides: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    praxis_id: 10,
    display_name: 'Sir Reginald',
    faction_slug: 'wow',
    avatar_url: null,
    is_submitted: false,
    points_from_votes: 0,
    ...overrides,
  } as DuelSideOut
}

/** `submit` also renders the reopen note; `forfeit` needs `settled` (`praxis.py`). */
function duelFor(mode: 'submit' | 'forfeit', foeSlug: string): DuelDetailOut {
  const cast = mode === 'forfeit'
  return {
    id: 5,
    status: cast ? 'settled' : 'active',
    forfeited_by_character_id: null,
    challenger: side({ character_id: 1, is_submitted: cast }),
    opponent: side({
      character_id: 2,
      praxis_id: 11,
      display_name: 'Cn. Vale',
      faction_slug: foeSlug,
      is_submitted: cast,
    }),
  } as unknown as DuelDetailOut
}

const OPPONENTS = ['snide', 'singularity', 'everymen'] as const

const FORM_FACTORS = ['desktop', 'mobile'] as const

const MODES = ['submit', 'forfeit'] as const

describe('WOW seal: the opponent colour is a ring, never an ink and never a text ground', () => {
  const cases = FORM_FACTORS.flatMap((surface) =>
    OPPONENTS.flatMap((slug) => MODES.map((mode) => [surface, slug, mode] as const)),
  )

  it.each(cases)('%s seal, %s opponent, %s mode', (_surface, slug, mode) => {
    mocks.formFactor = _surface
    const Skin = WowDuelSealConfirm
    const accent = factionCssVar(slug, 'card-accent')
    const soft = factionCssVar(slug, 'light')

    const html = renderToStaticMarkup(
      <Skin
        duel={duelFor(mode, slug)}
        viewerCharacterId={1}
        taskPointValue={60}
        onConfirm={() => {}}
        onCancel={() => {}}
        mode={mode}
      />,
    )

    // Anchored so `border-color:` / `background-color:` can't match.
    const asInk = new RegExp(`(?:^|[;"{])color:\\s*${escapeRegExp(accent)}`)
    expect(
      asInk.test(html),
      `the ${slug} accent is painted as an ink on WOW's ${_surface} seal`,
    ).toBe(false)

    // A ground only on `aria-hidden` ornament (the rosette).
    for (const tag of html.match(/<[a-z]+[^>]*>/g) ?? []) {
      if (!tag.includes(soft) && !tag.includes(`background:${accent}`)) continue
      expect(tag, `a ${slug}-coloured ground on WOW's ${_surface} seal carries text`).toContain(
        'aria-hidden',
      )
    }

    // The ring is still drawn, so dropping the accent can't pass.
    expect(html).toContain(`2px solid ${accent}`)
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
