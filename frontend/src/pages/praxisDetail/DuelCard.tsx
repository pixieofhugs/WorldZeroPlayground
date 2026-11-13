/**
 * The praxis-detail duel card (#1090). Renders OUTCOMES only (ADR-0059):
 *
 *  - live (`settled`): the winner floats until era close (ADR-0011/0052), so
 *    nothing may phrase it as decided.
 *  - won by default: the forfeiter's total is an em-dash; once a side forfeits
 *    the tally stops deciding (`services/duel_outcome.py`).
 *  - final (`resolved`): the frozen pair, or the no-contest line.
 *
 * `declined` draws nothing (no duel; the praxis is solo). `pending`/`active`
 * are still reachable by the author but belong to the composer's waiting
 * surface (ADR-0062: one state, one owner).
 *
 * Both rows show a `display_name`, never "You" (#999); sides come from the
 * PRAXIS, not the viewer. Archetypes dress it via `style`, `heading` and `ink`
 * (#1153).
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../utils/media'
import { factionRoleVar } from '../../utils/factionRoles'
import { duelScoreFor, duelVerdict } from '../../components/duel/standing'
import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import type { PraxisDetailState } from './usePraxisDetail'

const AVATAR_SIZE = 30

/**
 * The card's paint slots (#1153); each falls back to the `na` kit. Repoint inks
 * the skin already owns, never mint one.
 *
 * NEVER an opponent's faction hue in `name`/`total`/`muted`/`plate`: a rival
 * hue may be a ring, plate edge or bar, never ink or behind text
 * (WORLD_ZERO_STYLE §3/§6, #895). `line` is the allowed edge. Enforced by
 * `__tests__/duelCardOpponentInk.test.tsx`.
 */
interface DuelCardInk {
  name?: string
  /** A side's total, and the em-dash for an absent one. */
  total?: string
  /** Cross-link subtitle, chevron and verdict line. */
  muted?: string
  /** The two hairlines and the rival disc's outline. */
  line?: string
  /** Fill behind a duellist with no avatar. */
  plate?: string
}

/**
 * The `na` kit. Rootless (nine hosts), so it uses `factionRoleVar`, not a
 * prefix (#2672). `line`/`plate` are not core roles; repointing them would be a
 * repaint (decision 07).
 */
const DEFAULT_INK: Required<DuelCardInk> = {
  name: factionRoleVar('na', 'ink'),
  total: factionRoleVar('na', 'ink'),
  muted: factionRoleVar('na', 'quiet'),
  line: 'var(--faction-default-card-line)',
  plate: 'var(--faction-default-stamp-bg)',
}

/** Field-by-field: a spread would let an explicit `undefined` erase a default. */
function resolveInk(ink?: DuelCardInk): Required<DuelCardInk> {
  return {
    name: ink?.name ?? DEFAULT_INK.name,
    total: ink?.total ?? DEFAULT_INK.total,
    muted: ink?.muted ?? DEFAULT_INK.muted,
    line: ink?.line ?? DEFAULT_INK.line,
    plate: ink?.plate ?? DEFAULT_INK.plate,
  }
}

