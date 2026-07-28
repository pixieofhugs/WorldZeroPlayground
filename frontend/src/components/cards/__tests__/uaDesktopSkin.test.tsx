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
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'
import type { TaskOut } from '../../../api/tasks'
import UaTaskCard from '../UaTaskCard'
import UaFactionHero from '../UaFactionHero'
import { UaSelectCard } from '../FactionSelectCard'
import UaFeedFrame from '../../feed/UaFeedFrame'
import UaAvatar from '../../avatar/UaAvatar'
import UaBackdrop from '../../backdrop/UaBackdrop'
import UaComment from '../../comments/voices/UaComment'

const SRC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')

/**
 * The masked brush asset — the one string that proves the mark is on a surface.
 *
 * This used to pin the two-arc approximation's path geometry. #908 deleted that
 * drawing: there is one ensō now, the vendored ensō, delivered as a CSS
 * mask at every size (see `cards/UaSigil.tsx` and `factionMarks/Enso.tsx`).
 * Same guard, new mechanism — the surfaces still have to render *a* mark.
 */
const ENSO_MARK = '/factionMarks/enso.webp'

const TASK: TaskOut = {
  id: 12,
  title: 'Render the old library façade in charcoal',
  description: 'Draw only what the light is doing.',
  point_value: 30,
  level_required: 2,
  status: 'active',
  primary_faction_slug: 'ua',
} as unknown as TaskOut

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
    avatar_url: null,
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
const feedRow = () => routed(<UaFeedFrame><span>card-body</span></UaFeedFrame>)
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
      description="One true mark, then another."
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
      ['task card', taskCard],
      ['feed row', feedRow],
      ['comment row', comment],
      ['comment composer', composer],
    ] as const) {
      expect(render(), `${name} grew a mandala`).not.toMatch(PETAL)
    }
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

describe('the eleven rebuilt surfaces carry no salon left-overs', () => {
  const REBUILT = [
    'components/cards/UaTaskCard.tsx',
    'components/cards/UaFactionHero.tsx',
    'components/cards/uaAtoms.tsx',
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
