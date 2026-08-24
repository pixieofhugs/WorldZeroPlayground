import { useTranslation } from 'react-i18next'

import { EphemeristsBand } from '../../cardMasthead/factionBands'
import { factionName } from '../../../utils/factions'
import {
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  CompassRose,
  DECO,
  INK,
  PLATE,
  READING,
  RULE,
  SMALL_CAPS,
} from '../../factionMarks/ephemeristsPlate'
import SealShell, { SEAL_FIGURE, SEAL_MARK } from '../SealShell'
import type { SealSkinProps } from '../types'

/**
 * The Ephemerists seal (#1207) — A NOTE IN THE MARGIN of the host record.
 *
 * A slip of the Valley plate's own papyrus, ruled in brass with a second brass
 * outline offset outside it, and the condition reading in Spectral italic. Every
 * colour is a `--faction-ephemerists-plate-*` token, so the slip flips through
 * the `[data-theme="dark"]` cascade with no ternary, and `-brass` stays a rule
 * colour rather than an ink.
 *
 * IT SITS FLAT. The design's specimen is tilted 1.5°, which is how the specimen
 * sheet stages it on its mount — the same seal sits square in the picker row in
 * that same document, and this one lands in a stack of seals from other
 * factions.
 *
 * TWO PIECES OF ORNAMENT STOOD DOWN FOR THE ONE ANATOMY (#2562), and both had
 * been doing the band's job:
 *
 *  · THE ISSUER'S TAB, which rode the top edge in a brass-inked strip — that is
 *    a masthead drawn by hand, and the kit has one. `EphemeristsBand` is the
 *    same restrained plate band (#2067) the Ephemerists task card and praxis
 *    card wear, so the slip's header is now an identity with theirs.
 *  · THE INDIGO WINGED-SUN DISC, which overlapped the left edge and held the
 *    slip's 58px left gutter open. The band carries the faction's mark now, and
 *    `CardMasthead`'s rule is that no header shows two — the disc is where UA's
 *    eyebrow ensō and Coven's pentagram badge already went. The gutter goes with
 *    it, which is what lets the body sit on the shared inset.
 *
 * THE BONUS IS THE COMPASS ROSE (#2042 + #2562). The slip struck it in Poiret
 * One at the end of a `space-between` row; the rose is the plate's points
 * medallion and is what the task card and the score stamp already hold their
 * figures in. It brings its own ground — the inner disc is `-plate-disc` — so
 * the figure keeps the exact pairing it has on the stamp (`-plate-band-ink`
 * 7.59:1, `-plate-band-quiet` 8.37:1, both cascades) rather than landing on this
 * slip's papyrus and needing a new one.
 *
 * The deviation the old file recorded is resolved rather than restated: the copy
 * IS two nodes now (`detail.seal.bonusFigure` over `card.stamp.points`), which
 * is the split the design asked for and the catalog would not give.
 */
export default function EphemeristsSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <SealShell
      style={{
        background: PLATE,
        color: INK,
        border: `1px solid ${BRASS}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 2,
        boxSizing: 'border-box',
        fontFamily: READING,
        // The plate's own dotted tooth. The dot takes the hairline token rather
        // than the design's fixed `rgba(42,29,18,0.03)`, which is invisible on
        // the night plate — the token carries a dark value of its own.
        backgroundImage: `radial-gradient(${RULE} 1px, transparent 1px)`,
        backgroundSize: '6px 6px',
      }}
      band={<EphemeristsBand title={t('detail.seal.label', { faction })} />}
      removable={removable}
      onRemove={() => onRemove?.(metatask.id)}
      /* On the band's brass-edged disc, where `-plate-band-ink` is the ink the
         wordmark beside it already takes (13.07:1). The ochre the tab's `×` used
         was measured on the papyrus, which is no longer what it stands on. */
      removeColor={BAND_INK}
      removeStyle={{ fontFamily: DECO }}
      condition={
        <span
          className="block"
          style={{
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            lineHeight: 1.25,
            color: INK,
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
          <CompassRose size={SEAL_MARK} />
          {/* HTML over the plate rather than `<text>` inside its viewBox — the
              rose deliberately holds no figure, so both mounts lay one over it. */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 0.82,
            }}
          >
            <span style={{ fontFamily: DECO, fontSize: SEAL_FIGURE, color: BAND_INK }}>
              {t('detail.seal.bonusFigure', { points: metatask.point_value })}
            </span>
            <span
              style={{
                ...SMALL_CAPS,
                fontSize: 'var(--text-md)',
                color: BAND_QUIET,
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
