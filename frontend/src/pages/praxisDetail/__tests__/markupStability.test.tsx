/**
 * Markup byte-stability gate (#2718). `ScoreStamp` is one of the frozen four,
 * so a consolidation must move code, not pixels. Every registered archetype ×
 * state × form factor is rendered and its SHA-256 snapshotted (hashes, since
 * the markup would be ~5 MB).
 *
 * On a failure, explain before re-recording: diff one row's raw markup
 * (`capture()`) and say per subtree in the PR what moved and why. If every row
 * moves, suspect the harness (the TZ incident below). Only then:
 *
 *     npx vitest run src/pages/praxisDetail/__tests__/markupStability.test.tsx -u
 */
import { createHash } from 'node:crypto'
import { describe, it, expect, vi } from 'vitest'
import type { ComponentType } from 'react'
import { aMetatask, aDuel } from '../../../test/fixtures'
import type { PraxisDetailState } from '../usePraxisDetail'

// LOAD-BEARING: pin to UTC. `formatTimestamp` uses the ambient timezone, so a
// non-UTC capture changed every row's byline. Setting `process.env.TZ` at
// runtime re-points `Intl` on Node 26; it runs before the dynamic imports, and
// a guard case below asserts the pin took.
process.env.TZ = 'UTC'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'desktop' | 'mobile' }))
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

const { surfaceMap } = await import('../../../factions')
const { default: DefaultPraxisDetail } = await import('../archetypes/DefaultPraxisDetail')
const { aPraxisDetailState, aWalkedPraxis, anOwner, markup, RIVAL, VOTERS } =
  await import('../../../test/praxisDetail')

const PRAXIS = aWalkedPraxis()

/** Premises other suites in this directory already render, named per row. */
const STATES: Record<string, () => PraxisDetailState> = {
  base: () => aPraxisDetailState({ praxis: PRAXIS }),
  crowned: () => aPraxisDetailState({ praxis: { ...PRAXIS, is_top_for_task: true } }),
  // #1538.
  failed: () =>
    aPraxisDetailState({
      praxis: {
        ...PRAXIS,
        moderation_status: 'failed',
        admin_note: 'The photo is of a different ridge.',
      },
    }),
  failedNoteless: () =>
    aPraxisDetailState({
      praxis: { ...PRAXIS, moderation_status: 'failed', admin_note: '' },
    }),
  flagged: () => aPraxisDetailState({ praxis: { ...PRAXIS, moderation_status: 'flagged' } }),
  // #932.
  sealed: () =>
    aPraxisDetailState({
      praxis: {
        ...PRAXIS,
        applied_metatasks: [aMetatask({ metatask_faction_slug: 'snide' })],
      },
    }),
  // base 10 × 1.1 + 14 = 25 (ADR-0053).
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
  owner: () =>
    aPraxisDetailState({ praxis: PRAXIS, isOwner: true, user: anOwner(), voters: VOTERS }),
  steward: () => aPraxisDetailState({ praxis: PRAXIS, showAdminBar: true }),
  duel: () =>
    aPraxisDetailState({
      praxis: { ...PRAXIS, duel_id: 5 },
      duel: aDuel({ id: 5, status: 'settled', challenger: RIVAL }),
    }),
}

const FORM_FACTORS = ['desktop', 'mobile'] as const

/**
 * Reachable archetypes, each once. No `__default__` row: `na` already
 * registers `DefaultPraxisDetail` (asserted below). Not dedupable by identity:
 * the registry returns a `lazyArchetype()` wrapper.
 */
function archetypes(): Record<string, ComponentType<{ state: PraxisDetailState }>> {
  return surfaceMap('praxisDetail') as Record<
    string,
    ComponentType<{ state: PraxisDetailState }>
  >
}

/** Separate so a failing row can be re-rendered by hand. */
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

// The environment, failing by NAME. Locale can't be pinned at runtime: if it
// goes red, run under `LANG=en_US.UTF-8`, don't re-record.
describe('the render environment is pinned', () => {
  it('renders in UTC, so a byline timestamp is the same string everywhere', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
  })

  it('renders in en-US, which is the locale the snapshot was captured under', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().locale).toBe('en-US')
  })

  it('formats the fixture instant the way the snapshot expects', () => {
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
          // Non-vacuity: a blank page would hash stably.
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

// `ScoreStamp` alone (frozen by name), per TASK faction slug (ADR-0053), so a
// stamp change is attributable.

const { default: ScoreStamp } = await import(
  '../../../components/praxisCard/scoreStamp/ScoreStamp'
)

describe('ScoreStamp is byte-stable per task faction', () => {
  it('hashes to its recorded markup for every dispatch slug', () => {
    // `na` appended (and deduped) for the unaffiliated task.
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
