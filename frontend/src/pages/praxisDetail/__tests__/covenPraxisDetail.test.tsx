/**
 * Cozy Coven praxis detail — the skin's own contract (#1117, epic #1085).
 *
 * `archetypeSlots.test.tsx` walks the registry and guards the slots EVERY
 * archetype must emit, and it picks this page up automatically the moment the
 * manifest line lands. This file guards what is specific to the Coven skin:
 *
 *  - the layout contract it inherits from the eight faction designs (#1129) —
 *    the 330px aside track, the responsive move of the score/duel rail, and the
 *    crown at BOTH form factors;
 *  - that the page carries NO copy of its own (ADR-0061): every heading is the
 *    shared neutral word, including the ones the design named. The voiced block
 *    this skin briefly shipped was withdrawn with the amendment that allowed it;
 *    the Coven vocabulary lives on #1117, recorded and unbuilt.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md), so
 * `useFormFactor` is MOCKED rather than driven off `matchMedia`. Light vs dark
 * is a pure `[data-theme]` cascade with no branch in the component, and the
 * candle/haze/wheel motions live in index.css behind
 * `prefers-reduced-motion` — neither is assertable here; both are eyeball checks.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import type { CurrentUser } from '../../../api/auth'
import { aMember, aPraxis, aTask } from '../../../test/fixtures'
import { aPraxisDetailState } from '../../../test/praxisDetail'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'desktop' | 'mobile' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// `useTheme` throws outside its provider by design (#701), and the page mounts
// `CovenVote`, which reads it to pick its motif — sun by day, moon by night
// (#2020). Dark is what an unconfigured visitor gets (`DEFAULT_THEME`), so this
// keeps the page under test exactly as it renders today; the motif fork itself
// belongs to `components/vote/__tests__/covenVote.test.tsx`.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark' as const, toggle: () => {} }),
}))

// Imported after the mock so the archetype picks it up.
const { default: CovenPraxisDetail } = await import('../archetypes/CovenPraxisDetail')

const MEMBER = aMember({
  character_id: 3,
  character_display_name: 'Ada',
})

const CO_MEMBER = aMember({
  id: 102,
  character_id: 4,
  character_display_name: 'Beth',
  joined_at: '2026-01-02T00:00:00Z',
})

const PRAXIS = aPraxis({
  task_faction_slug: 'coven',
  created_by_id: 3,
  created_by_display_name: 'Ada',
  created_by_faction_slug: 'coven',
  members: [MEMBER],
})

const MINE: DuelSideOut = {
  praxis_id: 1,
  character_id: 3,
  display_name: 'Ada',
  faction_slug: 'coven',
  avatar_url: '',
  points_from_votes: 18,
  is_submitted: true,
  nudged_at: null,
}

const RIVAL: DuelSideOut = {
  praxis_id: 2,
  character_id: 4,
  display_name: 'Rax',
  faction_slug: 'snide',
  avatar_url: '',
  points_from_votes: 15.4,
  is_submitted: true,
  nudged_at: null,
}

function duel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status: 'settled',
    forfeited_by_character_id: null,
    challenger: MINE,
    opponent: RIVAL,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    ...overrides,
  }
}

const SEAL_METATASK = aTask({
  id: 501,
  title: 'Composting',
  point_value: 60,
  level_required: 0,
  task_type: 'metatask',
  created_by: 9,
  metatask_faction_slug: 'coven',
  created_by_display_name: '',
  can_sign_up: false,
  allowed_modes: [],
  eligible_for_current_user: false,
})

const VIEWER: CurrentUser = {
  id: 50,
  email: 'ada@example.com',
  display_name: 'Ada',
  is_admin: false,
  can_comment: true,
  character: {
    id: 3,
    display_name: 'Ada',
    faction_slug: 'coven',
    level: 4,
    points: 120,
    avatar_url: null,
  },
} as unknown as CurrentUser

function state(overrides: Partial<PraxisDetailState> = {}): PraxisDetailState {
  return aPraxisDetailState({
    praxis: PRAXIS,
    voters: [
      { character_id: 11, display_name: 'Cy', avatar_url: '', faction_slug: '', value: 5 },
      { character_id: 12, display_name: 'Dov', avatar_url: '', faction_slug: '', value: 3 },
    ],
    ...overrides,
  })
}

function render(
  next: PraxisDetailState,
  formFactor: 'desktop' | 'mobile' = 'desktop',
): { html: string; text: string } {
  mocks.formFactor = formFactor
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <CovenPraxisDetail state={next} />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** Where a marker sits in the markup — the seam the responsive move is about. */
function indexOf(html: string, needle: string): number {
  const at = html.indexOf(needle)
  expect(at, `marker missing: ${needle}`).toBeGreaterThan(-1)
  return at
}

