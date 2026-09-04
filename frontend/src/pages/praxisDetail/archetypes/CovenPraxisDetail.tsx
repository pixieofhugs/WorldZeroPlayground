/**
 * Cozy Coven — THE CANDLELIT WARD, praxis detail (#1117, epic #1085; design
 * project bebdf7c7, `Coven Praxis Detail.dc.html`).
 *
 * The first faction skin over the shared praxis-detail layout. It is the same
 * page `DefaultPraxisDetail` draws — same regions, same slots, same API
 * contract (ADR-0061) — wearing the ward the task detail (#1031) and the spell
 * slip (#1023) already established for this faction: a cat watermark turning
 * behind the copy, braided thread rules heading every section, and a candle
 * flicker under the score. Grenze Gotisch carries the display, Cormorant
 * Garamond the reading voice, Caveat the hand, Quicksand the chrome.
 *
 * THE COLUMN WEARS THE SLIP (#2135), where it wore the candlelight haze and its
 * four drifting blooms. Owner ruling, 2026-08-17: the task card's sheet is the
 * iconic coven look and the surfaces around it should wear it. The panels on top
 * stay `ward-card` — dark panels on a pink sheet is the intended reading, and it
 * is the shape the praxis CARD already had.
 *
 * ## Nothing here is new dress
 *
 * Every colour is a shipped `--faction-coven-slip-*` / `--faction-coven-ward-*`
 * token, and the three motions left (`.cvn-candle`, `.cvn-wheel`, `.cvn-braid`)
 * are index.css rules this file only names — `cvn-haze` went with the wash it
 * drifted (#2135). So the light/dark flip and the `prefers-reduced-motion` guard
 * run through the cascade, never a `dark ?` branch and never an inline
 * `animation:` that would bypass the guard. **This skin adds no CSS at all** —
 * the inks it paints on the sheet are the three the task card already measured
 * on it (`factionContrast.test.ts`), and the panel is unchanged from #1031.
 *
 * ## The layout contract, inherited not re-derived (#1129)
 *
 * - Desktop: main column + a **330px** aside, comments beneath both.
 * - Mobile: one stacked column; the score and duel blocks move ABOVE the proof.
 *   ONE responsive component (ADR-0063) — `useFormFactor()` picks the size set;
 *   there is no mobile twin, and no block is drawn twice and hidden.
 * - The crown renders at **both** form factors. It is not this file's decision:
 *   `ScoreStamp` draws it off `is_top_for_task` in the score block's corner,
 *   and that block is in both layouts (#1710 retired the hero banner above).
 * - The **report card and the steward bar are NOT dressed** (ADR-0061).
 *   `PraxisFlagBlock` / `PraxisAdminBar` are mounted bare, wearing none of the
 *   panel dress every block beside them wears, and they take no style prop to
 *   make dressing them possible.
 *
 * ## No voice — dress only
 *
 * EVERY string on this page comes from the shared neutral `detail.*` block
 * (ADR-0061). The design's words for the write-up, crew, metatasks, duel and
 * comments — and its "post" button — are **recorded on #1117, not built**: the
 * amendment that would have voiced them was written and withdrawn the same day
 * (2026-07-28), and the four skins that had already merged against it were
 * corrected back. What Coven brings here is frame, type, ornament and motion.
 *
 * The comment ROWS are a different question and are untouched: they dispatch on
 * the comment author's faction, not the page's — a Snide player commenting here
 * reads Snide — and ADR-0061 puts `comments.*` and the seven `*Comment` skins
 * explicitly out of scope.
 *
 * ## Reused, not rebuilt
 *
 * `ScoreStamp`, which since #1091 carries the whole score rail and dispatches to
 * `CovenScoreStamp` on a Coven task · `VoteUI`, which resolves this faction's
 * own `CovenVote` (the design's `WowVote` import is a bug) and additionally owns
 * the `viewer_can_vote` gate and the `VoteFactionContext` the logged-out gate
 * reads, neither of which the widget carries itself · `CollabRoster` ·
 * `MediaGallery` · `MetataskSeal`, read-only: `apply_metatask` requires
 * `in_progress`, so an add chip would 422 on a published praxis · `DuelCard`,
 * which narrates all three readings (live / won by default / final) and draws
 * nothing on a declined challenge — the design draws only the live one, and is
 * not re-narrated here · `CommentThread` via `PraxisDetailComments` with the
 * layout's own heading, so one list carries one heading (the #1029 trap).
 *
 * The duel card and the comment thread are LAYOUT SLOTS of this page rather than
 * chrome the dispatcher appends (ADR-0064) — which is why a skin mounts them at
 * all, and why both take this file's panel and section head.
 *
 * The score ARITHMETIC is not built either: the design invents its own, and
 * `scoreBreakdown()` (ADR-0053) is the single authority the mounted stamp reads.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI, { voteRegionVisible } from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { CovenCat, SLIP_SHEET } from '../../../components/factionMarks/covenSlip'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import { mediaUrl } from '../../../utils/media'
import { PraxisDetailSkin } from '../praxisDetailSkin'
import {
  bylineFaces,
  PraxisOwnerActions,
  MemberByline,
  taskRefMeta,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

/* The four faces, exactly as the spell slip and the ward page name them. */
const CHROME = 'var(--font-faction-rounded)' /* Quicksand */
const READING = 'var(--font-faction-serif)' /* Cormorant Garamond */
const HAND = 'var(--font-faction-script)' /* Caveat */
const DISPLAY = 'var(--font-faction-witch)' /* Grenze Gotisch */