/** `ringed` = the page's own side (spectrum ring); the rival is outlined. */
function SideAvatar({
  side,
  ringed,
  ink,
}: {
  side: DuelSideOut
  ringed: boolean
  ink: Required<DuelCardInk>
}) {
  const shell: CSSProperties = {
    display: 'block',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    // Not an ink slot: the spectrum is the na tell (ADR-0039), on any ground.
    background: ringed ? 'var(--faction-default-rainbow)' : ink.plate,
    border: ringed ? 'none' : `1px solid ${ink.line}`,
    boxSizing: 'border-box',
  }
  if (!side.avatar_url) return <span aria-hidden style={shell} />
  return (
    <span aria-hidden style={shell}>
      <img
        src={mediaUrl(side.avatar_url)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
      />
    </span>
  )
}

/** `dimmed` = the forfeiter's row (its score is an em-dash). */
function DuelRow({
  side,
  score,
  ringed,
  dimmed,
  subtitle,
  ink,
}: {
  side: DuelSideOut
  score: string
  ringed: boolean
  dimmed: boolean
  subtitle?: ReactNode
  ink: Required<DuelCardInk>
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <SideAvatar side={side} ringed={ringed} ink={ink} />
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div
          className="font-display italic content-text"
          style={{
            color: ink.name,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {side.display_name}
        </div>
        {subtitle}
      </div>
      <span
        className="content-title font-body"
        style={{ fontWeight: 700, color: ink.total, flexShrink: 0 }}
      >
        {score}
      </span>
    </div>
  )
}

/**
 * From the praxis, not the viewer, so the cross-link points away from this
 * page. Falls back to `challenger` when neither side names it (ADR-0062
 * redirects that case anyway).
 */
function sidesForPraxis(
  duel: DuelDetailOut,
  praxisId: number,
): { mine: DuelSideOut; rival: DuelSideOut } {
  return duel.opponent.praxis_id === praxisId
    ? { mine: duel.opponent, rival: duel.challenger }
    : { mine: duel.challenger, rival: duel.opponent }
}

interface DuelCardProps {
  state: PraxisDetailState
  style?: CSSProperties
  heading?: ReactNode
  /** Omit for the `na` kit. Never an opponent's hue: see {@link DuelCardInk}. */
  ink?: DuelCardInk
}

export function DuelCard({ state, style, heading, ink }: DuelCardProps) {
  const { t } = useTranslation('praxis')
  const paint = resolveInk(ink)
  const { praxis, duel } = state
  if (!praxis || !duel) return null

  // Outcomes only (see the header).
  if (duel.status !== 'settled' && duel.status !== 'resolved') return null

  const { mine, rival } = sidesForPraxis(duel, praxis.id)
  const forfeitedBy = duel.forfeited_by_character_id

  /**
   * Shared with the duel reader (`components/duel/standing.ts`, #2814); this
   * card is viewer-relative so passes `mine, rival`. The verdict sits at the
   * content tier, not the design's 10px (STYLE §4, #769).
   */
  const verdict = duelVerdict(duel, mine, rival, t)

  const hairline = `1px solid ${paint.line}`

  // A forfeiter's thrown side is `in_progress`, so this link 404s; accepted.
  const rivalRow = (
    <DuelRow
      side={rival}
      score={duelScoreFor(duel, rival)}
      ringed={false}
      dimmed={forfeitedBy != null && rival.character_id === forfeitedBy}
      ink={paint}
      subtitle={
        rival.praxis_id != null ? (
          <span className="label-caption" style={{ color: paint.muted }}>
            {t('duelCrossLink.readTheirPraxis')}
          </span>
        ) : undefined
      }
    />
  )

  return (
    <section style={style}>
      {heading}

      <DuelRow
        side={mine}
        score={duelScoreFor(duel, mine)}
        ringed
        dimmed={forfeitedBy != null && mine.character_id === forfeitedBy}
        ink={paint}
      />

      <div style={{ borderTop: hairline, marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
        {rival.praxis_id != null ? (
          <Link
            to={`/praxis/${rival.praxis_id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              textDecoration: 'none',
            }}
          >
            {/* A div: a span may not wrap flow content. */}
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>{rivalRow}</div>
            <span
              aria-hidden
              className="content-text"
              style={{ color: paint.muted, flexShrink: 0 }}
            >
              ›
            </span>
          </Link>
        ) : (
          rivalRow
        )}
      </div>

      <div style={{ borderTop: hairline, marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
        <p
          className="font-body content-text"
          style={{ margin: 0, color: paint.muted }}
        >
          {verdict}
        </p>
      </div>

      {/*
        Link to the side-by-side reader (#1084), only once the rival has cast.
        `?from=` picks which panel opens on a phone (`duelReader/openSide.ts`).
      */}
      {rival.praxis_id != null && (
        <div style={{ borderTop: hairline, marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
          <Link
            to={`/duel/${duel.id}?from=${praxis.id}`}
            className="content-text"
            style={{ color: paint.muted, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
          >
            {t('duelCrossLink.readBothSides')}
            <span aria-hidden style={{ flexShrink: 0 }}>›</span>
          </Link>
        </div>
      )}
    </section>
  )
}

export default DuelCard
