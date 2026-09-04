/**
 * No class token may run straight into a template interpolation (#2918).
 *
 * THE FAILURE THIS STANDS ON
 * --------------------------
 * Tailwind reads the source as text and keeps the utility candidates it can
 * recognise. `DuelSealSheet.tsx` wrote
 *
 *     `fixed inset-0 … overflow-y-auto${phoneClassName ? ` ${phoneClassName}` : ''}`
 *
 * v3's regex extractor kept `overflow-y-auto`; v4's scanner drops it. The rule
 * left the stylesheet, the class attribute went on naming it, and a full-screen
 * mobile dialog shipped unable to scroll. `npm run build`, `npm run lint`,
 * `npm run typecheck` and all 509 test files passed. It was found by diffing
 * the emitted class set of two builds by hand — which is not a check, it is a
 * person having a hunch on a Tuesday. #3021 fixed three sites; this is the part
 * that stops the fourth, and it found one while it was being written
 * (`truncate` in `MobilePlayers.tsx`, which #3021 missed).
 *
 * WHY THE RULE IS A SPACE AND NOT A VOCABULARY
 * --------------------------------------------
 * The obvious guard asks "is the glued token a real Tailwind utility?", which
 * means keeping a copy of a list this repo does not own. It rots on the next
 * upgrade, and a rotted list passes. So the rule does not ask: in class
 * position, an interpolation gets a space in front of it. That also catches
 * `` `p-${size}` ``, which the narrow rule would wave through and the scanner
 * drops for exactly the same reason.
 *
 * WHAT IS NOT A FINDING
 * ---------------------
 * An interpolation that COMPLETES a token rather than following one —
 * `` `wz-roundel-${id}` ``, `` `var(--spectrum-glow-${value})` ``,
 * `` `switcher-row-${id}` ``, `` `na.tier${rung}` `` — is a different shape and
 * legitimate. None of the four is a class name, and the scan is scoped to class
 * position for that reason; the third describe block below holds all four to it
 * against the real files, so a widening of the scan fails here rather than
 * arriving as noise on somebody's PR.
 *
 * THE ALLOWLIST
 * -------------
 * `ALLOWED` is the ratchet, in the shape `scripts/bundle-budget.mjs` uses for
 * Albescent's selector allowance: a site that genuinely has to glue is a line
 * in a diff a human reads, with the reason written next to it. It is empty
 * today and every entry is a debt.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  classPositionTemplates,
  classValueRegions,
  gluedClassInterpolations,
  gluedClassInterpolationsInSource,
  scanSource,
} from '../classNameLiterals'
import { SRC_DIR, sourceFiles, toRelative } from '../sourceScan'

/**
 * Sites permitted to glue, as `<path relative to src>:<the glued token>`.
 *
 * Empty, and it should stay that way. An entry is a class name Tailwind cannot
 * see, so it only belongs here when the class is not a Tailwind utility at all
 * — a hand-written rule from `src/css/` — and the interpolation genuinely
 * cannot take a space. Add one only with the reason in the PR that adds it.
 */
const ALLOWED: readonly string[] = []

const read = (path: string): string => readFileSync(join(SRC_DIR, path), 'utf8')

const SEAL_SHEET = 'components/duel/DuelSealSheet.tsx'

describe('the scan sees the codebase', () => {
  it('reads the class-name sites, so it cannot pass by looking at nothing', () => {
    // ~1,835 today, across ~569 files. This is not a measurement, it is the
    // distance below which the region finder has stopped finding `className`.
    const regions = sourceFiles().reduce(
      (total, file) => total + classValueRegions(scanSource(readFileSync(file, 'utf8'))).length,
      0,
    )
    expect(regions).toBeGreaterThan(1_000)
  })

  it('still finds class names built from template literals at all', () => {
    // 14 today, in 11 files. A scan that found none would report a clean board
    // forever, because a clean board is exactly what this guard's pass is.
    const files = sourceFiles().filter(
      (file) => classPositionTemplates(scanSource(readFileSync(file, 'utf8'))).length > 0,
    )
    expect(files.map(toRelative)).toContain(SEAL_SHEET)
    expect(files.length).toBeGreaterThan(5)
  })

  it('finishes every string and literal it opens, in every file', () => {
    // The scan masks strings, comments and regex literals so a `//` inside a
    // URL cannot eat a line. If it ever mistook one for another it would run to
    // the end of the file and see nothing after — silently, and only in the one
    // file that tripped it. So the state it ends in is asserted, per file.
    const ragged = sourceFiles({ includeTests: true })
      .filter((file) => scanSource(readFileSync(file, 'utf8')).unterminated)
      .map(toRelative)
    expect(ragged).toEqual([])
  })
})

