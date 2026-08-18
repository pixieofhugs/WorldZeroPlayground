/**
 * SnideProfileBody — S.N.I.D.E. ransom-note / crime-board player-profile skin
 * (#460). Ported from docs/design/profile/templates/SNIDE Profile.dc.html: hard
 * offset shadows, skewed Impact headlines with a pink drop-shadow,
 * halftone dot texture, and the tagline pasted up as a ransom slip (#1630, which
 * also dropped the torn acid strip along the header top). SNIDE is ALWAYS DARK — its
 * --faction-snide-* tokens are identical in both themes, so the container scopes
 * data-theme="dark" to itself and never mutates the global theme.
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --faction-snide-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'

const INK = 'var(--faction-snide-ink)' // near-black
const PAPER = 'var(--faction-snide-paper)' // warm xerox
const ACID = 'var(--faction-snide-acid)' // acid green accent
const PINK = 'var(--faction-snide-pink)' // hot zine pink
const IMPACT = 'var(--faction-snide-font-impact)' // Anton
const TYPE = 'var(--faction-snide-font-type)' // Special Elite
const MARKER = 'var(--faction-snide-font-marker)' // Permanent Marker

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: TYPE,
          fontSize: 'var(--text-base)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: PAPER,
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
          color: ACID,
          transform: 'skewX(-5deg)',
          margin: 0,
          textShadow: `2px 2px 0 ${PINK}`,
        }}
      >
        {title}
      </h2>
      <div style={{ height: 2, marginTop: 'var(--space-sm)', borderTop: `2px dashed ${PINK}` }} />
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'snide',
  dataTheme: 'dark',
  pageBackground: INK,
  pageOverlay: 'radial-gradient(rgba(182,255,46,0.05) 1px, transparent 1px)',
  ink: PAPER,
  muted: 'var(--faction-snide-card-muted)',
  accent: ACID,
  surface: INK,
  border: ACID,
  displayFont: IMPACT,
  eyebrowFont: TYPE,
  bodyFont: TYPE,
  headerStyle: {
    background: INK,
    border: `1px solid ${ACID}`,
    // ornament (#1609): the flyposter's flat offset shadow — the print
    // metaphor, not elevation, so neither cast rung fits. Same drawing as the
    // faction hero's and the ransom seal's. The ink is now
    // `--color-print-offset`; the 55% is this mark's own strength, the hardest
    // impression on the page.
    boxShadow: '8px 10px 0 color-mix(in srgb, var(--color-print-offset) 55%, transparent)',
    // The torn acid strip along the top is dropped (#1630), and the 3xl top
    // inset that was reserving room for it goes with it — a band sized for an
    // absent ornament is #1138's shape (hiding the mark does not hide the SPACE
    // it was given).
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-3xl)',
  },
  // The same offset register as the header, struck through `filter` so it follows
  // the card's cut edge rather than its box (#1609). `filter` is not a
  // COLOUR_PROP, so the ratchet never reported this one — it is the blind spot
  // the legacy list records, not a site anybody decided to keep raw.
  credentialFrame: (card) => (
    <div
      style={{
        transform: 'rotate(-1.5deg)',
        filter: 'drop-shadow(6px 8px 0 color-mix(in srgb, var(--color-print-offset) 50%, transparent))',
      }}
    >
      {card}
    </div>
  ),
  /**
   * The tagline PASTED UP as a ransom slip (#1630).
   *
   * The one slot on this page where the faction's metaphor is a physical object
   * rather than a typeface: acid stock, photocopier ink, cut at a slight angle
   * and stuck down with a hard offset shadow. `inline-block` is what makes it a
   * slip instead of a band — the ground has to hug the words, and the shared
   * `TaglineSlot` is a `<p>`.
   *
   * The ink is deliberately the INVERSE of every other line on this page: the
   * page is near-black paper with acid headlines, so a slip is acid paper with
   * near-black type, and the pairing is the same one measured either way round.
   * The skewX and pink drop-shadow the slot wore before are gone — a slip that
   * is both sheared AND rotated reads as a rendering error rather than a cut.
   *
   * The meta line beneath it needed nothing: `bodyFont` is already
   * --faction-snide-font-type (Special Elite, declared in index.css and worn by
   * six SNIDE surfaces), so the typewriter was there the whole time.
   */
  taglineExtra: {
    display: 'inline-block',
    background: ACID,
    color: INK,
    // 4px 12px 6px in the design; the bottom rounds to the 8px rung, since a
    // 2px optical trim is not a spacing decision the scale needs to express.
    padding: 'var(--space-xs) var(--space-md) var(--space-sm)',
    transform: 'rotate(-0.7deg)',
    // ornament (#1609): same flat offset print register, one stop tighter.
    boxShadow: '4px 4px 0 color-mix(in srgb, var(--color-print-offset) 45%, transparent)',
    letterSpacing: '-0.01em',
    textTransform: 'uppercase',
  },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: INK,
    border: `2px solid ${ACID}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill:
    'repeating-linear-gradient(45deg, var(--faction-snide-acid) 0 6px, var(--faction-snide-acid-deep) 6px 12px)',
  barTrack: 'rgba(255,255,255,0.12)',
  sectionHeading: heading,
  emptyStateStyle: {
    border: `2px dashed ${ACID}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: INK,
  },
  laurel: <SpectrumLaurel centerBg={PAPER} glyphColor={INK} rotate={-8} />,
  badgeBoardStyle: {
    border: `2px solid ${ACID}`,
    background: PAPER,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: TYPE,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: PINK,
    marginLeft: 'auto',
    border: `1px solid ${PINK}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor="rgba(20,17,11,0.25)"
      nameStyle={{ fontFamily: MARKER, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            background: INK,
            transform: 'skewX(-5deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ACID,
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
      /* Dress only. Seven copy knobs used to be spread on here, resolved from
         `profile.<slug>.*`; #1911 collapsed those families to one shared string
         each, so every kit was passing the same words and `ProfileSkin` reads
         them itself now. */
      kit={dress}
    />
  )
}
