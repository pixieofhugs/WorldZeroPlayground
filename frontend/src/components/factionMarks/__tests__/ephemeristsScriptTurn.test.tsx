/**
 * The Ephemerists' labels travel: ONE mechanism, ONE catalog (#2148, from
 * #2038's two-label version, epic #2140).
 *
 * THE SEAM IS FOUR ARTEFACTS THAT MUST AGREE AND HAVE NO COMPILER BETWEEN THEM:
 * the catalog (`locales/en/glosses.json`), the generated font sheets
 * (`fonts.css` + `fonts.faction.css`, and the `TEXT_FACES` list in
 * `scripts/fetch-fonts.mjs` that writes them), the shared component, and the
 * surfaces that mount it. This repo has no jsdom (`renderToStaticMarkup` only,
 * so effects never run and geometry is out of reach), and the failures that
 * matter here are all invisible to a running browser on the author's own box:
 *
 *   • A GLYPH WITH NO FACE renders as tofu on Linux and Android and renders
 *     perfectly on the reviewer's Mac or Windows box, because the per-OS
 *     fallbacks (`Geeza Pro`, `Segoe UI Historic`) cover different scripts.
 *     So the codepoint check below reads the casts out of the CATALOG and asks
 *     whether the kit ships a `unicode-range` covering each one, in the family
 *     the component names for that script. Adding a word to the catalog and
 *     forgetting `TEXT_FACES` is the one-line change this exists to catch.
 *   • A SECOND ARRAY OF CASTS is the defect #2148 was filed about: the vendored
 *     design writes five of them and two have already drifted. The catalog is
 *     asserted to be the only place any cast string is written.
 *   • A ROTATION THAT CANNOT BE STOPPED is a WCAG 2.2.2 defect that looks
 *     exactly like a working feature. The stylesheet, not the component, is
 *     where both mechanisms live, so the stylesheet is what is asserted — and
 *     every surface that mounts a gloss is asserted to carry the scope class
 *     the pause selector needs.
 *
 * The box-pinning is the third thing markup can prove and a browser cannot
 * easily: all five frames are laid in ONE grid cell, so the slot is the widest
 * of them by layout rather than by a measurement pass a test could not run.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from "vitest"
import '../../../i18n'
import i18n from '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import EphemeristsGloss, { SCRIPTS, casts, nextTurn, type GlossWord } from '../EphemeristsGloss'
import EphemeristsTaskCard from '../../taskCard/EphemeristsTaskCard'
import EphemeristsScoreStamp from '../../praxisCard/scoreStamp/EphemeristsScoreStamp'
import EphemeristsFactionHero from '../../factionHero/EphemeristsFactionHero'
import { aTask } from '../../../test/fixtures'
import catalog from '../../../locales/en/glosses.json'
import { readStripped, sourceFiles, toRelative } from '../../../test/sourceScan'

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const FONTS_CSS =
  readFileSync(join(SRC, 'fonts.css'), 'utf-8') +
  readFileSync(join(SRC, 'fonts.faction.css'), 'utf-8')
const INDEX_CSS = readFileSync(join(SRC, 'index.css'), 'utf-8')
const WORDS = Object.keys(catalog) as GlossWord[]

/** Every English copy catalog but the gloss catalog itself. */
const catalogs = (): string[] =>
  sourceFiles({ dir: join(SRC, 'locales', 'en'), match: /\.json$/ }).filter(
    (path) => !path.endsWith('glosses.json'),
  )

const TASK = aTask({ in_progress_count: 2 })

const renderCard = (task = TASK): string =>
  renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsTaskCard
        task={task}
        basePoints={task.point_value}
        multiplier={1}
        inProgressCount={task.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )

const renderStamp = (): string =>
  renderToStaticMarkup(
    <EphemeristsScoreStamp
      praxis={
        {
          task_point_value: 12,
          display_multiplier: 1.5,
          metatask_points: 3,
          points_from_votes: 4,
          habit_bonus_points: 2,
          is_top_for_task: false,
          score: 26.5,
        } as PraxisCardOut
      }
    />,
  )

