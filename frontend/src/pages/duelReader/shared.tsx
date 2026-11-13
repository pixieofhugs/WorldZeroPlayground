/**
 * The settled-duel side-by-side reader's chassis (#1084, ADR-0092). Design
 * canvas readable at commit `dfdafcb4`.
 *
 * Both columns are identical in kind, so the structure lives here once and a
 * skin supplies paint through {@link DuelReaderDress}. This file owns the ONLY
 * form-factor branch (ADR-0069): the phone differs in behaviour (one panel open
 * at a time), not information or order.
 *
 * One ground, two sigils (owner ruling 2026-08-27): `groundSlug` is the TASK's
 * faction; each duellist's own faction appears only on their `FactionSigil`.
 * Roles are spread here, not per archetype, because a role prefix may not be
 * shared between surfaces (`factionRoleFallbacks.test.ts`).
 *
 * Copy is faction-neutral (brief §0): a skin never rewords. Every colour is a
 * role read or `.spectrum-rule`.
 */
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../components/nav/Breadcrumb'
import FactionSigil from '../../components/sigil/FactionSigil'
import MarkdownPreview from '../editPraxis/blocks/MarkdownPreview'
import MediaGallery from '../../components/MediaGallery'
import VoteUI from '../../components/vote/VoteUI'
import { useFormFactor } from '../../hooks/useFormFactor'
import { formatTimestamp } from '../../utils/dates'
import { mediaUrl } from '../../utils/media'
import { factionRoleVars } from '../../utils/factionRoles'
import {
  duelScoreFor,
  duelVerdict,
  hasForfeited,
} from '../../components/duel/standing'
import type { PraxisOut } from '../../api/praxis'
import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import { taskRefMeta } from '../praxisDetail/shared'
import { openSideFor, type DuelSideKey } from './openSide'
import { casterVisible } from './reader'
import { duelReaderTask, type DuelReaderState } from './useDuelReader'

/** Literals, not interpolated: `factionTokensDeclared.test.ts` must see them. */
const PAPER = 'var(--duel-reader-paper)'
const INK = 'var(--duel-reader-ink)'
const QUIET = 'var(--duel-reader-quiet)'
const LINE = 'var(--duel-reader-line)'
const ACCENT = 'var(--duel-reader-accent)'
const RADIUS = 'var(--duel-reader-radius)'
const FACE = 'var(--duel-reader-face)'

/** Minimum tap target for a collapsed header. */
const HEADER_MIN = 44

/**
 * Must stay below `AlbescentAvatar`'s `RING_TURNS_AT` (64): lighting that ring
 * here would reveal Albescent membership (ADR-0088). >= 64 is a reveal
 * decision, not a sizing one.
 */
const DISC = 38
const SIGIL = 22

