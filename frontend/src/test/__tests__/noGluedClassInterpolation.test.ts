/**
 * No class token may run straight into a template interpolation (#2918).
 * Tailwind v4 drops the glued candidate silently; rationale and the class-position
 * rule are in `../classNameLiterals.ts`. Interpolations that COMPLETE a token
 * (ids, CSS vars, i18n keys) are not findings; `COMPLETES_A_TOKEN` pins that.
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
 * `<path relative to src>:<glued token>` ratchet. Keep empty; an entry is only for
 * a non-Tailwind class (from `src/css/`) that truly cannot take a space.
 */
const ALLOWED: readonly string[] = []

const read = (path: string): string => readFileSync(join(SRC_DIR, path), 'utf8')

const SEAL_SHEET = 'components/duel/DuelSealSheet.tsx'

describe('the scan sees the codebase', () => {
  it('reads the class-name sites, so it cannot pass by looking at nothing', () => {
    // ~1,835 today; a floor, not a measurement.
    const regions = sourceFiles().reduce(
      (total, file) => total + classValueRegions(scanSource(readFileSync(file, 'utf8'))).length,
      0,
    )
    expect(regions).toBeGreaterThan(1_000)
  })

  it('still finds class names built from template literals at all', () => {
    // 14 today; finding none would be a permanent clean board.
    const files = sourceFiles().filter(
      (file) => classPositionTemplates(scanSource(readFileSync(file, 'utf8'))).length > 0,
    )
    expect(files.map(toRelative)).toContain(SEAL_SHEET)
    expect(files.length).toBeGreaterThan(5)
  })

  it('finishes every string and literal it opens, in every file', () => {
    // A mis-masked string would silently blind the rest of that file.
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

    expect(regressed, `${SEAL_SHEET} no longer holds the line #3021 fixed`).not.toBe(fixed)

    expect(gluedClassInterpolations(regressed).map((glued) => glued.stem)).toEqual([
      'overflow-y-auto',
    ])
    expect(gluedClassInterpolations(fixed)).toEqual([])
  })

  it('still reports the defect in a file that holds an astral character', () => {
    // Code-point vs UTF-16 offsets: an emoji once shifted the mask and blinded it.
    const plain = 'const a = <div className={`flex truncate${extra}`} />'
    const withAstral = `// 🔗 🔗\n${plain}`

    expect(gluedClassInterpolations(plain).map((glued) => glued.stem)).toEqual(['truncate'])
    expect(gluedClassInterpolations(withAstral).map((glued) => glued.stem)).toEqual(['truncate'])
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

    // `${lead}${trail}`: the second follows `}`, not a token.
    expect(gluedClassInterpolations(source).map((glued) => glued.stem)).toEqual(['gap-2'])
  })

  it('follows the value one hop, so a rename does not walk out of the scan', () => {
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

/** Token-completing sites; each asserted present before asserted quiet. */
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
    // No hyphen: "must end in `-`" is not the rule.
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
    const keys = new Set(gluedClassInterpolationsInSource().map((finding) => finding.key))
    expect(ALLOWED.filter((key) => !keys.has(key))).toEqual([])
  })
})
