import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Albescent seal — the pale correspondence register (#930). A seal is a foreign
 * sticker that keeps its ISSUER's voice, so this is one of the rare moments the
 * secret society shows its face: near-black ink on a near-white sheet, with a
 * single soft spectrum strip as its only colour. It reads the
 * `--albescent-reveal-*` reveal tokens (never a `--faction-albescent-*` theme,
 * which does not exist by design) so it stays restrained and un-tinted.
 *
 * IT FOLLOWS THE FLIP (#2301) and needs no edit to do it: every colour above is
 * a reveal token, and after dark those resolve to the na card's own stock and
 * ink. So the sticker is a pale sheet by day and an na-dark one by night, on
 * whatever host card it has been stuck to. Its `-border` is what keeps it a
 * distinct object when the host card happens to be na's too (2.74:1).
 */
export default function AlbescentSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--albescent-reveal-surface)',
        color: 'var(--albescent-reveal-text)',
        border: '1px solid var(--albescent-reveal-border)',
        borderRadius: 4,
        padding: 'var(--space-md) var(--space-lg)',
        boxShadow: 'var(--albescent-reveal-shadow)',
        fontFamily: 'var(--font-faction-serif)',
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
            zIndex: 2,
            background: 'transparent',
            border: 'none',
            color: 'var(--albescent-reveal-text-muted)',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="label-heading block"
        style={{ color: 'var(--albescent-reveal-text-muted)' }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      {/* the soft spectrum strip — the one colour on the sheet, kept pale */}
      <span
        aria-hidden="true"
        className="block"
        style={{
          height: 2,
          borderRadius: 2,
          background: 'var(--faction-default-rainbow)',
          opacity: 0.35,
          margin: 'var(--space-xs) 0 var(--space-sm)',
        }}
      />

      <span
        className="block"
        style={{
          fontSize: 'var(--text-content)',
          color: 'var(--albescent-reveal-text)',
        }}
      >
        {metatask.title}
      </span>

      <span
        className="block"
        style={{
          fontSize: 'var(--text-title)',
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--albescent-reveal-ink)',
          marginTop: 'var(--space-xs)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </span>
    </div>
  )
}
