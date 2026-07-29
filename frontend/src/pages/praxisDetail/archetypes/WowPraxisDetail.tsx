import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { BalloonBunch, Bunting, Zig } from '../../../components/cards/wowOrnament'
import { DuelCard } from '../DuelCard'
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

/**
 * Warriors of Whimsy — THE CHRONICLE ENTRY, WOW's praxis-detail skin (#1121,
 * epic #1085; design `Warrior of Whimsy Praxis Detail.dc.html`, project
 * bebdf7c7).
 *
 * A quest is ISSUED by decree and proof is RECORDED in the chronicle (ADR-0050,
 * #899). `WowTaskDetail` is the parchment FIELD a decree is posted on; this is
 * the page of the chronicle that field's proof is written into — the same
 * parchment ground, the same gold-framed plates, but the volume is now open at
 * somebody's entry rather than at a call to arms.
 *
 * This also closes one of the four bullets in **#951**: WOW fell through to the
 * generic `DefaultPraxisDetail` on this surface, and the owner ruling
 * (2026-07-23) is that a faction missing a custom experience is a design bug.
 * `factionCard` and `factionBody` stay open there.
 *
 * ## The dress
 *
 * Bunting strung across the head, the parchment field under its fine dot
 * texture, cream plates in 2px gold frames, wavy gold→plum rules running out of
 * every section head, and one bunch of googly balloons bobbing beside THE
 * GALLERY — the page's crowd, and its one bobbing ornament. Three faces, which
 * is the design's own set: **MedievalSharp** for display and labels,
 * **Lora italic** for the quiet register and the write-up, and **Caveat** for
 * the marginalia — the scribe's hand annotating the entry (the filed line, the
 * vote's gloss, the court's tally). Caveat arrives as the shared surface token
 * `--font-faction-script`, NOT as `--faction-coven-card-font`: a face can belong
 * to a surface rather than to a faction (§4), and repointing Coven's card font
 * from here would restyle a dozen Coven surfaces by accident.
 *
 * Every ornament comes from `components/cards/wowOrnament.tsx`, the faction's
 * one primitive set (§6/#849) — this file draws no balloon of its own.
 *
 * ## Two WOW rules that are load-bearing, not taste (§3)
 *
 * - **The gilt is theme-invariant.** `--faction-wow-chronicle-gold` is one value
 *   in both themes, because struck metal does not repaint itself when the lights
 *   go out. What flips is the parchment under it. There is no `dark ?` anywhere
 *   in this file; the flip is the `[data-theme="dark"]` cascade's.
 * - **An opponent's faction colour is never an ink and never sits behind text.**
 *   This page surfaces no opponent accent at all — the duel is `DuelCard`, which
 *   paints its own two discs and neither is tinted by the rival's faction. So
 *   the rule is honoured vacuously here; if a later edit ever brings a foreign
 *   hue onto this page it must arrive as a rosette ring, a plate edge or a bar.
 *   The rail that used to guard this structurally died with #1090 (see #1115),
 *   so nothing will catch a violation automatically.
 *
 * ## The contract this skin does NOT get to re-decide (ADR-0061, #1129)
 *
 * - Desktop is main column + a **330px** aside, comments beneath both; mobile is
 *   one stacked column with score and duel moved above the proof. ONE responsive
 *   component — `useFormFactor()` internally, no mobile twin: #1089 deleted the
 *   `mobilePraxisDetail` surface outright on ADR-0056 / ADR-0058 terms, so there
 *   is no second registry left to dispatch to.
 * - Score and duel are built ONCE and MOVED by where they are mounted, never
 *   drawn twice and hidden at the other breakpoint.
 * - **The crown renders at both form factors.** It is not form-factor gated: it
 *   comes from the shared `PraxisStatusBanners`, keyed only on
 *   `is_top_for_task`.
 * - **The report card and the steward bar are NOT dressed.** `PraxisFlagBlock`
 *   and `PraxisAdminBar` take `state` and nothing else and are mounted bare,
 *   wearing none of the plate chrome the score, vote and voters blocks wear.
 *   That is deliberate in all eight faction designs and it is the amended
 *   ADR-0061 rule: content slots carry the faction's voice, moderation and
 *   system chrome do not.
 *
 * ## Copy (ADR-0061 as amended, 2026-07-28)
 *
 * The six content slots the design names take WOW's voice from `detail.wow.*` —
 * *The proof · Sworn together by · Charms claimed · Your cheer · The court
 * says · The gallery*. Everything else reads the shared neutral `detail.*`
 * block: the breadcrumb, the write-up head, the task reference, the score head,
 * the duel head, and every word of the banners, the steward bar, the report card
 * and the errors.
 *
 * The design's seventh string — the comment composer's **"proclaim"** — is
 * already shipped, and not by this page: it is `comments.wow.post`, read by
 * `WowComment`, which dispatches on the **commenter's** faction rather than the
 * page's. ADR-0061 draws that boundary explicitly (the neutral rule stops at the
 * speaker's voice), so a WOW member proclaims on any page and a visiting Coven
 * member still posts on this one. Nothing to add here.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` (via the shared banners) · `ScoreStamp`, which since #1091 carries
 * the whole score rail and resolves WOW's own ✦ chronicle stamp · `VoteUI`,
 * which dispatches WOW's googly-balloon verdict and draws its own *"Cast thy
 * Verdict"* prompt · `CollabRoster` · `MediaGallery` · `MetaTaskSeal`,
 * READ-ONLY (no add-chips: `apply_metatask` requires `in_progress` and would
 * 422) · `DuelCard`, which owns all three duel readings and draws nothing on a
 * declined challenge · `CommentThread` via `PraxisDetailComments`, with the
 * heading suppressed so one list carries one heading (#1029).
 */

