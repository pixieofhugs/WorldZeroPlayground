/**
 * The Everymen praxis detail — the shared v2 anatomy printed as a FILED
 * DISPATCH (#1123, epic #1085; design project bebdf7c7, `Everymen Praxis
 * Detail.dc.html`).
 *
 * Ruled newsprint under a red margin rule, a cogged masthead band across the
 * head of the sheet, Bebas Neue headlines over a Special Elite byline, Courier
 * Prime chrome and a Lora write-up. Thick-thin double rules separate everything,
 * the way a broadsheet sets its sections.
 *
 * It is the sibling of `EverymenTaskDetail`'s `.em-broadsheet`, not a copy of
 * it: that sheet is where a JOB is posted (rising-sun rays, dashed rules, a
 * stamped wage), this is where the PROOF of one is filed (ruled stock, a margin
 * rule, a typed byline). Same union, two different pieces of paper.
 *
 * ## What this file is, and is not
 *
 * DRESS ONLY. The layout, the slots and their order are
 * {@link ../archetypes/DefaultPraxisDetail}'s contract, which is the reference
 * implementation reconciled to all eight faction designs — read its docstring
 * before changing anything structural here. Three facts from it are load-bearing
 * and are NOT re-derived:
 *
 * - the desktop aside track is **330px** (the Unaffiliated design's 340 is the
 *   outlier);
 * - the **crown renders at both form factors**, always. It arrives inside the
 *   shared `PraxisStatusBanners`, keyed only on `is_top_for_task`. This faction's
 *   design draws `showCrownMobile: false` and that is the outlier too — it is a
 *   canonical mark reading `--fdl-*` (ADR-0054), so a skin may not reposition or
 *   suppress it (owner ruling, 2026-07-28);
 * - the **report card and the steward bar stay outside the costume**.
 *   `PraxisFlagBlock` / `PraxisAdminBar` take `state` and nothing else — there is
 *   no seam to dress them through, by construction — and the flagged/failed
 *   banners keep their neutral `--color-*` tokens and neutral copy here for the
 *   same reason (ADR-0061: content slots carry a skin's
 *   voice, moderation and system chrome do not).
 *
 * ## Copy is the shared neutral `detail.*` set
 *
 * ADR-0061 is back to one neutral block, so this page adds no
 * `detail.everymen.*` keys. The union vocabulary the design draws — THE
 * EVIDENCE, WAGE TALLY, FILED JOINTLY BY, EXTRA DUTIES LOGGED, THE CONTEST, THE
 * FLOOR, UNDER GRIEVANCE, SENT BACK BY THE STEWARD — is recorded on #1123 for a
 * later voiced pass and is deliberately not built. The faction's own name in the
 * masthead is a NAME, not a voice: it comes from `factions:names.everymen`, the
 * same catalog every other surface reads.
 *
 * ## One responsive component, no mobile twin (ADR-0063)
 *
 * `useFormFactor()` picks the size set and collapses the split; `mobilePraxisDetail`
 * was retired outright by #1089. The score and duel blocks are built ONCE and
 * moved by where they are mounted — never drawn twice and hidden.
 *
 * ## Reused, not rebuilt
 *
 * `TaskCrown` (via the shared banners) · `ScoreStamp`, which since #1091 owns the
 * whole score rail — the Everymen rubber-stamp roundel, the ruled rows and the
 * votes tally — so this file only mounts it and builds NO arithmetic of its own
 * (`scoreBreakdown()` is the single authority, ADR-0053) · `VoteUI`, which
 * dispatches to the gearworks widget on the task's faction · `CollabRoster` ·
 * `MediaGallery` · `MetaTaskSeal`, READ-ONLY: the design's add-chips would 422,
 * since `apply_metatask` requires `in_progress` · `DuelCard`, which already
 * narrates live / won-by-default / final and draws nothing on a declined
 * challenge, so the design's single "leads by" reading is not rebuilt here.
 *
 * ## The palette
 *
 * The sheet's stock is `--faction-everymen-sheet-panel`, reused from the
 * broadsheet rather than repainted, because that is the ground the Everymen inks
 * were measured on (§3). The one consequence to keep: `--everymen-red` as INK
 * goes through `--faction-everymen-sheet-accent`, and `--everymen-paper` appears
 * here only as a FILL (the voter bars' track), never as a ground for text — it
 * pays 4.49:1 with the accent in light, which is the wrong side of AA.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import MetaTaskSeal from "../../../components/metaTaskSeal/MetaTaskSeal";
import { CollabRoster } from "../../../components/collab/CollabRoster";
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

// ── The sheet's palette. Every value is a token; the "broadsheet sheet" and
//    "dispatch sheet" blocks in index.css say which are new and which the
//    Everymen family already owned.
/** The sheet's text ink — flips with the theme (`#221a12` → `#f3e7ce`). */
const INK = "var(--everymen-paper-text)";
const MUTED = "var(--everymen-muted)";
/** Red as a RULE or a FILL. For red as text, use {@link ACCENT}. */
const RED = "var(--everymen-red)";
/** Red as INK — the only red that clears AA on this stock in both themes. */
const ACCENT = "var(--faction-everymen-sheet-accent)";
const OLIVE = "var(--everymen-olive)";
/** The printed frame rule. NOT `--everymen-ink`, which vanishes on dark. */
const FRAME = "var(--everymen-frame)";
const HAIR = "var(--faction-everymen-sheet-hair)";
const SHADOW = "var(--faction-everymen-bill-shadow)";
/** The masthead bar, theme-INVARIANT: a paper printed at night is the same paper. */
const MAST = "var(--faction-everymen-bill-mast)";
const MAST_INK = "var(--faction-everymen-bill-mast-ink)";
/** A FILL only — the voter bars' track. Never a ground for text (see docstring). */
const TRACK = "var(--everymen-paper)";

