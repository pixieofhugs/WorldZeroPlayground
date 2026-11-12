/**
 * Praxis detail: the opponent's faction hue is never an ink and never a ground
 * (#1308; STYLE §"On the lists"). Each archetype fills `DuelCardInk` itself, so
 * this walks the registry with a foreign rival. A pairing no contrast test sees.
 *
 * Unlike the seal guard (#1115) there is no `aria-hidden` carve-out: `plate`
 * renders on an `aria-hidden` span and is exactly the likely leak.
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

/** Three distinct hues; the rule is that the hue is arbitrary. */
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
 * A `settled` duel (prints every string). This side wears the host's slug, so
 * the only foreign hue is the rival's; no avatars, so `plate` draws.
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
    win_multiplier: 1,
    loss_multiplier: 1,
    tie_multiplier: 1,
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

const ARCHETYPES = { ...surfaceMap('praxisDetail'), __default__: DefaultPraxisDetail }

/** Hue, card accent and soft tint (#310); the closing paren keeps them apart. */
function foreignTokens(slug: string): string[] {
  return [factionCssVar(slug), factionCssVar(slug, 'card-accent'), factionCssVar(slug, 'light')]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('praxis detail: the opponent colour is never an ink and never a ground', () => {
  const cases = Object.entries(ARCHETYPES).flatMap(([slug, Archetype]) =>
    OPPONENTS
      // A same-faction rival is not a foreign hue.
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

    // Non-vacuity: the card is really on the page.
    expect(text, `the ${_slug} page drew no duel card at all`).toContain('Rax')
    expect(text, "this side's total").toContain('Ada18')
    expect(text, "the rival's total").toContain('15.4')

    // Anchored so `border-color:`/`background-color:` don't match.
    const asInk = new RegExp(`(?:^|[;"{])color:\\s*${foreign}`)
    expect(
      asInk.test(html),
      `the ${opponent} hue is painted as an ink on the ${_slug} praxis detail`,
    ).toBe(false)

    // Any tag, no `aria-hidden` carve-out (see header).
    const asGround = new RegExp(`(?:^|[;"{])background(?:-color|-image)?:[^;"]*${foreign}`)
    const grounds = (html.match(/<[a-z]+[^>]*>/g) ?? []).filter((tag) => asGround.test(tag))
    expect(
      grounds,
      `the ${opponent} hue is a ground on the ${_slug} praxis detail`,
    ).toEqual([])
  })
})
