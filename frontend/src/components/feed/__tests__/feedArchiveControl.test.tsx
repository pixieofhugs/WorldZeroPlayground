/**
 * THE DISMISS CONTROL IS VISIBLE ON EVERY BAND THAT TINTS IT (#2091).
 *
 * SEAM: the ink each feed chassis publishes to `FeedFrameProps.archive`, spent
 * at the alpha the RENDERED control actually paints at. Not the token's own
 * documentation, and not one frame's screenshot — the pairing a band and the
 * shared control make together, which is where #2091 lives: the ✕ has one home
 * (`FeedArchiveButton`) and every frame tints it through `currentColor`, so the
 * defect was one property in one file and reachable from all nine surfaces.
 *
 * WHY THE ALPHA IS READ FROM THE MARKUP rather than pinned. The control used to
 * sit at `opacity: 0.4` until hover or focus, and an alpha on the ink is a
 * contrast cut wherever it is written. Reading it back out of the rendered
 * button is what makes this file go red on the real defect (nine of the fourteen
 * pairings below failed at 40%) instead of on a number someone remembered to
 * update.
 *
 * WHY 3:1 AND NOT 4.5:1. The ✕ is a glyph but not text — it is the visual
 * indication of a UI component, so WCAG 1.4.11 governs it and the floor is 3:1.
 * The assertion is written at that floor deliberately; the measured margin is
 * much wider (every pairing also clears the 4.5:1 text floor), and a floor set
 * at the current measurement is a tripwire rather than a rule.
 *
 * WHY NEITHER STANDING GUARD SAW IT. `factionContrast.test.ts` measures a token
 * against the surface its own DECLARATION names, and no declaration knows that
 * this control would spend it at 40%. `feedRowInk.test.tsx` measures the ink a
 * frame publishes to the row BODY, one level down, and passes `archive={null}`.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import FeedArchiveButton, { LIT_WASH_PCT } from '../FeedArchiveButton'
import AlbescentFeedFrame from '../AlbescentFeedFrame'
import CovenFeedFrame from '../CovenFeedFrame'
import EphemeristsFeedFrame from '../EphemeristsFeedFrame'
import EverymenFeedFrame from '../EverymenFeedFrame'
import DefaultFeedFrame from '../DefaultFeedFrame'
import SingularityFeedFrame from '../SingularityFeedFrame'
import SnideFeedFrame from '../SnideFeedFrame'
import UaFeedFrame from '../UaFeedFrame'
import WowFeedFrame from '../WowFeedFrame'
import type { FeedFrameProps } from '../feedFrameProps'
import { AA_LARGE, compositeOver, contrastRatio, formatRatio, parseColor, type Rgba } from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import '../../../i18n'

const THEMES = readThemes(readFileSync(fileURLToPath(new URL('../../../index.css', import.meta.url)), 'utf8'))

/** The control as it ships, dormant — the state 99% of its life is spent in. */
const CONTROL = renderToStaticMarkup(<FeedArchiveButton onAct={() => {}} />)

/** One inline declaration off the control's own button element. */
function declared(property: string): string | null {
  const style = /<button[^>]*style="([^"]*)"/.exec(CONTROL)?.[1] ?? ''
  for (const decl of style.split(';')) {
    const colon = decl.indexOf(':')
    if (colon !== -1 && decl.slice(0, colon).trim() === property) return decl.slice(colon + 1).trim()
  }
  return null
}

/**
 * The alpha the glyph is painted at. `opacity` is absent now and was `0.4`
 * before #2091; either way the measurement below uses what the button says.
 */
const PAINTED_ALPHA = Number.parseFloat(declared('opacity') ?? '1')

function token(name: string, theme: Theme): Rgba {
  const raw = resolveVar(name, theme, THEMES)
  if (raw === null) throw new Error(`${name} does not resolve under ${theme}`)
  const colour = parseColor(raw)
  if (colour === null) throw new Error(`${name} resolves to an unparseable ${raw}`)
  return colour
}

/**
 * Every solid stop a ground declares — one for a flat token, several for a
 * gradient, since "clears on the first stop" is not a claim about the band.
 * Copied in spirit from `feedRowInk.test.tsx`, which measures the body inks the
 * same way one level down.
 */
function stops(name: string, theme: Theme): Rgba[] {
  const raw = resolveVar(name, theme, THEMES)
  expect(raw, `${name} (${theme}) must resolve`).not.toBeNull()
  const found = raw!.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)
  expect(found, `${name} (${theme}) declared no solid stop`).not.toBeNull()
  return found!.map((stop) => {
    const colour = parseColor(stop)
    expect(colour, `${name} stop ${stop}`).not.toBeNull()
    // A band ground is opaque in every case below; if one ever is not, this is
    // where the caller must decide what is behind it (#1413).
    expect(colour!.a, `${name} stop ${stop} is translucent`).toBe(1)
    return colour!
  })
}

interface Case {
  /** The ink the frame sets as `color` on whatever holds the archive node. */
  ink: string
  /** The ground that ink lands on — the BAND's, not the card's. */
  ground: string[]
  /** Absent where the pairing is measured without a render; see `era`. */
  Frame?: ComponentType<FeedFrameProps>
}

/**
 * Every surface the control mounts on, with the ink/ground pair its own band
 * publishes. Nine renders and one measurement-only row.
 */
