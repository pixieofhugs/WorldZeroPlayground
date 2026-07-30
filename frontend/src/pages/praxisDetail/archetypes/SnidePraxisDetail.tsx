/**
 * S.N.I.D.E. — THE PASTE-UP (praxis detail v2, #1118, epic #1085).
 *
 * The shared praxis-detail anatomy (`DefaultPraxisDetail`, ADR-0061) in
 * S.N.I.D.E.'s dress: somebody's proof flyposted on the faction's xerox wall.
 * Receipts pasted up under a censor rule, a headline cut word by word from four
 * faces, clippings taped along the rail, and the score and the meter bolted to a
 * black plate. Anton, Archivo Black, Special Elite and Permanent Marker all
 * appear, because a ransom note mixes faces by definition; the grain is the
 * wall's own raster plus each clipping's photocopier screen.
 *
 * ## The layout is the contract, not this file's invention
 *
 * Taken whole from the reference build and NOT re-derived (#1129 verified each
 * against the eight faction designs):
 *
 * - Desktop — breadcrumb, then main column + a **330px** aside, then a comments
 *   region beneath both. Mobile — one stacked column, back link instead of the
 *   breadcrumb, score and duel moved above the proof.
 * - Main: banners · byline · title · owner actions · task reference · proof ·
 *   write-up · crew · metatasks. Aside: score · duel · vote · voters · flag.
 * - **The crown renders at both form factors.** It is never form-factor gated —
 *   it comes from the shared `PraxisStatusBanners`, keyed on `is_top_for_task`,
 *   mounted above the split so both layouts get it.
 * - **ONE responsive component** (ADR-0063 — this surface's own; ADR-0056/0058
 *   are the same collapse on task cards and task detail): `useFormFactor()`
 *   picks the size set and collapses the split. The score and duel blocks are
 *   built once and MOVED by where they are mounted, never drawn twice and
 *   hidden.
 * - **The duel panel and the comment thread are LAYOUT SLOTS this archetype
 *   mounts** (ADR-0064), not dispatcher chrome. Nothing is mounted around the
 *   page any more, so forgetting either drops it entirely.
 *
 * ## No voice — dress only (ADR-0061)
 *
 * EVERY string on this page reads the shared neutral `detail.*` block. This
 * faction's words — "Receipts" over the proof, "Posted together by" over the
 * crew, "Extras taken" over the seals, "Your call" / "Who called it" on the
 * vote pair — are **recorded on #1119, not built**: the amendment that would
 * have voiced them was written and withdrawn the same day (2026-07-28), and
 * this skin was corrected back. S.N.I.D.E. brings the paste-up, the type, the
 * tape and the tilt; not a word.
 *
 * **Nothing takes the costume's words, and moderation does not take its dress
 * either.** The crown, flagged and failed banners, the steward bar, the report
 * card and the errors wear neutral `--color-*` tokens — the platform speaking,
 * which has to read identically on all nine pages. `PraxisFlagBlock` and
 * `PraxisAdminBar` are mounted BARE for that reason: they take `state` and
 * nothing else, so there is no seam to dress them through, and the design draws
 * them outside the costume exactly as the other seven do. The design's own
 * moderation words ("Pulled for review", "Kicked back", "Ratchet") are dress
 * notes, not authority — see the owner's caveat on #1118.
 *
 * ## Reused, not rebuilt
 *
 * `ScoreStamp` — which since #1091 carries the WHOLE score rail (the struck tag,
 * the ruled rows, the votes tally), so this file only mounts it and never
 * re-derives a term; `scoreBreakdown()` is the single authority (ADR-0053) and
 * the design's own arithmetic is not built · `VoteUI`, dispatching to
 * `SnideVote`'s amp meter · `CollabRoster` · `MediaGallery` · `MetaTaskSeal`,
 * READ-ONLY (`apply_metatask` requires `in_progress`, so an add chip would 422)
 * · `DuelCard`, which already implements three readings — live / won by default
 * / final — and draws nothing at all on `declined`; it is mounted, not
 * re-narrated, and no copy near it mentions stakes (S.N.I.D.E.'s duel loss
 * modifier is 0.0, ADR-0053, so any "you keep at least…" line would be a lie) ·
 * `PraxisDetailComments` with the heading handed in, which suppresses the
 * thread's own `{n} comments` `<h3>` (the #1029 two-headings trap). Comment ROWS
 * stay dispatched on `comment.author.faction_slug` — a Coven player's comment
 * reads Coven on this page, and ADR-0061 protects that explicitly.
 *
 * ## Two grounds, and which block gets which is a MEASUREMENT, not a taste call
 *
 * The wall (`.snd-detail-sheet`, shared with the task-detail column so the two
 * pages cannot drift) and the paper clippings on it both FLIP under
 * `[data-theme="dark"]`. The black plate does not. The rule:
 *
 * - **A block whose ink this file does not control gets the stock that ink was
 *   measured on.** The vote summary paints `--color-text-secondary`, which flips
 *   with the theme and so needs a ground that flips with it: a paper clipping.
 *   `DuelCard` was the same case until #1153 gave it an `ink` seam — this file
 *   now hands it `--faction-snide-note-*`, and the clipping is the stock THAT
 *   family was measured on, so the block lands on the same ground for the
 *   stronger reason. The rule is unchanged; only who owns the ink is.
 * - **S.N.I.D.E.'s own always-dark widgets keep their ink stock.** The evidence
 *   tag (`SnideScoreStamp`) is acid on a `rgba(0,0,0,0.4)` well and the amp face
 *   is a black chassis with acid/vote-off captions; on cream paper the acid
 *   caption falls to 2.6:1. They are bolted to `--faction-snide-card-bg`, the
 *   photocopier ink the praxis card already prints them on, where acid measures
 *   15.7:1. This is WORLD_ZERO_STYLE §3's "a new ground invalidates every
 *   contrast claim measured on the old one" applied before the fact.
 *
 * The corollary is the faction's standing rule: **acid and pink are held as a
 * ring, a rule or a bar on paper, never as ink.** Acid is text only on the black
 * plate. Pink appears as ink only through `--faction-snide-note-pink-ink`, the
 * AA-walked member of the clipping family (5.4:1 on paper, 7.1:1 in dark).
 *
 * The ground belongs to the COLUMN, not the viewport (§5, the #1028 ruling): the
 * site background still shows around the page, which is why `.snide-backdrop`'s
 * `position: fixed` mount is not the one used here.
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

const IMPACT = "var(--faction-snide-font-impact)"; /* Anton */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARK = "var(--faction-snide-font-marker)"; /* Permanent Marker */

