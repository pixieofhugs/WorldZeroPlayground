import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, afterEach } from 'vitest'
import {
  buildArrayReadout,
  printTheArray,
  readsTheArray,
} from '../TheArray'
import type { GameConfigOut } from '../../api/gameConfig'
import { setAlbescentRevealed } from '../../utils/factions'

/**
 * Singularity's perk (#1869). The seam under test is `buildArrayReadout` — the
 * pure function that turns the `/game-config` payload into what the console
 * shows — because that is where both standing rules are enforceable:
 *
 *   1. it may only print from responses the client already received, and
 *   2. it prints a CURATED ALLOWLIST of named values, never a raw dump.
 *
 * Rule 1 is proved by the signature: the function takes the game config and
 * nothing else, so no `/auth/me` field can reach the console however the caller
 * is wired. Rule 2 is what the tests below actually defend, because it is the
 * one a well-meaning simplification breaks silently — swap the hand-written
 * object literal for `{ ...faction }` and every other test in this repo still
 * passes while a field name nobody vetted starts printing.
 */

const EXPECTED_TOP_LEVEL_KEYS = ['rules', 'factions', 'level_profiles']

const EXPECTED_RULE_KEYS = [
  'level_thresholds',
  'duel_level_required',
  'max_task_signups',
  'collab_auto_submit_days',
  'pending_task_admin_review_hours',
]

const EXPECTED_FACTION_KEYS = [
  'slug',
  'own_task_modifier',
  'other_task_modifier',
  'collab_own_modifier',
  'collab_other_modifier',
  'duel_win_modifier',
  'duel_loss_modifier',
  'reads_the_array',
]

function makeFaction(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    own_task_modifier: 1,
    other_task_modifier: 1,
    collab_own_modifier: 1,
    collab_other_modifier: 1,
    duel_win_modifier: 1.5,
    duel_loss_modifier: 0.5,
    reads_the_array: slug === 'singularity',
    takes_duel_ties: false,
    ...overrides,
  }
}

function makeConfig(overrides: Partial<GameConfigOut> = {}): GameConfigOut {
  return {
    era_name: 'Era 1',
    level_thresholds: [0, 10, 25],
    duel_level_required: 3,
    collab_auto_submit_days: 7,
    pending_task_admin_review_hours: 48,
    max_task_signups: 3,
    factions: [
      makeFaction('singularity'),
      makeFaction('coven', { collab_own_modifier: 1.1 }),
      makeFaction('albescent'),
    ],
    level_profiles: [
      { rank_key: 'era_1.level_0', unlocks: [] },
      {
        rank_key: 'era_1.level_1',
        unlocks: [{ kind: 'ability', key: 'propose_task' }],
      },
    ],
    ...overrides,
  }
}

// The reveal flag is module-level and outlives the case that sets it, so a
// leaked `true` would make a later assertion pass for the wrong reason.
afterEach(() => setAlbescentRevealed(false))

describe('the gate', () => {
  it('is the config flag, not the slug', () => {
    const config = makeConfig()
    expect(readsTheArray('singularity', config)).toBe(true)
    expect(readsTheArray('coven', config)).toBe(false)
  })

  it('follows the flag when it moves — the proof it is not a slug comparison', () => {
    const moved = makeConfig({
      factions: [
        makeFaction('singularity', { reads_the_array: false }),
        makeFaction('coven', { reads_the_array: true }),
      ],
    })
    expect(readsTheArray('singularity', moved)).toBe(false)
    expect(readsTheArray('coven', moved)).toBe(true)
  })

  it('stays shut for the unaffiliated, the unknown and the not-yet-loaded', () => {
    const config = makeConfig()
    expect(readsTheArray('na', config)).toBe(false)
    expect(readsTheArray('not-a-faction', config)).toBe(false)
    expect(readsTheArray(null, config)).toBe(false)
    expect(readsTheArray('singularity', null)).toBe(false)
  })
})

