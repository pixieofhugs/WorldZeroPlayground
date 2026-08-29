/**
 * The Players page paints no faction spine hue as TEXT (#1932).
 *
 * SEAM: the `color`-role declarations the two surfaces emit, plus the two
 * neutral grounds this page actually draws on. Not a route, not a ratio on a
 * token's documentation — the pairing a component *rendered*.
 *
 * WHY IT NEEDS ITS OWN FILE, next to `playersDirectory.test.tsx` which already
 * renders both surfaces. That file asserts what the page SAYS; this one asserts
 * what it paints, and the two answers are governed by different documents. The
 * nightly found it (14 measured failures, every one in LIGHT), and the nightly
 * needs Playwright, a backend and a seeded Postgres. The decision underneath it
 * — "is this ink legible on that ground" — needs none of that, which is the
 * same argument `contrastTriage.test.ts` makes for the triage half of #1762.
 *
 * WHY NEITHER STANDING GUARD SAW IT.
 *
 *   - `factionContrast.test.ts` measures a token against the surface its
 *     DECLARATION names. `--faction-wow` declares a fill, and its own comment at
 *     `--faction-wow-on-fill` records the measurement from the other side (at the
 *     time, of the gold that hue then was: "white only 2.15:1"). Nothing there is
 *     wrong; the pairing this page drew was simply not one the manifest could
 *     name. Which faction is the worst offender moves — #2068 swapped WOW's gold
 *     for a plum and gave Ephemerists a brass — so read the measured block below
 *     rather than any faction name in this prose.
 *   - `local/no-global-ink-on-faction-surface` (#1819) is scoped to
 *     `archetypes/`, `mobileArchetypes/` and `components/factionMarks/`, and
 *     `pages/players/` is in none of them — correctly, because this page is
 *     NEUTRAL chrome that happens to dispatch on a slug. And the rule's polarity
 *     is the other one anyway: it bans a global ink on a faction sheet. This was
 *     a faction ink on a global sheet, which no rule bans. See the PR body.
 *
 * ONE RULE DOES BAN IT NOW (#2077): `local/no-faction-hue-as-ink`, the inverse
 * arm, with no path glob — a bare spine hue is a fill on every ground, so there
 * is no scope question to get wrong. It would have caught five of this page's six
 * slots at the point of writing. Not the sixth: `--gem-ink` reached the numeral
 * through `LevelGem`'s props from another file, and no single-module AST walk
 * follows that. Which is why this file did not become redundant when the rule
 * landed, and why both now read one shared `utils/__tests__/inkSeam.ts`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { fillUses, inkOffenders } from '../../../utils/__tests__/inkSeam'
import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' as const, toggle: () => {} }),
}))

import DesktopPlayers from '../DesktopPlayers'
import MobilePlayers from '../MobilePlayers'
import { NO_RELATIONSHIPS, rankPlayers, type PlayersViewProps } from '../playersData'
import { readIndexCss } from '../../../test/indexCss'

// ── The two grounds ────────────────────────────────────────────────────────
//
// Both are what the browser reported in run 31964402024, and both fall out of
// index.css rather than being typed in here:
//
//   rgb(247, 244, 238) = `--color-bg-page`, the bare page.
//   rgb(253, 252, 250) = `--color-bg-surface` composited over it — the frost the
//                        signed-in player's own roster row wears. It is ALPHA
//                        (rgba(255,255,255,0.72) light), so it has no value of
//                        its own and `contrastRatio` throws if you hand it one
//                        un-composited (#1413). That extra layer is the whole
//                        0.13 between UA's 4.59:1 as declared and its 4.46:1 as
//                        rendered, and it is the layer this repo has now missed
//                        three times (#1715, #1579, and the declaration comment
//                        at `--faction-ua-on-fill`).
const THEMES = readThemes(readIndexCss())

function token(name: string, theme: Theme): Rgba {
  const raw = resolveVar(name, theme, THEMES)
  if (raw === null) throw new Error(`${name} does not resolve under ${theme}`)
  const colour = parseColor(raw)
  if (colour === null) throw new Error(`${name} resolves to an unparseable ${raw}`)
  return colour
}

function grounds(theme: Theme): { page: Rgba; frost: Rgba } {
  const page = token('--color-bg-page', theme)
  return { page, frost: compositeOver(token('--color-bg-surface', theme), page) }
}

/** The seven spine hues, in the order `factionCssVar` can hand them out. */
const SPINE_KEYS = ['ua', 'everymen', 'wow', 'snide', 'ephemerists', 'singularity', 'coven'] as const

// ── The render seam ────────────────────────────────────────────────────────
//
// `declarations` / `INK_PROPS` / `FACTION_TOKEN` were defined here until #2077
// needed the identical question asked of the faction cards, the two invitation
// rows, the task card's metatask chip and all eight task-detail bylines. They
// live in `utils/__tests__/inkSeam.ts` now — one definition, two callers, and
// the reason that matters is in that file's header: a guard reading a stale
// `INK_PROPS` reports green over exactly the property nobody added to it.

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 5,
    score: 100,
    all_time_score: 100,
    faction_slug: 'wow',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

/**
 * A field that puts the two REPORTED hues on the podium and in the roster, and
 * an unaffiliated player besides — `na` must keep the spectrum (ADR-0039), so a
 * fix that reached for a flat neutral everywhere would show up here.
 */
const FIELD: CharacterOut[] = [
  player({ id: 11, display_name: 'Pip', faction_slug: 'wow', score: 412 }),
  player({ id: 22, display_name: 'Ada', faction_slug: 'ua', score: 388 }),
  player({ id: 33, display_name: 'Nodefour', faction_slug: 'singularity', score: 341 }),
  player({ id: 44, display_name: 'Wren', faction_slug: 'na', score: 296 }),
  ...SPINE_KEYS.map((slug, index) =>
    player({ id: 100 + index, display_name: `Filler ${index}`, faction_slug: slug, score: 200 - index }),
  ),
]

