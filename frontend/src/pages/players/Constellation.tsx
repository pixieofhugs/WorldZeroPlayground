import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../api/auth'
import { factionCssVar, isKnownFaction } from '../../utils/factions'
import FactionAvatar from '../../components/avatar/FactionAvatar'

/** A character with its computed standing, shared by the sky and the roster. */
export interface RankedPlayer {
  character: CharacterOut
  /** 1-based standing in the current score mode. */
  rank: number
  /** The score being ranked on (era or all-time), already resolved. */
  points: number
}

interface ConstellationProps {
  /** Full ranked list, descending. The sky shows the top `population`. */
  players: RankedPlayer[]
  /** Highest score in the field; 0 triggers the zero state. */
  maxScore: number
  /** The viewer's own character id. Their orb gets a "you" ring when it is in
   *  the sky; when it is not, the sky says nothing and the roster's your-rank
   *  strip carries "where am I" (#684 §§6-7 — this used to pin them on a
   *  tether, which drew a sigil at a radius its rank had not earned). */
  myCharId: number | null
  /** How many of the top players get a star. Mobile (#657) passes a smaller N. */
  population?: number
  /** Measured coordinate box, supplied by `SkyCanvas` on both form factors.
   *  Positions are computed in px so equal offsets are equal distances
   *  regardless of the fluid column width (see epic #654 §1). */
  stageWidth: number
  stageHeight: number
}

const GOLDEN_ANGLE_DEG = 137.5
const RING_COUNT = 4
// Node diameters (px). Champion sits at NODE_MAX; a zero-score orb at NODE_MIN.
const NODE_MIN = 30
const NODE_MAX = 92
const NODE_ZERO_STATE = 44
/** Breathing room between the outermost ring and the stage edge, for the orb
 *  plus its label stack. At the 900px desktop cap this leaves a ~294px radius,
 *  roughly double the old fixed-620px stage (#730 §1). */
const STAGE_MARGIN = 88
// Deterministic sparkle field, expressed as fractions of the stage box so it
// scales with any stageWidth/stageHeight (mobile reuses a smaller box).
const SPARKLES: ReadonlyArray<{ fx: number; fy: number; r: number }> = [
  { fx: 0.12, fy: 0.18, r: 1.4 },
  { fx: 0.78, fy: 0.12, r: 1 },
  { fx: 0.9, fy: 0.4, r: 1.6 },
  { fx: 0.2, fy: 0.62, r: 1 },
  { fx: 0.66, fy: 0.74, r: 1.3 },
  { fx: 0.34, fy: 0.86, r: 1 },
  { fx: 0.5, fy: 0.08, r: 1.1 },
  { fx: 0.08, fy: 0.44, r: 1 },
  { fx: 0.86, fy: 0.66, r: 1 },
  { fx: 0.44, fy: 0.5, r: 0.9 },
]

/** Radius of the outermost ring for a measured stage. The sky is circular, so
 *  the SHORTER side governs — which is why capping the width alone never fixed
 *  the cramping (`min(900, 460)` is still 460). Exported for the geometry test. */
export function skyRadius(stageWidth: number, stageHeight: number): number {
  return Math.min(stageWidth, stageHeight) / 2 - STAGE_MARGIN
}

interface PlacedNode {
  entry: RankedPlayer
  /** px offset from the stage centre. */
  x: number
  y: number
  size: number
  faded: boolean
  crowned: boolean
}

/**
 * Vogel / golden-angle spiral placement, extracted so the geometry can be
 * asserted without a DOM (#730 — this is a layout bug you cannot screenshot).
 * Radius rises monotonically with rank, so "closer to the sun = higher rank" is
 * literally true (epic #654). The champion sits ON the sun.
 */
export function placeOrbs(
  sky: RankedPlayer[],
  radius: number,
  maxScore: number,
): PlacedNode[] {
  const zeroState = maxScore <= 0
  const skyCount = Math.max(sky.length, 1)

  // The champion's orb is the largest and sits at r=0, so the runner-up's
  // spiral radius (0.29r) can be smaller than the two orbs' combined radii.
  // A floor on every non-champion orbit fixes that without breaking
  // monotonicity; it is capped as a fraction of the radius so it stays inert on
  // the phone's small stage rather than flinging rank 2 past the outer ring.
  const minOrbit = Math.min(NODE_MAX + 4, radius * 0.33)

  const nodeSize = (points: number): number => {
    if (zeroState) return NODE_ZERO_STATE
    // sqrt scale, clamped — score maps to area-ish, never below the floor.
    const fraction = Math.sqrt(Math.max(points, 0) / maxScore)
    return NODE_MIN + (NODE_MAX - NODE_MIN) * Math.min(fraction, 1)
  }

  return sky.map((entry, index) => {
    let x: number
    let y: number
    if (zeroState) {
      // One even ring — nobody has climbed, so nobody is nearer the centre.
      const angle = (index / skyCount) * 2 * Math.PI - Math.PI / 2
      x = radius * Math.cos(angle)
      y = radius * Math.sin(angle)
    } else {
      const spiral = radius * Math.sqrt(index / skyCount)
      const nodeRadius = index === 0 ? 0 : Math.max(spiral, minOrbit)
      const angle = (index * GOLDEN_ANGLE_DEG * Math.PI) / 180
      x = nodeRadius * Math.cos(angle)
      y = nodeRadius * Math.sin(angle)
    }
    return {
      entry,
      x,
      y,
      size: nodeSize(entry.points),
      faded: !zeroState && entry.points <= 0,
      crowned: !zeroState && index === 0,
    }
  })
}

