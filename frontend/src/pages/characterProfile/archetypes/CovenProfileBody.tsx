/**
 * CovenProfileBody — the Cozy Coven player profile, on the coven's own paper
 * (#460, re-dressed by #1209).
 *
 * The candlelit page under a turning pentagram watermark, every block a panel of
 * ward paper inside the slip's pink edge, braided thread heading each section,
 * and the player's name hand-lettered in Caveat.
 *
 * THIS REPLACES THE CORK-BOARD SCRAPBOOK. The push-pin dots, the washi-taped
 * headings, the `.exe`-window progression panel, the dotted-grid page overlay
 * and the tilted pinned-paper frames were the lo-fi identity; so were the
 * `--faction-coven-notepad-*` / `-win-*` / `-tape` / `-scrap-*` / `-dot` tokens
 * they were painted in. Structure is DefaultProfileBody's locked spine via
 * `ProfileSkin`, unchanged — #1209 swaps the dress, not the layout.
 *
 * Two things kept on purpose. The **watermark** is `.cvn-wheel`, the same
 * slow-turning pentagram the task card and both detail pages draw, mounted as
 * the header's decoration where the pushpins were; index.css owns its motion and
 * its reduced-motion guard. And the **spectrum laurel** stays the shared
 * `SpectrumLaurel` — the top-praxis mark is site furniture (ADR-0028), not
 * faction ornament, and only its medallion is tinted.
 *
 * INK. `INK` / `SOFT` / `LABEL` clear AA on both grounds this page runs (the
 * ward page and the ward panel). `DEEP` is 4.44:1 on the page and 4.70:1 on the
 * panel, so `accent` is only ever painted on `surface` — which is where
 * `ProfileSkin` puts it, inside the progression ring's disc.
 *
 * The page background is the ward page rather than a translucent tint, and the
 * viewport candle wash (`.coven-backdrop`) shows around the column — the same
 * relationship every Coven detail page has with the site ground.
 */
import type { ReactNode } from 'react'

import type { ProfileBodyProps } from '../FactionProfileBody'
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  DEEP,
  DISPLAY,
  HAND,
  INK,
  PAGE,
  READING,
  SHADOW,
  SOFT,
} from '../../../components/factionMarks/covenSlip'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileKit } from './profileSkin'

const CHROME = 'var(--font-faction-rounded)' // Quicksand
const BAR = `linear-gradient(90deg, var(--faction-coven-slip-pk), ${DEEP})`

/** The slow-turning pentagram, watermarking the identity banner. */
function Watermark() {
  return (
    <svg
      className="cvn-wheel"
      width={420}
      height={420}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ position: 'absolute', right: -140, top: -80, zIndex: 0, pointerEvents: 'none', opacity: 0.08 }}
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke={DEEP} strokeWidth="0.8" />
      <path
        d="M50 12 L73.5 84.3 L11.9 39.7 L88.1 39.7 L26.5 84.3 Z"
        fill="none"
        stroke={DEEP}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Section heading — the display face, a braid, then the gloss. */
function heading(title: string, eyebrow: string): ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 'var(--text-heading)',
          lineHeight: 1.06,
          letterSpacing: '0.02em',
          color: INK,
        }}
      >
        {title}
      </span>
      <Braid style={{ flex: 1 }} />
      <span style={{ ...CAPTION, flex: '0 0 auto' }}>{eyebrow}</span>
    </div>
  )
}

const kit: ProfileKit = {
  slug: 'coven',
  pageBackground: PAGE,
  ink: INK,
  muted: SOFT,
  accent: DEEP,
  surface: CARD,
  border: BORDER,
  displayFont: DISPLAY,
  eyebrowFont: CHROME,
  bodyFont: READING,
  headerStyle: {
    background: CARD,
    border: `2px solid ${BORDER}`,
    borderRadius: 16,
    padding: 'var(--space-2xl)',
    marginBottom: 'var(--space-2xl)',
    boxShadow: SHADOW,
  },
  headerDecoration: <Watermark />,
  taglineExtra: { fontFamily: HAND },
  progressionStyle: {
    marginTop: 'var(--space-xl)',
    background: CARD,
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12,
    padding: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    maxWidth: 440,
  },
  ringLabel: 'lvl',
  barFill: BAR,
  barTrack: BORDER,
  nextLevelLabel: (next) => `next · lvl ${next}`,
  sectionHeading: heading,
  praxisEyebrow: (name) => `sealed by ${name}`,
  praxisEmpty: {
    title: 'No spells sealed yet',
    body: 'The first bit of mischief is always the hardest ✦',
  },
  emptyStateStyle: {
    border: `1.5px dashed ${BORDER}`,
    borderRadius: 14,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: CARD,
  },
  laurel: <SpectrumLaurel centerBg={CARD} glyphColor={DEEP} rotate={-8} />,
  badgeTitle: 'Charms earned',
  badgeBoardStyle: {
    border: `2px solid ${BORDER}`,
    borderRadius: 14,
    background: CARD,
    padding: 'var(--space-xs) var(--space-lg)',
  },
  badgeChipStyle: {
    ...CAPTION,
    marginLeft: 'auto',
    border: `1.5px solid ${BORDER}`,
    borderRadius: 20,
    padding: 'var(--space-xs) var(--space-sm)',
  },
  badgeRow: (badge, last) => (
    <BadgeRow
      badge={badge}
      last={last}
      dividerColor={BORDER}
      nameStyle={{ fontFamily: HAND, color: INK, lineHeight: 1.15 }}
      medallion={(glyph) => (
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background:
              'linear-gradient(150deg, var(--faction-coven-slip-from), var(--faction-coven-slip-lav))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: DEEP,
            border: `1.5px solid ${BORDER}`,
          }}
        >
          {glyph}
        </span>
      )}
    />
  ),
}

export default function CovenProfileBody(props: ProfileBodyProps) {
  return <ProfileSkin props={props} kit={kit} />
}
