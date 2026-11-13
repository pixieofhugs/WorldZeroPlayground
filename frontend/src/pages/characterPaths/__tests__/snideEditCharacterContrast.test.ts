/**
 * The two edit-only slots, measured on S.N.I.D.E.'s flyposted wall (#2537) — the
 * re-measurement `editCharacterSlots.tsx`'s `ponytail:` note asks for. It inverts
 * the na reading. The bare wall-alarm pairs live in `factionContrast.test.ts`;
 * this file binds them by reading the archetype's re-point target from source.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_LARGE,
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

const ARCHETYPE = fileURLToPath(
  new URL('../archetypes/SnideEditCharacter.tsx', import.meta.url),
)
const SOURCE = readFileSync(ARCHETYPE, 'utf8')
const SLOTS = readFileSync(fileURLToPath(new URL('../editCharacterSlots.tsx', import.meta.url)), 'utf8')

/** The tail poster's own plate (#3009) — see the archetype's header. */
const TAIL_FILL = '--faction-snide-note-paper'
const TAIL_EDGE = '--faction-snide-accent-ink'
/** What the shared slot still draws for any mount that passes nothing. */
const SHARED_PLATE = '--color-bg-surface-alt'
const SHARED_EDGE = '--color-border-strong'

/**
 * The wall's four readings (as SNIDE_WALL_GROUNDS): ramp ends plus acid and pink
 * corner washes. The tail poster is last on the page, so the pink corner decides.
 */
const WALL_READINGS: { where: string; surface: string; wash?: string }[] = [
  { where: 'wall', surface: '--faction-snide-wall' },
  { where: 'deep wall', surface: '--faction-snide-wall-deep' },
  { where: 'acid corner', surface: '--faction-snide-wall', wash: '--faction-snide-note-wash-acid' },
  { where: 'pink corner', surface: '--faction-snide-wall-deep', wash: '--faction-snide-note-wash-pink' },
]

