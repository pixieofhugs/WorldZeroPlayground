/**
 * The ink half of the body seam (#1252), frame + body rendered together:
 *  1. context crosses the `children` boundary (`FeedCardRouter` builds the
 *     body, so the frame can't pass props);
 *  2. the published ink clears AA on the frame's own ground (the row's default
 *     `--faction-{slug}` name ink fails on several sheets).
 * Grounds come from index.css; gradients are measured at every stop.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import FeedRowContent from '../FeedRowContent'
import { surfaceMap } from '../../../factions'
import { ALBESCENT_FACTION_SLUG } from '../../../utils/factions'
import { resolveFeedRowInk } from '../feedRowSkin'
import { normalizeFeedItem } from '../normalizeFeedItem'
import { AA_NORMAL, compositeOver, contrastRatio, formatRatio, parseColor } from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import '../../../i18n'
import { resolveRoleReads } from '../../../test/sourceScan'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())

function groundStops(name: string, theme: Theme): string[] {
  const raw = resolveVar(name, theme, THEMES)
  expect(raw, `${name} (${theme}) must resolve`).not.toBeNull()
  const stops = raw!.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)
  expect(stops, `${name} (${theme}) declared no solid stop`).not.toBeNull()
  return stops!
}

function row(slug: string) {
  return normalizeFeedItem({
    type: 'friend_completion',
    item_key: 'friend_completion:1',
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: slug,
    actor_avatar_url: null,
    payload: { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 },
    context_faction_slug: slug,
  })!
}

/**
 * A chassis wash over its ground (#1341), resolved per theme (Ephemerists'
 * wash is `none` at night, so the dark plate is measured bare). The first stop
 * gates: a top-anchored ramp is strongest where the row's first line sits.
 */
function veiledGround(stop: string, veil: string | null, theme: Theme) {
  const surface = parseColor(stop)
  expect(surface, `ground stop ${stop}`).not.toBeNull()
  if (!veil) return surface!
  const raw = resolveVar(veil, theme, THEMES)
  const first = raw?.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/)?.[0]
  const wash = first ? parseColor(first) : null
  return wash ? compositeOver(wash, surface!) : surface!
}

interface Measured {
  ink: string
  ground: string
  veil: string | null
}

/**
 * Typed on purpose: these tokens ARE the subject. The population comes from the
 * feedFrame registry (#2815).
 */
const MEASURED: Record<string, Measured> = {
  ua: { ink: '--faction-ua-card-accent', ground: '--faction-ua-parchment', veil: null },
  wow: { ink: '--faction-wow-card-accent', ground: '--faction-wow-card-bg', veil: null },
  singularity: {
    ink: '--faction-singularity-card-accent',
    ground: '--faction-singularity-term-bg',
    veil: null,
  },
  // Fixed by #1341; only Everymen mints a new ink.
  snide: {
    ink: '--faction-snide-slip-acid-ink',
    ground: '--faction-snide-slip-paper',
    veil: null,
  },
  coven: { ink: '--faction-coven-slip-deep', ground: '--faction-coven-ward-card', veil: null },
  ephemerists: {
    ink: '--faction-ephemerists-plate-brass-light',
    ground: '--faction-ephemerists-plate-bg',
    veil: '--faction-ephemerists-plate-wash',
  },
  everymen: { ink: '--everymen-paper-accent', ground: '--everymen-paper', veil: null },
}

/** Fallback-seam chassis, tested at the foot of this file (#2108). */
const PUBLISHES_NO_INK: ReadonlySet<string> = new Set(['na', ALBESCENT_FACTION_SLUG])

const FEED_FRAMES = surfaceMap('feedFrame')

const CASES = Object.entries(FEED_FRAMES)
  .filter(([slug]) => !PUBLISHES_NO_INK.has(slug))
  .map(([slug, Frame]) => ({ slug, Frame, ...MEASURED[slug] }))

describe('every chassis that publishes an ink has one measured', () => {
  it('leaves no registered feed frame unaccounted for', () => {
    const unaccounted = Object.keys(FEED_FRAMES).filter(
      (slug) => !PUBLISHES_NO_INK.has(slug) && !(slug in MEASURED),
    )
    expect(
      unaccounted,
      'measure the ink/ground pair, or name the chassis in PUBLISHES_NO_INK',
    ).toEqual([])
  })
})

/** Fold role reads to tokens (#2674); `factionRoleMigration.test.ts` proves the fallbacks. */
const foldRoleReads = resolveRoleReads

describe.each(CASES)('$slug feed chassis re-inks the shared body', ({ slug, Frame, ink, ground, veil }) => {
  it('reaches the actor name inside children it did not mount', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Frame kicker="Task completed" time="2h ago" tag={null} archive={null}>
          <FeedRowContent row={row(slug)} avatarUrl={null} />
        </Frame>
      </MemoryRouter>,
    )
    expect(foldRoleReads(html)).toContain(`color:var(${ink})`)
    // The hue leaves the NAME but stays on the fills (ADR-0039).
    expect(html).toContain(`background:var(--faction-${slug})`)
    expect(html).not.toContain(`font-weight:700;color:var(--faction-${slug})`)
  })

  it.each(['light', 'dark'] as Theme[])('clears AA on its own ground in %s', (theme) => {
    const text = parseColor(resolveVar(ink, theme, THEMES) ?? '')
    expect(text, `${ink} (${theme})`).not.toBeNull()
    for (const stop of groundStops(ground, theme)) {
      const surface = veiledGround(stop, veil, theme)
      const ratio = contrastRatio(text!, surface)
      expect(ratio, `${ink} on ${stop} (${theme}) = ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    }
  })
})

/**
 * No frame publishes an ink (#2108): the neutral fallback must clear
 * `--faction-default-card-bg` for every slug. Asserted on the resolved colour,
 * not a token name, so a drifted neutral still fails.
 */
describe('the neutral feed row falls back to a measured ink', () => {
  const FALLBACK = resolveFeedRowInk(undefined, 'ephemerists').actor

  it('does not fall back to any faction hue', () => {
    for (const slug of ['ua', 'wow', 'snide', 'coven', 'ephemerists', 'singularity', 'everymen', 'albescent']) {
      expect(resolveFeedRowInk(undefined, slug).actor).toBe(FALLBACK)
      expect(FALLBACK).not.toContain(`--faction-${slug}`)
    }
    expect(resolveFeedRowInk(undefined, 'coven').monogram).toContain('--faction-coven')
  })

  it.each(['light', 'dark'] as Theme[])('clears AA on the neutral card ground in %s', (theme) => {
    const name = FALLBACK.replace(/^var\(|\)$/g, '')
    const text = parseColor(resolveVar(name, theme, THEMES) ?? '')
    expect(text, `${name} (${theme})`).not.toBeNull()
    for (const stop of groundStops('--faction-default-card-bg', theme)) {
      const ratio = contrastRatio(text!, parseColor(stop)!)
      expect(ratio, `${name} on ${stop} (${theme}) = ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    }
  })
})
