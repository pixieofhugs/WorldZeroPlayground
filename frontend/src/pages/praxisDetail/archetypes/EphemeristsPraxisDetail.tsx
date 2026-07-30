/**
 * The Ephemerists praxis detail — THE CANONICAL RECORD (praxis detail v2, #1120,
 * epic #1085; design project bebdf7c7, `Ephemerists Praxis Detail.dc.html`).
 *
 * Dress over the shared layout, not a layout of its own. `DefaultPraxisDetail`
 * is the reference implementation and the contract; read it there rather than
 * re-deriving it here. What this file adds is the Valley plate at record size:
 * the same Deco × Egypt metaphor the v2 task card (#1023) and task detail
 * (#1032) wear, turned from a posting into the account of a deed done. A cavetto
 * cornice under a night band of incised registers, a winged sun disc, stepped
 * octagon bylines, small caps for every label, and the write-up on a leaf with
 * an ochre margin rule. Poiret One display, Cinzel small caps, Spectral reading,
 * EB Garamond marginalia — the issue's four faces, all four already in the
 * `index.html` loader.
 *
 * The one piece of motion is the slow gold bloom on the cornice
 * (`.eph-cornice-glow`, index.css). Its pigment, cycle and reduced-motion gate
 * live in the stylesheet; this file reserves the layer via `<Cornice glow />`.
 *
 * ## The contract this dresses (verified in code, #1129 — not re-derived)
 *
 * - Desktop: main column + a **330px** aside, comments spanning beneath both.
 *   The duel panel (aside) and the comments region are the page's own slots,
 *   not dispatcher mounts (ADR-0064).
 * - Mobile: one stacked column, with score and duel moved above the proof. ONE
 *   responsive component — `useFormFactor()` internally, no mobile twin
 *   (ADR-0063; `mobilePraxisDetail` was retired outright by #1089). Score and
 *   duel are built ONCE and moved by where they are mounted, never drawn twice
 *   and hidden.
 * - **The crown renders at both form factors.** It is never form-factor gated —
 *   it comes from the shared `PraxisStatusBanners`, keyed on `is_top_for_task`.
 * - **The report card and the steward bar are NOT dressed.** `PraxisFlagBlock`
 *   and `PraxisAdminBar` take `state` and nothing else and are mounted bare,
 *   wearing none of the plate dress every panel beside them wears. All eight
 *   faction designs draw them that way, deliberately outside the costume.
 *
 * ## Copy — none. ADR-0061, unamended
 *
 * EVERY string on this page comes from the shared neutral `detail.*` block. The
 * design's words — the write-up ("Canonical record"), the duel ("The
 * disputation") and the owner cluster ("Amend the record") — are **recorded on
 * #1118, not built**: the amendment that would have voiced them was written and
 * withdrawn the same day (2026-07-28), and this skin was corrected back. What
 * the Ephemerists bring here is frame, type, ornament and motion.
 *
 * Three further design strings were never built, and none is an omission:
 *
 * - **The owner label ("Amend the record").** It is the only slot with no
 *   neutral twin, and a neutral heading there would restate the "edit this
 *   praxis" link directly beneath it. The label is dropped and the cluster is
 *   mounted bare, as on the other seven skins.
 *
 * - **The score rows ("Base" / "Concord").** `ScoreStamp` has carried the whole
 *   score rail since #1091 — disc, ruled rows, votes tally — dispatched on the
 *   task's faction, so this page mounts `EphemeristsScoreStamp` and adds nothing.
 *   Its rows read the SHARED `card.stamp.*` vocabulary, which the praxis card
 *   reads too; re-labelling the votes row "Concord" here would fork one number's
 *   name between two surfaces showing the same number. The concordance is not
 *   lost: the voters panel below reads each vote back in the faction's own tier
 *   words through the shipped `reframeLabel`, in roman numerals as
 *   `VOTE_REFRAMES` already specifies for this faction.
 * - **The comment composer's post button ("Inscribe").** The composer dispatches
 *   on the VIEWER's faction, not the page's — it is the author speaking, which
 *   ADR-0061 keeps out of scope for a page skin. `EphemeristsComment` already
 *   prompts "inscribe a note in the margin"; a page skin may not reach into it.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` (via the shared banners) · `ScoreStamp` · `DuelCard`, which
 * narrates outcomes only and draws nothing on a declined challenge · the
 * Ephemerists' own `VoteUI` widget · `CollabRoster` · `MediaGallery` ·
 * `MetaTaskSeal`, read-only: `apply_metatask` requires `in_progress`, so the
 * design's add-chips would 422 on every tap · `CommentThread` via
 * `PraxisDetailComments` with the heading handed in, so one list carries one
 * heading (the #1029 trap).
 *
 * Every colour is a `--faction-ephemerists-plate-*` token; light/dark flips
 * through the `[data-theme="dark"]` cascade, never a ternary. `-brass` is a rule
 * colour and never an ink; quiet type takes `-quiet`, which clears AA on the
 * page ground, the plate AND the panel cells (see index.css). The page surface
 * is carried by the COLUMN, not the viewport — the site background still shows
 * around the component (WORLD_ZERO_STYLE §5, the #1028 ruling).
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI from "../../../components/vote/VoteUI";
import { reframeLabel } from "../../../components/vote/voteReframes";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import MetaTaskSeal from "../../../components/metaTaskSeal/MetaTaskSeal";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { toRoman } from "../../../utils/roman";
import {
  BRASS,
  CAPS,
  CAPTION,
  Cornice,
  DECO,
  DISC,
  FlutedRule,
  GlyphRegister,
  INK,
  INNER,
  LINE,
  MARGINALIA,
  NILE,
  OCHRE,
  Octagon,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  SMALL_CAPS,
  Sign,
  WASH,
  WingedDisc,
  BAND,
  BAND_INK,
  BRASS_LIGHT,
} from "../../../components/cards/ephemeristsPlate";
import { DuelCard } from "../DuelCard";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { factionName } from "../../../utils/factions";
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisDetailComments,
  MemberByline,
  orderedMembers,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";

/** The page cap the epic settled on, and the aside track. Geometry. */
const PAGE_WIDTH = 1200;
const ASIDE_WIDTH = 330;

