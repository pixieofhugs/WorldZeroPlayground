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
 * Reconciled to the EIGHT faction designs, not to this one (#1117–#1123). Where
 * the Unaffiliated design differs it is the outlier and the eight win — the
 * seven skins inherit this file, so a fact that is wrong here would be worked
 * around seven times.
 *
 * - **Desktop** — breadcrumb, then main column + a 330px aside, then a comments
 *   region beneath both.
 * - **Mobile** — one stacked column (a back link and a centred label instead of
 *   the breadcrumb), with the score and duel blocks moved above the proof.
 * - **Main** — moderation banners · byline · title · owner actions · task
 *   reference · proof · write-up · members · metatasks.
 * - **Aside** — score · duel · vote · voters · flag.
 * - **The crown renders at BOTH form factors.** It is never form-factor gated:
 *   `ScoreStamp` draws it in the score block's corner, keyed only on
 *   `is_top_for_task`, and the score block is in both layouts. #1710 retired
 *   the hero banner it used to arrive in. One design (Everymen) draws
 *   `showCrownMobile: false`; that is the outlier too.
 * - **The report/flag card and the steward bar are NOT skinned.** All eight
 *   faction designs leave them outside the costume, on their own neutral token
 *   set — so `PraxisFlagBlock` / `PraxisAdminBar` are mounted bare here, taking
 *   none of the `panel` dress the score, vote and voters blocks wear, and they
 *   accept no style prop to make skinning them the easy path. Their copy is
 *   neutral and shared for the same reason — ADR-0061: one shared neutral
 *   `detail.*` set; a skin brings dress and no copy.
 *
 * ## One responsive component, no mobile twin (ADR-0056/0058)
 *
 * `useFormFactor()` picks the size set and collapses the split; the dispatcher
 * no longer branches on form factor. Score and duel are built ONCE and moved by
 * where they are mounted — never drawn twice and hidden, which would duplicate
 * the DOM and is what the design doc's twin markup would have produced. Mobile
 * stacks with flow, never a fixed-px grid (SPEC-faction-ui-profile §1a); the
 * 330px aside TRACK is desktop-only, which is a different claim from the crown
 * above — the track disappears on mobile, its contents do not.
 *
 * ## Copy and dress
 *
 * Copy is one neutral shared `detail.*` set (ADR-0061) — no na voice, no faction
 * voice; where the design's word differed from the domain noun in CONTEXT.md the
 * domain noun won ("Members", not "the crew"). THIS page is doubly neutral:
 * `default` ≡ `na` is the unaffiliated identity, so the shared set is already its
 * voice. Every faction skin reads these same keys — an amendment that would have
 * let skins voice the CONTENT slots was written and withdrawn on 2026-07-28. Dress is na's alone: the spectrum
 * via `--faction-default-*` tokens plus `--color-*`, flipping light/dark through
 * the `[data-theme="dark"]` cascade with no `dark ?` branch. The page surface is
 * carried by the COLUMN, not the viewport — the site background still shows
 * around the component (WORLD_ZERO_STYLE §5, the #1028 ruling), which is why
 * there is no `.na-backdrop` full-bleed wash here.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` (mounted by `ScoreStamp`, #1710) · `ScoreStamp`, which since #1091
 * carries the whole score rail — disc, ruled rows and votes tally — so this file
 * only mounts it · `VoteUI`, which dispatches the vote surface on the
 * TASK's faction so an unskinned faction still votes in its own voice ·
 * `CollabRoster` for the members · `MediaGallery` · `MetataskSeal`, read-only:
 * `apply_metatask` requires `in_progress`, so the design's "Available" chips
 * would 422 on every tap (#1093 removed the dead wiring behind them).
 *
 * ## The duel slot
 *
 * `DuelCard` (#1090) — one block, in the aside on desktop and above the proof on
 * mobile, moved by where it is mounted like the score block above it. It is the
 * successor to the dispatcher-mounted `DuelCrossLink` rail and narrates OUTCOMES
 * only: settled, won-by-default, final. A declined challenge draws no card at
 * all, and the run-up belongs to the composer (#1071).
 *
 * ## The `ornament` slot
 *
 * One optional slot, mounted inside the sheet and nowhere else (#1140). It
 * exists because Albescent's praxis detail is a WRAPPER over this file rather
 * than a skin of its own (ADR-0048), and a wrapper cannot reach the sheet from
 * outside: the breadcrumb above it is variable-height, so no fixed inset lands
 * on the sheet's top edge. WORLD_ZERO_STYLE §3 names the remedy — structure a
 * wrapper cannot reach goes through an optional slot on the `Default*`
 * component, never a fork — and this is the praxis-detail twin of
 * `DefaultTaskDetail`'s `worthSlot`.
 *
 * It is ORNAMENT ONLY and deliberately carries no data: it mounts after the
 * spectrum band, inside a sheet that is already `position: relative` with
 * `overflow: hidden` and an 18px radius, so a layer at `inset: 0` is clipped to
 * the COMPONENT and cannot paint the viewport (the #1028 ruling, §5). na passes
 * nothing and is unchanged. A faction that wants its own STRUCTURE writes its
 * own archetype; this slot is not the seam for that.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI, { voteRegionVisible } from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import MetataskSeal from '../../../components/metataskSeal/MetataskSeal'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { DuelCard } from '../DuelCard'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import { factionSheet } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import {
  bylineFaces,
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisDetailComments,
  MemberByline,
  scoreWasBanked,
  taskRefMeta,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import Breadcrumb from "../../../components/nav/Breadcrumb";

/** The na spectrum — the one ornament this whole page is built out of. */
const SPECTRUM = 'var(--faction-default-rainbow)'

/**
 * Who-voted rung geometry (#1143). Ornament, not layout (§10) — these size a
 * drawn mark, and the row span is the ruler the gradient windowing below is
 * measured against, so it has to be a number rather than a --space-* token.
 * Roughly a third of the interactive caster's dots: this is a readout.
 */
const RUNG_DOTS = [1, 2, 3, 4, 5]
const RUNG_DOT = 10
const RUNG_GAP = 5
/** Pitch between dot left edges, and the total width one rainbow covers. */
const RUNG_PITCH = RUNG_DOT + RUNG_GAP
const RUNG_SPAN = (RUNG_DOTS.length - 1) * RUNG_PITCH + RUNG_DOT

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
            background: 'var(--faction-default-card-bg)',
            fontSize: 'var(--text-lg)',
            color: 'var(--faction-default-card-text)',
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
  /** Decorative layers mounted inside the sheet. See "The `ornament` slot". */
  ornament?: ReactNode
}) {
  const { t } = useTranslation('praxis')
  const desktop = useFormFactor() !== 'mobile'
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1`, which hid the whole Members section from a collab
  // nobody had joined yet while the heading still counted them. Tested
  // POSITIVELY: a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === 'collab'
  // The shared banners already draw the roster while a collab is still
  // resolving (`in_progress` / `pending`). The Members section below is the
  // PUBLISHED half of that same fact, so it takes the complement — one roster
  // on the page, never two.
  const rosterInBanners = praxis.status === 'in_progress' || praxis.status === 'pending'

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

  /** Aside / rail panel chrome, shared by score, vote and voters. */
  const panel: CSSProperties = {
    border: '1px solid var(--faction-default-card-line)',
    borderRadius: 12,
    background: 'var(--faction-default-stamp-bg)',
    color: 'var(--faction-default-card-text)',
    padding: 'var(--space-lg)',
  }

  // Navigation is not this skin's any more (#2102). A bespoke trail and a
  // bespoke `mobileBar` that replaced it below 768px both lived here; the
  // shared breadcrumb sits ABOVE this column at every width, on the SITE's
  // ground, where the site's own tertiary is the measured ink.

  // ── Moderation banners ────────────────────────────────────────────────────
  // The failed note (with its `admin_note`) is shared invariant chrome; the
  // crown hero and the in-editing / pending-publish notice are both gone
  // (#1710, ADR-0062). The flagged notice is
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
          <span className="label-caption" style={{ color: 'var(--color-warning)' }}>
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
          {bylineFaces(praxis).map((author, index) => (
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
              color: 'var(--faction-default-card-text)',
              textDecoration: 'none',
            }}
          />
          <div className="label-caption" style={{ color: 'var(--faction-default-card-muted)' }}>
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
        <span className="label-caption" style={{ color: 'var(--faction-default-card-muted)' }}>
          {t('detail.taskRef.label')}
        </span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="font-display italic content-text"
          style={{ color: 'var(--faction-default-card-text)', textDecoration: 'none' }}
        >
          {praxis.task_title}
        </Link>
        <span className="label-caption" style={{ marginLeft: 'auto', color: 'var(--faction-default-card-muted)' }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  )

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's (#1091). `ScoreStamp` carries the
  // struck disc, the ruled leader-line rows and the votes tally — the whole of
  // the design's score rail — dispatched on the task's faction so an unskinned
  // faction still gets its own total mark here. #1088 drew a second strip of
  // rows under the stamp that restated exactly the same terms; it is gone, so
  // card, composer and detail cannot drift apart.
  //
  // The design's own arithmetic is NOT built. It derives a multiplier from the
  // VOTE AVERAGE, calls it the faction multiplier, and prints votes as a count.
  // The model is `(base + meta) × faction_mult + votes` (ADR-0014/0047/0053),
  // resolved once by `scoreBreakdown()` inside the stamp.
  const scoreBlock = !scoreWasBanked(praxis) ? null : (
    <section style={panel}>
      {sectionHead(t('detail.score.heading'))}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* THE PAGE'S ONE MARK, IN THE CORNER (#1710). The stamp's crown was off
            here because a bordered hero panel above already drew one. The panel
            is gone (owner ruling: "just a fleur in the corner"), so the mark
            comes back to the stamp -- still one per page, still ADR-0054's. */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  )

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  //
  // The design's compact duel card (#1090), which replaced `DuelCrossLink` and
  // the twelve rail skins. It self-hides for a praxis with no duel, for a
  // DECLINED challenge — where there is no duel to read out and the praxis
  // scores as an ordinary solo (ADR-0011) — and for the run-up, which the
  // composer's waiting surface owns (#1071/ADR-0059). Panel chrome and section
  // head are handed in, so the card wears this page's dress rather than its own.
  const duelBlock: ReactNode = (
    <DuelCard state={state} style={panel} heading={sectionHead(t('duelCrossLink.label'))} />
  )

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  )

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  // Gated on the ONE predicate `VoteUI` gates ITSELF on (#1429): the plate,
  // its heading and its prompt are the promise of a control, so they may not
  // outlive the control. The author of a praxis can never vote on it, and used
  // to get this section drawn empty.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
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
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  )

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already
  // fetched by `usePraxisDetail`. Each voter's own rung is five dots, the first
  // `value` of them filled and the rest hollow rings — the read-only twin of
  // the caster in `DefaultVote`, minus everything that made that an input
  // (touch targets, hover, glow, the tier caption, the rising-wave bob).
  //
  // THE ROW IS ONE GRADIENT, WINDOWED (#842). A single rainbow is stretched
  // across the whole rung and each dot shows the slice that falls where the dot
  // actually sits — `backgroundSize: <row span>` plus a negative
  // `backgroundPositionX`. Four filled dots therefore read red · orange ·
  // green · teal, not four identical dots and not four little rainbows. A
  // per-dot gradient looks plausible and is the mistake #842 exists about.
  //
  // The dots are the reading, so there is no numeral: `role="img"` plus the
  // value as the accessible name is what carries the figure to a screen reader
  // now that no text node does. NO AVERAGE anywhere (ADR-0014): the standing is
  // the sum and the count, never the mean — and there is no per-voter points
  // figure in the payload, so none is invented.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t('detail.voters.heading'),
        <span className="label-caption" style={{ color: 'var(--faction-default-card-muted)' }}>
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
              role="img"
              aria-label={t('detail.voters.valueAria', { value: voter.value })}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                // ornament: the rung's own pitch, and the ruler the gradient
                // windowing is measured against (§10).
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
                    // One rainbow across the rung, windowed to this dot.
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
        praxisType={praxis.type}
        invites={praxis.invites}
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </section>
  )

  // READ-ONLY, by construction (#1093). `MetataskSeal` omits the peel control
  // and the add slot when it gets neither `removable` nor `onAdd`, and each seal
  // wears its ISSUING faction's dress (#927/#933). The design's "Available"
  // chips are deliberately absent: `apply_metatask` (services/praxis.py)
  // requires `status == in_progress`, so every chip would 422 on tap — and the
  // composer already agrees, gating `canSealMetatask` on `!controlsLocked`.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: desktop ? 'var(--space-2xl)' : 'var(--space-xl)' }}>
      {sectionHead(t('detail.metatasks.heading'))}
      <MetataskSeal metatasks={praxis.applied_metatasks} />
    </section>
  )

  return (
    <div className="py-8" style={{ position: 'relative' }}>
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail at every width - see components/nav/Breadcrumb. */}
      <Breadcrumb
        taskId={praxis.task_id}
        taskTitle={praxis.task_title}
        praxisId={praxis.id}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          // The page surface the design puts everything on, carried by the
          // COLUMN rather than the viewport — the site background must still
          // show around the component (WORLD_ZERO_STYLE §5, the #1028 ruling).
          ...factionSheet(),
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
          className="spectrum-rule"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}
        />

        {/* Ornament only, clipped by this sheet's own overflow (see the slot's
            note in the docstring). Absent for na. */}
        {ornament}

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
                flex: '0 0 330px',
                width: 330,
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
