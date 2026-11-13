/**
 * The ink a faction MARK carries, as rendered (#2723): the `<svg>` `fill`
 * attribute, which `inkSeam.ts` (style declarations) cannot see. A sigil with no
 * `color` inherits `currentColor`. SVG-path marks only; UA and Albescent paint
 * via `background`, which `inkSeam.ts` reaches.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import FactionSigil from '../../components/sigil/FactionSigil'

/** The mark's geometry, read from `FactionSigil` so a redraw moves the probe. */
export function sigilPath(slug: string): string {
  const html = renderToStaticMarkup(<FactionSigil slug={slug} />)
  const match = html.match(/ d="([^"]+)"/)
  if (!match) throw new Error(`the ${slug} sigil draws no path to probe`)
  return match[1]
}

/**
 * The `fill` of every `<svg>` drawing `slug`'s mark, in document order: a list,
 * since mounts legitimately differ. Throws if none, so the probe can't pass empty.
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