const MED = 'var(--faction-wow-card-font)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */
/** The scribe's marginal hand. A SURFACE face (§4), not Coven's card font. */
const HAND = 'var(--font-faction-script)' /* Caveat */

const INK = 'var(--faction-wow-card-text)'
/** Metadata ink. 4.52:1 inside a cream plate — NOT legible enough on the field. */
const MUTED = 'var(--faction-wow-card-muted)'
/** Label ink, the one measured on BOTH grounds: 5.32:1 on the cream plate and
 *  5.06:1 on the darker parchment field this page lays its headers straight on. */
const LABEL = 'var(--faction-wow-accent-deep)'
/** Plum as INK — this one flips with the theme. 5.11:1 on the field. */
const PLUM = 'var(--faction-wow-card-accent)'
/** Frame + rule gold. Theme-invariant, and never an ink: 2.24:1 on the cream. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const CARD = 'var(--faction-wow-card-bg)'
const INSET = 'var(--faction-wow-detail-inset)'
const HAIR = 'var(--faction-wow-chronicle-rule)'

/** The gold→plum bar a voter's rung is filled with. A FILL, never an ink. */
const RUNG = `linear-gradient(90deg, ${GOLD}, var(--faction-wow-plum-surface))`

interface SizeSet {
  title: string
  byline: string
  /** Main-column section heads, on the field. */
  sectionHead: string
  /** Aside/panel heads — a tier down, because a 330px plate is not 32px wide. */
  panelHead: string
  disc: number
  pagePad: string
  panelPad: string
  sectionGap: string
  buntingGap: string
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: {
    title: 'var(--text-display)',
    byline: 'var(--text-title)',
    sectionHead: 'var(--text-heading)',
    panelHead: 'var(--text-title)',
    disc: 44,
    pagePad: 'var(--space-2xl)',
    panelPad: 'var(--space-lg)',
    sectionGap: 'var(--space-2xl)',
    buntingGap: 'var(--space-xl)',
  },
  mobile: {
    title: 'var(--text-heading)',
    byline: 'var(--text-content)',
    sectionHead: 'var(--text-title)',
    panelHead: 'var(--text-title)',
    disc: 38,
    pagePad: 'var(--space-lg)',
    panelPad: 'var(--space-lg)',
    sectionGap: 'var(--space-xl)',
    buntingGap: 'var(--space-lg)',
  },
}

/** The aside track. 330px, corrected from 340 by #1129 against the eight designs. */
const ASIDE_TRACK = 330