interface SizeSet {
  /** Masthead band height, and the width its registers are drawn to fill. */
  masthead: number
  mastheadView: number
  /** The masthead's winged disc. Geometry. */
  wordmarkDisc: number
  /** A byline octagon. Geometry. */
  disc: number
  titleSize: string
  pagePadding: string
  /** The space below a content section. */
  sectionGap: string
  /** Where the ochre margin rule is struck on the record leaf. Geometry. */
  marginRule: number
  leafPadding: string
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    masthead: 84,
    mastheadView: 1200,
    wordmarkDisc: 150,
    disc: 46,
    titleSize: "var(--text-display)",
    pagePadding: "var(--space-2xl)",
    sectionGap: "var(--space-2xl)",
    marginRule: 26,
    leafPadding: "var(--space-xl) var(--space-xl) var(--space-lg) var(--space-3xl)",
  },
  mobile: {
    masthead: 68,
    mastheadView: 440,
    wordmarkDisc: 124,
    disc: 40,
    titleSize: "var(--text-heading)",
    pagePadding: "var(--space-lg)",
    sectionGap: "var(--space-xl)",
    marginRule: 18,
    leafPadding: "var(--space-lg) var(--space-lg) var(--space-md) var(--space-xl)",
  },
};

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
 * One author's monogram, struck in a stepped octagon cartouche. Collab bylines
 * set these in a row, so a shared record reads as shared before a single name is
 * parsed.
 */
function AuthorOctagon({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "block",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <Octagon inset={0} stroke={BRASS} width={2} fill={DISC} />
        <Octagon inset={7} stroke={BRASS_LIGHT} width={0.8} />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: CAPS,
          fontWeight: 500,
          fontSize: "var(--text-md)",
          letterSpacing: "0.08em",
          color: INK,
        }}
      >
        {initialsOf(name)}
      </span>
    </span>
  );
}

