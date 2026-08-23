import { useTranslation } from 'react-i18next'

import { factionName, factionSheet } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * The neutral seal skin — plain caps, the whole rainbow, no allegiance (#930).
 *
 * This is the Unaffiliated (`na`) seal AND the shared fallback: every metatask
 * whose issuing faction has no bespoke skin registered falls through to it via
 * {@link MetataskSeal}'s dispatch table (e.g. `wow` until #931), so integrations
 * render end to end before the per-faction skins land. It stays a tasteful
 * neutral card — a full-spectrum rainbow accent strip and an uppercase register
 * are its only signature — showing the "<FACTION> METATASK" label, the condition
 * and the "+N PTS" bonus, plus the `×` peel control when `removable`.
 */
export default function DefaultSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        ...factionSheet(),
        color: 'var(--faction-default-card-text)',
        border: '2px solid var(--faction-default-border)',
        borderRadius: 12,
        padding: 'var(--space-md) var(--space-lg)',
        overflow: 'hidden',
      }}
    >
      {/* the whole rainbow, no allegiance — a full-spectrum accent, top edge */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--faction-default-rainbow)',
        }}
      />

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
