import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../api/auth'
import { factionCssVar } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'

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
  /** The viewer's own character id — pinned on a tether if outside the sky. */
  myCharId: number | null
  /** How many of the top players get a star. Mobile (#657) passes a smaller N. */
  population?: number
  /** Fixed coordinate box; positions are computed in px so equal offsets are
   *  equal distances regardless of the fluid column width (see epic #654 §1). */
  stageWidth?: number
  stageHeight?: number
}

const GOLDEN_ANGLE_DEG = 137.5
const RING_COUNT = 4
// Node diameters (px). Champion sits at NODE_MAX; a zero-score orb at NODE_MIN.
const NODE_MIN = 30
const NODE_MAX = 92
const NODE_ZERO_STATE = 44
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

interface PlacedNode {
  entry: RankedPlayer
  /** px offset from the stage centre. */
  x: number
  y: number
  size: number
  faded: boolean
  crowned: boolean
  pinned: boolean
}

export default function Constellation({
  players,
  maxScore,
  myCharId,
  population = 12,
  stageWidth = 620,
  stageHeight = 460,
}: ConstellationProps) {
  const { t } = useTranslation('common')

  const centreX = stageWidth / 2
  const centreY = stageHeight / 2
  // Leave room for the largest orb + its label below the outermost ring.
  const radius = Math.min(stageWidth, stageHeight) / 2 - 88
  const zeroState = maxScore <= 0

  const sky = players.slice(0, population)
  const skyCount = sky.length

  const nodeSize = (points: number): number => {
    if (zeroState) return NODE_ZERO_STATE
    // sqrt scale, clamped — score maps to area-ish, never below the floor.
    const fraction = Math.sqrt(Math.max(points, 0) / maxScore)
    return NODE_MIN + (NODE_MAX - NODE_MIN) * Math.min(fraction, 1)
  }

  const placed: PlacedNode[] = sky.map((entry, index) => {
    let x: number
    let y: number
    if (zeroState) {
      // One even ring — nobody has climbed, so nobody is nearer the centre.
      const angle = (index / Math.max(skyCount, 1)) * 2 * Math.PI - Math.PI / 2
      x = radius * Math.cos(angle)
      y = radius * Math.sin(angle)
    } else {
      // Vogel / golden-angle spiral: radius rises monotonically with rank, so
      // "closer to the sun = higher rank" is literally true. Champion at centre.
      const nodeRadius = radius * Math.sqrt(index / Math.max(skyCount, 1))
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
      pinned: false,
    }
  })

  // Viewer outside the sky: pin their sigil just past the outermost ring on a
  // dashed tether so it never implies a truthful radius.
  const mine = myCharId != null ? players.find((p) => p.character.id === myCharId) : undefined
  const pinnedRadius = radius + 58
  const pinnedNode: PlacedNode | null =
    mine && mine.rank > skyCount
      ? {
          entry: mine,
          x: 0,
          y: pinnedRadius,
          size: NODE_MIN,
          faded: !zeroState && mine.points <= 0,
          crowned: false,
          pinned: true,
        }
      : null

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

      {/* Fixed-width stage: all px offsets are measured from its centre, so the
          fluid column width can't distort the metaphor. */}
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
          {pinnedNode && (
            <line
              x1={centreX}
              y1={centreY + radius}
              x2={centreX + pinnedNode.x}
              y2={centreY + pinnedNode.y}
              stroke="var(--sky-tether)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {[...placed, ...(pinnedNode ? [pinnedNode] : [])].map((node) => (
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
  const { entry, size, faded, crowned, pinned } = node
  const character = entry.character
  const color = factionCssVar(character.faction_slug)

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
      {crowned && (
        <svg
          width={26}
          height={20}
          viewBox="0 0 26 20"
          fill="var(--sky-crown)"
          aria-hidden
          className="mb-0.5"
        >
          <path d="M2 6l4 4 7-8 7 8 4-4-2 12H4z" />
        </svg>
      )}

      {/* Orb — faded via opacity for zero-score players; the name stays legible. */}
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          opacity: faded ? 0.4 : 1,
          border: `2px solid ${color}`,
          boxShadow: `0 0 ${crowned ? 22 : 12}px var(--sky-glow)`,
          background: character.avatar_url
            ? undefined
            : `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${color})`,
          flex: 'none',
        }}
      >
        {character.avatar_url && (
          <img
            src={mediaUrl(character.avatar_url)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
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

      {crowned && (
        <span
          className="italic"
          style={{ fontSize: 'var(--text-title)', color: 'var(--sky-name)', lineHeight: 1.1 }}
        >
          {entry.points}
        </span>
      )}

      {pinned && (
        <span
          className="font-body uppercase"
          style={{
            fontSize: 'var(--text-sm)',
            letterSpacing: '0.15em',
            color: 'var(--sky-name-muted)',
          }}
        >
          {isMe ? t('leaderboard.desktop.you') : character.display_name}
        </span>
      )}
    </Link>
  )
}