const INK = 'var(--faction-coven-slip-ink)'
const DEEP = 'var(--faction-coven-slip-deep)'
const SOFT = 'var(--faction-coven-slip-soft)'
const LABEL = 'var(--faction-coven-slip-label)'
const GOLD = 'var(--faction-coven-slip-gold)'
const PINK = 'var(--faction-coven-slip-pk)'
const BORDER = 'var(--faction-coven-slip-border)'
const CARD = 'var(--faction-coven-ward-card)'
const PAGE = 'var(--faction-coven-ward-page)'

/* The aside track is the SKIN's now — 330px from the eight faction designs
   (#1129). Layout, not dress, and one number rather than eight. */

interface SizeSet {
  /** The byline's ringed disc. Ornament geometry (WORLD_ZERO_STYLE §4a). */
  disc: number
  /**
   * The turning cat watermark. Ornament geometry.
   *
   * It shrank with #2041: the pentacle was 620/420 with a quarter of it hung
   * off the right edge, and a face may not be cropped that way. These are the
   * sizes that sit wholly on the sheet — mobile's 240 + a 24px inset clears a
   * 320px viewport, where 420 could not.
   */
  wheel: number
  titleSize: string
  headingSize: string
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: {
    disc: 46,
    wheel: 400,
    titleSize: 'var(--text-display)',
    headingSize: 'var(--text-title)',
  },
  mobile: {
    disc: 38,
    wheel: 240,
    titleSize: 'var(--text-heading)',
    headingSize: 'var(--text-title)',
  },
}

/** Small-caps caption voice — every label on the ward speaks in it. */
const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: LABEL,
}

/** The braided thread rule. `.cvn-braid` owns the strands' pigments (index.css). */
function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />
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
 * One member's disc: a pink ring round a candle-lit field, the initials
 * hand-lettered inside. Collab bylines stack these, overlapping, so a shared
 * praxis reads as shared before a single name is parsed.
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
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        // Ring-stroke inset: the padding IS the drawn band (WORLD_ZERO_STYLE §4a).
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the drawn ring's stroke width.
        padding: 2,
        background: `linear-gradient(150deg, ${PINK}, ${GOLD})`,
        flexShrink: 0,
        boxShadow: '0 3px 10px var(--faction-coven-slip-glow)',
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
            background: CARD,
            fontFamily: HAND,
            fontSize: 'var(--text-content)',
            fontWeight: 700,
            color: DEEP,
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

