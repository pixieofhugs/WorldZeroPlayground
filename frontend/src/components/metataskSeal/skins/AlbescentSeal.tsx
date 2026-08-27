import { useTranslation } from 'react-i18next'

import { AlbescentBand } from '../sealBands'
import { factionCssVar } from '../../../utils/factions'
import type { SealSkinProps } from '../types'

/**
 * Albescent seal — a sticker on someone else's card (#930).
 *
 * FLAT na SHEET, NOT THE PRISM, and that is the decision this file owes a line
 * on (#2632). It does not read `factionSheet()` and must not: a seal is stuck
 * onto a host card, and on an Albescent host that card is ALREADY `.alb-prism`,
 * which sets `--faction-default-card-sheet` for its whole subtree. A seal that
 * read the triple would inherit the host's bloom and paint it a second time
 * inside itself — one drawing composited twice, which reads as a brighter patch
 * rather than as a sticker. Flat `--faction-default-card-bg` is what keeps it a
 * distinct object on a bloomed ground, and its hairline is what keeps it one on
 * a plain na ground.
 *
 * ── IT USED TO BE THE PALE CORRESPONDENCE REGISTER, AND IS NOT (#2632) ──────
 *
 * Every colour here came from the deleted vellum register: near-black on white
 * vellum sheet, one of four surfaces where the secret society showed a face of
 * its own. Owner ruling — the white aesthetic is purged and Albescent commits
 * entirely to the prism vocabulary, so the sticker takes the na card's stock,
 * ink and hairline like every other Albescent surface. Its delta is the strip
 * that MOVES, not a stock of its own. Nothing is repainted in a hue Albescent
 * owns, because it owns none (ADR-0027, ADR-0048, #783).
 *
 * The three ink tiers are the na card's own, in the vocabulary `DefaultSeal`
 * already uses on the same object: `-card-text` for the title, `-card-accent`
 * for the bonus, `-card-muted` for the label and the peel control.
 *
 * ITS ONE COLOUR MOVES (#2500, epic #2496 ruling 3). The strip was the last
 * still spectrum on any Albescent-dispatched surface, and it was still for a
 * mechanical reason rather than a designed one: it named
 * `--faction-default-rainbow` inline, so no stylesheet could reach it. It wears
 * `.spectrum-rule` now — the class #2497 minted for exactly these seventeen
 * inline ramps, and which carries that same token and nothing else, so the
 * resting sheet is the one that shipped yesterday — and the root wears
 * `alb-moves`, the marker every other Albescent wrapper carries.
 *
 * THE STRIP IS THE BAND'S RULE NOW (#2648). It has not changed material or
 * moved off this root — it is still the one `.spectrum-rule` mount this surface
 * has, still empty, still travelling under the marker below — it has only moved
 * up under the wordmark and gone flush, which is what a masthead's rule is.
 * `AlbescentBand` holds it beside the band it rules.
 *
 * AND THE BAND IS THE ONE SANCTIONED EXCEPTION TO ADR-0048's BANDLESS RULE
 * (owner ruling 2026-08-25). `sealBands.tsx` carries the reasoning and the test
 * for a third mount; the short form is that this seal's own copy has always
 * printed the society's name, so the band discloses nothing new — which is not
 * true of the Albescent task card or praxis card, and neither of them may grow
 * one.
 *
 * A seal is a reveal moment, so this is the one place the tell may be looked at
 * directly rather than noticed sideways.
 */
export default function AlbescentSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative alb-moves"
      style={{
        background: 'var(--faction-default-card-bg)',
        color: 'var(--faction-default-card-text)',
        border: '1px solid var(--faction-default-card-line)',
        // The corner is the TOKEN's, not this file's (#2729) — the picker's
        // selection ring reads the same one, so the two cannot disagree.
        borderRadius: factionCssVar('albescent', 'card-radius'),
        boxShadow: '0 2px 18px var(--color-cast-shadow-soft), 0 1px 3px var(--color-cast-shadow-soft)',
        fontFamily: 'var(--font-faction-serif)',
        overflow: 'hidden',
      }}
    >
      <AlbescentBand />

      {/* The body's own box — the band is full-bleed, so the padding that was on
          the root came down here, and the peel control is positioned against
          this rather than landing on the band's link. */}
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
              color: 'var(--faction-default-card-muted)',
              fontSize: 'var(--text-xl)',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* The sheet's quiet eyebrow register, around the NOUN alone. The
            society's name is the band's; this is what the object is. */}
        <span
          className="font-body block"
          style={{
            fontSize: 'var(--text-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--faction-default-card-muted)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--faction-default-card-text)',
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
            color: 'var(--faction-default-card-accent)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </div>
    </div>
  )
}
