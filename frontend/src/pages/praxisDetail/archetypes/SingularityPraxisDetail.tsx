import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI, { voteRegionVisible } from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import MetataskSeal from "../../../components/metataskSeal/MetataskSeal";
import SingularityLamps from "../../../components/factionMarks/SingularityLamps";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { DuelCard } from "../DuelCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisDetailComments,
  MemberByline,
  bylineFaces,
  scoreWasBanked,
  taskRefMeta,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionRoleVars } from "../../../utils/factionRoles";

/**
 * The Singularity praxis detail (#1122, epic #1085; design project bebdf7c7,
 * `Singularity Praxis Detail.dc.html`) — THE SESSION LOG.
 *
 * The shared v2 layout (`DefaultPraxisDetail`, ADR-0061) wearing the same
 * terminal window `SingularityTaskDetail` wears: a chrome bar with three lamps,
 * phosphor green and blue on a near-black chassis, a standing raster, a scan
 * sweep travelling down the page, and a block cursor blinking after the finding.
 * Share Tech Mono for chrome and copy alike — the faction has one face.
 *
 * ## What is inherited, not re-decided
 *
 * Structure is the eight-design contract, verified in code and NOT re-derived
 * here (see `DefaultPraxisDetail`'s docstring):
 *
 * - Desktop: main column + a **330px** aside, comments beneath both.
 * - Mobile: one stacked column; the score and duel blocks move above the proof.
 *   They are built ONCE and moved by where they are mounted — never drawn twice
 *   and hidden. The 330px TRACK is desktop-only; its contents are not.
 * - **The crown renders at BOTH form factors**, never gated. It arrives in the
 *   score stamp's corner, keyed only on `is_top_for_task`, and the score block
 *   is in both layouts (ADR-0054 — one canonical `TaskCrown`, unrestyled; #1710
 *   retired the hero banner it used to arrive in).
 * - **The report card and the steward bar are NOT skinned.** `PraxisFlagBlock`
 *   and `PraxisAdminBar` are mounted bare, wearing none of the panel dress the
 *   score / vote / voters blocks wear, on their own neutral `.sidebar-card`
 *   surface. ADR-0061: content slots carry a skin's
 *   voice, moderation and system chrome do not.
 *
 * ## Dress only — the voice is recorded, not built
 *
 * Every string resolves through the shared neutral `detail.*` / `duelCrossLink.*`
 * block. The issue's vocabulary ("transmit", lowercase-mono labels) is recorded
 * on #1122 for a later voiced pass and is deliberately absent here; there is no
 * `detail.singularity.*` block and no line was added to `praxis.json`. What
 * survives of the terminal register is PUNCTUATION — the `//` heading marker and
 * the block cursor — each drawn `aria-hidden` beside a shared string rather than
 * replacing one, exactly as `SingularityTaskDetail` does.
 *
 * Lowercase-mono labelling is likewise dress: `LABEL` below lowercases nothing,
 * it letter-spaces and uppercases the catalog's own words, so a translator's
 * string is never mutilated by the costume.
 *
 * ## Always dark, in both themes (WORLD_ZERO_STYLE §6)
 *
 * No `dark ?` branch anywhere. `--faction-singularity-term-*` is a real
 * two-theme contract whose halves are BOTH near-black — the cascade flips the
 * phosphor, never the chassis — and the three halos ship as `none` in the light
 * half and lit in the dark one. Nothing new is declared in `index.css`: every
 * value on this page is a Singularity token that already shipped.
 *
 * ## The ground belongs to the COLUMN, not the viewport
 *
 * WORLD_ZERO_STYLE §5 / the #1028 ruling, which six of eight task-detail skins
 * got wrong: the chassis is capped at the epic's 1200 page width and the site
 * background still shows around it. The raster and the sweep are `position:
 * absolute` inside the chassis and clipped by its `overflow: hidden` — never
 * `position: fixed; inset: 0`.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` via `ScoreStamp`'s corner (#1710) · `ScoreStamp`, which since #1091 owns the
 * whole score rail (disc, ruled rows, votes tally) and dispatches to this
 * faction's own terminal read-out · `VoteUI`, dispatching to `SingularityVote` ·
 * `CollabRoster` · `MediaGallery` · `MetataskSeal`, read-only (`apply_metatask`
 * requires `in_progress`, so the design's add-chips would 422 on every tap) ·
 * `DuelCard`, which already implements all three readings plus "no card at all
 * on declined" · `PraxisDetailComments` with the layout's own heading, so the
 * thread does not draw a second one for the same list (the #1029 trap).
 *
 * NO SCORE ARITHMETIC IS BUILT. `scoreBreakdown()` is the single authority
 * (ADR-0053); every design in this wave invents its own fudge factor.
 *
 * ## Why two subtree token re-points exist below
 *
 * See `ON_CHASSIS_INK` and `CREW_INK`. Short version: the shared CONTENT
 * components paint themselves from token families that assume a sheet which is
 * light in light theme, and this chassis is near-black in both. The re-point is
 * scoped to the mounts that need it and never to the column, because a
 * column-wide re-point would drag the deliberately-neutral report card and
 * steward bar into the costume.
 */

