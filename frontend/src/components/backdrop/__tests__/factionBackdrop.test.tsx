/**
 * Page-ground dispatch guard (per-faction surface `backdrop`) — #1406.
 *
 * THE SEAM: `slug on BackdropContext` → `the component FactionBackdrop renders`.
 * Nothing else. The backdrops themselves are markup-free ornaments whose whole
 * metaphor lives in index.css; what can silently break is the lookup.
 *
 * Written because `FactionBackdrop`'s docblock ASSERTS a fallback ("a `na` or
 * unregistered slug is served WatercolorBackground, not left bare") and nothing
 * checked it. Its only appearance in the suite was `layoutShell.test.tsx:22`,
 * which mocks the component out to `null` — correct for a test about the shell,
 * and worth nothing here. A green suite guarded no part of the claim.
 *
 * The `na` path is live, not hypothetical: `CharacterProfile` puts
 * `character.faction_slug` on the context unfiltered, and an unaffiliated
 * character's slug IS `"na"` (ADR-0030; it is absent from `GET /factions` and
 * from `FACTION_RAINBOW_ORDER` — surfaces supply it as a sentinel — and since
 * #2530 it IS in the manifest list, where its `backdrop` row is the watercolour
 * this file asserts). So that branch runs on every unaffiliated player's
 * profile.
 *
 * WHY BOTH HALVES ARE HERE. Testing the na answer alone cannot tell "resolves
 * correctly" from "always resolves to na" — neuter the dispatch to
 * `surfaceMap('backdrop').na` and an na-only file stays green while every
 * faction loses its ground. So every registered slug is pinned to its OWN
 * backdrop, byte for byte, in the same file.
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
    // The claim the docblock makes and nothing checked. `na` has no manifest by
    // design, so it can only arrive here through the fallback — and it must
    // arrive somewhere, because an unaffiliated profile page would otherwise
    // render a bare white sheet.
    expect(backdropFor('na')).toBe(WATERCOLOR)
    expect(backdropFor('na')).not.toBe('')
  })

  it('serves a null slug the same watercolor ground', () => {
    // The mixed/neutral page case (feed, directories) and the pre-load frame of
    // every faction page, where `character?.faction_slug` is still undefined.
    expect(backdropFor(null)).toBe(WATERCOLOR)
  })

  it('serves an unregistered slug the watercolor ground, never a blank page', () => {
    expect(backdropFor('no-such-faction')).toBe(WATERCOLOR)
  })

  it('gives albescent exactly `na`’s ground, leaking nothing (ADR-0027/0048)', () => {
    // Albescent ships a manifest but deliberately claims no `backdrop`, so it
    // falls through here — which is the correct behaviour, not an oversight. A
    // dispatcher that hardcoded a faction roster instead of reading the manifest
    // would be the way it acquires a visible ground and stops hiding. Compared
    // against na's OWN render, so the two move together forever.
    expect(backdropFor('albescent')).toBe(backdropFor('na'))
    expect(backdropFor('albescent')).not.toContain('albescent')
  })
})
