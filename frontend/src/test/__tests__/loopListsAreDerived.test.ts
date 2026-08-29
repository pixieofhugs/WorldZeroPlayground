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
 * THIS IS A RATCHET. The entries below are grandfathered: they exist today and
 * #2815 is converting them, a few per PR. The guard's job is that a new one
 * cannot appear quietly. Removing an entry as it is converted is the intended
 * direction; adding one needs a reason in the review, not just a green suite.
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
 * `<path from src/>|<const name>` for every typed list driving a `.each` today.
 * Shrinks as #2815 converts them; it must never grow without a reason.
 */
const GRANDFATHERED: ReadonlySet<string> = new Set([
  'components/__tests__/feedRow.test.tsx|FILL_SLUGS',
  'components/__tests__/invitationPerks.test.tsx|MECHANICS',
  'components/collab/__tests__/collabCopy.test.ts|FACTION_SLUGS',
  'components/comments/__tests__/commentFootRule.test.tsx|VOICES',
  'components/comments/__tests__/mentionPopoverClip.test.tsx|VOICES',
  'components/factionHero/__tests__/factionWordmarkWrap.test.tsx|HEROES',
  'components/feed/__tests__/feedRowInk.test.tsx|CASES',
  'components/praxisCard/__tests__/bylineDivider.test.tsx|DASHED',
  'components/praxisCard/__tests__/praxisMasthead.test.tsx|BANDED',
  'components/praxisCard/scoreStamp/__tests__/pointsMarkUnification.test.tsx|UNIFIED',
  'components/sigil/__tests__/factionSigil.test.tsx|SLUGS',
  'components/taskCard/__tests__/factionTaskCardsV2.test.tsx|SKINS',
  'components/taskCard/__tests__/mastheadFactionLink.test.tsx|MASTHEADED',
  'components/taskCard/__tests__/mobileCardFillsColumn.test.tsx|SKINS',
  'components/taskCard/__tests__/taskCardsV3.test.tsx|SKINS',
  'pages/characterPaths/__tests__/placeholderInk.test.ts|FIELDS',
  'pages/characterPaths/__tests__/singularityCreateCharacterRegister.test.tsx|WIDTHS',
  'pages/characterProfile/__tests__/factionProfileBody.test.tsx|SLUGS',
  'pages/characterProfile/__tests__/profileAbout.test.tsx|BRANCHES',
  'pages/editPraxis/archetypes/__tests__/collabSignals.test.tsx|SLUGS',
  'pages/editPraxis/archetypes/__tests__/composerDispatch.test.tsx|SLUGS',
  'pages/editPraxis/archetypes/__tests__/taskSlipLink.test.tsx|SLUGS',
  'pages/praxisDetail/__tests__/detailWallAlarmInk.test.tsx|WALL_ALARM',
  'pages/tasks/__tests__/equalHeightRow.test.tsx|SKINS',
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
      const decl = new RegExp(
        `const\\s+${name}\\b[^=]*=\\s*(\\[[\\s\\S]*?\\n\\s*\\]|\\[[^\\]]*\\])`,
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
    expect(TYPED.length, 'the scan matched nothing — the regexes have drifted').toBeGreaterThan(15)
    // homeTrackBand (the issue's worked example) converted in #2815 and its
    // GRANDFATHERED entry came off with it. Any still-typed survivor works as
    // the tripwire; equalHeightRow is one #2815 left for a later pass.
    expect(TYPED, 'the scan must still see a known typed list').toContain(
      'pages/tasks/__tests__/equalHeightRow.test.tsx|SKINS',
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
