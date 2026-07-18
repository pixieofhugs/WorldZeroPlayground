import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PraxisCardOut } from '../../../api/praxis'
import { factionName } from '../../../utils/factions'
import { relativeTime } from '../../../utils/dates'
import { mediaUrl } from '../../../utils/media'
import { rosterNames } from '../shared'
import { TaskCrown } from '../../cards/TaskCrown'
import VoteUI from '../../vote/VoteUI'

/**
 * Bespoke MOBILE praxis-card shared slots (#573).
 *
 * Mirrors the desktop `components/praxisCard/shared.tsx` split: each faction's
 * mobile card owns a bespoke FRAME (fonts, chrome, tokens); the CONTENT is these
 * touch-native structural slots — byline, task reference, title, body excerpt,
 * crew roster, mode chip, media gallery, vote footer — composed by the faction
 * card (via {@link MobilePraxisBody}). Single column, no fixed-px layout grid
 * (SPEC-faction-ui-profile §1a). Colours come only from the theme tokens each
 * card passes in — never a hardcoded hue.
 */

/** The per-faction voice each slot dresses itself in. Every value is a CSS var. */
export interface MobileSlotTheme {
  /** Primary text / ink. */
  ink: string
  /** Secondary / muted text. */
  muted: string
  /** Faction accent — byline label, avatar ring, chip. */
  accent: string
  /** The card's paper colour — avatar disc + Task Crown inner disc. */
  paper: string
  /** Display font for the title. */
  displayFont?: string
  /** Body font for the excerpt + meta. */
  bodyFont?: string
  /** Title-specific overrides (italic, weight, colour). */
  titleStyle?: CSSProperties
}

/** A round avatar disc showing the first initial — the faction accent ring. */
function AvatarInitial({
  name,
  theme,
  size = 34,
}: {
  name: string | null | undefined
  theme: MobileSlotTheme
  size?: number
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: theme.paper,
        border: `1.5px solid ${theme.accent}`,
        color: theme.accent,
        fontFamily: theme.displayFont,
        fontSize: size * 0.44,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  )
}

/**
 * Slot: the author byline — avatar initial + name (linked to the character),
 * then the author's own faction and a relative timestamp. Actor-scoped: uses
 * `created_by_faction_slug` (the author's member faction), not the task faction.
 */
