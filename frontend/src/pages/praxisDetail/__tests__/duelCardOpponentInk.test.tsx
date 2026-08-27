/**
 * PRAXIS DETAIL: THE OPPONENT'S COLOUR IS NEVER AN INK AND NEVER A GROUND (#1308).
 *
 * The other half of #1115. That issue recovered the retired duel rail's guard
 * (#895, killed with the rail in #1090) and re-aimed it at the seal skins
 * (`components/duel/wowLists.tsx` + the two `Wow*DuelSealConfirm` frames). It
 * could not reach the second surface the rail's death left unguarded, and
 * `DuelCardInk`'s docstring said so in as many words: "the structural guard that
 * used to assert this died with the duel rail … so this comment is the whole of
 * it". This file is the rest of it.
 *
 * THE RULE (WORLD_ZERO_STYLE §"On the lists"). The opponent's faction colour
 * arrives as `accent`/`soft` (#310) and can be ANY hue in the palette —
 * S.N.I.D.E.'s acid green, Singularity's petrol blue, Everymen's red. It is
 * therefore held as a **rosette ring, a plate edge and a bar — never as an ink
 * and never behind text**, which is what lets a hostile hue sit inside another
 * faction's chrome with no contrast fix anywhere.
 *
 * WHY THIS FILE AND NOT #1115's. On the seal the component derives the foreign
 * tokens itself and hands them to one consumer, so rendering the component is
 * the whole test. Here the violation is one level UP: `DuelCard` takes its paint
 * from a `DuelCardInk` the ARCHETYPE fills in, and every archetype fills it in
 * separately. So this walks the real `surfaceMap('praxisDetail')` registry with a
 * foreign rival in the duel, exactly as `archetypeSlots.test.tsx` walks it for
 * content slots — a faction that registers tomorrow is guarded with no edit here.
 *
 * WHY NO OTHER GATE SEES IT. `factionContrast.test.ts` measures token VALUES.
 * This is a PAIRING — which token got painted behind, or as, which string — and
 * no contrast row can express it. An archetype that tinted the rival's name with
 * the rival's own hue would pass every other gate in the repo.
 *
 * WHERE THIS DEVIATES FROM #1115. The seal's ground scan exempts `aria-hidden`
 * ornament, because the rosette's field genuinely IS drawn in `soft` and holds no
 * text. This card draws no ornament in the foreign hue at all, so there is
 * nothing to exempt — and the one slot that would have slipped through such an
 * exemption is `plate`, the fill behind a duellist's disc, which `DuelCardInk`
 * names as illegal and which renders on an `aria-hidden` span. Keeping the
 * carve-out would have licensed the single most likely way this rule breaks
 * here, so the scan covers every tag.
 *
 * Rendered with `renderToStaticMarkup` — no DOM in this harness (SPEC-testing.md)
 * — so the assertions read the serialized inline styles the archetype emitted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { surfaceMap } from '../../../factions'
import { factionCssVar } from '../../../utils/factions'
import DefaultPraxisDetail from '../archetypes/DefaultPraxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import { aPraxis } from '../../../test/fixtures'
import { aPraxisDetailState } from '../../../test/praxisDetail'

/**
 * Three genuinely different opponents — the same three the retired rail guard
 * and #1115 used: S.N.I.D.E.'s acid green, Singularity's petrol blue, Everymen's
 * red. The point of the rule is that the hue is arbitrary, so one opponent would
 * prove nothing.
 */
const OPPONENTS = ['snide', 'singularity', 'everymen'] as const

const PRAXIS = aPraxis({
  task_title: 'A Chore Nobody Logged',
  type: 'duel',
  created_by_id: 3,
  created_by_display_name: 'Ada',
  members: [],
  media_items: [],
  score: 30,
  points_from_votes: 18,
  duel_id: 5,
})