/** The clipping family — stock and inks. These FLIP under the dark cascade. */
const PAPER = "var(--faction-snide-note-paper)";
const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
const RULE = "var(--faction-snide-note-rule)";
/** The pink that is TEXT (AA-walked on the clipping stock, both themes). */
const PINK_INK = "var(--faction-snide-note-pink-ink)";
/** The pink that is a DRAWN LINE or FILL — pen circle, tally bar. Invariant. */
const PINK = "var(--faction-snide-pink)";
/** Photocopier black that does NOT flip: borders printed on invariant stock. */
const HARD = "var(--faction-snide-ink)";
/** Warm xerox stock that does NOT flip — the notebook insert taped on. */
const STOCK = "var(--faction-snide-paper)";
/** The black plate S.N.I.D.E.'s always-dark widgets are bolted to. */
const PLATE = "var(--faction-snide-card-bg)";
const PLATE_TEXT = "var(--faction-snide-card-text)";
const PLATE_MUTED = "var(--faction-snide-card-muted)";
/** Acid is INK only on the plate; on paper it is a rule or a fill. */
const ACID = "var(--faction-snide-acid)";

/** The photocopier screen every clipping is printed through. */
const GRAIN =
  "repeating-linear-gradient(0deg, var(--faction-snide-note-grain) 0 1px, transparent 1px 3px)";

/**
 * The four sources a headline is cut from — the same four `SnideTaskCard` and
 * `SnideTaskDetail` use, so one string cuts identically wherever it appears. A
 * word takes its cut by index off the praxis's own id, so no two neighbours
 * share a face. Cut 2 is a knockout and names its own pair rather than reusing
 * paper/ink: those two swap under the dark cascade, and a knockout that swaps
 * with its ground is an invisible word.
 *
 * IT RESTYLES WORDS, IT NEVER EATS THEM. The design's redaction bars belong on
 * the `.snd-censor` rule, never over a string a player wrote (#1023's ruling,
 * restated on `SnideTaskDetail`).
 */
