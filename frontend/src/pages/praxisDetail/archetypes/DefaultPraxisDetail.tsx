/**
 * Unaffiliated (`default` ≡ `na`) praxis detail — praxis detail v2 (#1088,
 * epic #1085; design project bebdf7c7, `Unaffiliated Praxis Detail.dc.html`).
 *
 * This is the REFERENCE implementation of the layout contract the seven future
 * faction designs inherit (ADR-0061). It is not a placeholder: `default` ≡ `na`
 * ≡ Unaffiliated is one visual identity (ADR-0039/0046/0048), so this IS the
 * Unaffiliated skin and the fall-through every undressed faction renders.
 *
 * ## The contract
 *
 * - **Desktop** — breadcrumb, then main column + a 340px aside, then a comments
 *   region beneath both.
 * - **Mobile** — one stacked column (a back link and a centred label instead of
 *   the breadcrumb), with the score and duel blocks moved above the proof.
 * - **Main** — moderation banners · byline · title · owner actions · task
 *   reference · proof · write-up · members · metatasks.
 * - **Aside** — score · duel · vote · voters · flag.
 *
 * ## One responsive component, no mobile twin (ADR-0056/0058)
 *
 * `useFormFactor()` picks the size set and collapses the split; the dispatcher
 * no longer branches on form factor. Score and duel are built ONCE and moved by
 * where they are mounted — never drawn twice and hidden, which would duplicate
 * the DOM and is what the design doc's twin markup would have produced. Mobile
 * stacks with flow, never a fixed-px grid (SPEC-faction-ui-profile §1a); the
 * 340px aside track is desktop-only.
 *
 * ## Copy and dress
 *
 * Copy is one neutral shared `detail.*` set (ADR-0061) — no na voice, no faction
 * voice; where the design's word differed from the domain noun in CONTEXT.md the
 * domain noun won ("Members", not "the crew"). Dress is na's alone: the spectrum
 * via `--faction-default-*` tokens plus `--color-*`, flipping light/dark through
 * the `[data-theme="dark"]` cascade with no `dark ?` branch. The page surface is
 * carried by the COLUMN, not the viewport — the site background still shows
 * around the component (WORLD_ZERO_STYLE §5, the #1028 ruling), which is why
 * there is no `.na-backdrop` full-bleed wash here.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` (via the shared crown banner) · `ScoreStamp` (#1091 restyles it;
 * this file only mounts it) · `VoteUI`, which dispatches the vote surface on the
 * TASK's faction so an unskinned faction still votes in its own voice ·
 * `CollabRoster` for the members · `MediaGallery` · `MetaTaskSeal`, read-only:
 * `apply_metatask` requires `in_progress`, so the design's "Available" chips
 * would 422 on every tap (#1093 removes the dead wiring).
 *
 * ## The duel slot
 *
 * The rail is still mounted by the dispatcher above the archetype
 * (`DuelCrossLink`), where every faction archetype picks it up. #1090 replaces
 * it with the design's duel card and lands it in the slots marked below — one
 * block, in the aside on desktop and above the proof on mobile.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import {
  scoreBreakdown,
  formatMult,
} from '../../../components/praxisCard/scoreStamp/scoreBreakdown'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisDetailComments,
  MemberByline,
  orderedMembers,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

/** The na spectrum — the one ornament this whole page is built out of. */
const SPECTRUM = 'var(--faction-default-rainbow)'

/** Initials fallback for a member with no uploaded avatar. */
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

/**
 * One spectrum-ringed initials disc. Collab bylines stack these, overlapping,
 * so a shared praxis reads as shared before a single name is parsed.
 */
function MemberDisc({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 'var(--space-xs)',
        background: SPECTRUM,
        flexShrink: 0,
      }}
    >
      <span
        className="flex items-center justify-center font-display italic"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--faction-default-card-bg)',
          fontSize: 'var(--text-lg)',
          color: 'var(--faction-default-card-text)',
        }}
      >
        {initials(name)}
      </span>
    </span>
  )
}