/** Every opening `<a>` tag in the markup, attributes and all. */
function anchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0])
}

/**
 * The page WITHOUT the site's shared breadcrumb (#2102).
 *
 * The trail is neutral chrome that sits above this column on the SITE's ground,
 * not on the ward page, so its links deliberately set no ink of their own and
 * the ward-page ink guard below must not judge them. Everything after the
 * breadcrumb's `</nav>` is the skin's.
 */
function sheetOf(html: string): string {
  return html.slice(html.indexOf('</nav>') + 1)
}

/** The inline `color:` custom property on one opening tag, if it sets one. */
function inkOf(tag: string): string | null {
  const found = /(?:^|[;"])color:(var\(--[^)]+\))/.exec(tag)
  return found === null ? null : found[1]
}

/**
 * The three Coven inks measured against `--faction-coven-ward-page` in
 * `utils/__tests__/factionContrast.test.ts`. `slip-deep` is deliberately NOT
 * among them: it is a rule/strand/large-numeral pigment that clears on the
 * ward CARD (4.70:1) and misses on the ward PAGE (4.44:1 flat, 3.47:1 under
 * the peak of the pink haze bloom) — see the ink-tier note in
 * `components/factionMarks/covenSlip.tsx`.
 */
const WARD_PAGE_INKS = [
  'var(--faction-coven-slip-ink)',
  'var(--faction-coven-slip-soft)',
  'var(--faction-coven-slip-label)',
]

describe('Coven praxis detail — the shared layout contract', () => {
  it('draws no navigation of its own, at either width (#2102)', () => {
    // It used to draw a bespoke trail on desktop and swap it for a `‹ Praxis`
    // back link on mobile. Both are gone: the breadcrumb is neutral site chrome
    // now, drawn once by `components/nav/Breadcrumb` above this column, and what
    // it contains is pinned in `pages/__tests__/breadcrumbAcrossSurfaces`. The
    // assertion here is the NEGATIVE — the skin adds nothing beside it.
    for (const factor of ['desktop', 'mobile'] as const) {
      const { html } = render(state(), factor)
      expect(sheetOf(html), `${factor}: no crumb inside the slip`).not.toContain('href="/tasks"')
      expect(html, `${factor}: no phone back bar`).not.toContain('href="/praxis"')
    }
  })

  it('paints every navigation link in an ink measured for the ward PAGE (#1295)', () => {
    // The seam this guards is the PAIRING, not the token: `slip-deep` is a
    // correct pigment everywhere it sits on the ward CARD, and the token test
    // measures declared values, so neither guard can see an ink laid on the one
    // ground it does not clear. The breadcrumb, the phone back link and the
    // task reference all sit directly on the wash — nothing here may reach for
    // an ink the ward page has not been measured against.
    //
    // The breadcrumb and the back link left with #2102; the task reference is
    // what is still the skin's, and `sheetOf` is why the shared trail above the
    // column is not dragged into a faction reading it is not measured for.
    for (const factor of ['desktop', 'mobile'] as const) {
      const html = sheetOf(render(state(), factor).html)
      const onTheWash = anchors(html).filter((tag) => /href="\/(tasks|praxis)/.test(tag))
      expect(onTheWash.length, `${factor}: found the ward-page links`).toBeGreaterThan(0)
      for (const tag of onTheWash) {
        const ink = inkOf(tag)
        expect(ink, `${factor}: this link sets no ink of its own — ${tag}`).not.toBeNull()
        expect(WARD_PAGE_INKS, `${factor}: ${tag}`).toContain(ink)
      }
    }
  })

  it('gives the desktop aside the eight designs 330px track, and none on mobile', () => {
    expect(render(state()).html, 'the aside track').toContain('0 0 330px')
    expect(render(state(), 'mobile').html, 'mobile stacks in flow').not.toContain('0 0 330px')
    expect(render(state()).html, 'the Unaffiliated outlier width is not copied').not.toContain(
      '340px',
    )
  })

  it('moves the score block above the proof on mobile and into the aside on desktop', () => {
    const wide = render(state())
    expect(wide.text.match(/Score/g)?.length, 'one score block on desktop').toBe(1)
    expect(indexOf(wide.html, 'Proof'), 'proof precedes the aside rail').toBeLessThan(
      indexOf(wide.html, 'Score'),
    )

    const phone = render(state(), 'mobile')
    expect(phone.text.match(/Score/g)?.length, 'one score block on mobile').toBe(1)
    expect(indexOf(phone.html, 'Score'), 'rail rides above the proof on mobile').toBeLessThan(
      indexOf(phone.html, 'Proof'),
    )
  })

  it('shows the crown at BOTH form factors on a crowned praxis', () => {
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t('feed:taskCrown.title')}"`
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } })
    expect(render(crowned, 'desktop').html, 'crown on desktop').toContain(crown)
    expect(render(crowned, 'mobile').html, 'crown on mobile too').toContain(crown)
    expect(render(state(), 'mobile').html, 'and only when crowned').not.toContain(crown)
  })

  it('carries the SLIP on the column, never the viewport', () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page — nothing here may go full-bleed.
    //
    // THE GROUND CHANGED (#2135). The column wore `.coven-candle-backdrop`, the
    // near-black ward wash with four drifting blooms, and now wears the same
    // four-stop sheet the task card and the praxis card do. The negative half is
    // the load-bearing one: the class is still LIVE (`CovenFieldDesk` mounts it),
    // so a revert here compiles, renders, and is invisible to a dead-code sweep.
    const { html } = render(state())
    expect(html, 'the slip sheet').toContain('--faction-coven-slip-from')
    expect(html, 'the lavender end of the same ramp').toContain('--faction-coven-slip-vio')
    expect(html, 'the ward wash is gone from this column').not.toContain('coven-candle-backdrop')
    expect(html, 'no full-viewport layer').not.toContain('position:fixed')
  })

  it('mounts the metatask seals read-only', () => {
    const sealed = state({ praxis: { ...PRAXIS, applied_metatasks: [SEAL_METATASK] } })
    const { text } = render(sealed)
    expect(text, 'the seal renders').toContain('Composting')
    // `apply_metatask` requires `in_progress`, so an add chip would 422 (#1093).
    expect(text, 'no add slot on a published praxis').not.toContain('Add a metatask')
  })
})

