import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../api/auth'
import { factionCssVar, isKnownFaction, FACTION_RAINBOW_ORDER } from '../../utils/factions'
import FactionAvatar from '../../components/avatar/FactionAvatar'
import type { RankedPlayer } from './Constellation'

/**
 * The Meadow — the LIGHT-theme standings visualization (#684).
 *
 * Sibling of `Constellation`, not a re-skin of it: same props, same data, a
 * genuinely different vessel. The sky encodes rank as ORBITAL RADIUS; the field
 * encodes rank as DEPTH — the champion blooms front-and-centre and each lower
 * rank stands farther back. Depth is strictly monotonic per flower, so "the
 * frontmost flower is #1" is literally true for every pair, the same invariant
 * the Vogel spiral earned in epic #654 §1.
 *
 * Size means SCORE and only score (√-scaled and clamped, identical floor/ceiling
 * logic to the sky's `nodeSize`). There is deliberately NO perspective
 * size-scaling for depth — that would make one channel carry two meanings and
 * a distant champion could be out-sized by a near nobody (#684 §3).
 */
interface MeadowProps {
  /** Full ranked list, descending. The field shows the top `population`. */
  players: RankedPlayer[]
  /** Highest score in the field; 0 triggers the zero state. */
  maxScore: number
  /** The viewer's own character id — highlighted when inside the field (§7). */
  myCharId: number | null
  /** How many of the top players get a bloom. Mobile (#657) passes a smaller N. */
  population?: number
  /** Measured coordinate box, supplied by `SkyCanvas` on both form factors.
   *  Positions are computed in px so equal offsets are equal distances
   *  regardless of the fluid column width (epic #654 §1). */
  stageWidth: number
  stageHeight: number
}

const GOLDEN_ANGLE_DEG = 137.5
/** Petals per bloom — seven, one per faction, echoing the spectrum sigil. */
const PETAL_COUNT = 7
// Bloom diameters (px). Deliberately the same ramp as the sky's orbs so the two
// viz read at the same weight when the theme flips.
const BLOOM_MIN = 30
const BLOOM_MAX = 92
const BLOOM_ZERO_STATE = 44
/** Headroom above the farthest row for its bloom. */
const FIELD_TOP_MARGIN = 84
/** Room below the front row for the champion's bloom, name and score stack. */
const FIELD_BOTTOM_MARGIN = 128
/** Side gutter so a wide bloom's name never clips the stage edge. */
const FIELD_SIDE_MARGIN = 104
/** How much the horizontal spread narrows toward the back, for a sense of
 *  recession that costs the size channel nothing. */
const BACK_ROW_NARROWING = 0.45
/** Deterministic pollen motes, as fractions of the stage box. */
const POLLEN: ReadonlyArray<{ fx: number; fy: number; r: number }> = [
  { fx: 0.1, fy: 0.22, r: 2 },
  { fx: 0.74, fy: 0.16, r: 1.6 },
  { fx: 0.88, fy: 0.46, r: 2.2 },
  { fx: 0.22, fy: 0.58, r: 1.5 },
  { fx: 0.62, fy: 0.7, r: 1.9 },
  { fx: 0.36, fy: 0.82, r: 1.4 },
  { fx: 0.52, fy: 0.12, r: 1.7 },
  { fx: 0.06, fy: 0.48, r: 1.4 },
  { fx: 0.92, fy: 0.72, r: 1.5 },
]
/** Grass bands, as fractions of the stage height — pure ornament. */
const FIELD_BANDS: readonly number[] = [0.42, 0.58, 0.76, 0.96]

export interface PlacedBloom {
  entry: RankedPlayer
  /** px, from the stage's left edge / top edge. */
  x: number
  y: number
  size: number
  /** 0 = frontmost. Strictly increasing with rank; unique per bloom. */
  depth: number
  faded: boolean
  champion: boolean
}

/**
 * Deterministic placement for the field, extracted so the depth invariant can be
 * asserted directly rather than fished out of the DOM (the repo's test harness is
 * `renderToStaticMarkup` — there is no layout to measure).
 *
 * Scored field: `y` decreases strictly with rank index, so every pair of blooms
 * has a well-defined front/back and no two share a depth. `x` is a golden-angle
 * sine so neighbouring ranks never land in the same column, with the champion
 * pinned dead centre at index 0 (`sin 0 = 0`).
 *
 * Zero state: depth-ranking is dropped entirely (#684 §5) — a uniform grid of
 * equal buds, because nobody has bloomed and a front row would be a lie.
 */
