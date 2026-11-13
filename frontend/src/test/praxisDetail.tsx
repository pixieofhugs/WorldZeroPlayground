/**
 * The praxis-detail render harness (#2692). Not in `fixtures.ts`, which stays
 * type-only imports (a mount would drag the router, i18n and faction manifests
 * into every importer). The `useFormFactor` mock stays in each suite: `vi.mock`
 * hoists into the file that writes it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { expect } from 'vitest'
import { surfaceMap } from '../factions'
// Initialise the catalog so copy keys resolve.
import '../i18n'
import type { PraxisDetailState } from '../pages/praxisDetail/usePraxisDetail'
import type { FormFactor } from '../hooks/useFormFactor'
import type { VoterDetail } from '../api/votes'
import type { PraxisOut } from '../api/praxis'
import type { CharacterOut, CurrentUser } from '../api/auth'
import { aCharacter, aCurrentUser, aDuelSide, aMember, aPraxis } from './fixtures'
import { stripResourceHints } from './ssrMarkup'

/** Mount under the router. `text` is tag-stripped (headings split across spans). */
export function markup(element: ReactElement): { html: string; text: string } {
  const html = stripResourceHints(
    renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>),
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** The author's own membership row (`aPraxis()`'s default). */
export const MEMBER = aMember()

/** A second collab member. */
export const CO_MEMBER = aMember({
  id: 102,
  character_id: 4,
  character_display_name: 'Beth',
  joined_at: '2026-01-02T00:00:00Z',
})

/** Two voters at different values: the panel lists each, never averages. */
export const VOTERS: VoterDetail[] = [
  { character_id: 11, display_name: 'Cy', avatar_url: '', faction_slug: '', value: 5 },
  { character_id: 12, display_name: 'Dov', avatar_url: '', faction_slug: '', value: 3 },
]

/**
 * The duel rival: S.N.I.D.E., just behind on votes (no accidental tie). A
 * S.N.I.D.E. suite overrides `faction_slug`, else ink asserts are vacuous.
 */
export const RIVAL = aDuelSide({
  praxis_id: 2,
  character_id: 4,
  display_name: 'Rax',
  faction_slug: 'snide',
  points_from_votes: 15.4,
})

/**
 * The praxis the registry walks (`archetypeSlots`, `voteRegionGate`) render:
 * solo, submitted, voted, no media. score = (30 + 0) × 1.0 + 16 = 46.
 */
export const aWalkedPraxis = (over: Partial<PraxisOut> = {}): PraxisOut =>
  aPraxis({
    task_title: 'Mangrove',
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: 'ua',
    title: 'Reforestation',
    body_text: 'Seedlings planted along the estuary.',
    submitted_at: '2026-01-02T00:00:00Z',
    created_by_id: 3,
    created_by_display_name: 'Ada',
    created_by_faction_slug: 'ua',
    updated_at: '2026-01-02T00:00:00Z',
    members: [],
    media_items: [],
    score: 46,
    points_from_votes: 16,
    ...over,
  })

/**
 * Owner-control premise: a submitted solo whose one member is the viewer.
 * Character 1, not AUTHOR: ownership is read off the MEMBER row (ADR-0013).
 */
export const anOwner = (over: Partial<CharacterOut> = {}): CurrentUser =>
  aCurrentUser({ character: aCharacter({ id: 1, ...over }) })

export const anOwnedPraxis = (over: Partial<PraxisOut> = {}): PraxisOut =>
  aPraxis({
    task_title: 'Mangrove',
    task_point_value: 30,
    task_level_required: 3,
    title: 'Reforestation',
    body_text: 'Seedlings.',
    submitted_at: '2026-01-02T00:00:00Z',
    created_by_id: 1,
    updated_at: '2026-01-02T00:00:00Z',
    members: [aMember({ id: 10, character_id: 1 })],
    media_items: [],
    score: 0,
    points_from_votes: 0,
    ...over,
  })

/**
 * Neutral `PraxisDetailState`: loaded, anonymous, non-owner, no duel. Handlers
 * are no-ops; static render never calls them.
 */
export function aPraxisDetailState(
  over: Partial<PraxisDetailState> = {},
): PraxisDetailState {
  return {
    loading: false,
    praxis: aPraxis(),
    fetchError: null,
    comments: null,
    voters: [],
    duel: null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: '',
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: '',
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
    ...over,
  }
}

/**
 * Render a faction's praxis-detail via the real `surfaceMap` registry. Looked up
 * at call time: entries are thunks warmed in `beforeAll` (preloadArchetypes.ts).
 */
export function renderPraxisDetail(
  slug: string,
  over: Partial<PraxisDetailState> = {},
): { html: string; text: string } {
  const Archetype = surfaceMap('praxisDetail')[slug] as
    | ComponentType<{ state: PraxisDetailState }>
    | undefined
  if (!Archetype) throw new Error(`no praxisDetail archetype registered for "${slug}"`)
  return markup(<Archetype state={aPraxisDetailState(over)} />)
}

/** `indexOf` that fails on a missing marker (-1 would make "above" trivially true). */
export function indexOf(html: string, needle: string): number {
  const at = html.indexOf(needle)
  expect(at, `marker missing: ${needle}`).toBeGreaterThan(-1)
  return at
}

/**
 * A per-suite `render(state, formFactor)` for one skin. `mocks` is the suite's own
 * `vi.hoisted` cell (`vi.mock` can't be registered from here).
 */
export function skinRenderer(slug: string, mocks: { formFactor: FormFactor }) {
  return (
    next: Partial<PraxisDetailState>,
    formFactor: FormFactor = 'desktop',
  ): { html: string; text: string } => {
    mocks.formFactor = formFactor
    return renderPraxisDetail(slug, next)
  }
}
