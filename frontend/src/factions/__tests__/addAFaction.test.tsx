/**
 * The executable "add a faction" checklist (#782): a manifest-only faction
 * renders on every surface, and no surface-owned slug→component registry exists.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { sourceFiles as scanSource } from '../../test/sourceScan'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import { FACTION_MANIFESTS, buildSurfaceMap, SURFACE_KEYS } from '..'
import type { FactionManifest, FactionSurface } from '..'

const FAKE_SLUG = 'testonly_cartographers'
const MARKER = 'cartographers-marker'

function FakeArchetype() {
  return <div>{MARKER}</div>
}

/** Built from SURFACE_KEYS so a new surface is covered automatically. */
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

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Slug-keyed literal whose value is a component reference, e.g. `ua: UaCard`. */
const REGISTRY_ROW =
  /^\s*(ua|wow|coven|snide|ephemerists|singularity|everymen|albescent)\s*:\s*[A-Z]\w*\s*,?\s*$/gm

/** Only test fixtures; production slug maps key to strings and never match. */
function isAllowed(path: string): boolean {
  return path.includes('__tests__')
}

const sourceFiles = (directory: string) => scanSource({ dir: directory, includeTests: true })

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
