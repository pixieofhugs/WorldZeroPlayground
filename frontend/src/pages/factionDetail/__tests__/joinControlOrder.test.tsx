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
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { FACTION_MANIFESTS } from '../../../factions'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import { aPraxisCard } from '../../../test/fixtures'
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
    recentPraxis: [aPraxisCard({ task_faction_slug: slug })],
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

function confirmStep(overrides: Partial<Membership> = {}): string {
  return renderToStaticMarkup(
    <JoinConfirm
      membership={membership(overrides)}
      name="The Coven"
      skin={BARE_SKIN}
      joiningLabel="Joining…"
      onCancel={() => {}}
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