describe('Coven praxis detail — copy is neutral, dress is Coven', () => {
  it('reads the shared neutral words in every content slot', () => {
    const collab = state({
      praxis: {
        ...PRAXIS,
        type: 'collab',
        members: [MEMBER, CO_MEMBER],
        applied_metatasks: [SEAL_METATASK],
      },
      duel: duel(),
    })
    const { text } = render(collab)
    for (const neutral of ['Proof', 'Write-up', 'Members', 'Metatasks', 'The duel', 'Discussion']) {
      expect(text, `the shared word for ${neutral}`).toContain(neutral)
    }

    // …and none of the words the design asked for. Each of these shipped in
    // `detail.coven.*` for a day (#1152) and was withdrawn with the amendment.
    for (const voiced of [
      'What it looked like',
      'Cast together by',
      'Charms added',
      'A friendly duel',
    ]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced)
    }
  })

  it('leaves moderation and system chrome in the shared neutral words', () => {
    // These were neutral under the withdrawn amendment too — the platform's own
    // words never took the costume on any skin.
    const flagged = state({ praxis: { ...PRAXIS, moderation_status: 'flagged' } })
    expect(render(flagged).text, 'the flagged banner').toContain('FLAGGED')

    const failed = state({
      praxis: {
        ...PRAXIS,
        moderation_status: 'failed',
        admin_note: 'The photo is of a different ridge.',
      },
    })
    expect(render(failed).text, 'the admin note is the banner body').toContain(
      'The photo is of a different ridge.',
    )

    const steward = state({ showAdminBar: true })
    expect(render(steward).text, 'the steward bar').toContain('ADMIN')
  })

  it('leaves the report card outside the costume', () => {
    // `PraxisFlagBlock` is mounted BARE — it wears `.sidebar-card` and neutral
    // `--color-*` tokens while every panel beside it wears the ward's dress.
    const { html, text } = render(state())
    expect(text, 'neutral copy').toContain('Flag this praxis')
    expect(html, 'neutral card chrome').toContain('sidebar-card')
  })

  it('mounts the comment thread with the layout heading, not the threads own', () => {
    const { text } = render(state())
    expect(text, 'one heading for one list (#1029)').not.toContain('0 comments')
  })

  it('hides the comment region on a praxis that is not visible', () => {
    const hidden = state({ praxis: { ...PRAXIS, moderation_status: 'hidden' } })
    expect(render(hidden).text).not.toContain('Discussion')
  })
})