export function placeBlooms(
  field: RankedPlayer[],
  stageWidth: number,
  stageHeight: number,
  maxScore: number,
): PlacedBloom[] {
  const zeroState = maxScore <= 0
  const count = Math.max(field.length, 1)
  const spreadHalf = Math.max(stageWidth / 2 - FIELD_SIDE_MARGIN, BLOOM_MIN)
  const fieldDepth = Math.max(stageHeight - FIELD_TOP_MARGIN - FIELD_BOTTOM_MARGIN, BLOOM_MIN)
  const frontY = stageHeight - FIELD_BOTTOM_MARGIN
  const centreX = stageWidth / 2

  const bloomSize = (points: number): number => {
    if (zeroState) return BLOOM_ZERO_STATE
    // sqrt scale, clamped — score maps to area-ish, never below the floor.
    const fraction = Math.sqrt(Math.max(points, 0) / maxScore)
    return BLOOM_MIN + (BLOOM_MAX - BLOOM_MIN) * Math.min(fraction, 1)
  }

  if (zeroState) {
    // Even scatter: a grid across the field, alternate rows nudged half a cell
    // so it reads as sown rather than as a spreadsheet.
    const columns = Math.max(Math.ceil(Math.sqrt(count)), 1)
    const rows = Math.ceil(count / columns)
    return field.map((entry, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const cellWidth = (spreadHalf * 2) / columns
      const rowShift = row % 2 === 0 ? 0 : cellWidth / 2
      return {
        entry,
        x: centreX - spreadHalf + cellWidth * (column + 0.5) + rowShift - cellWidth / 4,
        y: FIELD_TOP_MARGIN + (fieldDepth * (row + 0.5)) / Math.max(rows, 1),
        size: BLOOM_ZERO_STATE,
        depth: index,
        faded: false,
        champion: false,
      }
    })
  }

  return field.map((entry, index) => {
    // sqrt compresses the far rows, which is what recession looks like — and it
    // is strictly increasing, so the depth invariant survives it.
    const depthFraction = count > 1 ? Math.sqrt(index / (count - 1)) : 0
    const amplitude = spreadHalf * (1 - BACK_ROW_NARROWING * depthFraction)
    const angle = (index * GOLDEN_ANGLE_DEG * Math.PI) / 180
    return {
      entry,
      x: centreX + amplitude * Math.sin(angle),
      y: frontY - depthFraction * fieldDepth,
      size: bloomSize(entry.points),
      depth: index,
      faded: entry.points <= 0,
      champion: index === 0,
    }
  })
}

export default function Meadow({
  players,
  maxScore,
  myCharId,
  population = 12,
  stageWidth,
  stageHeight,
}: MeadowProps) {
  const { t } = useTranslation('common')

  const zeroState = maxScore <= 0
  const field = players.slice(0, population)
  const placed = placeBlooms(field, stageWidth, stageHeight, maxScore)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        position: 'relative',
        width: '100%',
        height: stageHeight,
        background: 'var(--meadow-bg)',
      }}
      role="img"
      aria-label={t('leaderboard.desktop.meadowLabel')}
    >
      {/* Low sun behind the front of the field. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: stageHeight * 0.72,
          width: stageWidth * 1.1,
          height: stageWidth * 1.1,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, var(--meadow-glow), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: stageWidth,
          height: stageHeight,
          transform: 'translateX(-50%)',
        }}
      >
        {/* Grass bands and pollen sit under the blooms in one SVG. */}
        <svg
          width={stageWidth}
          height={stageHeight}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
          aria-hidden
        >
          {FIELD_BANDS.map((fraction, index) => (
            <ellipse
              key={index}
              cx={stageWidth / 2}
              cy={stageHeight * fraction}
              rx={stageWidth * (0.5 + index * 0.12)}
              ry={stageHeight * 0.07}
              fill="var(--meadow-field)"
            />
          ))}
          {POLLEN.map((mote, index) => (
            <circle
              key={index}
              cx={mote.fx * stageWidth}
              cy={mote.fy * stageHeight}
              r={mote.r}
              fill="var(--meadow-pollen)"
            />
          ))}
        </svg>

        {placed.map((bloom) => (
          <Bloom
            key={bloom.entry.character.id}
            bloom={bloom}
            stackHeight={placed.length}
            isMe={bloom.entry.character.id === myCharId}
          />
        ))}
      </div>

      {zeroState && (
        <p
          className="font-body content-text"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            textAlign: 'center',
            maxWidth: 300,
            color: 'var(--meadow-name-muted)',
          }}
        >
          {t('leaderboard.desktop.meadowZeroState')}
        </p>
      )}
    </div>
  )
}

/** A single flower: petals in the faction hue, avatar as the centre disc.
 *  Exported so the legend can draw the same glyph rather than a second flower. */
