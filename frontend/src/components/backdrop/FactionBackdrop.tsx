import type { } from 'react'
import WatercolorBackground from '../layout/WatercolorBackground'
import { useBackdropSlug } from './BackdropContext'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

export default function FactionBackdrop() {
  const slug = useBackdropSlug()
  const Backdrop = pickVariant(surfaceMap('backdrop'), slug, WatercolorBackground)
  return <Backdrop />
}