const CUTS: CSSProperties[] = [
  { fontFamily: IMPACT, color: INK, textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: IMPACT,
    color: "var(--faction-snide-note-cta-ink)",
    background: ACID,
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: BLACK,
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the knockout's 1px bleed IS the drawn cut; a 4px rung fattens it into a label chip.
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: a cut's size is RELATIVE to the headline it was pasted into, not a tier of the type scale.
    fontSize: "0.8em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: TYPE,
    color: INK,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above; the smallest cut, clipped from body copy rather than a headline.
    fontSize: "0.7em",
    textTransform: "uppercase",
    borderBottom: `3px solid ${PINK}`,
    transform: "rotate(1.2deg)",
  },
];

/** A tiled strip of redaction blocks. `.snd-censor` owns its pigments (#1023). */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

/** Initials fallback for a poster with no uploaded avatar. */
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
 * One poster's photo corner: a square of invariant xerox stock, printed black
 * initials, tacked on at an angle. Squares, not discs — nothing on this wall is
 * rounded. Both pigments are theme-invariant, so the chip measures 16.8:1 in
 * either theme without the cascade having to agree with the wall behind it.
 */
function PosterChip({ name, size, tilt }: { name: string; size: number; tilt: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        boxSizing: "border-box",
        background: STOCK,
        border: `2px solid ${HARD}`,
        color: HARD,
        fontFamily: IMPACT,
        fontSize: "var(--text-xl)",
        lineHeight: 1,
        transform: `rotate(${tilt}deg)`,
        boxShadow: `3px 3px 0 ${PINK}`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export default function SnidePraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  const members = orderedMembers(praxis);
  // `CollabRoster` returns null below two members, so this only gates the head.
  const isCollab = members.length > 1;

  /** Special Elite, uppercase, wide — every micro-label on the wall. */
  const eyebrow: CSSProperties = {
    fontFamily: TYPE,
    fontSize: "var(--text-sm)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: MUTED,
  };

  /** A taped-up clipping: xerox stock, raster grain, hard printed shadow. */
  const clipping: CSSProperties = {
    background: PAPER,
    backgroundImage: GRAIN,
    border: `2px solid ${INK}`,
    boxShadow: "var(--faction-snide-note-shadow)",
    color: INK,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  /** The black plate. See the header: this ground is a measurement, not dress. */
  const plate: CSSProperties = {
    background: PLATE,
    border: `2px solid ${ACID}`,
    boxShadow: "var(--faction-snide-note-shadow)",
    color: PLATE_TEXT,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  /**
   * A slab headline with a rule running out of it. The rule differs by ground:
   * `.snd-censor`'s blocks are photocopier ink, which is invisible ON the black
   * plate, so a plate head takes a broken acid rule instead.
   */
  const sectionHead = (
    label: ReactNode,
    options: { onPlate?: boolean; big?: boolean; trailing?: ReactNode } = {},
  ) => {
    const { onPlate = false, big = false, trailing } = options;
    return (
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
            fontFamily: IMPACT,
            fontSize: big
              ? desktop
                ? "var(--text-heading)"
                : "var(--text-title)"
              : "var(--text-title)",
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            color: onPlate ? ACID : INK,
          }}
        >
          {label}
        </span>
        {onPlate ? (
          <span
            aria-hidden="true"
            style={{
              flex: "1 1 20%",
              minWidth: 24,
              height: 3,
              background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
            }}
          />
        ) : (
          <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
        )}
        {trailing}
      </div>
    );
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
        style={{
          ...eyebrow,
          color: INK,
          textDecoration: "none",
          borderBottom: "2px solid var(--faction-snide-acid-deep)",
        }}
      >
        {t("detail.breadcrumb.tasks")}
      </Link>
      <span aria-hidden="true" style={eyebrow}>
        /
      </span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        style={{
          ...eyebrow,
          color: INK,
          textDecoration: "none",
          borderBottom: "2px solid var(--faction-snide-acid-deep)",
        }}
      >
        {praxis.task_title}
      </Link>
      <span aria-hidden="true" style={eyebrow}>
        /
      </span>
      <span style={eyebrow}>{t("detail.breadcrumb.current")}</span>
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
      <Link to="/praxis" style={{ ...eyebrow, color: INK, textDecoration: "none" }}>
        <span aria-hidden="true">‹ </span>
        {t("detail.back")}
      </Link>
      <span style={{ ...eyebrow, flex: 1, textAlign: "center" }}>
        {t("detail.breadcrumb.current")}
      </span>
      {/* Balances the centred label against the back link's width. */}
      <span aria-hidden="true" style={{ width: 44 }} />
    </nav>
  );

  // ── Moderation chrome — NEUTRAL, outside the costume ──────────────────────
  // The crown hero and the failed note come from the shared banners; the flagged
  // notice has no shared slot and is drawn here, on the same neutral warning
  // tokens and the same shared `detail.banners.*` copy every other skin reads.
  // `PraxisAdminBar` is the steward bar, mounted bare.
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
        {/* One photo corner per poster — a collab reads as shared before a
            single name is parsed. A payload with no member rows still credits
            its creator, so the author is always reachable from the byline. */}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          {(members.length > 0
            ? members.map((member) => ({
                id: member.character_id,
                name: member.character_display_name || `#${member.character_id}`,
              }))
            : [{ id: praxis.created_by_id, name: praxis.created_by_display_name }]
          ).map((author, index) => (
            <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
              <PosterChip
                name={author.name}
                size={desktop ? 44 : 38}
                tilt={index % 2 === 0 ? -3 : 2.5}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {members.length > 0 ? (
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
              }}
              separatorStyle={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: MUTED,
              }}
            />
          ) : (
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
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

      {/* The headline, cut from four sources word by word.
          IT MUST STAY ONE READABLE STRING: a flex row discards whitespace-only
          children, so the cuts sit in ordinary inline flow separated by REAL
          spaces (the fix #1023 made on the task card and #1035 on task detail). */}
      <h1
        style={{
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          fontWeight: 400,
          lineHeight: 1.3,
          margin: "0 0 var(--space-md)",
        }}
      >
        {(praxis.title || praxis.task_title).split(/\s+/).map((word, index) => (
          <span key={`${index}-${word}`}>
            {index > 0 ? " " : ""}
            <span
              style={{
                display: "inline-block",
                maxWidth: "100%",
                overflowWrap: "anywhere",
                ...CUTS[(index + praxis.id) % CUTS.length],
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference — what this praxis is a doing OF. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `2px solid ${RULE}`,
          borderBottom: `2px solid ${RULE}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span style={eyebrow}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ fontFamily: TYPE, color: INK, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...eyebrow, marginLeft: "auto", color: PINK_INK }}>
          {t("detail.taskRef.level", { level: praxis.task_level_required })}
          {" · "}
          {t("detail.taskRef.points", { points: praxis.task_point_value })}
        </span>
      </div>
    </>
  );

  // ── Score (built once; aside on desktop, above the proof on mobile) ────────
  //
  // ONE readout, and it is not this file's (#1091). `ScoreStamp` carries the
  // struck tag, the ruled rows and the votes tally — dispatched on the TASK's
  // faction, so a S.N.I.D.E. task gets `SnideScoreStamp`'s evidence tag and a
  // foreign task keeps its own mark on this page. No term is restated here and
  // no arithmetic is invented: `scoreBreakdown()` is the only resolver
  // (ADR-0014/0047/0053).
  const scoreBlock = (
    <section style={plate}>
      {sectionHead(t("detail.score.heading"), { onPlate: true })}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* The crown already has its own hero banner above; one mark per page. */}
        <ScoreStamp praxis={praxis} showCrown={false} />
      </div>
    </section>
  );

  // ── Duel (built once; aside on desktop, above the proof on mobile) ─────────
  //
  // Mounted, not re-narrated. It self-hides for a praxis with no duel, for a
  // DECLINED challenge, and for the run-up the composer owns (#1071/ADR-0059).
  //
  // Still a paper clipping, and now for a stronger reason than before. The card
  // used to arrive painting `--faction-default-*`, so it needed a ground that
  // flipped the way those inks do; since #1153 it takes THIS file's inks, and
  // the clipping is the stock `--faction-snide-note-*` was measured on. The
  // ground rule in the header is unchanged — the block still gets the stock its
  // ink was measured on; the ink is simply ours now.
  //
  // Acid and pink stay off it, per the faction's standing rule: they are a ring,
  // a rule or a bar on paper, never ink. And the rival's own faction hue never
  // reaches the card at all — the foreign side is a disc and an outline.
  const duelBlock: ReactNode = (
    <DuelCard
      state={state}
      style={clipping}
      heading={sectionHead(t("duelCrossLink.label"))}
      ink={{ name: INK, total: INK, muted: MUTED, line: RULE, plate: PAPER }}
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
  // The amp meter is bolted to the plate: `SnideVote` paints acid and vote-off
  // captions that measure 2.6:1 on cream and 15.7:1 on ink.
  const voteBlock = (
    <section style={plate}>
      {sectionHead(t("detail.vote.heading"), { onPlate: true })}
      <p
        className="content-text"
        style={{ fontFamily: MARK, margin: "0 0 var(--space-md)", color: PLATE_MUTED }}
      >
        {t("detail.vote.prompt")}
      </p>
      {/* Dispatched on the TASK's faction, so a foreign task read on this page
          still votes in its own voice (ADR-0039). Props match the reference
          build exactly — no `points`/`totalVotes`, because the score rail above
          already carries the tally (#888/#1091). */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Per-voter values come straight off `GET /praxes/{id}/voters`, already fetched
  // by `usePraxisDetail`. Each rung is marked in pen — pink as a FILL, never as
  // ink. NO AVERAGE anywhere (ADR-0014): the standing is the sum and the count.
  const votersBlock = voters.length > 0 && (
    <section style={clipping}>
      {sectionHead(
        t("detail.voters.heading"),
        {
          trailing: (
            <span style={eyebrow}>{t("detail.voters.count", { count: voters.length })}</span>
          ),
        },
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="content-text"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: TYPE,
                color: INK,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden="true"
              style={{
                width: 84,
                height: 10,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
                background: RULE,
                border: `1px solid ${INK}`,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: PINK,
                }}
              />
            </span>
            <span
              style={{
                width: 22,
                textAlign: "right",
                fontFamily: IMPACT,
                fontSize: "var(--text-title)",
                lineHeight: 1,
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
      {/* NEUTRAL, and deliberately bare — no clipping, no plate (ADR-0061). */}
      <PraxisFlagBlock state={state} />
    </>
  );

  // ── Proof · write-up · crew · metatasks ───────────────────────────────────
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.proof"), { big: true })}
      <div style={clipping}>
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.writeUp"), { big: true })}
      <div style={clipping}>
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: TYPE, lineHeight: 1.6, color: INK }}
        />
        <CensorRule style={{ marginTop: "var(--space-lg)" }} />
      </div>
    </section>
  );

  // The roster rides an INVARIANT stock insert. `CollabRoster` fills a cast
  // member's row with `--faction-snide-card-muted`, which is a LIGHT grey in
  // both themes; on a clipping that flips, the dark half would put pale ink on a
  // pale pill. Printed black on invariant xerox stock measures 13:1 against that
  // fill in either theme.
  const crew = isCollab && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.members"), { big: true })}
      <div
        style={{
          background: STOCK,
          border: `2px solid ${HARD}`,
          boxShadow: "var(--faction-snide-note-shadow)",
          color: HARD,
          padding: "var(--space-lg)",
          boxSizing: "border-box",
        }}
      >
        <CollabRoster
          members={praxis.members}
          currentCharacterId={state.user?.character?.id ?? null}
          factionSlug={praxis.task_faction_slug}
          taskPointValue={praxis.task_point_value}
          onKick={state.handleKickMember}
        />
      </div>
    </section>
  );

  // READ-ONLY, by construction (#1093). `MetaTaskSeal` omits the peel control
  // and the add slot when it gets neither `removable` nor `onAdd`, and each seal
  // wears its ISSUING faction's dress (#927/#933). The design's add chips are
  // deliberately absent: `apply_metatask` requires `status == in_progress`, so
  // every chip would 422 on tap.
  const metatasks = praxis.applied_metatasks.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.metatasks.heading"), { big: true })}
      <MetaTaskSeal metatasks={praxis.applied_metatasks} />
    </section>
  );

  return (
    <div className="py-8" style={{ position: "relative", fontFamily: TYPE, color: INK }}>
      {desktop ? breadcrumb : mobileBar}

      <div
        className="snd-detail-sheet"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          overflow: "hidden",
          boxSizing: "border-box",
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

        {/* The third layout region (ADR-0064, amending ADR-0006): comments sit
            beneath both columns, inside the page's own sheet, and the layout
            draws the heading so the thread does not draw a second one. The ROWS
            stay dispatched on each author's own faction. */}
        <PraxisDetailComments
          state={state}
          heading={sectionHead(t("detail.sections.comments"), { big: true })}
          style={{ marginTop: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
        />
      </div>
    </div>
  );
}
