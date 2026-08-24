/**
 * NOTHING DISPATCHED TO ALBESCENT HOLDS A STILL SPECTRUM (#2500, epic #2496).
 *
 * #2497 minted `.spectrum-rule` and `.spectrum-dial` for the seventeen unclassed
 * inline spectra scattered through the ten `Default*` files Albescent wears, and
 * its own note says why: *"#2500 is what will animate them."* This is that,
 * and the seam is the one the census exposed — a MOUNT WITH NO DRESSER OVER IT.
 *
 * ## The defect this goes red on
 *
 * Before this issue only two of those mounts moved, and both by a selector
 * naming one surface (`.alb-stamp .spectrum-rule`, #2501). Every other classed
 * spectrum on an Albescent surface — the task card's two hairlines and its
 * points ring, the task detail's four rules, the praxis detail's dial and two
 * bands, the faction body's five plate rules, the whole profile — stood still,
 * and nothing could see it: each one renders, paints and passes every existing
 * test whether or not a `::before` is walking across it.
 *
 * So the guard is a CENSUS, pinned. `alb-moves` is the marker that says "this
 * surface is dispatched to Albescent, so the na spectra inside it move"; the
 * list below is every wrapper that carries it and the reason. A wrapper dropped
 * from the list, or a new Albescent surface that forgets the class, is the exact
 * shape of the defect and turns this red.
 *
 * ## Why `:empty` is in the selector and not an oversight
 *
 * `.spectrum-rule` is worn by two different objects. Most mounts are ORNAMENT —
 * an `aria-hidden` hairline, band, chip or progress fill with no children — and
 * those travel. Four are FRAMES: a padded ramp wrapped around an opaque inner
 * sheet (the ×mult badge, the task-detail action panel, the praxis proof panel,
 * the profile identity band). A travelling child inside a frame has to be
 * clipped and its content lifted back over the rim, and the identity band would
 * then carry two ramps at two speeds, since `.alb-profile-edge` already travels
 * on it — the "one carrier per object" #2519 spent a PR establishing. `:empty`
 * is the difference between the two objects, stated once.
 *
 * ## Harness
 *
 * The stylesheet read as source text, plus `renderToStaticMarkup` — no DOM and
 * no compositor in CI (SPEC-testing.md), so nothing here proves a pixel. The
 * pixels are visual QA and stated outstanding on the PR.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../i18n'
import { stripComments, ruleBodies } from '../utils/__tests__/cssVars'
import AlbescentSeal from '../components/metataskSeal/skins/AlbescentSeal'
import type { TaskOut } from '../api/tasks'

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const INDEX = stripComments(read('../index.css'))
const MOTION = stripComments(read('../motion.ornament.css'))

/**
 * THE CENSUS. Every row of `ALBESCENT_MANIFEST` whose na component declares a
 * `.spectrum-rule` or a `.spectrum-dial`, and therefore had a still spectrum on
 * it until this issue.
 */
const WEARS_THE_MARKER: Record<string, string> = {
  // two hairlines (the in-progress chip, the CTA rule) + DefaultPointsRing's dial
  '../components/taskCard/AlbescentTaskCard.tsx': 'task card',
  // the vote divider
  '../components/praxisCard/desktop/AlbescentPraxisCard.tsx': 'praxis card',
  // the band and the working-out rule — #2501's two, generalised
  '../components/praxisCard/scoreStamp/AlbescentScoreStamp.tsx': 'score stamp',
  // two section heads, the eyebrow chip, the breakdown hairline
  '../pages/taskDetail/archetypes/AlbescentTaskDetail.tsx': 'task detail',
  // the member dial, a section head, the sheet-head band
  '../pages/praxisDetail/archetypes/AlbescentPraxisDetail.tsx': 'praxis detail',
  // the section heads, the badge and laurel dials, the progression fill
  '../pages/characterProfile/archetypes/AlbescentProfileBody.tsx': 'profile',
  // the five plates' hairlines
  '../pages/factionDetail/archetypes/AlbescentFactionBody.tsx': 'faction body',
  // the pale sheet's one strip — classed here, since the seal is Albescent's own
  '../components/metataskSeal/skins/AlbescentSeal.tsx': 'metatask seal',
}

/**
 * The rows deliberately WITHOUT it, each because its na component declares
 * neither class — so there is no still spectrum for a marker to reach. The
 * assertion is computed rather than asserted by hand: a `Default*` that grows
 * one turns this red and sends the reader back to the census.
 */
const NO_CLASSED_SPECTRUM: Record<string, string> = {
  '../components/feed/FactionFeedFrame.tsx': 'feed frame',
  '../pages/editPraxis/archetypes/DefaultEditPraxis.tsx': 'composer',
  '../components/factionHero/DefaultFactionHero.tsx': 'faction hero',
  '../components/avatar/FactionAvatar.tsx': 'avatar',
  '../components/vote/AlbescentVote.tsx': 'vote',
  '../components/selectCard/AlbescentSelectCard.tsx': 'select card',
}