const MONO = "var(--sg-praxis-detail-face, var(--faction-singularity-card-font))"; /* Share Tech Mono */

const BG = "var(--faction-singularity-term-bg)";
const PANEL = "var(--faction-singularity-term-panel)";
const CHROME = "var(--faction-singularity-term-chrome)";
const INK = "var(--faction-singularity-term-ink)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
const BLUE_BRIGHT = "var(--faction-singularity-term-blue-bright)";
const BORDER = "var(--faction-singularity-term-border)";
const HAIR = "var(--faction-singularity-term-hair)";

/**
 * The re-point every SHARED CONTENT component mounted straight onto the chassis
 * gets. The owner controls and the gallery chrome paint from the neutral
 * `--color-*` set, and `CollabRoster` from `--faction-default-*`; both families
 * assume a sheet that is LIGHT in light theme, so on this chassis their ink
 * lands at roughly 1:1. Repointing the tokens for the subtree is the fix rather
 * than forking the component — every value here is an existing Singularity
 * token, so the `[data-theme="dark"]` cascade still flips the phosphor
 * underneath and no `dark ?` branch appears anywhere.
 *
 * It is applied to the owner-action cluster, the proof frame and (through
 * {@link CREW_INK}) the roster — never to the column, and never to the comments
 * region: a comment row dispatches on ITS AUTHOR's faction (ADR-0061), so an
 * unaffiliated commenter's `--faction-default-*` card must reach them
 * unrepainted.
 *
 * **The duel panel came off this list with #1153.** It was the sharpest case —
 * `DuelCard` painted `--faction-default-*` rows and this is the always-dark
 * faction, so a shared component's light-in-light-theme assumption failed
 * hardest here — and it is now the case this workaround no longer has to cover:
 * the card takes an `ink` seam and this file hands it the same four values by
 * name. A prop beats a token re-point wherever the component offers one, because
 * the re-point is invisible from the component's side and reaches everything in
 * the subtree rather than the four slots that were meant.
 *
 * `--faction-default-rainbow` is deliberately NOT repointed, and there is no ink
 * slot for it either. `DuelCard` uses it for the ring on the side this page IS,
 * which is a "you are here" mark rather than a faction hue (ADR-0039) — and a
 * bright spectrum ring reads cleanly on near-black in both halves of the
 * cascade.
 */
const ON_CHASSIS_INK = {
  "--faction-default-card-text": BRIGHT,
  "--faction-default-card-muted": DIM,
  "--faction-default-card-line": HAIR,
  "--faction-default-stamp-bg": PANEL,
  "--color-text-primary": BRIGHT,
  "--color-text-secondary": INK,
  "--color-text-tertiary": DIM,
  "--color-border": HAIR,
} as CSSProperties;

/**
 * `CollabRoster` fills a member's row with `card-muted` once they have cast.
 * For this faction that token is the BLUE BRAND CHROME (`#60a5fa`), which is a
 * fine plate on a cream sheet and a poor one under phosphor ink — green on that
 * blue is about 1.3:1. On the terminal a cast row is a LIT WELL, not a blue
 * plate, so the fill is repointed to the chassis panel and the row keeps the
 * roster's own green `card-accent` border. Scoped to the roster subtree; the
 * token is untouched everywhere else on the page.
 */
const CREW_INK = {
  ...ON_CHASSIS_INK,
  "--faction-singularity-card-muted": PANEL,
} as CSSProperties;

/** Terminal caption voice — every label on the chassis speaks in it. */
const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-md)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
};

/** The praxis's ordinal in hex — the session's process id. Ornament, never copy. */
function hexOf(id: number): string {
  return `0x${id.toString(16).toUpperCase().padStart(3, "0")}`;
}

