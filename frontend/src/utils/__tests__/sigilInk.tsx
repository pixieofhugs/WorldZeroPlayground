/**
 * The ink a faction MARK carries, as rendered (#2723).
 *
 * SEAM: the `fill` on the `<svg>` element that draws a given slug's own
 * geometry. A mount that hands `FactionSigil` no `color` falls through to its
 * `currentColor` default and inherits whatever text ink the page is drawing —
 * white after dark on the neutral chrome — and that defect is invisible to both
 * standing guards. `inkSeam.ts` reads inline `style=` DECLARATIONS and this ink
 * arrives as an attribute; a presence check on the geometry (the difference
 * probes in the sidebar suites) passes whatever colour the mark ended up.
 *
 * WHY THE PATH IS TAKEN FROM THE COMPONENT rather than transcribed: Sigil
 * Studies v2 redrew every mark once already, and a transcribed `d=` turns that
 * into a suite of false failures. Reading it back out of `FactionSigil` means a
 * redrawn mark moves the probe with it.
 *
 * Only for the marks drawn as an SVG PATH. UA's ensō and Albescent's labyrinth
 * are painted through a `background` on a masked span, so their ink is a
 * declaration and `inkSeam.ts`'s vocabulary already reaches it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import FactionSigil from '../../components/sigil/FactionSigil'

/** The mark's own geometry, taken from `FactionSigil` rather than transcribed. */
export function sigilPath(slug: string): string {
  const html = renderToStaticMarkup(<FactionSigil slug={slug} />)
  const match = html.match(/ d="([^"]+)"/)
  if (!match) throw new Error(`the ${slug} sigil draws no path to probe`)
  return match[1]
}

/**
 * The `fill` of every `<svg>` in `html` that draws `slug`'s mark, in document
 * order — the inks that faction's mark is actually painted in on this surface.
 *
 * A LIST AND NOT THE FIRST ONE. A page draws the same mark at more than one
 * mount and they legitimately disagree: the players page inks the podium
 * avatar's coven cat in `--faction-coven-ward-card` — a measured ink for the
 * disc it sits on — several elements above the race lane this file is about.
 * Answering the first match would assert the avatar's ink and never see the
 * lane's.
 *
 * Throws when the mark is not drawn at all: a probe that quietly finds nothing
 * reports the surface green.
 */
export function markFills(html: string, slug: string): string[] {
  const path = sigilPath(slug)
  const fills = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)]
    .map((match) => match[0])
    .filter((element) => element.includes(path))
    .map((element) => element.match(/<svg[^>]*\sfill="([^"]*)"/)?.[1] ?? '')
  if (fills.length === 0) throw new Error(`the ${slug} mark is not drawn in this markup`)
  return fills
}

/** How many times `needle` appears in `haystack`. */
export function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}