const CASES: Record<string, Case> = {
  // The Unaffiliated chassis, and the default every unclaimed slug takes — the
  // surface the #2091 screenshot was taken on, in dark.
  default: {
    Frame: (props) => <DefaultFeedFrame {...props} />,
    ink: '--color-text-secondary',
    ground: ['--faction-default-card-bg'],
  },
  // Albescent forwards to that same chassis (`albescent` maps to the `default`
  // CSS key, #783), so the pairing is the default's. Its `.alb-feed-aurora`
  // layer sits OVER the band in `plus-lighter`, which no token arithmetic can
  // composite — the aurora is the one thing on this list eyes have to check.
  albescent: {
    Frame: AlbescentFeedFrame,
    ink: '--color-text-secondary',
    ground: ['--faction-default-card-bg'],
  },
  ua: { Frame: UaFeedFrame, ink: '--faction-ua-card-muted', ground: ['--faction-ua-parchment'] },
  wow: { Frame: WowFeedFrame, ink: '--faction-wow-card-accent', ground: ['--faction-wow-card-bg'] },
  singularity: {
    Frame: SingularityFeedFrame,
    ink: '--faction-singularity-term-bright',
    ground: ['--faction-singularity-term-bg'],
  },
  snide: {
    Frame: SnideFeedFrame,
    ink: '--faction-snide-paper',
    ground: ['--faction-snide-slip-bar'],
  },
  // The slip's head is a four-stop gradient written inline, so the stops are
  // named individually rather than read off one token.
  coven: {
    Frame: CovenFeedFrame,
    ink: '--faction-coven-slip-ink',
    ground: [
      '--faction-coven-slip-from',
      '--faction-coven-slip-mid',
      '--faction-coven-slip-lav',
      '--faction-coven-slip-vio',
    ],
  },
  ephemerists: {
    Frame: EphemeristsFeedFrame,
    ink: '--faction-ephemerists-plate-band-ink',
    ground: ['--faction-ephemerists-plate-band'],
  },
  everymen: {
    Frame: EverymenFeedFrame,
    ink: '--everymen-masthead-text',
    ground: ['--everymen-red'],
  },
  // `era_announcement` is the one factionless card (epic #1192 decision 6): it
  // keeps its always-dark chrome and drops the ✕ into its own header, so the
  // control takes `--badge-admin-text` there. Measured, not rendered — that card
  // takes an `ActivityFeedItem`, not `FeedFrameProps`, and what it publishes to
  // the control is one `color` declaration on its root.
  era: { ink: '--badge-admin-text', ground: ['--badge-admin-bg'] },
}

describe('the shared dismiss control', () => {
  it('paints in currentColor and dims nothing — the frames tint it, so the ink must arrive whole', () => {
    expect(declared('color')).toBe('currentColor')
    expect(declared('opacity')).toBeNull()
  })

  it('draws the box in currentColor, so it needs no colour of its own (#1609)', () => {
    expect(declared('border')).toBe('1px solid currentColor')
    // No hex, no rgb(), no --color-* token: whatever the band publishes is the
    // whole palette this control has.
    expect(CONTROL).not.toMatch(/#[0-9a-fA-F]{3}|rgba?\(/)
  })

  it('is a 44px square target — the house floor, not WCAG 2.5.8 (#2100)', () => {
    // It shipped at 24 (2.5.8, AA) because `EphemeristsFeedFrame`'s masthead
    // was a FIXED height that clipped anything taller, for hit-testing as well
    // as visually. #2100 made that band intrinsic, so the ceiling is gone and
    // §6's non-negotiable 44 (2.5.5, AAA) is reachable from the one shared
    // control on all nine chassis. The floor is asserted at 44, not at
    // "≥ 24", so a regression to the old number goes red here.
    expect(declared('box-sizing')).toBe('border-box')
    expect(Number.parseFloat(declared('min-width') ?? '0')).toBeGreaterThanOrEqual(44)
    expect(Number.parseFloat(declared('min-height') ?? '0')).toBeGreaterThanOrEqual(44)
  })

  it('sets the glyph at the tier the timestamp beside it reads at', () => {
    expect(declared('font-size')).toBe('var(--text-lg)')
  })
})

describe.each(Object.entries(CASES))('%s: the band it is placed on', (name, { ink, ground, Frame }) => {
  if (Frame) {
    it('publishes the measured ink to the slot that holds the control', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <Frame kicker="Task completed" time="2h ago" tag="Still waiting" archive={<span id="x" />}>
            <div />
          </Frame>
        </MemoryRouter>,
      )
      expect(html).toContain(`color:var(${ink})`)
      expect(html).toContain('<span id="x"')
    })
  }

  it.each(['light', 'dark'] as Theme[])('clears the 3:1 control floor in %s, dormant and lit', (theme) => {
    const glyph = { ...token(ink, theme), a: token(ink, theme).a * PAINTED_ALPHA }
    for (const surface of ground.flatMap((name) => stops(name, theme))) {
      const dormant = contrastRatio(glyph, surface)
      expect(
        dormant,
        `${ink} at alpha ${PAINTED_ALPHA} on ${name}'s band (${theme}) = ${formatRatio(dormant)}`,
      ).toBeGreaterThanOrEqual(AA_LARGE)

      // Hover and focus lift a wash of the control's own ink. The glyph stays at
      // full strength, but the ground under it moves toward the glyph, so the
      // lit state is a second pairing and not a free one.
      const washed = compositeOver({ ...token(ink, theme), a: LIT_WASH_PCT / 100 }, surface)
      const lit = contrastRatio(glyph, washed)
      expect(
        lit,
        `${ink} on its own ${LIT_WASH_PCT}% wash over ${name}'s band (${theme}) = ${formatRatio(lit)}`,
      ).toBeGreaterThanOrEqual(AA_LARGE)
    }
  })
})