function Disc({ side, dimmed }: { side: DuelSideOut; dimmed: boolean }) {
  const shell: CSSProperties = {
    display: 'block',
    width: DISC,
    height: DISC,
    borderRadius: '50%',
    flex: 'none',
    overflow: 'hidden',
    background: PAPER,
    border: `1px solid ${LINE}`,
    boxSizing: 'border-box',
    opacity: dimmed ? 0.55 : 1,
  }
  if (!side.avatar_url) return <span aria-hidden="true" style={shell} />
  return (
    <span aria-hidden="true" style={shell}>
      <img
        src={mediaUrl(side.avatar_url)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </span>
  )
}

/**
 * A duel side plus the praxis body the duel payload lacks. `praxis` is `null`
 * on a FORFEIT (the praxis drops to `in_progress`, hidden from others); the
 * column then draws from `side` alone. See `reader.ts`'s `readablePraxisId`.
 */
export interface DuelReaderEntry {
  key: DuelSideKey
  side: DuelSideOut
  praxis: PraxisOut | null
}

/**
 * A skin's paint; every field optional, falling back to the chassis's roles.
 * Repoint existing inks, never mint one. NOTHING HERE MAY CARRY A DUELLIST'S
 * FACTION HUE (a rival's hue can be any colour; WORLD_ZERO_STYLE §3/§6, #895).
 */
export interface DuelReaderDress {
  /** Outside the frame, behind the breadcrumb. */
  pageStyle?: CSSProperties
  /** The sheet both columns sit on. */
  frameStyle?: CSSProperties
  headingStyle?: CSSProperties
  columnStyle?: CSSProperties
  titleStyle?: CSSProperties
  bylineStyle?: CSSProperties
  /** The caster plate at the foot of a column. */
  panelStyle?: CSSProperties
  /** Section label; defaults to the shared `.label-heading` rung. */
  sectionHead?: (label: string) => ReactNode
}

/**
 * Both figures, `vs.`, and the verdict sentence (shared with `DuelCard` via
 * `components/duel/standing.ts`, #2814). Not viewer-relative: passes
 * challenger/opponent where the card passes mine/rival.
 */
function Standing({
  duel,
  entries,
}: {
  duel: DuelDetailOut
  entries: readonly [DuelReaderEntry, DuelReaderEntry]
}) {
  const { t } = useTranslation('praxis')
  const [a, b] = entries

  /** Captioned with the duellist's NAME: the design's `votes`/`final` are not
   *  in the catalog and this surface mints no copy. DEVIATION (design-fidelity). */
  const figure = (entry: DuelReaderEntry, align: 'flex-start' | 'flex-end') => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        alignItems: align,
      }}
    >
      <span className="label-caption" style={{ color: QUIET }}>
        {entry.side.display_name}
      </span>
      <span
        className="content-title font-body"
        style={{ fontWeight: 700, lineHeight: 1, color: INK }}
      >
        {duelScoreFor(duel, entry.side)}
      </span>
    </div>
  )

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'end',
          gap: 'var(--space-lg)',
          paddingBottom: 'var(--space-md)',
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        {figure(a, 'flex-start')}
        <span
          className="font-display italic content-text"
          style={{ color: QUIET, paddingBottom: 'var(--space-xs)' }}
        >
          {t('duelBanner.versus')}
        </span>
        {figure(b, 'flex-end')}
      </div>
      <p
        className="font-body content-text"
        // Content tier, not caption: it explains status (§4, #769).
        style={{ margin: 'var(--space-md) 0 var(--space-xl)', color: QUIET }}
      >
        {duelVerdict(duel, a.side, b.side, t)}
      </p>
    </>
  )
}

function defaultSectionHead(label: string): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
      }}
    >
      <span className="label-heading" style={{ letterSpacing: '.22em', color: INK }}>
        {label}
      </span>
      <span
        aria-hidden="true"
        className="spectrum-rule"
        style={{ flex: '1 1 20%', minWidth: 20, height: 2, borderRadius: 2 }}
      />
    </div>
  )
}

/**
 * Disc, name, sigil, figure — the same row open or collapsed, so the
 * comparison survives a collapse. The sigil needs no redaction branch: no
 * faction name is on the page (§0) and Albescent's sigil uses the neutral conic
 * (#2632).
 */
function Byline({
  entry,
  duel,
  dress,
  chevron,
}: {
  entry: DuelReaderEntry
  duel: DuelDetailOut
  dress: DuelReaderDress
  chevron?: ReactNode
}) {
  const dimmed = hasForfeited(duel, entry.side)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        minHeight: HEADER_MIN,
        ...dress.bylineStyle,
      }}
    >
      <Disc side={entry.side} dimmed={dimmed} />
      <span
        className="font-display italic content-text"
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          color: INK,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {entry.side.display_name}
      </span>
      <FactionSigil slug={entry.side.faction_slug} size={SIGIL} />
      <span
        className="content-title font-body"
        style={{ fontWeight: 700, flexShrink: 0, color: INK }}
      >
        {duelScoreFor(duel, entry.side)}
      </span>
      {chevron}
    </div>
  )
}

