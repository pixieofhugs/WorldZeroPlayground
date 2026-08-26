import { useTranslation } from 'react-i18next'

import { factionCssVar, factionSpectrumSheet } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { DefaultBand } from '../sealBands'
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
 * true rather than aspirational. It is also why `DefaultBand` above the body
 * carries no ramp of its own: the frame is already this seal's spectrum.
 *
 * THE ISSUER IS THE SHARED BAND NOW (#2648). The uppercase eyebrow that named
 * the faction is gone; `DefaultBand` says it in the shape the card kits say it
 * in. The body's padding moved off the root onto an inner box, because the band
 * is full-bleed — the same move the two padded praxis frames had to make when
 * they mounted one (`CardMasthead`'s docblock).
 *
 * A metatask whose issuing faction has no skin still falls through here, and
 * gets the na band with it. ponytail: the manifest is saturated at nine of nine,
 * so that path is theoretical; the day a tenth faction ships without a seal, it
 * wants its own band rather than na's name over its condition.
 */
export default function DefaultSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{
        // The role map (#2672), pinned to na: the frame below is
        // `factionSpectrumSheet()`, which takes no slug, so the inks standing on
        // it may not take one either (#2361, #2669).
        ...factionRoleVars('na', 'na-seal'),
        // The 3px spectrum frame, not a 3px bar across the top edge (#2520).
        // Only the geometry is stated here; the composition — the ramp appended
        // to all THREE of the sheet's lists — belongs to the helper, because a
        // background list is a list in three properties at once and CSS cycles
        // the short ones rather than padding them.
        border: '3px solid transparent',
        ...factionSpectrumSheet(),
        color: 'var(--na-seal-ink, var(--faction-default-card-text))',
        // The corner is the TOKEN's, not this file's (#2729) — the picker's
        // selection ring reads the same one, so the two cannot disagree.
        borderRadius: factionCssVar('na', 'card-radius'),
        overflow: 'hidden',
      }}
    >
      <DefaultBand />

      {/* The body's own box. The peel control is positioned against THIS rather
          than the root, so it sits beside the condition instead of landing on
          the band — which is a link, and the two must not share a hit target. */}
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
              background: 'transparent',
              border: 'none',
              color: 'var(--na-seal-quiet, var(--faction-default-card-muted))',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* The na sheet's eyebrow register, around the NOUN alone — the band
            above spells the faction, so this spells the object. */}
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--na-seal-quiet, var(--faction-default-card-muted))',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--na-seal-ink, var(--faction-default-card-text))',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {metatask.title}
        </span>

        <span
          className="font-display block"
          style={{
            fontSize: 'var(--text-title)',
            color: 'var(--na-seal-accent, var(--faction-default-card-accent))',
            marginTop: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