describe('it fails on the real defect, not on a fixture of one', () => {
  it('reports #2918 when the space is taken back out of DuelSealSheet', () => {
    const fixed = read(SEAL_SHEET)
    const regressed = fixed.replace('overflow-y-auto ${', 'overflow-y-auto${')

    // If this file ever stops containing the shape, the tripwire below is
    // testing nothing, and it says so here rather than passing quietly.
    expect(regressed, `${SEAL_SHEET} no longer holds the line #3021 fixed`).not.toBe(fixed)

    expect(gluedClassInterpolations(regressed).map((glued) => glued.stem)).toEqual([
      'overflow-y-auto',
    ])
    expect(gluedClassInterpolations(fixed)).toEqual([])
  })

  it('reads the token, the line and the whole run — not just the last word', () => {
    const source = [
      'const a = <div className={`flex items-center justify-center font-body${extra}`} />',
      'const b = <div className={`flex ${extra}`} />',
    ].join('\n')

    expect(gluedClassInterpolations(source)).toEqual([
      { stem: 'font-body', offset: source.indexOf('${'), line: 1 },
    ])
  })

  it('sees through a ternary, a nested literal and a prop that is not `className`', () => {
    const source = [
      'const a = <Sheet phoneClassName={busy ? `p-4 gap-2${extra}` : undefined} />',
      'const b = <div className={`${lead} rounded-full`} />',
      'const c = <div className={`p-2 ${lead}${trail}`} />',
    ].join('\n')

    // `${lead}${trail}` is two interpolations back to back: the second follows a
    // `}`, not a token, so only the ternary's `gap-2` is a finding.
    expect(gluedClassInterpolations(source).map((glued) => glued.stem)).toEqual(['gap-2'])
  })

  it('follows the value one hop, so a rename does not walk out of the scan', () => {
    // The two `FactionLaneName` shapes are `const className = …`, and a guard
    // that leant on the variable's NAME would be left by calling it `base`.
    const source = [
      'const base = `flex items-center truncate${redacted ? " redacted" : ""}`',
      'const el = <span className={base} />',
    ].join('\n')

    expect(gluedClassInterpolations(source).map((glued) => glued.stem)).toEqual(['truncate'])
  })

  it('does not follow a name no class ever reads', () => {
    const source = [
      'const href = `/tasks/${id}`',
      'const to = `/praxis/${id}`',
      'const el = <a href={href} className="p-2" />',
    ].join('\n')

    expect(gluedClassInterpolations(source)).toEqual([])
  })
})

/**
 * Interpolations that complete a token, at the sites the migration checked by
 * hand. Each is asserted to be STILL THERE before it is asserted to be quiet,
 * so a site that moves fails loudly instead of becoming a comment about a shape
 * that no longer exists.
 */
const COMPLETES_A_TOKEN: ReadonlyArray<{ path: string; shape: string; what: string }> = [
  {
    path: 'components/factionMarks/PointsRoundel.tsx',
    shape: 'wz-roundel-${',
    what: 'an SVG textPath id',
  },
  {
    path: 'components/vote/DefaultVote.tsx',
    shape: '--spectrum-glow-${',
    what: 'a CSS custom property read',
  },
  {
    path: 'components/vote/AlbescentVote.tsx',
    shape: '--spectrum-glow-${',
    what: 'a CSS custom property read',
  },
  {
    path: 'components/CharacterSwitcherSheet.tsx',
    shape: 'switcher-row-${',
    what: 'a test id',
  },
  {
    // Note it does not end in a hyphen, so "must end in `-`" is not the rule.
    path: 'components/vote/DefaultVote.tsx',
    shape: 'tier${',
    what: 'an i18n key',
  },
]

describe('an interpolation that completes a token is not a finding', () => {
  for (const { path, shape, what } of COMPLETES_A_TOKEN) {
    it(`leaves \`${shape}…\` alone in ${path} — it is ${what}`, () => {
      const source = read(path)
      expect(source, `${path} no longer contains \`${shape}\``).toContain(shape)
      expect(gluedClassInterpolations(source)).toEqual([])
    })
  }
})

describe('no class token is glued to an interpolation (#2918)', () => {
  it('holds across every file under src', () => {
    const findings = gluedClassInterpolationsInSource().filter(
      (finding) => !ALLOWED.includes(finding.key),
    )

    expect(
      findings.map((finding) => `${finding.path}:${finding.line}  ${finding.stem}\${`),
      "Tailwind's scanner reads the source as text and drops a candidate that runs " +
        'straight into `${`, so the class leaves the stylesheet while the element goes on ' +
        'naming it — a build, a lint, a typecheck and the whole suite all pass. Put a space ' +
        'before the interpolation, or lift the branch out of the literal entirely ' +
        "(`redacted ? 'a b' : 'a'`). If a site genuinely cannot, add its `path:token` to " +
        'ALLOWED above with the reason in your PR.',
    ).toEqual([])
  })

  it('carries no allowlist entry that no longer matches a site', () => {
    // An entry that stopped matching is a permission nobody is using and a
    // reason nobody has re-read. It comes out on the commit that stops needing it.
    const keys = new Set(gluedClassInterpolationsInSource().map((finding) => finding.key))
    expect(ALLOWED.filter((key) => !keys.has(key))).toEqual([])
  })
})
