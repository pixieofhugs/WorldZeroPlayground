import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import { factionRoleVars } from "../../../utils/factionRoles";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI, { voteRegionVisible } from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import MetataskSeal from "../../../components/metataskSeal/MetataskSeal";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { Lotus } from "../../../components/factionMarks";
import { UaSigil } from "../../../components/sigil/UaSigil";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  UaInkColumn,
  uaShade,
} from "../../../components/factionMarks/uaAtoms";
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

/**
 * University of Asthmatics — THE PRESSED LEAF, UA's praxis-detail skin (#1119,
 * epic #1085; design `UA Praxis Detail.dc.html`, project bebdf7c7).
 *
 * `UaTaskDetail` (#1036) is THE VELLUM LEAF — the sheet a task's brief is drawn
 * on. This is the leaf a finished piece of work is pressed into: the same
 * mesa-sand vellum, the same lotus bleeding off the gutter edge, the same sienna
 * rules running out from every label — but the paper here carries a fine tooth
 * (`.ua-praxis-leaf`), the tell that separates a record from a brief. Two pages,
 * one practice, and the vocabulary is deliberately shared so they read as one.
 *
 * ## The dress
 *
 * A three-tier ground, and the tiers are load-bearing rather than decorative:
 * the toothed **page** (`--faction-ua-page`) carries the column, quiet **sheets**
 * (`--faction-ua-card-bg`) carry the rail and the read blocks, and a sunken
 * **well** (`--faction-ua-panel`) carries the proof. The middle tier is not a
 * taste call — `UaScoreStamp`'s box is `--faction-ua-card-box-bg`, which lifts
 * off the sheet in light and sinks below it in dark, and `UaVote`'s mandala
 * punches its cores to `--faction-ua-card-bg` so the figure reads as an APERTURE
 * onto whatever it sits on. Both are inks and geometry this page does not
 * control, so both get the stock they were measured on (WORLD_ZERO_STYLE §3, the
 * #1118 rule). A rail plate painted in `-lift` or `-panel` would have made the
 * score box invisible and the mandala a disc.
 *
 * Two faces, which is UA's whole type vocabulary (#851): **Cormorant Garamond**
 * (`--faction-ua-card-font`) on titles, names and numerals, **EB Garamond**
 * (`--faction-ua-body-font`) on everything read, and one label shape — the wide
 * uppercase `UA_EYEBROW`. UA's section heads ARE eyebrows; this page does not
 * grow a display-sized header tier that no other UA surface has.
 *
 * ## Two ornament rulings, both already settled (§6 / #849)
 *
 * - **The ensō is reserved for the SCORE and the FACTION MARK.** It appears
 *   exactly twice: `UaScoreStamp` draws it around the total, and one 14px mark
 *   sits on the task-reference row — the line that says whose practice this work
 *   belongs to. It is never a container border and never a section bullet.
 * - **The lotus is a different device with its own scope** — a ground wash — so
 *   it is drawn as UA draws it everywhere else, bleeding off the left edge at
 *   `--faction-ua-card-lotus-opacity`. The mandala is not drawn at all — its
 *   `strength` API encodes `absent` for exactly this case (dense, text-heavy
 *   surfaces), and the one place UA shows it at full strength is the vote widget
 *   mounted in the rail.
 *
 * The ink column (`UaInkColumn`) runs down the write-up — the faction's hairline
 * on a surface too dense for anything louder. It clears the copy by 16px and
 * never sits under it, which is why its `position: absolute` (painting above
 * static siblings) costs nothing here; see §5's stacking half for what happens
 * when an ornament and copy do overlap.
 *
 * ## NO NEW TOKENS, and no new pairings
 *
 * Every colour is an already-shipped `--faction-ua-*` and every ground/ink
 * combination this file paints is already gated by `factionContrast.test.ts`:
 * page × (page-text · body · muted · accent), sheet × (text · body · muted ·
 * accent), well × (text · body · muted · accent). That is deliberate. UA's
 * accent and its paper are both warm and light, which makes it the faction most
 * prone to a failing pairing — #1155 found three in the collab roster, one at
 * 1.05:1, caused by a *text* ink used as a `background:`. Nothing here fills
 * with an ink: the only ink-family token used as a fill is the `-rank-*` ramp,
 * which is a documented ornament ladder that carries no text.
 *
 * There is no `dark ?` anywhere; both themes arrive through the
 * `[data-theme="dark"]` cascade, tooth included.
 *
 * ## The contract this skin does NOT get to re-decide (ADR-0061, #1129)
 *
 * - Desktop is main column + a **330px** aside, comments beneath both; mobile is
 *   one stacked column with score and duel moved above the proof. ONE responsive
 *   component — `useFormFactor()` internally, no mobile twin (ADR-0063). #1089
 *   retired the `mobilePraxisDetail` surface outright, so there is no second
 *   registry to dispatch to and no dormant twin to keep in step.
 * - Score and duel are built ONCE and MOVED by where they are mounted, never
 *   drawn twice and hidden at the other breakpoint.
 * - **The crown renders at both form factors.** It is not form-factor gated: it
 *   comes from `ScoreStamp`'s corner, keyed only on `is_top_for_task`, and the
 *   score block is in both layouts (#1710 retired the hero banner it used to
 *   come from). Where a design hides it on a phone, it shows anyway.
 * - The duel panel and the comment thread are SLOTS THIS PAGE OWNS, not
 *   dispatcher mounts (ADR-0064) — a skin that forgets one simply loses it.
 * - **The report card and the steward bar are NOT dressed.** `PraxisFlagBlock`
 *   and `PraxisAdminBar` take `state` and nothing else and are mounted bare, on
 *   their own neutral `.sidebar-card` + `--color-*` tokens, wearing none of the
 *   sheet chrome the rail plates wear. All eight faction designs draw them that
 *   way.
 * - The page ground belongs to the COLUMN, not the viewport (§5, the #1028
 *   ruling) — the site's watercolour still shows around the leaf.
 *
 * ## Copy — none. ADR-0061, unamended
 *
 * EVERY string is the shared neutral `detail.*` block. The seven words #1119
 * names — *The sheet · Base / Marks · The contest · Revise the sheet · Top mark
 * · Metatasks · Post* — are **recorded on the issue, not built**: the amendment
 * that would have permitted faction voice was written and withdrawn the same day
 * (2026-07-28), and four skins that shipped voiced copy were stripped again in
 * #1165. There is no `detail.ua.*` block and this file reads none.
 *
 * Two UA words that ARE shipped are not this page's and are not affected: the
 * praxis CARD's masthead (`card.masthead.ua`) and the comment voice's margin
 * prompt (`comments.ua.*`), the latter dispatched on the COMMENTER's faction
 * rather than the page's — ADR-0061 draws that boundary explicitly.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` (mounted by `ScoreStamp`, #1710) · `ScoreStamp`, which since #1091 carries
 * the whole score rail and resolves UA's own ensō stamp — `scoreBreakdown()` is
 * the arithmetic authority (ADR-0053) and this file adds no second strip ·
 * `VoteUI`, which dispatches UA's growing mandala · `CollabRoster`, which paints
 * its own sheet and its own ink (#694) · `MediaGallery` · `MetataskSeal`,
 * READ-ONLY (no add-chips: `apply_metatask` requires `in_progress` and every one
 * would 422) · `DuelCard`, which owns all three duel readings and draws nothing
 * on a declined challenge — it paints its own `--faction-default-*` inks and
 * exposes only `style` + `heading`, which is #1153, to be fixed once for all
 * nine skins rather than worked around here · `CommentThread` via
 * `PraxisDetailComments` with the heading suppressed, so one list carries one
 * heading (#1029).
 */

