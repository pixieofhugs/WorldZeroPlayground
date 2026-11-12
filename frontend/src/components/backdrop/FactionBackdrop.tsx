import type { } from 'react'
import { useBackdropSlug } from './BackdropContext'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

/**
 * Per-faction page-ground dispatcher. No `DefaultBackdrop.tsx` by design: na's
 * row points straight at `WatercolorBackground` (ADR-0039/0046/0048, #2530).
 */
export default function FactionBackdrop() {
  const slug = useBackdropSlug()
  const Backdrop = resolveVariant(surfaceMap('backdrop'), slug)
  return <Backdrop />
}