function props(overrides: Partial<PlayersViewProps> = {}): PlayersViewProps {
  return {
    ranked: rankPlayers(FIELD, 'era'),
    scoreMode: 'era',
    onScoreMode: () => {},
    eyebrow: 'Renaissance · The Standings',
    // The WOW player, so their own row wears the frost — the tighter of the
    // two grounds and the one the nightly reported both label failures on.
    myCharId: 11,
    related: NO_RELATIONSHIPS,
    latest: { 11: { taskTitle: 'Left a poem in a library book', submittedAt: '2026-01-01T00:00:00Z' } },
    ...overrides,
  }
}

describe('the Players surfaces paint no faction hue as text', () => {
  for (const [surface, element] of [
    ['desktop', <DesktopPlayers {...props()} />],
    ['mobile', <MobilePlayers {...props()} />],
  ] as const) {
    it(`${surface}: no inline ink resolves to a faction spine hue`, () => {
      expect(inkOffenders(render(element))).toEqual([])
    })

    it(`${surface}: the hue still dresses the fills, rules and marks`, () => {
      // The other half of the fix, and the one a careless sweep would break:
      // this page is meant to be loudly faction-coded. Borders, washes, race
      // bars, gem strokes and glows all keep the spine hue.
      expect(fillUses(render(element)).length).toBeGreaterThan(0)
    })
  }
})

describe('why the hue cannot be the ink here, measured', () => {
  it('four of the seven spine hues are illegible as text on this page in light', () => {
    const { page, frost } = grounds('light')
    const measured = Object.fromEntries(
      SPINE_KEYS.map((key) => {
        const hue = token(`--faction-${key}`, 'light')
        return [key, { page: contrastRatio(hue, page), frost: contrastRatio(hue, frost) }]
      }),
    )

    // THE LARGE MISS MOVED FACTIONS IN #2068 AND THE ARITHMETIC DID NOT.
    // It was WOW's gold (1.96:1 on the page, 2.09 on the frost). WOW vacated the
    // yellow slot for a plum and Ephemerists took a brass, so the miss is now
    // Ephemerists' — 2.19:1 and 2.34:1 — and its own declaration records the same
    // measurement from the other side (`--faction-ephemerists-on-fill`: "white
    // only 2.40:1"), exactly as WOW's did. The ceiling is unchanged and is still
    // arithmetic rather than a failure of search: clearing 4.5:1 on the frost
    // needs an ink of relative luminance <= 0.1776, this hue sits at 0.3877 (the
    // gold it replaced sat at 0.4385), so a passing colour on its own hue line is
    // a dark bronze and `--faction-ephemerists-on-fill` would stop clearing on
    // the fill it was measured for. The brass says so at its own declaration in
    // index.css — "rules, borders — never an ink".
    expect(measured.ephemerists.page).toBeLessThan(AA_NORMAL)
    expect(measured.ephemerists.frost).toBeLessThan(AA_NORMAL)

    // And WOW now CLEARS both grounds — 5.80:1 and 6.20:1 — which is asserted so
    // that this row keeps saying something. #1932 concluded "there is no yellow",
    // and the fix was never a yellow: #2068 gave the spine the plum the chronicle
    // skin already wore. The page still paints no hue as text (the guard above),
    // because the rule is about the SLOT and not about which faction is failing
    // it this week — but a reader who finds WOW in a list of misses would be
    // reading a stale file.
    expect(measured.wow.page).toBeGreaterThanOrEqual(AA_NORMAL)
    expect(measured.wow.frost).toBeGreaterThanOrEqual(AA_NORMAL)

    // UA is the near miss, and it is instructive: 4.46:1 on the bare page while
    // clearing on the frost. `--faction-ua-on-fill`'s comment measured the hue
    // at 4.59:1 against #fcf7ef, a slightly LIGHTER warm white than the page,
    // and the whole 0.13 is the ground. Site-by-site is the fix here per the
    // 2026-08-14 owner ruling recorded in factionContrast.test.ts: no
    // per-faction on-page ink tier is minted to rescue a 0.04 shortfall.
    expect(measured.ua.page).toBeLessThan(AA_NORMAL)

    // The rest clear, and they are asserted so that a repaint of any one of them
    // cannot quietly join the misses above while this file still reads as if it
    // were about two factions.
    for (const key of ['everymen', 'singularity'] as const) {
      expect(measured[key].page).toBeGreaterThanOrEqual(AA_NORMAL)
    }
    // snide's acid and coven's pink are under AA on this ground too. They are
    // not in the nightly's 14 because no `snide` or `coven` row reached a
    // faction-inked slot in that run — a coverage fact, not a pass. Recording
    // them here is what stops "put the hue back for the factions it works for"
    // from ever looking like a two-faction exemption.
    expect(measured.snide.page).toBeLessThan(AA_NORMAL)
    expect(measured.coven.page).toBeLessThan(AA_NORMAL)
  })

  it('the inks it paints instead clear AA on both grounds, in both themes', () => {
    for (const theme of ['light', 'dark'] as Theme[]) {
      const { page, frost } = grounds(theme)
      // `.label-heading` reads `--label-ink`, which this page never repoints, so
      // it is `--color-text-tertiary`. The podium rank numeral inherits
      // `--color-text-primary` from the row it sits in.
      for (const ink of ['--color-text-tertiary', '--color-text-primary']) {
        const colour = token(ink, theme)
        expect(contrastRatio(colour, page)).toBeGreaterThanOrEqual(AA_NORMAL)
        expect(contrastRatio(colour, frost)).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    }
  })
})
