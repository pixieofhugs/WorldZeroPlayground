/**
 * Page-ground dispatch guard (`backdrop` surface, #1406). The seam is the
 * lookup: slug on BackdropContext → the component rendered. The `na` path is
 * live (every unaffiliated profile). Every registered slug is pinned to its OWN
 * backdrop too, or "always resolves to na" would pass.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentType } from 'react'
import { describe, it, expect } from 'vitest'

import FactionBackdrop from '../FactionBackdrop'
import { BackdropContext } from '../BackdropContext'
import WatercolorBackground from '../../layout/WatercolorBackground'
import CovenBackdrop from '../CovenBackdrop'
import EphemeristsBackdrop from '../EphemeristsBackdrop'
import EverymenBackdrop from '../EverymenBackdrop'
import SingularityBackdrop from '../SingularityBackdrop'
import SnideBackdrop from '../SnideBackdrop'
import UaBackdrop from '../UaBackdrop'
import WowBackdrop from '../WowBackdrop'

/** Render the dispatcher as if a page had themed the ground to `slug`. */
function backdropFor(slug: string | null): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider
      value={{ slug, cardsKeepOrnament: false, setGround: () => {} }}
    >
      <FactionBackdrop />
    </BackdropContext.Provider>,
  )
}

/** What the component would draw if it were reached directly. */
function markupOf(Component: ComponentType): string {
  return renderToStaticMarkup(<Component />)
}

const WATERCOLOR = markupOf(WatercolorBackground)

/** Every slug that claims `backdrop` in its manifest, and the skin it claims. */
const REGISTERED: ReadonlyArray<readonly [string, ComponentType]> = [
  ['coven', CovenBackdrop],
  ['ephemerists', EphemeristsBackdrop],
  ['everymen', EverymenBackdrop],
  ['singularity', SingularityBackdrop],
  ['snide', SnideBackdrop],
  ['ua', UaBackdrop],
  ['wow', WowBackdrop],
]

describe('FactionBackdrop dispatch', () => {
  it('gives every registered faction its OWN ground, not the watercolor', () => {
    for (const [slug, Skin] of REGISTERED) {
      expect(backdropFor(slug), `${slug} reaches its own backdrop`).toBe(
        markupOf(Skin),
      )
      expect(backdropFor(slug), `${slug} is not the neutral ground`).not.toBe(
        WATERCOLOR,
      )
    }
  })

  it('serves `na` the watercolor ground rather than nothing (#1406)', () => {
    // An unaffiliated profile would otherwise render a bare sheet.
    expect(backdropFor('na')).toBe(WATERCOLOR)
    expect(backdropFor('na')).not.toBe('')
  })

  it('serves a null slug the same watercolor ground', () => {
    // Neutral pages, and every faction page's pre-load frame.
    expect(backdropFor(null)).toBe(WATERCOLOR)
  })

  it('serves an unregistered slug the watercolor ground, never a blank page', () => {
    expect(backdropFor('no-such-faction')).toBe(WATERCOLOR)
  })

  it('gives albescent exactly `na`’s ground, leaking nothing (ADR-0027/0048)', () => {
    // Albescent claims no `backdrop` on purpose, so it must fall through — a
    // hardcoded roster would give it a visible ground. Compared against na's own.
    expect(backdropFor('albescent')).toBe(backdropFor('na'))
    expect(backdropFor('albescent')).not.toContain('albescent')
  })
})
