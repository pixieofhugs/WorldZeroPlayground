import { useTranslation } from 'react-i18next'

import { SnideBand } from '../../cardMasthead/factionBands'
import type { SealSkinProps } from '../types'

/**
 * S.N.I.D.E. seal — a photocopier-ink ransom note slapped on the host praxis.
 * It was taped on until #1708 took the two strips off its head.
 * Same three-field contract as every seal (label / condition / bonus) but in
 * S.N.I.D.E.'s own voice: Archivo Black + Anton for the demand, acid-green on
 * ink with a hot-pink tear.
 *
 * THE SPECIAL ELITE EYEBROW IS THE SHARED BAND NOW (#2648) — `SnideBand`, the
 * clipping's printed note bar with the brushed A bleeding out of its inset and
 * the wordmark cut in acid Anton. The typewriter face went with the eyebrow; the
 * demand below still speaks in Archivo Black and Anton, per word, as it did.
 *
 * The halftone field stays on the ROOT, over the bar as well as the body: it is
 * the print the whole clipping was run off on, not a wash on one region. The
 * band paints above it — `CardMasthead` pins its own `zIndex`.
 */

/** Word-level "cut from a magazine" chip palette, picked deterministically per word. */
const CLIP_STYLES = [
  { bg: 'var(--faction-snide-paper)', color: 'var(--faction-snide-ink)', font: 'var(--faction-snide-font-black)', rotate: -3 },
  { bg: 'var(--faction-snide-ink)', color: 'var(--faction-snide-acid)', font: 'var(--faction-snide-font-cond)', rotate: 3 },
  // `#fff` stood on the pink chip and measured 3.50:1 — below AA (#1609). The
  // other two chips already read the ink their own ground was measured for;
  // `--faction-snide-on-accent` is pink's, at 5.38:1.
  { bg: 'var(--faction-snide-pink)', color: 'var(--faction-snide-on-accent)', font: 'var(--faction-snide-font-impact)', rotate: -2 },
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
                // ornament (#1609): the cut-out chip's flat offset register —
                // print metaphor, not elevation, so not `--color-cast-shadow`.
                // The 1/2px offset is the drawing and stays here; the 40% is the
                // one strength every register prints at (#2302).
                boxShadow: '1px 2px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
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

  return (
    <div
      className="relative"
      style={{
        background: 'var(--faction-snide-card-bg)',
        color: 'var(--faction-snide-card-text)',
        border: '2px solid var(--faction-snide-pink)',
        borderRadius: 2,
        transform: 'rotate(-1deg)',
        // ornament (#1609): flat offset print register — ink tokenized, and the
        // strength is now the uniform 40% (#2302; this note printed at 35%). The
        // halftone dot field below stays raw for its own reason: the density IS
        // the drawing, not the acid tier. See the legacy list.
        boxShadow: '4px 5px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
        overflow: 'hidden',
      }}
    >
      <div className="ht-dots" style={{ position: 'absolute', inset: 0, color: 'rgba(182,255,46,0.08)', pointerEvents: 'none' }} />

      <SnideBand />

      <div className="relative" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
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

        <div className="relative" style={{ marginBottom: 'var(--space-sm)' }}>
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
    </div>
  )
}
