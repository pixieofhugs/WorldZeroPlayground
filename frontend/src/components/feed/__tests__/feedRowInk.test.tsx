/**
 * THE INK HALF OF THE BODY SEAM, end to end (#1252).
 *
 * Two claims that no other test can make, because both only exist once a frame
 * and a body are rendered together:
 *
 *  1. **The context crosses the `children` boundary.** `FeedCardRouter` BUILDS
 *     the body and hands it to the chassis, so the frame has no call site to
 *     pass props at. React resolves context by position in the rendered tree
 *     rather than by where the element was created — this asserts that, because
 *     the whole seam rests on it.
 *  2. **The ink a frame publishes clears AA on that frame's own ground.** This
 *     is the pairing question §3 keeps re-learning: a token measured against the
 *     app's near-white page is not measured against a faction's sheet. The
 *     shared row paints the actor's name in `--faction-{slug}` and pays 1.96:1
 *     on WOW's cream, 3.67:1 on the Singularity terminal and 4.04:1 on UA's
 *     parchment — at 18px/700 the name owes 4.5:1.
 *
 * Grounds are read from index.css rather than pinned, and a GRADIENT ground is
 * measured at every stop it declares: UA's parchment is a three-stop sheet, and
 * "clears on the middle stop" is not a claim about the card.
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

/** Every solid colour a ground declares — one for a flat token, three for a gradient. */
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
 * A wash the chassis lays over its own ground before the body lands on it
 * (#1341). Resolved per theme and composited when it yields a colour, which is
 * what makes it theme-correct for free: `--faction-ephemerists-plate-wash` is a
 * gradient by day and the keyword `none` at night, so the dark plate is measured
 * bare — exactly as it is painted. Measuring the LIGHT wash over the DARK plate
 * is how #1252 recorded a 3.16:1 dark failure that no surface has.
 *
 * The tightest stop is the one that gates: a top-anchored ramp fading to
 * transparent is at full strength where the row's first line sits.
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

/** What one chassis publishes and what it publishes it onto. */
interface Measured {
  ink: string
  ground: string
  veil: string | null
}

/**
 * The pairing each chassis was measured at, by slug. TYPED ON PURPOSE: these
 * token names ARE the subject — read back off the component they would only
 * assert that it equals itself. The POPULATION is not typed (#2815); it comes
 * off the feedFrame registry below.
 */
const MEASURED: Record<string, Measured> = {
  ua: { ink: '--faction-ua-card-accent', ground: '--faction-ua-parchment', veil: null },
  wow: { ink: '--faction-wow-card-accent', ground: '--faction-wow-card-bg', veil: null },
  singularity: {
    ink: '--faction-singularity-card-accent',
    ground: '--faction-singularity-term-bg',
    veil: null,
  },
  // The four #1252 left, fixed by #1341. Three repoint to an ink their own
  // family already declares for type on this exact stock; only Everymen mints.
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

/**
 * The two chassis that publish NO ink of their own, so there is no pairing to
 * measure: they are the fallback seam, and it has its own describe block at the
 * foot of this file (#2108). The exclusion is named rather than expressed by
 * writing out the seven that survive.
 */
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

/**
 * Fold `var(--<surface-prefix>-<role>, <today's token>)` back to the token
 * (#2674). A chassis migrated onto `utils/factionRoles.ts` asks its faction for
 * a ROLE and carries today's token as the fallback, so the ink this row
 * measures has not moved; only its spelling has. The gate on that claim is
 * `utils/__tests__/factionRoleMigration.test.ts`, which re-derives every
 * fallback from the resolver and fails if one drifts — without it, folding here
 * would be lenient rather than sound. (`factions/__tests__/wowRoleMap.test.ts`
 * is a different guard: the rootless kit modules and the carve-outs.) Naming each surface's prefix in this nine-faction table
 * would instead make it a file every faction lane has to edit.
 */
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
    // The row's default hue is gone from the NAME. It stays on the fills — the
    // headline rule and the monogram disc — which are ADR-0039's, not this seam's.
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
 * THE SEAM WHEN NOBODY ANSWERS (#2108).
 *
 * Every case above is a chassis publishing an ink it measured. This is the other
 * half: the neutral feed, where no frame publishes one and the body falls back.
 * That fallback was the bare spine hue and its docstring claimed the hue "is
 * legible on the app's neutral page" — measured on `--faction-default-card-bg`,
 * three of the eight are not (Ephemerists 2.36:1, S.N.I.D.E. 2.67:1, Coven
 * 3.10:1, against 4.5:1 for an 18px/700 name).
 *
 * The assertion is deliberately about the RESOLVED ink and its pairing rather
 * than about a hard-coded token name: what matters is that the fallback is a
 * colour that clears the neutral ground for every slug, in both themes, and a
 * name-only check would pass a neutral that had drifted.
 */
describe('the neutral feed row falls back to a measured ink', () => {
  const FALLBACK = resolveFeedRowInk(undefined, 'ephemerists').actor

  it('does not fall back to any faction hue', () => {
    for (const slug of ['ua', 'wow', 'snide', 'coven', 'ephemerists', 'singularity', 'everymen', 'albescent']) {
      expect(resolveFeedRowInk(undefined, slug).actor).toBe(FALLBACK)
      expect(FALLBACK).not.toContain(`--faction-${slug}`)
    }
    // The hue keeps its FILL job on the same row — the monogram disc.
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