const renderHero = (): string =>
  renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsFactionHero slug="ephemerists" name="The Ephemerists" members={12} tasks={5} praxes={31} />
    </MemoryRouter>,
  )

/** Every cast string the catalog ships, flat. */
const everyCast = (): string[] => WORDS.flatMap((word) => casts(word).map((cast) => cast.text))

describe('one catalog, and it is the only one (#2148)', () => {
  it('gives every word every registered script, none of them blank', () => {
    for (const word of WORDS) {
      const cast = casts(word)
      expect(cast.map((entry) => entry.script), word).toEqual([...SCRIPTS])
      for (const entry of cast) {
        expect(entry.text.length, `${word}.${entry.script}`).toBeGreaterThan(0)
        // An i18next miss resolves to the key itself; that is a blank cast
        // wearing the catalog's clothes.
        expect(entry.text, `${word}.${entry.script}`).not.toContain(word)
      }
    }
  })

  it('writes no cast anywhere but the catalog', () => {
    // The defect #2148 names: five arrays at five moments, two of them already
    // drifted. Any second copy of a cast string — in a component, in another
    // locale file — is that defect coming back, so the whole of `src/` is asked
    // rather than the three surfaces that happen to gloss today.
    //
    // Comments are stripped, as `catalogLexicon` does: a docstring may quote a
    // cast (the score stamp's names `PVNCTA` to explain why it does NOT set it),
    // a rendered string may not.
    const offenders: string[] = []
    const written = everyCast()
    for (const path of [...sourceFiles(), ...catalogs()]) {
      const source = readStripped(path)
      for (const cast of written) {
        if (source.includes(cast)) offenders.push(`${cast} in ${toRelative(path)}`)
      }
    }
    expect(offenders, 'a cast belongs to locales/en/glosses.json and nowhere else').toEqual([])
  })

  it('takes the resting frame from the live catalogue, never from a hardcoded cast', () => {
    const before = i18n.t('feed:taskCard.signup')
    i18n.addResourceBundle('en', 'feed', { taskCard: { signup: 'Apuntarse' } }, true, true)
    const html = renderCard()
    expect(html, 'the CTA follows the catalogue').toContain('Apuntarse')
    expect(html, 'while the casts stay put').toContain(catalog.signup.latin)
    i18n.addResourceBundle('en', 'feed', { taskCard: { signup: before } }, true, true)
  })
})

describe('the rotation is decoration over a stable accessible name (#2148)', () => {
  /** The frames of one gloss, rendered on its own. */
  const gloss = (word: GlossWord, english: string) =>
    renderToStaticMarkup(<EphemeristsGloss word={word} english={english} />)

  it('rests in English, with every cast in the markup behind it', () => {
    const html = gloss('points', 'Points')
    // Frame 0 is the English, and it is the visible one — which is also the
    // whole of the reduced-motion rendering, since with no animation there is
    // no `animationiteration` to advance it.
    expect(html).toContain('visibility:visible">Points</span>')
    for (const cast of casts('points')) {
      expect(html, cast.text).toContain(`visibility:hidden`)
      expect(html, cast.text).toContain(cast.text)
    }
    // Five frames in ONE grid cell: the slot is the widest by layout.
    expect(html.match(/grid-area:1 \/ 1/g)?.length).toBe(SCRIPTS.length + 1)
  })

  it('hides every glyph from assistive tech and leaves the word behind', () => {
    const html = gloss('signup', 'Sign up')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('<span class="sr-only">Sign up</span>')
    // The accessible name is the word once, never a concatenation of five.
    expect(html.match(/Sign up/g)?.length).toBe(2) // sr-only + resting frame
  })

  it('turns the labels on all three surfaces, and no numeral anywhere', () => {
    for (const [surface, html] of [
      ['task card', renderCard()],
      ['score stamp', renderStamp()],
      ['faction hero', renderHero()],
    ] as const) {
      expect(html, `${surface} mounts a gloss`).toContain('class="eph-turn"')
      // WCAG 2.2.2's pause mechanism is a descendant selector; a stack with no
      // scope above it cannot be paused at all.
      expect(html, `${surface} carries the pause scope`).toContain('eph-turn-scope')
    }
  })

  it('leaves the wordmark in English', () => {
    // Counted over the TEXT, not the markup: since #2167 the band is a link to
    // the faction page and its `aria-label` names the faction too.
    const html = renderCard()
    expect(html.replace(/<[^>]*>/g, '').match(/The Ephemerists/gi)?.length).toBe(1)
  })

  it('says nothing but the reason on a card that cannot be signed up for', () => {
    const denied = aTask({ can_sign_up: false, signup_reason: 'below_level' })
    const html = renderCard(denied)
    expect(html, 'a refusal is not an invitation in four scripts').not.toContain(
      catalog.signup.latin,
    )
    // The points label is a unit, not an offer, so it turns either way.
    expect(html).toContain(catalog.points.latin)
  })
})