/** Initials fallback for an author with no uploaded avatar. */
function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

/**
 * The block cursor trailing the finding. Stilled under reduced motion it stays
 * drawn — it is punctuation on the line, not an indicator. `.sg-cursor` owns the
 * blink and its `prefers-reduced-motion` guard (index.css, #911).
 */
function Cursor({ height }: { height: number }) {
  return (
    <span
      aria-hidden
      className="sg-cursor"
      style={{
        display: "inline-block",
        width: 10,
        height,
        marginLeft: "var(--space-sm)",
        background: "currentColor",
        verticalAlign: "-0.08em",
      }}
    />
  );
}

/** One member's initials, framed as a terminal cell rather than a soft disc. */
function MemberCell({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string;
  size: number;
}) {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 4,
        // Clips the portrait to the cell's own corner radius, so the img needs
        // no radius of its own.
        overflow: "hidden",
        boxSizing: "border-box",
        background: PANEL,
        border: `1px solid ${BORDER}`,
        fontFamily: MONO,
        fontSize: "var(--text-lg)",
        color: BRIGHT,
      }}
    >
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

export default function SingularityPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1`, which hid the whole Members section from a collab
  // nobody had joined yet while the heading still counted them. Tested
  // POSITIVELY: a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === "collab";
  // The shared banners draw the roster while a collab is still resolving, so the
  // Members section takes the complement — one roster on the page, never two.
  const rosterInBanners = praxis.status === "in_progress" || praxis.status === "pending";

  /** A dashed terminal rule. */
  const rule = (style?: CSSProperties) => (
    <span aria-hidden style={{ borderTop: `1px dashed ${HAIR}`, ...style }} />
  );

  /** A commented section head: `// LABEL ------------------ gloss`. */
  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
          color: BLUE_BRIGHT,
        }}
      >
        <span aria-hidden>{"// "}</span>
        {label}
      </span>
      {rule({ flex: "1 1 20%", minWidth: 20 })}
      {gloss !== undefined && <span style={LABEL}>{gloss}</span>}
    </div>
  );

  /** Aside / rail panel chrome, shared by score, duel, vote and voters. */
  const panel: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    boxSizing: "border-box",
    padding: "var(--space-lg)",
  };

  // ── Window chrome: the lamps and the process id.
  //
  //    It carried the navigation until #2102 — a slash-separated trail on
  //    desktop, a `← Praxis` back link to a different destination on mobile —
  //    which is the "single breadcrumb, part of the card itself, with faction
  //    styling" the report screenshotted. The trail is site chrome now and sits
  //    ABOVE the terminal, outside its frame, identical at both widths. The
  //    lamps and the hex are the window, not the way out of it, so they stay.
  const chrome = (
    <div
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-lg)",
        background: CHROME,
        borderBottom: `1px solid ${HAIR}`,
      }}
    >
      <SingularityLamps />
      <span aria-hidden style={{ ...LABEL, marginLeft: "auto", color: BLUE, flex: "none" }}>
        {hexOf(praxis.id)}
      </span>
    </div>
  );

  // ── Moderation banners ────────────────────────────────────────────────────
  // Neutral by rule, mounted bare: the failed note comes from the shared
  // banners (the crown hero went with #1710 — the mark is the score stamp's
  // corner fleur now), the flagged notice has no shared slot so it renders
  // here on the shared `--color-warning`, and `PraxisAdminBar` is the steward
  // bar. Nothing in this block wears the costume (ADR-0061).
  const banners = (
    <>
      <PraxisStatusBanners state={state} />
      {praxis.moderation_status === "flagged" && (
        <div
          style={{
            border: "2px solid var(--color-warning)",
            borderRadius: 8,
            padding: "var(--space-sm) var(--space-lg)",
            marginBottom: "var(--space-md)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            flexWrap: "wrap",
          }}
        >
          <span className="label-caption" style={{ color: "var(--color-warning)" }}>
            {t("detail.banners.flaggedLabel")}
          </span>
          <span className="font-body content-text" style={{ color: "var(--color-warning)" }}>
            {t("detail.banners.flaggedBody")}
          </span>
        </div>
      )}
      <PraxisAdminBar state={state} />
    </>
  );

  // ── Byline · finding · owner actions · task reference ─────────────────────
  const header = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
        }}
      >
        {/* One cell per member, abutting — a collab reads as shared before a
            single name is parsed. A payload with no member rows still credits
            its creator, so the author is always reachable from the byline. */}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          {bylineFaces(praxis).map((author) => (
            <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
              <MemberCell
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={desktop ? 40 : 34}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: MONO,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: BRIGHT,
              textDecoration: "none",
              borderBottom: `1px solid ${BORDER}`,
            }}
            separatorStyle={{ fontFamily: MONO, color: DIM }}
          />
          <div style={{ ...LABEL, marginTop: "var(--space-xs)" }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: MONO,
          fontWeight: 400,
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.15,
          margin: "0 0 var(--space-lg)",
          color: BRIGHT,
          overflowWrap: "anywhere",
          textShadow: "var(--faction-singularity-term-halo-green)",
        }}
      >
        {praxis.title || praxis.task_title}
        <Cursor height={desktop ? 30 : 22} />
      </h1>

      {/* Owner controls are shared BEHAVIOUR chrome, not moderation chrome, and
          they paint from the neutral `--color-*` set — repointed for the subtree
          so the quiet reopen trigger is legible on the chassis. */}
      <div style={ON_CHASSIS_INK}>
        <PraxisOwnerActions state={state} />
      </div>

      {/* Task reference — what this praxis is a doing OF. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `1px dashed ${HAIR}`,
          borderBottom: `1px dashed ${HAIR}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span style={LABEL}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ fontFamily: MONO, color: BRIGHT, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...LABEL, marginLeft: "auto", color: BLUE }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  );

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's. `ScoreStamp` dispatches to
  // `SingularityScoreStamp` for a Singularity task and carries the whole rail —
  // the struck well, the ruled register rows and the votes tally. No arithmetic
  // is restated here: `scoreBreakdown()` is the single authority (ADR-0053), and
  // the design's own multiplier-from-the-vote-average is not built.
  const scoreBlock = !scoreWasBanked(praxis) ? null : (
    <section style={panel}>
      {sectionHead(t("detail.score.heading"))}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* THE PAGE'S ONE MARK, IN THE CORNER (#1710). The stamp's crown was off
            here because a bordered hero panel above already drew one. The panel
            is gone (owner ruling: "just a fleur in the corner"), so the mark
            comes back to the stamp -- still one per page, still ADR-0054's. */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  );

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  //
  // `DuelCard` (#1090) self-hides for a praxis with no duel, for a DECLINED
  // challenge, and for the run-up, which the composer's waiting surface owns.
  // Panel chrome, section head AND inks are handed in so it wears this page's
  // dress.
  //
  // The `ON_CHASSIS_INK` re-point that used to ride on `style` here is GONE
  // (#1153): the four tokens it existed to override on this mount — card-text,
  // card-muted, card-line, stamp-bg — are now named props, so the phosphor
  // arrives by contract instead of by cascade. Same four values, and the
  // `--color-*` half of that object was never read by this component anyway.
  const duelBlock: ReactNode = (
    <DuelCard
      state={state}
      style={panel}
      heading={sectionHead(t("duelCrossLink.label"))}
      ink={{ name: BRIGHT, total: BRIGHT, muted: DIM, line: HAIR, plate: PANEL }}
    />
  );

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  );

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  // Gated on the ONE predicate `VoteUI` gates ITSELF on (#1429): the plate,
  // its heading and its prompt are the promise of a control, so they may not
  // outlive the control. The author of a praxis can never vote on it, and used
  // to get this section drawn empty.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {sectionHead(t("detail.vote.heading"))}
      <p
        className="content-text"
        style={{ fontFamily: MONO, margin: "0 0 var(--space-md)", color: DIM }}
      >
        {t("detail.vote.prompt")}
      </p>
      {/* Dispatched on the TASK's faction — `SingularityVote`, the faction's own
          shipped widget, not a second one drawn here. */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Per-voter values come straight off `GET /praxes/{id}/voters`. Each voter's
  // rung is a phosphor bar (value / 5). NO AVERAGE anywhere (ADR-0014): the
  // standing is the sum and the count, never the mean.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t("detail.voters.heading"),
        t("detail.voters.count", { count: voters.length }),
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: MONO,
                fontSize: "var(--text-content)",
                color: BRIGHT,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 8,
                borderRadius: 2,
                background: HAIR,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: BRIGHT,
                }}
              />
            </span>
            <span
              style={{
                width: 20,
                textAlign: "right",
                fontFamily: MONO,
                fontSize: "var(--text-content)",
                color: BLUE_BRIGHT,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  const asideRest = (
    <>
      {voteBlock}
      {votersBlock}
      {/* Bare, by rule. No `panel`, no token re-point, no style seam — the
          report card is outside the costume in all eight faction designs. */}
      <PraxisFlagBlock state={state} />
    </>
  );

  // ── Proof · write-up · members · metatasks ────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.proof"))}
      <div
        style={{
          ...ON_CHASSIS_INK,
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          padding: "var(--space-sm)",
        }}
      >
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.writeUp"))}
      <MarkdownPreview
        source={praxis.body_text}
        className="markdown-preview content-text"
        style={{ fontFamily: MONO, lineHeight: 1.8, color: BRIGHT }}
      />
    </section>
  );

  const crew = isCollab && !rosterInBanners && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.members"))}
      <div style={{ ...CREW_INK, color: INK }}>
        <CollabRoster
          praxisType={praxis.type}
          invites={praxis.invites}
          members={praxis.members}
          currentCharacterId={state.user?.character?.id ?? null}
          factionSlug={praxis.task_faction_slug}
          taskPointValue={praxis.task_point_value}
          onKick={state.handleKickMember}
        />
      </div>
    </section>
  );

  // READ-ONLY, by construction. `MetataskSeal` omits the peel control and the
  // add slot when it gets neither `removable` nor `onAdd`, and each seal wears
  // its ISSUING faction's dress (#927/#933). The design's "Available" chips are
  // deliberately absent: `apply_metatask` requires `status == in_progress`, so
  // every chip would 422 on tap.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.metatasks.heading"))}
      <MetataskSeal metatasks={praxis.applied_metatasks} />
    </section>
  );

  return (
    <div className="py-8">
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail at every width - see components/nav/Breadcrumb. */}
      <Breadcrumb
        taskId={praxis.task_id}
        taskTitle={praxis.task_title}
        praxisId={praxis.id}
      />

      <div
        style={{
          /* THE SESSION IS THE SURFACE, and the roles are declared on IT rather
             than on the `py-8` wrapper above (#2675). That wrapper also holds
             the breadcrumb, which is neutral shared site chrome measured on the
             site's own ground (#2102) — a faction's namespace has no business
             spanning it. */
          ...factionRoleVars("singularity", "sg-praxis-detail"),
          position: "relative",
          overflow: "hidden",
          maxWidth: 1200,
          margin: "0 auto",
          boxSizing: "border-box",
          background: BG,
          color: INK,
          fontFamily: MONO,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: "var(--faction-singularity-term-shadow)",
        }}
      >
        {/* The standing raster — a fixed scrim over the whole session. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
            background:
              "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* The scan sweep travelling down the page. `.sg-scan` owns both the
            resting offset and the reduced-motion-guarded travel. */}
        <div
          aria-hidden
          className="sg-scan"
          style={{
            position: "absolute",
            left: "-30%",
            right: "-30%",
            height: 40,
            pointerEvents: "none",
            zIndex: 4,
            background: "var(--faction-singularity-term-sweep)",
          }}
        />

        {chrome}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: desktop
              ? "var(--space-2xl) var(--space-2xl) var(--space-3xl)"
              : "var(--space-lg) var(--space-md) var(--space-xl)",
          }}
        >
          {banners}

          <div
            style={{
              display: "flex",
              flexDirection: desktop ? "row" : "column",
              alignItems: "stretch",
              gap: desktop ? "var(--space-2xl)" : "var(--space-xl)",
            }}
          >
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              {header}
              {/* Mobile stacks the rail above the proof — one block each, moved,
                  never a second copy hidden at the other breakpoint. */}
              {!desktop && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-lg)",
                    marginBottom: "var(--space-xl)",
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
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                  {asideRest}
                </div>
              )}
            </div>

            {desktop && (
              <aside
                style={{
                  flex: "0 0 330px",
                  width: 330,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-lg)",
                }}
              >
                {rail}
                {asideRest}
              </aside>
            )}
          </div>

          {/* The third layout region (ADR-0061, amending ADR-0006): comments sit
              beneath both columns, inside the page's own chassis, and the layout
              draws the heading so the thread does not draw a second one.
              Deliberately NOT token-repointed — each row dispatches on its
              AUTHOR's faction and must reach the reader in that voice. */}
          <PraxisDetailComments
            state={state}
            heading={sectionHead(t("detail.sections.comments"))}
            style={{ marginTop: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
          />
        </div>
      </div>
    </div>
  );
}
