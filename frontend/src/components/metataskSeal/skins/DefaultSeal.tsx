import { useTranslation } from 'react-i18next'

import { SpectrumBand } from '../../cardMasthead/factionBands'
import DefaultPointsRing from '../../factionMarks/DefaultPointsRing'
import { factionName, factionSpectrumSheet } from '../../../utils/factions'
import SealShell, { SEAL_FIGURE, SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * The neutral seal skin — plain caps, the whole rainbow, no allegiance (#930).
 *
 * This is the Unaffiliated (`na`) seal AND the shared fallback: every metatask
 * whose issuing faction has no bespoke skin registered falls through to it via
 * {@link MetataskSeal}'s dispatch table, so integrations render end to end even
 * for an issuer the kit has never heard of. It stays a tasteful neutral card — a
 * full-spectrum rainbow FRAME and an uppercase register are its only signature.
 *
 * THE SPECTRUM IS THE BORDER, NOT A BAR (#2520, epic #2496). A 3px strip was
 * pinned across the top edge until `Score-Stamp.dc.html` ruled otherwise: "drop
 * the bar and paint the spectrum into the border box itself". That is the idiom
 * `DefaultTaskCard` and `DefaultPraxisCard` already wear, so the na kit reads as
 * one material — which is the precondition for "Albescent = na + motion" being
 * true rather than aspirational.
 *
 * IT WEARS THE KIT'S ONE SEAL ANATOMY NOW (#2562): {@link SealShell} places the
 * three fields, `SpectrumBand` heads it, and the bonus is the spectrum RING
 * rather than a line of accent type — which is the same drawing `na`'s task card
 * and its score stamp already hold their points in (#2042). The ring's ground is
 * this sticker's own sheet, so the disc reads as the seal showing through the
 * annulus rather than as a patch laid on it.
 */
export default function DefaultSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        // The 3px spectrum frame, not a 3px bar across the top edge (#2520).
        // Only the geometry is stated here; the composition — the ramp appended
        // to all THREE of the sheet's lists — belongs to the helper, because a
        // background list is a list in three properties at once and CSS cycles
        // the short ones rather than padding them.
        border: '3px solid transparent',
        ...factionSpectrumSheet(),
        color: 'var(--faction-default-card-text)',
        borderRadius: 12,
      }}
      band={
        <SpectrumBand
          slug="na"
          ink="var(--faction-default-card-muted)"
          title={t('detail.seal.label', { faction })}
        />
      }
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      removeColor="var(--faction-default-card-muted)"
      condition={
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--faction-default-card-text)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {metatask.title}
        </span>
      }
      mark={
        <DefaultPointsRing
          value={t('detail.seal.bonusFigure', { points: metatask.point_value })}
          unit={t('card.stamp.points', { count: metatask.point_value })}
          size={SEAL_MARK}
          valueSize={SEAL_FIGURE}
        />
      }
    />
  )
}
