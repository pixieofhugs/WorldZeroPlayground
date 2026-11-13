/**
 * Coven praxis detail, the skin's own contract (#1117); shared slots are in
 * `archetypeSlots.test.tsx`. Covers the layout contract (#1129: 330px aside,
 * responsive score rail, crown at both widths) and neutral copy (ADR-0061).
 */
import { describe, it, expect, vi } from 'vitest'
import i18n from '../../../i18n'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { DuelDetailOut } from '../../../api/duel'
import { aCharacter, aCurrentUser, aDuel, aDuelSide, aMetatask, aPraxis } from '../../../test/fixtures'
import { CO_MEMBER, MEMBER, RIVAL, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from '../../../test/praxisDetail'


const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'desktop' | 'mobile' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// `useTheme` throws outside its provider (#701); `CovenVote` reads it (#2020).
// Dark is `DEFAULT_THEME`.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark' as const, toggle: () => {} }),
}))

const PRAXIS = aPraxis({

  task_faction_slug: 'coven',
  created_by_id: 3,
  created_by_display_name: 'Ada',
  created_by_faction_slug: 'coven',
  members: [MEMBER],
})

const duel = (overrides: Partial<DuelDetailOut> = {}): DuelDetailOut =>
  aDuel({
    challenger: aDuelSide({ faction_slug: 'coven', points_from_votes: 18 }),
    opponent: RIVAL,
    ...overrides,
  })


const SEAL_METATASK = aMetatask({ metatask_faction_slug: 'coven' })

const VIEWER = aCurrentUser({ character: aCharacter({ faction_slug: 'coven', level: 4 }) })

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides })

const render = skinRenderer('coven', mocks)


function anchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0])
}

/** The page after the shared breadcrumb (#2102), which sits on the site ground. */
function sheetOf(html: string): string {
  return html.slice(html.indexOf('</nav>') + 1)
}

function inkOf(tag: string): string | null {
  const found = /(?:^|[;"])color:(var\(--[^)]+\))/.exec(tag)
  return found === null ? null : found[1]
}

/**
 * Inks measured against `--faction-coven-ward-page` (factionContrast.test.ts).
 * Not `slip-deep`: it clears the ward CARD but misses the PAGE (4.44:1); see
 * `components/factionMarks/covenSlip.tsx`.
 */
const WARD_PAGE_INKS = [
  'var(--faction-coven-slip-ink)',
  'var(--faction-coven-slip-soft)',
  'var(--faction-coven-slip-label)',
]

describe('Coven praxis detail — the shared layout contract', () => {
  it('draws no navigation of its own, at either width (#2102)', () => {
    // The shared `Breadcrumb` is the only nav; see `breadcrumbAcrossSurfaces`.
    for (const factor of ['desktop', 'mobile'] as const) {
      const { html } = render(state(), factor)
      expect(sheetOf(html), `${factor}: no crumb inside the slip`).not.toContain('href="/tasks"')
      expect(html, `${factor}: no phone back bar`).not.toContain('href="/praxis"')
    }
  })

  it('paints every navigation link in an ink measured for the ward PAGE (#1295)', () => {
    // Guards the ink/ground PAIRING, which the token test can't see.
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
    const crown = `title="${i18n.t('feed:taskCrown.title')}"`
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } })
    expect(render(crowned, 'desktop').html, 'crown on desktop').toContain(crown)
    expect(render(crowned, 'mobile').html, 'crown on mobile too').toContain(crown)
    expect(render(state(), 'mobile').html, 'and only when crowned').not.toContain(crown)
  })

  it('carries the SLIP on the column, never the viewport', () => {
    // Never full-bleed (STYLE §5, #1028). The slip sheet replaced
    // `.coven-candle-backdrop` (#2135); that class is still live elsewhere, so
    // a revert would compile silently.
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

    // The design's voiced words, withdrawn (#1152).
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
    // #1397: `/edit` on a submitted solo redirects back, so unsubmit is the way in.
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
    // The MOUNT only; readings are in `duelCard.test.tsx`.
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
