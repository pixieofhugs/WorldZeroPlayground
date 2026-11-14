/**
 * A list that DRIVES per-kit `.each` iteration is derived, not typed (#2815):
 * a hand-typed list silently stops being exhaustive. Slug arrays that are the
 * subject (fixtures, pair tables) aren't flagged. Typing is sometimes right
 * (`defaultManifest.test.tsx`: deriving from the subject is a tautology), so the
 * rule is "derive, or be in GRANDFATHERED with a reason".
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { sourceFiles, stripComments, toRelative } from '../sourceScan'

/** The nine kit slugs plus `default`. */
const SLUG_LITERAL =
  /['"](?:ua|wow|coven|snide|singularity|ephemerists|everymen|albescent|na|default)['"]/g

/** Any read that reaches the manifest rather than restating it. */
const DERIVED =
  /surfaceMap|FACTION_MANIFESTS|FACTION_RAINBOW_ORDER|Object\.(?:keys|entries)|CSS_KEY|KIT_MODULES|SURFACE_KEYS|MANIFESTS/

/** `<path from src/>|<const name>`: deliberate keeps, each not a kit-census claim. */
const GRANDFATHERED: ReadonlySet<string> = new Set([
  // A copy decision record pinned by value; the range is a derived loop there.
  'components/__tests__/invitationPerks.test.tsx|MECHANICS',
  // A record of the three #2042 unifications; the manifest can't know them.
  'components/praxisCard/scoreStamp/__tests__/pointsMarkUnification.test.tsx|UNIFIED',
  // A contrast pair table of ground stacks; nothing else holds that mapping.
  'pages/characterPaths/__tests__/placeholderInk.test.ts|FIELDS',
  // The six edit tails' ground stacks and plate tokens; only two have a role map to derive from.
  'pages/characterPaths/__tests__/editCharacterTailContrast.test.ts|TAILS',
  // A renderer census (four code paths, #1626), not a kit census.
  'pages/characterProfile/__tests__/profileAbout.test.tsx|BRANCHES',
])

function typedLoopLists(): string[] {
  const found: string[] = []
  for (const file of sourceFiles({ includeTests: true })) {
    if (!/\.test\.tsx?$/.test(file)) continue
    const source = stripComments(readFileSync(file, 'utf8'))
    const rel = toRelative(file).replace(/\\/g, '/').replace(/^src\//, '')

    const looped = new Set(
      [...source.matchAll(/(?:it|describe|test)\.each\(\s*([A-Za-z_]\w*)/g)].map((m) => m[1]),
    )
    for (const name of looped) {
      // One-line array FIRST: the multi-line branch would run past a `]` on the
      // declaring line and swallow the next function body.
      const decl = new RegExp(
        `const\\s+${name}\\b[^=]*=\\s*(\\[[^\\]\\n]*\\]|\\[[\\s\\S]*?\\n\\s*\\])`,
      ).exec(source)
      if (!decl) continue
      const body = decl[1]
      const slugs = body.match(SLUG_LITERAL)?.length ?? 0
      if (slugs >= 3 && !DERIVED.test(body)) found.push(`${rel}|${name}`)
    }
  }
  return found.sort()
}

const TYPED = typedLoopLists()

describe('a list driving per-kit iteration is derived from the manifest', () => {
  // Tripwire: a scanner that stopped matching would report a perfect board.
  it('still finds the typed lists it is meant to be watching', () => {
    // A named anchor, not a count (the list should shrink to zero).
    expect(TYPED, 'the scan must still see a known typed list').toContain(
      'components/__tests__/invitationPerks.test.tsx|MECHANICS',
    )
  })

  it('adds no new typed list', () => {
    const fresh = TYPED.filter((entry) => !GRANDFATHERED.has(entry))
    expect(
      fresh,
      'Derive this list from surfaceMap()/FACTION_MANIFESTS so a tenth kit joins by existing. ' +
        'If typing it is deliberate — see defaultManifest.test.tsx on the tautology trap — ' +
        'add it to GRANDFATHERED with the reason in your PR.',
    ).toEqual([])
  })

  it('keeps no grandfathered entry that has already been converted', () => {
    const live = new Set(TYPED)
    const stale = [...GRANDFATHERED].filter((entry) => !live.has(entry)).sort()
    expect(
      stale,
      'these lists are derived now (or gone) — delete them from GRANDFATHERED so the ratchet holds',
    ).toEqual([])
  })
})
