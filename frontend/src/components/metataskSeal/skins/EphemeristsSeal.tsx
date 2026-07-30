import { useTranslation } from 'react-i18next'

import { factionName } from '../../../utils/factions'
import {
  BAND,
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  DECO,
  GOLD,
  INK,
  OCHRE,
  PLATE,
  READING,
  RULE,
  SMALL_CAPS,
  WingedDiscSign,
} from '../../factionMarks/ephemeristsPlate'
import type { SealSkinProps } from '../types'

/**
 * The Ephemerists seal (#1207) — A NOTE IN THE MARGIN of the host record.
 *
 * A slip of the Valley plate's own papyrus, ruled in brass with a second brass
 * outline offset outside it, the indigo disc bearing the winged sun disc
 * overlapping its left edge, and the issuer's tab riding the top edge. The
 * condition reads in Spectral italic; the bonus is struck in Poiret One.
 *
 * It replaces the vellum-codex note (#929), which painted the retired `--eph-*`
 * family — right for the codex, wrong beside a card that is papyrus everywhere
 * else. Every colour is a `--faction-ephemerists-plate-*` token, so the slip
 * flips through the `[data-theme="dark"]` cascade with no ternary, and `-brass`
 * stays a rule colour rather than an ink.
 *
 * IT SITS FLAT. The design's specimen is tilted 1.5°, which is how the specimen
 * sheet stages it on its mount — the same seal sits square in the picker row in
 * that same document, and this one lands in a stack of seals from other
 * factions.
 *
 * DEVIATION: the design stacks the bonus as `+35` over a Cinzel `PTS`. The copy
 * is the shared neutral `detail.seal.bonus` — one string, "+35 PTS" — which the
 * seal contract shares with seven other skins; splitting it on whitespace to
 * make two lines would break the first time the catalog changes. It is set as
 * one line in the display face instead.
 *
 * The three-field contract (issuer / condition / bonus) and the peel control are
 * unchanged: this is dress.
 */

/** The indigo disc, and the gutter it overlaps into. Ornament geometry (§4a). */
const DISC_SIZE = 38
const DISC_INSET = 10

export default function EphemeristsSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')
  const faction = factionName(metatask.metatask_faction_slug)

  return (
    <div
      className="relative"
      style={{
        background: PLATE,
        color: INK,
        border: `1px solid ${BRASS}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 2,
        boxSizing: 'border-box',
        padding: 'var(--space-md) var(--space-lg)',
        paddingLeft: DISC_SIZE + DISC_INSET + 10,
        fontFamily: READING,
        // The plate's own dotted tooth. The dot takes the hairline token rather
        // than the design's fixed `rgba(42,29,18,0.03)`, which is invisible on
        // the night plate — the token carries a dark value of its own.
        backgroundImage: `radial-gradient(${RULE} 1px, transparent 1px)`,
        backgroundSize: '6px 6px',
      }}
    >
      {/* The winged sun disc, overlapping the slip's left edge. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: DISC_INSET,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 4,
          width: DISC_SIZE,
          height: DISC_SIZE,
          borderRadius: '50%',
          background: BAND,
          boxShadow: '0 2px 7px rgba(20, 12, 6, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WingedDiscSign size={24} color={GOLD} />
      </span>

      {/* The issuer's tab, riding the top edge. */}
      <span
        className="block"
        style={{
          position: 'absolute',
          top: -9,
          left: DISC_SIZE + DISC_INSET + 8,
          ...SMALL_CAPS,
          fontWeight: 600,
          fontSize: 'var(--text-xs)',
          color: BAND_INK,
          background: BAND,
          padding: '0 var(--space-sm)',
          whiteSpace: 'nowrap',
        }}
      >
        {t('detail.seal.label', { faction })}
      </span>

      {removable && (
        <button
          type="button"
          onClick={() => onRemove?.(metatask.id)}
          aria-label={t('detail.seal.remove')}
          className="absolute leading-none"
          style={{
            top: 'var(--space-sm)',
            right: 'var(--space-sm)',
            background: 'transparent',
            border: 'none',
            color: OCHRE,
            fontSize: 'var(--text-xl)',
            fontFamily: DECO,
            cursor: 'pointer',
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      <span
        className="flex items-center"
        style={{ gap: 'var(--space-md)', justifyContent: 'space-between' }}
      >
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
        <span
          className="block"
          style={{
            fontFamily: DECO,
            fontSize: 'var(--text-title)',
            lineHeight: 0.8,
            color: OCHRE,
            whiteSpace: 'nowrap',
          }}
        >
          {t('detail.seal.bonus', { points: metatask.point_value })}
        </span>
      </span>
    </div>
  )
}
