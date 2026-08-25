import type { } from 'react'
import { useBackdropSlug } from './BackdropContext'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

/**
 * Per-faction page-ground dispatcher, keyed by the slug the surrounding page
 * puts on {@link useBackdropSlug}.
 *
 * THERE IS STILL NO `DefaultBackdrop.tsx`, AND THAT IS STILL NOT A GAP. na's
 * `backdrop` row (`factions/default.ts`) points straight at
 * `WatercolorBackground` — the site's own watercolour ground, which IS the
 * designed neutral for a page with no faction (`default ≡ na ≡ Unaffiliated` is
 * one identity, ADR-0039/0046/0048). #2530 gave that row a name in the registry
 * instead of an argument here; a file whose whole body re-exported the
 * watercolour under a `Default*` name would have been the only thing added.
 */
export default function FactionBackdrop() {
  const slug = useBackdropSlug()
  const Backdrop = resolveVariant(surfaceMap('backdrop'), slug)
  return <Backdrop />
}
