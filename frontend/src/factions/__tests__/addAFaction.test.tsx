/**
 * The executable "add a faction" checklist (#782).
 *
 * SPEC-faction-ui-profile.md §4 used to be a hand-written list of every
 * dispatcher a new faction had to be registered in. It was stale the day it was
 * written — it documented seven of thirty registries and nothing checked it.
 * This file replaces it. It is the guard that lets that section be deleted.
 *
 * Two things are asserted:
 *
 *  1. A faction that exists ONLY as a manifest renders on every surface, with no
 *     dispatcher edit anywhere. That is the promise the manifest makes.
 *  2. Nobody has re-introduced a surface-owned slug→component registry, which is
 *     the exact regression this refactor exists to prevent.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import { FACTION_MANIFESTS, buildSurfaceMap, SURFACE_KEYS } from '..'
import type { FactionManifest, FactionSurface } from '..'

/* -------------------------------------------------------------------------- */
/* 1. A manifest-only faction renders everywhere                              */
/* -------------------------------------------------------------------------- */

const FAKE_SLUG = 'testonly_cartographers'
const MARKER = 'cartographers-marker'

function FakeArchetype() {
  return <div>{MARKER}</div>
}

/**
 * A faction that claims EVERY surface, built by walking SURFACE_KEYS rather
 * than by hand — so a surface added to `FactionManifest` is covered here the
 * moment it exists, instead of being silently skipped.
 */
const FAKE_MANIFEST = {
  slug: FAKE_SLUG,
  ...Object.fromEntries(SURFACE_KEYS.map((surface) => [surface, () => FakeArchetype])),
} as unknown as FactionManifest

const WITH_FAKE = [...FACTION_MANIFESTS, FAKE_MANIFEST]

describe('a faction that exists only as a manifest', () => {
  for (const surface of SURFACE_KEYS) {
    it(`renders on the ${surface} surface with no dispatcher edit`, () => {
      const map = buildSurfaceMap(WITH_FAKE, surface as FactionSurface)
      const Resolved = map[FAKE_SLUG] as typeof FakeArchetype | undefined

      expect(
        Resolved,
        `The '${surface}' surface did not pick up a faction that declared it.\n` +
          `Every surface must resolve through surfaceMap('${surface}') — if you just\n` +
          `added a dispatcher, route it through the manifest instead of giving it\n` +
          `its own slug-keyed map.`,
      ).toBeDefined()

      const Rendered = Resolved as typeof FakeArchetype
      expect(renderToStaticMarkup(<Rendered />)).toContain(MARKER)
    })
  }

  it('leaves undeclared surfaces to the Default archetype', () => {
    // The override-only contract: a faction declaring nothing claims nothing,
    // so every surface falls through to its own Default.
    const bare: FactionManifest = { slug: 'testonly_bare' }
    for (const surface of SURFACE_KEYS) {
      const map = buildSurfaceMap([bare], surface as FactionSurface)
      expect(map['testonly_bare'], `${surface} should be unclaimed`).toBeUndefined()
    }
  })

  it('does not leak the fake faction into the real manifest index', () => {
    expect(FACTION_MANIFESTS.map((manifest) => manifest.slug)).not.toContain(FAKE_SLUG)
  })
})

/* -------------------------------------------------------------------------- */
/* 2. No surface-owned registry has come back                                 */
/* -------------------------------------------------------------------------- */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Slug-keyed literal whose value is a component reference, e.g. `ua: UaCard`. */
const REGISTRY_ROW =
  /^\s*(ua|wow|coven|snide|ephemerists|singularity|everymen|albescent)\s*:\s*[A-Z]\w*\s*,?\s*$/gm

/**
 * Files allowed to map faction slugs to capitalised values.
 *
 * Only test fixtures are listed: the per-faction `*Dispatch.test.tsx` suites
 * legitimately build a slug→component table to assert what the manifest
 * resolves to. Production data maps (CSS keys in utils/factions.ts, i18n keys in
 * DefaultProposeTask, copy in voteReframes) key slugs to STRINGS and so never
 * match REGISTRY_ROW in the first place.
 */
function isAllowed(path: string): boolean {
  return path.includes('__tests__')
}

function sourceFiles(directory: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (/\.tsx?$/.test(entry.name)) found.push(full)
  }
  return found
}

describe('no surface-owned faction registry', () => {
  it('finds no slug→component map outside the faction manifests', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      if (isAllowed(file)) continue
      const rows = readFileSync(file, 'utf8').match(REGISTRY_ROW) ?? []
      // Two rows could be a coincidence; three is a registry.
      if (rows.length >= 3) offenders.push(relative(SRC, file).replace(/\\/g, '/'))
    }

    expect(
      offenders,
      `These files map faction slugs straight to components:\n` +
        offenders.map((file) => `  - ${file}`).join('\n') +
        `\n\nThat is the pattern #782 removed. A surface must not own a registry of\n` +
        `every faction; each faction declares the surface in its own manifest\n` +
        `(src/factions/<slug>.ts) and the dispatcher calls surfaceMap('<surface>').`,
    ).toEqual([])
  })
})