const BEBAS = "var(--font-accent)";
// Courier Prime is the sheet's chrome face and is never named here: every label
// on this page carries `.eyebrow`, which owns the family AND the size (§4).
/** Special Elite — what the report was typed on. */
const TYPED = "var(--font-faction-typewriter)";
/** Lora — the article face; the write-up and the standfirst read in it. */
const PROSE = "var(--font-display)";

/** Ornament geometry — the drawn side of one member's byline plate. */
const PLATE_DESKTOP = 42;
const PLATE_MOBILE = 36;

/**
 * The union cog, set as a typographic glyph (§7 — a drawn character, not an
 * icon library and not an emoji). One size, because it does one job: flanking a
 * label. Ornament, so every caller marks it aria-hidden.
 */
function Cog({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        // eslint-disable-next-line local/no-raw-style-values -- ornament: cog glyph at the design's optical size, flanking a label rather than being read (§4a)
        fontSize: 12,
        lineHeight: 1,
        color,
        flex: "0 0 auto",
      }}
    >
      ⚙
    </span>
  );
}

/** Initials fallback for a member with no uploaded avatar. */
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
 * One member's byline plate: a framed square of panel stock with the initials
 * struck in Bebas. Square, not a disc — this is a filing photo pasted onto a
 * report, and the round discs belong to the Unaffiliated sheet.
 */
