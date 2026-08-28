/**
 * Badge artwork registry (ADR-0033, #459). The backend sends only
 * `{ key, name }` — the image is a bundled frontend asset mapped by key,
 * exactly like faction sigils.
 *
 * The line-art glyphs draw in `currentColor`, so they inherit the surrounding
 * skin's ink and flip light/dark through the cascade. `duel_victor` is the one
 * that cannot: it is a seal with its own palette, so it names `--badge-victor-*`
 * tokens and flips through the same cascade a step further down. Either way no
 * glyph carries a hardcoded hex (CLAUDE.md) — the `white`/`black` in that one's
 * <mask> are luminance channels, not colours.
 *
 * `badgeArtFor(key)` dispatches on the badge key alone. There is deliberately no
 * faction seam: a badge is a game-wide fact, like the level gem.
 */
import { useId } from 'react'
import type { ComponentType } from 'react'
import { hasOwnKey } from '../../utils/hasOwnKey'
// `duel_victor`'s ring legend is set in --font-faction-engraved (Cinzel), which
// ships in the lazily-fetched faction sheet (#2079). A badge is a game-wide fact
// with no faction seam, so this renders on an unaffiliated player's profile too,
// where no faction archetype has asked for the sheet.
import '../../factionFaces'

interface BadgeArtProps {
  /** px box (square). */
  size?: number
}

/** sock_puppeteer — the marionette control bar: crossed rods + three strings. */
function SockPuppeteerArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      role="img"
      aria-label="Sock Puppeteer badge"
    >
      <path d="M3 6h18" />
      <path d="M12 2v8" />
      <path d="M6 6v10" />
      <path d="M18 6v10" />
      <circle cx="6" cy="18.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18.5" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** sock_puppet — the sock itself, one button eye and a stitched mouth. */
function SockPuppetArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Sock Puppet badge"
    >
      <path d="M8 2v9.5c0 1.5-.8 2.4-2.2 3.3C4.3 15.8 3.5 17 3.8 18.6 4.2 20.6 6 22 8.2 22c1.6 0 2.9-.6 4-1.7L16 16.5V2Z" />
      <path d="M8 5.5h8" />
      <circle cx="12.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9.5 12.5c1 .8 2.4.8 3.4 0" />
    </svg>
  )
}

