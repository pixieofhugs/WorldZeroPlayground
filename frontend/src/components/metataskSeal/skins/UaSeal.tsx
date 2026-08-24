import { useTranslation } from 'react-i18next'

import { UaBand } from '../../cardMasthead/factionBands'
import { UaEnsoScore } from '../../factionMarks/uaAtoms'
import { factionName } from '../../../utils/factions'
import SealShell, { SEAL_FIGURE, SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * UA seal — a wax-lotus note pressed into the host praxis, "a note on
 * refinement". Same three-field contract as every seal, in UA's gilt-salon
 * voice: sun-bleached parchment inside a hairline frame, an EB Garamond
 * condition, and the bonus struck inside the ensō.
 *
 * THE LOTUS WAX DISC IS GONE (#2562). It was pinned to the sticker's top-right —
 * the corner the peel control now shares with the band, and the region the mark
 * now occupies — so it collided with both. It was ornament and never text; what
 * replaces it is the faction's own mark carrying the figure, which is more UA
 * than a blank disc was.
 *
 * THE EYEBROW AND ITS RULE ARE THE BAND NOW. `UaBand` is the leaf's hairline
 * band from the task card and the praxis card, so the seal's header stopped
 * being a private drawing of the same idea (a small-caps line over a 1px rule).
 *
 * THE BONUS IS THE ENSŌ (#1147 + #2562), the ONLY ensō-with-a-figure on the
 * site: `UaScoreStamp` used to hand-roll a second one, which is why fixing the
 * ring on one surface never fixed it on the others.
 *
 * ITS INKS ARE PASSED, NOT DEFAULTED, and they are the score stamp's three — the
 * ring in `-card-enso`, the figure in `-card-total`, the caption in
 * `-card-points`. THE GROUND IS A GRADIENT here (`-card-parchment` resolves to a
 * `linear-gradient`, which is why no manifest row can name it), so all three are
 * measured against its DARKEST stop, `--faction-ua-panel`: the figure 4.65:1
 * light · 5.95:1 dark, the caption 4.88:1 · 7.42:1. Measuring the lightest stop
 * instead is the mistake wave A caught on Coven.
 *
 * The ring itself reads 2.93:1 on that stop in light and is deliberately NOT a
 * manifest row — it is the brush the figure sits inside, `aria-hidden`, and it
 * is the same token at the same reading the score stamp already strikes. That is
 * the `✦` precedent in `factionContrast.test.ts`, not an oversight; the figure
 * over it is what carries the value and it clears AA in both cascades.
 */
export default function UaSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        background: 'var(--faction-ua-card-parchment)',
        color: 'var(--faction-ua-card-text)',
        border: '1px solid var(--faction-ua-card-frame)',
        borderRadius: 3,
        fontFamily: 'var(--faction-ua-card-font)',
      }}
      band={<UaBand title={t('detail.seal.label', { faction })} />}
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      /* On the band's hairline ground, where the leaf's own ink is 10.35:1 —
         the accent it used measures 4.46:1 there, which is the reading the
         band's own docblock walked its wordmark off. */
      removeColor="var(--faction-ua-card-text)"
      condition={
        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-ua-body-font)',
            fontSize: 'var(--text-content)',
            color: 'var(--faction-ua-card-text)',
          }}
        >
          {metatask.title}
        </span>
      }
      mark={
        <UaEnsoScore
          size={SEAL_MARK}
          value={t('detail.seal.bonusFigure', { points: metatask.point_value })}
          unit={t('card.stamp.points', { count: metatask.point_value })}
          ringColor="var(--faction-ua-card-enso)"
          valueColor="var(--faction-ua-card-total)"
          unitColor="var(--faction-ua-card-points)"
          valueSize={SEAL_FIGURE}
        />
      }
    />
  )
}