describe('standing rule 2: the printed set is the allowlist and nothing else', () => {
  it('prints exactly the named keys', () => {
    const readout = buildArrayReadout(makeConfig())

    expect(Object.keys(readout).sort()).toEqual([...EXPECTED_TOP_LEVEL_KEYS].sort())
    expect(Object.keys(readout.rules).sort()).toEqual([...EXPECTED_RULE_KEYS].sort())
    for (const faction of readout.factions) {
      expect(Object.keys(faction).sort()).toEqual([...EXPECTED_FACTION_KEYS].sort())
    }
    for (const profile of readout.level_profiles) {
      expect(Object.keys(profile).sort()).toEqual(['rank_key', 'unlocks'])
      for (const unlock of profile.unlocks) {
        expect(Object.keys(unlock).sort()).toEqual(['key', 'kind'])
      }
    }
  })

  /**
   * THE ONE THAT MATTERS. This is the test that fails if someone swaps the
   * hand-written literal for a spread of the payload object.
   *
   * The field names are the #1869 worked example verbatim: `/auth/me` carries
   * `can_start_as_albescent` as a KEY, so a dump leaks the word "Albescent" to
   * a player never revealed to it — the secret escaping through the key rather
   * than the value, which standing rule 1 permits because the payload was
   * already received. Rule 2 is the only thing that stops it, and this is rule
   * 2's tripwire.
   */
  it('does not print a field added to the payload tomorrow', () => {
    const withNewFields = makeConfig({
      factions: [
        makeFaction('singularity', {
          can_start_as_albescent: true,
          albescent_level_required: 8,
        }),
      ],
    }) as GameConfigOut & Record<string, unknown>
    withNewFields.second_character_level_required = 5
    withNewFields.some_future_rule = 'leaked'

    const readout = buildArrayReadout(withNewFields)
    const printed = JSON.stringify(readout)

    expect(printed).not.toContain('albescent')
    expect(printed).not.toContain('second_character_level_required')
    expect(printed).not.toContain('some_future_rule')
    expect(Object.keys(readout.factions[0])).toEqual(EXPECTED_FACTION_KEYS)
  })

  it('carries the values through unchanged — an allowlist, not a redaction', () => {
    const readout = buildArrayReadout(makeConfig())
    const coven = readout.factions.find((faction) => faction.slug === 'coven')

    expect(coven?.collab_own_modifier).toBe(1.1)
    expect(readout.rules.level_thresholds).toEqual([0, 10, 25])
    expect(readout.rules.pending_task_admin_review_hours).toBe(48)
    expect(readout.level_profiles[1].unlocks[0]).toEqual({
      kind: 'ability',
      key: 'propose_task',
    })
  })

  /**
   * The joke the perk runs on (#1869): every faction's modifiers are printed
   * and Singularity's row is the era baseline on every axis. Smoothing that
   * away — handing it a multiplier, or hiding its row — is the one change that
   * breaks the perk without breaking anything else.
   */
  it("leaves Singularity's row visible and blank", () => {
    const readout = buildArrayReadout(makeConfig())
    const singularity = readout.factions.find(
      (faction) => faction.slug === 'singularity',
    )

    expect(singularity).toBeDefined()
    expect(singularity?.own_task_modifier).toBe(1)
    expect(singularity?.collab_own_modifier).toBe(1)
    expect(singularity?.reads_the_array).toBe(true)
  })
})

/**
 * ADR-0027. `/game-config` is NOT one of the routes that withholds Albescent —
 * it serialises `CURRENT_ERA.factions` whole, so the slug is in this payload
 * for every caller. Standing rule 1 would therefore permit printing it, and the
 * console would hand an unrevealed player the secret society's name. The
 * readout drops the row instead, on the same predicate the choosers use.
 */
describe('ADR-0027: the array does not surface Albescent', () => {
  it('drops the row for a viewer who has not been revealed', () => {
    const printed = JSON.stringify(buildArrayReadout(makeConfig()))
    expect(printed).not.toContain('albescent')
  })

  it('prints it once the account has been revealed — the secret is already out', () => {
    setAlbescentRevealed(true)
    const slugs = buildArrayReadout(makeConfig()).factions.map((f) => f.slug)
    expect(slugs).toContain('albescent')
  })
})

/**
 * The thing most likely to kill this silently (#1869).
 *
 * Console output surviving the production build is load-bearing and invisible:
 * nothing about `printTheArray` announces that the whole perk depends on the
 * bundler leaving `console.*` alone. A future `esbuild: { drop: ['console'] }`
 * is a normal, sensible optimisation that would delete a faction's entire perk
 * with no failing test and nobody noticing. This is the failing test.
 */
describe('console-stripping tripwire', () => {
  /**
   * Read as SOURCE rather than imported, which is not squeamishness: `vite.config.ts`
   * belongs to the `tsconfig.node.json` composite project, so importing it from
   * `src` fails `tsc --noEmit` with TS6305 before it can ever run.
   *
   * Comment lines are dropped first because the warning this pairs with quotes
   * the very flags it forbids, and would otherwise trip its own tripwire.
   */
  it('the build config configures no console stripping', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../../vite.config.ts', import.meta.url)),
      'utf8',
    )
    const code = source
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
      .join('\n')

    // Proof the comment stripper did its job — otherwise this test could pass
    // by reading an empty string.
    expect(code).toContain('defineConfig')

    // esbuild's two routes, and terser's, reachable via build.minify: 'terser'.
    expect(code).not.toMatch(/\bdrop\s*:/)
    expect(code).not.toMatch(/\bpure\s*:/)
    expect(code).not.toMatch(/\bdrop_console\b/)
    expect(code).not.toMatch(/\bpure_funcs\b/)
    expect(code).not.toMatch(/\bterserOptions\b/)
  })

  /**
   * The behavioural half, and the stronger one: vitest transforms this file
   * through the very `esbuild` options `vite.config.ts` sets, so configuring
   * `drop: ['console']` does not merely fail the assertion above — it really
   * deletes these calls and this test really stops seeing them. Verified by
   * setting the flag and watching both fail.
   */
  it('printTheArray actually reaches the console', () => {
    const calls: unknown[][] = []
    const log = console.log
    const table = console.table
    console.log = (...args: unknown[]) => calls.push(args)
    console.table = (...args: unknown[]) => calls.push(args)
    try {
      printTheArray(buildArrayReadout(makeConfig()))
    } finally {
      console.log = log
      console.table = table
    }
    expect(calls.length).toBe(2)
  })
})
