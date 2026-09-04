/**
 * THE COMPUTED-VALUE DIFF, MECHANISED (#2718).
 *
 * `ScoreStamp` is one of the frozen four — task card · praxis card · vote ·
 * score stamp — whose APPEARANCE is frozen while the code under it stays free
 * to change. A consolidation lane on this surface therefore has to prove it
 * moved code and not pixels, and "I read the diff" is not that proof: the whole
 * point of a lane that touches nine files at once is that a reviewer cannot
 * hold nine trees in their head.
 *
 * So this is the proof, and it is a hash rather than an eyeball. Every
 * archetype the dispatcher can reach — the real `surfaceMap('praxisDetail')`
 * registry plus the `__default__` fall-through — is rendered across the fixture
 * states the rest of this directory already builds, at BOTH form factors, and
 * the SHA-256 of the resulting markup is snapshotted. Byte-identical markup
 * from byte-identical input is the strongest claim available in a harness with
 * no browser in it (SPEC-testing.md), and it is exactly the claim a
 * "consolidation, not design" lane is making.
 *
 * ## Reading a failure
 *
 * A changed hash is not automatically a bug — it is a changed page, which is a
 * thing you are allowed to do deliberately. The rule is that you may not do it
 * ACCIDENTALLY, and that re-recording is the LAST step rather than the first.
 *
 * **Explain the change before you take it.** A hash says something moved; it
 * cannot say what, and `-u` will happily bank a regression as cheerfully as an
 * improvement. So: diff the raw markup for one failing row, find the subtree
 * that moved, and say in the PR — per subtree — what moved and why it was
 * meant to. `capture()` below returns the markup for exactly that, and a
 * `writeFileSync` on two sides of a change is a two-minute answer to a
 * question a hash cannot answer at all.
 *
 * That is not ceremony. This gate has already caught itself once: the first
 * baseline was recorded in the capturer's local timezone and CI read 200
 * changed rows, of which the true count was one `<div>`. Re-recording would
 * have "fixed" it and hidden the defect in the harness. When every row moves
 * at once, suspect the harness; when a few move, suspect the change.
 *
 * Only then:
 *
 *     npx vitest run src/pages/praxisDetail/__tests__/markupStability.test.tsx -u
 *
 * and the review sees a changed hash on a named archetype in a named state,
 * next to a written account of the subtree it belongs to.
 *
 * ## Why a hash and not the markup
 *
 * One page is ~30 KB of markup and the walk below renders every registered
 * archetype × every state × both form factors — 180 renders as this is
 * written, and the number is nine registered archetypes times ten states times
 * two, not a constant anyone has to maintain. The golden files would be ~5 MB
 * and no human would ever read a line of them. A hash is unreadable either
 * way, so it may as well be short — and the first question is always "did this
 * change", with "how" answered by re-rendering the one row that moved.
 *
 * ## Why the registry rather than a list
 *
 * Same property `archetypeSlots.test.tsx` is built on and for the same reason:
 * a tenth faction registering a praxis-detail archetype is picked up here with
 * no edit to this file, and so is a faction dropping back to Default.
 */
import { createHash } from 'node:crypto'
import { describe, it, expect, vi } from 'vitest'
import type { ComponentType } from 'react'
import { aMetatask, aDuel } from '../../../test/fixtures'
import type { PraxisDetailState } from '../usePraxisDetail'

// ─── THE RENDER IS PINNED TO UTC, AND THIS LINE IS LOAD-BEARING ──────────────
//
// The first version of this file hashed the markup as the machine happened to
// render it, and the machine that captured the baseline was on
// `America/Los_Angeles`. CI runs in UTC, so all 200 rows differed on the first
// push and none of them was a real change.
//
// The whole of the difference was ONE node. Every praxis-detail archetype draws
// a byline timestamp through `formatTimestamp` (`utils/dates.ts`), which calls
// `toLocaleString(undefined, ...)` — the ambient timezone AND the ambient
// locale. The fixture's `submitted_at` is `2026-01-02T00:00:00Z`, which renders
// as "Jan 2, 2026, 12:00 AM" in UTC and "Jan 1, 2026, 4:00 PM" seven hours west
// of it. One line of markup, on every page, in every state, at both form
// factors — which is exactly why it looked like a total mismatch rather than a
// one-node one.
//
// Assigning `process.env.TZ` at runtime really does re-point `Intl` on Node 26
// (verified, not assumed: `resolvedOptions().timeZone` moves with it, even
// after `Intl` has already been used once). It is set before the dynamic
// imports below so nothing can read a timezone first — and the guard case at
// the bottom of this file asserts the pin actually took, because a pin that
// silently no-ops would put us straight back to a 200-row mystery diff.
process.env.TZ = 'UTC'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'desktop' | 'mobile' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered, so the archetypes close over it.
const { surfaceMap } = await import('../../../factions')
const { default: DefaultPraxisDetail } = await import('../archetypes/DefaultPraxisDetail')
const { aPraxisDetailState, aWalkedPraxis, anOwner, markup, RIVAL, VOTERS } =
  await import('../../../test/praxisDetail')

