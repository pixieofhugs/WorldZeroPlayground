/**
 * The Ephemerists' feed chassis — a Valley plate at card size (#1199).
 *
 * Chassis only: `FeedItemSlot` owns the archive interaction (see
 * {@link FeedFrameProps} and `FeedCardRouter`); this draws the card and places the
 * four chrome slots. Night masthead over a cavetto cornice, the event on papyrus
 * below with an ochre margin rule. Marks are reused from the kit, never redrawn;
 * no `--eph-*` codex atoms (ADR-0055: grounds are never mixed).
 *
 * Deliberately not drawn: the sheet's 22px ruled grid (a page texture, and a skin
 * never owns the feed's viewport — §5, #1028), and the cornice glow (twenty
 * blooming cards would be the loudest thing on the page).
 *
 * Colours are plate tokens that flip in dark; `-brass` is never an ink. One
 * responsive component (ADR-0056 / 0058 / 0063).
 */
import {
  BAND,
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  Cornice,
  INK,
  LINE,
  OCHRE,
  PLATE,
  READING,
  SHADOW,
  SMALL_CAPS,
  WASH,
} from '../factionMarks/ephemeristsPlate'
import { EphemeristsSigil } from '../sigil/EphemeristsSigil'
import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import { factionBodyVars } from '../../utils/factionBodyFace'

/**
 * The actor's name takes {@link BRASS_LIGHT} (#1341, #2141): the faction's
 * "links + affirmations" ink, and the name is a link (5.09:1 vellum, 9.68:1 night).
 * Not `-plate-quiet`: the row's one identity slot shouldn't be quieter than body copy.
 */
const ROW_SKIN: FeedRowSkin = { ink: { actor: BRASS_LIGHT } }

interface BandSize {
  /**
   * The head hairline's own box: SVG height and viewBox height, which must stay
   * equal (`slice` silently magnifies a mismatch). NOT the band's height — the
   * band sizes to its tallest child (#2100).
   */
  ruleHeight: number
  /** The width the hairline is drawn to fill. Geometry. */
  view: number
  /** The sigil's HEIGHT; the mark owns its ratio (#1635). */
  discHeight: number
  bandPadding: string
  labelSize: string
}

const SIZES: Record<'desktop' | 'mobile', BandSize> = {
  // 452 is the feed column's basis (`minmax(452px, 1fr)`).
  desktop: {
    ruleHeight: 30,
    view: 452,
    discHeight: 14,
    bandPadding: 'var(--space-xs) var(--space-md)',
    labelSize: 'var(--text-md)',
  },
  mobile: {
    ruleHeight: 26,
    view: 360,
    discHeight: 10,
    bandPadding: 'var(--space-xs) var(--space-sm)',
    labelSize: 'var(--text-base)',
  },
}

export default function EphemeristsFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const size = SIZES[useFormFactor() === 'mobile' ? 'mobile' : 'desktop']

  return (
    <div
      style={{ ...factionBodyVars("ephemerists"),
        position: 'relative',
        // Keeps ornament z-indexes inside this card (§5).
        isolation: 'isolate',
        background: PLATE,
        border: `1px solid ${LINE}`,
        boxShadow: SHADOW,
        color: INK,
      }}
    >
      {/* ── The band: sized by its tallest child, no fixed height and no
          `overflow: hidden` (#2100) — those clipped the 44px dismiss target. ── */}
      <div
        style={{
          position: 'relative',
          background: BAND,
          color: BAND_INK,
        }}
      >
        <svg
          width="100%"
          height={size.ruleHeight}
          // Own box pinned to the band's head; see `ruleHeight`.
          viewBox={`0 0 ${size.view} ${size.ruleHeight}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          <path
            d={`M6 4 H${size.view - 6}`}
            stroke={BRASS_LIGHT}
            strokeWidth="0.6"
            opacity="0.24"
          />
        </svg>

        {/* Slots placed by hand, not `FeedChassisBand`: its label pair would
            flatten the small caps / reading face. All four are drawn. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            // The only in-flow child, so this row sets the band's height (#2100).
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: size.bandPadding,
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <EphemeristsSigil size={size.discHeight} color={BAND_INK} />
          <span
            style={{
              ...SMALL_CAPS,
              fontSize: size.labelSize,
              color: BAND_INK,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {kicker}
          </span>
          {tag && (
            <span
              style={{
                ...SMALL_CAPS,
                fontSize: 'var(--text-md)',
                color: BAND_INK,
                border: `1px solid ${BRASS}`,
                padding: '0 var(--space-xs)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tag}
            </span>
          )}
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: READING,
              fontSize: size.labelSize,
              color: BAND_QUIET,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {time}
          </span>
          {/* Placed, never rebuilt: paints in `currentColor` (BAND_INK, 14:1) and
              is `null` when the card can't be archived. Its 44px sets the band. */}
          {archive}
        </div>
      </div>

      {/* The cornice continues the band's ground. No `glow`. */}
      <Cornice />

      {/* ── The leaf. The wash is the leaf's own background (`none` in dark),
          not an overlay that would need its own stacking context. ── */}
      <div style={{ position: 'relative', background: WASH }}>
        {/* Margin rule at --space-sm, clearing the body's --space-lg inset. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 'var(--space-sm)',
            top: 'var(--space-sm)',
            bottom: 'var(--space-sm)',
            width: 1,
            background: OCHRE,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
        <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
      </div>
    </div>
  )
}
