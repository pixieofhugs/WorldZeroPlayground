import { useTranslation } from 'react-i18next'

import { EphemeristsBand } from '../../cardMasthead/factionBands'
import { factionCssVar } from '../../../utils/factions'
import {
  BAND,
  BRASS,
  BRASS_LIGHT,
  CAPTION,
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
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * The Ephemerists seal (#1207) — a margin note on the Valley plate's papyrus,
 * brass-ruled, the winged-disc medallion overlapping its left edge. All colour is
 * `--faction-ephemerists-plate-*` (flips via the dark cascade). Sits FLAT: the
 * design's 1.5° tilt is specimen staging.
 *
 * Deviation: the design splits the bonus into `+35` over `PTS`; the copy is one
 * shared string, so it's one line. Issuer tab is the shared `EphemeristsBand`
 * (#2648). The disc centres on 50% of its box, so it lives on the body, not root.
 */

/** The indigo disc, and the gutter it overlaps into. Ornament geometry (§4a). */
const DISC_SIZE = 38
const DISC_INSET = 10

export default function EphemeristsSeal({ metatask, removable, onRemove }: SealSkinProps) {
  const { t } = useTranslation('praxis')

  return (
    <div
      className="relative"
      style={{ ...factionBodyVars("ephemerists"),
        background: PLATE,
        color: INK,
        border: `1px solid ${BRASS}`,
        // The token's corner (#2729), shared with the picker's selection ring.
        borderRadius: factionCssVar('ephemerists', 'card-radius'),
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 2,
        boxSizing: 'border-box',
        fontFamily: READING,
        // Dotted tooth on the hairline token (the design's fixed rgba vanishes at night).
        backgroundImage: `radial-gradient(${RULE} 1px, transparent 1px)`,
        backgroundSize: '6px 6px',
      }}
    >
      <EphemeristsBand />

      <div
        className="relative"
        style={{
          padding: 'var(--space-md) var(--space-lg)',
          paddingLeft: DISC_SIZE + DISC_INSET + 10,
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
            // ornament (#1609): casts onto PLATE, whose bg is near-black in both
            // cascades, so `--color-cast-shadow` would wrongly deepen it (#1792).
            // Stays raw; see the legacy list.
            boxShadow: '0 2px 7px rgba(20, 12, 6, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WingedDiscSign size={24} color={GOLD} />
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

        {/* What the note is; the band says whose. */}
        <span
          className="block"
          style={{
            ...SMALL_CAPS,
            fontSize: 'var(--text-md)',
            color: CAPTION,
            marginBottom: 'var(--space-xs)',
          }}
        >
          {t('detail.seal.kind')}
        </span>

        <span
          className="flex items-center"
          style={{ gap: 'var(--space-md)', justifyContent: 'space-between' }}
        >
          <span
            className="block"
            style={{
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
    </div>
  )
}
