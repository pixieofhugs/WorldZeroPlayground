/**
 * UA desktop skin — rendered-output guard (#851).
 *
 * The whole UA redesign is a set of rulings that are invisible to tsc, eslint
 * and the token-declared guard: which tokens a surface may read, where the
 * mandala may appear, and what the ensō is reserved for. Each of those failed
 * silently in the praxis-card wave, so they are asserted here on RENDERED
 * markup rather than on registry contents (`renderToStaticMarkup` only — no
 * jsdom, no testing-library, effects never run).
 *
 * The four heavy archetypes (task detail, faction body, edit-praxis, profile)
 * need a whole page state to render and are covered by the source guard at the
 * bottom plus their existing dispatch tests.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

// Initialize the catalog so copy keys resolve to English text.
import '../i18n'
import type { CommentOut } from '../api/comments'
import type { CharacterOut } from '../api/auth'
import UaTaskCard from '../components/taskCard/UaTaskCard'
import UaFactionHero from '../components/factionHero/UaFactionHero'
import UaSelectCard from '../components/selectCard/UaSelectCard'
import UaFeedFrame from '../components/feed/UaFeedFrame'
import UaAvatar from '../components/avatar/UaAvatar'
import UaBackdrop from '../components/backdrop/UaBackdrop'
import UaComment from '../components/comments/voices/UaComment'
import { aTask } from '../test/fixtures'

const SRC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..')

/**
 * The masked brush asset — the one string that proves the mark is on a surface.
 *
 * This used to pin the two-arc approximation's path geometry. #908 deleted that
 * drawing: there is one ensō now, the vendored ensō, delivered as a CSS
 * mask at every size (see `sigil/UaSigil.tsx` and `factionMarks/Enso.tsx`).
 * Same guard, new mechanism — the surfaces still have to render *a* mark.
 */
const ENSO_MARK = '/factionMarks/enso.webp'

const TASK = aTask({
  id: 12,
  title: 'Render the old library façade in charcoal',
  description: 'Draw only what the light is doing.',
  point_value: 30,
  primary_faction_slug: 'ua',
})

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Ada Reed',
  avatar_url: null,
  faction_slug: 'ua',
  bio: null,
  location: null,
  level: 2,
  score: 0,
  all_time_score: 0,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
} as unknown as CharacterOut

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'The way you let the cornice dissolve.',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Ada Reed',
    avatar_url: '',
    faction_slug: 'ua',
  },
  mentions: [],
}

