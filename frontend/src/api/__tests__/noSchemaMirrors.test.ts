/**
 * The ratchet for #1400: a mirror cannot come back.
 *
 * Every response type in `api/*.ts` used to be a hand-written TypeScript copy of
 * a Pydantic model. Copies drift, and this one did: `PraxisOut.voter_count` was
 * on the wire and not in the mirror, `FactionOut.status` had been on the wire
 * since #461 and the client had never seen it, and two dozen fields were spelled
 * optional with comments explaining that the backend always sends them.
 *
 * The aliases fixed that by construction. What they cannot do is stop the NEXT
 * person from typing `export interface PraxisOut { … }` under it, which would
 * shadow the alias inside the module and reintroduce exactly the drift the
 * migration removed — silently, because a fresh mirror typechecks fine.
 *
 * So this reads the schema's own type names out of the generated file and
 * refuses any `interface` in `api/` that claims one. Deliberately a text scan
 * and not an AST walk: the whole value is in it being cheap enough to keep.
 *
 * A hand-written type whose NAME the schema does not define is fine and stays
 * fine — query-parameter bags (`TaskFilters`), 422 detail shapes
 * (`TaskImportRowError`) and client-side unions (`CommentTarget`) mirror
 * nothing. This only guards the names the schema already owns.
 */
import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { sourceFiles } from '../../test/sourceScan'

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEMA_PATH = join(API_DIR, 'generated', 'schema.d.ts')

/**
 * The names under `components['schemas']` in the generated file.
 *
 * They sit at exactly eight spaces of indentation — `export interface
 * components` → `schemas:` → the member — so the depth is what identifies them
 * without parsing. A member is either `Name: {` (an object) or `Name: "a" |
 * "b";` (an enum), and both spellings count: an enum is as mirrorable as a
 * model, which is how `TaskStatus` got hand-written as a bare `string`.
 */
function schemaTypeNames(): Set<string> {
  const names = new Set<string>()
  for (const line of readFileSync(SCHEMA_PATH, 'utf8').split('\n')) {
    const match = /^ {8}(\w+): [{"]/.exec(line)
    if (match) names.add(match[1])
  }
  return names
}

/** Every `export interface X` / `export type X` declared in an `api/*.ts`. */
function declaredTypes(source: string): string[] {
  return [...source.matchAll(/^export (?:interface|type) (\w+)\b/gm)].map(
    (match) => match[1],
  )
}

/** `export type X = components['schemas'][…]` — an alias, not a mirror. */
function aliasedTypes(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/^export type (\w+) =[^\n]*components\['schemas'\]/gm)].map(
      (match) => match[1],
    ),
  )
}

/**
 * The four names #1400 left hand-written, and why each one is not an oversight.
 *
 * This list is the migration's remaining ledger, not an escape hatch. Every
 * entry is a place where the GENERATED type is the less accurate of the two, so
 * aliasing it would lose information rather than gain it — and every entry
 * names the backend change that would let it go. Adding a row means arguing
 * that the schema is wrong, which is a backend issue, not a frontend one.
 */
const DELIBERATE_MIRRORS: Record<string, string> = {
  // The schema's feed item is a fifteen-arm discriminated union with a typed
  // payload per arm; the client's is one flat shape with an untyped payload
  // every consumer narrows by hand. Adopting the union is a migration of those
  // consumers — issue #1402 — and renaming the type without it would only move
  // the `any` somewhere less obvious.
  ActivityFeedResponse: '#1402 — typed feed payloads',
  // `openapi-typescript` reads "has a default" as "always present", which is
  // right for a response and backwards for a request body, where a default is
  // exactly what makes a field omissible. The generated `CharacterCreate`
  // demands `bio`, `avatar_url` and `location`; the server accepts
  // `{display_name}` alone and `buildCreatePayload` sends that.
  CharacterCreate: 'generator emits request-body defaults as required',
  // `LevelUnlockOut.kind` is a bare `str` server-side, so the generated type
  // cannot say `'ability' | 'sense'`. The gap propagates up through
  // `LevelProfileOut` to here. Fix is a backend `StrEnum` on `kind`.
  GameConfigOut: 'LevelUnlockOut.kind is a bare str, not an enum',
  // Same shape of gap, for two of the three: `type` and `status` are bare `str`
  // in `schemas/relationship.py` though only a fixed set is ever written, and
  // the UI branches on those sets. Fix is a backend `StrEnum` on each.
  RelationshipListItem: 'type and status are bare str, not enums',
}

// Top-level api/*.ts only — `sourceFiles()` recurses into api/generated/ and
// api/__tests__/ too, and neither belongs here: generated/schema.d.ts is the
// schema itself, not a hand-written module, and it ends in ".ts" so a plain
// extension match would pull it in as a "mirror" of every type it declares.
const API_MODULES = sourceFiles({ dir: API_DIR, match: /\.ts$/ })
  .filter((path) => dirname(path) === API_DIR)
  .map((path) => ({ name: basename(path), source: readFileSync(path, 'utf8') }))

describe('api modules do not re-declare a type the schema already defines', () => {
  const schemaNames = schemaTypeNames()

  it('finds the generated schema, so a rename cannot quietly disarm this', () => {
    // Without this, a moved or renamed `schema.d.ts` would give an empty name
    // set and every assertion below would pass by vacuum.
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
    // A row left behind after its type was aliased or deleted would sit there
    // silently excusing a name nobody is writing, and the next mirror to take
    // that name would inherit the excuse.
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
