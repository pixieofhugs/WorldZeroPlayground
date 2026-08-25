/**
 * The seam: the join trio's RENDERED BUTTON ORDER, for every faction (#2651).
 *
 * #646's ruling — [Cancel] … [Submit], the affirmative on the right, on every
 * surface — had drifted into seven of the eight faction bodies, each of which
 * wrote the pair out longhand. The duel sheet holds only because one comment at
 * `SealActions` reminds people. A comment is not a guard; this is.
 *
 * It asserts in three parts, because the order can drift in two different ways:
 *
 *   1. THE PAIR ITSELF. `JoinConfirm` is the one place the two buttons are
 *      written, and cancel is first in its markup. DOM order is visual order —
 *      no kit reverses this row, and `noRowReverse` below holds that.
 *   2. EVERY FACTION MOUNTS IT. Per slug from the manifest, so a tenth faction
 *      is covered the day it registers: the eligible join area is the shared
 *      control's `data-join="open"` button and nothing else.
 *   3. NO ARCHETYPE CAN TAKE IT BACK. A body that re-declares `confirming` or
 *      calls `membership.join()` itself is exactly how this drifted the first
 *      time, and neither of the two assertions above would see it happen inside
 *      a branch they do not render.
 *
 * Part 2 is where the per-slug claim is made. It cannot be made by clicking:
 * this harness renders with `renderToStaticMarkup` and has no DOM, so the
 * confirm step is unreachable through an event. Mounting the one control whose
 * order part 1 pins is the same statement, and it is the statement that stays
 * true when a tenth kit arrives.
 *
 * #2656 WIDENED IT PAST THE ARCHETYPES. Parts 1-3 walked
 * `pages/factionDetail/archetypes/` and nothing else, so they were blind to
 * `InvitationLetterPopup` — a host that is not a faction body, that wrote the
 * whole trio out longhand, and that put the affirmative on the LEFT four days
 * after the other eight were fixed. A guard that only walks archetypes is why
 * that survived, so two more parts scan the WHOLE `src` tree:
 *
 *   4. THE TRIO'S COPY IS WRITTEN ONCE. `detail.join.{cancel,confirmAction,
 *      confirmSwitch}` may appear in exactly one source file. Any host that
 *      re-implements the confirm step needs those words, wherever it lives.
 *   5. THE JOIN SURFACES ARE A CENSUS. Every file that calls `chooseFaction`
 *      is listed with how its confirm step is drawn. A new one fails until
 *      somebody decides which side of the line it is on.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, sep } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { FACTION_MANIFESTS } from '../../../factions'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import { JoinConfirm, type JoinControlSkin } from '../JoinControl'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  state: undefined as unknown as FactionDetailState,
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

vi.mock('../useFactionDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useFactionDetail')>()),
  useFactionDetail: () => mocks.state,
}))

const FactionDetail = (await import('../../FactionDetail')).default

const MEMBER: CharacterOut = {
  id: 7,
  username: 'ada',
  display_name: 'Ada Reed',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 120,
  all_time_score: 340,
  faction_slug: 'everymen',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

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

function page(slug: string, formFactor: 'desktop' | 'mobile'): string {
  mocks.formFactor = formFactor
  mocks.state = {
    slug,
    loading: false,
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [MEMBER],
    tasks: [],
    // EMPTY, deliberately: a card in the gallery would drag the faction's
    // praxis archetype into this render, and several of those read `useTheme`,
    // which this harness has no provider for. The join area is what is under
    // test and it does not read the list.
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: membership(),
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionDetail slug={slug} />
    </MemoryRouter>,
  )
}

/** A skin that paints nothing — this suite is about order, not pixels. */
const BARE_SKIN: JoinControlSkin = { openStyle: {}, confirmStyle: {}, cancelStyle: {} }

function confirmStep(overrides: Partial<Membership> = {}, autoFocus = false): string {
  return renderToStaticMarkup(
    <JoinConfirm
      membership={membership(overrides)}
      name="The Coven"
      skin={BARE_SKIN}
      joiningLabel="Joining…"
      onCancel={() => {}}
      autoFocus={autoFocus}
    />,
  )
}

const ARCHETYPES = fileURLToPath(new URL('../archetypes', import.meta.url))