function routed(node: React.ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

const taskCard = () =>
  routed(
    <UaTaskCard
      task={TASK}
      basePoints={30}
      multiplier={1}
      inProgressCount={0}
      onSignup={() => {}}
    />,
  )
// #1194 widened the chassis contract: a frame carries the kicker, the time, an
// optional tag and the archive node alongside its children.
const feedRow = () =>
  routed(
    <UaFeedFrame kicker="Task completed" time="2h ago" tag={null} archive={null}>
      <span>card-body</span>
    </UaFeedFrame>,
  )
const comment = () =>
  routed(<UaComment mode="row" comment={COMMENT} />)
const composer = () =>
  routed(
    <UaComment
      mode="composer"
      character={CHARACTER}
      value=""
      onChange={() => {}}
      onSubmit={() => {}}
      submitting={false}
    />,
  )
const hero = () =>
  routed(
    <UaFactionHero
      name="University of Asthmatics"
      members={214}
      tasks={9}
      praxes={1489}
    />,
  )
const joinCard = () => routed(<UaSelectCard state="eligible" members={214} />)
const avatar = () => routed(<UaAvatar character={CHARACTER} />)
const backdrop = () => renderToStaticMarkup(<UaBackdrop />)

/** Every UA desktop surface that renders from props alone. */
const SURFACES: Array<[string, () => string]> = [
  ['task card', taskCard],
  ['feed row', feedRow],
  ['comment row', comment],
  ['comment composer', composer],
  ['faction hero', hero],
  ['join card', joinCard],
  ['avatar', avatar],
  ['backdrop', backdrop],
]

describe('UA desktop skin — the salon is dead', () => {
  it('reads no legacy --ua-* token on any surface', () => {
    // The legacy gilt family survives until #853 deletes it, but nothing in the
    // rebuilt skin may still be reading it. A missed reference does not fail
    // the build — it renders as an unstyled element — so only markup catches it.
    for (const [name, render] of SURFACES) {
      expect(render(), `${name} still paints with the legacy family`).not.toMatch(
        /var\(--ua-[a-z]/,
      )
    }
  })

  it('paints every surface from the --faction-ua-* family', () => {
    for (const [name, render] of SURFACES) {
      expect(render(), `${name} paints with no UA token at all`).toContain(
        '--faction-ua',
      )
    }
  })
})

describe('UA mandala strengths (brief §5)', () => {
  // The mandala primitive draws lens petals; nothing else in the skin does.
  const PETAL = /A \d+\.\d\d \d+\.\d\d 0 0 1/

  it('carries the pattern on exactly the three surfaces that may have it', () => {
    for (const [name, render] of [
      ['backdrop', backdrop],
      ['faction hero', hero],
      ['join card', joinCard],
    ] as const) {
      expect(render(), `${name} lost its texture`).toMatch(PETAL)
    }
  })

  it('renders NOTHING on the dense, text-heavy surfaces', () => {
    // `absent` is a real strength, not a missing case: a task list, a feed row
    // and a comment thread are read in bulk and stay clean.
    for (const [name, render] of [
      ['feed row', feedRow],
      ['comment row', comment],
      ['comment composer', composer],
    ] as const) {
      expect(render(), `${name} grew a mandala`).not.toMatch(PETAL)
    }
  })

  it('keeps the task card\'s READING COLUMN clean, and flanks only its sign-up (#2031)', () => {
    // The task card used to be in the list above. It gained two mandalas in the
    // ornament pass — and the strength ruling is not overruled, it simply does
    // not reach them: `absent` protects COPY the pattern would sit under, and
    // the sign-up region below `data-cta-rule="ua"` carries none. So the column
    // is asserted apart from the row beneath it, and a mandala that drifted up
    // into the title, the description or the hero still fails here.
    const html = taskCard()
    const rule = html.indexOf('data-cta-rule="ua"')
    expect(rule, 'the rule the column is measured to').toBeGreaterThan(0)
    expect(html.slice(0, rule), 'a mandala reached the reading column').not.toMatch(PETAL)
    expect(html.slice(rule), 'the sign-up lost its flanking mandalas').toMatch(PETAL)
  })
})

describe('the ensō is reserved for the score and the faction mark', () => {
  it('draws the mark where it belongs', () => {
    // Score: the task card's marks sit inside it. Faction mark: the avatar
    // badge, the hero, the join card's crest band, the feed row's corner.
    for (const [name, render] of [
      ['task card score', taskCard],
      ['avatar badge', avatar],
      ['faction hero', hero],
      ['join card', joinCard],
      ['feed row', feedRow],
      ['composer', composer],
    ] as const) {
      expect(render(), `${name} lost the ensō`).toContain(ENSO_MARK)
    }
  })

  it('never draws it as a container border', () => {
    // The mark spent as decoration is the failure this rule exists to stop: no
    // surface may put the ensō in a border/outline declaration.
    for (const [name, render] of SURFACES) {
      expect(render(), `${name} outlined itself in the mark`).not.toMatch(
        /border[^;"]*enso/i,
      )
    }
  })
})

describe('the feed chassis and the comment note (#1201)', () => {
  /** The chassis with all four chrome slots filled, as `FeedItemSlot` hands them. */
  const chassis = () =>
    routed(
      <UaFeedFrame
        kicker="Task completed"
        time="2h ago"
        tag="Still waiting"
        archive={<button type="button">archive-node</button>}
      >
        <span>card-body</span>
      </UaFeedFrame>,
    )

  it('draws all four chrome slots and swallows none of them', () => {
    // A frame that drops one loses a FEATURE, not a decoration: the kicker is the
    // card's only kind label, the time its only timestamp, and the archive node
    // the entire keyboard/screen-reader route to the archive (#1194).
    const html = chassis()
    expect(html, 'kicker').toContain('Task completed')
    expect(html, 'time').toContain('2h ago')
    expect(html, 'tag').toContain('Still waiting')
    expect(html, 'archive node placed, not rebuilt').toContain('archive-node')
    expect(html, 'body intact').toContain('<span>card-body</span>')
  })

  it('grounds the card in the three-stop paper stock, not a flat fill', () => {
    // The design sheet's `--cardGrad`. A flat `card-bg` is what this replaced.
    expect(chassis()).toContain('var(--faction-ua-parchment)')
  })

  it('reads NO token from the praxis-card-only exception block (#857)', () => {
    // `--faction-ua-card-parchment` is the same gradient under a name scoped to
    // the praxis card, whose block asks in writing not to be widened. The stock
    // is named once in UA's primitives instead; reading the exception's copy here
    // would quietly make the exception the rule.
    const html = chassis()
    expect(html).not.toContain('--faction-ua-card-parchment')
    expect(html).not.toContain('--faction-ua-card-frame')
  })

  it('puts no archive affordance on a comment', () => {
    // The epic's load-bearing structural fact: comments are NEVER archivable,
    // only update cards are. Every design sheet says it in its own dialect.
    const html = comment()
    expect(html).not.toContain('data-feed-archive')
    expect(html).not.toContain('data-feed-slot')
  })

  it('gates the owner row through the SHARED reveal, not a gate of its own', () => {
    // F3 (#1195) owns the hover/focus gate. A voice wires two lines; it does not
    // re-implement hover state, and a `display:none` gate would put the control
    // out of reach of the keyboard entirely.
    const source = readFileSync(
      join(SRC_DIR, 'components/comments/voices/UaComment.tsx'),
      'utf-8',
    )
    expect(source, 'uses the shared hook').toContain('useOwnerReveal')
    expect(source, 'hands the reveal to the shared control').toMatch(
      /reveal=\{reveal\}/,
    )
    expect(source, 'rolls its own hover state').not.toMatch(/useState/)
  })
})

describe('the eleven rebuilt surfaces carry no salon left-overs', () => {
  const REBUILT = [
    'components/taskCard/UaTaskCard.tsx',
    'components/factionHero/UaFactionHero.tsx',
    'components/factionMarks/uaAtoms.tsx',
    'components/feed/UaFeedFrame.tsx',
    'components/avatar/UaAvatar.tsx',
    'components/backdrop/UaBackdrop.tsx',
    'components/comments/voices/UaComment.tsx',
    'pages/taskDetail/archetypes/UaTaskDetail.tsx',
    'pages/factionDetail/archetypes/UaFactionBody.tsx',
    'pages/editPraxis/archetypes/UaEditPraxis.tsx',
    'pages/characterProfile/archetypes/UaProfileBody.tsx',
  ]

  it('reads no legacy --ua-* token, including in the four heavy archetypes', () => {
    for (const file of REBUILT) {
      const source = readFileSync(join(SRC_DIR, file), 'utf-8')
      expect(source, `${file} still reads the legacy family`).not.toMatch(
        /var\(--ua-[a-z]/,
      )
    }
  })

  it('keeps no ternary standing in for the dark cascade', () => {
    // Dark mode is the [data-theme="dark"] cascade in index.css, never a
    // `dark ? a : b` in a component.
    for (const file of REBUILT) {
      const source = readFileSync(join(SRC_DIR, file), 'utf-8')
      expect(source, `${file} branches on the theme`).not.toMatch(
        /\bdark\s*\?/,
      )
    }
  })
})
