/**
 * The dismiss control clears 3:1 on every band that tints it (#2091). The ✕
 * (`FeedArchiveButton`) is tinted via `currentColor`, so this measures each
 * chassis's published ink against its BAND at the alpha the rendered button
 * actually paints (read from markup, so a reintroduced opacity goes red).
 *
 * 3:1 because it's a UI component, not text (WCAG 1.4.11). Neither
 * `factionContrast.test.ts` (token vs its declared surface) nor
 * `feedRowInk.test.tsx` (body ink, `archive={null}`) covers this pairing.
 */
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
import { resolveRoleReads } from '../../../test/sourceScan'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())

/** The dormant control. */
const CONTROL = renderToStaticMarkup(<FeedArchiveButton onAct={() => {}} />)

function declared(property: string): string | null {
  const style = /<button[^>]*style="([^"]*)"/.exec(CONTROL)?.[1] ?? ''
  for (const decl of style.split(';')) {
    const colon = decl.indexOf(':')
    if (colon !== -1 && decl.slice(0, colon).trim() === property) return decl.slice(colon + 1).trim()
  }
  return null
}

const PAINTED_ALPHA = Number.parseFloat(declared('opacity') ?? '1')

function token(name: string, theme: Theme): Rgba {
  const raw = resolveVar(name, theme, THEMES)
  if (raw === null) throw new Error(`${name} does not resolve under ${theme}`)
  const colour = parseColor(raw)
  if (colour === null) throw new Error(`${name} resolves to an unparseable ${raw}`)
  return colour
}

/** Every solid stop of a ground (gradients included); mirrors `feedRowInk.test.tsx`. */
function stops(name: string, theme: Theme): Rgba[] {
  const raw = resolveVar(name, theme, THEMES)
  expect(raw, `${name} (${theme}) must resolve`).not.toBeNull()
  const found = raw!.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)
  expect(found, `${name} (${theme}) declared no solid stop`).not.toBeNull()
  return found!.map((stop) => {
    const colour = parseColor(stop)
    expect(colour, `${name} stop ${stop}`).not.toBeNull()
    // Band grounds are opaque; a translucent one needs a backdrop decision (#1413).
    expect(colour!.a, `${name} stop ${stop} is translucent`).toBe(1)
    return colour!
  })
}

interface Case {
  /** The `color` the frame sets on the archive node's holder. */
  ink: string
  /** The BAND's ground, not the card's. */
  ground: string[]
  /** Absent = measured without a render (`era`). */
  Frame?: ComponentType<FeedFrameProps>
}

const CASES: Record<string, Case> = {
  // Unaffiliated; the #2091 screenshot surface.
  default: {
    Frame: (props) => <DefaultFeedFrame {...props} />,
    ink: '--color-text-secondary',
    ground: ['--faction-default-card-bg'],
  },
  // Albescent maps to the `default` CSS key (#783). Its `plus-lighter` aurora
  // over the band can't be composited here; check by eye.
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
  // Coven's head is an inline four-stop gradient.
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
  // `era_announcement` (epic #1192 d6) takes an `ActivityFeedItem`, so it's
  // measured, not rendered.
  era: { ink: '--badge-admin-text', ground: ['--badge-admin-bg'] },
}

describe('the shared dismiss control', () => {
  it('paints in currentColor and dims nothing — the frames tint it, so the ink must arrive whole', () => {
    expect(declared('color')).toBe('currentColor')
    expect(declared('opacity')).toBeNull()
  })

  it('draws the box in currentColor, so it needs no colour of its own (#1609)', () => {
    expect(declared('border')).toBe('1px solid currentColor')
    // The band's ink is the control's whole palette.
    expect(CONTROL).not.toMatch(/#[0-9a-fA-F]{3}|rgba?\(/)
  })

  it('is a 44px square target — the house floor, not WCAG 2.5.8 (#2100)', () => {
    // House 44px floor (§6, 2.5.5 AAA), possible since #2100 made the
    // Ephemerists band intrinsic. Asserted at 44 so a return to 24 fails.
    expect(declared('box-sizing')).toBe('border-box')
    expect(Number.parseFloat(declared('min-width') ?? '0')).toBeGreaterThanOrEqual(44)
    expect(Number.parseFloat(declared('min-height') ?? '0')).toBeGreaterThanOrEqual(44)
  })

  it('sets the glyph at the tier the timestamp beside it reads at', () => {
    expect(declared('font-size')).toBe('var(--text-lg)')
  })
})

/** Fold role reads to tokens (#2674); `factionRoleMigration.test.ts` proves the fallbacks. */
const foldRoleReads = resolveRoleReads

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
      expect(foldRoleReads(html)).toContain(`color:var(${ink})`)
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

      // Hover/focus wash the ground toward the glyph: a second pairing.
      const washed = compositeOver({ ...token(ink, theme), a: LIT_WASH_PCT / 100 }, surface)
      const lit = contrastRatio(glyph, washed)
      expect(
        lit,
        `${ink} on its own ${LIT_WASH_PCT}% wash over ${name}'s band (${theme}) = ${formatRatio(lit)}`,
      ).toBeGreaterThanOrEqual(AA_LARGE)
    }
  })
})
