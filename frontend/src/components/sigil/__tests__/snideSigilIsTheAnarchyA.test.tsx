/**
 * The seam: the mark each S.N.I.D.E. surface actually RENDERS (#2119).
 *
 * The faction had two exports both called `SnideSigil` — the Anarchy A in
 * `components/sigil/SnideSigil` (the mark since #1989's Sigil Studies v2) and a
 * leftover circled-S in `components/factionMarks/snideAtoms`. Nothing was
 * missing and nothing was broken; two consumers simply imported the wrong one,
 * and the ambiguity is the defect. The old export is deleted, so a repeat of
 * this bug is now a compile error rather than a wrong drawing — but tsc cannot
 * tell you a surface stopped drawing the faction's mark, only that it drew
 * SOMETHING. Hence an assertion on the markup at every mount.
 *
 * `renderToStaticMarkup` only — no DOM, no layout — so nothing here can observe
 * optical weight. What it CAN hold is the size each mount asks for, and those
 * numbers are a measurement, not taste (see SIZES).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import { factionName } from '../../../utils/factions'
import SnideSelectCard from '../../selectCard/SnideSelectCard'
import SnideFactionHero from '../../factionHero/SnideFactionHero'

const render = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

/** The Anarchy A's own geometry: the bleeding viewBox and the design's cant. */
const ANARCHY_A = [/viewBox="-8 -8 116 116"/, /rotate\(-22 50 50\)/]

/**
 * The retired circled-S, pinned by its compass circle rather than by its
 * viewBox — a `0 0 48 48` box is common enough that asserting on it alone would
 * catch some unrelated ornament instead.
 */
const CIRCLED_S = /<circle cx="24" cy="24" r="19"/

/**
 * WHY THESE NUMBERS. Both mounts keep the size the circled-S was tuned at,
 * because the two drawings happen to fill their boxes almost identically in the
 * axis that governs the fit.
 *
 * The old mark was a stroked circle: outer radius 19 + half of a 3-unit stroke =
 * 20.5, so its ink spanned 41 of its 48 units — 0.854 of the box, square.
 *
 * The Anarchy A is four straight-edged fills (every path is `L` commands, so the
 * listed points ARE the extents) cantered -22° about (50,50). Rotated, its ink
 * spans y 3.0–100.9 and x 11.6–94.5 inside the 116-unit box: 0.844 tall, 0.715
 * wide. Height parity with the old mark is therefore within ~1% at the SAME
 * size, and height is what has to hold — the select card sets its mark beside a
 * wordmark in a centred flex row, and the hero centres it in a 94px medallion.
 * The A is narrower in the cross axis because a cantered A IS narrower; the
 * solid fills carry the weight the outline used to get from its width.
 *
 * So the fix is the import, and the sizes stay put. Anyone retuning them should
 * move BOTH knowingly — the drawn height is 0.844x whatever is written here.
 */
const SIZES = { selectCard: 40, hero: 54 } as const

describe('every S.N.I.D.E. surface wears the Anarchy A', () => {
  const MOUNTS: ReadonlyArray<[label: string, html: () => string, size: number]> = [
    [
      'faction-directory select card',
      () => render(<SnideSelectCard state="eligible" members={3} />),
      SIZES.selectCard,
    ],
    [
      'faction-page hero',
      () =>
        render(
          <SnideFactionHero slug="snide" name={factionName('snide')} members={214} tasks={9} praxes={1489} />,
        ),
      SIZES.hero,
    ],
  ]

  it.each(MOUNTS)('%s draws the A, not the retired circled-S', (_label, html) => {
    const markup = html()
    for (const mark of ANARCHY_A) {
      expect(markup, 'the surface draws the Anarchy A').toMatch(mark)
    }
    expect(markup, 'the retired circled-S is gone from this surface').not.toMatch(CIRCLED_S)
  })

  it.each(MOUNTS)('%s asks for its measured size', (_label, html, size) => {
    // Read the width off the sigil's own <svg>, which is the one carrying the
    // bleeding viewBox — the surfaces around it draw plenty of other SVGs.
    const markup = html()
    const box = markup.indexOf('viewBox="-8 -8 116 116"')
    const tag = markup.slice(markup.lastIndexOf('<svg', box), markup.indexOf('>', box) + 1)
    expect(tag, 'the mark is drawn square at its measured size').toContain(`width="${size}"`)
    expect(tag).toContain(`height="${size}"`)
  })
})