describe('the join pair keeps #646 order on every faction', () => {
  it('puts cancel before confirm in the markup', () => {
    const html = confirmStep()
    const cancel = html.indexOf('data-join="cancel"')
    const confirm = html.indexOf('data-join="confirm"')
    expect(cancel, 'a cancel button').toBeGreaterThan(-1)
    expect(confirm, 'a confirm button').toBeGreaterThan(-1)
    expect(cancel, 'the affirmative sits on the right (#646)').toBeLessThan(confirm)
  })

  it('does not reverse the row it just ordered', () => {
    // A `row-reverse` or an `order:` anywhere in the pair would make DOM order
    // stop being visual order, which is the one way the assertion above could
    // pass while the buttons still sat the wrong way round.
    const html = confirmStep()
    expect(html).not.toContain('row-reverse')
    expect(html).not.toMatch(/order:\s*-?\d/)
  })

  it('keeps the error slot, which only a FAILED join ever draws', () => {
    expect(confirmStep()).not.toContain('Could not join')
    expect(confirmStep({ joinError: 'Could not join faction.' })).toContain(
      'Could not join faction.',
    )
  })

  it("puts a dialog host's autofocus on the affirmative, never on cancel", () => {
    // `InvitationLetterPopup` is a modal and its confirm step is TALLER than
    // its pitch, so the browser scrolling the newly-mounted affirmative into
    // view is the whole reason #2130's fix works on a phone. The focus has to
    // land on the affirmative: autofocusing "cancel" inside a scroller would
    // scroll the same distance and focus the wrong verb.
    const html = confirmStep({}, true)
    const confirmAt = html.indexOf('data-join="confirm"')
    expect(confirmAt, 'a confirm button').toBeGreaterThan(-1)
    const confirmTag = html.slice(confirmAt, html.indexOf('>', confirmAt))
    expect(confirmTag, 'the affirmative takes the focus').toContain('autofocus')
    expect(
      html.slice(0, confirmAt),
      'and nothing before it does — that would be the cancel button',
    ).not.toContain('autofocus')
  })

  it('autofocuses nothing unless a host asks', () => {
    // The eight faction bodies draw the pair inline on a long page. A control
    // that grabbed focus there would yank the page down on every render.
    expect(confirmStep()).not.toContain('autofocus')
  })

  it('shows the pending state and disables both halves while joining', () => {
    const busy = confirmStep({ joining: true })
    expect(busy, 'the busy label').toContain('Joining')
    expect(busy.match(/disabled=""/g), 'cancel and confirm both').toHaveLength(2)
    expect(busy, 'the pending state is visible, not just disabled').toContain('opacity:0.6')
  })

  /**
   * Every faction with a PAGE. Read off the manifest so a tenth kit is covered
   * the day it registers, minus `na`: it has had a manifest since #2530, but
   * unaffiliated is a state rather than a faction (`isKnownFaction('na')` is
   * false, ADR-0039) and there is no na faction page to visit — `factionHero.na`
   * has no copy at all, so this harness cannot render one. na's SKIN is still
   * covered here, because `albescent` is the wrapper that mounts it.
   */
  const SLUGS = FACTION_MANIFESTS.map(({ slug }) => slug).filter((slug) => slug !== 'na')

  it('walks eight faction pages', () => {
    expect(SLUGS).toHaveLength(FACTION_MANIFESTS.length - 1)
  })

  for (const slug of SLUGS) {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      it(`${slug} draws its join through the shared control at ${formFactor}`, () => {
        const html = page(slug, formFactor)
        expect(
          [...html.matchAll(/data-join="open"/g)],
          'exactly one join verb, and it is the shared control',
        ).toHaveLength(1)
      })
    }
  }
})

describe('no faction body writes the trio itself', () => {
  const bodies = readdirSync(ARCHETYPES).filter((name) => name.endsWith('.tsx'))

  it('finds the archetypes it means to scan', () => {
    expect(bodies.length).toBeGreaterThanOrEqual(9)
  })

  for (const name of bodies) {
    it(`${name} owns paint, not behaviour`, () => {
      const source = readFileSync(join(ARCHETYPES, name), 'utf8')
      expect(source, 'the confirm step belongs to JoinControl').not.toContain('setConfirming')
      expect(source, 'the join call belongs to JoinControl').not.toContain('membership.join()')
      expect(source, 'the cancel label belongs to JoinControl').not.toContain('detail.join.cancel')
    })
  }
})