const PRAXIS = aWalkedPraxis()

/**
 * The states. Each one is the premise some existing suite in this directory
 * already renders — named here so a failing row reads as a sentence rather than
 * an index. `flagged` is the state this lane moved, so it is not optional.
 */
const STATES: Record<string, () => PraxisDetailState> = {
  // The registry walks' own praxis: solo, submitted, voted, no media.
  base: () => aPraxisDetailState({ praxis: PRAXIS }),
  // `archetypeSlots.test.tsx` — exactly one TaskCrown, in the stamp's corner.
  crowned: () => aPraxisDetailState({ praxis: { ...PRAXIS, is_top_for_task: true } }),
  // #1538 — the public failed mark, with the steward's note written.
  failed: () =>
    aPraxisDetailState({
      praxis: {
        ...PRAXIS,
        moderation_status: 'failed',
        admin_note: 'The photo is of a different ridge.',
      },
    }),
  // #1538 again — the same mark with the steward's box left empty.
  failedNoteless: () =>
    aPraxisDetailState({
      praxis: { ...PRAXIS, moderation_status: 'failed', admin_note: '' },
    }),
  // THE STATE THIS LANE MOVES. The flagged notice was copied into all eight
  // dressed archetypes; it is now the third branch of `PraxisStatusBanners`.
  flagged: () => aPraxisDetailState({ praxis: { ...PRAXIS, moderation_status: 'flagged' } }),
  // #932 — the read-only applied-metatask seal stack, issued by another faction.
  sealed: () =>
    aPraxisDetailState({
      praxis: {
        ...PRAXIS,
        applied_metatasks: [aMetatask({ metatask_faction_slug: 'snide' })],
      },
    }),
  // ADR-0053's non-neutral multiplier: base 10 × 1.1 + 14 = 25.
  multiplier: () =>
    aPraxisDetailState({
      praxis: {
        ...PRAXIS,
        task_point_value: 10,
        score: 25,
        display_multiplier: 1.1,
        points_from_votes: 14,
      },
    }),
  // The owner's own page, with the who-voted panel populated.
  owner: () =>
    aPraxisDetailState({ praxis: PRAXIS, isOwner: true, user: anOwner(), voters: VOTERS }),
  // The steward bar, which is mounted bare by every archetype.
  steward: () => aPraxisDetailState({ praxis: PRAXIS, showAdminBar: true }),
  // #1090 — the duel card's settled reading, which draws a card at all.
  duel: () =>
    aPraxisDetailState({
      praxis: { ...PRAXIS, duel_id: 5 },
      duel: aDuel({ id: 5, status: 'settled', challenger: RIVAL }),
    }),
}

const FORM_FACTORS = ['desktop', 'mobile'] as const

/**
 * The archetypes a dispatcher can actually reach, each one ONCE.
 *
 * This used to append `__default__: DefaultPraxisDetail` to the registry, the
 * way `archetypeSlots.test.tsx` does. For a slot-PRESENCE guard that is cheap
 * belt-and-braces; for a byte-identity gate it was 20 of 200 rows restating 20
 * others, because `factions/default.ts` registers that same component under
 * `na` (`praxisDetail: () => DefaultPraxisDetail`). Twenty duplicate hashes
 * assert nothing the twenty above them did not.
 *
 * The relationship they were standing in for is worth keeping, though, so it
 * is asserted ONCE and by name in `na is the Default archetype` below —
 * which is strictly more than the duplicate rows said, since it fails loudly
 * if the two ever diverge instead of silently recording that they did.
 *
 * They cannot be de-duplicated by identity: the registry hands back the
 * `lazyArchetype()` wrapper (`factions/lazyArchetype.tsx`), so `na`'s entry is
 * not `===` the raw import even though it renders the same tree.
 */
function archetypes(): Record<string, ComponentType<{ state: PraxisDetailState }>> {
  return surfaceMap('praxisDetail') as Record<
    string,
    ComponentType<{ state: PraxisDetailState }>
  >
}

/**
 * The markup one archetype produces in one state at one form factor.
 *
 * Exported shape rather than inlined so that a failing row can be re-rendered
 * by hand — `console.log(capture(...))` — without rebuilding the premise.
 */
