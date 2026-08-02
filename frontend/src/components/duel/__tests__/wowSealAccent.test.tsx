/**
 * WOW: THE OPPONENT'S COLOUR IS NEVER AN INK AND NEVER A TEXT GROUND (#1115).
 *
 * This is the second half of the retired `wowDuelRail.test.tsx` (#895), recovered
 * and re-aimed. That file asserted the rule structurally against three real
 * accents; #1090 retired the duel rail and the test went with it, correctly — but
 * the RULE did not go away with the surface. It moved to the seal skins
 * (`components/duel/wowLists.tsx` + the `WowDuelSealConfirm` frame), which
 * is mounted by the composer and by `PraxisSubmitControls`. It was TWO frames
 * until #1313 collapsed the seal to one responsive component per faction; the
 * rule is asserted at both form factors instead of against two files, because
 * the phone shell paints the same ground and holds the same rosette.
 *
 * THE RULE (WORLD_ZERO_STYLE §3, "On the lists"). `accent`/`soft` are the
 * OPPONENT's faction tokens (#310) and can be ANY hue in the palette —
 * S.N.I.D.E.'s acid green, Singularity's petrol blue, Everymen's red. Inside
 * WOW's cream-and-gold chrome most of those are illegible as a text ground and
 * several are illegible as an ink. The kit's answer, and the load-bearing
 * decision of the whole skin: hold the foreign colour as a RING, a PLATE EDGE and
 * a BAR — never as an ink, never behind text. On the seal that shape is
 * `Rosette`, and nothing else.
 *
 * WHY IT IS ASSERTED HERE RATHER THAN IN `factionContrast.test.ts`. That sweep
 * measures token VALUES; this is a PAIRING — which token got painted behind which
 * string. No contrast row can see it, which is why no `ARCHETYPE_PAIRS` row
 * measures the opponent accent: there is no text pair to measure. An edit that
 * put a string in the opponent's colour would pass every other gate in the repo.
 *
 * `duelSkinSlots.test.tsx` sits beside this and covers a different claim: that
 * every seal skin renders every SLOT, against a foreign-faction opponent. It does
 * not look at what colour anything is. The two do not overlap.
 *
 * Rendered with `renderToStaticMarkup` — no DOM in this harness — so the
 * assertions read the serialized inline styles the skin emitted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import { factionCssVar } from '../../../utils/factions'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

// The seal is one component at two widths (#1313); the phone branch is
// unreachable in this harness without the mock — `renderToStaticMarkup` always
// takes `useSyncExternalStore`'s server snapshot, which is 'desktop'.
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

/**
 * Only the VIEWER's faction is looked up (`useDuelStakes` reads the modifier that
 * applies to you), so one row is the whole fixture — the opponent reaches the
 * arithmetic as a slug, and reaches this test as a set of tokens.
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

// Loaded after the mocks, the pattern `duelSkinSlots.test.tsx` established.
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

/**
 * The duel each mode actually opens in. `submit` is a live duel whose foe has not
 * cast — the state that also renders the free-reopen note, so the surface under
 * test carries its full complement of strings. `forfeit` only exists once the
 * duel is `settled` with both sides in (`praxis.py`), and it repaints the body in
 * WOW's notice ink, so it is a genuinely different paint pass over the same rule.
 */
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

/**
 * Three genuinely different opponents, the same three the rail guard used:
 * S.N.I.D.E.'s acid green, Singularity's petrol blue and Everymen's red. The seal
 * must not care which — none of them is ever painted as an ink or laid behind a
 * string.
 */
const OPPONENTS = ['snide', 'singularity', 'everymen'] as const

/** One component, two shells — the rule must hold in both (#1313). */
const FORM_FACTORS = ['desktop', 'mobile'] as const

const MODES = ['submit', 'forfeit'] as const

describe('WOW seal: the opponent colour is a ring, never an ink and never a text ground', () => {
  const cases = FORM_FACTORS.flatMap((surface) =>
    OPPONENTS.flatMap((slug) => MODES.map((mode) => [surface, slug, mode] as const)),
  )

  it.each(cases)('%s seal, %s opponent, %s mode', (_surface, slug, mode) => {
    mocks.formFactor = _surface
    const Skin = WowDuelSealConfirm
    // Resolved exactly as the skin resolves them, so this asserts WHERE the
    // opponent's tokens land, not which tokens they are.
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

    // `color:` must never name the opponent's hue — not on a heading, not on a
    // figure, not on the ribbon line. Anchored so `border-color:`/`background-
    // color:` can't satisfy the match by accident.
    const asInk = new RegExp(`(?:^|[;"{])color:\\s*${escapeRegExp(accent)}`)
    expect(
      asInk.test(html),
      `the ${slug} accent is painted as an ink on WOW's ${_surface} seal`,
    ).toBe(false)

    // ...and neither hue may be a GROUND, except on `aria-hidden` ornament: the
    // rosette's field is the one shape the design allows, and it holds no text.
    for (const tag of html.match(/<[a-z]+[^>]*>/g) ?? []) {
      if (!tag.includes(soft) && !tag.includes(`background:${accent}`)) continue
      expect(tag, `a ${slug}-coloured ground on WOW's ${_surface} seal carries text`).toContain(
        'aria-hidden',
      )
    }

    // The ring itself is still drawn — the accent has not simply been dropped,
    // which is the other way this guard could be "satisfied".
    expect(html).toContain(`2px solid ${accent}`)
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
