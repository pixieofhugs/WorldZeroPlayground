import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Ephemerists seal — a vellum-codex marginal note pinned to the host praxis.
 * Same three-field contract as every seal: Cinzel eyebrow, italic EB Garamond
 * condition, rubric-red bonus, gold-leaf border on aged vellum.
 */
export default function EphemeristsSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--eph-vellum)',
        color: 'var(--eph-vellum-text)',
        border: '1px solid var(--eph-gold-deep)',
        padding: 'var(--space-md) var(--space-lg)',
        fontFamily: 'var(--eph-serif)',
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
            color: 'var(--eph-rubric)',
            fontSize: 'var(--text-xl)',
            fontFamily: 'var(--eph-display)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="eyebrow block"
        style={{
          fontFamily: 'var(--eph-display)',
          color: 'var(--eph-gold-deep)',
        }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      <span
        className="font-body block"
        style={{
          fontStyle: 'italic',
          fontSize: 'var(--text-content)',
          color: 'var(--eph-vellum-text)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {metatask.title}
      </span>

      <span
        className="font-body block"
        style={{
          fontFamily: 'var(--eph-display)',
          fontWeight: 700,
          fontSize: 'var(--text-title)',
          color: 'var(--eph-rubric)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </span>
    </div>
  )
}