/** One entry. Flex column so `margin-top: auto` keeps both casters level. */
function Column({
  entry,
  duel,
  state,
  dress,
  withByline,
  gutter,
}: {
  entry: DuelReaderEntry
  duel: DuelDetailOut
  state: DuelReaderState
  dress: DuelReaderDress
  /** Desktop draws the byline in the column; the phone draws it in the header. */
  withByline: boolean
  /** The side of the desktop hairline this column sits on. Absent on a phone. */
  gutter?: 'left' | 'right'
}) {
  const { t } = useTranslation('praxis')
  const { praxis } = entry
  const dimmed = hasForfeited(duel, entry.side)
  const head = dress.sectionHead ?? defaultSectionHead
  // ONE predicate, read by the plate and by the widget below it (#1429).
  const caster = praxis != null && casterVisible(duel, state.user, praxis.viewer_can_vote)
  // Whose entry this is. Duel praxes are solo, so authorship is membership.
  const mine = praxis != null && praxis.created_by_id === state.user?.character?.id
  // Artboard 2e: the winner's column takes one spectrum rule.
  const won =
    duel.status === 'resolved' &&
    duel.winner_character_id != null &&
    duel.winner_character_id === entry.side.character_id

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
        minWidth: 0,
        opacity: dimmed ? 0.55 : 1,
        paddingRight: gutter === 'left' ? 'var(--space-xl)' : undefined,
        paddingLeft: gutter === 'right' ? 'var(--space-xl)' : undefined,
        ...dress.columnStyle,
      }}
    >
      {won && (
        <span
          aria-hidden="true"
          className="spectrum-rule"
          style={{ display: 'block', height: 2, borderRadius: 2 }}
        />
      )}

      {withByline && <Byline entry={entry} duel={duel} dress={dress} />}

      {/* Forfeit: the column stops at the byline. */}
      {praxis == null ? null : (
      <>
      <h2
        className="font-display italic"
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: 'var(--text-heading)',
          lineHeight: 1.15,
          color: INK,
          ...dress.titleStyle,
        }}
      >
        {praxis.title ?? praxis.task_title}
      </h2>
      {praxis.submitted_at && (
        <p className="label-caption" style={{ margin: 0, color: QUIET }}>
          {t('detail.filed', { date: formatTimestamp(praxis.submitted_at) })}
        </p>
      )}

      {praxis.media_items.length > 0 && (
        <div className="spectrum-rule" style={{ borderRadius: 10, padding: 'var(--space-xs)' }}>
          <div style={{ borderRadius: 6, background: PAPER, padding: 'var(--space-sm)' }}>
            {/* A column is narrow at any width, so the gallery stacks. */}
            <MediaGallery media={praxis.media_items} layout="column" />
          </div>
        </div>
      )}

      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="font-body markdown-preview content-text"
          style={{ lineHeight: 1.85, color: INK }}
        />
      )}

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
        {caster && (
          <section
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: RADIUS,
              background: PAPER,
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-md)',
              ...dress.panelStyle,
            }}
          >
            {head(t('detail.vote.heading'))}
            <p
              className="font-display italic content-text"
              style={{ margin: '0 0 var(--space-md)', color: QUIET }}
            >
              {t('detail.vote.prompt')}
            </p>
            {/* Dispatched on the TASK's faction (ADR-0039). */}
            <VoteUI
              factionSlug={praxis.task_faction_slug}
              praxisId={praxis.id}
              currentValue={praxis.viewer_vote ?? undefined}
              points={praxis.points_from_votes}
              totalVotes={praxis.voter_count}
              viewerCanVote={praxis.viewer_can_vote}
            />
          </section>
        )}
        {/* Hidden on the viewer's own entry: "Read their praxis" would be wrong. */}
        {!mine && (
          <Link
            to={`/praxis/${praxis.id}`}
            className="content-text font-body"
            style={{ color: ACCENT, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
          >
            {t('duelCrossLink.readTheirPraxis')}
            <span aria-hidden="true">&rsaquo;</span>
          </Link>
        )}
      </div>
      </>
      )}
    </div>
  )
}

export interface DuelReaderFrameProps {
  state: DuelReaderState
  /** The TASK's faction, which dresses the whole frame. */
  groundSlug: string | null
  dress?: DuelReaderDress
}

