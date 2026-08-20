/**
 * EverymenProfileBody — WPA / labor-poster player-profile skin (#460). Ported
 * from docs/design/profile/templates/Everymen Profile.dc.html: 3px ink borders
 * with a hard offset shadow, a gold top strip, a faint sunburst behind the
 * header, dot-grid paper texture, and condensed Bebas headings with an ink drop-
 * shadow. Follows the global light/dark cascade via --everymen-* /
 * --faction-everymen-* tokens (the paper surface flips in dark).
 *
 * Structure is DefaultProfileBody's locked spine via ProfileSkin. No hardcoded
 * hex — colours via --everymen-* / --faction-everymen-* vars.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'

const INK = 'var(--everymen-ink)' // structure + ink on the red banner (near-black both themes)
// Text AND rules on the paper page and its panels (#2133, #2227). Byte-identical
// to `INK` in light (#221a12), so nothing moves by day; it inverts to cream in
// dark, where the frozen ink would be a rule you cannot see.
const PAPER_TEXT = 'var(--everymen-paper-text)'
const MUTED = 'var(--everymen-muted)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const CREAM = 'var(--everymen-cream)'
const PAPER = 'var(--everymen-paper)'
const BEBAS = 'var(--font-accent)' // Bebas Neue
const MONO = 'var(--font-body)' // Courier Prime

const SUNBURST =
  'repeating-conic-gradient(from 0deg at 50% 40%, rgba(255,255,255,0.05) 0deg 6deg, transparent 6deg 12deg)'

function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 'var(--text-base)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 'var(--space-xs)',
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontFamily: BEBAS,
          fontSize: 'var(--text-heading)',
          letterSpacing: '0.03em',
          color: PAPER_TEXT,
          margin: 0,
          // The Everymen poster drop shadow is ONE drawing on four surfaces
          // (#1609; it was five until #2024 retired the faction card).
          // `EverymenFactionHero` and
          // `EverymenDuelSealConfirm` both strike it from `--everymen-ink`; the
          // two here were the only copies hand-rolled in black, so they could
          // not follow the ink into dark mode (#221a12 -> #0d0907).
          textShadow: `2px 2px 0 color-mix(in srgb, ${INK} 12%, transparent)`,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          height: 4,
          marginTop: 'var(--space-sm)',
          background: `repeating-linear-gradient(90deg, ${RED} 0 14px, ${GOLD} 14px 28px)`,
        }}
      />
    </div>
  )
}

const dress: ProfileDress = {
  slug: 'everymen',
  pageBackground: PAPER,
  // The dot-grid paper texture (#2139). It was a frozen `rgba(34,26,18,0.05)` —
  // `--everymen-ink`'s LIGHT value spelled out — laundered past the colour arm
  // because `pageOverlay` is this skin's own prop name and not a style key the
  // rule judges. The page under it is `PAPER`, which FLIPS (#ece1c6 -> #221a16),
  // so by night the grain was near-black on near-black and painted nothing:
  // 1.11:1 in light, 1.00:1 in dark. `PAPER_TEXT` is the ink that flips WITH the
  // paper, and it is byte-identical to the old literal in light, so day is
  // untouched and night gets the same grain back: 1.11:1 in both cascades.
  pageOverlay: `radial-gradient(color-mix(in srgb, ${PAPER_TEXT} 5%, transparent) 1px, transparent 1px)`,
  // The page and both panels are the PAPER (#2227), so the skin's ink is the
  // one that flips with it. `kit.ink` lands in three places: the praxis empty
  // state, the badges heading — which stands straight on the page — and the
  // tagline, where `taglineExtra` overrides it to cream on the red banner.
  ink: PAPER_TEXT,
  muted: MUTED,
  accent: GOLD,
  surface: CREAM,
  border: INK,
  displayFont: BEBAS,
  eyebrowFont: MONO,
  bodyFont: MONO,
  headerStyle: {
    background: `linear-gradient(150deg, ${RED}, var(--everymen-red-deep))`,
    border: `3px solid ${INK}`,
    // ornament (#1609): the union banner's flat offset shadow — a printed
    // register mark, not elevation, so it takes neither `--color-cast-shadow`
    // nor the ink. The 8/10px offset and the 40% ARE the drawing and stay here;
    // only the ink is a token now.
    boxShadow: '8px 10px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)',
    padding: 'var(--space-2xl) var(--space-3xl)',
    marginBottom: 'var(--space-4xl)',
    marginTop: 'var(--space-sm)',
  },
  headerDecoration: (
    <>
      <div
        aria-hidden
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: GOLD, zIndex: 3 }}
      />
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: SUNBURST }}
      />
    </>
  ),
  // CREAM, not `ink`: the slot is on the banner, not on the page.
  taglineExtra: { color: CREAM, textShadow: `3px 3px 0 color-mix(in srgb, ${INK} 30%, transparent)`, letterSpacing: '0.02em' },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: INK,
    borderLeft: `5px solid ${GOLD}`,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  barFill: `linear-gradient(90deg, ${GOLD}, ${RED})`,
  // The unfilled remainder of the progression bar, on the panel's INK slab
  // (near-black in both cascades, so the old bare white was theme-correct — it
  // was a raw literal, not a dark-mode defect). CREAM is this family's
  // invariant light, the one the panel already inks with, and at 16% the
  // composite moves under a point: the track reads 1.53:1 against the slab in
  // light and 1.45:1 in dark, where the white read 1.59 / 1.50.
  barTrack: `color-mix(in srgb, ${CREAM} 16%, transparent)`,
  sectionHeading: heading,
  // Both panels stand on the paper page, so they take the paper (#2227). The
  // cream is an ornament ink here — the laurel's centre and the badge disc's
  // glyph — never a slab.
  emptyStateStyle: {
    border: `2px dashed ${PAPER_TEXT}`,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: PAPER,
  },
  laurel: <SpectrumLaurel centerBg={CREAM} glyphColor={RED} rotate={-8} />,
  badgeBoardStyle: {
    border: `3px solid ${PAPER_TEXT}`,
    background: PAPER,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    fontFamily: MONO,
    fontSize: 'var(--text-md)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 'auto',
    border: `1px solid ${PAPER_TEXT}`,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={`color-mix(in srgb, ${PAPER_TEXT} 18%, transparent)`}
      nameStyle={{ fontFamily: BEBAS, letterSpacing: '0.02em', color: PAPER_TEXT, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: RED,
            border: `2px solid ${INK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: CREAM,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function EverymenProfileBody(props: ProfileBodyProps) {
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