function MemberPlate({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        background: "var(--faction-everymen-sheet-panel)",
        border: `2px solid ${FRAME}`,
        borderRadius: 2,
        boxShadow: `2px 2px 0 ${HAIR}`,
        fontFamily: BEBAS,
        fontSize: "var(--text-content)",
        letterSpacing: "0.04em",
        color: ACCENT,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export default function EverymenPraxisDetail({
  state,
}: {
  state: PraxisDetailState;
}) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  const members = orderedMembers(praxis);
  // A collab is a collab at ONE member (#1274). This used to read
  // `members.length > 1`, which hid the whole Members section from a collab
  // nobody had joined yet while the heading still counted them. Tested
  // POSITIVELY: a duel side is `type='solo'` + a `duel_id` (ADR-0011), so
  // `!== 'solo'` would put a roster on every duel (#992).
  const isCollab = praxis.type === "collab";
  // The shared banners draw the roster while a collab is still resolving, so the
  // Members section takes the complement — one roster on the page, never two.
  const rosterInBanners =
    praxis.status === "in_progress" || praxis.status === "pending";

  // ── Shared dress ──
  /** Bebas, tracked out and struck in caps — every label on the sheet. */
  const label: CSSProperties = {
    fontFamily: BEBAS,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  };

  /** Cog · label · thick-thin double rule running out to an optional gloss. */
  const sectionHead = (heading: ReactNode, gloss?: ReactNode): ReactNode => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <Cog color={RED} />
      <span
        style={{
          ...label,
          fontSize: "var(--text-xl)",
          letterSpacing: "0.2em",
          color: INK,
        }}
      >
        {heading}
      </span>
      <span
        aria-hidden
        style={{
          flex: "1 1 20%",
          minWidth: 20,
          height: 4,
          borderTop: `2px solid ${RED}`,
          borderBottom: `1px solid ${RED}`,
        }}
      />
      {gloss}
    </div>
  );

  /**
   * Aside / rail panel chrome, shared by score, duel, vote and voters — a
   * clipping pasted onto the sheet: same stock, printed frame, dropped shadow.
   * The opaque fill is what interrupts the ruled lines behind it.
   */
  const panel: CSSProperties = {
    background: "var(--faction-everymen-sheet-panel)",
    border: `2px solid ${FRAME}`,
    borderRadius: 2,
    boxShadow: SHADOW,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  // ── Navigation: breadcrumb on desktop, back link + label on mobile ─────────
  const breadcrumb = (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <Link
        to="/tasks"
        className="eyebrow"
        style={{
          letterSpacing: "0.2em",
          color: ACCENT,
          textDecoration: "none",
        }}
      >
        {t("detail.breadcrumb.tasks")}
      </Link>
      <span aria-hidden className="eyebrow" style={{ color: MUTED }}>
        /
      </span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="eyebrow"
        style={{
          letterSpacing: "0.2em",
          color: ACCENT,
          textDecoration: "none",
        }}
      >
        {praxis.task_title}
      </Link>
      <span aria-hidden className="eyebrow" style={{ color: MUTED }}>
        /
      </span>
      <span className="eyebrow" style={{ letterSpacing: "0.2em", color: MUTED }}>
        {t("detail.breadcrumb.current")}
      </span>
    </nav>
  );

  // The phone affordance drawn instead of the breadcrumb. Not sticky: the mobile
  // shell already owns a sticky top bar.
  const mobileBar = (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
      }}
    >
      <Link
        to="/praxis"
        className="eyebrow"
        style={{
          letterSpacing: "0.2em",
          color: ACCENT,
          textDecoration: "none",
        }}
      >
        <span aria-hidden>‹ </span>
        {t("detail.back")}
      </Link>
      <span
        className="eyebrow"
        style={{
          flex: 1,
          textAlign: "center",
          letterSpacing: "0.2em",
          color: MUTED,
        }}
      >
        {t("detail.breadcrumb.current")}
      </span>
      {/* Balances the centred label against the back link's width. */}
      <span aria-hidden style={{ width: 44 }} />
    </nav>
  );

  // ── The masthead band — the paper's nameplate, theme-invariant red ─────────
  const masthead = (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-md)",
          padding: "var(--space-sm) var(--space-lg)",
          background: MAST,
          border: `2px solid ${FRAME}`,
          borderRadius: 2,
        }}
      >
        <Cog color={MAST_INK} />
        <span
          style={{
            ...label,
            fontSize: "var(--text-content)",
            letterSpacing: "0.3em",
            color: MAST_INK,
            textAlign: "center",
          }}
        >
          {factionName(praxis.task_faction_slug)}
        </span>
        <Cog color={MAST_INK} />
      </div>
      <div
        aria-hidden
        style={{
          height: 3,
          marginTop: "var(--space-xs)",
          borderTop: `2px solid ${FRAME}`,
          borderBottom: `1px solid ${FRAME}`,
        }}
      />
    </div>
  );

  // ── Moderation banners — NEUTRAL, deliberately outside the costume ─────────
  // ADR-0061: the crown hero, the failed note, the flagged notice and
  // the steward bar read the shared neutral block in every faction's dress. The
  // design voices all four ("UNDER GRIEVANCE", "SENT BACK BY THE STEWARD"); that
  // vocabulary is recorded on the issue and not built.
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

  // ── Byline · headline · owner actions · standfirst ─────────────────────────
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
        {/* One filing plate per member — a collab reads as shared before a
            single name is parsed. A payload with no member rows still credits
            its creator, so the author is always reachable from the byline. */}
        <span style={{ display: "flex", gap: "var(--space-xs)" }}>
          {(members.length > 0
            ? members.map((member) => ({
                id: member.character_id,
                name: member.character_display_name || `#${member.character_id}`,
              }))
            : [
                {
                  id: praxis.created_by_id,
                  name: praxis.created_by_display_name,
                },
              ]
          ).map((author) => (
            <Link key={author.id} to={`/characters/${author.id}`}>
              <MemberPlate
                name={author.name}
                size={desktop ? PLATE_DESKTOP : PLATE_MOBILE}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: TYPED,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: INK,
              textDecoration: "none",
              borderBottom: `2px solid ${RED}`,
            }}
            separatorStyle={{
              fontFamily: TYPED,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: MUTED,
            }}
          />
          <div className="eyebrow" style={{ color: MUTED }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: BEBAS,
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 0.94,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: INK,
          margin: "0 0 var(--space-md)",
          overflowWrap: "anywhere",
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* The standfirst — what this praxis is a doing OF, set between rules. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `2px solid ${RED}`,
          borderBottom: `1px solid ${RED}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span className="eyebrow" style={{ color: MUTED }}>
          {t("detail.taskRef.label")}
        </span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{
            fontFamily: PROSE,
            fontStyle: "italic",
            color: INK,
            textDecoration: "none",
          }}
        >
          {praxis.task_title}
        </Link>
        <span
          className="eyebrow"
          style={{ marginLeft: "auto", color: OLIVE }}
        >
          {t("detail.taskRef.level", { level: praxis.task_level_required })}
          {" · "}
          {t("detail.taskRef.points", { points: praxis.task_point_value })}
        </span>
      </div>
    </>
  );

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's. `ScoreStamp` carries the Everymen
  // rubber-stamp roundel, the ruled leader-line rows and the votes tally — the
  // whole of the design's tally box — so there is no arithmetic here. The
  // design's own sums are NOT built: the model is
  // `(base + meta) × faction_mult + votes`, resolved once by `scoreBreakdown()`
  // inside the stamp (ADR-0014/0047/0053).
  const scoreBlock = (
    <section style={panel}>
      {sectionHead(t("detail.score.heading"))}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* The crown already has its own hero banner above; one mark per page. */}
        <ScoreStamp praxis={praxis} showCrown={false} />
      </div>
    </section>
  );

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  //
  // Self-hides for a praxis with no duel, for a DECLINED challenge and for the
  // run-up, which the composer's waiting surface owns. Panel chrome, section
  // head AND inks are handed in, so the card wears this sheet's dress rather
  // than its own.
  //
  // The inks are the sheet's own (#1153): `--everymen-paper-text` and
  // `--everymen-muted`, the pair `factionContrast.test.ts` measures on this
  // stock, over the printed hairline. `TRACK` is legal as `plate` and ONLY as
  // `plate` — there it is a fill behind a duellist's disc, never a ground for
  // text. No rival faction hue enters: red stays a rule and a fill here.
  const duelBlock: ReactNode = (
    <DuelCard
      state={state}
      style={panel}
      heading={sectionHead(t("duelCrossLink.label"))}
      ink={{ name: INK, total: INK, muted: MUTED, line: HAIR, plate: TRACK }}
    />
  );

  const rail = (
    <>
      {scoreBlock}
      {duelBlock}
    </>
  );

  // ── Vote · voters · flag ──────────────────────────────────────────────────
  const voteBlock = (
    <section style={panel}>
      {sectionHead(t("detail.vote.heading"))}
      <p
        className="content-text"
        style={{
          fontFamily: PROSE,
          fontStyle: "italic",
          margin: "0 0 var(--space-md)",
          color: MUTED,
        }}
      >
        {t("detail.vote.prompt")}
      </p>
      {/* Dispatched on the TASK's faction — the gearworks widget, already
          shipped in `components/vote/` (ADR-0039). */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Per-voter values come straight off `GET /praxes/{id}/voters`. Each voter's
  // rung is a red bar (value / 5) on a newsprint track. NO AVERAGE anywhere
  // (ADR-0014): the standing is the sum and the count, never the mean.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t("detail.voters.heading"),
        <span className="eyebrow" style={{ color: MUTED }}>
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
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: TYPED,
                fontSize: "var(--text-content)",
                color: INK,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 10,
                background: TRACK,
                border: `1px solid ${HAIR}`,
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
                  background: RED,
                }}
              />
            </span>
            <span
              style={{
                width: 20,
                textAlign: "right",
                fontFamily: BEBAS,
                fontSize: "var(--text-content)",
                color: INK,
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
      {/* Mounted BARE. The report card is neutral chrome and takes no dress —
          it accepts no style prop, by construction (ADR-0061). */}
      <PraxisFlagBlock state={state} />
    </>
  );

  // ── Proof · write-up · members · metatasks ────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.sections.proof"))}
      {/* The plate the photographs are pasted onto. */}
      <div
        style={{
          background: "var(--faction-everymen-sheet-panel)",
          border: `2px solid ${FRAME}`,
          borderRadius: 2,
          boxShadow: SHADOW,
          padding: "var(--space-sm)",
        }}
      >
        <MediaGallery
          media={praxis.media_items}
          layout={desktop ? "grid" : "column"}
        />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.sections.writeUp"))}
      <MarkdownPreview
        source={praxis.body_text}
        className="markdown-preview content-text"
        style={{ fontFamily: PROSE, lineHeight: 1.8, color: INK }}
      />
    </section>
  );

  // The design draws a third roster column of per-member contribution labels —
  // "inventory" / "shelving" / "the hours". `PraxisMemberOut` carries no such
  // field, so that column is invented data and is not built (owner ruling on
  // #1123). `CollabRoster` already prints the ruled replacement in that slot:
  // each member's FILED / NOT FILED pill, off `has_submitted`.
  const crew = isCollab && !rosterInBanners && (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
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

  // READ-ONLY, by construction. `MetaTaskSeal` omits the peel control and the
  // add slot when it gets neither `removable` nor `onAdd`, and each seal wears
  // its ISSUING faction's dress. The design's add-chips are deliberately absent:
  // `apply_metatask` requires `status == in_progress`, so every chip would 422.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.metatasks.heading"))}
      <MetaTaskSeal metatasks={praxis.applied_metatasks} />
    </section>
  );

  return (
    <div className="py-8" style={{ position: "relative", color: INK }}>
      {desktop ? breadcrumb : mobileBar}

      {/* The dispatch sheet — ruled newsprint under a red margin rule
          (index.css). It paints the detail COLUMN, not the viewport: the site
          background still shows around the component (WORLD_ZERO_STYLE §5, the
          #1028 ruling). The margin rule is a background layer of `.em-dispatch`,
          which is why nothing here is positioned over the copy. */}
      <div
        className="em-dispatch"
        style={{
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          border: `2px solid ${FRAME}`,
          borderRadius: 2,
          padding: desktop ? "var(--space-2xl)" : "var(--space-xl)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {masthead}

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

        {/* The third layout region (ADR-0061): comments sit beneath both
            columns, inside the sheet, under the page's own dressed section head
            so the thread does not draw a second one (the #1029 trap). */}
        <PraxisDetailComments
          state={state}
          heading={sectionHead(t("detail.sections.comments"))}
          style={{
            marginTop: desktop ? "var(--space-2xl)" : "var(--space-xl)",
          }}
        />
      </div>
    </div>
  );
}