/** The aside track. 330px across all eight faction designs (#1129). */
const ASIDE_TRACK = 330;

/**
 * The practice's five-rung ladder — faint · forming · true · alive · radiant —
 * indexed by a voter's 1-5 value. These are FILLS (the ramp is directional and
 * flips with the theme, #849) and never inks: nothing legible is painted in one.
 * The ramp is the practice's, not the vote widget's, which is exactly why a
 * voter's rung on this page may grade itself with it.
 */
const RANK_FILL = [
  "",
  "var(--faction-ua-rank-1)",
  "var(--faction-ua-rank-2)",
  "var(--faction-ua-rank-3)",
  "var(--faction-ua-rank-4)",
  "var(--faction-ua-rank-5)",
];

interface SizeSet {
  title: string;
  byline: string;
  disc: number;
  pagePad: string;
  panelPad: string;
  sectionGap: string;
  /** The lotus wash. Ornament geometry, so raw px (§4a). */
  lotus: number;
  lotusLeft: number;
  lotusTop: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    title: "var(--text-display)",
    byline: "var(--text-title)",
    disc: 44,
    pagePad: "var(--space-2xl)",
    panelPad: "var(--space-lg)",
    sectionGap: "var(--space-2xl)",
    lotus: 880,
    lotusLeft: -230,
    lotusTop: -110,
  },
  mobile: {
    title: "var(--text-heading)",
    byline: "var(--text-content)",
    disc: 38,
    pagePad: "var(--space-lg)",
    panelPad: "var(--space-lg)",
    sectionGap: "var(--space-xl)",
    lotus: 560,
    lotusLeft: -200,
    lotusTop: 40,
  },
};