/** The chronicle's label voice — MedievalSharp small caps. */
const EYEBROW: CSSProperties = {
  fontFamily: MED,
  fontSize: 'var(--text-base)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
}

/** Lora italic, the faction's quiet register. */
const QUIET: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  lineHeight: 1.55,
}

/** Caveat — a note in the margin of the entry, never set text. */
const MARGINALIA: CSSProperties = {
  fontFamily: HAND,
  lineHeight: 1.35,
}

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
 * One member's disc, set in the faction's gilt rope ring. Collab bylines stack
 * these, overlapping, so a shared entry reads as shared before a single name is
 * parsed — the same move the Unaffiliated page makes with its spectrum ring,
 * wearing WOW's coin mount instead.
 */
function ChronicleDisc({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 'var(--space-xs)',
        background: 'var(--faction-wow-avatar-ring)',
        flexShrink: 0,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'var(--faction-wow-avatar-field)',
          fontFamily: MED,
          fontSize: 'var(--text-lg)',
          color: PLUM,
        }}
      >
        {initials(name)}
      </span>
    </span>
  )
}

export default function WowPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const desktop = useFormFactor() !== 'mobile'
  const size = SIZES[desktop ? 'desktop' : 'mobile']
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  const members = orderedMembers(praxis)
  const isCollab = members.length > 1

  /** A cream plate in a gold frame — the chronicle's one container. */
  const plate: CSSProperties = {
    background: CARD,
    border: `2px solid ${GOLD}`,
    borderRadius: 10,
    boxSizing: 'border-box',
    boxShadow: 'var(--faction-wow-detail-shadow)',
    color: INK,
  }

  /** The same plate, with the aside's padding already on it. */
  const panel: CSSProperties = { ...plate, padding: size.panelPad }

  /**
   * MedievalSharp label, a wavy gold→plum rule running out of it, an optional
   * gloss or ornament riding the end.
   */
  const head = (
    id: string,
    label: ReactNode,
    fontSize: string,
    trailing?: ReactNode,
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontFamily: MED, fontSize, lineHeight: 1.08, color: INK }}>{label}</span>
      <Zig id={id} style={{ flex: 1 }} />
      {trailing}
    </div>
  )

  const sectionHead = (id: string, label: ReactNode, trailing?: ReactNode) =>
    head(id, label, size.sectionHead, trailing)
  const panelHead = (id: string, label: ReactNode, trailing?: ReactNode) =>
    head(id, label, size.panelHead, trailing)

  // ── Navigation: breadcrumb on desktop, back link + label on mobile ─────────
  //
  // Both sit INSIDE the parchment field rather than above it, which is where
  // every WOW page puts them: plum ink is measured on the field (5.11:1) and not
  // on whatever page ground the site background happens to be showing.
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
      <Link to="/tasks" style={{ ...EYEBROW, color: PLUM, textDecoration: 'none' }}>
        {t('detail.breadcrumb.tasks')}
      </Link>
      <span aria-hidden style={{ ...EYEBROW, color: LABEL }}>
        /
      </span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        style={{ ...EYEBROW, color: PLUM, textDecoration: 'none' }}
      >
        {praxis.task_title}
      </Link>
      <span aria-hidden style={{ ...EYEBROW, color: LABEL }}>
        /
      </span>
      <span style={{ ...EYEBROW, color: LABEL }}>{t('detail.breadcrumb.current')}</span>
    </nav>
  )

  // The phone affordance drawn instead of the breadcrumb. Not sticky: the mobile
  // shell already owns a sticky top bar, and a second stacked under it is a
  // dress decision, not a layout one.
  const mobileBar = (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
      }}
    >
      <Link to="/praxes" style={{ ...EYEBROW, color: PLUM, textDecoration: 'none' }}>
        <span aria-hidden>‹ </span>
        {t('detail.back')}
      </Link>
      <span style={{ ...EYEBROW, color: LABEL, flex: 1, textAlign: 'center' }}>
        {t('detail.breadcrumb.current')}
      </span>
      {/* Balances the centred label against the back link's width. */}
      <span aria-hidden style={{ width: 44 }} />
    </nav>
  )

  // ── Moderation banners — NOT dressed (ADR-0061 as amended) ────────────────
  //
  // The crown hero and the failed note come from the shared `PraxisStatusBanners`
  // on their own neutral `--color-*` tokens; the flagged notice has no shared
  // slot, so it renders here in the SAME neutral vocabulary rather than in gold
  // and plum. The steward bar below is `PraxisAdminBar`, equally bare. Every
  // word of all three is the shared neutral block: this is the platform
  // speaking, not the faction.
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
          <span
            className="font-body content-text"
            style={{ color: 'var(--color-text-secondary)' }}
          >
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
        {/* Stacked discs, one per member. A payload with no member rows still
            credits its creator, so the author is always reachable from here. */}
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
                // Each disc after the first laps the one before it — a spacing
                // step off the scale, negated, not a loose pixel.
                marginLeft: index === 0 ? 0 : 'calc(-1 * var(--space-lg))',
                zIndex: index,
              }}
            >
              <ChronicleDisc name={author.name} size={size.disc} />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: MED,
              fontSize: size.byline,
              color: INK,
              textDecoration: 'none',
            }}
          />
          {/* The scribe's hand: when the entry was set down. */}
          <div style={{ ...MARGINALIA, fontSize: 'var(--text-xl)', color: LABEL }}>
            {t('detail.filed', {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: MED,
          fontWeight: 400,
          fontSize: size.title,
          lineHeight: 1.08,
          margin: '0 0 var(--space-md)',
          color: INK,
          overflowWrap: 'anywhere',
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference — what this entry is a record OF. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          borderTop: `1px solid ${HAIR}`,
          borderBottom: `1px solid ${HAIR}`,
          padding: 'var(--space-md) 0',
          marginBottom: size.sectionGap,
        }}
      >
        <span style={{ ...EYEBROW, color: LABEL }}>{t('detail.taskRef.label')}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ ...QUIET, color: INK, textDecoration: 'none' }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...EYEBROW, color: LABEL, marginLeft: 'auto' }}>
          {t('detail.taskRef.level', { level: praxis.task_level_required })}
          {' · '}
          {t('detail.taskRef.points', { points: praxis.task_point_value })}
        </span>
      </div>
    </>
  )

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's (#1091). `ScoreStamp` carries the
  // struck disc, the ruled rows and the votes tally, dispatched on the task's
  // faction — so a WOW task gets WOW's own ✦ chronicle stamp here, and a WOW
  // member reading a foreign task's praxis on this page still sees that task's
  // stamp. The arithmetic is `scoreBreakdown()`'s alone (ADR-0053); this file
  // adds no second strip restating the same terms.
  const scoreBlock = (
    <section style={panel}>
      {panelHead('score', t('detail.score.heading'))}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* The crown already has its own hero banner above; one mark per page. */}
        <ScoreStamp praxis={praxis} showCrown={false} />
      </div>
    </section>
  )

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  //
  // Outcomes only. `DuelCard` self-hides for a praxis with no duel, for a
  // DECLINED challenge, and for the run-up the composer's waiting surface owns
  // (#1071/ADR-0059). Plate chrome and section head are handed in, so the card
  // wears the chronicle's dress rather than its own.
  const duelBlock: ReactNode = (
    <DuelCard state={state} style={panel} heading={panelHead('duel', t('duelCrossLink.label'))} />
  )

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  )

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  //
  // "Your cheer" is WOW's word for the slot; the widget under it is WOW's own
  // googly-balloon verdict, dispatched on the TASK's faction so a foreign task's
  // praxis still votes in that task's voice (ADR-0039). The widget draws its own
  // "Cast thy Verdict" line, so the gloss here is the shared neutral prompt in
  // the scribe's hand rather than a second archaic call.
  const voteBlock = (
    <section style={panel}>
      {panelHead('vote', t('detail.wow.vote'))}
      <p
        className="content-text"
        style={{ ...MARGINALIA, margin: '0 0 var(--space-md)', color: MUTED }}
      >
        {t('detail.vote.prompt')}
      </p>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  )

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already
  // fetched by `usePraxisDetail`. Each voter's rung is a gold→plum bar
  // (value / 5) — a FILL, which is the only way this palette is allowed to carry
  // a scale. NO AVERAGE anywhere (ADR-0014): the standing is the sum and the
  // count, never the mean, and there is no per-voter points figure in the
  // payload so none is invented.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {panelHead(
        'voters',
        t('detail.wow.voters'),
        <span style={{ ...MARGINALIA, fontSize: 'var(--text-xl)', color: MUTED }}>
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
              className="content-text"
              style={{
                ...QUIET,
                flex: '1 1 auto',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: INK,
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
                background: HAIR,
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
                  background: RUNG,
                }}
              />
            </span>
            <span
              style={{
                fontFamily: MED,
                width: 20,
                textAlign: 'right',
                fontSize: 'var(--text-content)',
                color: INK,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )

  // The report card wears NO chronicle dress: `PraxisFlagBlock` takes `state`
  // and nothing else, on its own neutral `.sidebar-card` + `--color-*` tokens.
  // That is the amended ADR-0061 rule and all eight faction designs draw it, so
  // it is mounted bare beside plates it deliberately does not match.
  const asideRest = (
    <>
      {voteBlock}
      {votersBlock}
      <PraxisFlagBlock state={state} />
    </>
  )

  // ── Proof · write-up · members · charms ───────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('proof', t('detail.wow.proof'))}
      <div style={{ ...plate, padding: 'var(--space-md)' }}>
        <div
          style={{
            background: INSET,
            border: `1.5px solid ${HAIR}`,
            borderRadius: 8,
            padding: 'var(--space-sm)',
          }}
        >
          <MediaGallery media={praxis.media_items} layout={desktop ? 'grid' : 'column'} />
        </div>
      </div>
    </section>
  )

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('writeup', t('detail.sections.writeUp'))}
      <div style={{ ...plate, padding: size.panelPad }}>
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ ...QUIET, lineHeight: 1.75, color: INK }}
        />
        <Zig id="writeup-foot" style={{ marginTop: 'var(--space-lg)' }} />
      </div>
    </section>
  )

  // No status complement here. `DefaultPraxisDetail` suppresses this section
  // while the shared banners draw their own roster — but #1089 deleted that
  // roster (it was gated to `in_progress` / `pending`, which ADR-0062 redirects
  // to the composer), so on a page this renders on there is exactly one roster
  // and it is this one.
  const crew = isCollab && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('crew', t('detail.wow.members'))}
      <CollabRoster
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </section>
  )

  // READ-ONLY, by construction (#1093). `MetaTaskSeal` omits the peel control
  // and the add slot when it gets neither `removable` nor `onAdd`, and each seal
  // wears its ISSUING faction's dress (#927/#933). No "available" chips:
  // `apply_metatask` requires `status == in_progress`, so every one would 422.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('charms', t('detail.wow.metatasks'))}
      <MetaTaskSeal metatasks={praxis.applied_metatasks} />
    </section>
  )

  return (
    <div className="py-8" style={{ position: 'relative' }}>
      {/* The parchment field with its dot texture (index.css), painting the
          detail COLUMN and not the viewport — the site background still shows
          around the component (WORLD_ZERO_STYLE §5, the #1028 ruling). */}
      <div
        className="wow-detail-field"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          borderRadius: 18,
          padding: size.pagePad,
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: 'var(--faction-wow-detail-shadow)',
        }}
      >
        <Bunting style={{ marginBottom: size.buntingGap }} />

        {desktop ? breadcrumb : mobileBar}

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
            {/* Mobile stacks the rail above the proof — one block each, MOVED,
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
                flex: `0 0 ${ASIDE_TRACK}px`,
                width: ASIDE_TRACK,
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
            beneath both columns, inside the page's own field, and the layout
            draws the heading so the thread does not draw a second one. The
            bunch bobs beside THE GALLERY — the page's crowd, and its one
            bobbing ornament. */}
        <PraxisDetailComments
          state={state}
          heading={sectionHead(
            'gallery',
            t('detail.wow.comments'),
            <BalloonBunch size={34} />,
          )}
          style={{ marginTop: size.sectionGap }}
        />
      </div>
    </div>
  )
}
