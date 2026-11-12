/**
 * The join trio's button order, for every faction (#2651; #646: affirmative on
 * the right). Five parts: (1) `JoinConfirm` puts cancel first and never reverses
 * the row; (2) every manifest faction mounts that shared control; (3) no
 * archetype re-implements the confirm step; (4) the trio's copy lives in one
 * file; (5) every `chooseFaction` caller is a listed census (#2656).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { FACTION_MANIFESTS } from '../../../factions'
import type { FactionDetailState, Membership } from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import { JoinConfirm, type JoinControlSkin } from '../../../components/JoinControl'
import { sourceFiles as walkSource, toRelative } from '../../../test/sourceScan'

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
    // Empty: praxis archetypes read `useTheme`, which has no provider here.
    recentPraxis: [],
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
    // Otherwise DOM order would stop being visual order.
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
    // #2130: autofocus scrolls the taller confirm step into view in the modal.
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
    // Inline on a long page, grabbing focus would yank the page down.
    expect(confirmStep()).not.toContain('autofocus')
  })

  it('shows the pending state and disables both halves while joining', () => {
    const idle = confirmStep()
    const busy = confirmStep({ joining: true })
    expect(busy, 'the busy label').toContain('Joining')
    expect(busy.match(/disabled=""/g), 'cancel and confirm both').toHaveLength(2)
    expect(idle.match(/disabled=""/g), 'neither half is disabled before joining').toBeNull()
    // State-keyed busy paint; see joinControlBusyPaint.test.tsx.
    const paintedOff = (html: string) => html.includes('disabled=""') && html.includes('control-off')
    expect(paintedOff(idle), 'not painted off before joining').toBe(false)
    expect(paintedOff(busy), 'painted off while joining').toBe(true)
  })

  // Every faction with a page: `na` is a state, not a faction (ADR-0039); its skin
  // is still covered via `albescent`.
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
  const bodies = walkSource({ dir: ARCHETYPES, match: /\.tsx$/ }).map((path) => basename(path))

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

// Parts 4-5 scan source text across all of `src` (#2656): a host's confirm step
// sits behind a click this harness cannot make.
const SRC = fileURLToPath(new URL('../../..', import.meta.url))

/** Every `.ts`/`.tsx` under `src`, src-relative and slash-separated. */
function sourceFiles(): string[] {
  return walkSource({ dir: SRC, includeTests: true }).map((path) => toRelative(path))
}

function read(name: string): string {
  return readFileSync(join(SRC, name), 'utf8')
}

/** The one file allowed to say the confirm step's words. */
const TRIO_OWNER = 'components/JoinControl.tsx'

/** `detail.join.confirm` omitted: it is a prefix of the two below. */
const TRIO_COPY = [
  'detail.join.cancel',
  'detail.join.confirmAction',
  'detail.join.confirmSwitch',
]

/** Every surface that joins a faction; a new caller fails until it is listed. */
const JOIN_SURFACES: Record<string, string> = {
  'pages/factionDetail/useFactionDetail.ts':
    'builds the JoinTarget the shared control consumes; draws no buttons',
  'components/InvitationLetterPopup.tsx': 'mounts JoinConfirm',
  'components/feed/FeedCardInvitationLetter.tsx':
    'its own copy, its own one-click mode — cannot mount the shared control; ordered below',
  'components/AlbescentInvitation.tsx':
    'no confirm pair at all: a life picker, then Accept (#2399)',
  'pages/characterPaths/useEditCharacter.ts':
    'sends the move on Save; its shared FactionRow (editCharacterSlots) mounts JoinConfirm (#3149)',
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
  // Its own copy, one-click mode (#1419) and "joined" state rule out the shared
  // control, so #646 is asserted in source order.
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
