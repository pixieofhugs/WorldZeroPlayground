import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * S.N.I.D.E. seal — a photocopier-ink ransom note taped to the host praxis.
 * Same three-field contract as every seal (label / condition / bonus) but in
 * S.N.I.D.E.'s own voice: Archivo Black + Anton for the demand, Special Elite
 * for the eyebrow, acid-green on ink with a hot-pink tear.
 */

/** Word-level "cut from a magazine" chip palette, picked deterministically per word. */
const CLIP_STYLES = [
  { bg: 'var(--faction-snide-paper)', color: 'var(--faction-snide-ink)', font: 'var(--faction-snide-font-black)', rotate: -3 },
  { bg: 'var(--faction-snide-ink)', color: 'var(--faction-snide-acid)', font: 'var(--faction-snide-font-cond)', rotate: 3 },
  { bg: 'var(--faction-snide-pink)', color: '#fff', font: 'var(--faction-snide-font-impact)', rotate: -2 },
]

function ClippedCondition({ text }: { text: string }) {
  // `filter(Boolean)` because an empty word has no charCodeAt(0) to pick a clip
  // with: a doubled space in a title used to throw on `clip.bg`.
  const words = text.split(/\s+/).filter(Boolean)
  return (
    // THE CONDITION MUST STAY ONE READABLE STRING. The chips were laid out as a
    // wrapping flex row spaced with `gap`, which is a purely visual space — a
    // flex container discards whitespace-only children, so the seal's text came
    // out as "doitunderwater.nocuts." (#1043, the fix #1023 made on the SNIDE
    // task card). Ordinary inline flow instead: the chips are still
    // `inline-block` and still wrap, separated by REAL spaces, and the
    // line-height carries the row rhythm the old `rowGap` drew.
    <span style={{ display: 'block', fontSize: 'var(--text-md)', lineHeight: 2.1 }}>
      {words.map((word, index) => {
        const clip = CLIP_STYLES[(word.charCodeAt(0) + index) % CLIP_STYLES.length]
        return (
          <span key={index}>
            {index > 0 ? ' ' : ''}
            <span
              className="font-body"
              style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                background: clip.bg,
                color: clip.color,
                fontFamily: clip.font,
                fontSize: 'var(--text-md)',
                lineHeight: 1,
                padding: 'var(--space-xs) var(--space-xs)',
                transform: `rotate(${clip.rotate}deg)`,
                boxShadow: '1px 2px 0 rgba(0,0,0,0.4)',
                textTransform: 'uppercase',
              }}
            >
              {word}
            </span>
          </span>
        )
      })}
    </span>
  )
}

export default function SnideSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-snide-card-bg)',
        color: 'var(--faction-snide-card-text)',
        border: '2px solid var(--faction-snide-pink)',
        borderRadius: 2,
        padding: 'var(--space-md) var(--space-lg)',
        transform: 'rotate(-1deg)',
        boxShadow: '4px 5px 0 rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
    >
      <div className="ht-dots" style={{ position: 'absolute', inset: 0, color: 'rgba(182,255,46,0.08)', pointerEvents: 'none' }} />
      <div className="snide-tape" style={{ top: -12, left: 18, transform: 'rotate(-7deg)' }} />
      <div className="snide-tape" style={{ top: -10, right: 14, transform: 'rotate(6deg)' }} />

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
            color: 'var(--faction-snide-pink)',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="eyebrow block relative"
        style={{
          fontFamily: 'var(--faction-snide-font-type)',
          color: 'var(--faction-snide-acid)',
        }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      <div className="relative" style={{ margin: 'var(--space-sm) 0' }}>
        <ClippedCondition text={metatask.title} />
      </div>

      <span
        className="font-body block relative"
        style={{
          fontFamily: 'var(--faction-snide-font-impact)',
          letterSpacing: '0.04em',
          fontSize: 'var(--text-title)',
          color: 'var(--faction-snide-acid)',
        }}
      >
        {t('detail.seal.bonus', { points: metatask.point_value })}
      </span>
    </div>
  )
}
