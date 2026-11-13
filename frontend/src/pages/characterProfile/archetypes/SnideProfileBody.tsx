/**
 * SnideProfileBody — S.N.I.D.E. ransom-note profile kit (#460): offset shadows,
 * skewed Impact heads, halftone, tagline as a ransom slip (#1630).
 *
 * NOT always-dark (#2631, ADR-0085): `-wall`/`-note-*` flip, so no theme pin.
 * Registers: `-wall`/`-note-*` = the flipping ground and its inks; `-ink` = the
 * press (and acid's plate, #2173); `-card-*` = the slab, unused here.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/** The ground, which FLIPS. */
const WALL = 'var(--faction-snide-wall)'
const NOTE_INK = 'var(--faction-snide-note-ink)'
const NOTE_MUTED = 'var(--faction-snide-note-muted)'
/** Pink that carries a WORD; `PINK` is the pigment, 2.96:1 as type by day. */
const NOTE_PINK = 'var(--faction-snide-note-pink-ink)'
/** Acid's wall rung (#2177), for the level numeral, which can't carry a plate. */
const WALL_GREEN = 'var(--faction-snide-wall-credit)'
/** Separates a wall panel from the wall page. LOAD-BEARING (§6, #2065). */
const EDGE = 'var(--faction-snide-note-wall-edge)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-ink)' // the press: an ink, and acid's plate
const PAPER = 'var(--faction-snide-paper)' // warm xerox — an ink, never a ground
const ACID = 'var(--faction-snide-acid)' // acid green accent
const PINK = 'var(--faction-snide-pink)' // hot zine pink
const IMPACT = 'var(--faction-snide-font-black)' // Archivo Black
const TYPE = 'var(--faction-snide-font-type)' // Special Elite
const MARKER = 'var(--faction-snide-font-marker)' // Permanent Marker

function heading(title: ReactNode, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: TYPE,
          fontSize: 'var(--text-base)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: NOTE_MUTED,
          marginBottom: 'var(--space-xs)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: IMPACT,
          fontSize: 'var(--text-heading)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          transform: 'skewX(-5deg)',
          margin: 0,
          textShadow: `2px 2px 0 ${PINK}`,
        }}
      >
        {/* Acid carries the press plate (#2173): 1.03:1 on the light wall
            otherwise. On an inline span so the plate hugs the glyphs. */}
        <span style={{ color: ACID, background: INK, padding: '0 var(--space-sm)' }}>{title}</span>
      </h2>
      {/* Pigment pink, deliberately: a decorative rule owes no ratio (#2343). */}
      <div style={{ height: 2, marginTop: 'var(--space-sm)', borderTop: `2px dashed ${PINK}` }} />
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'snide',
  // No theme pin (#2631): the `-wall`/`-note-*` family depends on the flip.
  pageVars: factionBodyVars('snide'),
  pageBackground: WALL,
  // Halftone (#2139) in `-wall-text`, which reverses with the wall (#2343).
  pageOverlay: `radial-gradient(color-mix(in srgb, ${WALL_TEXT} 5%, transparent) 1px, transparent 1px)`,
  ink: NOTE_INK,
  // Not `-card-muted`: that's the slab's tier (#2066).
  muted: NOTE_MUTED,
  accent: WALL_GREEN,
  surface: WALL,
  border: EDGE,
  displayFont: IMPACT,
  eyebrowFont: TYPE,
  bodyFont: TYPE,
  headerStyle: {
    // A flyer pasted to the wall: EDGE + print register separate it (§6, #2065).
    background: WALL,
    border: `1px solid ${EDGE}`,
    // ornament (#1609): flat print register, not elevation; uniform 40% (#2302).
    boxShadow: '8px 10px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-3xl)',
  },
  // Same register via `filter`, so it follows the card's cut edge (#1609).
  credentialFrame: (card) => (
    <div
      style={{
        transform: 'rotate(-1.5deg)',
        filter: 'drop-shadow(6px 8px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent))',
      }}
    >
      {card}
    </div>
  ),
  /**
   * The tagline as a ransom slip (#1630). `inline-block` so the ground hugs the
   * words (the slot is a `<p>`). Brings its own ground, so it holds in both
   * cascades. Rotated only: sheared AND rotated reads as a rendering error.
   */
  taglineExtra: {
    display: 'inline-block',
    background: ACID,
    color: INK,
    // Design's 4/12/6px, rounded to the rungs.
    padding: 'var(--space-xs) var(--space-md) var(--space-sm)',
    transform: 'rotate(-0.7deg)',
    // ornament (#1609): same print register, tighter offset; 40% (#2302).
    boxShadow: '4px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
    letterSpacing: '-0.01em',
    textTransform: 'uppercase',
  },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: WALL,
    border: `2px solid ${EDGE}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill:
    'repeating-linear-gradient(45deg, var(--faction-snide-acid) 0 6px, var(--faction-snide-acid-deep) 6px 12px)',
  // The track is the press plate (#2287): the acid fill owes 3:1 (1.4.11) and
  // fails on the light wall.
  barTrack: INK,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `2px dashed ${EDGE}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: WALL,
  },
  // Brings its own stock; `-paper` is an object's ink here (#2227).
  laurel: <SpectrumLaurel centerBg={PAPER} glyphColor={INK} rotate={-8} />,
  // Pasted to the wall like every panel (#2631, #2343); `-paper` is never a ground.
  badgeBoardStyle: {
    border: `2px solid ${EDGE}`,
    background: WALL,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: TYPE,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    // Walked pink: it carries a word. Hairline matches the ink.
    color: NOTE_PINK,
    marginLeft: 'auto',
    border: `1px solid ${NOTE_PINK}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      // Flips with the board.
      dividerColor="var(--faction-snide-note-rule)"
      nameStyle={{ fontFamily: MARKER, color: NOTE_INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            // Brings its own stock, so it holds in both cascades.
            background: ACID,
            transform: 'skewX(-5deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: INK,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function SnideProfileBody(props: ProfileBodyProps) {
  return (
    <ProfileSkin
      props={props}
      kit={dress}
    />
  )
}