export default function EphemeristsPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  const members = orderedMembers(praxis);
  const isCollab = members.length > 1;

  // A payload with no member rows still credits its creator, so the byline is
  // never empty and the author is always reachable from it. Initials only:
  // `PraxisOut` carries no avatar for either a member or the creator (that field
  // is the CARD payload's, `PraxisCardOut.created_by_avatar_url`), and a
  // monogram cut into a cartouche is the plate's own answer anyway.
  const authors =
    members.length > 0
      ? members.map((member) => ({
          id: member.character_id,
          name: member.character_display_name || `#${member.character_id}`,
        }))
      : [{ id: praxis.created_by_id, name: praxis.created_by_display_name }];

  /** The page-ground label voice. `-quiet`: the caption gold is measured on the
   *  PLATE and does not clear on the darker page this surface introduces. */
  const eyebrow: CSSProperties = {
    ...SMALL_CAPS,
    fontSize: "var(--text-sm)",
    color: QUIET,
  };
  /** The same label voice on a panel cell, where the caption gold clears. */
  const plateEyebrow: CSSProperties = { ...eyebrow, color: CAPTION };
  /** Marginalia — EB Garamond italic, the plate's quiet aside voice. */
  const gloss: CSSProperties = {
    fontFamily: MARGINALIA,
    fontStyle: "italic",
    fontSize: "var(--text-content)",
    lineHeight: 1.6,
    color: QUIET,
  };

  /** Aside / rail panel chrome, shared by score, duel, vote and voters. */
  const panel: CSSProperties = {
    background: PLATE,
    border: `1px solid ${LINE}`,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  /** Small caps, a brass hairline running out, an optional gloss, a fluted rule. */
  const sectionHead = (label: ReactNode, trailing?: ReactNode) => (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-sm)",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            ...SMALL_CAPS,
            fontWeight: 600,
            fontSize: "var(--text-md)",
            color: INK,
            margin: 0,
            flex: "0 0 auto",
          }}
        >
          {label}
        </h2>
        <span aria-hidden style={{ flex: 1, minWidth: 24, height: 1, background: BRASS, opacity: 0.5 }} />
        {trailing}
      </div>
      <FlutedRule />
    </div>
  );

  // ── The masthead: night band, one incised register, the winged disc ───────
  //
  // Shorter than the task page's: a record is filed ON the plate, not the plate
  // itself, so it carries one register rather than two.
  const masthead = (
    <div>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          height: size.masthead,
          background: BAND,
          color: BAND_INK,
        }}
      >
        <svg
          width="100%"
          height={size.masthead}
          viewBox={`0 0 ${size.mastheadView} 84`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <path
            d={`M8 20 H${size.mastheadView - 8} M8 64 H${size.mastheadView - 8}`}
            stroke={BRASS_LIGHT}
            strokeWidth="0.6"
            opacity="0.28"
          />
          <GlyphRegister width={size.mastheadView} y={72} strength={0.3} keyPrefix="rec" />
        </svg>
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-xs)",
          }}
        >
          <WingedDisc width={size.wordmarkDisc} height={32} />
          <span
            style={{
              fontFamily: DECO,
              fontSize: "var(--text-lg)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: BAND_INK,
              whiteSpace: "nowrap",
            }}
          >
            {factionName(praxis.task_faction_slug)}
          </span>
        </div>
      </div>
      <Cornice glow />
    </div>
  );

  // ── Navigation: breadcrumb on desktop, back link + label on mobile ────────
  //
  // Inside the sheet, under the cornice — the plate is headed by its masthead,
  // so a crumb floating above it would read as belonging to the page around it.
  const breadcrumb = (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-lg)",
        flexWrap: "wrap",
      }}
    >
      <Link to="/tasks" style={{ ...eyebrow, color: NILE, textDecoration: "none" }}>
        {t("detail.breadcrumb.tasks")}
      </Link>
      <span aria-hidden style={eyebrow}>
        /
      </span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        style={{ ...eyebrow, color: NILE, textDecoration: "none" }}
      >
        {praxis.task_title}
      </Link>
      <span aria-hidden style={eyebrow}>
        /
      </span>
      {/* The cartouche — this record, ruled off at both ends. */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-xs) var(--space-md)",
          border: `1.5px solid ${BRASS}`,
          borderRadius: 12,
          background: WASH,
        }}
      >
        <span aria-hidden style={{ width: 1.5, height: 12, background: BRASS }} />
        <span style={{ ...SMALL_CAPS, fontWeight: 700, fontSize: "var(--text-base)", color: INK }}>
          {t("detail.breadcrumb.current")}
        </span>
        <span aria-hidden style={{ width: 1.5, height: 12, background: BRASS }} />
      </span>
    </nav>
  );

  // The phone affordance drawn instead of the breadcrumb. Not sticky: the
  // mobile shell already owns a sticky top bar.
  const mobileBar = (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <Link to="/praxes" style={{ ...eyebrow, color: NILE, textDecoration: "none" }}>
        <span aria-hidden>‹ </span>
        {t("detail.back")}
      </Link>
      <span style={{ ...eyebrow, flex: 1, textAlign: "center", color: INK }}>
        {t("detail.breadcrumb.current")}
      </span>
      {/* Balances the centred label against the back link's width. */}
      <span aria-hidden style={{ width: 44 }} />
    </nav>
  );

  // ── Moderation banners — NEUTRAL CHROME, undressed ───────────────────────
  // The crown hero and the failed note are shared invariant chrome; the flagged
  // notice has no shared slot, so it renders here, on `--color-*` tokens and the
  // shared neutral words exactly as `DefaultPraxisDetail` draws it (ADR-0061 as
  // amended). `PraxisAdminBar` is the steward bar and takes no dress.
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
          <span className="eyebrow" style={{ color: "var(--color-warning)" }}>
            {t("detail.banners.flaggedLabel")}
          </span>
          <span className="font-body content-text" style={{ color: "var(--color-text-secondary)" }}>
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
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          {authors.map((author) => (
            <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
              <AuthorOctagon name={author.name} size={size.disc} />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {members.length > 0 ? (
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: READING,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
              }}
            />
          ) : (
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: READING,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
              }}
            >
              {praxis.created_by_display_name}
            </Link>
          )}
          <div style={{ ...eyebrow, marginTop: "var(--space-xs)" }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: DECO,
          fontWeight: 400,
          fontSize: size.titleSize,
          lineHeight: 1.16,
          letterSpacing: "0.02em",
          margin: "0 0 var(--space-lg)",
          color: INK,
          overflowWrap: "anywhere",
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      {/* The author's own hand on their own record. The design labels this
          cluster ("Amend the record"); that label was the ONE slot with no
          neutral twin, and a neutral heading here would only restate the
          "edit this praxis" link an inch below it — the near-synonym growth
          ADR-0061 exists to prevent. So the label is gone and the cluster is
          mounted bare, as it is on the other seven skins. The controls inside
          are the shared invariant ones and render nothing for a non-owner. */}
      <PraxisOwnerActions state={state} />

      {/* Task reference — what this record is a record OF. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `1px solid ${LINE}`,
          borderBottom: `1px solid ${LINE}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <Sign name="djed" size={14} color={BRASS} />
        <span style={eyebrow}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ fontFamily: READING, color: NILE, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...eyebrow, marginLeft: "auto" }}>
          {t("detail.taskRef.level", { level: praxis.task_level_required })}
          {" · "}
          {t("detail.taskRef.points", { points: praxis.task_point_value })}
        </span>
      </div>
    </>
  );

  // ── Score (built once; aside on desktop, above the proof on mobile) ───────
  //
  // ONE readout, and it is not this file's. `ScoreStamp` carries the whole score
  // rail — struck mark, ruled rows and votes tally — dispatched on the task's
  // faction, which lands `EphemeristsScoreStamp` here. The design's own
  // arithmetic is NOT built: the model is `(base + meta) × faction_mult + votes`
  // (ADR-0014/0047/0053), resolved once by `scoreBreakdown()` inside the stamp.
  const scoreBlock = (
    <section style={panel}>
      {sectionHead(t("detail.score.heading"))}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* The crown already has its own hero banner above; one mark per page. */}
        <ScoreStamp praxis={praxis} showCrown={false} />
      </div>
    </section>
  );

  // ── The disputation (built once; aside on desktop, above the proof on mobile)
  //
  // `DuelCard` self-hides for a praxis with no duel, for a DECLINED challenge —
  // where there is no duel to read out and the praxis scores as an ordinary solo
  // (ADR-0011) — and for the run-up, which the composer's waiting surface owns
  // (#1071/ADR-0059). Panel chrome, section head AND inks are handed in, so the
  // card wears the plate rather than its own dress.
  //
  // The inks are the plate's own family (#1153) — `INK` and `QUIET`, the pair
  // every other block on this surface reads, with `QUIET` already walked down
  // until it clears on all three of this page's grounds (#1028). Nothing takes
  // the rival's faction hue: brass and lapis are structure here, not ink.
  const duelBlock = (
    <DuelCard
      state={state}
      style={panel}
      heading={sectionHead(t("duelCrossLink.label"))}
      ink={{ name: INK, total: INK, muted: QUIET, line: LINE, plate: INNER }}
    />
  );

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  );

  // ── Vote · voters · flag ─────────────────────────────────────────────────
  const voteBlock = (
    <section style={panel}>
      {sectionHead(t("detail.vote.heading"))}
      <p style={{ ...gloss, margin: "0 0 var(--space-md)" }}>{t("detail.vote.prompt")}</p>
      {/* Dispatched on the TASK's faction — the Ephemerists' own night-plate
          constellation widget, already shipped in `components/vote/`. */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already
  // fetched by `usePraxisDetail`. Each vote is read back in the faction's own
  // tier word through the shipped `reframeLabel`, and its value as a roman
  // numeral — `VOTE_REFRAMES` already declares `numeral: 'roman'` for this
  // faction, so neither the words nor the numeral system is invented here. NO
  // AVERAGE anywhere (ADR-0014): the standing is the sum and the count.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t("detail.voters.heading"),
        <span style={plateEyebrow}>{t("detail.voters.count", { count: voters.length })}</span>,
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)" }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              style={{
                flex: "0 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: READING,
                fontSize: "var(--text-content)",
                color: INK,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span aria-hidden style={{ flex: 1, minWidth: 10, height: 1, background: LINE }} />
            <span style={{ ...gloss, flexShrink: 0 }}>
              {reframeLabel(praxis.task_faction_slug, voter.value)}
            </span>
            <span
              style={{
                fontFamily: DECO,
                fontSize: "var(--text-content)",
                color: INK,
                flexShrink: 0,
              }}
            >
              {toRoman(voter.value)}
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
      {/* NOT dressed, on purpose — see the header. */}
      <PraxisFlagBlock state={state} />
    </>
  );

  // ── Proof · the canonical record · members · metatasks ────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.sections.proof"))}
      <div
        style={{
          background: INNER,
          border: `1px solid ${LINE}`,
          outline: `1px solid ${BRASS_LIGHT}`,
          outlineOffset: 3,
          padding: "var(--space-sm)",
        }}
      >
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </section>
  );

  // The record itself, set on a leaf with an ochre margin rule struck down the
  // gutter. Deliberately WITHOUT the task page's horizontal journal ruling: this
  // body is markdown, so headings and lists break the single leading the ruling
  // has to register against, and a rule that misses its baselines reads as a
  // printing fault rather than as stationery.
  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.sections.writeUp"))}
      <div
        style={{
          position: "relative",
          background: PLATE,
          border: `1px solid ${LINE}`,
          padding: size.leafPadding,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: size.marginRule,
            width: 1,
            background: OCHRE,
            opacity: 0.5,
          }}
        />
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: READING, lineHeight: 1.85, color: INK }}
        />
      </div>
    </section>
  );

  // No status guard on the roster. `DefaultPraxisDetail` still complements a
  // banner roster that #1089 deleted — the shared banners only drew one for
  // `in_progress` / `pending`, both of which ADR-0062 redirects to the composer,
  // so the condition is dead on a page that renders at all. One roster, always.
  const crew = isCollab && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.sections.members"))}
      <CollabRoster
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </section>
  );

  // READ-ONLY, by construction. `MetaTaskSeal` omits the peel control and the add
  // slot when it gets neither `removable` nor `onAdd`, and each seal wears its
  // ISSUING faction's dress (#927/#933). The design's add-chips are deliberately
  // absent: `apply_metatask` requires `status == in_progress`, so every chip
  // would 422 on tap.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead(t("detail.metatasks.heading"))}
      <MetaTaskSeal metatasks={praxis.applied_metatasks} />
    </section>
  );

  return (
    <div className="py-8">
      {/* The page IS the plate: the column carries the papyrus, headed by the
          cornice masthead flush to its own edges. There is deliberately no fixed
          full-bleed backdrop — see the `.eph-plate-sheet` note in index.css for
          what that pattern does to the sidebar beside it. */}
      <div
        className="eph-plate-sheet"
        style={{
          maxWidth: PAGE_WIDTH,
          margin: "0 auto",
          boxSizing: "border-box",
          color: INK,
          border: `1px solid ${LINE}`,
          boxShadow: SHADOW,
        }}
      >
        {masthead}

        <div style={{ padding: size.pagePadding }}>
          {desktop ? breadcrumb : mobileBar}

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
                  flex: `0 0 ${ASIDE_WIDTH}px`,
                  width: ASIDE_WIDTH,
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
              beneath both columns, inside the plate, and the layout draws the
              heading so the thread does not draw a second one. */}
          <PraxisDetailComments
            state={state}
            heading={sectionHead(t("detail.sections.comments"))}
            style={{ marginTop: size.sectionGap }}
          />
        </div>
      </div>
    </div>
  );
}
