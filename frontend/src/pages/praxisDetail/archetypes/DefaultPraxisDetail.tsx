/**
 * Unaffiliated (`default` ≡ `na`) praxis detail (#1088): the reference kit
 * every faction skin inherits (ADR-0061), and the fall-through for undressed
 * factions (ADR-0039/0046/0048). Where it differs from the eight faction
 * designs, the eight win (#1117–#1123). `PraxisDetailSkin` owns the layout,
 * mobile reflow and undressed chrome (#2718); this file supplies the kit.
 * Copy is the shared `detail.*` set; dress is na's spectrum via
 * `--faction-default-*`, on the column, never the viewport (WORLD_ZERO_STYLE §5).
 *
 * `ornament` (#1140): Albescent wraps this file (ADR-0048) and cannot reach the
 * sheet from outside, so decorative layers go through this slot (WORLD_ZERO_STYLE
 * §3; twin of `DefaultTaskDetail`'s `worthSlot`). Ornament only, no data; the
 * sheet's `overflow: hidden` clips it to the component.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI from '../../../components/vote/VoteUI'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import { factionSheet } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import { PraxisDetailSkin } from '../praxisDetailSkin'
import {
  bylineFaces,
  MemberByline,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

const SPECTRUM = 'var(--faction-default-rainbow)'

/**
 * Who-voted rung geometry (#1143). Ornament (§10): px, not --space-*, because
 * the span is the ruler the gradient windowing is measured against.
 */
const RUNG_DOTS = [1, 2, 3, 4, 5]
const RUNG_DOT = 10
const RUNG_GAP = 5
const RUNG_PITCH = RUNG_DOT + RUNG_GAP
const RUNG_SPAN = (RUNG_DOTS.length - 1) * RUNG_PITCH + RUNG_DOT

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  )
}

