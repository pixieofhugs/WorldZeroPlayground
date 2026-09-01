/**
 * CovenProfileBody — the Cozy Coven player profile, on the coven's own paper
 * (#460, re-dressed by #1209).
 *
 * The candlelit page under a slow-turning cat watermark, every block a panel of
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
 * Two things kept on purpose. The **watermark** is `.cvn-wheel`, mounted as the
 * header's decoration where the pushpins were; index.css owns its motion and its
 * reduced-motion guard. THE SHARING IS THE POINT AND IT IS WIDER THAN IT LOOKS —
 * the same mark turns on the task card, both detail pages and the praxis
 * composer, five surfaces in all, which is why #2041's pentagram-to-cat swap is
 * one edit in `covenSlip` rather than five. And the **spectrum laurel** stays the shared
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
  CovenCat,
  DEEP,
  DISPLAY,
  HAND,
  INK,
  PAGE,
  READING,
  SHADOW,
  SOFT,
  Spark,
} from '../../../components/factionMarks/covenSlip'
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
 * The mark is `covenSlip`'s `Spark` at --faction-coven-slip-gold, the token whose own
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
          <Spark size={size} color="var(--faction-coven-slip-gold)" />
        </span>
      ))}
    </div>
  )
}

/**
 * The slow-turning cat, watermarking the identity banner (#2041).
 *
 * SIZE IS NOT THE CARD'S. #2041 pins 190px on the task card and says in the
 * same breath to pick this one by the mark's weight on the page rather than by
 * pasting that number. The pentacle here was 420px with a ringed circle around
 * it, hung 140px off the right and 80px above the top of a header that clips —
 * about a 280×340 visible figure. 240px fully inside is the closest thing to
 * that footprint the banner can hold without guessing at its height: the header
 * carries a credential card and the progression panel stacked inside
 * `var(--space-2xl)` of padding, so it never comes near 240 + 16 short.
 *
 * The ring goes with the pentacle. It was there to close the star's silhouette;
 * a cat's head already closes its own, and a circle behind it reads as a second
 * device rather than a frame.
 *
 * IT SITS AT THE BOTTOM (#2135), where it sat at `top: 16`. One placement rule
 * on every mount — bottom-right, tucked in — because five surfaces turning the
 * same drawing in four different corners is #2041's defect one level up. Only
 * the anchor moves: the size, the inset and the 0.08 are untouched, and the
 * header clips, so the mark still reads as a corner watermark either way.
 */
function Watermark() {
  return <CovenCat size={240} style={{ right: 16, bottom: 16, opacity: 0.08 }} />
}

/** Section heading — the display face, a braid, then the gloss. */
function heading(title: ReactNode, eyebrow: string): ReactNode {
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
    // NO EDGE (#2131). §5: a bordered panel may not sit directly inside another
    // bordered panel. This band holds two framed panels — the shared
    // `CredentialCard` and the progression panel below it — and its own 2px
    // `BORDER` made all three the same pink, concentric, which is the report's
    // screenshot. The card keeps its frame (it is the object being looked at,
    // and it renders framed on the FieldDesk roster and the creation preview
    // too), so the band gives way: it already has the ward-card stock and a
    // radius, which is enough to read as a panel. The shadow stays — that is
    // elevation, not a frame.
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