/** Desktop: two-up. Phone: stacked, one open ({@link openSideFor}). */
export function DuelReaderFrame({ state, groundSlug, dress = {} }: DuelReaderFrameProps) {
  const { t } = useTranslation('praxis')
  const mobile = useFormFactor() === 'mobile'
  const { duel, praxes, arrivedFrom } = state

  // Seeded ONCE: re-running `openSideFor` each render would shut the open
  // panel when a cast flips who is behind.
  const seeded = useRef<DuelSideKey | null>(null)
  if (seeded.current === null && duel) {
    seeded.current = openSideFor(duel, arrivedFrom)
  }
  const [open, setOpen] = useState<DuelSideKey | null>(null)

  if (!duel || !praxes) return null

  const entries: readonly [DuelReaderEntry, DuelReaderEntry] = [
    { key: 'challenger', side: duel.challenger, praxis: praxes.challenger },
    { key: 'opponent', side: duel.opponent, praxis: praxes.opponent },
  ]
  const openKey = open ?? seeded.current ?? 'challenger'

  // Either body answers for the shared task. `readerMountsDuel` guarantees one,
  // so the guard is type narrowing only.
  const taskOf = duelReaderTask(praxes)
  if (!taskOf) return null

  return (
    <div style={{ fontFamily: FACE, color: INK, ...dress.pageStyle }}>
      {/* `Tasks › The duel`: the page is not the task, so the duel is the
          current crumb. The design's middle task crumb needs a `Breadcrumb`
          shape that doesn't exist yet. DEVIATION (design-fidelity). */}
      <Breadcrumb current={t('duelCrossLink.label')} />

      <div
        style={{
          // Dynamic slug; the map answers for any slug (ADR-0089).
          ...factionRoleVars(groundSlug, 'duel-reader'),
          position: 'relative',
          maxWidth: 1200,
          marginInline: 'auto',
          background: PAPER,
          color: INK,
          border: `1px solid ${LINE}`,
          borderRadius: RADIUS,
          padding: mobile ? 'var(--space-lg)' : 'var(--space-2xl)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          ...dress.frameStyle,
        }}
      >
        <span
          aria-hidden="true"
          className="spectrum-rule"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}
        />

        <h1
          className="font-display italic"
          style={{
            margin: '0 0 var(--space-md)',
            fontWeight: 700,
            fontSize: mobile ? 'var(--text-heading)' : 'var(--text-display)',
            lineHeight: 1.08,
            color: INK,
            ...dress.headingStyle,
          }}
        >
          {t('duelCrossLink.label')}
        </h1>

        {/* Task-reference band; `taskRefMeta` is shared with praxisDetail. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
            borderTop: `1px solid ${LINE}`,
            borderBottom: `1px solid ${LINE}`,
            padding: 'var(--space-md) 0',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <span className="label-caption" style={{ color: QUIET }}>
            {t('detail.taskRef.label')}
          </span>
          <Link
            to={`/tasks/${taskOf.task_id}`}
            className="font-display italic content-text"
            style={{ color: INK }}
          >
            {taskOf.task_title}
          </Link>
          <span className="label-caption" style={{ marginLeft: 'auto', color: QUIET }}>
            {taskRefMeta(taskOf, t)}
          </span>
        </div>

        <Standing duel={duel} entries={entries} />

        {mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {entries.map((entry) => (
              <section
                key={entry.key}
                style={{ border: `1px solid ${LINE}`, borderRadius: RADIUS, overflow: 'hidden' }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(entry.key)}
                  aria-expanded={openKey === entry.key}
                  style={{
                    display: 'block',
                    width: '100%',
                    minHeight: HEADER_MIN,
                    padding: 'var(--space-md)',
                    background: PAPER,
                    border: 'none',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <Byline
                    entry={entry}
                    duel={duel}
                    dress={dress}
                    chevron={
                      <span aria-hidden="true" className="content-text" style={{ color: QUIET }}>
                        {openKey === entry.key ? '⌄' : '›'}
                      </span>
                    }
                  />
                </button>
                {openKey === entry.key && (
                  <div style={{ padding: 'var(--space-lg)', borderTop: `1px solid ${LINE}` }}>
                    <Column
                      entry={entry}
                      duel={duel}
                      state={state}
                      dress={dress}
                      withByline={false}
                    />
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              // `minmax(0, …)` so a long word can't overflow; the hairline is a track.
              gridTemplateColumns: `minmax(0, 1fr) 1px minmax(0, 1fr)`,
              alignItems: 'stretch',
            }}
          >
            <Column
              entry={entries[0]}
              duel={duel}
              state={state}
              dress={dress}
              withByline
              gutter="left"
            />
            <div aria-hidden="true" style={{ background: LINE }} />
            <Column
              entry={entries[1]}
              duel={duel}
              state={state}
              dress={dress}
              withByline
              gutter="right"
            />
          </div>
        )}
      </div>
    </div>
  )
}