export function MobileByline({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const name = praxis.created_by_display_name || `#${praxis.created_by_id}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <AvatarInitial name={name} theme={theme} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
        <Link
          to={`/characters/${praxis.created_by_id}`}
          className="hover:underline"
          style={{
            fontFamily: theme.displayFont,
            fontSize: 14,
            fontWeight: 600,
            color: theme.ink,
            textDecoration: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Link>
        <span
          style={{
            fontFamily: theme.bodyFont,
            fontSize: 10,
            letterSpacing: '0.04em',
            color: theme.muted,
          }}
        >
          {t('mobileFeed.byline', {
            faction: factionName(praxis.created_by_faction_slug),
            // Seal date, not draft-open (#644 §3): a collab drafted weeks ago and
            // sealed yesterday should read "1d ago", matching desktop + the sort.
            time: relativeTime(praxis.submitted_at ?? praxis.created_at),
          })}
        </span>
      </span>
    </div>
  )
}

/** Slot: the task this proof answers — "Re · {title}", linked to the task. */
export function MobileTaskRef({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <Link
      to={`/tasks/${praxis.task_id}`}
      className="hover:underline"
      style={{
        fontFamily: theme.bodyFont,
        fontSize: 11,
        letterSpacing: '0.02em',
        color: theme.accent,
        textDecoration: 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {t('mobileCard.taskRef', { title: praxis.task_title })}
    </Link>
  )
}

/** Slot: the praxis title in the faction display font, linked to the detail. */
export function MobileTitle({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('praxis')
  return (
    <Link to={`/praxes/${praxis.id}`} style={{ textDecoration: 'none' }}>
      <h3
        className="hover:underline"
        style={{
          fontFamily: theme.displayFont,
          fontSize: 20,
          lineHeight: 1.15,
          color: theme.ink,
          margin: 0,
          overflowWrap: 'anywhere',
          ...theme.titleStyle,
        }}
      >
        {praxis.title || t('mobileCard.untitled')}
      </h3>
    </Link>
  )
}

/** Slot: a 1–2 line body excerpt, clamped. Renders nothing without body_text. */
export function MobileBody({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  if (!praxis.body_text) return null
  return (
    <p
      style={{
        fontFamily: theme.bodyFont,
        fontSize: 13,
        lineHeight: 1.5,
        color: theme.muted,
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {praxis.body_text}
    </p>
  )
}

/**
 * Slot: the crew roster — overlapping avatar initials plus names (capped via
 * `rosterNames`, then "+N more"). Collab only: renders nothing on a solo praxis
 * or when the roster is just the author.
 */
export function MobileRoster({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const members = praxis.members ?? []
  if (praxis.type !== 'collab' || members.length < 2) return null
  const { names, overflow } = rosterNames(
    members.map((member) => ({ display_name: member.character_display_name })),
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex' }}>
        {names.map((name, index) => (
          <span key={index} style={{ marginLeft: index === 0 ? 0 : -8 }}>
            <AvatarInitial name={name} theme={theme} size={22} />
          </span>
        ))}
      </span>
      <span
        style={{
          fontFamily: theme.bodyFont,
          fontSize: 10,
          color: theme.muted,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {names.join(', ')}
        {overflow > 0 ? ` ${t('mobileCard.rosterMore', { count: overflow })}` : ''}
      </span>
    </div>
  )
}

/**
 * Slot: the mode chip — a small duel and/or pending-publish marker. Reuses the
 * shared collaboration copy (`collaborationCard.duel` / `.pending`, common ns).
 * Renders nothing on an ordinary solo/collab praxis.
 */
export function MobileModeChip({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('common')
  const isDuel = praxis.type === 'duel'
  const isPending = praxis.submit_proposed_at != null
  if (!isDuel && !isPending) return null
  const chip: CSSProperties = {
    fontFamily: theme.bodyFont,
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    padding: '2px 8px',
    borderRadius: 3,
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {isDuel && (
        <span
          style={{
            ...chip,
            color: 'var(--color-danger)',
            background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
          }}
        >
          {t('collaborationCard.duel')}
        </span>
      )}
      {isPending && (
        <span
          style={{
            ...chip,
            color: 'var(--color-warning)',
            background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
          }}
        >
          {t('collaborationCard.pending')}
        </span>
      )}
    </div>
  )
}

/**
 * Slot: the proof media gallery — up to 3 tiles, with a "+N" badge on the last
 * when there are more. UNIFORM across every faction (no opt-out). Images render
 * a thumbnail; video/audio render a faction-styled glyph placeholder (no real
 * preview, no lightbox — out of scope). Renders nothing without media.
 */
export function MobileMediaGallery({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('praxis')
  const items = praxis.media_items ?? []
  if (items.length === 0) return null
  const tiles = items.slice(0, 3)
  const overflow = items.length - tiles.length
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {tiles.map((item, index) => {
        const isLast = index === tiles.length - 1
        const showOverflow = isLast && overflow > 0
        return (
          <div
            key={item.id}
            style={{
              position: 'relative',
              flex: 1,
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              borderRadius: 4,
              border: `1px solid ${theme.accent}`,
              background: theme.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.type === 'image' ? (
              <img
                src={mediaUrl(item.file_path)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  color: theme.accent,
                  fontFamily: theme.bodyFont,
                }}
              >
                <span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>
                  {item.type === 'video' ? '▶' : '♪'}
                </span>
                <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {item.type === 'video' ? t('mobileCard.mediaVideo') : t('mobileCard.mediaAudio')}
                </span>
              </span>
            )}
            {showOverflow && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'color-mix(in srgb, black 55%, transparent)',
                  color: 'white',
                  fontFamily: theme.displayFont,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {t('mobileCard.mediaMore', { count: overflow })}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Slot: the vote footer — the real per-faction VoteUI, keyed by the task
 * faction. Pre-highlights the viewer's own cast (`viewer_vote`); tapping casts
 * through VoteUI's own useVote path. The 1–5 stamps own their ≥44px hit target.
 */
/**
 * Slot: the "voted by {name}" marker (#644 §7) — the mobile twin of the desktop
 * `PraxisVotedByMarker`. Shows when another character on the viewer's ACCOUNT
 * voted; account-scoped, so it can appear with no star of the carried character's
 * own. Renders nothing without `voted_by_name`.
 */
export function MobileVotedByMarker({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  const { t } = useTranslation('praxis')
  if (!praxis.voted_by_name) return null
  return (
    <span
      style={{
        fontFamily: theme.bodyFont,
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: theme.muted,
      }}
    >
      {t('card.votedBy', { name: praxis.voted_by_name })}
    </span>
  )
}

export function MobileVoteFooter({ praxis }: { praxis: PraxisCardOut }) {
  return (
    <VoteUI
      factionSlug={praxis.task_faction_slug}
      praxisId={praxis.id}
      currentValue={praxis.viewer_vote ?? undefined}
      points={praxis.score}
      totalVotes={praxis.voter_count}
    />
  )
}

/**
 * The full card anatomy, composed once and wrapped by each faction's bespoke
 * frame (mirrors the desktop `PraxisBody`). The Task Crown floats top-right when
 * this is the top-scoring proof for its task; the frame must be position:relative.
 */
export function MobilePraxisBody({
  praxis,
  theme,
}: {
  praxis: PraxisCardOut
  theme: MobileSlotTheme
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {praxis.is_top_for_task && (
        <TaskCrown
          size={30}
          innerBg={theme.paper}
          glyphColor={theme.accent}
          rotate="6deg"
          style={{ position: 'absolute', top: -10, right: -8, zIndex: 4 }}
        />
      )}
      <MobileByline praxis={praxis} theme={theme} />
      <MobileTaskRef praxis={praxis} theme={theme} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MobileTitle praxis={praxis} theme={theme} />
        <MobileBody praxis={praxis} theme={theme} />
      </div>
      <MobileModeChip praxis={praxis} theme={theme} />
      <MobileRoster praxis={praxis} theme={theme} />
      <MobileMediaGallery praxis={praxis} theme={theme} />
      <div style={{ borderTop: `1px solid ${theme.accent}`, paddingTop: 10 }}>
        <MobileVotedByMarker praxis={praxis} theme={theme} />
        <MobileVoteFooter praxis={praxis} />
      </div>
    </div>
  )
}
