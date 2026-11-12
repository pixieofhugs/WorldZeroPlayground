/**
 * #1400 ratchet: no hand-written `interface` in `api/` may claim a schema type
 * name (it would shadow the alias and drift silently). A cheap text scan, not
 * an AST walk. Names the schema doesn't own (`TaskFilters`) are fine.
 */
import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { sourceFiles } from '../../test/sourceScan'

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEMA_PATH = join(API_DIR, 'generated', 'schema.d.ts')

/**
 * Members of `components['schemas']` sit at exactly eight spaces. Enums count
 * too (`Name: "a" | ...`): they are as mirrorable as models.
 */
function schemaTypeNames(): Set<string> {
  const names = new Set<string>()
  for (const line of readFileSync(SCHEMA_PATH, 'utf8').split('\n')) {
    const match = /^ {8}(\w+): [{"]/.exec(line)
    if (match) names.add(match[1])
  }
  return names
}

function declaredTypes(source: string): string[] {
  return [...source.matchAll(/^export (?:interface|type) (\w+)\b/gm)].map(
    (match) => match[1],
  )
}

function aliasedTypes(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/^export type (\w+) =[^\n]*components\['schemas'\]/gm)].map(
      (match) => match[1],
    ),
  )
}

/**
 * Each is a place where the GENERATED type is less accurate; adding one means
 * arguing the schema is wrong, which is a backend issue.
 */
const DELIBERATE_MIRRORS: Record<string, string> = {
  ActivityFeedResponse: '#1402 — typed feed payloads',
  // Generator treats request-body defaults as required; the server accepts `{display_name}` alone.
  CharacterCreate: 'generator emits request-body defaults as required',
  // Backend fix: a `StrEnum` on `kind`.
  GameConfigOut: 'LevelUnlockOut.kind is a bare str, not an enum',
  // Backend fix: a `StrEnum` on each.
  RelationshipListItem: 'type and status are bare str, not enums',
}

// Top level only: `generated/schema.d.ts` would match as a mirror of everything.
const API_MODULES = sourceFiles({ dir: API_DIR, match: /\.ts$/ })
  .filter((path) => dirname(path) === API_DIR)
  .map((path) => ({ name: basename(path), source: readFileSync(path, 'utf8') }))

describe('api modules do not re-declare a type the schema already defines', () => {
  const schemaNames = schemaTypeNames()

  it('finds the generated schema, so a rename cannot quietly disarm this', () => {
    // Guards against passing vacuously on a moved schema.
    expect(schemaNames.size).toBeGreaterThan(100)
    expect(schemaNames).toContain('PraxisOut')
    expect(schemaNames).toContain('TaskOut')
  })

  it('has some api modules to check', () => {
    expect(API_MODULES.length).toBeGreaterThan(10)
  })

  for (const { name, source } of API_MODULES) {
    if (name.startsWith('generated')) continue
    it(`${name} declares no mirror of a schema type`, () => {
      const aliases = aliasedTypes(source)
      const mirrors = declaredTypes(source).filter(
        (declared) =>
          schemaNames.has(declared) &&
          !aliases.has(declared) &&
          !(declared in DELIBERATE_MIRRORS),
      )
      expect(
        mirrors,
        `hand-written in ${name} but already defined by the OpenAPI schema — ` +
          `write \`export type X = components['schemas']['X']\` instead (#1400)`,
      ).toEqual([])
    })
  }

  it('keeps the exception list honest — no entry outlives its mirror', () => {
    // A stale row would excuse the next mirror to take that name.
    const stillHandWritten = new Set(
      API_MODULES.flatMap(({ name, source }) =>
        name.startsWith('generated')
          ? []
          : declaredTypes(source).filter((declared) => !aliasedTypes(source).has(declared)),
      ),
    )
    const stale = Object.keys(DELIBERATE_MIRRORS).filter(
      (excused) => !stillHandWritten.has(excused),
    )
    expect(stale, 'excused in DELIBERATE_MIRRORS but no longer hand-written').toEqual([])
  })
})
