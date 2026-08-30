/**
 * A list that DRIVES per-kit iteration is derived, not typed (#2814, #2815).
 *
 * A parameterised test looks exhaustive. Whether it is depends entirely on the
 * list it loops, and a hand-typed list is a population someone has to remember
 * to update. `pages/fieldDesk/__tests__/homeTrackBand.test.tsx` USED TO type
 * eight slugs under a comment reading "so all eight are checked" — there were
 * nine, and `AlbescentFieldDesk` is registered on `mobileFieldDesk`. The claim
 * outlived the list, which is worse than no claim at all; #2815 converted it,
 * so it is gone from GRANDFATHERED below and the tripwire now watches a
 * different survivor.
 *
 * WHAT THIS GUARD DOES NOT SAY. Not every slug array is wrong. A fixture, a
 * contrast pair table, an expected-order assertion — those name slugs because
 * the slugs ARE the subject. Sixty-one test files hold a slug array; only the
 * ones below drive a `.each`, and only those are making a completeness
 * claim. This guard is narrow on purpose.
 *
 * TYPING IS SOMETIMES RIGHT, AND THE EXCEPTION MATTERS.
 * `factions/__tests__/defaultManifest.test.tsx` types its surface list on
 * purpose, and says why: *"derived from the manifest it would assert that the
 * manifest equals itself, which is exactly the tautology that let the na kit
 * drift out of the registry in the first place."* A denominator taken from its
 * own subject proves nothing. So the rule is not "always derive" — it is
 * "derive, or be on this list having said why".
 *
 * THIS IS A RATCHET, AND #2815 HAS RUN IT DOWN. It started at 25 pending
 * conversions. Every one that was a completeness claim about the kits is now
 * derived; what is left below is four DELIBERATE keeps, each carrying its own
 * reason. The guard's job from here is that a new typed list cannot appear
 * quietly — adding an entry needs a reason in the review, not just a green suite.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { sourceFiles, stripComments, toRelative } from '../sourceScan'

/** A quoted faction slug — the nine kits plus the `default` archetype's name. */
const SLUG_LITERAL =
  /['"](?:ua|wow|coven|snide|singularity|ephemerists|everymen|albescent|na|default)['"]/g

/** Any read that reaches the manifest rather than restating it. */
const DERIVED =
  /surfaceMap|FACTION_MANIFESTS|FACTION_RAINBOW_ORDER|Object\.(?:keys|entries)|CSS_KEY|KIT_MODULES|SURFACE_KEYS|MANIFESTS/

/**
 * `<path from src/>|<const name>` for every typed list driving a `.each`.
 *
 * All four are DELIBERATE keeps — none is pending conversion. Each says why in
 * place, and the shape of the reason is always the same: the list is not a
 * claim about which kits exist. It must never grow without one.
 */
const GRANDFATHERED: ReadonlySet<string> = new Set([
  // A copy DECISION RECORD — seven [slug, name, desc] triples pinning the
  // owner's finished mechanic copy by value. The slugs are the subject beside
  // the strings, not the iteration range, and the range question (does every
  // letter still have a written mechanic?) is answered by the derived SLUGS
  // loop in the same file.
  'components/__tests__/invitationPerks.test.tsx|MECHANICS',
  // A record of the three factions #2042 unified, naming SOURCE FILE PATHS and
  // the declarations each surface retired. The subject is those three
  // unifications; the manifest does not know which kits unified their points
  // mark, so a derived range here would be a range over the wrong thing.
  'components/praxisCard/scoreStamp/__tests__/pointsMarkUnification.test.tsx|UNIFIED',
  // A CONTRAST PAIR TABLE: each row names a field's ground STACK, outermost
  // last, and the ink `currentColor` resolves to. Nothing derives a ground
  // stack — the table is the only place that mapping exists — and its two `na`
  // rows are two different fields rather than one kit. The file's own header
  // carries the range instruction ("if a ninth plate ever paints a field, add
  // its row").
  'pages/characterPaths/__tests__/placeholderInk.test.ts|FIELDS',
  // A RENDERER census, not a kit census: four code paths reach the shared About
  // block, and `coven` and `wow` are named as SAMPLES that reach two of them
  // (WOW's phone stack is bespoke — the fourth renderer #1626 missed). Deriving
  // over the nine kits would quietly replace the question this file asks.
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
      // A ONE-LINE array is tried FIRST, and it may not contain a newline. The
      // multi-line alternative stops at the first `\n]`, so on
      // `const WIDTHS = ['desktop', 'mobile'] as const` — whose `]` is on the
      // declaring line — it ran on past the declaration and swallowed the next
      // function body, reporting a two-element form-factor list as a typed slug
      // list. #2815 found it grandfathered on that basis. Ordering the
      // alternation this way costs nothing: an array whose contents start with a
      // newline cannot match the first branch, so nested lists still fall
      // through to the second.
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
  // The tripwire. This guard's whole output is a list of things that are WRONG,
  // so a scanner that silently stopped matching would report a perfect board.
  it('still finds the typed lists it is meant to be watching', () => {
    // A NAMED ANCHOR, NOT A COUNT. This used to read `toBeGreaterThan(15)`,
    // which is a floor on a list that is supposed to reach zero — it fails on a
    // correct conversion and says nothing a drifted regex would not also say.
    // Naming a survivor is strictly stronger: it fails just as loudly if the
    // scan matches nothing, and it keeps working down to the last entry. When
    // the last typed list is converted, this whole `it()` goes with it.
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
