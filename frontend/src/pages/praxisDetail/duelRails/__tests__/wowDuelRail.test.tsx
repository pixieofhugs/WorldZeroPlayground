/**
 * WOW duel rail guard (#895) — the two claims the kit's §17 makes about this
 * surface, pinned so a later edit cannot quietly drop either.
 *
 * 1. THE LEDGER. Each of the six faces the kit draws carries a `ledger`
 *    annotation naming exactly which of `body` / `tally` / `note` is populated.
 *    `DuelCrossLink` is what decides that, so these cases go through the real
 *    dispatcher on a WOW task and assert the SKIN drew a slot's chrome only
 *    where the ledger says the slot exists — a skin that reserved space for a
 *    null tally, or invented a roster for a declined duel, fails here.
 *
 * 2. THE OPPONENT'S COLOUR IS NEVER A TEXT GROUND. `accent`/`soft` are the
 *    opponent's tokens and can be any hue in the palette; the design's answer,
 *    and the load-bearing decision of the whole rail, is that gold chrome holds
 *    a foreign colour as a ring and a bar and never behind or as text. That is
 *    unmeasurable by `factionContrast.test.ts` (it is a *pairing*, not a value),
 *    so it is asserted structurally instead, against three real accents.
 *
 * Rendered with `renderToStaticMarkup` — no DOM in this harness — so the
 * assertions read the serialized inline styles the skin emitted.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../../i18n'

import DuelCrossLink from '../../DuelCrossLink'
import WowDuelRail from '../WowDuelRail'
import WowMobileDuelRail from '../WowMobileDuelRail'
import type { PraxisOut } from '../../../../api/praxis'
import type { DuelDetailOut, DuelSideOut } from '../../../../api/duel'

/* -------------------------------------------------------------------------- */
/* 1. The ledger                                                              */
/* -------------------------------------------------------------------------- */

const ME: DuelSideOut = {
  praxis_id: 10,
  character_id: 1,
  display_name: 'Sir Reginald',
  faction_slug: 'wow',
  avatar_url: '',
  points_from_votes: 340,
  is_submitted: true,
}
const FOE: DuelSideOut = {
  praxis_id: 20,
  character_id: 2,
  display_name: 'Cn. Vale',
  faction_slug: 'singularity',
  avatar_url: '',
  points_from_votes: 210,
  is_submitted: true,
}

/** A WOW task, so the dispatcher resolves the WOW skin rather than Default. */
const PRAXIS = { id: 10, task_faction_slug: 'wow', task_point_value: 120 } as PraxisOut

function duel(over: Partial<DuelDetailOut>): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status: 'settled',
    forfeited_by_character_id: null,
    challenger: ME,
    opponent: FOE,
    viewer_is_participant: true,
    ...over,
  } as DuelDetailOut
}

function render(d: DuelDetailOut): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DuelCrossLink praxis={PRAXIS} duel={d} />
    </MemoryRouter>,
  )
}

/** The barrier band — proof the WOW skin, not `DefaultDuelRail`, rendered. */
const BARRIER = 'repeating-linear-gradient(90deg, var(--faction-wow-duel-hold)'
/** The tally is the only thing boxed in champion gold. */
const TALLY_BOX = 'border:1.5px solid var(--faction-wow-duel-champion)'
/** The note is the only thing on the swaying ribbon mark. */
const NOTE_MARK = 'wow-duel-ribbon-sway'
/** The race plate is the only thing wearing an accent left edge. */
const BODY_PLATE = 'border-left:4px solid'

type Ledger = { body: boolean; tally: boolean; note: boolean }

const FACES: [string, DuelDetailOut, Ledger][] = [
  ['pending', duel({ status: 'pending' }), { body: true, tally: false, note: false }],
  ['declined', duel({ status: 'declined' }), { body: false, tally: false, note: false }],
  ['active', duel({ status: 'active' }), { body: true, tally: false, note: false }],
  ['settled', duel({ status: 'settled' }), { body: true, tally: true, note: true }],
  [
    'forfeited · won by default',
    duel({ status: 'settled', forfeited_by_character_id: FOE.character_id }),
    { body: false, tally: false, note: false },
  ],
  [
    'forfeited · thou withdrew',
    duel({ status: 'settled', forfeited_by_character_id: ME.character_id }),
    { body: false, tally: false, note: false },
  ],
]

describe('WOW duel rail: six faces, each populating exactly its ledger', () => {
  it.each(FACES)('%s', (_name, subject, ledger) => {
    const html = render(subject)

    // The WOW frame is present on every face — the barrier and the headline are
    // the two slots the ledger never withholds.
    expect(html).toContain(BARRIER)

    expect(html.includes(BODY_PLATE)).toBe(ledger.body)
    expect(html.includes(TALLY_BOX)).toBe(ledger.tally)
    expect(html.includes(NOTE_MARK)).toBe(ledger.note)
  })
})

/* -------------------------------------------------------------------------- */
/* 2. The opponent's colour                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Three genuinely different opponents: S.N.I.D.E.'s near-neutral, Singularity's
 * petrol blue and Everymen's red. The rail must not care which — none of them is
 * ever painted as an ink or laid behind a string.
 */
const ACCENTS = [
  ['snide', 'var(--faction-snide-card-accent)', 'var(--faction-snide-light)'],
  ['singularity', 'var(--faction-singularity-card-accent)', 'var(--faction-singularity-light)'],
  ['everymen', 'var(--faction-everymen-card-accent)', 'var(--faction-everymen-light)'],
] as const

const RAILS = [
  ['desktop', WowDuelRail],
  ['mobile', WowMobileDuelRail],
] as const

describe('WOW duel rail: the opponent colour is a ring and a bar, never a text ground', () => {
  const cases = RAILS.flatMap(([surface, Skin]) =>
    ACCENTS.map(([slug, accent, soft]) => [surface, slug, Skin, accent, soft] as const),
  )

  it.each(cases)('%s rail, %s opponent', (_surface, _slug, Skin, accent, soft) => {
    const html = renderToStaticMarkup(
      <Skin
        accent={accent}
        soft={soft}
        maxWidth="42rem"
        headline={<span>SLOT_HEADLINE</span>}
        tally={<span>SLOT_TALLY</span>}
        note={<span>SLOT_NOTE</span>}
        body={<span>SLOT_BODY</span>}
        actions={null}
      />,
    )

    // The sentinels carry no styling of their own, so every declaration in the
    // output is the skin's. `color:` must never name the opponent's hue...
    const asInk = new RegExp(`(?:^|[;"{])color:\\s*${escapeRegExp(accent)}`)
    expect(asInk.test(html)).toBe(false)

    // ...and neither must `background`, EXCEPT on `aria-hidden` ornament: the
    // rosette's field and the tally bar's opponent half are exactly the two
    // shapes the design does allow, and neither of them contains text.
    for (const tag of html.match(/<[a-z]+[^>]*>/g) ?? []) {
      if (!tag.includes(soft) && !tag.includes(`background:${accent}`)) continue
      expect(tag).toContain('aria-hidden')
    }

    // The ring itself is still drawn — the accent has not simply been dropped.
    expect(html).toContain(`2px solid ${accent}`)
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