/** Initials fallback for a member with no uploaded avatar. */
function initials(name: string): string {
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
 * One member's disc — a sienna-ringed field carrying Cormorant initials, the
 * same mount `UaTaskDetail` gives a task's proposer. Collab bylines stack these,
 * overlapping, so a shared piece of work reads as shared before a single name is
 * parsed.
 *
 * Deliberately NOT ringed with the ensō: the mark is reserved for the score and
 * the faction mark, and an avatar ring is neither (§6/#849).
 */
function LeafDisc({
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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        overflow: "hidden",
        fontFamily: UA_DISPLAY,
        fontWeight: 700,
        fontSize: "var(--text-lg)",
        background: "var(--faction-ua-panel)",
        color: "var(--leaf-praxis-detail-ink)",
        boxShadow: "0 0 0 1.5px var(--faction-ua-card-frame)",
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
        initials(name)
      )}
    </span>
  );
}

export default function UaPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[formFactor];
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1`, which hid the whole Members section from a collab
  // nobody had joined yet while the heading still counted them. Tested
  // POSITIVELY: a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === "collab";

  /** A quiet sheet laid on the leaf — the page's one container. */
  const sheet: CSSProperties = {
    background: "var(--leaf-praxis-detail-paper)",
    border: "1px solid var(--faction-ua-rule)",
    borderRadius: 6,
    boxSizing: "border-box",
    boxShadow: `0 14px 36px -30px ${uaShade(52)}`,
    color: "var(--leaf-praxis-detail-ink)",
  };

  /** The same sheet with the rail's padding already on it. */
  const panel: CSSProperties = { ...sheet, padding: size.panelPad };

  /**
   * The rule that runs out from a label: sienna, into the neutral hairline, into
   * nothing. `UaTaskDetail` draws the identical gesture — the design fades
   * sienna → gilt → transparent, and UA has had no gilt token since #853 gave
   * the gold to WOW.
   */
  const rule = (
    <span
      aria-hidden
      style={{
        flex: "1 1 20%",
        minWidth: 20,
        height: 1,
        opacity: 0.7,
        background:
          "linear-gradient(90deg, var(--faction-ua-card-frame), var(--faction-ua-rule) 55%, transparent)",
      }}
    />
  );

  /**
   * The one label shape UA has, with the rule running out of it. `ink` is the
   * only thing that changes between a head on the leaf and a head on a sheet —
   * the two grounds are different stocks, and both readings are measured.
   */
  const head = (ink: string, label: ReactNode, trailing?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ ...UA_EYEBROW, color: ink }}>{label}</span>
      {rule}
      {trailing}
    </div>
  );

  const sectionHead = (label: ReactNode, trailing?: ReactNode) =>
    head("var(--faction-ua-page-text)", label, trailing);
  const panelHead = (label: ReactNode, trailing?: ReactNode) =>
    head("var(--leaf-praxis-detail-ink)", label, trailing);

  // Navigation is not this skin's any more (#2102). The trail sat INSIDE the
  // vellum leaf so its accent could be measured on the faction's own ground,
  // and a bespoke `mobileBar` replaced it below 768px. Both are gone: a
  // breadcrumb is neutral SITE chrome, so it moved ABOVE this column, where
  // the site's own tertiary is the ink and the faction reading no longer
  // applies.

  // ── Moderation banners — NOT dressed (ADR-0061) ───────────────────────────
  //
  // The failed note comes from the shared `PraxisStatusBanners` on its own
  // neutral `--color-*` tokens — the crown hero went with #1710 and the mark is
  // the score stamp's corner fleur now. The flagged notice has no shared
  // slot, so it renders here in the SAME neutral vocabulary rather than in
  // sienna on vellum. The steward bar below is `PraxisAdminBar`, equally bare.
  // Every word of all three is the shared neutral block: this is the platform
  // speaking, not the practice.
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
          <span
            className="font-body content-text"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("detail.banners.flaggedBody")}
          </span>
        </div>
      )}
      <PraxisAdminBar state={state} />
    </>
  );

  // ── Byline · title · owner actions · task reference ───────────────────────
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
        {/* Stacked discs, one per member. A payload with no member rows still
            credits its creator, so the author is always reachable from here. */}
        <span style={{ display: "flex", alignItems: "center" }}>
          {bylineFaces(praxis).map((author, index) => (
            <Link
              key={author.id}
              to={`/characters/${author.id}`}
              style={{
                display: "block",
                // Each disc after the first laps the one before it — a spacing
                // step off the scale, negated, not a loose pixel.
                marginLeft: index === 0 ? 0 : "calc(-1 * var(--space-lg))",
                zIndex: index,
              }}
            >
              <LeafDisc
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
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: size.byline,
              color: "var(--faction-ua-page-text)",
              textDecoration: "none",
            }}
          />
          {/* When the work was set down. */}
          <div
            style={{
              fontFamily: UA_TEXT,
              fontSize: "var(--text-xl)",
              lineHeight: 1.5,
              color: "var(--leaf-praxis-detail-quiet)",
            }}
          >
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 700,
          fontSize: size.title,
          lineHeight: 1.08,
          letterSpacing: "-0.015em",
          margin: "0 0 var(--space-md)",
          color: "var(--faction-ua-page-text)",
          overflowWrap: "anywhere",
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference — what this piece of work is a doing OF, and the one
          place the faction mark appears outside the score (§6/#849). The mark is
          truthful by construction: the dispatcher picks this archetype off
          `task_faction_slug`, so the task on this row is always UA's. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: "1px solid var(--faction-ua-rule)",
          borderBottom: "1px solid var(--faction-ua-rule)",
          padding: "var(--space-md) 0",
          marginBottom: size.sectionGap,
        }}
      >
        <UaSigil width={14} height={14} />
        <span style={UA_EYEBROW}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{
            fontFamily: UA_TEXT,
            color: "var(--faction-ua-page-text)",
            textDecoration: "none",
            borderBottom: "1px solid var(--faction-ua-rule)",
          }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...UA_EYEBROW, marginLeft: "auto" }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  );

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's (#1091). `ScoreStamp` carries the
  // ruled box, the working and the ensō holding the total, dispatched on the
  // TASK's faction — so this page gets UA's own stamp, and the arithmetic is
  // `scoreBreakdown()`'s alone (ADR-0053). No second strip restating the same
  // terms, and no hand-drawn ensō: the stamp already owns the mark's score half.
  const scoreBlock = !scoreWasBanked(praxis) ? null : (
    <section style={panel}>
      {panelHead(t("detail.score.heading"))}
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
  // Outcomes only. `DuelCard` self-hides for a praxis with no duel, for a
  // DECLINED challenge, and for the run-up the composer's waiting surface owns
  // (#1071 / ADR-0059). Sheet chrome, section head AND inks are handed in, so
  // the card wears the leaf's dress rather than its own.
  //
  // The inks are the sheet's own set (#1153): `card-text` on the names and the
  // totals, `card-muted` on the cross-link and the verdict — the same two this
  // file already sets on every other block laid on `--faction-ua-card-bg` — with
  // `rule` for the hairlines and the sunken `panel` behind a duellist with no
  // avatar. No sienna on the numerals: `card-accent` is this page's LINK ink and
  // a duel total is not a link. And no rival faction hue anywhere — the foreign
  // side reads as foreign through its outline, not through a colour.
  const duelBlock: ReactNode = (
    <DuelCard
      state={state}
      style={panel}
      heading={panelHead(t("duelCrossLink.label"))}
      ink={{
        name: "var(--leaf-praxis-detail-ink)",
        total: "var(--leaf-praxis-detail-ink)",
        muted: "var(--leaf-praxis-detail-quiet)",
        line: "var(--faction-ua-rule)",
        plate: "var(--faction-ua-panel)",
      }}
    />
  );

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  );

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  //
  // The widget is UA's growing mandala, dispatched on the TASK's faction. Its
  // cores punch to `--faction-ua-card-bg`, which is why this panel is that stock
  // and not the lift: on any other sheet the mandala stops being an aperture.
  // Gated on the ONE predicate `VoteUI` gates ITSELF on (#1429): the plate,
  // its heading and its prompt are the promise of a control, so they may not
  // outlive the control. The author of a praxis can never vote on it, and used
  // to get this section drawn empty.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {panelHead(t("detail.vote.heading"))}
      <p
        className="content-text"
        style={{
          fontFamily: UA_TEXT,
          fontStyle: "italic",
          lineHeight: 1.6,
          margin: "0 0 var(--space-md)",
          color: "var(--leaf-praxis-detail-quiet)",
        }}
      >
        {t("detail.vote.prompt")}
      </p>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already
  // fetched by `usePraxisDetail`. Each voter's rung is graded on the practice's
  // own five-rung ramp — a FILL, never an ink. NO AVERAGE anywhere (ADR-0014):
  // the standing is the sum and the count, never the mean, and there is no
  // per-voter points figure in the payload so none is invented.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {panelHead(
        t("detail.voters.heading"),
        <span style={{ ...UA_EYEBROW, fontSize: "var(--text-base)" }}>
          {t("detail.voters.count", { count: voters.length })}
        </span>,
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
            }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="content-text"
              style={{
                fontFamily: UA_TEXT,
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--leaf-praxis-detail-ink)",
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 6,
                borderRadius: 3,
                background: "var(--faction-ua-rule)",
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
                  background: RANK_FILL[voter.value],
                }}
              />
            </span>
            <span
              style={{
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                width: 20,
                textAlign: "right",
                fontSize: "var(--text-content)",
                color: "var(--leaf-praxis-detail-ink)",
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  // The report card wears NO leaf dress: `PraxisFlagBlock` takes `state` and
  // nothing else, on its own neutral `.sidebar-card` + `--color-*` tokens. That
  // is the ADR-0061 rule and all eight faction designs draw it, so it is mounted
  // bare beside sheets it deliberately does not match.
  const asideRest = (
    <>
      {voteBlock}
      {votersBlock}
      <PraxisFlagBlock state={state} />
    </>
  );

  // ── Proof · write-up · members · metatasks ────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.sections.proof"))}
      <div style={{ ...sheet, padding: "var(--space-md)" }}>
        {/* The sunken well the proof is mounted in — a shade off the sheet, so
            the two papers separate without a second frame. */}
        <div
          style={{
            background: "var(--faction-ua-panel)",
            border: "1px solid var(--faction-ua-hair)",
            borderRadius: 5,
            padding: "var(--space-sm)",
          }}
        >
          <MediaGallery
            media={praxis.media_items}
            layout={desktop ? "grid" : "column"}
          />
        </div>
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.sections.writeUp"))}
      <div
        style={{
          ...sheet,
          position: "relative",
          padding:
            "var(--space-lg) var(--space-lg) var(--space-lg) var(--space-2xl)",
        }}
      >
        {/* UA's hairline down the margin. It sits at 14px inside a 32px inset,
            so it clears the copy by 16 and never paints over a word — which is
            what makes its `position: absolute` harmless here (§5). */}
        <UaInkColumn style={{ left: 14, top: 14, bottom: 14 }} />
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{
            fontFamily: UA_TEXT,
            lineHeight: 1.72,
            color: "var(--faction-ua-card-body)",
          }}
        />
      </div>
    </section>
  );

  // No status complement here. `DefaultPraxisDetail` suppresses this section
  // while the shared banners draw their own roster — but #1089 deleted that
  // roster (it was gated to `in_progress` / `pending`, which ADR-0062 redirects
  // to the composer), so on a page this renders on there is exactly one roster
  // and it is this one. The roster paints its own sheet and its own ink (#694),
  // so it sits straight on the leaf rather than inside a second frame.
  const crew = isCollab && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.sections.members"))}
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
  );

  // READ-ONLY, by construction (#1093). `MetataskSeal` omits the peel control
  // and the add slot when it gets neither `removable` nor `onAdd`, and each seal
  // wears its ISSUING faction's dress (#927/#933). No "available" chips:
  // `apply_metatask` (services/praxis.py) requires `status == in_progress`, so
  // every one would 422 on tap.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.metatasks.heading"))}
      <MetataskSeal metatasks={praxis.applied_metatasks} />
    </section>
  );

  return (
    <div
      className="py-8"
      style={{ position: "relative" }}
    >
      {/* SITE CHROME, ABOVE THE SURFACE (#2102). Neutral, shared, and the
          same trail at every width - see components/nav/Breadcrumb. */}
      <Breadcrumb
        taskId={praxis.task_id}
        taskTitle={praxis.task_title}
        praxisId={praxis.id}
      />

      {/* The toothed vellum, painting the detail COLUMN and not the viewport —
          the site background still shows around the leaf (WORLD_ZERO_STYLE §5,
          the #1028 ruling). `zIndex: 1` also makes this the stacking context the
          lotus below hangs off. */}
      <div
        className="ua-praxis-leaf"
        style={{
          /* The nine roles under this surface's prefix (#2659/#2673).
             DECLARED ON THE LEAF, NOT ON THE WRAPPER ABOVE IT: that wrapper
             also parents the shared neutral `Breadcrumb`, and a surface's
             namespace has no business reaching site chrome. Everything this
             file paints — `AvatarDisc` and the two style objects built above
             included — is inside this column. A seal or a card belonging to a
             DIFFERENT faction may nest here and is unaffected: it declares its
             own surface's prefix, and no two surfaces share one. */
          ...factionRoleVars("ua", "leaf-praxis-detail"),
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          border: "1px solid var(--faction-ua-rule)",
          borderRadius: 18,
          padding: size.pagePad,
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily: UA_TEXT,
          color: "var(--faction-ua-page-text)",
        }}
      >
        {/* The lotus, bleeding off the leaf's own left edge — clipped by this
            column's `overflow: hidden` rather than by the viewport. `zIndex: -1`
            paints it above the column's own ground but beneath its copy: the
            column is positioned and owns the stacking context, so a positioned
            `zIndex: 0` sibling would have sat ON TOP of the static text (§5's
            stacking half). Ornament geometry stays in raw px; its opacity is a
            token, so dark mode lifts it through the cascade. */}
        <Lotus
          size={size.lotus}
          color="var(--faction-ua-card-lotus)"
          style={{
            position: "absolute",
            left: size.lotusLeft,
            top: size.lotusTop,
            zIndex: -1,
            opacity: "var(--faction-ua-card-lotus-opacity)",
            pointerEvents: "none",
          }}
        />

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
            {/* Mobile stacks the rail above the proof — one block each, MOVED,
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-lg)",
                }}
              >
                {asideRest}
              </div>
            )}
          </div>

          {desktop && (
            <aside
              style={{
                flex: `0 0 ${ASIDE_TRACK}px`,
                width: ASIDE_TRACK,
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
            beneath both columns, inside the leaf, and the layout draws the
            heading so the thread does not draw a second one. */}
        <PraxisDetailComments
          state={state}
          heading={sectionHead(t("detail.sections.comments"))}
          style={{ marginTop: size.sectionGap }}
        />
      </div>
    </div>
  );
}