export function MeadowBloom({
  size,
  character,
  champion = false,
}: {
  size: number
  character?: CharacterOut
  champion?: boolean
}) {
  const slug = character?.faction_slug ?? null
  // The bloom spends its spectrum across petals, so it must know whether the
  // slug has one hue or seven before asking for a colour (ADR-0039). See the
  // isKnownFaction docblock in utils/factions for why `na` is not known (#749).
  const known = isKnownFaction(slug)
  const petalColor = (index: number): string => {
    if (champion) return 'var(--meadow-champion-petal)'
    // Unaffiliated wears the whole spectrum — one faction per petal, canonical
    // order — rather than borrowing any single faction's hue (ADR-0039).
    if (!known) return factionCssVar(FACTION_RAINBOW_ORDER[index % FACTION_RAINBOW_ORDER.length])
    return factionCssVar(slug)
  }
  const washColor = champion ? 'var(--meadow-champion-petal)' : factionCssVar(slug, 'light')

  return (
    <span style={{ position: 'relative', display: 'block', width: size, height: size }}>
      {/* Ornament geometry: the 100×100 viewBox is illustration, not layout. */}
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        {Array.from({ length: PETAL_COUNT }, (_, index) => (
          <ellipse
            key={`wash-${index}`}
            cx={50}
            cy={28}
            rx={17}
            ry={26}
            fill={known || champion ? washColor : 'none'}
            transform={`rotate(${(index * 360) / PETAL_COUNT + 180 / PETAL_COUNT} 50 50)`}
          />
        ))}
        {Array.from({ length: PETAL_COUNT }, (_, index) => (
          <ellipse
            key={index}
            cx={50}
            cy={30}
            rx={14}
            ry={22}
            fill={petalColor(index)}
            transform={`rotate(${(index * 360) / PETAL_COUNT} 50 50)`}
          />
        ))}
      </svg>
      {character && (
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            lineHeight: 0,
          }}
        >
          {/* The centre disc IS the roster avatar — FactionAvatar already carries
              the portrait, the monogram fallback, the faction ring and the
              unaffiliated spectrum, so there is no second face renderer here. */}
          <FactionAvatar character={character} size={Math.round(size * 0.44)} />
        </span>
      )}
    </span>
  )
}

function Bloom({
  bloom,
  stackHeight,
  isMe,
}: {
  bloom: PlacedBloom
  stackHeight: number
  isMe: boolean
}) {
  const { t } = useTranslation('common')
  const { entry, size, faded, champion, depth } = bloom
  const character = entry.character
  const badgeDim = Math.max(18, Math.round(size * 0.3))
  const stemHeight = Math.round(size * 0.42)

  return (
    <Link
      to={`/characters/${character.id}`}
      className="font-display"
      style={{
        position: 'absolute',
        left: bloom.x,
        top: bloom.y,
        // Frontmost = rank 1: the depth order IS the paint order, so a nearer
        // bloom always overlaps a farther one.
        zIndex: stackHeight - depth,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        width: Math.max(size, 84),
      }}
    >
      <span
        style={{
          position: 'relative',
          lineHeight: 0,
          opacity: faded ? 0.45 : 1,
          // The "you" ring: a soft outline, present only when the viewer is
          // actually in the field (#684 §7).
          borderRadius: '50%',
          boxShadow: isMe ? '0 0 0 2px var(--meadow-you)' : undefined,
        }}
      >
        <MeadowBloom size={size} character={character} champion={champion} />

        {/* Rank number, on the bloom's shoulder. */}
        <span
          className="font-body flex items-center justify-center"
          aria-hidden
          style={{
            position: 'absolute',
            left: -badgeDim / 3,
            top: -badgeDim / 3,
            width: badgeDim,
            height: badgeDim,
            borderRadius: '50%',
            background: 'var(--meadow-bg)',
            border: '1px solid var(--meadow-name-muted)',
            color: 'var(--meadow-name)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1,
          }}
        >
          {entry.rank}
        </span>
      </span>

      {/* Stem — ornament geometry, exempt from the spacing ramp (#684 §4a). */}
      <span
        aria-hidden
        style={{ width: 2, height: stemHeight, background: 'var(--meadow-stem)', flex: 'none' }}
      />

      <span
        className="italic truncate"
        style={{
          fontSize: 'var(--text-content)',
          maxWidth: '100%',
          textAlign: 'center',
          color: faded ? 'var(--meadow-name-muted)' : 'var(--meadow-name)',
          lineHeight: 1.1,
        }}
      >
        {character.display_name}
      </span>

      {/* Points, in INK — never a faction hue. The petals already carry the
          faction; #684 §9 keeps every text-bearing token on measured ink, exactly
          as the sky keeps its names near-white. The champion gets the gilt ink.
          Every bloom prints its points, matching the sky's orbs (#730 §2) — §8's
          "champion's score printed below" predates that change. */}
      <span
        className="font-body"
        style={{
          fontSize: 'var(--text-content)',
          fontWeight: 700,
          lineHeight: 1.1,
          color: champion
            ? 'var(--meadow-champion)'
            : faded
              ? 'var(--meadow-name-muted)'
              : 'var(--meadow-name)',
        }}
      >
        {entry.points}
      </span>

      {isMe && (
        <span
          className="font-body uppercase"
          style={{
            fontSize: 'var(--text-lg)',
            letterSpacing: '0.15em',
            lineHeight: 1.1,
            color: 'var(--meadow-name-muted)',
          }}
        >
          {t('leaderboard.desktop.you')}
        </span>
      )}
    </Link>
  )
}
