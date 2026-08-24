import { useTranslation } from 'react-i18next'

import { EverymenBand } from '../../cardMasthead/factionBands'
import { EverymenCog } from '../../factionMarks/everymenCogs'
import { factionName } from '../../../utils/factions'
import SealShell, { SEAL_FIGURE, SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * Everymen seal — a union-broadsheet dispatch stamped onto the host praxis.
 * Same three-field contract as every seal: cream paper inside a doubled red
 * rule, Bebas Neue caps for the condition, and the bonus turned into the cog.
 *
 * THE RUBBER-STAMPED BONUS CIRCLE IS GONE (#2562). A crooked ring struck at
 * -8deg through `mix-blend-mode: multiply`, pinned top-right, is why Everymen's
 * bonus did not sit where anybody else's did — it was the only seal whose figure
 * lived in the corner rather than in the mark's column. The owner ruled the
 * stamp treatment off and the COG on.
 *
 * THE COG IS THE MARK, AND IT IS THE MAST'S OWN RED. `EverymenCog` is the one
 * cog drawing this kit ships (#2121) and it takes its fill from a token, so the
 * seal fills it with `--faction-everymen-bill-mast` — the same red the band
 * above it is painted in — and letters the figure in `-bill-mast-ink`, the ink
 * that band already measures against it. That is why this mount introduces no
 * pairing: the mark is a disc cut from the masthead, and the type on it is the
 * type on the masthead. (`--everymen-red` is the same hex in light and walks in
 * dark; the mast pair is theme-invariant, so one measurement covers both.)
 *
 * THE BORE IS CLOSED AT THIS MOUNT, AND ONLY THIS ONE. `hub` is documented as
 * "the colour the cog is sitting ON", and every other mount passes the paper
 * behind it; this one passes the FILL. The arithmetic is why: the hub is r=3 on
 * a 24-unit square, so at 72px it is an 18px disc, and the figure over its
 * caption stands about 40px tall — a paper-coloured bore would put a cream
 * ellipse through the middle of a cream figure. The wheel still reads as a wheel
 * (eight teeth on a round body is the whole silhouette), and the alternative was
 * to give this shared drawing a second hub mode, which is exactly the second
 * drawing in one file that `everymenCogs`' own docstring closed.
 *
 * ponytail: the ceiling is the bore. If Everymen ever wants it back on a seal,
 * the upgrade is a bigger mark for all nine — `SEAL_MARK` — not a bore mode
 * here, because a hub wide enough to hold `+100` over `POINTS` stops being a
 * bore and starts being a plate.
 */
export default function EverymenSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        border: '1.5px solid var(--everymen-ink)',
        boxShadow: '0 0 0 3px var(--everymen-paper), 0 0 0 4px var(--everymen-ink)',
      }}
      band={<EverymenBand title={t('detail.seal.label', { faction })} />}
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      /* On the red mast, where `--everymen-red` is invisible — the band's own ink. */
      removeColor="var(--faction-everymen-bill-mast-ink)"
      condition={
        <span
          className="font-body block"
          style={{
            fontFamily: 'var(--faction-everymen-card-font)',
            fontSize: 'var(--text-content)',
            letterSpacing: '0.01em',
          }}
        >
          {metatask.title}
        </span>
      }
      mark={
        <div
          style={{
            position: 'relative',
            width: SEAL_MARK,
            height: SEAL_MARK,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EverymenCog
            size={SEAL_MARK}
            fill="var(--faction-everymen-bill-mast)"
            hub="var(--faction-everymen-bill-mast)"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 0.85,
              fontFamily: 'var(--faction-everymen-card-font)',
              color: 'var(--faction-everymen-bill-mast-ink)',
            }}
          >
            <span style={{ fontSize: SEAL_FIGURE }}>
              {t('detail.seal.bonusFigure', { points: metatask.point_value })}
            </span>
            <span
              style={{
                fontSize: 'var(--text-md)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginTop: 'var(--space-xs)',
              }}
            >
              {t('card.stamp.points', { count: metatask.point_value })}
            </span>
          </div>
        </div>
      }
    />
  )
}
