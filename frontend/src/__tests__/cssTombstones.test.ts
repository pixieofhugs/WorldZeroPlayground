/**
 * The tombstone detector still detects tombstones (#3001).
 *
 * `scripts/css-tombstones.mjs` answers one question about the eleven-part
 * cascade: which comments name a thing that exists nowhere else in the tree?
 * Its whole value is that a human can read the answer and decide, so the ways
 * it can fail are the ways it can look fine while answering nothing.
 *
 * WHY THIS FILE STRIPS NO COMMENTS, AND MUST NOT
 * ----------------------------------------------
 * `test/sourceScan.ts` exports `stripComments`, and a dozen guards next door
 * open with it. Reaching for it here — in the detector OR in this test — is
 * the failure mode, not a convenience: the subject being hunted IS a comment,
 * so a stripped read finds an empty cascade, reports zero tombstones, and
 * passes green on the day it is written. The assertions below are therefore
 * built on `readFileSync` of the raw file, and the import list has no
 * `sourceScan` in it on purpose.
 *
 * WHY IT SPAWNS THE SCRIPT RATHER THAN IMPORTING IT
 * -------------------------------------------------
 * The detector is `.mjs` under `scripts/`, beside `bundle-budget.mjs` and
 * `measure-load.mjs`, because it is a tool the deletion pass re-runs from a
 * shell — not a module the app compiles. `tsconfig.json` is `allowJs: false`
 * and `include: ["src"]`, so importing it from here would mean either a
 * declaration file for a script or widening the app's own compiler settings
 * to reach outside `src`. Spawning costs one child process and tests the
 * thing the owner will actually run, argv parsing included.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const FRONTEND_DIR = fileURLToPath(new URL('../..', import.meta.url))
const SCRIPT = join(FRONTEND_DIR, 'scripts', 'css-tombstones.mjs')

interface Finding {
  file: string
  line: number
  blockLines: number
  names: string[]
  attached: string | null
  verdict: string
  guards?: string[]
  text: string
}

const report: { findings: Finding[]; filtered: { name: string; rule: string }[] } = JSON.parse(
  execFileSync(process.execPath, [SCRIPT, '--json'], { encoding: 'utf8', maxBuffer: 32 << 20 }),
)

const named = (name: string) => report.findings.filter((finding) => finding.names.includes(name))

/**
 * #3001's own worked examples, each verified in the issue as occurring exactly
 * once in the tree — in the comment announcing its removal.
 *
 * Asserted by FILE, not by line: these live in the busiest merge surface in
 * the repo, and a guard that pins `01-base-tokens.css:3198` fails on the next
 * unrelated token added above it, which teaches everyone to edit the guard.
 */
const VERIFIED_TOMBSTONES: [name: string, file: string][] = [
  ['--color-rank-accent', 'src/css/01-base-tokens.css'],
  ['--color-level-inactive', 'src/css/01-base-tokens.css'],
  ['.eph-vote-star', 'src/css/06-faction-chrome-2.css'],
  ['.eph-vote-sparkle', 'src/css/06-faction-chrome-2.css'],
  ['.alb-praxis-aurora', 'src/css/06-faction-chrome-2.css'],
  ['.eph-turn-points', 'src/css/08-faction-chrome-2-resumed.css'],
  ['.eph-turn-cta', 'src/css/08-faction-chrome-2-resumed.css'],
]

describe('the detector finds the tombstones #3001 verified by hand', () => {
  it.each(VERIFIED_TOMBSTONES)('reports %s, in %s', (name, file) => {
    expect(named(name).map((finding) => finding.file)).toContain(file)
  })

  it('reads the cascade raw', () => {
    // The one assertion that fails if the detector ever strips before it looks.
    // Every reported name is in the raw bytes of the file it was reported from,
    // and in NONE of them is it a declaration — it is inside a `/* … */`.
    const offenders = report.findings.flatMap((finding) => {
      const raw = readFileSync(join(FRONTEND_DIR, finding.file), 'utf8')
      return finding.names.filter((name) => !raw.includes(name)).map((name) => `${finding.file} ${name}`)
    })
    expect(offenders).toEqual([])
  })
})

describe('the noise floor holds', () => {
  const reported = new Set(report.findings.flatMap((finding) => finding.names))

  /**
   * The shapes the first pass mistook for names. A family prefix written
   * mid-sentence, a glob stem, `AlbescentProfileBody`'s generic `.alb-x`
   * placeholder, prose shorthand, and a filename's extension.
   */
  it.each(['--color-', '--badge-', '--control-', '.btn-', '.alb-x', '--card', '--other', '.css', '.tsx'])(
    'never proposes %s',
    (noise) => {
      expect(reported.has(noise)).toBe(false)
    },
  )

  it('rejected the noise rather than never seeing it', () => {
    // Guards the guard: the four assertions above would also pass if the
    // harvest regex had simply stopped matching anything.
    expect(report.filtered.length).toBeGreaterThan(50)
    expect(report.filtered.map((entry) => entry.name)).toContain('.alb-x')
  })

  it('never proposes a SECTION header', () => {
    // #3001: the eleven headers are what make the cascade's split checkable.
    expect(report.findings.filter((finding) => finding.text.includes('SECTION —'))).toEqual([])
  })
})

describe('every finding carries the evidence its verdict rests on', () => {
  it('KEEP-guard names the guard that already holds the name', () => {
    const guarded = report.findings.filter((finding) => finding.verdict === 'KEEP-guard')
    expect(guarded.length).toBeGreaterThan(0)
    expect(guarded.filter((finding) => (finding.guards ?? []).length === 0)).toEqual([])
  })

  it('does not cite THIS file as a guard', () => {
    // The fixtures above are string literals naming dead tokens, in a file
    // under `__tests__`, which is exactly the shape of a retirement guard.
    // Counting them moved two blocks out of the cut list and into KEEP-guard
    // on the commit that added this test, citing this test. The detector
    // excludes itself by name; this is what notices if that stops working.
    const selfCited = report.findings.filter((finding) =>
      (finding.guards ?? []).some((guard) => guard.endsWith('cssTombstones.test.ts')),
    )
    expect(selfCited).toEqual([])
  })

  it("routes #3001's aurora to KEEP-guard, not to the cut list", () => {
    // The aurora is the issue's own example of a tombstone that must survive:
    // its block cites epic #2496's ruling, and two tests hold the name.
    const aurora = named('.alb-praxis-aurora')
    expect(aurora.map((finding) => finding.verdict)).toEqual(['KEEP-guard'])
    expect(aurora[0].guards).toContain('src/__tests__/motionSplit.test.ts')
  })

  it('KEEP-header quotes the live declaration underneath, and CUT never does', () => {
    // The distinction the first run got wrong: three blocks that read as plain
    // removal records were the headers of `--rank-silver`, `.em-broadsheet`
    // and `--faction-wow-gilt-mid`.
    for (const finding of report.findings) {
      const attached = finding.attached !== null
      expect([finding.verdict, attached]).not.toEqual(['CUT-candidate', true])
      if (finding.verdict === 'KEEP-header') expect(attached).toBe(true)
    }
  })
})