/**
 * Every codepoint the kit prints has a face shipped for it.
 *
 * The failure this exists for does not throw, warn or look wrong to whoever
 * wrote it — `docs/agents/design-fidelity.md` records the same class from #821.
 */
describe('no cast can render as tofu (#2148)', () => {
  /** The codepoints one family's `@font-face` rules cover. */
  function coverage(family: string): Set<number> {
    const points = new Set<number>()
    for (const block of FONTS_CSS.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      if (!block[1].includes(`font-family: '${family}'`)) continue
      const range = block[1].match(/unicode-range:\s*([^;]+);/)?.[1] ?? ''
      for (const part of range.split(',')) {
        const [from, to] = part.trim().replace(/^u\+/i, '').split('-')
        const start = parseInt(from, 16)
        const end = to === undefined ? start : parseInt(to, 16)
        for (let point = start; point <= end; point++) points.add(point)
      }
    }
    return points
  }

  it('ships a face covering every non-Latin character of every cast', () => {
    const missing: string[] = []
    for (const word of WORDS) {
      for (const cast of casts(word)) {
        const family = String(cast.style.fontFamily).match(/'([^']+)'/)?.[1]
        if (!family) continue // Cinzel, via the shared token — already loaded.
        const covered = coverage(family)
        for (const character of cast.text) {
          const point = character.codePointAt(0)
          if (point !== undefined && !covered.has(point)) {
            missing.push(`${character} (U+${point.toString(16)}) in ${family}`)
          }
        }
      }
    }
    expect(
      missing,
      `The generated font sheets ship no face covering ${missing.join(', ')}.\n` +
        `Nothing fails: the glyph renders in whatever system font the viewer's\n` +
        `OS happens to carry for that script, or as a tofu box if it carries\n` +
        `none — and the two look identical to a reviewer whose OS has one.\n` +
        `Add the character to TEXT_FACES in frontend/scripts/fetch-fonts.mjs and re-run it.`,
    ).toEqual([])
  })
})

/**
 * ONE RULE, A PHASE PER LABEL (#2392) — what #2148 asked for and did not ship.
 *
 * The clock used to be TWO rules, `.eph-turn-points` at 6.5s and `.eph-turn-cta`
 * at 7s, alternated by ordinal. Two rules stagger two labels; the score stamp
 * has FIVE, so its 1st/3rd/5th shared a rule and turned on the same beat. The
 * period was 6.5–7s where #2148 asks for 9–11s.
 *
 * Each half is asserted where it is decided: the PERIOD in the stylesheet (one
 * declaration, or it is not one token), the PHASE in the rendered markup of the
 * surface that actually has five labels. A count of DISTINCT phases is the
 * assertion, because a reused clock is exactly the failure that hides — the
 * labels still turn, they just turn together.
 *
 * THE TOKEN IS NAMED `--ephturn-*` and the missing hyphen is deliberate:
 * `--eph-*` is the retired illuminated-codex COLOUR family, and four suites
 * (`scoreStamp`, `ephemeristsMasthead`, `ephemeristsPlateSurfaces`,
 * `ephemeristsFeedFrame`) assert no plate surface renders it. A motion token
 * spelled `--eph-turn-phase` fails all four, so the spelling is asserted here
 * rather than rediscovered by whoever "tidies" it.
 */