/** duelist — two crossed blades, guards and pommels, meeting dead centre. */
function DuelistArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Duelist badge"
    >
      <path d="M4.5 19.5 18.5 5.5" />
      <path d="M19.5 19.5 5.5 5.5" />
      <path d="M6.2 15.2 8.8 17.8" />
      <path d="M17.8 15.2 15.2 17.8" />
      <circle cx="3.6" cy="20.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="20.4" cy="20.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ── duel_victor — the Fleur-de-Lis seal (#823) ─────────────────────────────
 *
 * The one badge that is not line art. A crowned fleur-de-lis is CUT OUT of a
 * solid frame laid over one continuous diagonal spectrum, so the lily reads as
 * rainbow and the disc around it as ivory (ink in dark). Built as an SVG
 * <mask>: white disc, minus black glyph groups and the two ring legends;
 * a solid <rect> is then painted through it.
 *
 * Everything here is design geometry on the design's own 240x240 user space
 * (Turn 2 of `Fleur de Lis.dc.html`, ids 2a/2b) — SVG units, neither px nor
 * text-scale steps, exactly as PointsRoundel documents. Colour is the only
 * thing that comes from tokens, because colour is the only thing that themes.
 */

/** The lily: three petals, the collar band, then the descending bud + curls. */
const FLEUR_PETALS = [
  'M50 4 C 39 24 40 52 50 72 C 60 52 61 24 50 4 Z',
  'M49 60 C 55 44 71 30 86 41 C 97 49 93 69 80 74 C 89 64 83 53 72 57 C 62 61 54 62 49 64 Z',
  'M51 60 C 45 44 29 30 14 41 C 3 49 7 69 20 74 C 11 64 17 53 28 57 C 38 61 46 62 51 64 Z',
  'M50 77 C 43 92 44 109 50 124 C 56 109 57 92 50 77 Z',
  'M50 81 C 59 85 70 92 72 105 C 73 112 65 110 60 101 C 55 92 51 85 50 83 Z',
  'M50 81 C 41 85 30 92 28 105 C 27 112 35 110 40 101 C 45 92 49 85 50 83 Z',
]

/** The crown: five points and three pearls. */
const CROWN_BAND = 'M32 24 L32 12 L40 19 L50 8 L60 19 L68 12 L68 24 Z'
const CROWN_PEARLS = [
  { cx: 32, cy: 9, r: 3 },
  { cx: 50, cy: 5, r: 3.4 },
  { cx: 68, cy: 9, r: 3 },
]

/** The two arcs the legend is set along — upper ring for DUEL, lower for VICTOR. */
const SEAL_RING = 'M120 120 m-99 0 a99 99 0 1 1 198 0 a99 99 0 1 1 -198 0'
const SEAL_RING_BOTTOM = 'M24 120 A96 96 0 0 0 216 120'

/**
 * Two placements of one mark. `sealed` is the design's composition, with the
 * lily sized to leave room for the legend ring. `compact` is the identical
 * mark under a uniform 1.42 scale — the crown keeps its exact offset from the
 * lily — recentred on the disc to reclaim the space the dropped legend frees.
 * Nothing is redrawn between them; only the transform differs.
 */
const SEALED_PLACEMENT = { fleur: 'translate(60,54) scale(1.12)', crown: 'translate(60,40) scale(1.12)' }
const COMPACT_PLACEMENT = { fleur: 'translate(49,40) scale(1.42)', crown: 'translate(49,22) scale(1.42)' }

/**
 * Below this box the DUEL/VICTOR ring is dropped and the compact placement
 * renders instead.
 *
 * The legend is 13 units tall on a 240 box, so its cap height is `size *
 * 13/240`. Readable lettering needs roughly 4px of that, which puts the floor
 * at ~74px; 72 is the nearest round figure and a clean 0.3x of the design's
 * own 240. Every consumer today passes 16 or 18 (RosterTable, both profile
 * bodies, the mobile roster), where the legend would be a 1px fuzz around the
 * rim and the lily's curls would go sub-pixel — so the compact mark is what
 * actually ships, and the full seal is there for any hero-sized rendering.
 *
 * Degrading a spectrum by geometry rather than shrinking it is ADR-0039's own
 * move: `factionFill` takes a shape for exactly this reason, and the spectrum
 * at 16px is already shipped elsewhere as `--faction-default-rainbow-conic`.
 */
const LEGEND_MIN_SIZE = 72

/** duel_victor — a crowned fleur-de-lis cut out of a seal over the spectrum. */
function DuelVictorArt({ size = 18 }: BadgeArtProps) {
  // SVG ids are document-global and a roster renders one badge per row, so
  // every referenced id is namespaced per instance. React's ids carry `:`,
  // legal in an id but not in a URL fragment used as a selector.
  const uid = `wz-victor-${useId().replace(/:/g, '')}`
  const gradientId = `${uid}-spectrum`
  const maskId = `${uid}-mask`
  const fleurId = `${uid}-fleur`
  const crownId = `${uid}-crown`
  const ringId = `${uid}-ring`
  const ringBottomId = `${uid}-ring-bottom`

  const withLegend = size >= LEGEND_MIN_SIZE
  const placement = withLegend ? SEALED_PLACEMENT : COMPACT_PLACEMENT

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label="Duel Victor badge"
    >
      <defs>
        {/* 225deg in the design: top-right to bottom-left. */}
        <linearGradient id={gradientId} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--badge-victor-stop-1)" />
          <stop offset="10%" stopColor="var(--badge-victor-stop-2)" />
          <stop offset="20%" stopColor="var(--badge-victor-stop-3)" />
          <stop offset="34%" stopColor="var(--badge-victor-stop-4)" />
          <stop offset="48%" stopColor="var(--badge-victor-stop-5)" />
          <stop offset="60%" stopColor="var(--badge-victor-stop-6)" />
          <stop offset="72%" stopColor="var(--badge-victor-stop-7)" />
          <stop offset="84%" stopColor="var(--badge-victor-stop-8)" />
          <stop offset="94%" stopColor="var(--badge-victor-stop-9)" />
          <stop offset="100%" stopColor="var(--badge-victor-stop-10)" />
        </linearGradient>
        <g id={fleurId}>
          {FLEUR_PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
          <rect x={37} y={66} width={26} height={13} rx={5} />
        </g>
        <g id={crownId}>
          <path d={CROWN_BAND} />
          {CROWN_PEARLS.map((pearl) => (
            <circle key={pearl.cx} cx={pearl.cx} cy={pearl.cy} r={pearl.r} />
          ))}
        </g>
        {withLegend && (
          <>
            <path id={ringId} d={SEAL_RING} fill="none" />
            <path id={ringBottomId} d={SEAL_RING_BOTTOM} fill="none" />
          </>
        )}
        <mask id={maskId}>
          <circle cx={120} cy={120} r={110} fill="white" />
          <g fill="black" transform={placement.fleur}>
            <use href={`#${fleurId}`} />
          </g>
          <g fill="black" transform={placement.crown}>
            <use href={`#${crownId}`} />
          </g>
          {withLegend && (
            <>
              <text
                fill="black"
                fontFamily="var(--font-faction-engraved)"
                fontWeight={800}
                fontSize={13}
                letterSpacing={3}
              >
                <textPath href={`#${ringId}`} startOffset="25%" textAnchor="middle">
                  DUEL
                </textPath>
              </text>
              <text
                fill="black"
                fontFamily="var(--font-faction-engraved)"
                fontWeight={800}
                fontSize={13}
                letterSpacing={3}
              >
                <textPath href={`#${ringBottomId}`} startOffset="50%" textAnchor="middle">
                  VICTOR
                </textPath>
              </text>
            </>
          )}
        </mask>
      </defs>
      <circle cx={120} cy={120} r={110} fill={`url(#${gradientId})`} />
      <rect
        width={240}
        height={240}
        fill="var(--badge-victor-frame)"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

/** Unknown key → a plain medallion ring, so a new backend badge never renders
 *  blank while its art is pending. */
function UnknownBadgeArt({ size = 18 }: BadgeArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      role="img"
      aria-label="Badge"
    >
      <circle cx="12" cy="12" r="8" strokeDasharray="3.2 2.4" />
    </svg>
  )
}

/** key → glyph. One row per registry badge (backend/badges.py). */
const BADGE_ART: Record<string, ComponentType<BadgeArtProps>> = {
  sock_puppeteer: SockPuppeteerArt,
  sock_puppet: SockPuppetArt,
  duelist: DuelistArt,
  duel_victor: DuelVictorArt,
}

// Own-property-only (#1821): a bracket read reaches `Object.prototype`, so an
// unregistered key of `constructor` handed the `Object` function back for React
// to render rather than falling through to the unknown-badge glyph.
export function badgeArtFor(key: string): ComponentType<BadgeArtProps> {
  return hasOwnKey(BADGE_ART, key) ? BADGE_ART[key] : UnknownBadgeArt
}

export { BADGE_ART, UnknownBadgeArt }
