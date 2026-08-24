import { useTranslation } from 'react-i18next'

import { SpectrumBand } from '../../cardMasthead/factionBands'
import DefaultPointsRing from '../../factionMarks/DefaultPointsRing'
import { factionName } from '../../../utils/factions'
import SealShell, { SEAL_FIGURE, SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * Albescent seal — the pale correspondence register (#930). A seal is a foreign
 * sticker that keeps its ISSUER's voice, so this is one of the rare moments the
 * secret society shows its face: near-black ink on a near-white sheet, with a
 * single soft spectrum strip as its only colour. It reads the
 * `--albescent-reveal-*` reveal tokens (never a `--faction-albescent-*` theme,
 * which does not exist by design) so it stays restrained and un-tinted.
 *
 * IT FOLLOWS THE FLIP (#2301) and needs no edit to do it: every colour here is a
 * reveal token, and after dark those resolve to the na card's own stock and ink.
 * So the sticker is a pale sheet by day and an na-dark one by night, on whatever
 * host card it has been stuck to. Its `-border` is what keeps it a distinct
 * object when the host card happens to be na's too (2.74:1).
 *
 * ITS ONE COLOUR MOVES (#2500, epic #2496 ruling 3). The strip was the last
 * still spectrum on any Albescent-dispatched surface, and it was still for a
 * mechanical reason rather than a designed one: it named
 * `--faction-default-rainbow` inline, so no stylesheet could reach it. It wears
 * `.spectrum-rule` now — the class #2497 minted for exactly these seventeen
 * inline ramps — and the root wears `alb-moves`, the marker every other
 * Albescent wrapper carries.
 *
 * THE STRIP IS THE BAND'S RULE NOW (#2562). The society gets a masthead here and
 * nowhere else, by owner ruling: the seal's label already prints "ALBESCENT
 * METATASK" in plain sight, so the band adds no exposure the label has not, and
 * two bandless seals out of nine defeat the one anatomy. What it mounts is the
 * `na` band — `SpectrumBand`, the same small-caps-over-a-hairline the two seals
 * were already drawing by hand — which is how Albescent mounts every na drawing.
 * The ruling does not travel: `CardMasthead`'s docstring and ADR-0048 still keep
 * the Albescent task card and praxis card bandless.
 *
 * THE RING IS LETTERED IN REVEAL TOKENS, and that is the one thing this skin has
 * to say to a shared na drawing. `DefaultPointsRing` prints the na family by
 * default and this sheet is `--albescent-reveal-surface`, pure white by day — so
 * the ground, the figure's ink and the caption's are all passed. Nothing here
 * names a `--faction-default-*` colour, which is the rule the whole skin keeps.
 *
 * A seal is a reveal moment, so this is the one place the tell may be looked at
 * directly rather than noticed sideways.
 */
export default function AlbescentSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      className="alb-moves"
      style={{
        background: 'var(--albescent-reveal-surface)',
        color: 'var(--albescent-reveal-text)',
        border: '1px solid var(--albescent-reveal-border)',
        borderRadius: 4,
        boxShadow: 'var(--albescent-reveal-shadow)',
        fontFamily: 'var(--font-faction-serif)',
      }}
      band={
        <SpectrumBand
          slug="albescent"
          ink="var(--albescent-reveal-text-muted)"
          title={t('detail.seal.label', { faction })}
        />
      }
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      removeColor="var(--albescent-reveal-text-muted)"
      condition={
        <span
          className="block"
          style={{
            fontSize: 'var(--text-content)',
            color: 'var(--albescent-reveal-text)',
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
          ground="var(--albescent-reveal-surface)"
          valueColor="var(--albescent-reveal-text)"
          unitColor="var(--albescent-reveal-text-muted)"
        />
      }
    />
  )
}