export default function DefaultPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const desktop = useFormFactor() !== 'mobile'
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  const members = orderedMembers(praxis)
  const isCollab = members.length > 1
  // The shared banners already draw the roster while a collab is still
  // resolving (`in_progress` / `pending`). The Members section below is the
  // PUBLISHED half of that same fact, so it takes the complement — one roster
  // on the page, never two.
  const rosterInBanners = praxis.status === 'in_progress' || praxis.status === 'pending'

  const { base, mult, meta, votes, total } = scoreBreakdown(praxis)

  /** A spectrum hairline running out from a label — the page's only rule. */
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
        className="eyebrow"
        style={{ letterSpacing: '0.22em', color: 'var(--color-text-primary)' }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{
          flex: '1 1 20%',
          minWidth: 20,
          height: 2,
          borderRadius: 2,
          background: SPECTRUM,
        }}
      />
      {trailing}
    </div>
  )

  /** Aside / rail panel chrome, shared by score, vote and voters. */
  const panel: CSSProperties = {
    border: '1px solid var(--faction-default-card-line)',
    borderRadius: 12,
    background: 'var(--faction-default-stamp-bg)',
    color: 'var(--faction-default-card-text)',
    padding: 'var(--space-lg)',
  }

  // ── Navigation: breadcrumb on desktop, back link + label on mobile ─────────
  const breadcrumb = (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <Link
        to="/tasks"
        className="eyebrow"
        style={{
          letterSpacing: '0.2em',
          color: 'var(--faction-default-card-accent)',
          textDecoration: 'none',
        }}
      >
        {t('detail.breadcrumb.tasks')}
      </Link>
      <span aria-hidden className="eyebrow">
        ›
      </span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="eyebrow"
        style={{
          letterSpacing: '0.2em',
          color: 'var(--faction-default-card-accent)',
          textDecoration: 'none',
        }}
      >
        {praxis.task_title}
      </Link>
      <span aria-hidden className="eyebrow">
        ›
      </span>
      <span className="eyebrow" style={{ letterSpacing: '0.2em' }}>
        {t('detail.breadcrumb.current')}
      </span>
    </nav>
  )

  // The phone affordance the design draws instead of the breadcrumb. Not
  // sticky: the mobile shell already owns a sticky top bar, and a second one
  // stacked under it is a dress decision, not a layout one.
  const mobileBar = (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
      }}
    >
      <Link
        to="/praxes"
        className="eyebrow"
        style={{
          letterSpacing: '0.2em',
          color: 'var(--faction-default-card-accent)',
          textDecoration: 'none',
        }}
      >
        <span aria-hidden>‹ </span>
        {t('detail.back')}
      </Link>
      <span
        className="eyebrow"
        style={{ flex: 1, textAlign: 'center', letterSpacing: '0.2em' }}
      >
        {t('detail.breadcrumb.current')}
      </span>
      {/* Balances the centred label against the back link's width. */}
      <span aria-hidden style={{ width: 44 }} />
    </nav>
  )

  // ── Moderation banners ────────────────────────────────────────────────────
  // The crown hero, the in-editing / pending-publish notice and the failed note
  // (with its `admin_note`) are shared invariant chrome; the flagged notice is
  // the third moderation state the v2 contract asks for and has no shared slot,
  // so it renders here. `PraxisAdminBar` is the steward bar.
  const banners = (
    <>
      <PraxisStatusBanners state={state} />
      {praxis.moderation_status === 'flagged' && (
        <div
          style={{
            border: '2px solid var(--color-warning)',
            borderRadius: 8,
            padding: 'var(--space-sm) var(--space-lg)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
          }}
        >
          <span className="eyebrow" style={{ color: 'var(--color-warning)' }}>
            {t('detail.banners.flaggedLabel')}
          </span>
          <span className="font-body content-text" style={{ color: 'var(--color-text-secondary)' }}>
            {t('detail.banners.flaggedBody')}
          </span>
        </div>
      )}
      <PraxisAdminBar state={state} />
    </>
  )

  // ── Byline · title · owner actions · task reference ───────────────────────
  const header = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
        }}
      >
        {/* Stacked discs, one per member — a collab reads as shared before a
            single name is parsed. A payload with no member rows still credits
            its creator, so the author is always reachable from the byline. */}
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {(members.length > 0
            ? members.map((member) => ({
                id: member.character_id,
                name: member.character_display_name || `#${member.character_id}`,
              }))
            : [{ id: praxis.created_by_id, name: praxis.created_by_display_name }]
          ).map((author, index) => (
            <Link
              key={author.id}
              to={`/characters/${author.id}`}
              style={{
                display: 'block',
                // Each disc after the first laps the one before it — the lap is
                // a spacing step off the scale, negated, not a loose pixel.
                marginLeft: index === 0 ? 0 : 'calc(-1 * var(--space-lg))',
                zIndex: index,
              }}
            >
              <MemberDisc name={author.name} size={desktop ? 44 : 38} />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkClassName="font-display italic"
            linkStyle={{
              fontSize: desktop ? 'var(--text-title)' : 'var(--text-content)',
              color: 'var(--faction-default-card-text)',
              textDecoration: 'none',
            }}
          />
          <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>
            {t('detail.filed', {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        className="font-display italic"
        style={{
          fontWeight: 700,
          fontSize: desktop ? 'var(--text-display)' : 'var(--text-heading)',
          lineHeight: 1.08,
          margin: '0 0 var(--space-md)',
          color: 'var(--faction-default-card-text)',
          overflowWrap: 'anywhere',
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference — what this praxis is a doing OF. */}
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
        <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>
          {t('detail.taskRef.label')}
        </span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="font-display italic content-text"
          style={{ color: 'var(--faction-default-card-text)', textDecoration: 'none' }}
        >
          {praxis.task_title}
        </Link>
        <span className="eyebrow" style={{ marginLeft: 'auto', color: 'var(--faction-default-card-muted)' }}>
          {t('detail.taskRef.level', { level: praxis.task_level_required })}
          {' · '}
          {t('detail.taskRef.points', { points: praxis.task_point_value })}
        </span>
      </div>
    </>
  )

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // Reads twice, as the design specifies: the stamp carries the total mark, and
  // the strip below it spells the working out. Neither number is computed here —
  // `scoreBreakdown()` is the single resolver (ADR-0053), so the two readouts
  // and every praxis card agree by construction. The design's own arithmetic
  // (a multiplier derived from the vote average) is NOT built; #1091 restyles
  // the stamp.
  const scoreRow = (label: string, value: ReactNode) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        padding: 'var(--space-xs) 0',
      }}
    >
      <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>
        {label}
      </span>
      <span
        className="font-body"
        style={{ fontSize: 'var(--text-content)', color: 'var(--faction-default-card-text)' }}
      >
        {value}
      </span>
    </div>
  )

  const scoreBlock = (
    <section style={panel}>
      {sectionHead(t('detail.score.heading'))}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
        {/* The crown already has its own hero banner above; one mark per page. */}
        <ScoreStamp praxis={praxis} showCrown={false} />
      </div>
      {scoreRow(t('detail.score.base'), base)}
      {mult !== null && scoreRow(t('detail.score.multiplier'), formatMult(mult))}
      {meta !== null && scoreRow(t('detail.score.meta'), `+${meta}`)}
      {scoreRow(t('detail.score.votes'), `+${votes}`)}
      <div
        style={{
          borderTop: '1px solid var(--faction-default-card-line)',
          marginTop: 'var(--space-xs)',
          paddingTop: 'var(--space-xs)',
        }}
      >
        {scoreRow(t('detail.score.total'), total.toFixed(1))}
      </div>
    </section>
  )

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  // #1090 lands the design's duel card here. Until it does, the duel rail stays
  // where every archetype already picks it up — mounted by the dispatcher above
  // the page — so nothing is drawn twice and no faction loses its rail.
  const duelBlock: ReactNode = null

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  )

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  const voteBlock = (
    <section style={panel}>
      {sectionHead(t('detail.vote.heading'))}
      <p
        className="font-display italic content-text"
        style={{ margin: '0 0 var(--space-md)', color: 'var(--faction-default-card-muted)' }}
      >
        {t('detail.vote.prompt')}
      </p>
      {/* Dispatched on the TASK's faction, so an unskinned faction falling
          through to this page still votes in its own voice (ADR-0039). */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  )

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already
  // fetched by `usePraxisDetail`. Each voter's own rung is a spectrum bar
  // (value / 5). NO AVERAGE anywhere (ADR-0014): the standing is the sum and
  // the count, never the mean — and there is no per-voter points figure in the
  // payload, so none is invented.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t('detail.voters.heading'),
        <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>
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
                color: 'var(--faction-default-card-text)',
                textDecoration: 'none',
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 9,
                borderRadius: 5,
                background: 'var(--faction-default-card-line)',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: SPECTRUM,
                }}
              />
            </span>
            <span
              className="font-body"
              style={{
                width: 20,
                textAlign: 'right',
                fontSize: 'var(--text-content)',
                color: 'var(--faction-default-card-text)',
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )

  const asideRest = (
    <>
      {voteBlock}
      {votersBlock}
      <PraxisFlagBlock state={state} />
    </>
  )

  // ── Proof · write-up · members · metatasks ────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: desktop ? 'var(--space-2xl)' : 'var(--space-xl)' }}>
      {sectionHead(t('detail.sections.proof'))}
      <div style={{ borderRadius: 10, padding: 'var(--space-xs)', background: SPECTRUM }}>
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
    </section>
  )

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: desktop ? 'var(--space-2xl)' : 'var(--space-xl)' }}>
      {sectionHead(t('detail.sections.writeUp'))}
      <MarkdownPreview
        source={praxis.body_text}
        className="font-body markdown-preview content-text"
        style={{ lineHeight: 1.85, color: 'var(--faction-default-card-text)' }}
      />
    </section>
  )

  const crew = isCollab && !rosterInBanners && (
    <section style={{ marginBottom: desktop ? 'var(--space-2xl)' : 'var(--space-xl)' }}>
      {sectionHead(t('detail.sections.members'))}
      <CollabRoster
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </section>
  )

  // Read-only (#1093 clears the dead apply wiring): `apply_metatask` requires
  // `status == in_progress`, so a chip on this page would 422 on every tap.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: desktop ? 'var(--space-2xl)' : 'var(--space-xl)' }}>
      {sectionHead(t('detail.metatasks.heading'))}
      <MetaTaskSeal metatasks={praxis.applied_metatasks} />
    </section>
  )

  return (
    <div className="py-8" style={{ position: 'relative' }}>
      {desktop ? breadcrumb : mobileBar}

      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          // The page surface the design puts everything on, carried by the
          // COLUMN rather than the viewport — the site background must still
          // show around the component (WORLD_ZERO_STYLE §5, the #1028 ruling).
          background: 'var(--faction-default-card-bg)',
          color: 'var(--faction-default-card-text)',
          border: '1px solid var(--faction-default-border)',
          borderRadius: 18,
          padding: desktop ? 'var(--space-2xl)' : 'var(--space-lg)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* The spectrum band across the sheet head — the na tell. */}
        <span
          aria-hidden
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: SPECTRUM }}
        />

        {banners}

        <div
          style={{
            display: 'flex',
            flexDirection: desktop ? 'row' : 'column',
            alignItems: 'stretch',
            gap: desktop ? 'var(--space-2xl)' : 'var(--space-xl)',
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            {header}
            {/* Mobile stacks the rail above the proof — one block each, moved,
                never a second copy hidden at the other breakpoint. */}
            {!desktop && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-lg)',
                  marginBottom: 'var(--space-xl)',
                }}
              >
                {rail}
              </div>
            )}
            {proof}
            {writeUp}
            {crew}
            {metatasks}
            {!desktop && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {asideRest}
              </div>
            )}
          </div>

          {desktop && (
            <aside
              style={{
                flex: '0 0 340px',
                width: 340,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-lg)',
              }}
            >
              {rail}
              {asideRest}
            </aside>
          )}
        </div>

        {/* The third layout region (ADR-0061, amending ADR-0006): comments sit
            beneath both columns, inside the page's own sheet, and the layout
            draws the heading so the thread does not draw a second one. */}
        <PraxisDetailComments
          state={state}
          heading={sectionHead(t('detail.sections.comments'))}
          style={{ marginTop: desktop ? 'var(--space-2xl)' : 'var(--space-xl)' }}
        />
      </div>
    </div>
  )
}
