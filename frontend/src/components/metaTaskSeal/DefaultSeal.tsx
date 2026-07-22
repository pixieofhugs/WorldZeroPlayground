import { useTranslation } from 'react-i18next'

import { factionName } from '../../utils/factions'
import type { SealSkinProps } from './types'

/**
 * The neutral seal skin — a ringed sticker mounted on neutral paper.
 *
 * Every metatask whose issuing faction has no bespoke skin registered falls
 * through to this via {@link MetaTaskSeal}'s dispatch table, so integrations
 * render end to end before the per-faction skins land (#929/#930/#931). It shows
 * the uppercase "<FACTION> METATASK" label, the condition and the "+N PTS" bonus,
 * plus the `×` peel control when `removable`.
 */
export default function DefaultSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-default-card-bg)',
        color: 'var(--faction-default-card-text)',
        border: '2px solid var(--faction-default-border)',
        borderRadius: 12,
        padding: 'var(--space-md) var(--space-lg)',
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
        className="eyebrow block"
        style={{ color: 'var(--faction-default-card-muted)' }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      <span
        className="font-body block"
        style={{
          fontSize: 'var(--text-content)',
          color: 'var(--faction-default-card-text)',
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
