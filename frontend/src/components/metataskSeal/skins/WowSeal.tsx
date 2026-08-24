import { useTranslation } from 'react-i18next'

import { WowBand } from '../../cardMasthead/factionBands'
import { factionName } from '../../../utils/factions'
import SealShell, { SEAL_FIGURE, SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * Warriors of Whimsy seal — a court writ pressed onto the host praxis (#931).
 * Cream parchment bound in gold, written in plum: WOW's chronicle identity
 * (ADR-0050), with MedievalSharp illuminating the decree and Lora reading the
 * condition. Deliberately NOT coven's cozy pink (#927 donor-slug note).
 *
 * THE PLUM WAX DOT IS GONE (#2562), and it is the reported defect: an
 * `aria-hidden` plum disc ringed in gold, pinned to the top-right of the body —
 * the corner the peel control now shares with the band, and the region the mark
 * now occupies. It went regardless of the rest of this issue. The woven
 * gold/plum running head went with it: `WowBand` is the plum banner the WOW task
 * card and praxis card already wear, and a textless stripe above a painted band
 * is two mastheads.
 *
 * ## WOW'S POINTS MARK STILL REFUSES TO TRAVEL, RE-MEASURED (#2042, #2562)
 *
 * The other eight seals mount their faction's points mark. WOW's is the crowned
 * plaque `WowTaskCard` strikes — `--faction-wow-chronicle-panel` behind a 2px
 * gold frame, an inset plate — and #2042 kept it off the score stamp with
 * arithmetic rather than a preference: the stamp's plate IS that panel, so the
 * plaque was an inset plate with nothing to be inset into.
 *
 * THIS SURFACE IS A DIFFERENT GROUND AND THE ANSWER IS THE SAME. The seal stands
 * on `--faction-wow-chronicle-bg`, and against it the plaque's own fill is
 * 1.12:1 in light and 1.15:1 in dark — a plate that cannot be seen — while the
 * gold frame that would be all that is left of it is 2.24:1 in light, under the
 * 3:1 a non-text mark owes (1.4.11). Two grounds, one verdict.
 * `pointsMarkUnification.test.tsx` records both measurements; if a future ruling
 * gives WOW a plate of its own, that is the test that goes green and lets the
 * plaque travel to both surfaces at once.
 *
 * SO WOW GETS THE ANATOMY WITHOUT THE DEVICE: the figure over its caption, in
 * the chronicle's own hand, in the mark's column at the right — the burnt-gold
 * `-stamp-total` this seal already lettered its bonus in (5.38:1 on the
 * chronicle by day, 9.70:1 by night) over the plum `-card-accent` (5.79:1 /
 * 7.94:1). The `✦` is not borrowed either: the #840 design README carves it out
 * for the score stamp by name, and #2070 removed it from the card by owner
 * ruling, so a third surface is not this issue's to grant.
 */
export default function WowSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        background: 'var(--faction-wow-chronicle-bg)',
        color: 'var(--faction-wow-card-text)',
        border: '2px solid var(--faction-wow-chronicle-border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px -8px var(--faction-wow-chronicle-shadow)',
        fontFamily: 'var(--faction-wow-body-font)',
        transition: 'background 150ms, color 150ms',
      }}
      band={<WowBand title={t('detail.seal.label', { faction })} />}
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      /* On the plum banner, where the band's own cream is 5.16:1. The gilt the
         banner letters its wordmark in is 3.47:1 — fine for display type at 24px
         and under AA for a 14px control glyph, which is what this is. */
      removeColor="var(--faction-wow-on-plum)"
      condition={
        <span
          className="block"
          style={{
            fontFamily: 'var(--faction-wow-body-font)',
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.3,
            color: 'var(--faction-wow-card-text)',
          }}
        >
          {metatask.title}
        </span>
      }
      mark={
        <div
          style={{
            minWidth: SEAL_MARK,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 0.85,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--faction-wow-card-font)',
              fontSize: SEAL_FIGURE,
              letterSpacing: '0.03em',
              color: 'var(--faction-wow-stamp-total)',
            }}
          >
            {t('detail.seal.bonusFigure', { points: metatask.point_value })}
          </span>
          <span
            style={{
              fontFamily: 'var(--faction-wow-body-font)',
              fontStyle: 'italic',
              fontSize: 'var(--text-md)',
              color: 'var(--faction-wow-card-accent)',
              marginTop: 'var(--space-xs)',
            }}
          >
            {t('card.stamp.points', { count: metatask.point_value })}
          </span>
        </div>
      }
    />
  )
}