describe('the census: every Albescent surface with a classed spectrum wears the marker', () => {
  for (const [path, surface] of Object.entries(WEARS_THE_MARKER)) {
    it(`${surface} carries alb-moves`, () => {
      expect(read(path)).toContain('alb-moves')
    })
  }

  for (const [path, surface] of Object.entries(NO_CLASSED_SPECTRUM)) {
    it(`${surface} has no classed spectrum to move`, () => {
      const source = read(path)
      expect(source).not.toContain('className="spectrum-rule')
      expect(source).not.toContain("className='spectrum-rule")
      expect(source).not.toContain('className="spectrum-dial')
      expect(source).not.toContain("className='spectrum-dial")
    })
  }

  /**
   * The mobile field desk is the one exception and it is a REPLACEMENT, not an
   * omission: `DefaultFieldDesk` does draw a `.spectrum-rule`, and #2519 took it
   * off the Albescent desk when the identity card grew a travelling border. One
   * carrier per object — so the desk needs no marker because the bar is gone,
   * and this is the line that says so.
   */
  it('the field desk drops its bar rather than moving it', () => {
    const bodies = ruleBodies(INDEX, '.alb-desk .spectrum-rule')
    expect(bodies.length).toBeGreaterThan(0)
    expect(bodies.join('\n')).toContain('display: none')
  })
})

describe('the track lives on the blocking sheet', () => {
  it('an ornament rule is a clip with a containing block', () => {
    const body = ruleBodies(INDEX, '.alb-moves .spectrum-rule:empty').join('\n')
    expect(body).toContain('overflow: hidden')
    expect(body).toContain('position: relative')
  })

  it('a dial and its face are both in the positioned layer', () => {
    expect(ruleBodies(INDEX, '.alb-moves .spectrum-dial').join('\n')).toContain(
      'position: relative',
    )
    expect(ruleBodies(INDEX, '.alb-moves .spectrum-dial > *').join('\n')).toContain(
      'position: relative',
    )
  })

  /** Paint may not defer, and motion may not block. Neither may cross. */
  it('index.css declares no animation for the marker', () => {
    const marker = INDEX.split('\n').filter((line) => line.includes('.alb-moves'))
    expect(marker.join('\n')).not.toContain('animation')
  })

  /**
   * The generalisation REPLACES #2501's two selectors rather than standing
   * beside them. Two rules doing the same job to the same mounts is how a
   * duration silently forks.
   */
  it('the score stamp no longer names itself', () => {
    expect(INDEX).not.toContain('.alb-stamp .spectrum-rule {')
    expect(MOTION).not.toContain('.alb-stamp .spectrum-rule::before')
    expect(MOTION).not.toContain('.alb-stamp .spectrum-dial::before')
  })
})

describe('the motion is a transform on a pre-painted gradient', () => {
  const gate = '@media (prefers-reduced-motion: no-preference)'

  it('both children exist only inside the reduced-motion gate', () => {
    for (const selector of [
      '.alb-moves .spectrum-rule:empty::before',
      '.alb-moves .spectrum-dial::before',
    ]) {
      const at = MOTION.indexOf(selector)
      expect(at, selector).toBeGreaterThan(-1)
      expect(MOTION.lastIndexOf(gate, at), selector).toBeGreaterThan(-1)
      expect(INDEX, selector).not.toContain(selector)
    }
  })

  it('the band states the loop cut and the rim inherits its wheel', () => {
    const band = ruleBodies(MOTION, '.alb-moves .spectrum-rule:empty::before').join('\n')
    // A two-tile child slid by exactly one tile — the only cut that cannot seam.
    expect(band).toContain('width: 200%')
    expect(band).toContain('background-size: 50% 100%')
    expect(band).toContain('var(--faction-default-rainbow-loop)')
    expect(band).toContain('alb-edge-travel')

    const rim = ruleBodies(MOTION, '.alb-moves .spectrum-dial::before').join('\n')
    expect(rim).toContain('background-image: inherit')
    expect(rim).toContain('alb-spin')
  })

  /**
   * Epic ruling: never animate a gradient parameter. `@property` inside a
   * `conic-gradient` re-rasterises every frame; so does walking
   * `background-position`. Both keyframes named above are bare transforms and
   * are declared elsewhere on this sheet — nothing new is minted here.
   */
  it('neither child walks a gradient parameter', () => {
    const bodies = [
      ...ruleBodies(MOTION, '.alb-moves .spectrum-rule:empty::before'),
      ...ruleBodies(MOTION, '.alb-moves .spectrum-dial::before'),
    ].join('\n')
    expect(bodies).not.toContain('background-position')
    expect(bodies).not.toContain('@property')
  })
})

describe('the seal, whose only spectrum was unclassed', () => {
  const METATASK = {
    id: 12,
    title: 'File it before the tide turns',
    point_value: 15,
    metatask_faction_slug: 'albescent',
  } as unknown as TaskOut

  it('wears the marker over a classed strip', () => {
    const html = renderToStaticMarkup(<AlbescentSeal metatask={METATASK} />)
    expect(html).toContain('alb-moves')
    expect(html).toContain('spectrum-rule')
    // The ramp is the class's now — an inline copy would be a second declaration
    // of the same paint, and the one the stylesheet cannot reach.
    expect(html).not.toContain('--faction-default-rainbow)')
  })
})