function capture(
  Archetype: ComponentType<{ state: PraxisDetailState }>,
  build: () => PraxisDetailState,
  formFactor: 'desktop' | 'mobile',
): string {
  mocks.formFactor = formFactor
  return markup(<Archetype state={build()} />).html
}

function digest(html: string): string {
  return createHash('sha256').update(html).digest('hex').slice(0, 16)
}

// ─── The pin, asserted before anything is hashed ─────────────────────────────
//
// Every hash below is only meaningful if the render is reproducible, and both
// halves of that are ambient state this file does not own. If either drifts,
// EVERY row moves at once and none of the movement means anything — which is a
// failure mode that costs an afternoon to read backwards, because 200 changed
// hashes look like a catastrophic regression and are in fact one `<div>`.
//
// So the environment is stated as its own case, and it fails by NAME. The
// locale is asserted rather than pinned because Node offers no runtime lever
// for it the way it does for `TZ`: if this row is what went red, the fix is to
// run the suite under `LANG=en_US.UTF-8`, not to re-record the snapshot.
describe('the render environment is pinned', () => {
  it('renders in UTC, so a byline timestamp is the same string everywhere', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
  })

  it('renders in en-US, which is the locale the snapshot was captured under', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().locale).toBe('en-US')
  })

  it('formats the fixture instant the way the snapshot expects', () => {
    // The one node that broke this file the first time, asserted directly:
    // `2026-01-02T00:00:00Z` is midnight UTC and is NOT the previous evening.
    expect(
      new Date(PRAXIS.submitted_at!).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    ).toBe('Jan 2, 2026, 12:00 AM')
  })
})

describe('na is the Default archetype', () => {
  it('renders byte-identically through the registry and by direct import', () => {
    // What the twenty `__default__` rows used to say, said once and as a
    // relationship rather than as a coincidence of two hashes matching.
    // `factions/default.ts` registers `DefaultPraxisDetail` under `na`; if that
    // ever stops being true this fails here, naming the state it broke in,
    // instead of quietly re-recording two columns that no longer agree.
    for (const [name, build] of Object.entries(STATES)) {
      for (const formFactor of FORM_FACTORS) {
        const viaRegistry = capture(archetypes().na, build, formFactor)
        const viaImport = capture(DefaultPraxisDetail, build, formFactor)
        expect(viaImport, `${name}/${formFactor}`).toBe(viaRegistry)
      }
    }
  })
})

describe('praxis-detail markup is byte-stable across the registry', () => {
  it('every archetype × state × form factor hashes to its recorded markup', () => {
    const rows: string[] = []
    for (const [slug, Archetype] of Object.entries(archetypes()).sort()) {
      for (const [name, build] of Object.entries(STATES)) {
        for (const formFactor of FORM_FACTORS) {
          const html = capture(Archetype, build, formFactor)
          // A blank page would hash stably and prove nothing — the non-vacuity
          // half, in the shape `singularityRoleReads.test.ts` uses.
          expect(html.length, `${slug}/${name}/${formFactor} rendered nothing`).toBeGreaterThan(
            2000,
          )
          rows.push(`${slug} · ${name} · ${formFactor} → ${digest(html)}`)
        }
      }
    }
    expect(rows.join('\n')).toMatchSnapshot()
  })
})

// ─── The frozen-four row: the score stamp on its own ─────────────────────────
//
// The page hashes above already contain the stamp, but a whole-page hash cannot
// say WHICH subtree moved when it changes. `ScoreStamp` is the one piece of this
// surface whose appearance is frozen by name, so it gets its own row: rendered
// per faction task slug, because the stamp dispatches on the TASK's faction
// (ADR-0053) and not on the host page's.

const { default: ScoreStamp } = await import(
  '../../../components/praxisCard/scoreStamp/ScoreStamp'
)

describe('ScoreStamp is byte-stable per task faction', () => {
  it('hashes to its recorded markup for every dispatch slug', () => {
    // `na` is appended because the stamp dispatches on the TASK's faction, and
    // an unaffiliated task is a reading the registry does not have to carry —
    // de-duplicated because the praxis-detail registry happens to hold it too.
    const slugs = [...new Set([...Object.keys(surfaceMap('praxisDetail')), 'na'])].sort()
    const rows = slugs.map((slug) => {
      const html = markup(
        <ScoreStamp praxis={{ ...PRAXIS, task_faction_slug: slug, is_top_for_task: true }} />,
      ).html
      expect(html.length, `ScoreStamp/${slug} rendered nothing`).toBeGreaterThan(200)
      return `${slug} → ${digest(html)}`
    })
    expect(rows.join('\n')).toMatchSnapshot()
  })
})