/**
 * Parts 4 and 5 — the whole `src` tree, not just the archetypes (#2656).
 *
 * The scan is SOURCE TEXT, deliberately. A non-archetype host's confirm step
 * sits behind a click, this harness has no DOM, and so the one thing that can
 * be asserted about a host nobody has thought of yet is that it does not write
 * the trio's words for itself.
 */
const SRC = fileURLToPath(new URL('../../..', import.meta.url))

/** Every `.ts`/`.tsx` under `src`, src-relative and slash-separated. */
function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((name) => name.split(sep).join('/'))
    .filter((name) => /\.tsx?$/.test(name))
}

function read(name: string): string {
  return readFileSync(join(SRC, name), 'utf8')
}

/** The one file allowed to say the confirm step's words. */
const TRIO_OWNER = 'components/JoinControl.tsx'

/**
 * The trio's shared copy. `detail.join.confirm` itself is left out on purpose:
 * it is a prefix of the two below it, so a substring scan for it would match
 * them and say nothing of its own.
 */
const TRIO_COPY = [
  'detail.join.cancel',
  'detail.join.confirmAction',
  'detail.join.confirmSwitch',
]

/**
 * Every surface that joins a faction, and how its confirm step is drawn. A new
 * caller fails this list until somebody decides which line it is on — which is
 * exactly the decision nobody was asked to make when the invitation popup grew
 * its own pair.
 */
const JOIN_SURFACES: Record<string, string> = {
  'pages/factionDetail/useFactionDetail.ts':
    'builds the JoinTarget the shared control consumes; draws no buttons',
  'components/InvitationLetterPopup.tsx': 'mounts JoinConfirm',
  'components/feed/FeedCardInvitationLetter.tsx':
    'its own copy, its own one-click mode — cannot mount the shared control; ordered below',
  'components/AlbescentInvitation.tsx':
    'no confirm pair at all: a life picker, then Accept (#2399)',
}

describe('no host writes the join trio itself, archetype or not', () => {
  it('scans a tree it can actually see', () => {
    const files = sourceFiles()
    expect(files.length).toBeGreaterThan(200)
    expect(files).toContain(TRIO_OWNER)
  })

  it('writes the trio copy in exactly one file', () => {
    const offenders = sourceFiles().filter(
      (name) =>
        name !== TRIO_OWNER &&
        !name.includes('__tests__/') &&
        TRIO_COPY.some((key) => read(name).includes(key)),
    )
    expect(offenders, `the confirm step's words belong to ${TRIO_OWNER}`).toEqual([])
  })

  it('knows every surface that joins a faction', () => {
    // `api/` is the client and `hooks/` the caches; neither draws a control.
    const callers = sourceFiles().filter(
      (name) =>
        !name.startsWith('api/') &&
        !name.startsWith('hooks/') &&
        !name.includes('__tests__/') &&
        read(name).includes('chooseFaction('),
    )
    expect(callers.sort()).toEqual(Object.keys(JOIN_SURFACES).sort())
  })
})

describe('the feed letter, the one join surface that keeps its own pair', () => {
  /**
   * It cannot mount the shared control without changing its words: its confirm
   * step is two paragraphs of `feed:invitationLetter.confirm.*`, it has a
   * one-click branch for an unaffiliated holder (epic #1419 decision 10) and a
   * terminal "joined" state the trio has no idea about. So #646 is asserted
   * against its own markup instead — source order, because the confirm step is
   * one click past a state this harness cannot reach.
   */
  const source = readFileSync(
    join(SRC, 'components/feed/FeedCardInvitationLetter.tsx'),
    'utf8',
  )

  it('puts cancel before confirm', () => {
    const cancel = source.indexOf('invitationLetter.confirm.cancel')
    const confirm = source.indexOf('invitationLetter.confirm.confirm')
    expect(cancel, 'a cancel button').toBeGreaterThan(-1)
    expect(confirm, 'a confirm button').toBeGreaterThan(-1)
    expect(cancel, 'the affirmative sits on the right (#646)').toBeLessThan(confirm)
  })

  it('does not reverse the row it just ordered', () => {
    expect(source).not.toContain('row-reverse')
  })
})