/** The global neutrals the mounted slots bring; the alarm is handled below. */
const SLOT_NEUTRALS: Array<{ what: string; token: string; on?: string }> = [
  // Straight on the wall.
  { what: 'the faction row eyebrow', token: '--color-text-secondary' },
  { what: 'the faction row help line', token: '--color-text-tertiary' },
  { what: 'the confirm prompt', token: '--color-text-secondary' },
  // #3009: on the tail poster's own opaque fill, {@link TAIL_FILL}.
  { what: 'the faction row value', token: '--color-text-secondary', on: TAIL_FILL },
  { what: "the confirm panel's Cancel", token: '--color-text-primary', on: TAIL_FILL },
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

function ground(
  theme: Theme,
  reading: (typeof WALL_READINGS)[number],
  on?: string,
): Rgba {
  const stock = resolve(reading.surface, theme)
  const wall = reading.wash ? compositeOver(resolve(reading.wash, theme), stock) : stock
  return on ? compositeOver(resolve(on, theme), wall) : wall
}

/**
 * What the archetype re-points `--faction-snide-card-alarm` to (via the cascade,
 * as `.snd-praxis-frame` does, #1153), read from its source.
 */
function repointTarget(): string {
  const found = /'--faction-snide-card-alarm':\s*'var\((--[a-z0-9-]+)\)'/.exec(SOURCE)
  expect(
    found,
    'SnideEditCharacter no longer re-points --faction-snide-card-alarm; the delete slot is back on the pinned-bright card ink',
  ).not.toBeNull()
  return found![1]
}

describe('the destructive slot is inked for the wall, not for a slab', () => {
  it('the archetype re-points the card alarm onto the wall family', () => {
    expect(repointTarget()).toBe('--faction-snide-wall-alarm')
  })

  for (const theme of BOTH_THEMES) {
    it(`the ink the delete outline actually paints clears AA — ${theme}`, () => {
      const ink = resolve(repointTarget(), theme)
      for (const reading of WALL_READINGS) {
        const ratio = contrastRatio(ink, ground(theme, reading))
        expect(
          ratio,
          `${repointTarget()} on the ${reading.where} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    })
  }
})

describe('the na-measured alarm does NOT transfer to this ground', () => {
  /* S.N.I.D.E.'s `-card-*` family is pinned for near-black slabs (§6), so its
     alarm (#fca5a5) reads 1.24:1 in the pink corner (cf. #2333). If this goes
     green, the re-point above can be reconsidered. */
  it('--faction-snide-card-alarm misses AA on every reading of the wall in light', () => {
    const ink = resolve('--faction-snide-card-alarm', 'light')
    for (const reading of WALL_READINGS) {
      const ratio = contrastRatio(ink, ground('light', reading))
      expect(
        ratio,
        `--faction-snide-card-alarm on the ${reading.where} is ${formatRatio(ratio)}`,
      ).toBeLessThan(AA_NORMAL)
    }
  })
})

describe('the slots keep their own neutral inks on this wall', () => {
  // On a near-black slab these would invert in light; hence the wall.
  for (const theme of BOTH_THEMES) {
    it.each(SLOT_NEUTRALS)(`$what — ${theme}`, ({ token, on }) => {
      const ink = resolve(token, theme)
      for (const reading of WALL_READINGS) {
        const ratio = contrastRatio(ink, ground(theme, reading, on))
        expect(
          ratio,
          `${token} on ${on ?? 'the'} ${on ? 'over the ' : ''}${reading.where} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    })
  }
})

describe("the tail poster's plate edge is identifiable at 3:1 (WCAG 1.4.11, #3009)", () => {
  // 1.4.11: 3:1 against adjacent colour, of the edge when it carries the boundary.
  for (const theme of BOTH_THEMES) {
    it(`the plate edge against the wall — ${theme}`, () => {
      const ink = resolve(TAIL_EDGE, theme)
      for (const reading of WALL_READINGS) {
        const ratio = contrastRatio(ink, ground(theme, reading))
        expect(
          ratio,
          `${TAIL_EDGE} on the ${reading.where} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_LARGE)
      }
    })

    it(`the plate edge against the well it encloses — ${theme}`, () => {
      const ink = resolve(TAIL_EDGE, theme)
      for (const reading of WALL_READINGS) {
        const well = ground(theme, reading, TAIL_FILL)
        const ratio = contrastRatio(ink, well)
        expect(
          ratio,
          `${TAIL_EDGE} on ${TAIL_FILL} over the ${reading.where} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_LARGE)
      }
    })

    it(`the shared neutral pair would still miss 3:1 on the wall — ${theme}`, () => {
      // Why the override is a fix, not a preference.
      for (const reading of WALL_READINGS) {
        const wall = ground(theme, reading)
        const neutralPlate = compositeOver(resolve(SHARED_PLATE, theme), wall)
        const fill = contrastRatio(neutralPlate, wall)
        expect(fill, `the neutral plate on the ${reading.where} reads ${formatRatio(fill)}`).toBeLessThan(
          AA_LARGE,
        )
        const edge = contrastRatio(
          compositeOver(resolve(SHARED_EDGE, theme), neutralPlate),
          neutralPlate,
        )
        expect(edge, `its hairline reads ${formatRatio(edge)}`).toBeLessThan(AA_LARGE)
      }
    })
  }
})

describe('the plate is handed in through the dress seam, on both controls (#3009)', () => {
  it('the shared default is still the neutral pair, untouched', () => {
    expect(SLOTS, 'the shared default is still the neutral plate').toContain(`var(${SHARED_PLATE})`)
    expect(SLOTS, '…behind the neutral hairline').toContain(`var(${SHARED_EDGE})`)
  })

  it('the archetype cuts one plate for both controls', () => {
    expect(SOURCE, 'the tail poster cuts one dress for both controls').toMatch(
      /const tailPlate[\s\S]*?background: TAIL_FILL[\s\S]*?solid \$\{TAIL_EDGE\}/,
    )
    expect(SOURCE, 'the faction row takes it').toContain('rowStyle={tailPlate}')
    expect(SOURCE, "so does the confirm's cancel key").toContain('cancelStyle={tailPlate}')
  })
})