describe('Coven praxis detail — the state axes', () => {
  it('renders the score readout from the shared resolver', () => {
    const { text } = render(state())
    expect(text, 'base').toContain('12')
    expect(text, 'points from votes').toContain('4')
    expect(text, 'total').toContain('16')
  })

  it('credits every co-author and reaches each one', () => {
    const solo = render(state())
    expect(solo.html, 'solo links one author').toContain('href="/characters/3"')
    expect(solo.text, 'and draws no members section').not.toContain('Members')

    const collab = state({
      praxis: { ...PRAXIS, type: 'collab', members: [MEMBER, CO_MEMBER] },
    })
    const { html, text } = render(collab)
    expect(html, 'each co-author is reachable').toContain('href="/characters/4"')
    expect(text).toContain('Beth')
    expect(text, 'the crew reads as Members, the domain noun').toContain('Members')
  })

  it('shows owner controls to a member and nothing to a visitor', () => {
    // #1397: the cluster is anchored on the UNSUBMIT control now. On a
    // submitted solo `/edit` redirects straight back to this page, so the edit
    // link is hidden and unsubmitting is the way into the composer.
    expect(render(state()).text, 'a visitor gets no owner controls').not.toContain(
      'unsubmit',
    )
    const owner = state({ isOwner: true, user: VIEWER })
    expect(render(owner).text).toContain('unsubmit')
    expect(render(owner).html, 'and nothing that round-trips').not.toContain(
      'href="/praxis/1/edit"',
    )
  })

  it('lists who voted and each voters own rung, never an average', () => {
    const { html, text } = render(state())
    expect(text).toContain('Who voted')
    expect(html).toContain('href="/characters/11"')
    expect(text, 'the count, not the mean').toContain('2 votes')

    expect(render(state({ voters: [] })).text, 'no empty voter panel').not.toContain('Who voted')
  })

  it('draws the duel card only on an outcome, at both form factors', () => {
    // The three readings belong to `DuelCard` (#1090) and are guarded in
    // `duelCard.test.tsx`; this asserts the MOUNT — that the skin hands the card
    // its panel and heading, and that a declined challenge draws nothing.
    const live = state({ duel: duel(), praxis: { ...PRAXIS, type: 'duel', duel_id: 5 } })
    expect(render(live).text, 'the live reading, in the aside').toContain('leads by')
    expect(render(live, 'mobile').text, 'and above the proof on the phone').toContain('leads by')

    const declined = state({
      duel: duel({ status: 'declined' }),
      praxis: { ...PRAXIS, type: 'duel', duel_id: 5 },
    })
    expect(render(declined).text, 'a declined challenge draws no card').not.toContain(
      'The duel',
    )
    expect(render(state()).text, 'and a solo praxis has none either').not.toContain(
      'The duel',
    )
  })
})
