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
import { useTranslation } from 'react-i18next'

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
import { CovenSigil } from '../../../components/sigil/CovenSigil'
import { BadgeRow, ProfileSkin, SpectrumLaurel, type ProfileDress } from './profileSkin'

const CHROME = 'var(--font-faction-rounded)' // Quicksand
const BAR = `linear-gradient(90deg, var(--faction-coven-slip-pk), ${DEEP})`

/**
 * The candle catching the header (#1630) — eight of the faction's OWN sparkle
 * scattered over the identity band, each twinkling on its own delay.
 *
 * `[left%, top%, size, delay]`, straight from the design. The positions and
 * sizes are a hand-composed SCATTER, which is §4a's ornament case rather than a
 * spacing decision: put these on the 8px rung and the field lands on a lattice,
 * which is the one thing a scatter may not do. They are percentages precisely so
 * the field re-flows with the band at both widths — nothing here is a fixed-px
 * layout dimension.
 *
 * The mark is `CovenSigil` at --faction-coven-slip-gold, the token whose own
 * declaration names "twinkles" as its job (§6: a faction's ornament is ONE
 * primitive at named strengths — this is that primitive, not a second drawing of
 * it). The design's #f6d76b is that token's dark value; light gets the warmer
 * #f4c430 through the cascade, which is the point of not writing the hex.
 */
const SPARKS: ReadonlyArray<readonly [number, number, number, number]> = [
  [7, 18, 22, 0],
  [22, 72, 14, 1.4],
  [41, 12, 17, 2.6],
  [58, 64, 12, 0.7],
  [72, 28, 20, 3.4],
  [86, 78, 15, 1.9],
  [93, 34, 11, 4.2],
  [63, 88, 16, 2.2],
]

function Sparkfield() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {SPARKS.map(([left, top, size, delay]) => (
        <span
          key={`${left}-${top}`}
          className="cvn-profile-spark"
          style={{ left: `${left}%`, top: `${top}%`, ['--cvn-spark-delay' as string]: `${delay}s` }}
        >
          <CovenSigil size={size} color="var(--faction-coven-slip-gold)" />
        </span>
      ))}
    </div>
  )
}

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

const dress: ProfileDress = {
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
  // Both decorations are inert `aria-hidden` layers behind the content, which
  // `ProfileSkin` lifts to z-index 2. The watermark turns; the sparks twinkle.
  headerDecoration: (
    <>
      <Watermark />
      <Sparkfield />
    </>
  ),
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
  barFill: BAR,
  barTrack: BORDER,
  sectionHeading: heading,
  emptyStateStyle: {
    border: `1.5px dashed ${BORDER}`,
    borderRadius: 14,
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    background: CARD,
  },
  laurel: <SpectrumLaurel centerBg={CARD} glyphColor={DEEP} rotate={-8} />,
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
  const { t } = useTranslation('common')
  return (
    <ProfileSkin
      props={props}
      kit={{
        ...dress,
        ringLabel: t('profile.coven.ringLabel'),
        nextLevelLabel: (next) => t('profile.coven.nextLevel', { level: next }),
        praxisEyebrow: (name) => t('profile.coven.praxisEyebrow', { name }),
        praxisEmpty: {
          title: t('profile.coven.praxisEmptyTitle'),
          body: t('profile.coven.praxisEmptyBody'),
        },
        badgeTitle: t('profile.coven.badgeTitle'),
      }}
    />
  )
}
