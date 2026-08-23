import { useTranslation } from 'react-i18next'

import { factionName, factionSpectrumSheet } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * The neutral seal skin — plain caps, the whole rainbow, no allegiance (#930).
 *
 * This is the Unaffiliated (`na`) seal AND the shared fallback: every metatask
 * whose issuing faction has no bespoke skin registered falls through to it via
 * {@link MetataskSeal}'s dispatch table (e.g. `wow` until #931), so integrations
 * render end to end before the per-faction skins land. It stays a tasteful
 * neutral card — a full-spectrum rainbow FRAME and an uppercase register are its
 * only signature — showing the "<FACTION> METATASK" label, the condition and the
 * "+N PTS" bonus, plus the `×` peel control when `removable`.
 *
 * THE SPECTRUM IS THE BORDER, NOT A BAR (#2520, epic #2496). A 3px strip was
 * pinned across the top edge until `Score-Stamp.dc.html` ruled otherwise: "drop
 * the bar and paint the spectrum into the border box itself". That is the idiom
 * `DefaultTaskCard` and `DefaultPraxisCard` already wear, so the na kit reads as
 * one material — which is the precondition for "Albescent = na + motion" being
 * true rather than aspirational.
 */
export default function DefaultSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
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
        padding: 'var(--space-md) var(--space-lg)',
        overflow: 'hidden',
      }}
    >
      {removable && (
        <button
          type="button"
          onClick={() => onRemove?.(metatask.id)}
          aria-label={t('detail.seal.remove')}
          className="absolute font-body leading-none"
          style={{
            top: 'var(--space-sm)',
            right: 'var(--space-sm)',
            background: 'transparent',
            border: 'none',
            color: 'var(--faction-default-card-muted)',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="label-heading block"
        style={{ color: 'var(--faction-default-card-muted)' }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      <span
        className="font-body block"
        style={{
          fontSize: 'var(--text-content)',
          color: 'var(--faction-default-card-text)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginTop: 'var(--space-xs)',
        }}
      >
        {metatask.title}
      </span>

      <span
        className="font-display block"
        style={{
          fontSize: 'var(--text-title)',
          color: 'var(--faction-default-card-accent)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </span>
    </div>
  )
}