/** One spectrum-ringed disc; collab bylines stack these, overlapping. */
function MemberDisc({
  name,
  avatarUrl,
  size,
}: {
  name: string
  avatarUrl: string
  size: number
}) {
  return (
    <span
      aria-hidden
      className="spectrum-dial"
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 'var(--space-xs)',
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%' }}
        />
      ) : (
        <span
          className="flex items-center justify-center font-display italic"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'var(--na-praxis-detail-paper)',
            fontSize: 'var(--text-lg)',
            color: 'var(--na-praxis-detail-ink)',
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

export default function DefaultPraxisDetail({
  state,
  ornament,
}: {
  state: PraxisDetailState
  /** Decorative layers mounted inside the sheet (see docstring). */
  ornament?: ReactNode
}) {
  const { t } = useTranslation('praxis')
  const desktop = useFormFactor() !== 'mobile'
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null


  const sectionHead = (label: ReactNode, trailing?: ReactNode) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <span
        className="label-heading"
        style={{ letterSpacing: '0.22em', color: 'var(--color-text-primary)' }}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="spectrum-rule"
        style={{
          flex: '1 1 20%',
          minWidth: 20,
          height: 2,
          borderRadius: 2,
        }}
      />
      {trailing}
    </div>
  )

  const panel: CSSProperties = {
    border: '1px solid var(--faction-default-card-line)',
    borderRadius: 12,
    background: 'var(--faction-default-stamp-bg)',
    color: 'var(--na-praxis-detail-ink)',
    padding: 'var(--space-lg)',
  }

  // Navigation and moderation banners are the shared layer's (#2102, #2718);
  // no banner ink is passed, as the shared warning hue is measured for its plate.

  const byline = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}
    >
      {/* `bylineFaces` credits the creator even with no member rows. */}
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {bylineFaces(praxis).map((author, index) => (
          <Link
            key={author.id}
            to={`/characters/${author.id}`}
            style={{
              display: 'block',
              marginLeft: index === 0 ? 0 : 'calc(-1 * var(--space-lg))',
              zIndex: index,
            }}
          >
            <MemberDisc
              name={author.name}
              avatarUrl={author.avatarUrl}
              size={desktop ? 44 : 38}
            />
          </Link>
        ))}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <MemberByline
          praxis={praxis}
          linkClassName="font-display italic"
          linkStyle={{
            fontSize: desktop ? 'var(--text-title)' : 'var(--text-content)',
            color: 'var(--na-praxis-detail-ink)',
            textDecoration: 'none',
          }}
        />
        <div className="label-caption" style={{ color: 'var(--na-praxis-detail-quiet)' }}>
          {t('detail.filed', {
            date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
          })}
        </div>
      </div>
    </div>
  )

  const title = (
    <h1
      className="font-display italic"
      style={{
        fontWeight: 700,
        fontSize: desktop ? 'var(--text-display)' : 'var(--text-heading)',
        lineHeight: 1.08,
        margin: '0 0 var(--space-md)',
        color: 'var(--na-praxis-detail-ink)',
        overflowWrap: 'anywhere',
      }}
    >
      {praxis.title || praxis.task_title}
    </h1>
  )

  const taskRef = (meta: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--space-sm)',
        flexWrap: 'wrap',
        borderTop: '1px solid var(--faction-default-card-line)',
        borderBottom: '1px solid var(--faction-default-card-line)',
        padding: 'var(--space-md) 0',
        marginBottom: 'var(--space-xl)',
      }}
    >
      <span className="label-caption" style={{ color: 'var(--na-praxis-detail-quiet)' }}>
        {t('detail.taskRef.label')}
      </span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="font-display italic content-text"
        style={{ color: 'var(--na-praxis-detail-ink)', textDecoration: 'none' }}
      >
        {praxis.task_title}
      </Link>
      <span className="label-caption" style={{ marginLeft: 'auto', color: 'var(--na-praxis-detail-quiet)' }}>
        {meta}
      </span>
    </div>
  )


  const voteBlock = (
    <>
      {sectionHead(t('detail.vote.heading'))}
      <p
        className="font-display italic content-text"
        style={{ margin: '0 0 var(--space-md)', color: 'var(--na-praxis-detail-quiet)' }}
      >
        {t('detail.vote.prompt')}
      </p>
      {/* On the TASK's faction, so a fall-through faction votes in its own voice. */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </>
  )

  // Each rung is the read-only twin of `DefaultVote`'s caster. One rainbow is
  // windowed across the row (#842): never a per-dot gradient. No numeral, so
  // `role="img"` + aria-label carries the value. No average (ADR-0014).
  const votersBlock = (
    <>
      {sectionHead(
        t('detail.voters.heading'),
        <span className="label-caption" style={{ color: 'var(--na-praxis-detail-quiet)' }}>
          {t('detail.voters.count', { count: voters.length })}
        </span>,
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="font-display italic"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: 'var(--text-content)',
                color: 'var(--na-praxis-detail-ink)',
                textDecoration: 'none',
              }}
            >
              {voter.display_name}
            </Link>
            <span
              role="img"
              aria-label={t('detail.voters.valueAria', { value: voter.value })}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                gap: RUNG_GAP,
              }}
            >
              {RUNG_DOTS.map((rung) => (
                <span
                  key={rung}
                  style={{
                    width: RUNG_DOT,
                    height: RUNG_DOT,
                    borderRadius: '50%',
                    backgroundImage: rung <= voter.value ? SPECTRUM : 'none',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${RUNG_SPAN}px ${RUNG_DOT}px`,
                    backgroundPositionX: `${-((rung - 1) * RUNG_PITCH)}px`,
                    boxShadow:
                      rung <= voter.value
                        ? 'none'
                        : 'inset 0 0 0 1.5px var(--faction-default-dot-ring)',
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    </>
  )

  const proof = (
    <>
      {sectionHead(t('detail.sections.proof'))}
      <div className="spectrum-rule" style={{ borderRadius: 10, padding: 'var(--space-xs)' }}>
        <div
          style={{
            borderRadius: 6,
            background: 'var(--faction-default-stamp-bg)',
            padding: 'var(--space-sm)',
          }}
        >
          <MediaGallery media={praxis.media_items} layout={desktop ? 'grid' : 'column'} />
        </div>
      </div>
    </>
  )

  const writeUp = (
    <>
      {sectionHead(t('detail.sections.writeUp'))}
      <MarkdownPreview
        source={praxis.body_text ?? ''}
        className="font-body markdown-preview content-text"
        style={{ lineHeight: 1.85, color: 'var(--na-praxis-detail-ink)' }}
      />
    </>
  )

  // No status guard: `in_progress`/`pending` redirect to the composer before
  // dispatch (ADR-0062).
  const crew = (
    <>
      {sectionHead(t('detail.sections.members'))}
      <CollabRoster
        praxisType={praxis.type}
        invites={praxis.invites}
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </>
  )


  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: 'relative' },
        sheetStyle: {
          // Role map (#2672) on the sheet, not the box above it, which also
          // holds the neutral `Breadcrumb`. Pinned to na: `factionSheet()`
          // takes no slug, and ink must follow its ground (#2361).
          ...factionRoleVars('na', 'na-praxis-detail'),
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          ...factionSheet(),
          color: 'var(--na-praxis-detail-ink)',
          border: '1px solid var(--faction-default-border)',
          borderRadius: 18,
          padding: desktop ? 'var(--space-2xl)' : 'var(--space-lg)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        },
        sheetPrelude: (
          <>
            <span
              aria-hidden
              className="spectrum-rule"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}
            />

            {ornament}
          </>
        ),
        byline,
        title,
        taskRef,
        scoreHeading: sectionHead(t('detail.score.heading')),
        panel,
        duelHeading: sectionHead(t('duelCrossLink.label')),
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead(t('detail.metatasks.heading')),
        commentsHeading: sectionHead(t('detail.sections.comments')),
      }}
    />
  )
}