describe('one clock, a phase per label (#2392)', () => {
  const PHASE = /--ephturn-phase:([^&";]+)/g

  it('declares the period once, in the 9-11s band #2148 asked for', () => {
    expect(
      INDEX_CSS.match(/animation:\s*eph-turn/g)?.length,
      'one rule, not one per clock',
    ).toBe(1)
    const period = INDEX_CSS.match(/--ephturn-period:\s*([\d.]+)s/)
    expect(period, 'the period is a token').not.toBeNull()
    expect(Number(period![1])).toBeGreaterThanOrEqual(9)
    expect(Number(period![1])).toBeLessThanOrEqual(11)
  })

  it('gives the score stamp five labels and five different beats', () => {
    const phases = [...renderStamp().matchAll(PHASE)].map((m) => m[1])
    expect(phases.length, 'five turning labels on the stamp').toBe(5)
    expect(new Set(phases).size, 'and no two of them on the same beat').toBe(5)
  })

  it('phases the labels of every other glossed surface apart too', () => {
    for (const [surface, html] of [
      ['task card', renderCard()],
      ['faction hero', renderHero()],
    ] as const) {
      const phases = [...html.matchAll(PHASE)].map((m) => m[1])
      expect(phases.length, `${surface} turns more than one label`).toBeGreaterThan(1)
      expect(new Set(phases).size, `${surface} staggers them`).toBe(phases.length)
    }
  })

  it('keeps the clock out of the retired codex colour namespace', () => {
    expect(renderStamp(), 'a gloss renders no --eph-* token').not.toMatch(/--eph-[a-z]/)
  })
})

/**
 * WCAG 2.2.2 — the rotation auto-updates, starts on its own, and sits beside
 * other content, so it needs a mechanism to pause, stop or hide it. Two ship,
 * and both are in the stylesheet where the cascade can reach them.
 */
describe('the turn can always be stopped (#2148)', () => {
  /** The body of one rule, looked up by selector. */
  const rule = (selector: string): string =>
    INDEX_CSS.match(
      new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{([^}]*)\\}`),
    )?.[1] ?? ''

  it('starts only under prefers-reduced-motion: no-preference', () => {
    const gated = INDEX_CSS.slice(INDEX_CSS.indexOf('@keyframes eph-turn'))
    const declaration = gated.indexOf('animation: eph-turn')
    const guard = gated.lastIndexOf('@media (prefers-reduced-motion: no-preference)', declaration)
    expect(declaration, 'the turn is declared at all').toBeGreaterThan(0)
    expect(guard, 'and only inside the reduced-motion guard').toBeGreaterThan(0)
    // Nothing between the guard and the declaration closes it.
    expect(gated.slice(guard, declaration)).not.toContain('}\n}')
  })

  it('pauses while a glossed surface is hovered or focused', () => {
    expect(rule('.eph-turn-scope:hover .eph-turn')).toContain('animation-play-state: paused')
    expect(rule('.eph-turn-scope:focus-within .eph-turn')).toContain(
      'animation-play-state: paused',
    )
  })

  it('keeps the clock in the stylesheet, never inline', () => {
    // An inline animation property would be motion the media query cannot
    // reach. Only a VALUE counts — the component names the keyframes in prose.
    const source = readFileSync(join(SRC, 'components', 'factionMarks', 'EphemeristsGloss.tsx'), 'utf-8')
    expect(source).not.toMatch(/animation[A-Za-z]*:\s*["'`]/)
  })

  it('never shows the same frame twice running', () => {
    for (let current = 0; current < 5; current++) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const next = nextTurn(current, 5)
        expect(next).not.toBe(current)
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThan(5)
      }
    }
  })
})
