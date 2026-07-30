import type { } from 'react'
import WatercolorBackground from '../layout/WatercolorBackground'
import { useBackdropSlug } from './BackdropContext'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

/**
 * Per-faction page-ground dispatcher, keyed by the slug the surrounding page
 * puts on {@link useBackdropSlug}.
 *
 * THERE IS NO `DefaultBackdrop.tsx`, AND THAT IS NOT A GAP. The fallback below
 * is `WatercolorBackground` — the site's own watercolour ground, which is the
 * designed neutral for a page with no faction (`default ≡ na ≡ Unaffiliated` is
 * one identity, ADR-0039/0046/0048). A `na` or unregistered slug is served that,
 * not left bare, so there is nothing for a separate default skin to draw.
 */
export default function FactionBackdrop() {
  const slug = useBackdropSlug()
  const Backdrop = pickVariant(surfaceMap('backdrop'), slug, WatercolorBackground)
  return <Backdrop />
}
