/**
 * The praxis-detail render harness (#2692).
 *
 * Twenty of the twenty-two files in `pages/praxisDetail/__tests__` opened with
 * the same forty-line `PraxisDetailState` literal, the same MemoryRouter mount
 * and the same tag-stripping `render()`. A 2026-08-25 duplication audit put the
 * directory at 42.9% duplicated on an 8-line window — against 1-2% everywhere
 * else in the repo. None of that setup was a premise any of those tests were
 * making; it was the cost of getting a page onto the page.
 *
 * WHY THIS IS NOT IN `fixtures.ts`
 * -------------------------------
 * `fixtures.ts` is pure wire shapes with no imports but types, and forty-eight
 * test files import it. Putting a MOUNT there would drag `react-dom/server`,
 * the router, the i18n catalog and — through `surfaceMap` — the entire faction
 * manifest graph into every one of them. The data builders this harness leans
 * on (`aPraxis`, `aMember`, `aCurrentUser`, `aDuel`) do live there; only the
 * rendering lives here.
 *
 * WHAT IS DELIBERATELY *NOT* HERE
 * ------------------------------
 * The `useFormFactor` mock. `vi.mock` is hoisted into the file it is written
 * in, so a mock registered from this module would not be registered for the
 * test file that imports it. Each suite keeps its own four-line mock, and its
 * own `render()` wrapper sets the value before delegating here — which also
 * keeps the mocking local and visible where the mobile assertions are made.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
import { expect } from 'vitest'
import { surfaceMap } from '../factions'
// Initialise the catalog so shared-chrome copy keys resolve to English text.
import '../i18n'
import type { PraxisDetailState } from '../pages/praxisDetail/usePraxisDetail'
import type { VoterDetail } from '../api/votes'
import { aMember, aPraxis } from './fixtures'

/**
 * Mount anything under the router and hand back both readings of it.
 *
 * `text` is the tag-stripped markup: several archetypes split a heading across
 * spans (the Ephemerists' lapis last word), so a phrase only reads contiguously
 * once the wrapping tags are gone. `html` is what a class, an href or a token
 * name is asserted against.
 */
export function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/** The author's own membership row — the solo case, and `aPraxis()`'s default. */
export const MEMBER = aMember()

/** A second member, so a collab has someone to credit besides the author. */
export const CO_MEMBER = aMember({
  id: 102,
  character_id: 4,
  character_display_name: 'Beth',
  joined_at: '2026-01-02T00:00:00Z',
})

/**
 * Two voters at different rungs, which is what the who-voted panel is for: the
 * page lists each voter's own star value and must never average them.
 */
export const VOTERS: VoterDetail[] = [
  { character_id: 11, display_name: 'Cy', avatar_url: '', faction_slug: '', value: 5 },
  { character_id: 12, display_name: 'Dov', avatar_url: '', faction_slug: '', value: 3 },
]

/**
 * The whole `PraxisDetailState` a detail archetype takes, in its neutral shape:
 * loaded, anonymous, non-owner, no duel, nothing in flight, every setter and
 * handler a no-op.
 *
 * A suite passes ONLY the axis it is asserting on — `{ isOwner: true }`,
 * `{ duel }`, `{ praxis: { ...PRAXIS, moderation_status: 'flagged' } }` — so
 * the call site reads as the test's premise rather than burying it. The
 * handlers are no-ops because `renderToStaticMarkup` never runs an effect and
 * never fires an event: nothing in this harness can call one.
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
 * Render the praxis-detail page a faction actually gets, named by SLUG.
 *
 * The archetype is looked up in the real `surfaceMap('praxisDetail')` registry
 * rather than imported by hand, so a suite renders what the dispatcher would
 * render — de-register a faction and its own suite says so. The lookup happens
 * at call time, inside the test, because the manifest entries are code-split
 * thunks warmed by `src/test/preloadArchetypes.ts` in a `beforeAll`; resolving
 * at module scope would find them unwarmed and render null.
 *
 * The second argument is a `Partial<PraxisDetailState>`, so a suite that has
 * already built a full state can pass it straight through.
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

/**
 * Where a marker sits in the markup — the seam every responsive-move assertion
 * is about. Fails loudly on a missing marker, because `indexOf` returning -1
 * would otherwise make "rides above" trivially true.
 */
export function indexOf(html: string, needle: string): number {
  const at = html.indexOf(needle)
  expect(at, `marker missing: ${needle}`).toBeGreaterThan(-1)
  return at
}