export default function CovenPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const formFactor = useFormFactor()
  const desktop = formFactor !== 'mobile'
  const size = SIZES[formFactor]
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1`, which hid the whole Members section from a collab
  // nobody had joined yet while the heading still counted them. Tested
  // POSITIVELY: a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === 'collab'

  /** Display label, braided rule, optional gloss — the page's only section head. */
  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: size.headingSize,
          lineHeight: 1.06,
          letterSpacing: '0.02em',
          color: INK,
        }}
      >
        {label}
      </span>
      <Braid style={{ flex: 1 }} />
      {gloss !== undefined && <span style={{ ...CAPTION, flex: '0 0 auto' }}>{gloss}</span>}
    </div>
  )

  /** Aside / rail panel chrome — paper laid on the wash, shared by every block. */
  const panel: CSSProperties = {
    background: CARD,
    border: `2px solid ${BORDER}`,
    borderRadius: 16,
    boxSizing: 'border-box',
    boxShadow: 'var(--faction-coven-slip-shadow)',
    padding: 'var(--space-lg)',
  }

  const sectionGap = desktop ? 'var(--space-2xl)' : 'var(--space-xl)'

  // Navigation is not this skin's any more (#2102). A `crumbLink` measured INK
  // against the ward page (#1295) dressed a bespoke trail here, and a bespoke
  // `mobileBar` replaced it below 768px; both are gone. The shared breadcrumb
  // sits ABOVE this column on the SITE's ground, where the site's own tertiary
  // is the measured ink and no faction reading applies.

  // ── Moderation banners — NEUTRAL, in Coven's dress (ADR-0061) ───
  // The failed note and the flagged notice are both the shared banner — the
  // crown hero that used to lead it went with #1710, and the mark is the score
  // stamp's corner fleur now. The notice was re-typed here until #2718 gave it
  // a slot; this page names no ink for it, so it keeps the same `--color-*`
  // warning tokens `DefaultPraxisDetail` uses, deliberately not the ward's
  // pinks. `PraxisAdminBar` is the steward bar, mounted bare for the same
  // reason as the report card. All three are MOUNTED from the shared layer too
  // since #2718; this kit passes neither ink knob.

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
            credits its creator, so the author is always reachable here. */}
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
              <MemberDisc
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
              fontFamily: READING,
              fontWeight: 600,
              fontSize: desktop ? 'var(--text-title)' : 'var(--text-content)',
              color: INK,
              textDecoration: 'none',
            }}
          />
          <div style={CAPTION}>
            {t('detail.filed', {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: size.titleSize,
          lineHeight: 1.04,
          margin: '0 0 var(--space-md)',
          color: INK,
          overflowWrap: 'anywhere',
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference — what this praxis is a doing OF. Braid above and below,
          the ward's version of a ruled band. */}
      <div style={{ marginBottom: sectionGap }}>
        <Braid />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
            padding: 'var(--space-md) 0',
          }}
        >
          <span style={CAPTION}>{t('detail.taskRef.label')}</span>
          {/* INK for the same reason the crumbs take it (#1295): this band is
              braid-ruled but unpanelled, so the link sits on the ward PAGE. */}
          <Link
            to={`/tasks/${praxis.task_id}`}
            className="content-text"
            style={{ fontFamily: READING, fontWeight: 600, color: INK, textDecoration: 'none' }}
          >
            {praxis.task_title}
          </Link>
          <span style={{ ...CAPTION, marginLeft: 'auto' }}>
            {taskRefMeta(praxis, t)}
          </span>
        </div>
        <Braid />
      </div>
    </>
  )

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's (#1091). `ScoreStamp` carries the
  // whole rail — the sticker, its dashed rule, the highlighter multiplier chip
  // and the votes tally — and dispatches to `CovenScoreStamp` on a Coven task.
  // The design's own arithmetic (its own fudge factor over the vote average) is
  // NOT built: `scoreBreakdown()` is the single authority (ADR-0053).
  //
  // The candle sits behind it: `.cvn-candle` carries the flicker and its
  // reduced-motion guard, so stilled it is simply a steady glow.
  //
  // Handed to the skin unconditionally — `scoreWasBanked` is the shared gate.
  const scoreBlock = (
    <section style={{ ...panel, position: 'relative', overflow: 'hidden' }}>
      {sectionHead(t('detail.score.heading'))}
      <span
        aria-hidden
        className="cvn-candle"
        style={{
          position: 'absolute',
          left: '50%',
          top: '55%',
          width: 200,
          height: 200,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: half the 200px candle halo, centring the glow on its anchor. The offsets ARE the drawn disc's size; no rung halves it.
          marginLeft: -100,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the vertical half of the same halo centring.
          marginTop: -100,
          borderRadius: '50%',
          background: 'var(--faction-coven-slip-sigil-halo)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
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
  // Panel chrome, section head AND inks are handed in, so the card wears the ward
  // rather than its own dress. It self-hides for a praxis with no duel, for a
  // DECLINED challenge, and for the run-up the composer owns (#1071/ADR-0059).
  //
  // The inks are the ward panel's own measured set (#1153) — `slip-ink` and
  // `slip-soft` are both gated on `--faction-coven-ward-card` in
  // `factionContrast.test.ts`. Nothing here carries the RIVAL's faction hue: the
  // duel's foreign side is a disc and an outline, never a colour.
  const duelInk = { name: INK, total: INK, muted: SOFT, line: BORDER, plate: PAGE }

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  // Gated on the ONE predicate `VoteUI` gates ITSELF on (#1429): the plate,
  // its heading and its prompt are the promise of a control, so they may not
  // outlive the control. The author of a praxis can never vote on it, and used
  // to get this section drawn empty.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {sectionHead(t('detail.vote.heading'))}
      <p
        className="content-text"
        style={{ fontFamily: HAND, margin: '0 0 var(--space-md)', color: SOFT }}
      >
        {t('detail.vote.prompt')}
      </p>
      {/* Dispatched on the TASK's faction — this page's own `CovenVote` moon
          plate. `VoteUI` also owns the `viewer_can_vote` gate and publishes the
          slug the widget's logged-out gate reads, so the widget is never
          mounted bare (the design's `WowVote` import is a bug either way). */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  )

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already
  // fetched by `usePraxisDetail`. NO AVERAGE anywhere (ADR-0014): the standing
  // is the sum and the count, never the mean — and there is no per-voter points
  // figure in the payload, so none is invented. Each voter's rung is a candle
  // burning from pink into gold.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t('detail.voters.heading'),
        t('detail.voters.count', { count: voters.length }),
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: READING,
                fontWeight: 600,
                fontSize: 'var(--text-content)',
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
                background: PAGE,
                border: `1px solid ${BORDER}`,
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
                  background: `linear-gradient(90deg, ${PINK}, ${GOLD})`,
                }}
              />
            </span>
            <span
              style={{
                width: 20,
                textAlign: 'right',
                fontFamily: READING,
                fontWeight: 600,
                fontSize: 'var(--text-content)',
                color: DEEP,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )

  // The report card follows the two ward panels in the aside, mounted bare by
  // the skin — NOT dressed, by contract: it is the platform speaking.

  // ── Proof · write-up · crew ───────────────────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: sectionGap }}>
      {sectionHead(t('detail.sections.proof'))}
      {/* The slip's own gradient as a mat, the proof pressed onto it. */}
      <div
        style={{
          borderRadius: 16,
          padding: 'var(--space-sm)',
          border: `2px solid ${BORDER}`,
          background:
            'linear-gradient(158deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 38%, var(--faction-coven-slip-lav) 76%, var(--faction-coven-slip-vio))',
          boxShadow: 'var(--faction-coven-slip-shadow)',
        }}
      >
        <div style={{ borderRadius: 10, background: CARD, padding: 'var(--space-md)' }}>
          <MediaGallery media={praxis.media_items} layout={desktop ? 'grid' : 'column'} />
        </div>
      </div>
    </section>
  )

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: sectionGap }}>
      {sectionHead(t('detail.sections.writeUp'))}
      <MarkdownPreview
        source={praxis.body_text}
        className="markdown-preview content-text"
        style={{ fontFamily: READING, lineHeight: 1.75, color: INK }}
      />
    </section>
  )

  const crew = isCollab && (
    <section style={{ marginBottom: sectionGap }}>
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

  // The charms section is the SKIN's now — every archetype drew the same
  // `<section>` + `MetataskSeal` pair. READ-ONLY, by construction (#1093): the
  // seal omits the peel control and the add slot when it gets neither
  // `removable` nor `onAdd`, and each seal wears its ISSUING faction's dress
  // (#927/#933). The design's add chips are deliberately absent —
  // `apply_metatask` requires `status == in_progress`, so every chip would 422.

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: 'relative', color: INK, fontFamily: CHROME },
        /* THE COLUMN WEARS THE SLIP (#2135). It wore `.coven-candle-backdrop` —
           the near-black ward wash with four drifting blooms — until the owner
           ruled that the sheet the task card wears is the iconic coven look and
           the surfaces around it should wear it too. `SLIP_SHEET` is
           `covenSlip`'s one copy of the four-stop ramp, so the sheet, the task
           card and the praxis card cannot drift apart.

           The blooms and their drift go with the class; nothing here paints
           them. The class itself STAYS in index.css — `CovenFieldDesk` still
           grounds a whole mobile page on it — so this is a change of consumer,
           not a deletion, and the test on this file pins the negative half.

           The ground still belongs to the COLUMN, not the viewport: the site
           background shows around the page (WORLD_ZERO_STYLE §5, the #1028
           ruling).

           THE CLIP IS NOT RESTORED, and that is deliberate.
           `.coven-candle-backdrop` carried `overflow: hidden` for one reason —
           its `::before` bloom is inset -25% and had to be cut to the column. No
           bloom, no clip to owe: a background is cut by the element's OWN
           border-radius, and the cat below sits wholly inside its container.
           #1255 is the reason not to put it back on spec: this column wraps the
           comment composer, whose @-mention listbox is an absolutely positioned
           child, and a clipping ancestor cuts a descendant off whatever its
           stacking order. */
        sheetStyle: {
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          background: SLIP_SHEET,
          border: `2px solid ${BORDER}`,
          borderRadius: 18,
          padding: desktop ? 'var(--space-2xl)' : 'var(--space-lg)',
          boxSizing: 'border-box',
        },
        sheetBody: (body) => <div style={{ position: 'relative', zIndex: 1 }}>{body}</div>,
        splitStyle: { position: 'relative' },
        /* The cat watermark, turning once every two minutes (#2041 — it was a
           pentagram, and the drawing lives in `covenSlip` because five Coven
           surfaces turn the same one). `.cvn-wheel` still carries the motion and
           its reduced-motion guard (#911/#1023).

           IT COMES TO THE BOTTOM (#2135) — one placement rule across every
           mount, which is #2041's "not two different drawings" one level up. It
           was `right: 24, top: 140`.

           THE ANCHOR IS THE COLUMNS ROW, not the sheet, and the owner's reason
           is what pins it there: the sheet's true bottom-right sits behind the
           comment composer, which paints an opaque `ward-card` panel and would
           swallow the mark whole. "I want the cat where it can be seen, but in
           general at the bottom." The row ends exactly where the discussion
           begins, so `bottom: 0` here is the lowest point on the page the mark
           is still visible at. `right: 24` is unchanged and is what keeps the
           whole face on the sheet.

           `zIndex: -1` puts it back UNDER the copy. The row is positioned but
           has no z-index, so it is not a stacking context; the negative index
           lands in the wrapper above, which is — behind every in-flow block
           there, and still over the sheet's own ground. */
        splitPrelude: (
          <CovenCat
            size={size.wheel}
            style={{ right: 24, bottom: 0, opacity: 0.09, zIndex: -1 }}
          />
        ),
        header,
        score: scoreBlock,
        duelPanel: panel,
        duelHeading: sectionHead(t('duelCrossLink.label')),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead(t('detail.metatasks.heading')),
        commentsHeading: sectionHead(t('detail.sections.comments')),
        sectionGap,
      }}
    />
  )
}