/**
 * A live (`settled`) duel — the reading that prints both names, both totals and
 * the cross-link, so the card carries its full complement of strings.
 *
 * This side wears the HOST archetype's own slug, so the only foreign hue in the
 * whole fixture is the rival's and any hit is unambiguous. Neither side has an
 * avatar, which is the state that draws `plate`.
 */
function duelAgainst(hostSlug: string, rivalSlug: string): DuelDetailOut {
  const side = (overrides: Partial<DuelSideOut>): DuelSideOut => ({
    praxis_id: 1,
    character_id: 3,
    display_name: 'Ada',
    faction_slug: hostSlug,
    avatar_url: '',
    points_from_votes: 18,
    is_submitted: true,
    nudged_at: null,
    ...overrides,
  })
  return {
    id: 5,
    task_id: 7,
    status: 'settled',
    forfeited_by_character_id: null,
    challenger: side({}),
    opponent: side({
      praxis_id: 2,
      character_id: 4,
      display_name: 'Rax',
      faction_slug: rivalSlug,
      points_from_votes: 15.4,
    }),
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  } as unknown as DuelDetailOut
}

function state(duel: DuelDetailOut): PraxisDetailState {
  return aPraxisDetailState({
    praxis: PRAXIS,
    duel,
  })
}

// The Default fallback is a registered renderable too — guard it beside the map,
// the shape `archetypeSlots.test.tsx` established.
const ARCHETYPES = { ...surfaceMap('praxisDetail'), __default__: DefaultPraxisDetail }

/**
 * Every token that carries the opponent's identity: the hue itself, the card
 * `accent` and the `soft` tint (#310). `var(--faction-snide)` is not a substring
 * of `var(--faction-snide-card-accent)` — the closing paren keeps the three
 * apart — so each is matched exactly.
 */
function foreignTokens(slug: string): string[] {
  return [factionCssVar(slug), factionCssVar(slug, 'card-accent'), factionCssVar(slug, 'light')]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('praxis detail: the opponent colour is never an ink and never a ground', () => {
  const cases = Object.entries(ARCHETYPES).flatMap(([slug, Archetype]) =>
    OPPONENTS
      // A rival of the HOST's own faction is not a foreign hue — the page is
      // already painted in it, so the tokens would collide by design rather than
      // by mistake. The rule is about a colour from elsewhere.
      .filter((opponent) => opponent !== slug)
      .map((opponent) => [slug, opponent, Archetype] as const),
  )

  it.each(cases)('%s detail, %s rival', (_slug, opponent, Archetype) => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={state(duelAgainst(_slug, opponent))} />
      </MemoryRouter>,
    )
    const text = html.replace(/<[^>]*>/g, '')
    const foreign = `(?:${foreignTokens(opponent).map(escapeRegExp).join('|')})`

    // COUNTERWEIGHT, and the reason "the token appears nowhere" is not a test
    // that passes on an empty string: the card is genuinely on the page, with
    // the rival named and both totals printed.
    expect(text, `the ${_slug} page drew no duel card at all`).toContain('Rax')
    expect(text, "this side's total").toContain('Ada18')
    expect(text, "the rival's total").toContain('15.4')

    // `color:` may never name the opponent's hue — not on a name, not on a
    // total, not on the verdict line. Anchored so `border-color:` /
    // `background-color:` can't satisfy the match by accident.
    const asInk = new RegExp(`(?:^|[;"{])color:\\s*${foreign}`)
    expect(
      asInk.test(html),
      `the ${opponent} hue is painted as an ink on the ${_slug} praxis detail`,
    ).toBe(false)

    // ...and it may never be a GROUND either, on any tag. See the header for why
    // this scan carries no `aria-hidden` carve-out where the seal's does.
    const asGround = new RegExp(`(?:^|[;"{])background(?:-color|-image)?:[^;"]*${foreign}`)
    const grounds = (html.match(/<[a-z]+[^>]*>/g) ?? []).filter((tag) => asGround.test(tag))
    expect(
      grounds,
      `the ${opponent} hue is a ground on the ${_slug} praxis detail`,
    ).toEqual([])
  })
})
