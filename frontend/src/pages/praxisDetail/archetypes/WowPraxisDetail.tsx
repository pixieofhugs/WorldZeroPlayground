import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI, { voteRegionVisible } from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import { PraxisDetailSkin } from '../praxisDetailSkin'
import {
  bylineFaces,
  PraxisOwnerActions,
  MemberByline,
  taskRefMeta,
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
 * Every ornament comes from `components/factionMarks/wowOrnament.tsx`, the faction's
 * one primitive set (§6/#849) — this file draws no balloon of its own.
 *
 * ## Two WOW rules that are load-bearing, not taste (§3)
 *
 * - **The gilt is theme-invariant.** `--faction-wow-chronicle-gold` is one value
 *   in both themes, because struck metal does not repaint itself when the lights
 *   go out. What flips is the parchment under it. There is no `dark ?` anywhere
 *   in this file; the flip is the `[data-theme="dark"]` cascade's.
 * - **An opponent's faction colour is never an ink and never sits behind text.**
 *   This page still surfaces no opponent accent — the duel is `DuelCard`, which
 *   paints its own two discs and neither is tinted by the rival's faction. What
 *   changed with #1153 is that the rule stopped being VACUOUS here: the card now
 *   takes an `ink` seam, and `name` / `total` / `muted` are `color:` while
 *   `plate` sits directly behind a disc, so a foreign hue is one careless prop
 *   away. Every value this file passes is a WOW token. If a later edit ever
 *   brings a rival's colour onto this page it must arrive as a rosette ring, a
 *   plate edge or a bar. The rail that used to guard this structurally died with
 *   #1090 (see #1115), so nothing will catch a violation automatically.
 *
 * ## The contract this skin does NOT get to re-decide (ADR-0061, #1129)
 *
 * - Desktop is main column + a **330px** aside, comments beneath both; mobile is
 *   one stacked column with score and duel moved above the proof. ONE responsive
 *   component — `useFormFactor()` internally, no mobile twin (ADR-0063). Unlike
 *   ADR-0056/0058, that collapse was NOT taken as a reversible experiment:
 *   #1089 retired the `mobilePraxisDetail` surface outright, so there is no
 *   second registry left to dispatch to and no dormant twin to keep in step.
 * - Score and duel are built ONCE and MOVED by where they are mounted, never
 *   drawn twice and hidden at the other breakpoint.
 * - **The crown renders at both form factors.** It is not form-factor gated: it
 *   comes from `ScoreStamp`'s corner, keyed only on `is_top_for_task`, and the
 *   score block is in both layouts (#1710 retired the hero banner).
 * - The duel panel and the comment thread are SLOTS THIS PAGE OWNS, not
 *   dispatcher mounts (ADR-0064). Nothing is rendered around the archetype any
 *   more, so a skin that forgets one simply loses it.
 * - **The report card and the steward bar are NOT dressed.** `PraxisFlagBlock`
 *   and `PraxisAdminBar` take `state` and nothing else and are mounted bare,
 *   wearing none of the plate chrome the score, vote and voters blocks wear.
 *   That is deliberate in all eight faction designs.
 *
 * ## Copy — none. ADR-0061, unamended
 *
 * EVERY string on this page comes from the shared neutral `detail.*` block.
 * The six words the design names — *The proof · Sworn together by · Charms
 * claimed · Your cheer · The court says · The gallery* — are **recorded on
 * #1121, not built**: the amendment that would have voiced them was written and
 * withdrawn the same day (2026-07-28), and this skin was corrected back. WOW's
 * chronicle is carried entirely by frame, type, ornament and motion.
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
 * `TaskCrown` (mounted by `ScoreStamp`, #1710) · `ScoreStamp`, which since #1091 carries
 * the whole score rail and resolves WOW's own ✦ chronicle stamp · `VoteUI`,
 * which dispatches WOW's googly-balloon verdict and draws its own *"Cast thy
 * Verdict"* prompt · `CollabRoster` · `MediaGallery` · `MetataskSeal`,
 * READ-ONLY (no add-chips: `apply_metatask` requires `in_progress` and would
 * 422) · `DuelCard`, which owns all three duel readings and draws nothing on a
 * declined challenge · `CommentThread` via `PraxisDetailComments`, with the
 * heading suppressed so one list carries one heading (#1029).
 */

/**
 * THE FIVE CORE ROLES ARE ASKED FOR BY NAME (#2674). The parchment field below
 * (`.wow-detail-field`) spreads `factionRoleVars('wow', 'wow-praxis-page')`,
 * and the prefix is declared THERE rather than on the outer wrapper, which also
 * holds the neutral shared `Breadcrumb` above the surface (#2102).
 *
 * Every read carries today's token as its fallback. The names below that are
 * NOT roles stay put: the scribe's hand, the olive label ink measured on BOTH
 * grounds, the gold, the inset and the hairline are this surface's own extras,
 * which decision 07 leaves to the surface.
 */
const MED = 'var(--wow-praxis-page-face)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */
/** The scribe's marginal hand. A SURFACE face (§4), not Coven's card font. */
const HAND = 'var(--font-faction-script)' /* Caveat */

const INK = 'var(--wow-praxis-page-ink)'
/** Metadata ink. 4.52:1 inside a cream plate — NOT legible enough on the field. */
const MUTED = 'var(--wow-praxis-page-quiet)'
/** Label ink, the one measured on BOTH grounds: 5.32:1 on the cream plate and
 *  5.06:1 on the darker parchment field this page lays its headers straight on. */
const LABEL = 'var(--faction-wow-accent-deep)'
/** Plum as INK — this one flips with the theme. 5.11:1 on the field. */
const PLUM = 'var(--wow-praxis-page-accent)'
/** Frame + rule gold. Theme-invariant, and never an ink: 2.24:1 on the cream. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const CARD = 'var(--wow-praxis-page-paper)'
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

/* The aside track is the SKIN's now — 330px, corrected from 340 by #1129
   against the eight designs, and one number rather than eight. A kit overrides
   it only if its own design does; this one does not. */

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
function ChronicleDisc({
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
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%' }}
        />
      ) : (
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
      )}
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

  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1`, which hid the whole Members section from a collab
  // nobody had joined yet while the heading still counted them. Tested
  // POSITIVELY: a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === 'collab'

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

  // Navigation is not this skin's any more (#2102). The trail sat INSIDE the
  // parchment field so its accent could be measured on the faction's own ground,
  // and a bespoke `mobileBar` replaced it below 768px. Both are gone: a
  // breadcrumb is neutral SITE chrome, so it moved ABOVE this column, where
  // the site's own tertiary is the ink and the faction reading no longer
  // applies.

  // ── Moderation banners — NOT dressed (ADR-0061) ───────────────────────────
  //
  // The failed note and the flagged notice both come from the shared
  // `PraxisStatusBanners` on its own neutral `--color-*` tokens — the crown hero
  // went with #1710 and the mark is the score stamp's corner fleur now. The
  // notice used to be re-typed here for want of a slot; #2718 gave it one, and
  // this page names no ink for it, so it reads in the SAME neutral vocabulary
  // rather than in gold and plum. The steward bar below is `PraxisAdminBar`,
  // equally bare. Every word of all three is the shared neutral block: this is
  // the platform speaking, not the faction. All three are MOUNTED from the
  // shared layer too since #2718; this kit passes neither ink knob.

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
          {bylineFaces(praxis).map((author, index) => (
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
              <ChronicleDisc
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={size.disc}
              />
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
          {taskRefMeta(praxis, t)}
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
  //
  // Handed to the skin unconditionally — `scoreWasBanked` is the shared gate.
  const scoreBlock = (
    <section style={panel}>
      {panelHead('score', t('detail.score.heading'))}
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
  // Outcomes only. `DuelCard` self-hides for a praxis with no duel, for a
  // DECLINED challenge, and for the run-up the composer's waiting surface owns
  // (#1071/ADR-0059). Plate chrome, section head AND inks are handed in, so the
  // card wears the chronicle's dress rather than its own.
  //
  // THE OPPONENT-ACCENT RULE BINDS HERE (#1153, and read the header's second
  // bullet). `ink` is the first seam on this page that could carry a foreign
  // hue into `color:`, and it must not: the rival's faction colour may be any
  // hue in the palette, so it is held as a rosette ring, a plate edge or a bar,
  // never as an ink and never behind text. Every value below is a WOW token off
  // this plate — `card-text` on names and totals, `card-muted` on the cross-link
  // and the verdict, the chronicle rule on the hairlines, the media inset behind
  // an avatarless disc. The gilt is absent by the same standing rule: it
  // measures 2.24:1 on the cream and nothing legible is painted in it.
  const duelInk = { name: INK, total: INK, muted: MUTED, line: HAIR, plate: INSET }

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  //
  // "Your cheer" is WOW's word for the slot; the widget under it is WOW's own
  // googly-balloon verdict, dispatched on the TASK's faction so a foreign task's
  // praxis still votes in that task's voice (ADR-0039). The widget draws its own
  // "Cast thy Verdict" line, so the gloss here is the shared neutral prompt in
  // the scribe's hand rather than a second archaic call.
  // Gated on the ONE predicate `VoteUI` gates ITSELF on (#1429): the plate,
  // its heading and its prompt are the promise of a control, so they may not
  // outlive the control. The author of a praxis can never vote on it, and used
  // to get this section drawn empty.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {panelHead('vote', t('detail.vote.heading'))}
      <p
        className="content-text"
        style={{ ...MARGINALIA, margin: '0 0 var(--space-md)', color: MUTED }}
      >
        {t('detail.vote.prompt')}
      </p>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
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
        t('detail.voters.heading'),
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
  // That is the ADR-0061 rule and all eight faction designs draw it, so it is
  // mounted bare beside plates it deliberately does not match. The skin mounts
  // it, last in the aside, after the vote and voters plates.

  // ── Proof · write-up · members ────────────────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('proof', t('detail.sections.proof'))}
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
      {sectionHead('crew', t('detail.sections.members'))}
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

  // The charms section is the SKIN's now — every archetype drew the same
  // `<section>` + `MetataskSeal` pair. READ-ONLY, by construction (#1093): the
  // seal omits the peel control and the add slot when it gets neither
  // `removable` nor `onAdd`, and each seal wears its ISSUING faction's dress
  // (#927/#933). No "available" chips — `apply_metatask` requires
  // `status == in_progress`, so every one would 422.

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: 'relative' },
        /* The parchment field with its dot texture (index.css), painting the
           detail COLUMN and not the viewport — the site background still shows
           around the component (WORLD_ZERO_STYLE §5, the #1028 ruling). */
        sheetClassName: 'wow-detail-field',
        sheetStyle: {
          ...factionRoleVars('wow', 'wow-praxis-page'),
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          borderRadius: 18,
          padding: size.pagePad,
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: 'var(--faction-wow-detail-shadow)',
        },
        sheetPrelude: <Bunting style={{ marginBottom: size.buntingGap }} />,
        header,
        score: scoreBlock,
        duelPanel: panel,
        duelHeading: panelHead('duel', t('duelCrossLink.label')),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead('charms', t('detail.metatasks.heading')),
        /* The bunch bobs beside THE GALLERY — the page's crowd, and its one
           bobbing ornament. */
        commentsHeading: sectionHead(
          'gallery',
          t('detail.sections.comments'),
          <BalloonBunch size={34} />,
        ),
        sectionGap: size.sectionGap,
      }}
    />
  )
}
