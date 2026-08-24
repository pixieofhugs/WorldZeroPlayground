import { useTranslation } from 'react-i18next'

import { CovenBand } from '../../cardMasthead/factionBands'
import CovenCauldron from '../../factionMarks/CovenCauldron'
import { factionName } from '../../../utils/factions'
import { BORDER, CARD, DEEP, DISPLAY, INK, SHADOW } from '../../factionMarks/covenSlip'
import SealShell, { SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * Cozy Coven seal (#1209) — a spell slip tied on with a braided thread.
 *
 * Same three-field contract as every seal (label / condition / bonus) in Coven's
 * own hand: the ward's candle-lit paper inside the slip's pink edge, the
 * metatask's name in Grenze Gotisch, and the bonus held in the cauldron.
 *
 * THE TILT STAYS. `rotate(-0.6deg)` is not a lo-fi mark — a slip pressed onto
 * somebody else's praxis sits crooked, and the ward pages keep every other
 * hand-placed thing slightly off-square.
 *
 * THE BRAID STANDS DOWN AND THE BAND TAKES ITS JOB (#2562). The braid was here
 * because it is what holds a Coven surface to the one under it, and it was
 * strung across the top edge — which is exactly where the seal's masthead now
 * runs. `CovenBand` is the same twinkle-field band the Coven task card and
 * praxis card already wear, so the slip is held on by the kit's own header
 * rather than by a second object above it. (The braid keeps its other mounts.)
 *
 * THE BONUS IS THE CAULDRON (#2042 + #2562), not the gold chip. Under ADR-0049 a
 * faction's total mark is the device the figure sits INSIDE, and Coven's is the
 * pot its task card and its score stamp already hold their points in; a chip
 * beside the text was the last place this seal disagreed with them. The chip's
 * measured gold/ink pair goes with it — the cauldron letters the figure in
 * `-slip-deep` over a `-slip-soft` caption, both measured on the ward card this
 * slip is cut from (`factionContrast.test.ts`).
 */
export default function CovenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        background: CARD,
        color: INK,
        border: `2px solid ${BORDER}`,
        borderRadius: 14,
        boxShadow: SHADOW,
        transform: 'rotate(-0.6deg)',
      }}
      band={<CovenBand title={t('detail.seal.label', { faction })} />}
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      /* The `×` sits on the band's own white sigil ground now, where `-slip-deep`
         is the ink already measured against it. */
      removeColor={DEEP}
      condition={
        <span
          className="block"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 'var(--text-title)',
            lineHeight: 1.1,
            letterSpacing: '0.005em',
            color: INK,
          }}
        >
          {metatask.title}
        </span>
      }
      mark={
        <CovenCauldron
          total={t('detail.seal.bonusFigure', { points: metatask.point_value })}
          caption={t('card.stamp.points', { count: metatask.point_value })}
          size={SEAL_MARK}
        />
      }
    />
  )
}