export default function Constellation({
  players,
  maxScore,
  myCharId,
  population = 12,
  stageWidth,
  stageHeight,
}: ConstellationProps) {
  const { t } = useTranslation('common')

  const centreX = stageWidth / 2
  const centreY = stageHeight / 2
  const radius = skyRadius(stageWidth, stageHeight)
  const zeroState = maxScore <= 0

  const sky = players.slice(0, population)

  const placed = placeOrbs(sky, radius, maxScore)

  const ringRadii = zeroState
    ? [radius]
    : Array.from({ length: RING_COUNT }, (_, k) =>
        radius * Math.sqrt((k + 1) / RING_COUNT),
      )

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ position: 'relative', width: '100%', height: stageHeight, background: 'var(--sky-bg)' }}
      role="img"
      aria-label={t('leaderboard.desktop.skyLabel')}
    >
      {/* Central glow behind the champion / ring field. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: centreY,
          width: radius * 2.4,
          height: radius * 2.4,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, var(--sky-glow), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* The stage: all px offsets are measured from its centre, so the fluid
          column width can't distort the metaphor. */}
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
        {/* Rings, sparkles and the tether live in one SVG under the nodes. */}
        <svg
          width={stageWidth}
          height={stageHeight}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
          aria-hidden
        >
          {ringRadii.map((r, index) => (
            <circle
              key={index}
              cx={centreX}
              cy={centreY}
              r={r}
              fill="none"
              stroke="var(--sky-ring)"
              strokeWidth={1}
            />
          ))}
          {SPARKLES.map((s, index) => (
            <circle
              key={index}
              cx={s.fx * stageWidth}
              cy={s.fy * stageHeight}
              r={s.r}
              fill="var(--sky-sparkle)"
            />
          ))}
        </svg>

        {placed.map((node) => (
          <SkyNode
            key={node.entry.character.id}
            node={node}
            centreX={centreX}
            centreY={centreY}
            isMe={node.entry.character.id === myCharId}
          />
        ))}
      </div>

      {zeroState && (
        <p
          className="font-body content-text"
          style={{
            position: 'absolute',
            left: '50%',
            top: centreY,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            maxWidth: 260,
            color: 'var(--sky-name-muted)',
          }}
        >
          {t('leaderboard.desktop.zeroState')}
        </p>
      )}
    </div>
  )
}

/** The crown that marks the lead. Exported so the legend chip can reuse the one
 *  glyph instead of drawing a second crown (#730 §3). */
export function SkyCrown({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.77)}
      viewBox="0 0 26 20"
      fill="var(--sky-crown)"
      aria-hidden
    >
      <path d="M2 6l4 4 7-8 7 8 4-4-2 12H4z" />
    </svg>
  )
}

function SkyNode({
  node,
  centreX,
  centreY,
  isMe,
}: {
  node: PlacedNode
  centreX: number
  centreY: number
  isMe: boolean
}) {
  const { t } = useTranslation('common')
  const { entry, size, faded, crowned } = node
  const character = entry.character
  // factionCssVar resolves an unknown slug to the `ua` theme, so unaffiliated
  // branches on isKnownFaction first (#636 / ADR-0039).
  const known = isKnownFaction(character.faction_slug)
  const pointsColor = known ? factionCssVar(character.faction_slug) : undefined
  const badgeDim = Math.max(18, Math.round(size * 0.3))

  return (
    <Link
      to={`/characters/${character.id}`}
      className="font-display"
      style={{
        position: 'absolute',
        left: centreX + node.x,
        top: centreY + node.y,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        width: Math.max(size, 84),
      }}
    >
      {crowned && <SkyCrown />}

      {/* ponytail: the orb IS the roster avatar at a sky-sized dim — FactionAvatar
          already carries the faction ring, the sigil corner mark, the img/monogram
          fallback and the unaffiliated spectrum, so the bespoke circle + <img>
          this used to hand-roll is deleted. `glow` supplies the halo. */}
      <span
        style={{
          position: 'relative',
          lineHeight: 0,
          opacity: faded ? 0.4 : 1,
          // The "you" ring, symmetric with the Meadow's (#684 §7). The sky had
          // no self-marker at all — `isMe` only ever fed the deleted pin.
          borderRadius: '50%',
          boxShadow: isMe ? '0 0 0 2px var(--sky-you)' : undefined,
        }}
      >
        <FactionAvatar character={character} size={Math.round(size)} glow />

        {/* Rank badge — a small disc on the orb's shoulder. */}
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
            background: 'var(--sky-bg)',
            border: '1px solid var(--sky-ring)',
            color: 'var(--sky-name)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1,
          }}
        >
          {entry.rank}
        </span>
      </span>

      <span
        className="italic truncate mt-1"
        style={{
          fontSize: 'var(--text-content)',
          maxWidth: '100%',
          textAlign: 'center',
          color: faded ? 'var(--sky-name-muted)' : 'var(--sky-name)',
          lineHeight: 1.1,
        }}
      >
        {character.display_name}
      </span>

      {/* Points, in the faction hue — or the shared .rainbow-ink gradient clip
          for unaffiliated, matching the roster row (#729 / ADR-0039). */}
      <span
        className={known ? 'font-body' : 'font-body rainbow-ink'}
        style={{
          fontSize: 'var(--text-content)',
          fontWeight: 700,
          lineHeight: 1.1,
          // .rainbow-ink sets its own transparent colour — don't hand it one.
          ...(known ? { color: pointsColor } : null),
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
            color: 'var(--sky-name-muted)',
          }}
        >
          {t('leaderboard.desktop.you')}
        </span>
      )}
    </Link>
  )
}
